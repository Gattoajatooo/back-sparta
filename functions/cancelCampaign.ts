import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

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

        const { schedule_id } = await req.json();

        if (!schedule_id) {
            return Response.json({ 
                success: false, 
                error: 'schedule_id é obrigatório.' 
            }, { status: 400 });
        }

        console.log(`\n🚀 ========== CANCELANDO CAMPANHA ==========`);
        console.log(`📊 Schedule ID: ${schedule_id}`);

        // Buscar a campanha
        const schedule = await base44.asServiceRole.entities.Schedule.get(schedule_id);

        if (!schedule) {
            return Response.json({ 
                success: false, 
                error: 'Campanha não encontrada.' 
            }, { status: 404 });
        }

        console.log(`📋 Tipo: ${schedule.type}, Status: ${schedule.status}, Dinâmica: ${schedule.is_dynamic_campaign}`);

        const scheduleUrl = Deno.env.get("SCHEDULE_URL");
        const jobsApiKey = Deno.env.get("JOBS_API_KEY");

        let totalCancelled = 0;
        let totalBatchesCancelled = 0;

        // CASO 1: Campanhas Imediatas em execução
        if (schedule.type === 'immediate' && (schedule.status === 'processing' || schedule.status === 'pending')) {
            console.log('\n📌 Tipo: IMEDIATA em execução');
            
            // Buscar todas as mensagens pendentes
            const pendingMessages = await base44.asServiceRole.entities.Message.filter({
                schedule_id: schedule_id,
                company_id: user.company_id,
                status: 'pending'
            });

            console.log(`   📊 ${pendingMessages.length} mensagens pendentes encontradas`);

            if (pendingMessages.length > 0) {
                const jobIds = pendingMessages
                    .map(msg => msg.scheduler_job_id)
                    .filter(Boolean);

                if (jobIds.length > 0 && scheduleUrl && jobsApiKey) {
                    // Cancelar no Cloudflare
                    const cancelUrl = `${scheduleUrl.replace(/\/$/, '')}/jobs/cancel/batch`;
                    const schedulerResponse = await fetch(cancelUrl, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${jobsApiKey}` 
                        },
                        body: JSON.stringify(jobIds)
                    });

                    if (schedulerResponse.ok) {
                        console.log(`   ✅ ${jobIds.length} jobs cancelados no Cloudflare`);
                    }
                }

                // Atualizar mensagens no Base44
                for (const msg of pendingMessages) {
                    await base44.asServiceRole.entities.Message.update(msg.id, {
                        status: 'cancelled',
                        updated_at: Date.now()
                    });
                    totalCancelled++;
                }
            }
        }

        // CASO 2: Campanhas Agendadas
        else if (schedule.type === 'scheduled') {
            console.log('\n📌 Tipo: AGENDADA');
            
            // Buscar mensagens futuras ou pendentes
            const now = Date.now();
            const messagesToCancel = await base44.asServiceRole.entities.Message.filter({
                schedule_id: schedule_id,
                company_id: user.company_id,
                status: { '$in': ['pending', 'retry'] }
            });

            // Filtrar apenas futuras se estiver em execução
            let filtered = messagesToCancel;
            if (schedule.status === 'processing') {
                filtered = messagesToCancel.filter(msg => msg.run_at > now);
            }

            console.log(`   📊 ${filtered.length} mensagens a cancelar`);

            if (filtered.length > 0) {
                const jobIds = filtered.map(msg => msg.scheduler_job_id).filter(Boolean);

                if (jobIds.length > 0 && scheduleUrl && jobsApiKey) {
                    const cancelUrl = `${scheduleUrl.replace(/\/$/, '')}/jobs/cancel/batch`;
                    const schedulerResponse = await fetch(cancelUrl, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${jobsApiKey}` 
                        },
                        body: JSON.stringify(jobIds)
                    });

                    if (schedulerResponse.ok) {
                        console.log(`   ✅ ${jobIds.length} jobs cancelados no Cloudflare`);
                    }
                }

                for (const msg of filtered) {
                    await base44.asServiceRole.entities.Message.update(msg.id, {
                        status: 'cancelled',
                        updated_at: Date.now()
                    });
                    totalCancelled++;
                }
            }
        }

        // CASO 3 e 4: Campanhas Recorrentes ou Dinâmicas
        else if (schedule.type === 'recurring') {
            console.log(`\n📌 Tipo: RECORRENTE ${schedule.is_dynamic_campaign ? '(DINÂMICA)' : ''}`);
            
            // Buscar todos os lotes desta campanha
            const allBatches = await base44.asServiceRole.entities.BatchSchedule.filter({
                schedule_id: schedule_id,
                company_id: user.company_id
            });

            console.log(`   📊 ${allBatches.length} lotes encontrados`);

            // Separar por status
            const approvedBatches = allBatches.filter(b => b.status === 'approved' || b.status === 'processing');
            const pendingBatches = allBatches.filter(b => b.status === 'pending');

            console.log(`   📊 Aprovados/Processando: ${approvedBatches.length}`);
            console.log(`   📊 Pendentes: ${pendingBatches.length}`);

            // Processar lotes aprovados - cancelar mensagens
            for (const batch of approvedBatches) {
                const batchMessages = await base44.asServiceRole.entities.Message.filter({
                    batch_id: batch.id,
                    company_id: user.company_id,
                    status: { '$in': ['pending', 'retry'] }
                });

                console.log(`   📦 Lote ${batch.batch_number}: ${batchMessages.length} mensagens pendentes`);

                if (batchMessages.length > 0) {
                    const jobIds = batchMessages.map(msg => msg.scheduler_job_id).filter(Boolean);

                    if (jobIds.length > 0 && scheduleUrl && jobsApiKey) {
                        const cancelUrl = `${scheduleUrl.replace(/\/$/, '')}/jobs/cancel/batch`;
                        const schedulerResponse = await fetch(cancelUrl, {
                            method: 'POST',
                            headers: { 
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${jobsApiKey}` 
                            },
                            body: JSON.stringify(jobIds)
                        });

                        if (schedulerResponse.ok) {
                            console.log(`      ✅ ${jobIds.length} jobs cancelados no Cloudflare`);
                        }
                    }

                    // Atualizar mensagens
                    for (const msg of batchMessages) {
                        await base44.asServiceRole.entities.Message.update(msg.id, {
                            status: 'cancelled',
                            updated_at: Date.now()
                        });
                        totalCancelled++;
                    }
                }

                // Marcar lote como cancelado
                await base44.asServiceRole.entities.BatchSchedule.update(batch.id, {
                    status: 'cancelled',
                    updated_at: new Date().toISOString()
                });
                totalBatchesCancelled++;
            }

            // Processar lotes pendentes
            for (const batch of pendingBatches) {
                if (schedule.is_dynamic_campaign) {
                    // DINÂMICA: Apenas marcar lote como cancelado (sem mensagens criadas)
                    console.log(`   📦 Lote dinâmico ${batch.batch_number}: marcando como cancelado (sem mensagens)`);
                    
                    await base44.asServiceRole.entities.BatchSchedule.update(batch.id, {
                        status: 'cancelled',
                        updated_at: new Date().toISOString()
                    });
                } else {
                    // RECORRENTE: Excluir mensagens e marcar lote como cancelado
                    const batchMessages = await base44.asServiceRole.entities.Message.filter({
                        batch_id: batch.id,
                        company_id: user.company_id
                    });

                    console.log(`   📦 Lote ${batch.batch_number}: ${batchMessages.length} mensagens para excluir`);

                    if (batchMessages.length > 0) {
                        const jobIds = batchMessages.map(msg => msg.scheduler_job_id).filter(Boolean);

                        if (jobIds.length > 0 && scheduleUrl && jobsApiKey) {
                            const cancelUrl = `${scheduleUrl.replace(/\/$/, '')}/jobs/cancel/batch`;
                            await fetch(cancelUrl, {
                                method: 'POST',
                                headers: { 
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${jobsApiKey}` 
                                },
                                body: JSON.stringify(jobIds)
                            });
                        }

                        // Deletar mensagens
                        for (const msg of batchMessages) {
                            await base44.asServiceRole.entities.Message.delete(msg.id);
                            totalCancelled++;
                        }
                    }

                    // Marcar lote como cancelado
                    await base44.asServiceRole.entities.BatchSchedule.update(batch.id, {
                        status: 'cancelled',
                        updated_at: new Date().toISOString()
                    });
                }
                totalBatchesCancelled++;
            }
        }

        // Atualizar Schedule para cancelado
        await base44.asServiceRole.entities.Schedule.update(schedule_id, {
            status: 'cancelled',
            cancelled_at: new Date().toISOString()
        });

        console.log(`\n✅ ========== CANCELAMENTO CONCLUÍDO ==========`);
        console.log(`   📊 Mensagens canceladas: ${totalCancelled}`);
        console.log(`   📊 Lotes cancelados: ${totalBatchesCancelled}`);

        return Response.json({ 
            success: true, 
            message: `Campanha cancelada com sucesso.`,
            cancelled_messages: totalCancelled,
            cancelled_batches: totalBatchesCancelled
        }, { status: 200 });

    } catch (error) {
        console.error('\n❌ ========== ERRO NO CANCELAMENTO ==========');
        console.error(error);
        return Response.json({ 
            success: false, 
            error: 'Erro ao cancelar campanha.',
            details: error.message 
        }, { status: 500 });
    }
});