import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const webhookAuthToken = Deno.env.get('WEBSOCKET_AUTH_TOKEN');
        const authHeader = req.headers.get('Authorization');

        if (!authHeader || authHeader !== `Bearer ${webhookAuthToken}`) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const base44 = createClientFromRequest(req);
        const payload = await req.json();
        
        const { job_id, status, error, type_error, attempt_count } = payload;

        if (!job_id) {
            return Response.json({ success: false, error: 'job_id é obrigatório' }, { status: 400 });
        }

        // Buscar mensagem pelo scheduler_job_id
        const messages = await base44.asServiceRole.entities.Message.filter({
            scheduler_job_id: job_id
        });

        if (messages.length === 0) {
            console.warn(`Mensagem não encontrada para job_id: ${job_id}`);
            return Response.json({ 
                success: false, 
                error: 'Mensagem não encontrada'
            }, { status: 404 });
        }

        const message = messages[0];
        const updateData = {
            updated_at: Date.now()
        };

        if (status) {
            updateData.status = status;
        }

        if (error) {
            updateData.error_details = error;
        }

        if (type_error) {
            updateData.type_error = type_error;
            
            // NOVO: Aplicar marcador do sistema se houver erro
            if (type_error !== 'none' && message.contact_id) {
                try {
                    const { applySystemTag } = await import('./applySystemTag.js');
                    await applySystemTag({
                        contact_id: message.contact_id,
                        error_type: type_error,
                        company_id: message.company_id
                    });
                    console.log(`Marcador aplicado para erro ${type_error} no contato ${message.contact_id}`);
                } catch (tagError) {
                    console.error('Erro ao aplicar marcador:', tagError);
                }
            }
        }

        if (attempt_count !== undefined) {
            updateData.attempt_count = attempt_count;
        }

        await base44.asServiceRole.entities.Message.update(message.id, updateData);

        console.log(`Mensagem ${message.id} atualizada: status=${status}, type_error=${type_error}`);

        return Response.json({
            success: true,
            message_id: message.id,
            updated_fields: Object.keys(updateData)
        });

    } catch (error) {
        console.error('Erro ao atualizar mensagem:', error);
        return Response.json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        }, { status: 500 });
    }
});