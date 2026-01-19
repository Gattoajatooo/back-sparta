import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Processa mensagens com erro e aplica marcadores do sistema
 * Pode ser chamado manualmente ou por um cron job
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verificar autenticação
        const user = await base44.auth.me();
        if (!user || !user.company_id) {
            return Response.json({ 
                success: false, 
                error: 'Não autenticado' 
            }, { status: 401 });
        }

        const { message_ids } = await req.json().catch(() => ({}));

        let messagesToProcess;

        if (message_ids && message_ids.length > 0) {
            // Processar mensagens específicas
            messagesToProcess = [];
            for (const msgId of message_ids) {
                try {
                    const msg = await base44.asServiceRole.entities.Message.get(msgId);
                    if (msg) messagesToProcess.push(msg);
                } catch (error) {
                    console.error(`Erro ao buscar mensagem ${msgId}:`, error);
                }
            }
        } else {
            // Buscar mensagens com erro que ainda não foram processadas
            messagesToProcess = await base44.asServiceRole.entities.Message.filter({
                company_id: user.company_id,
                status: 'failed',
                type_error: { $ne: 'none' }
            });
        }

        console.log(`Processando ${messagesToProcess.length} mensagens com erro`);

        const processedContacts = new Set();
        const results = {
            total_messages: messagesToProcess.length,
            tags_applied: 0,
            contacts_affected: 0,
            errors: []
        };

        for (const message of messagesToProcess) {
            const errorType = message.type_error;
            const contactId = message.contact_id;

            if (!errorType || errorType === 'none' || !contactId) {
                continue;
            }

            // Evitar processar o mesmo contato múltiplas vezes
            const key = `${contactId}_${errorType}`;
            if (processedContacts.has(key)) {
                continue;
            }

            try {
                // Chamar função para aplicar marcador
                const { applySystemTag } = await import('./applySystemTag.js');
                const response = await applySystemTag({
                    contact_id: contactId,
                    error_type: errorType,
                    company_id: user.company_id
                });

                if (response.data?.tag_applied) {
                    results.tags_applied++;
                    results.contacts_affected++;
                }

                processedContacts.add(key);

            } catch (error) {
                console.error(`Erro ao processar contato ${contactId}:`, error);
                results.errors.push({
                    contact_id: contactId,
                    error: error.message
                });
            }
        }

        return Response.json({
            success: true,
            message: `Processamento concluído: ${results.tags_applied} marcador(es) aplicado(s) em ${results.contacts_affected} contato(s)`,
            results: results
        });

    } catch (error) {
        console.error('Erro ao processar mensagens com erro:', error);
        return Response.json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        }, { status: 500 });
    }
});