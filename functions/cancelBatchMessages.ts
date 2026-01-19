import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || !user.company_id) {
            return Response.json({ 
                success: false, 
                error: 'Usuário não autenticado ou sem empresa.' 
            }, { status: 401 });
        }

        const { scheduler_job_ids, schedule_id } = await req.json();

        if (!scheduler_job_ids || !Array.isArray(scheduler_job_ids) || scheduler_job_ids.length === 0) {
            return Response.json({ 
                success: false, 
                error: 'scheduler_job_ids é obrigatório e deve ser um array não vazio.' 
            }, { status: 400 });
        }

        if (!schedule_id) {
            return Response.json({ 
                success: false, 
                error: 'schedule_id é obrigatório.' 
            }, { status: 400 });
        }

        console.log(`\n🚀 ========== INICIANDO CANCELAMENTO DE CAMPANHA ==========`);
        console.log(`📊 Schedule ID: ${schedule_id}`);
        console.log(`📊 Total de mensagens a cancelar: ${scheduler_job_ids.length}`);

        const scheduleUrl = Deno.env.get("SCHEDULE_URL");
        const jobsApiKey = Deno.env.get("JOBS_API_KEY");

        if (!scheduleUrl || !jobsApiKey) {
            console.warn('⚠️ Configuração do scheduler externo não encontrada. Cancelamento apenas local.');
            
            // Apenas atualizar o Schedule como cancelado
            await base44.asServiceRole.entities.Schedule.update(schedule_id, {
                status: 'cancelled',
                cancelled_at: new Date().toISOString()
            });

            // Também marcar as mensagens como canceladas
            const messages = await base44.asServiceRole.entities.Message.filter({
                schedule_id: schedule_id,
                scheduler_job_id: { '$in': scheduler_job_ids }
            });

            for (const msg of messages) {
                await base44.asServiceRole.entities.Message.update(msg.id, {
                    status: 'cancelled',
                    deleted: true,
                    deleted_at: new Date().toISOString()
                });
            }

            console.log(`✅ Schedule ${schedule_id} e suas mensagens marcados como cancelados (local)`);

            return Response.json({ 
                success: true, 
                message: `Campanha cancelada com sucesso. Scheduler externo indisponível.`,
                cancelled_count: scheduler_job_ids.length
            }, { status: 200 });
        }

        // PASSO 1: Enviar para o Cloudflare Scheduler para cancelar (bulk operation)
        console.log('\n☁️ [PASSO 1/3] Enviando requisição de cancelamento em massa para o Cloudflare...');
        
        const cancelUrl = `${scheduleUrl.replace(/\/$/, '')}/jobs/cancel/batch`;
        const schedulerResponse = await fetch(cancelUrl, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jobsApiKey}` 
            },
            body: JSON.stringify(scheduler_job_ids)
        });

        if (!schedulerResponse.ok) {
            const errorText = await schedulerResponse.text();
            console.error(`❌ Erro do scheduler: ${schedulerResponse.status} - ${errorText}`);
            throw new Error(`Erro do scheduler: ${schedulerResponse.status} - ${errorText}`);
        }

        const schedulerResult = await schedulerResponse.json();
        console.log(`✅ Cloudflare retornou resposta de cancelamento`);
        
        // Analisar resultado
        const acceptedCount = schedulerResult.data?.accepted || 0;
        const acceptedIds = schedulerResult.data?.ids || scheduler_job_ids;
        
        console.log(`   📊 Mensagens aceitas para cancelamento: ${acceptedCount}`);
        console.log(`   📊 IDs aceitos: ${acceptedIds.length}`);
        
        // PASSO 2: Atualizar as mensagens no Base44 para status 'cancelled'
        console.log(`\n💾 [PASSO 2/3] Atualizando mensagens no Base44 para status 'cancelled'...`);
        
        // Buscar e atualizar mensagens em lotes
        const BATCH_SIZE = 100;
        let updatedMessagesCount = 0;
        
        for (let i = 0; i < scheduler_job_ids.length; i += BATCH_SIZE) {
            const batchIds = scheduler_job_ids.slice(i, i + BATCH_SIZE);
            
            try {
                // Buscar mensagens com esses scheduler_job_ids
                const messages = await base44.asServiceRole.entities.Message.filter({
                    scheduler_job_id: { '$in': batchIds },
                    company_id: user.company_id
                });
                
                // Atualizar cada mensagem
                for (const msg of messages) {
                    await base44.asServiceRole.entities.Message.update(msg.id, {
                        status: 'cancelled',
                        updated_at: Date.now()
                    });
                    updatedMessagesCount++;
                }
                
                console.log(`   ✓ Lote ${Math.floor(i / BATCH_SIZE) + 1}: ${messages.length} mensagens atualizadas`);
            } catch (batchError) {
                console.error(`   ❌ Erro no lote ${Math.floor(i / BATCH_SIZE) + 1}:`, batchError.message);
            }
        }
        
        console.log(`   📊 Total de mensagens atualizadas: ${updatedMessagesCount}`);

        // PASSO 3: Atualizar Schedule para "cancelled" (cancelamento concluído)
        console.log(`\n💾 [PASSO 3/3] Atualizando Schedule ${schedule_id} para status 'cancelled'...`);
        
        await base44.asServiceRole.entities.Schedule.update(schedule_id, {
            status: 'cancelled',
            cancelled_at: new Date().toISOString()
        });

        console.log(`✅ Schedule ${schedule_id} marcado como 'cancelled'`);

        console.log(`\n✅ ========== CANCELAMENTO CONCLUÍDO ==========`);
        console.log(`   📊 Resumo:`);
        console.log(`      • Aceitas pelo Cloudflare: ${acceptedCount}`);
        console.log(`      • Mensagens atualizadas no Base44: ${updatedMessagesCount}`);
        console.log(`      • Schedule status: cancelled`);

        return Response.json({ 
            success: true, 
            message: `Campanha cancelada com sucesso. ${updatedMessagesCount} mensagens canceladas.`,
            details: schedulerResult,
            accepted_count: acceptedCount,
            updated_messages_count: updatedMessagesCount,
            schedule_id: schedule_id,
            schedule_status: 'cancelled'
        }, { status: 200 });

    } catch (error) {
        console.error('\n❌ ========== ERRO NO CANCELAMENTO ==========');
        console.error(error);
        return Response.json({ 
            success: false, 
            error: 'Erro interno do servidor.',
            details: error.message 
        }, { status: 500 });
    }
});