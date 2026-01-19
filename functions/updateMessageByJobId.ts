
import { createClientFromRequest } from "npm:@base44/sdk@0.7.1";

/* ========================= Helpers ========================= */

// The 'json' helper is replaced by Response.json in the new implementation, but keeping it for completeness if other parts of the system might still rely on it.
// However, the requested changes effectively remove its use within the Deno.serve handler.
function json(status: number, data: any) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const getFirstItem = (result: any) => {
  if (!result) return null;
  if (Array.isArray(result) && result.length > 0) return result[0];
  if (Array.isArray(result.items) && result.items.length > 0) return result.items[0];
  return null;
};

// remove campos que não devem ir para update()
function stripDisallowed(updateFields: any) {
  const clone = { ...updateFields };
  delete clone.company_id;        // só para checagem, não atualiza
  delete clone.scheduler_job_id;  // id de lookup
  delete clone.debug;             // não existe no schema
  // Add any other fields that should not be directly updated here
  delete clone.id; // Prevent updating the ID
  delete clone._id; // Prevent updating the internal ID
  delete clone.created_at; // Prevent updating creation timestamp
  return clone;
}

function maskAuthHeader(h: string | null) {
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (!m) return h;
  const token = m[1];
  if (token.length <= 10) return "Bearer **********";
  return `Bearer ${token.slice(0, 6)}…${token.slice(-4)}`;
}

// reduz o objeto da Message para diagnóstico sem vazar tudo
function sanitizeMessageForDiag(msg: any) {
  if (!msg) return msg;
  return {
    id: msg.id ?? msg._id ?? null,
    is_deleted: msg.is_deleted ?? null,
    created_at: msg.created_at ?? msg?.data?.created_at ?? null,
    updated_at: msg.updated_at ?? msg?.data?.updated_at ?? null,
    scheduler_job_id: msg.scheduler_job_id ?? msg?.data?.scheduler_job_id ?? null,
    company_id: msg.company_id ?? msg?.data?.company_id ?? null,
    chat_id: msg.chat_id ?? msg?.data?.chat_id ?? null,
    schedule_id: msg.schedule_id ?? msg?.data?.schedule_id ?? null,
    status: msg.status ?? msg?.data?.status ?? null,
    direction: msg.direction ?? msg?.data?.direction ?? null,
    session_name: msg.session_name ?? msg?.data?.session_name ?? null,
    batch_id: msg.batch_id ?? msg?.data?.batch_id ?? null,
  };
}

// util para rodar consultas auxiliares com segurança
async function tryList(base44: any, filter: any, limit = 5) {
  try {
    const res = await base44.asServiceRole.entities.Message.list({ filter, limit, sort: { created_at: -1 } });
    const items = Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : [];
    return {
      ok: true,
      filter,
      count: items.length,
      samples: items.slice(0, limit).map(sanitizeMessageForDiag),
    };
  } catch (e: any) {
    return { ok: false, filter, error: String(e?.message || e) };
  }
}

/* ========================= Handler ========================= */

