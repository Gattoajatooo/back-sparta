import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Enviar progresso via WebSocket
async function sendProgress(base44, companyId, progressData) {
    try {
        await base44.asServiceRole.functions.invoke('sendWebSocketUpdate', {
            company_id: companyId,
            event_type: 'bulk_delete_progress',
            data: progressData
        });
    } catch (error) {
        console.error('❌ Erro ao enviar progresso:', error);
    }
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user?.company_id) {
            return Response.json({
                success: false,
                error: 'Unauthorized - No company found'
            }, { status: 401 });
        }

        const { contactIds, restore = false } = await req.json();

        if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
            return Response.json({
                success: false,
                error: 'contactIds array is required'
            }, { status: 400 });
        }

        console.log(`🔄 Starting bulk ${restore ? 'restore' : 'delete'} for ${contactIds.length} contacts`);

        // Enviar progresso inicial
        await sendProgress(base44, user.company_id, {
            total: contactIds.length,
            processed: 0,
            successful: 0,
            failed: 0,
            status: 'processing'
        });

        const results = {
            successful: 0,
            failed: 0,
            errors: []
        };

        // Fila de IDs pendentes (inicialmente todos)
        let pendingIds = [...contactIds];
        let rateLimitQueue = []; // Fila para rate limit

        while (pendingIds.length > 0 || rateLimitQueue.length > 0) {
            // Se a fila principal está vazia, mover da fila de rate limit
            if (pendingIds.length === 0 && rateLimitQueue.length > 0) {
                console.log(`⏳ Movendo ${rateLimitQueue.length} contatos da fila de rate limit`);
                await new Promise(resolve => setTimeout(resolve, 10000)); // Aguardar 10s
                pendingIds = [...rateLimitQueue];
                rateLimitQueue = [];
            }

            // Processar próximo lote
            const BATCH_SIZE = 10;
            const batch = pendingIds.splice(0, BATCH_SIZE);
            
            console.log(`📦 Processando ${batch.length} contatos (${results.successful + results.failed}/${contactIds.length} completos)`);

            for (const contactId of batch) {
                try {
                    // Buscar contato para saneamento
                    let contact = await base44.asServiceRole.entities.Contact.get(contactId);
                    
                    if (!contact) {
                        console.warn(`⚠️ Contact ${contactId} not found`);
                        results.failed++;
                        results.errors.push({ contactId, error: 'Contact not found' });
                        continue;
                    }

                    // Saneamento de notes
                    if (contact.notes && !Array.isArray(contact.notes)) {
                        contact.notes = [];
                    }

                    // ✅ EXCLUSÃO PERMANENTE (não usa mais soft delete)
                    if (restore) {
                        contact.deleted = false;
                        contact.deleted_at = null;
                        contact.deleted_by = null;
                        await base44.asServiceRole.entities.Contact.update(contactId, contact);
                    } else {
                        // DELETE PERMANENTE
                        await base44.asServiceRole.entities.Contact.delete(contactId);
                    }
                    results.successful++;

                    // Enviar progresso em tempo real
                    await sendProgress(base44, user.company_id, {
                        total: contactIds.length,
                        processed: results.successful + results.failed,
                        successful: results.successful,
                        failed: results.failed,
                        status: 'processing'
                    });

                } catch (error) {
                    const errorMsg = error.message || String(error);
                    
                    // Rate limit: mover para fila especial
                    if (errorMsg.includes('Rate limit') || errorMsg.includes('rate limit')) {
                        console.warn(`⏳ Rate limit em ${contactId}, movendo para fila`);
                        rateLimitQueue.push(contactId);
                    } else {
                        // Outros erros: registrar falha
                        console.error(`❌ Erro em ${contactId}:`, errorMsg);
                        results.failed++;
                        results.errors.push({ contactId, error: errorMsg });
                        
                        await sendProgress(base44, user.company_id, {
                            total: contactIds.length,
                            processed: results.successful + results.failed,
                            successful: results.successful,
                            failed: results.failed,
                            status: 'processing'
                        });
                    }
                }
            }

            // Pequena pausa entre lotes
            if (pendingIds.length > 0 || rateLimitQueue.length > 0) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        console.log(`✅ Concluído: ${results.successful} sucesso, ${results.failed} falhas`);

        // Enviar progresso final
        await sendProgress(base44, user.company_id, {
            total: contactIds.length,
            processed: contactIds.length,
            successful: results.successful,
            failed: results.failed,
            status: 'completed'
        });

        return Response.json({
            success: true,
            successful: results.successful,
            failed: results.failed,
            total: contactIds.length,
            errors: results.errors
        });

    } catch (error) {
        console.error('❌ Erro na operação:', error);
        return Response.json({
            success: false,
            error: 'Internal server error',
            details: error.message
        }, { status: 500 });
    }
});