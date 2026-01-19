import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // ⚠️ Esta função é chamada pelo scheduler externo (Cloudflare Worker)
        // Não requer autenticação de usuário - usa service role
        
        const body = await req.json();
        const { scheduler_job_id, status, type_error, error_details, attempt_count } = body;

        if (!scheduler_job_id) {
            return Response.json({ 
                success: false, 
                error: 'scheduler_job_id is required' 
            }, { status: 400 });
        }

        console.log(`[updateMessage] Atualizando mensagem ${scheduler_job_id} para status: ${status}`);

        // 🔥 Usar service role para buscar mensagem (não requer user auth)
        const messages = await base44.asServiceRole.entities.Message.filter({
            scheduler_job_id: scheduler_job_id
        });

        if (!messages || messages.length === 0) {
            return Response.json({ 
                success: false, 
                error: 'Message not found' 
            }, { status: 404 });
        }

        const message = messages[0];
        const updateData = {
            status: status,
            updated_at: Date.now()
        };

        if (type_error) {
            updateData.type_error = type_error;
        }
        if (error_details) {
            updateData.error_details = error_details;
        }
        if (attempt_count !== undefined) {
            updateData.attempt_count = attempt_count;
        }

        // 🔥 Atualizar com service role
        await base44.asServiceRole.entities.Message.update(message.id, updateData);

        console.log(`[updateMessage] ✅ Mensagem ${scheduler_job_id} atualizada com sucesso`);

        // 🔥 ENVIAR NOTIFICAÇÃO WEBSOCKET COM ESTRUTURA CORRETA
        try {
            console.log(`[updateMessage] 📡 Enviando notificação WebSocket...`);
            
            // 🔥 CAMPOS NO NÍVEL RAIZ (o frontend espera assim)
            const wsPayload = {
                type: 'message_updated',
                company_id: message.company_id,
                schedule_id: message.schedule_id,  // ✅ No nível raiz
                message_id: message.id,             // ✅ No nível raiz
                scheduler_job_id: message.scheduler_job_id, // ✅ No nível raiz
                status: status,                     // ✅ No nível raiz
                type_error: type_error || 'none',
                error_details: error_details,
                attempt_count: attempt_count,
                data: {
                    ...message,
                    status: status,
                    type_error: type_error || 'none',
                    error_details: error_details,
                    attempt_count: attempt_count,
                    updated_at: updateData.updated_at
                }
            };

            const wsResponse = await base44.asServiceRole.functions.invoke('sendWebSocketUpdate', wsPayload);
            
            if (wsResponse?.data?.success) {
                console.log(`[updateMessage] ✅ WebSocket enviado - ${wsResponse.data.delivered || 0} cliente(s)`);
            } else {
                console.warn(`[updateMessage] ⚠️ WebSocket falhou:`, wsResponse?.data);
            }
        } catch (wsError) {
            console.error(`[updateMessage] ❌ Erro ao enviar WebSocket:`, wsError.message);
            // Não falhar a requisição se o WebSocket falhar
        }

        return Response.json({ 
            success: true,
            message_id: message.id,
            status: status
        });

    } catch (error) {
        console.error('[updateMessage] ❌ Erro:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});