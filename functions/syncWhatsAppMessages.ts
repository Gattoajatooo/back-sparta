import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { session_name, chat_id, limit = 50 } = await req.json();

    if (!session_name || !chat_id) {
      return Response.json({ 
        success: false, 
        error: 'session_name e chat_id são obrigatórios' 
      }, { status: 400 });
    }

    console.log(`[SyncWhatsAppMessages] Iniciando sincronização para ${chat_id} na sessão ${session_name}`);

    // Buscar sessão
    const sessions = await base44.asServiceRole.entities.Session.filter({ session_name });
    if (!sessions?.length) {
      return Response.json({ 
        success: false, 
        error: `Sessão não encontrada: ${session_name}` 
      }, { status: 404 });
    }

    const session = sessions[0];
    const company_id = session.company_id;
    const session_number = session.phone;

    // Configuração WAHA
    const wahaUrl = Deno.env.get('WAHA_API_URL');
    const wahaApiKey = Deno.env.get('WAHA_API_KEY');

    if (!wahaUrl || !wahaApiKey) {
      return Response.json({ 
        success: false, 
        error: 'Configuração WAHA não encontrada' 
      }, { status: 500 });
    }

    // Buscar contato associado ao chat_id uma vez
    const phoneFromChat = chat_id.split('@')[0];
    let contact_id = null;

    const contacts = await base44.asServiceRole.entities.Contact.filter({
      company_id,
      phone: phoneFromChat
    });

    if (!contacts?.length) {
      const allContacts = await base44.asServiceRole.entities.Contact.filter({ company_id });
      const found = allContacts.find(c =>
        Array.isArray(c.phones) && c.phones.some(p => p.phone === phoneFromChat)
      );
      if (found) contact_id = found.id;
    } else {
      contact_id = contacts[0].id;
    }

    console.log(`[SyncWhatsAppMessages] Contact ID encontrado: ${contact_id || 'nenhum'}`);

    // Contadores globais
    let totalNewMessages = 0;
    let totalDuplicates = 0;
    let totalErrors = 0;
    const allErrors = [];

    // Helper para delay
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // Buscar e processar em lotes de 5
    const BATCH_SIZE = 5;
    const MAX_BATCHES = 10; // 50 mensagens no total
    const encodedChatId = encodeURIComponent(chat_id);

    for (let batchIndex = 0; batchIndex < MAX_BATCHES; batchIndex++) {
      const offset = batchIndex * BATCH_SIZE;
      
      console.log(`[SyncWhatsAppMessages] Buscando lote ${batchIndex + 1}/${MAX_BATCHES} (offset: ${offset})`);

      // Buscar lote de mensagens
      const apiUrl = `${wahaUrl}/api/${session_name}/chats/${encodedChatId}/messages?sortBy=timestamp&sortOrder=desc&downloadMedia=false&limit=${BATCH_SIZE}&offset=${offset}`;

      const response = await fetch(apiUrl, {
        headers: {
          'accept': 'application/json',
          'X-Api-Key': wahaApiKey
        }
      });

      if (!response.ok) {
        console.error(`[SyncWhatsAppMessages] Erro na API WAHA (lote ${batchIndex + 1}): ${response.status}`);
        break;
      }

      const batchMessages = await response.json();
      
      // Se não há mais mensagens, parar
      if (!batchMessages || batchMessages.length === 0) {
        console.log(`[SyncWhatsAppMessages] Nenhuma mensagem no lote ${batchIndex + 1}, parando`);
        break;
      }

      console.log(`[SyncWhatsAppMessages] Processando ${batchMessages.length} mensagens do lote ${batchIndex + 1}`);

      // Processar mensagens do lote
      for (const wahaMsg of batchMessages) {
        try {
          // Verificar se já existe
          const existing = await base44.asServiceRole.entities.Message.filter({
            scheduler_job_id: wahaMsg.id
          });

          if (existing?.length) {
            totalDuplicates++;
            continue;
          }

          // Criar registro de mensagem
          const messageData = {
            company_id,
            session_name,
            session_number,
            chat_id,
            scheduler_job_id: wahaMsg.id,
            direction: wahaMsg.fromMe ? 'sent' : 'received',
            status: 'success',
            type: 'chat',
            content: wahaMsg.body || '',
            created_at: wahaMsg.timestamp * 1000,
            updated_at: Date.now(),
            run_at: wahaMsg.timestamp * 1000,
            metadata: {
              source: 'waha_sync',
              ack: wahaMsg.ack,
              ackName: wahaMsg.ackName,
              hasMedia: wahaMsg.hasMedia,
              message_type: wahaMsg._data?.type || 'text',
              notifyName: wahaMsg._data?.notifyName,
              media_needs_download: wahaMsg.hasMedia,
              has_caption: !!(wahaMsg.body && wahaMsg.hasMedia)
            }
          };

          if (contact_id) {
            messageData.contact_id = contact_id;
          }

          // Se tem mídia, salvar TODOS os dados necessários para desencriptação
          if (wahaMsg.hasMedia && wahaMsg._data) {
            // Salvar no root da mensagem
            messageData.mimetype = wahaMsg._data.mimetype || 'application/octet-stream';

            const ext = wahaMsg._data.mimetype?.split('/')[1] || 'bin';
            messageData.filename = wahaMsg.media?.filename || `media_${wahaMsg.id}.${ext}`;

            // Salvar URL temporária se disponível
            if (wahaMsg._data.deprecatedMms3Url) {
              messageData.media_url = wahaMsg._data.deprecatedMms3Url;
            }

            // CRÍTICO: Salvar TODOS os dados de desencriptação no metadata
            messageData.metadata.directPath = wahaMsg._data.directPath;
            messageData.metadata.mediaKey = wahaMsg._data.mediaKey;
            messageData.metadata.mimetype = wahaMsg._data.mimetype;
            messageData.metadata.filehash = wahaMsg._data.filehash;
            messageData.metadata.encFilehash = wahaMsg._data.encFilehash;
            messageData.metadata.size = wahaMsg._data.size;
            messageData.metadata.width = wahaMsg._data.width;
            messageData.metadata.height = wahaMsg._data.height;

            // messageSecret como objeto ou array
            if (wahaMsg._data.messageSecret) {
              messageData.metadata.messageSecret = wahaMsg._data.messageSecret;
            }
          }

          await base44.asServiceRole.entities.Message.create(messageData);
          totalNewMessages++;

          // Notificar via WebSocket após cada mensagem criada
          try {
            await base44.asServiceRole.functions.invoke('sendWebSocketUpdate', {
              company_id,
              type: 'message_updated',
              data: { 
                chat_id, 
                message_id: wahaMsg.id,
                batch: batchIndex + 1,
                total_synced: totalNewMessages
              }
            });
          } catch (wsError) {
            console.warn('[SyncWhatsAppMessages] Erro ao enviar WebSocket:', wsError.message);
          }

        } catch (msgError) {
          console.error(`[SyncWhatsAppMessages] Erro ao processar mensagem ${wahaMsg.id}:`, msgError);
          totalErrors++;
          allErrors.push({
            message_id: wahaMsg.id,
            error: msgError.message
          });
        }
      }

      // Delay entre lotes para evitar rate limit
      if (batchIndex < MAX_BATCHES - 1) {
        await delay(2000); // 2 segundos entre cada lote
      }
    }

    console.log(`[SyncWhatsAppMessages] Sincronização completa: ${totalNewMessages} novas, ${totalDuplicates} duplicadas, ${totalErrors} erros`);

    return Response.json({
      success: true,
      message: `Sincronização concluída`,
      data: {
        new_messages: totalNewMessages,
        duplicates: totalDuplicates,
        errors: totalErrors,
        error_details: allErrors.length > 0 ? allErrors : null
      }
    });

  } catch (error) {
    console.error('[SyncWhatsAppMessages] Erro geral:', error);
    return Response.json({
      success: false,
      error: 'Erro ao sincronizar mensagens',
      details: error.message
    }, { status: 500 });
  }
});