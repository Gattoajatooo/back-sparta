import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

// Helper: extrair telefone do chat_id
function extractPhoneFromChatId(chatId) {
  if (!chatId) return null;
  const normalizedPhone = String(chatId).split("@")[0].replace(/\D/g, '');
  if (chatId.includes('@lid') && !normalizedPhone) return null;
  return normalizedPhone;
}

function safeStr(v) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function normalizeDirection(v) {
  const s = safeStr(v).trim().toLowerCase();
  if (s === "sent" || s === "received") return s;
  return null;
}

function pickInvokeError(err) {
  const out = {
    message: err?.message || String(err),
    name: err?.name,
    status: err?.status,
  };

  if (err?.response) {
    out.status = err.response.status;
    out.response_data = err.response.data;
  }

  if (err?.details) out.details = err.details;

  return out;
}

/**
 * Busca contato existente usando query $or otimizada
 */
async function findExistingContact(serviceRoleBase44, companyId, phone, enrichedLid, chatId) {
  console.log(`[FIND_CONTACT] Iniciando busca para company_id: ${companyId}, phone: ${phone}, enrichedLid: ${enrichedLid}, chatId: ${chatId}`);

  if (!companyId) {
    console.error('[FIND_CONTACT] ERRO: company_id está vazio!');
    return null;
  }

  const orConditions = [];

  if (phone) {
    orConditions.push({ phone: phone });
    orConditions.push({ 'phones.phone': phone });
  }

  if (enrichedLid) {
    orConditions.push({ 'phones.phone': enrichedLid });
  }

  orConditions.push({ 'phones.phone': chatId });

  if (orConditions.length === 0) {
    console.warn('[FIND_CONTACT] Nenhuma condição de busca fornecida.');
    return null;
  }

  const query = {
    '$and': [
      { company_id: companyId },
      { '$or': orConditions }
    ]
  };

  console.log('[FIND_CONTACT] Query final:', JSON.stringify(query));

  try {
    const contacts = await serviceRoleBase44.entities.Contact.filter(query);

    if (contacts && contacts.length > 0) {
      console.log(`[FIND_CONTACT] ✅ Contato encontrado: ID=${contacts[0].id}, Nome=${contacts[0].first_name}, Phone=${contacts[0].phone}`);
      return contacts[0];
    } else {
      console.log('[FIND_CONTACT] ❌ Contato NÃO encontrado.');
      return null;
    }
  } catch (e) {
    console.error('[FIND_CONTACT] ❌ ERRO na busca:', e.message, e.stack);
    return null;
  }
}

/**
 * Enriquece dados do contato via WAHA API
 */
