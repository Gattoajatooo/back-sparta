// ✅ POLYFILL OBRIGATÓRIO (para base64 via Buffer no Deno)
import { Buffer } from "node:buffer";
globalThis.Buffer = Buffer;

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

/**
 * =========================================================
 * Config / Constantes
 * =========================================================
 */
const DEFAULT_VOICE_MIMETYPE = "audio/ogg; codecs=opus";
const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20MB (ajuste se precisar)
const FETCH_TIMEOUT_MS = 20_000;

/**
 * =========================================================
 * Utils
 * =========================================================
 */
async function logOperation(base44, logData) {
  try {
    await base44.asServiceRole.entities.SystemLog.create(logData);
  } catch (error) {
    console.error("Error logging operation:", error);
  }
}

function cleanPhoneNumber(phone) {
  if (!phone || typeof phone !== "string") throw new Error("Número de telefone inválido");
  return phone.replace(/\D/g, "");
}

function isHttpUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeVoiceMimetype(mimetype) {
  // força o formato esperado pelo WAHA/WhatsApp Web
  const m = (mimetype || "").toLowerCase();
  if (m.includes("audio/ogg") && m.includes("opus")) return DEFAULT_VOICE_MIMETYPE;
  if (m.includes("audio/ogg")) return DEFAULT_VOICE_MIMETYPE;
  // se vier outro, ainda manda como ogg/opus e usa convert no fallback
  return DEFAULT_VOICE_MIMETYPE;
}

function ensureVoiceFilename(filename) {
  const base = filename && String(filename).trim() ? String(filename).trim() : `voice-${Date.now()}.opus`;
  // muitos fluxos usam .opus como extensão mesmo sendo OGG/OPUS; ajuda compatibilidade
  if (base.toLowerCase().endsWith(".opus") || base.toLowerCase().endsWith(".ogg")) return base;
  return `${base}.opus`;
}