Deno.serve(async (req) => {
  const start = Date.now();
  const traceId = crypto.randomUUID();

  console.log(`[${traceId}] INÍCIO updateMessageByJobId`, {
    method: req.method,
    url: req.url,
    ip: req.headers?.get("cf-connecting-ip") ?? null,
  });

  if (req.method !== "PUT" && req.method !== "POST") {
    console.warn(`[${traceId}] Method Not Allowed: ${req.method}`);
    return Response.json({ error: "Method Not Allowed" }, { status: 405 });
  }

  try {
    /* ---------- Auth ---------- */
    const authHeader = req.headers.get("Authorization");
    const expectedApiKey = Deno.env.get("EXTERNAL_API_KEY");

    console.log(`[${traceId}] Headers (sanitized)`, {
      authorization: maskAuthHeader(authHeader),
      contentType: req.headers.get("content-type"),
    });

    if (!expectedApiKey) {
      console.error(`[${traceId}] CRITICAL ERROR: EXTERNAL_API_KEY not configured`);
      return Response.json({ error: "Server Configuration Error", traceId, durationMs: Date.now() - start }, { status: 500 });
    }
    if (authHeader !== `Bearer ${expectedApiKey}`) {
      console.warn(`[${traceId}] Unauthorized - Invalid/missing Bearer token`);
      return Response.json({ error: "Unauthorized", traceId, durationMs: Date.now() - start }, { status: 401 });
    }
    console.log(`[${traceId}] Authentication OK`);

    /* ---------- Body ---------- */
    let body: any = null;
    try { body = await req.json(); }
    catch (e) {
      console.warn(`[${traceId}] Invalid JSON body: ${e.message}`);
      return Response.json({ error: "Bad Request", message: "Invalid JSON body", traceId, durationMs: Date.now() - start }, { status: 400 });
    }

    console.log(`[${traceId}] Received body`, body);

    const {
      scheduler_job_id,
      company_id: payload_company_id, // Kept for potential future use or consistency with old code's filter building
      chat_id: payload_chat_id,       // Kept for potential future use
      ...updateData // The remaining fields are considered update data
    } = body || {};

    if (!scheduler_job_id || typeof scheduler_job_id !== "string") {
      console.warn(`[${traceId}] scheduler_job_id missing or invalid`, { scheduler_job_id });
      return Response.json({ error: "Bad Request", message: "scheduler_job_id is required", traceId, durationMs: Date.now() - start }, { status: 400 });
    }

    if (Object.keys(updateData ?? {}).length === 0) {
      console.log(`[${traceId}] No fields to update provided in body`);
      return Response.json({ success: true, message: "No fields to update.", traceId, durationMs: Date.now() - start }, { status: 200 });
    }

    const base44 = createClientFromRequest(req);
    const serviceRoleBase44 = base44.asServiceRole; // New: Defined serviceRoleBase44

    /* ---------- Find Message ---------- */
    console.log(`[${traceId}] Searching for message with scheduler_job_id: ${scheduler_job_id}`);

    // Using .filter as per outline, which simplifies the lookup compared to the original .list with sorting/limiting
    const messages = await serviceRoleBase44.entities.Message.filter({
      scheduler_job_id: scheduler_job_id,
      is_deleted: { $ne: true }, // Preserve the is_deleted filter
    });

    if (!messages || messages.length === 0) {
      const durationMs = Date.now() - start;
      console.warn(`[${traceId}] Message not found for scheduler_job_id: ${scheduler_job_id}`);
      return Response.json({
        success: false,
        error: 'Message not found',
        traceId,
        durationMs,
      }, { status: 404 });
    }

    const message = messages[0];
    console.log(`[${traceId}] Message found (ID: ${message.id}) for scheduler_job_id: ${scheduler_job_id}`);

    /* ---------- Prepare and Apply Update ---------- */
    const allowedUpdate = stripDisallowed(updateData);

    const finalUpdatePayload = {
      ...allowedUpdate,
      updated_at: Date.now(), // NEW: Add updated_at timestamp as per outline
      last_external_update_ts: Date.now(), // Preserve original audit field
    };

    console.log(`[${traceId}] Applying update to message ${message.id}`, { patch: finalUpdatePayload });

    const updatedMessage = await serviceRoleBase44.entities.Message.update(
      message.id,
      finalUpdatePayload
    );

    console.log(`[${traceId}] ✅ Message updated: ${message.id}`);

    /* ---------- NEW: Include metadata with contact name and phone in WebSocket update ---------- */
    let contactName = 'Contato';
    let phoneNumber = '';

    if (message.contact_id) {
      try {
        const contact = await serviceRoleBase44.entities.Contact.get(message.contact_id);
        if (contact) {
          contactName = `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Contato';
          phoneNumber = contact.phone || '';
        }
      } catch (contactError: any) {
        console.warn(`[${traceId}] Failed to fetch contact for message ${message.id}: ${contactError.message}`);
      }
    }

    // Send update via WebSocket
    try {
      await serviceRoleBase44.functions.invoke('sendWebSocketUpdate', {
        company_id: message.company_id,
        type: 'message_updated',
        message_id: message.id,
        scheduler_job_id: scheduler_job_id,
        schedule_id: message.schedule_id || null,
        status: finalUpdatePayload.status || message.status, // Use updated status if provided, else original message status
        data: {
          ...updatedMessage,
          metadata: {
            ...(updatedMessage.metadata || {}), // Preserve existing metadata
            contact_name: contactName,
            phone_number: phoneNumber
          }
        }
      });
      console.log(`[${traceId}] 📡 WebSocket update sent for message ${message.id}`);
    } catch (wsError: any) {
      console.warn(`[${traceId}] ⚠️ Failed to send WebSocket update for message ${message.id}: ${wsError.message}`);
    }

    const durationMs = Date.now() - start;
    console.log(`[${traceId}] SUCCESS update for message ${message.id}. Total duration: ${durationMs}ms`);

    return Response.json({
      success: true,
      message_id: message.id,
      updated_data: updateData, // As per outline, returning the input update data
      traceId,
      durationMs,
    });

  } catch (err: any) {
    const durationMs = Date.now() - start;
    console.error(`[${traceId}] UNEXPECTED ERROR: ${err.message}`, {
      name: err.name,
      stack: err.stack,
      durationMs,
    });
    return Response.json({
      success: false,
      error: err.message || "Internal Server Error",
      traceId,
      durationMs,
    }, { status: 500 });
  }
});
