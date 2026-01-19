import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

/**
 * Função auxiliar para enriquecer dados do contato diretamente na WAHA API
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
  console.log(`[enrichContact] 🚀 Iniciando enriquecimento - chatId: ${chatId}, isLid: ${isLid}`);

  try {
    if (isLid) {
      result.lid = chatId;
      
      try {
        const url = `${wahaApiUrl}/api/${sessionName}/lids/${encodeURIComponent(chatId)}`;
        console.log('[enrichContact] 🔍 Resolvendo LID para telefone...');
        
        const response = await fetch(url, {
          method: 'GET',
          headers: { 'X-Api-Key': wahaApiKey, 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(10000)
        });

        if (response.ok) {
          const data = await response.json();
          console.log('[enrichContact] 📋 Resposta LID:', JSON.stringify(data));
          if (data.pn) {
            result.phone = data.pn.replace('@c.us', '').replace(/\D/g, '');
            console.log('[enrichContact] ✅ Telefone obtido do LID:', result.phone);
          }
        } else {
          console.log('[enrichContact] ⚠️ API retornou status:', response.status);
        }
      } catch (e) {
        console.log('[enrichContact] ⚠️ Erro ao resolver LID:', e.message);
      }
    } else {
      result.phone = chatId.replace('@c.us', '').replace(/\D/g, '');
      console.log('[enrichContact] 📱 Telefone extraído:', result.phone);
      
      try {
        const url = `${wahaApiUrl}/api/${sessionName}/lids/pn/${result.phone}`;
        console.log('[enrichContact] 🔍 Buscando LID para telefone...');
        
        const response = await fetch(url, {
          method: 'GET',
          headers: { 'X-Api-Key': wahaApiKey, 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(10000)
        });

        if (response.ok) {
          const data = await response.json();
          if (data.lid) {
            result.lid = data.lid;
            console.log('[enrichContact] ✅ LID obtido:', result.lid);
          } else if (data.id && data.id.includes('@lid')) {
            result.lid = data.id;
            console.log('[enrichContact] ✅ LID obtido (alt):', result.lid);
          }
        }
      } catch (e) {
        console.log('[enrichContact] ℹ️ LID não disponível (normal para contas pessoais)');
      }
    }

    try {
      const photoUrl = `${wahaApiUrl}/api/contacts/profile-picture?contactId=${encodeURIComponent(chatId)}&refresh=false&session=${encodeURIComponent(sessionName)}`;
      console.log('[enrichContact] 📷 Buscando foto de perfil...');
      
      const photoResponse = await fetch(photoUrl, {
        method: 'GET',
        headers: { 'X-Api-Key': wahaApiKey, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10000)
      });

      if (photoResponse.ok) {
        const photoData = await photoResponse.json();
        if (photoData.profilePictureURL) {
          result.avatar_url = photoData.profilePictureURL;
          console.log('[enrichContact] ✅ Foto de perfil obtida');
        }
      }
    } catch (e) {
      console.log('[enrichContact] ℹ️ Foto de perfil não disponível');
    }

    let fullName = pushName;
    let nickname = null;
    
    if (!fullName) {
      try {
        const contactUrl = `${wahaApiUrl}/api/contacts?contactId=${encodeURIComponent(chatId)}&session=${encodeURIComponent(sessionName)}`;
        console.log('[enrichContact] 👤 Buscando nome via API de contatos...');
        
        const contactResponse = await fetch(contactUrl, {
          method: 'GET',
          headers: { 'X-Api-Key': wahaApiKey, 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(10000)
        });

        if (contactResponse.ok) {
          const contactData = await contactResponse.json();
          fullName = contactData.pushname || contactData.shortName;
          nickname = contactData.name;
          if (fullName) {
            console.log('[enrichContact] ✅ Nome obtido via API:', fullName, '| Nickname:', nickname);
          }
        }
      } catch (e) {
        console.log('[enrichContact] ℹ️ Nome não disponível via API');
      }
    }

    if (fullName && fullName.trim()) {
      const parts = fullName.trim().split(/\s+/);
      result.first_name = parts[0];
      result.last_name = parts.length > 1 ? parts.slice(1).join(' ') : null;
      console.log(`[enrichContact] 📝 Nome parseado: "${result.first_name}" "${result.last_name || ''}"`);
    } else {
      result.first_name = result.phone || chatId.split('@')[0];
      console.log('[enrichContact] ⚠️ Usando número como nome fallback:', result.first_name);
    }

    result.nickname = nickname;

    if (result.phone) {
      result.phones.push({ phone: result.phone, type: 'primary' });
    }
    if (result.lid) {
      result.phones.push({ phone: result.lid, type: 'lid' });
    }

  } catch (error) {
    console.error('[enrichContact] ❌ Erro geral:', error.message);
    if (!result.first_name) {
      result.first_name = pushName || chatId.split('@')[0];
    }
    if (!result.phone && !isLid) {
      result.phone = chatId.replace('@c.us', '').replace(/\D/g, '');
    }
  }

  console.log('[enrichContact] 📊 Resultado final:', {
    phone: result.phone,
    lid: result.lid,
    first_name: result.first_name,
    last_name: result.last_name,
    nickname: result.nickname,
    has_avatar: !!result.avatar_url,
    phones_count: result.phones.length
  });

  return result;
}

/**
 * Busca contato existente usando query $or otimizada
 */