async function fetchAsBase64(url, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { signal: controller.signal });
    const contentType = res.headers.get("content-type") || "application/octet-stream";

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Falha ao baixar arquivo (HTTP ${res.status}): ${txt || res.statusText}`);
    }

    const ab = await res.arrayBuffer();
    const size = ab.byteLength;

    if (size > MAX_FILE_BYTES) {
      throw new Error(`Arquivo muito grande (${size} bytes). Limite: ${MAX_FILE_BYTES} bytes`);
    }

    const b64 = Buffer.from(new Uint8Array(ab)).toString("base64");
    return { base64: b64, size, contentType };
  } finally {
    clearTimeout(timeout);
  }
}

async function readJsonOrText(response) {
  const text = await response.text().catch(() => "");
  if (!text) return { text: "", json: null };
  try {
    return { text, json: JSON.parse(text) };
  } catch {
    return { text, json: null };
  }
}

async function checkNumberExists(apiUrl, apiKey, sessionName, phone) {
  const cleanBase = apiUrl.endsWith("/") ? apiUrl.slice(0, -1) : apiUrl;
  const checkUrl = `${cleanBase}/api/contacts/check-exists?session=${encodeURIComponent(sessionName)}&phone=${encodeURIComponent(phone)}`;

  const response = await fetch(checkUrl, {
    method: "GET",
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
      "X-Api-Key": apiKey,
    },
  });

  const { json, text } = await readJsonOrText(response);

  if (!response.ok) {
    throw new Error(`Check exists failed: ${response.status} ${response.statusText} ${text || ""}`.trim());
  }

  // WAHA geralmente retorna { numberExists, chatId }
  return json || {};
}

async function updateContactAfterCheck(base44, contactId, checkResult) {
  if (!contactId) return;

  try {
    const updateData = { checked: true };

    if (checkResult?.numberExists && checkResult?.chatId) {
      updateData.phone = String(checkResult.chatId).replace("@c.us", "");
      updateData.numberExists = true;
    } else {
      updateData.phone = null;
      updateData.numberExists = false;
    }

    await base44.asServiceRole.entities.Contact.update(contactId, updateData);
  } catch (error) {
    console.error("Erro ao atualizar contato após verificação:", error);
  }
}

/**
 * =========================================================
 * Handler
 * =========================================================
 */
Deno.serve(async (req) => {
  const startTime = Date.now();

  // helper pra padronizar retorno
  const reply = (status, data) =>
    new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

  let base44;
  let user;

  try {
    base44 = createClientFromRequest(req);

    if (!(await base44.auth.isAuthenticated())) {
      return reply(401, { success: false, error: "Unauthorized" });
    }

    user = await base44.auth.me();
    if (!user) return reply(401, { success: false, error: "Invalid user" });

    const payload = await req.json();

    const { phone, file, sessionName, contactId, sessionProfile } = payload || {};

    console.log(
      "[sendVoice] Payload recebido:",
      JSON.stringify({
        phone,
        hasFile: !!file,
        sessionName,
        contactId,
        fileKeys: file ? Object.keys(file) : [],
        fileUrlProto: file?.url ? (() => { try { return new URL(file.url).protocol.replace(":", ""); } catch { return "invalid"; } })() : null,
      })
    );

    if (!phone || !file || !sessionName) {
      return reply(400, {
        success: false,
        error: "Parâmetros obrigatórios faltando (phone, file, sessionName)",
      });
    }

    // file pode vir com: { url, filename, mimetype } OU { data, filename, mimetype }
    const filename = ensureVoiceFilename(file.filename);
    const mimetype = normalizeVoiceMimetype(file.mimetype);

    // Se vier blob: do browser => impossível pro servidor/WAHA buscar
    if (file.url && String(file.url).startsWith("blob:") && !file.data) {
      return reply(400, {
        success: false,
        error: "URL do arquivo é do tipo blob: e não pode ser baixada pelo servidor",
        details: 'Envie um link http(s) público em file.url OU envie o conteúdo em base64 em file.data.',
      });
    }

    // Se não tem data, e url não é http(s), também não tem como
    if (!file.data && (!file.url || !isHttpUrl(file.url))) {
      return reply(400, {
        success: false,
        error: "Arquivo inválido",
        details: "Informe file.url (http/https) ou file.data (base64).",
      });
    }

    const apiKey = Deno.env.get("WAHA_API_KEY");
    const apiUrl = Deno.env.get("WAHA_API_URL");

    if (!apiKey || !apiUrl) {
      return reply(500, { success: false, error: "Configuração da API WAHA não encontrada" });
    }

    const cleanBase = apiUrl.endsWith("/") ? apiUrl.slice(0, -1) : apiUrl;
    const sendVoiceUrl = `${cleanBase}/api/sendVoice`;

    // 1) Verificar número
    const cleanPhone = cleanPhoneNumber(phone);
    const checkResult = await checkNumberExists(apiUrl, apiKey, sessionName, cleanPhone);

    // 2) Atualizar contato
    await updateContactAfterCheck(base44, contactId, checkResult);

    if (!checkResult?.numberExists || !checkResult?.chatId) {
      return reply(400, { success: false, error: "Número de telefone não existe no WhatsApp" });
    }

    const chatId = checkResult.chatId;

    // 3) Montar payload do arquivo para WAHA
    // Preferimos mandar base64 (file.data) pra não depender do WAHA baixar via URL.
    let filePayload;
    let mediaMeta = { uploadedNow: false, source: "data", size: null };

    if (file.data) {
      filePayload = {
        mimetype,
        data: String(file.data),
        filename,
      };
      mediaMeta.source = "data";
    } else {
      // baixar o arquivo aqui no Base44 e mandar base64
      const { base64, size } = await fetchAsBase64(file.url);
      filePayload = {
        mimetype,
        data: base64,
        filename,
      };
      mediaMeta.source = "url->data";
      mediaMeta.size = size;
    }

    // 4) Enviar (tentativa 1: convert=false)
    async function callSendVoice(convert) {
      const body = {
        session: sessionName,
        chatId,
        file: filePayload,
        convert: !!convert,
      };

      console.log(
        "[sendVoice] Enviando para WAHA:",
        JSON.stringify({
          chatId,
          sessionName,
          mimetype,
          hasData: !!filePayload.data,
          filename,
          convert: !!convert,
          size: mediaMeta.size,
          source: mediaMeta.source,
        })
      );

      const resp = await fetch(sendVoiceUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Api-Key": apiKey },
        body: JSON.stringify(body),
      });

      const parsed = await readJsonOrText(resp);
      return { resp, parsed, bodySent: { ...body, file: { ...body.file, data: body.file.data ? "(base64)" : undefined } } };
    }

    let attempt1 = await callSendVoice(false);

    // Se falhar, tenta convert=true (muito útil quando o WAHA/WhatsApp Web “implica” com o áudio)
    let finalAttempt = attempt1;
    let usedConvert = false;

    if (!attempt1.resp.ok) {
      usedConvert = true;
      const attempt2 = await callSendVoice(true);
      finalAttempt = attempt2;
    }

    const duration = Date.now() - startTime;

    // Resposta WAHA
    console.log("[sendVoice] Resposta WAHA status:", finalAttempt.resp.status);
    console.log(
      "[sendVoice] Resposta WAHA data:",
      JSON.stringify(finalAttempt.parsed.json ?? { raw: finalAttempt.parsed.text })
    );

    const wahaJson = finalAttempt.parsed.json;

    if (finalAttempt.resp.ok) {
      // Atualizar temperatura: fria -> morna, morna -> quente
      if (contactId) {
        try {
          const contact = await base44.entities.Contact.get(contactId);
          const currentTemp = contact.temperature || 'fria';
          let newTemp = currentTemp;
          
          if (currentTemp === 'fria') {
            newTemp = 'morna';
          } else if (currentTemp === 'morna') {
            newTemp = 'quente';
          }
          
          if (newTemp !== currentTemp) {
            await base44.entities.Contact.update(contactId, { temperature: newTemp });
            console.log(`[sendVoice] 🌡️ Temperatura atualizada: ${currentTemp} -> ${newTemp}`);
          }
        } catch (tempError) {
          console.warn('[sendVoice] ⚠️ Erro ao atualizar temperatura:', tempError.message);
        }
      }

      // Log sucesso
      await logOperation(base44, {
        company_id: user.company_id,
        user_id: user.id,
        action: "send_voice_message",
        resource_type: "message",
        resource_id: wahaJson?.id || null,
        status: "success",
        method: "POST",
        endpoint: "sendVoice",
        request_data: {
          phone: String(phone).slice(0, 4) + "****",
          sessionName,
          fileName: filename,
          contactId,
          numberVerified: true,
          usedConvert,
          mediaSource: mediaMeta.source,
        },
        response_data: { messageId: wahaJson?.id || null, chatId },
        ip_address: req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "unknown",
        user_agent: req.headers.get("user-agent") || "unknown",
        duration_ms: duration,
      });

      return reply(200, {
        success: true,
        messageId: wahaJson?.id || null,
        chatId,
        usedConvert,
        media: {
          filename,
          mimetype,
          source: mediaMeta.source,
          size: mediaMeta.size,
        },
        data: wahaJson ?? { raw: finalAttempt.parsed.text },
      });
    }

    // Falhou (mesmo após fallback)
    await logOperation(base44, {
      company_id: user.company_id,
      user_id: user.id,
      action: "send_voice_message",
      resource_type: "message",
      status: "error",
      method: "POST",
      endpoint: "sendVoice",
      request_data: {
        phone: String(phone).slice(0, 4) + "****",
        sessionName,
        fileName: filename,
        contactId,
        numberVerified: true,
        usedConvert,
        mediaSource: mediaMeta.source,
      },
      error_message: wahaJson?.error || wahaJson?.exception?.message || finalAttempt.parsed.text || finalAttempt.resp.statusText,
      ip_address: req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "unknown",
      user_agent: req.headers.get("user-agent") || "unknown",
      duration_ms: duration,
    });

    return reply(finalAttempt.resp.status || 500, {
      success: false,
      error: "Falha ao enviar áudio (WAHA)",
      status: finalAttempt.resp.status,
      usedConvert,
      details: wahaJson ?? { raw: finalAttempt.parsed.text || finalAttempt.resp.statusText },
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    console.error("[sendVoice] Erro fatal:", error);
    console.error("[sendVoice] Stack trace:", error?.stack);

    try {
      // tenta logar mesmo em erro fatal
      if (!base44) base44 = createClientFromRequest(req);
      if (!user) user = await base44.auth.me().catch(() => null);

      await logOperation(base44, {
        company_id: user?.company_id,
        user_id: user?.id,
        action: "send_voice_message",
        resource_type: "message",
        status: "error",
        method: "POST",
        endpoint: "sendVoice",
        error_message: error?.message || "Internal server error",
        error_stack: error?.stack || null,
        ip_address: req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "unknown",
        user_agent: req.headers.get("user-agent") || "unknown",
        duration_ms: duration,
      });
    } catch (logError) {
      console.error("Error logging system error:", logError);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
        details: error?.message || String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});