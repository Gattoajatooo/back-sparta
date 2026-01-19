import { useEffect, useRef, useCallback, useMemo } from "react";

/**
 * Hook customizado para gerenciar conexões WebSocket
 *
 * Alinhado com backend Cloudflare:
 * - Rota dedicada: /ws/{companyId}
 * - Sem conflito com endpoints HTTP
 * - Reconexão com backoff exponencial + jitter
 * - Logs apenas em DEV
 * - Cleanup correto
 */

const DEFAULT_EVENTS = ["message_updated", "campaign_started"];

// Detecta DEV
const IS_DEV =
  typeof import.meta !== "undefined" &&
  import.meta.env &&
  import.meta.env.DEV === true;

/* ------------------------------------------------------------------ */
/* Utils */
/* ------------------------------------------------------------------ */

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function withJitter(ms) {
  return ms + Math.floor(Math.random() * 750);
}

function calcBackoffDelay(attempt, baseMs, maxMs) {
  const exp = Math.min(attempt - 1, 10);
  return withJitter(Math.min(baseMs * Math.pow(2, exp), maxMs));
}

/* ------------------------------------------------------------------ */
/* Hook */
/* ------------------------------------------------------------------ */

export function useWebSocket(
  companyId,
  onMessage,
  eventTypes = DEFAULT_EVENTS,
  options = {}
) {
  const {
    debug = IS_DEV,
    maxReconnectAttempts = 8,
    reconnectBaseDelayMs = 1000,
    reconnectMaxDelayMs = 20000,
  } = options;

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const reconnectAttemptsRef = useRef(0);
  const isConnectingRef = useRef(false);
  const manualDisconnectRef = useRef(false);
  const hasLoggedDisabledRef = useRef(false);

  // Evita reconectar por render
  const onMessageRef = useRef(onMessage);
  const eventTypesRef = useRef(eventTypes);

  /* ------------------------------------------------------------------ */
  /* Logging controlado */
  /* ------------------------------------------------------------------ */

  const log = useCallback(
    (...args) => {
      if (debug) console.log(...args);
    },
    [debug]
  );

  const warn = useCallback(
    (...args) => {
      if (debug) console.warn(...args);
    },
    [debug]
  );

  const error = useCallback((...args) => {
    console.error(...args);
  }, []);

  /* ------------------------------------------------------------------ */
  /* Atualiza refs sem reconectar */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    eventTypesRef.current = eventTypes;
  }, [eventTypes]);

  /* ------------------------------------------------------------------ */
  /* URL DO WEBSOCKET (CORRETA) */
  /* ------------------------------------------------------------------ */

  const wsUrl = useMemo(() => {
    if (!companyId) return null;

    const base = "wss://websocket-base44.businesstolucas.workers.dev";
    return `${base}/ws/${companyId}`;
  }, [companyId]);

  /* ------------------------------------------------------------------ */
  /* Helpers */
  /* ------------------------------------------------------------------ */

  const clearReconnectTimer = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  };

  /* ------------------------------------------------------------------ */
  /* Connect */
  /* ------------------------------------------------------------------ */

  const connect = useCallback(() => {
    if (manualDisconnectRef.current) return;

    if (isConnectingRef.current) {
      log("[useWebSocket] ⏸️ Já conectando");
      return;
    }

    if (!wsUrl) {
      if (!hasLoggedDisabledRef.current) {
        warn("[useWebSocket] ⚠️ WebSocket desabilitado (sem companyId)");
        hasLoggedDisabledRef.current = true;
      }
      return;
    }

    if (
      wsRef.current?.readyState === WebSocket.OPEN ||
      wsRef.current?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    isConnectingRef.current = true;
    clearReconnectTimer();

    log("[useWebSocket] 🔌 Conectando...");

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        reconnectAttemptsRef.current = 0;
        isConnectingRef.current = false;
        hasLoggedDisabledRef.current = false;

        log("[useWebSocket] ✅ Conectado");
      };

      ws.onmessage = (event) => {
        const data = safeJsonParse(event.data);
        if (!data) return;

        // Mensagens internas ignoradas
        if (["welcome", "ping", "ack"].includes(data.type)) return;

        const allowed = eventTypesRef.current.includes(data.type);
        const sameCompany =
          !companyId || data.company_id === companyId;

        if (allowed && sameCompany) {
          onMessageRef.current(data);
        }
      };

      ws.onerror = () => {
        isConnectingRef.current = false;
        error("[useWebSocket] ❌ Erro no WebSocket");
      };

      ws.onclose = (event) => {
        isConnectingRef.current = false;

        if (manualDisconnectRef.current) return;

        const authError = [1008, 4001, 4003].includes(event.code);
        if (authError) {
          error("[useWebSocket] ❌ Falha de autenticação no WebSocket");
          return;
        }

        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;

          const delay = calcBackoffDelay(
            reconnectAttemptsRef.current,
            reconnectBaseDelayMs,
            reconnectMaxDelayMs
          );

          log(
            `[useWebSocket] 🔄 Reconectando (${reconnectAttemptsRef.current}/${maxReconnectAttempts}) em ${delay}ms`
          );

          reconnectTimeoutRef.current = setTimeout(connect, delay);
        } else {
          error("[useWebSocket] ❌ Máximo de tentativas de reconexão atingido");
        }
      };

      wsRef.current = ws;
    } catch (err) {
      isConnectingRef.current = false;
      error("[useWebSocket] ❌ Erro ao criar WebSocket", err);
    }
  }, [
    wsUrl,
    companyId,
    log,
    warn,
    error,
    maxReconnectAttempts,
    reconnectBaseDelayMs,
    reconnectMaxDelayMs,
  ]);

  /* ------------------------------------------------------------------ */
  /* Disconnect */
  /* ------------------------------------------------------------------ */

  const disconnect = useCallback(() => {
    manualDisconnectRef.current = true;
    clearReconnectTimer();

    try {
      wsRef.current?.close();
    } catch {
      // ignore
    }

    wsRef.current = null;
    reconnectAttemptsRef.current = 0;
    isConnectingRef.current = false;

    log("[useWebSocket] 🔌 Desconectado manualmente");
  }, [log]);

  /* ------------------------------------------------------------------ */
  /* Auto connect / cleanup */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    manualDisconnectRef.current = false;
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  /* ------------------------------------------------------------------ */
  /* API */
  /* ------------------------------------------------------------------ */

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    reconnect: () => {
      manualDisconnectRef.current = false;
      connect();
    },
    disconnect,
  };
}