async function findExistingContact(base44, companyId, phone, lid, chatId) {
  console.log(`[FIND_CONTACT] Iniciando busca para company_id: ${companyId}, phone: ${phone}, lid: ${lid}, chatId: ${chatId}`);

  if (!companyId) {
    console.error('[FIND_CONTACT] ERRO: company_id está vazio!');
    return null;
  }

  const orConditions = [];

  if (phone) {
    orConditions.push({ phone: phone });
    orConditions.push({ 'phones.phone': phone });
  }

  if (lid) {
    orConditions.push({ 'phones.phone': lid });
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
    const contacts = await base44.asServiceRole.entities.Contact.filter(query);

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

async function processMessage(base44, payload) {
  const chatId = payload.chatId;
  
  if (!chatId || (!chatId.includes("@c.us") && !chatId.includes("@lid"))) {
    console.log("Ignorando webhook que não é de chat de usuário:", payload.event, chatId);
    return;
  }

  const companyId = payload.session.split("_")[0];

  if (!companyId) {
    console.error("Não foi possível determinar o companyId da sessão:", payload.session);
    return;
  }

  if (payload.fromMe) {
    console.log("Ignorando mensagem enviada (fromMe=true)");
    return;
  }

  const wahaApiUrl = Deno.env.get('WAHA_API_URL');
  const wahaApiKey = Deno.env.get('WAHA_API_KEY');

  console.log(`[handleWahaWebhook] 📨 Nova mensagem de: ${chatId}`);

  const isLid = chatId.includes('@lid');
  let contact = null;
  let enrichedData = null;

  console.log(`[handleWahaWebhook] 🔄 Enriquecendo dados do remetente...`);
  enrichedData = await enrichContactFromWaha(
    payload.session,
    chatId,
    payload.pushName,
    wahaApiUrl,
    wahaApiKey
  );

  console.log(`[handleWahaWebhook] 🔍 Buscando contato existente...`);
  console.log(`[handleWahaWebhook] 📋 Critérios de busca: phone=${enrichedData.phone}, lid=${enrichedData.lid}, chatId=${chatId}`);
  
  contact = await findExistingContact(
    base44, 
    companyId, 
    enrichedData.phone,
    enrichedData.lid,
    chatId
  );
  
  console.log(`[handleWahaWebhook] 📊 Resultado da busca: ${contact ? `Encontrado ID ${contact.id}` : 'Não encontrado'}`);

  if (contact) {
    console.log(`[handleWahaWebhook] ✅ Contato EXISTENTE encontrado: ID=${contact.id}, Nome=${contact.first_name} ${contact.last_name || ''}`);

    const updateData = {};

    if (contact.deleted === true) {
      console.log('[handleWahaWebhook] ♻️ Contato estava deletado, restaurando...');
      updateData.deleted = false;
      updateData.deleted_at = null;
      updateData.deleted_by = null;
    }

    updateData.temperature = "quente";
    updateData.last_contact_date = new Date().toISOString();

    if (enrichedData.avatar_url && !contact.avatar_url) {
      updateData.avatar_url = enrichedData.avatar_url;
    }

    if (enrichedData.nickname && !contact.nickname) {
      updateData.nickname = enrichedData.nickname;
      console.log(`[handleWahaWebhook] 📝 Adicionando nickname: ${enrichedData.nickname}`);
    }

    if (enrichedData.first_name && 
        (contact.first_name === 'Novo Contato' || 
         contact.first_name === contact.phone ||
         /^\d+$/.test(contact.first_name))) {
      updateData.first_name = enrichedData.first_name;
      if (enrichedData.last_name) {
        updateData.last_name = enrichedData.last_name;
      }
      console.log(`[handleWahaWebhook] 📝 Atualizando nome: ${enrichedData.first_name} ${enrichedData.last_name || ''}`);
    }

    if (enrichedData.lid) {
      const phones = contact.phones || [];
      const hasLid = phones.some(p => p.type === 'lid' || p.phone === enrichedData.lid);
      if (!hasLid) {
        updateData.phones = [...phones, { phone: enrichedData.lid, type: 'lid' }];
        console.log(`[handleWahaWebhook] 📱 Adicionando LID ao contato: ${enrichedData.lid}`);
      }
    }

    if (enrichedData.phone && !contact.phone) {
      updateData.phone = enrichedData.phone;
      console.log(`[handleWahaWebhook] 📱 Adicionando telefone ao contato: ${enrichedData.phone}`);
    }

    console.log('[handleWahaWebhook] 🔄 Atualizando contato com:', Object.keys(updateData));
    await base44.asServiceRole.entities.Contact.update(contact.id, updateData);
    contact = { ...contact, ...updateData };

  } else {
    console.log(`[handleWahaWebhook] 🆕 Criando novo contato com dados enriquecidos...`);

    const phoneToSave = enrichedData.phone || (isLid ? null : chatId.replace('@c.us', '').replace(/\D/g, ''));

    const contactData = {
      company_id: companyId,
      first_name: enrichedData.first_name || payload.pushName || "Novo Contato",
      last_name: enrichedData.last_name || null,
      nickname: enrichedData.nickname || null,
      phone: phoneToSave,
      avatar_url: enrichedData.avatar_url,
      phones: enrichedData.phones.length > 0 ? enrichedData.phones : [{ phone: chatId, type: isLid ? 'lid' : 'primary' }],
      numberExists: true,
      checked: true,
      temperature: "quente",
      import_type: "whatsapp",
      last_contact_date: new Date().toISOString()
    };

    console.log('[handleWahaWebhook] 📋 Tentando criar contato:', {
      company_id: contactData.company_id,
      first_name: contactData.first_name,
      last_name: contactData.last_name,
      nickname: contactData.nickname,
      phone: contactData.phone,
      has_avatar: !!contactData.avatar_url,
      phones: contactData.phones
    });

    try {
      console.log('[handleWahaWebhook] 🔍 Verificação final antes de criar...');
      const finalCheck = await findExistingContact(base44, companyId, contactData.phone, enrichedData.lid, chatId);

      if (finalCheck) {
        console.log(`[handleWahaWebhook] ⚠️ Contato encontrado na verificação final! ID=${finalCheck.id}`);
        contact = finalCheck;
      } else {
        contact = await base44.asServiceRole.entities.Contact.create(contactData);
        console.log(`[handleWahaWebhook] ✅ Contato criado com sucesso: ${contact.id} - ${contact.first_name} ${contact.last_name || ''}`);
      }
    } catch (createError) {
      console.error('[handleWahaWebhook] ❌ ERRO ao criar contato:', createError.message);

      if (createError.message?.includes('unique') || createError.message?.includes('duplicate')) {
        console.log('[handleWahaWebhook] 🔄 Erro de duplicação detectado, buscando contato existente...');
        await new Promise(resolve => setTimeout(resolve, 500));
        const existingContact = await findExistingContact(base44, companyId, contactData.phone, enrichedData.lid, chatId);
        if (existingContact) {
          console.log(`[handleWahaWebhook] ✅ Contato duplicado encontrado: ${existingContact.id}`);
          contact = existingContact;
        } else {
          throw createError;
        }
      } else {
        throw createError;
      }
    }
  }

  const wahaMessageId = payload.id;
  if (wahaMessageId) {
    try {
      const existingMessages = await base44.asServiceRole.entities.Message.filter({
        company_id: companyId,
        chat_id: chatId
      });
      
      const duplicate = existingMessages.find(msg => 
        msg.metadata?.waha_message_id === wahaMessageId
      );
      
      if (duplicate) {
        console.log(`[handleWahaWebhook] ⚠️ Mensagem duplicada detectada: ${duplicate.id}`);
        return;
      }
    } catch (e) {
      console.log('[handleWahaWebhook] ⚠️ Erro ao verificar duplicação:', e.message);
    }
  }

  const now = Date.now();
  const messageData = {
    company_id: companyId,
    contact_id: contact.id,
    session_name: payload.session,
    chat_id: chatId,
    content: payload.body || `[Tipo de mensagem não suportado: ${payload.type}]`,
    direction: "received",
    type: "chat",
    run_at: payload.timestamp * 1000,
    status: "success",
    created_at: payload.timestamp * 1000,
    updated_at: now,
    metadata: {
      waha_event: payload.event,
      waha_payload: payload,
      waha_message_id: wahaMessageId,
      contact_name: `${contact.first_name} ${contact.last_name || ''}`.trim(),
      contact_avatar: contact.avatar_url,
      phone_number: contact.phone
    },
  };

  console.log(`[handleWahaWebhook] 💾 Criando mensagem...`);
  const createdMessage = await base44.asServiceRole.entities.Message.create(messageData);
  console.log(`[handleWahaWebhook] ✅ Mensagem criada: ID ${createdMessage.id}`);

  try {
    const wsPayload = {
      type: 'message_received',
      company_id: companyId,
      message_id: createdMessage.id,
      chat_id: chatId,
      contact_id: contact.id,
      data: {
        ...createdMessage,
        contact: {
          id: contact.id,
          first_name: contact.first_name,
          last_name: contact.last_name,
          phone: contact.phone,
          avatar_url: contact.avatar_url
        }
      }
    };

    console.log(`[handleWahaWebhook] 📤 Enviando WebSocket...`);
    console.log(`[handleWahaWebhook] 📋 Contato no WS: ${contact.first_name} ${contact.last_name || ''} (${contact.phone || contact.id})`);
    
    await base44.asServiceRole.functions.invoke('sendWebSocketUpdate', wsPayload);
    console.log(`[handleWahaWebhook] ✅ WebSocket enviado`);
  } catch (wsError) {
    console.error(`[handleWahaWebhook] ❌ Erro WebSocket:`, wsError.message);
  }

  try {
    console.log(`[handleWahaWebhook] 🤖 Acionando processamento de IA...`);
    await base44.asServiceRole.functions.invoke('processAIWhatsAppMessage', {
      chat_id: chatId,
      message_id: payload.id,
      content: payload.body || '',
      session_name: payload.session,
      timestamp: payload.timestamp * 1000,
      company_id: companyId,
      contact_id: contact.id
    });
  } catch (aiError) {
    console.error(`[handleWahaWebhook] ❌ Erro ao processar IA:`, aiError);
  }
}

async function processSessionStatus(base44, payload) {
  console.log(`[handleWahaWebhook] 📡 session.status recebido:`, JSON.stringify(payload, null, 2));
  
  const sessionName = payload.session;
  const newStatus = payload.status;
  
  if (!sessionName || !newStatus) {
    console.error('[handleWahaWebhook] session_name ou status ausente no payload');
    return;
  }

  const sessions = await base44.asServiceRole.entities.Session.filter({
    session_name: sessionName
  });

  if (!sessions || sessions.length === 0) {
    console.error(`[handleWahaWebhook] Sessão ${sessionName} não encontrada no banco`);
    return;
  }

  const session = sessions[0];
  console.log(`[handleWahaWebhook] 📋 Sessão encontrada no BD:`, {
    id: session.id,
    session_name: session.session_name,
    company_id: session.company_id,
    status: session.status,
    target_company_id: session.api_response?.target_company_id
  });
  
  const updateData = {
    status: newStatus,
    last_activity: new Date().toISOString()
  };

  if (newStatus === 'WORKING') {
    if (payload.me) {
      console.log(`[handleWahaWebhook] 📋 Dados de payload.me:`, JSON.stringify(payload.me, null, 2));
      
      if (payload.me.id) {
        const phone = payload.me.id.split('@')[0];
        updateData.phone = phone;
        console.log(`[handleWahaWebhook] 📞 Phone capturado: ${phone}`);
      }
      
      if (payload.me.pushName) {
        updateData.push_name = payload.me.pushName;
        console.log(`[handleWahaWebhook] 👤 Push Name capturado: ${payload.me.pushName}`);
      } else if (payload.me.name) {
        updateData.push_name = payload.me.name;
        console.log(`[handleWahaWebhook] 👤 Push Name (via name) capturado: ${payload.me.name}`);
      }
      
      if (payload.me.profilePicUrl) {
        updateData.avatar_url = payload.me.profilePicUrl;
        console.log(`[handleWahaWebhook] 🖼️ Avatar capturado`);
      }
    } else {
      console.warn(`[handleWahaWebhook] ⚠️ Status WORKING recebido sem payload.me - dados do perfil não atualizados`);
    }
  }

  console.log(`[handleWahaWebhook] 💾 Atualizando sessão com dados:`, updateData);
  await base44.asServiceRole.entities.Session.update(session.id, updateData);
  console.log(`[handleWahaWebhook] ✅ Sessão ${sessionName} atualizada para ${newStatus}${updateData.company_id ? ` e transferida para ${updateData.company_id}` : ''}`);

  try {
    const wsPayload = {
      type: 'session_updated',
      company_id: session.company_id,
      session_id: session.id,
      session_name: sessionName,
      status: newStatus,
      phone: updateData.phone || session.phone,
      push_name: updateData.push_name || session.push_name,
      avatar_url: updateData.avatar_url || session.avatar_url,
      data: {
        ...session,
        ...updateData
      }
    };

    const wsResponse = await base44.asServiceRole.functions.invoke('sendWebSocketUpdate', wsPayload);
    
    if (wsResponse?.data?.success) {
      console.log(`[handleWahaWebhook] ✅ WebSocket enviado para ${session.company_id}`);
    }
  } catch (wsError) {
    console.error(`[handleWahaWebhook] ❌ Erro ao enviar WebSocket:`, wsError.message);
  }

  if (updateData.company_id && updateData.company_id !== session.company_id) {
    console.log(`[handleWahaWebhook] 📤 Enviando WebSocket para empresa alvo ${updateData.company_id}`);
    try {
      const wsPayloadTarget = {
        type: 'session_updated',
        company_id: updateData.company_id,
        session_id: session.id,
        session_name: sessionName,
        status: newStatus,
        phone: updateData.phone,
        push_name: updateData.push_name,
        avatar_url: updateData.avatar_url,
        data: {
          ...session,
          ...updateData
        }
      };

      await base44.asServiceRole.functions.invoke('sendWebSocketUpdate', wsPayloadTarget);
      console.log(`[handleWahaWebhook] ✅ WebSocket enviado para empresa alvo ${updateData.company_id}`);
    } catch (wsError) {
      console.error(`[handleWahaWebhook] ❌ Erro ao enviar WebSocket para empresa alvo:`, wsError.message);
    }
  }
}

Deno.serve(async (req) => {
  const webhookSecret = Deno.env.get("WAHA_WEBHOOK_SECRET");
  const authHeader = req.headers.get("X-Webhook-Signature") || req.headers.get("authorization");

  if (webhookSecret && authHeader !== webhookSecret) {
    console.warn("Aviso: Tentativa de webhook não autorizada.");
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  try {
    const payload = await req.json();
    console.log("Webhook WAHA recebido:", payload.event);

    const base44 = createClientFromRequest(req);

    switch (payload.event) {
      case "message":
        await processMessage(base44, payload);
        break;
      case "session.status":
        await processSessionStatus(base44, payload);
        break;
      default:
        console.log(`Evento não tratado: ${payload.event}`);
        break;
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error("Erro ao processar webhook WAHA:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
  }
});