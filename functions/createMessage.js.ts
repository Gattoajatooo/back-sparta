import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const serviceRoleBase44 = base44.asServiceRole;

        // Parse request body
        const body = await req.json();
        const { session_name, chat_id, scheduler_job_id, batch_id } = body;

        // Validação dos campos obrigatórios
        if (!session_name) {
            return Response.json({
                success: false,
                error: 'session_name é obrigatório'
            }, { status: 400 });
        }

        if (!chat_id) {
            return Response.json({
                success: false,
                error: 'chat_id é obrigatório'
            }, { status: 400 });
        }

        if (!scheduler_job_id) {
            return Response.json({
                success: false,
                error: 'scheduler_job_id é obrigatório'
            }, { status: 400 });
        }

        // batch_id é OPCIONAL - pode ser omitido para mensagens recebidas
        console.log(`[CreateMessage] Iniciando criação de mensagem...`);
        console.log(`  - Session: ${session_name}`);
        console.log(`  - Chat ID: ${chat_id}`);
        console.log(`  - Scheduler Job ID: ${scheduler_job_id}`);
        console.log(`  - Batch ID: ${batch_id || 'não fornecido (mensagem recebida)'}`);

        // Buscar a sessão pelo session_name para obter company_id e session_number
        const sessions = await serviceRoleBase44.entities.Session.filter({
            session_name: session_name
        });

        if (!sessions || sessions.length === 0) {
            console.error(`[CreateMessage] Sessão não encontrada: ${session_name}`);
            return Response.json({
                success: false,
                error: `Sessão não encontrada: ${session_name}`
            }, { status: 404 });
        }

        const session = sessions[0];
        const company_id = session.company_id;
        const user_id = session.user_id || null;
        const session_number = session.phone || null; // ✅ Pegar o telefone da sessão

        console.log(`[CreateMessage] Sessão encontrada:`);
        console.log(`  - Company ID: ${company_id}`);
        console.log(`  - User ID: ${user_id || 'N/A'}`);
        console.log(`  - Session Number: ${session_number || 'N/A'}`); // ✅ Log do número

        // Extrair telefone do chat_id
        const phone = chat_id.split('@')[0];

        // Buscar contact_id baseado no phone
        let contact_id = null;
        try {
            const contacts = await serviceRoleBase44.entities.Contact.filter({
                company_id: company_id,
                phone: phone
            });
            
            if (contacts && contacts.length > 0) {
                contact_id = contacts[0].id;
                console.log(`[CreateMessage] Contato encontrado: ${contact_id}`);
            } else {
                // Se não encontrar, criar um contato básico
                console.log(`[CreateMessage] Contato não encontrado, criando novo...`);
                
                const newContact = await serviceRoleBase44.entities.Contact.create({
                    company_id: company_id,
                    phone: phone,
                    first_name: phone,
                    import_type: 'whatsapp',
                    import_name: 'Auto-criado via webhook'
                });
                
                contact_id = newContact.id;
                console.log(`[CreateMessage] Novo contato criado: ${contact_id}`);
            }
        } catch (error) {
            console.error(`[CreateMessage] Erro ao buscar/criar contato:`, error.message);
            return Response.json({
                success: false,
                error: `Erro ao processar contato: ${error.message}`
            }, { status: 500 });
        }

        // Preparar dados da mensagem
        const currentTimestamp = Date.now();
        
        const messageData = {
            company_id: company_id,
            user_id: user_id,
            contact_id: contact_id,
            session_name: session_name,
            session_number: session_number, // ✅ Adicionar session_number
            chat_id: chat_id,
            scheduler_job_id: scheduler_job_id,
            
            // Campos de status
            direction: 'received',
            status: 'success',
            type: 'immediately',
            
            // Timestamps
            run_at: currentTimestamp,
            created_at: currentTimestamp,
            updated_at: currentTimestamp,
            
            // Content (obrigatório)
            content: body.content || 'Mensagem recebida via webhook',
            
            // Metadata
            metadata: {
                source: 'webhook',
                created_by_function: 'createMessage',
                ...(body.metadata || {})
            }
        };

        // ✅ IMPORTANTE: Só adicionar batch_id se ele existir e for uma string válida
        if (batch_id && typeof batch_id === 'string' && batch_id.trim() !== '') {
            messageData.batch_id = batch_id;
        }

        // Adicionar campos opcionais se fornecidos
        if (body.schedule_id) messageData.schedule_id = body.schedule_id;
        if (body.message_type) messageData.message_type = body.message_type;
        if (body.caption) messageData.caption = body.caption;
        if (body.filename) messageData.filename = body.filename;
        if (body.mimetype) messageData.mimetype = body.mimetype;
        if (body.file_url) messageData.file_url = body.file_url;

        console.log(`[CreateMessage] Criando mensagem no banco de dados...`);

        // Criar a mensagem no banco de dados
        const createdMessage = await serviceRoleBase44.entities.Message.create(messageData);

        console.log(`[CreateMessage] ✅ Mensagem criada com sucesso!`);
        console.log(`  - Message ID: ${createdMessage.id}`);

        // Enviar notificação WebSocket
        try {
            await serviceRoleBase44.functions.invoke('sendWebSocketUpdate', {
                company_id: company_id,
                type: 'message_updated',
                message_id: createdMessage.id,
                scheduler_job_id: scheduler_job_id,
                schedule_id: messageData.schedule_id || null,
                status: 'success',
                data: {
                    ...createdMessage,
                    updated_at: currentTimestamp
                }
            });
            console.log(`[CreateMessage] WebSocket notification sent`);
        } catch (wsError) {
            console.warn(`[CreateMessage] WebSocket notification failed:`, wsError.message);
            // Não falhar a request se o WebSocket falhar
        }

        return Response.json({
            success: true,
            message: 'Mensagem criada com sucesso',
            data: {
                message_id: createdMessage.id,
                company_id: company_id,
                contact_id: contact_id,
                session_name: session_name,
                session_number: session_number, // ✅ Retornar session_number
                chat_id: chat_id,
                scheduler_job_id: scheduler_job_id,
                batch_id: batch_id || null,
                status: 'success',
                direction: 'received'
            }
        });

    } catch (error) {
        console.error('[CreateMessage] Erro:', error);
        return Response.json({
            success: false,
            error: 'Erro ao criar mensagem',
            details: error.message
        }, { status: 500 });
    }
});