async function enrichContactFromWaha(sessionName, chatId, pushName, wahaApiUrl, wahaApiKey) {
  const result = {
    phone: null,
    lid: null,
    first_name: null,
    last_name: null,
    nickname: null,
    avatar_url: null,
    phones: []
  };

  const isLid = chatId.includes('@lid');
  console.log(`[CreateMessage] 🔄 Enriquecendo - chatId: ${chatId}, isLid: ${isLid}`);

  try {
    if (isLid) {
      result.lid = chatId;
      
      try {
        const url = `${wahaApiUrl}/api/${sessionName}/lids/${encodeURIComponent(chatId)}`;
        const response = await fetch(url, {
          method: 'GET',
          headers: { 'X-Api-Key': wahaApiKey, 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(10000)
        });

        if (response.ok) {
          const data = await response.json();
          if (data.pn) {
            result.phone = data.pn.replace('@c.us', '').replace(/\D/g, '');
            console.log('[CreateMessage] ✅ Telefone obtido do LID:', result.phone);
          }
        }
      } catch (e) {
        console.log('[CreateMessage] ⚠️ Erro ao resolver LID:', e.message);
      }
    } else {
      result.phone = chatId.replace('@c.us', '').replace(/\D/g, '');
      
      try {
        const url = `${wahaApiUrl}/api/${sessionName}/lids/pn/${result.phone}`;
        const response = await fetch(url, {
          method: 'GET',
          headers: { 'X-Api-Key': wahaApiKey, 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(10000)
        });

        if (response.ok) {
          const data = await response.json();
          if (data.lid) {
            result.lid = data.lid;
          } else if (data.id && data.id.includes('@lid')) {
            result.lid = data.id;
          }
        }
      } catch (e) {
        console.log('[CreateMessage] ℹ️ LID não disponível');
      }
    }

    try {
      const photoUrl = `${wahaApiUrl}/api/contacts/profile-picture?contactId=${encodeURIComponent(chatId)}&refresh=false&session=${encodeURIComponent(sessionName)}`;
      const photoResponse = await fetch(photoUrl, {
        method: 'GET',
        headers: { 'X-Api-Key': wahaApiKey, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10000)
      });

      if (photoResponse.ok) {
        const photoData = await photoResponse.json();
        if (photoData.profilePictureURL) {
          result.avatar_url = photoData.profilePictureURL;
        }
      }
    } catch (e) {
      console.log('[CreateMessage] ℹ️ Foto não disponível');
    }

    let fullName = pushName;
    let nickname = null;
    
    if (!fullName) {
      try {
        const contactUrl = `${wahaApiUrl}/api/contacts?contactId=${encodeURIComponent(chatId)}&session=${encodeURIComponent(sessionName)}`;
        const contactResponse = await fetch(contactUrl, {
          method: 'GET',
          headers: { 'X-Api-Key': wahaApiKey, 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(10000)
        });

        if (contactResponse.ok) {
          const contactData = await contactResponse.json();
          fullName = contactData.pushname || contactData.shortName;
          nickname = contactData.name;
          console.log('[CreateMessage] ✅ Nome obtido via API:', fullName, '| Nickname:', nickname);
        }
      } catch (e) {
        console.log('[CreateMessage] ℹ️ Nome não disponível via API');
      }
    }

    if (fullName && fullName.trim()) {
      const parts = fullName.trim().split(/\s+/);
      result.first_name = parts[0];
      result.last_name = parts.length > 1 ? parts.slice(1).join(' ') : null;
    } else {
      result.first_name = result.phone || chatId.split('@')[0];
    }

    result.nickname = nickname;

    if (result.phone) {
      result.phones.push({ phone: result.phone, type: 'primary' });
    }
    if (result.lid) {
      result.phones.push({ phone: result.lid, type: 'lid' });
    }

  } catch (error) {
    console.error('[CreateMessage] ❌ Erro ao enriquecer:', error.message);
    if (!result.first_name) {
      result.first_name = pushName || chatId.split('@')[0];
    }
    if (!result.phone && !isLid) {
      result.phone = chatId.replace('@c.us', '').replace(/\D/g, '');
    }
  }

  return result;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const serviceRoleBase44 = base44.asServiceRole;

    const body = await req.json();
    const { session_name, chat_id, scheduler_job_id, batch_id } = body;

    const direction =
      normalizeDirection(body.direction) ||
      normalizeDirection(body?.metadata?.direction) ||
      (typeof body?.metadata?.fromMe === "boolean" ? (body.metadata.fromMe ? "sent" : "received") : null) ||
      "received";

    console.log(`[CreateMessage] ========== INÍCIO ==========`);        
    console.log(`[CreateMessage] Session=${session_name}`);
    console.log(`[CreateMessage] ChatID=${chat_id}`);
    console.log(`[CreateMessage] JobID=${scheduler_job_id}`);
    console.log(`[CreateMessage] Direction=${direction}`);

    if (!session_name) {
      return Response.json({ success: false, error: "session_name é obrigatório" }, { status: 400 });
    }
    if (!chat_id) {
      return Response.json({ success: false, error: "chat_id é obrigatório" }, { status: 400 });
    }
    if (!scheduler_job_id) {
      return Response.json({ success: false, error: "scheduler_job_id é obrigatório" }, { status: 400 });
    }

    const existing = await serviceRoleBase44.entities.Message.filter({ scheduler_job_id });
    if (existing?.length) {
      console.log(`[CreateMessage] ⚠️ DUPLICADA (${existing[0].id})`);
      return Response.json({
        success: true,
        message: "Mensagem já existe",
        data: {
          message_id: existing[0].id,
          is_duplicate: true,
        },
      }, { status: 200 });
    }

    const sessions = await serviceRoleBase44.entities.Session.filter({ session_name });
    if (!sessions?.length) {
      return Response.json(
        { success: false, error: `Sessão não encontrada: ${session_name}` },
        { status: 404 }
      );
    }

    const session = sessions[0];
    const company_id = session.company_id;
    const user_id = session.user_id || null;
    const session_number = session.phone || null;

    console.log(`[CreateMessage] ✅ Sessão OK | Company=${company_id}`);

    const wahaApiUrl = Deno.env.get('WAHA_API_URL');
    const wahaApiKey = Deno.env.get('WAHA_API_KEY');
    
    let contact = null;
    let contact_id = null;
    const phoneFromChatId = extractPhoneFromChatId(chat_id);
    const pushName = body.metadata?.pushName || body.pushName || null;

    let enrichedData = null;
    if (direction === "received" && wahaApiUrl && wahaApiKey) {
      enrichedData = await enrichContactFromWaha(session_name, chat_id, pushName, wahaApiUrl, wahaApiKey);
      contact = await findExistingContact(serviceRoleBase44, company_id, enrichedData.phone, enrichedData.lid, chat_id);
    } else {
      contact = await findExistingContact(serviceRoleBase44, company_id, phoneFromChatId, null, chat_id);
    }

    if (!contact && direction === "received" && wahaApiUrl && wahaApiKey && enrichedData) {
      console.log(`[CreateMessage] 🆕 Contato não existe, criando...`);
      
      const isLid = chat_id.includes('@lid');
      const phoneToSave = enrichedData.phone || (isLid ? null : chat_id.replace('@c.us', '').replace(/\D/g, ''));
      
      const contactData = {
        company_id,
        first_name: enrichedData.first_name || pushName || "Novo Contato",
        last_name: enrichedData.last_name || null,
        nickname: enrichedData.nickname || null,
        phone: phoneToSave,
        avatar_url: enrichedData.avatar_url,
        phones: enrichedData.phones.length > 0 ? enrichedData.phones : [{ phone: chat_id, type: isLid ? 'lid' : 'primary' }],
        numberExists: true,
        checked: true,
        temperature: "quente",
        import_type: "whatsapp",
        last_contact_date: new Date().toISOString()
      };

      console.log('[CreateMessage] 📋 Tentando criar contato:', {
        company_id: contactData.company_id,
        first_name: contactData.first_name,
        nickname: contactData.nickname,
        phone: contactData.phone,
        phones: contactData.phones
      });

      try {
        console.log('[CreateMessage] 🔍 Verificação final antes de criar...');
        const finalCheck = await findExistingContact(serviceRoleBase44, company_id, contactData.phone, enrichedData.lid, chat_id);
        
        if (finalCheck) {
          console.log(`[CreateMessage] ⚠️ Contato encontrado na verificação final! ID=${finalCheck.id}`);
          contact = finalCheck;
        } else {
          contact = await serviceRoleBase44.entities.Contact.create(contactData);
          console.log(`[CreateMessage] ✅ Contato criado com sucesso: ${contact.id}`);
        }
      } catch (createError) {
        console.error('[CreateMessage] ❌ ERRO ao criar contato:', createError.message);
        
        if (createError.message?.includes('unique') || createError.message?.includes('duplicate') || createError.message?.includes('Unique')) {
          console.log('[CreateMessage] 🔄 Erro de duplicação detectado, buscando contato existente...');
          
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const existingContact = await findExistingContact(serviceRoleBase44, company_id, contactData.phone, enrichedData.lid, chat_id);
          if (existingContact) {
            console.log(`[CreateMessage] ✅ Contato duplicado encontrado: ${existingContact.id}`);
            contact = existingContact;
          } else {
            throw createError;
          }
        } else {
          throw createError;
        }
      }
    } else if (contact) {
      contact_id = contact.id;
      
      if (contact.deleted === true) {
        console.log('[CreateMessage] ♻️ Restaurando contato deletado...');
        await serviceRoleBase44.entities.Contact.update(contact.id, {
          deleted: false,
          deleted_at: null,
          deleted_by: null,
          temperature: "quente",
          last_contact_date: new Date().toISOString()
        });
      } else if (direction === "received") {
        await serviceRoleBase44.entities.Contact.update(contact.id, {
          temperature: "quente",
          last_contact_date: new Date().toISOString()
        });
      }
      
      console.log(`[CreateMessage] ✅ Contato existente: ${contact.first_name}`);
    }

    if (contact) {
      contact_id = contact.id;
    }

    const now = Date.now();

    const content =
      body.caption ||
      (body.content && !String(body.content).startsWith("[Mídia:") ? body.content : "");

    const mediaUrl = body.media_url || body.file_url || null;

    const messageData = {
      company_id,
      user_id,
      session_name,
      session_number,
      chat_id,
      scheduler_job_id,
      direction,

      status: "success",
      type: "immediately",

      run_at: now,
      created_at: now,
      updated_at: now,

      content,

      media_url: mediaUrl,
      caption: body.caption || null,
      filename: body.filename || null,
      mimetype: body.mimetype || null,

      metadata: {
        source: "webhook",
        created_by_function: "createMessage",
        direction,
        contact_name: contact ? `${contact.first_name} ${contact.last_name || ''}`.trim() : null,
        contact_avatar: contact?.avatar_url,
        phone_number: contact?.phone,
        ...(body.metadata || {}),
      },
    };

    if (contact_id) messageData.contact_id = contact_id;
    if (batch_id && batch_id !== "false") messageData.batch_id = batch_id;
    if (body.schedule_id) messageData.schedule_id = body.schedule_id;

    console.log(`[CreateMessage] 💾 Criando mensagem | Direction=${direction}`);

    const createdMessage = await serviceRoleBase44.entities.Message.create(messageData);
    console.log(`[CreateMessage] ✅ Mensagem criada: ID=${createdMessage.id}`);

    try {
      const wsPayload = {
        company_id,
        type: direction === "received" ? "message_received" : "message_updated",
        message_id: createdMessage.id,
        chat_id,
        contact_id,
        scheduler_job_id,
        schedule_id: messageData.schedule_id || null,
        status: "success",
        data: {
          ...createdMessage,
          updated_at: now,
          contact: contact ? {
            id: contact.id,
            first_name: contact.first_name,
            last_name: contact.last_name,
            phone: contact.phone,
            avatar_url: contact.avatar_url
          } : null
        },
      };

      await serviceRoleBase44.functions.invoke("sendWebSocketUpdate", wsPayload);
      console.log(`[CreateMessage] ✅ WebSocket enviado`);
    } catch (e) {
      console.warn("[CreateMessage] ⚠️ WebSocket falhou:", e?.message || e);
    }

    if (direction === "received") {
      try {
        const agents = await serviceRoleBase44.entities.AIAgent.filter({
          company_id,
          session_name,
        });

        const aiAgent = agents?.[0] || null;

        if (aiAgent) {
          console.log(`[CreateMessage] 🤖 Acionando IA: ${aiAgent.name || aiAgent.id}`);

          await serviceRoleBase44.functions.invoke("processAIWhatsAppMessage", {
            chat_id,
            message_id: scheduler_job_id,
            content: content || "",
            session_name,
            timestamp: now,
            company_id,
            contact_id: contact_id || null,
            agent_id: aiAgent.id,
            created_message_entity_id: createdMessage.id,
          });
        }
      } catch (aiError) {
        console.error(`[CreateMessage] ❌ Erro IA:`, aiError?.message || aiError);
      }
    }

    console.log(`[CreateMessage] ========== FIM (SUCESSO) ==========`);

    return Response.json({
      success: true,
      message: "Mensagem criada com sucesso",
      data: {
        message_id: createdMessage.id,
        company_id,
        contact_id: contact_id || null,
        session_name,
        chat_id,
        scheduler_job_id,
        status: "success",
        direction,
      },
    }, { status: 201 });

  } catch (error) {
    console.error("[CreateMessage] ❌ ERRO GERAL:", error);
    return Response.json(
      { success: false, error: "Erro ao criar mensagem", details: error?.message || String(error) },
      { status: 500 }
    );
  }
});