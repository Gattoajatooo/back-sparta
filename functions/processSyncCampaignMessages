import { createClient } from 'npm:@base44/sdk@0.7.1';

const base44 = createClient({
    appId: Deno.env.get('BASE44_APP_ID'),
    serviceRoleKey: Deno.env.get('BASE44_SERVICE_ROLE_KEY')
});

Deno.serve(async (req) => {
    try {
        const { schedule_id, company_id, job_id } = await req.json();

        if (!schedule_id || !company_id || !job_id) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'schedule_id, company_id e job_id são obrigatórios' 
            }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        console.log(`\n🔄 [Worker Sync] Iniciando sincronização para schedule_id: ${schedule_id}`);
        console.log(`   Job ID: ${job_id}`);
        console.log(`   Company ID: ${company_id}`);

        const scheduleUrl = Deno.env.get('SCHEDULE_URL');
        const jobsApiKey = Deno.env.get('JOBS_API_KEY');

        if (!scheduleUrl || !jobsApiKey) {
            throw new Error('Configuração do scheduler ausente (SCHEDULE_URL ou JOBS_API_KEY).');
        }

        // PASSO 1: Buscar summary da campanha no Cloudflare
        console.log(`\n📊 [Worker Sync] Buscando summary da campanha...`);
        const apiUrl = `${scheduleUrl.replace(/\/$/, '')}/jobs/company_id=${company_id}/schedule_id=${schedule_id}`;

        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${jobsApiKey}` }
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            throw new Error(`Erro ao buscar status dos jobs: ${response.status} - ${errorText}`);
        }

        const apiResult = await response.json();
        if (!apiResult?.success || !apiResult?.data) {
            console.warn(`[Worker Sync] Resposta inválida da API:`, apiResult);
            return new Response(JSON.stringify({ 
                success: true, 
                updated_count: 0, 
                message: 'Resposta inválida da API externa.' 
            }), { 
                status: 200, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        const summary = apiResult.data.summary;
        const jobsFromApi = apiResult.data.rows || [];

        console.log(`📋 [Worker Sync] Summary da campanha:`, summary);
        console.log(`   Total de jobs retornados: ${jobsFromApi.length}`);

        // PASSO 2: Verificar se há mensagens pending no Cloudflare
        const statusCounts = summary?.by_status || [];
        const pendingInCloudflare = statusCounts.find(s => s.status === 'pending');
        const hasPendingJobs = pendingInCloudflare && pendingInCloudflare.count > 0;

        console.log(`   Mensagens pending no Cloudflare: ${hasPendingJobs ? pendingInCloudflare.count : 0}`);

        // PASSO 3: Buscar Schedule atual
        const schedule = await base44.entities.Schedule.get(schedule_id);
        if (!schedule) {
            throw new Error(`Schedule ${schedule_id} não encontrado`);
        }

        // PASSO 4: Buscar apenas mensagens PENDING no Base44
        console.log(`\n📋 [Worker Sync] Buscando mensagens PENDING no Base44...`);
        
        const pendingMessages = await base44.entities.Message.filter({ 
            schedule_id: schedule_id,
            company_id: company_id,
            status: 'pending'
        });
        
        console.log(`   ✓ ${pendingMessages.length} mensagens PENDING encontradas no Base44`);

        if (pendingMessages.length === 0) {
            console.log('   ℹ️ Nenhuma mensagem pendente no Base44 para sincronizar');
            
            // Se não há pending no Cloudflare e no Base44, finalizar a campanha
            if (!hasPendingJobs) {
                let finalStatus = 'completed';
                
                // Se a campanha estava em "cancelling", marcar como "cancelled"
                if (schedule.status === 'cancelling') {
                    finalStatus = 'cancelled';
                    console.log(`   ✅ Campanha estava em cancelamento, marcando como cancelada`);
                } else {
                    console.log(`   ✅ Campanha concluída, todas as mensagens foram processadas`);
                }
                
                await base44.entities.Schedule.update(schedule_id, {
                    status: finalStatus,
                    ...(finalStatus === 'cancelled' ? { cancelled_at: new Date().toISOString() } : { completed_at: new Date().toISOString() })
                });
            }
            
            // Enviar update via WebSocket
            await fetch(Deno.env.get('BASE44_APP_URL') + '/functions/sendWebSocketUpdate', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Deno.env.get('BASE44_SERVICE_ROLE_KEY')}`
                },
                body: JSON.stringify({
                    company_id: company_id,
                    event_type: 'sync_complete',
                    data: {
                        job_id: job_id,
                        schedule_id: schedule_id,
                        status: 'completed',
                        updated_count: 0,
                        total_jobs: 0,
                        progress: 100,
                        campaign_completed: !hasPendingJobs
                    }
                })
            });

            return new Response(JSON.stringify({ 
                success: true, 
                updated_count: 0, 
                message: 'Nenhuma mensagem pendente para sincronizar.',
                campaign_completed: !hasPendingJobs
            }), { 
                status: 200, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        // PASSO 5: Criar mapa de jobs do Cloudflare
        const jobsMap = new Map(jobsFromApi.map(job => [job.id, job]));

        // PASSO 6: Filtrar apenas mensagens pending que mudaram de status
        const messagesToUpdate = [];
        for (const message of pendingMessages) {
            const cloudflareJob = jobsMap.get(message.scheduler_job_id);
            
            // Se encontrou no Cloudflare E o status mudou de pending
            if (cloudflareJob && cloudflareJob.status !== 'pending') {
                messagesToUpdate.push({
                    message: message,
                    newStatus: cloudflareJob.status,
                    errorDetails: cloudflareJob.error_details || null,
                    updatedAt: cloudflareJob.updated_at
                });
            }
        }

        console.log(`   📊 ${messagesToUpdate.length} mensagens precisam ser atualizadas`);

        if (messagesToUpdate.length === 0) {
            console.log('   ℹ️ Nenhuma mensagem mudou de status');
            
            // Enviar update via WebSocket
            await fetch(Deno.env.get('BASE44_APP_URL') + '/functions/sendWebSocketUpdate', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Deno.env.get('BASE44_SERVICE_ROLE_KEY')}`
                },
                body: JSON.stringify({
                    company_id: company_id,
                    event_type: 'sync_complete',
                    data: {
                        job_id: job_id,
                        schedule_id: schedule_id,
                        status: 'completed',
                        updated_count: 0,
                        total_jobs: pendingMessages.length,
                        progress: 100
                    }
                })
            });

            return new Response(JSON.stringify({ 
                success: true, 
                updated_count: 0,
                total_pending: pendingMessages.length,
                message: 'Nenhuma mensagem mudou de status.' 
            }), { 
                status: 200, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        // PASSO 7: Atualizar mensagens em chunks
        console.log(`\n💾 [Worker Sync] Atualizando mensagens em chunks...`);
        
        const chunkSize = 25;
        const delay = 300; // ms entre chunks
        let updatedCount = 0;
        let errors = [];

        for (let i = 0; i < messagesToUpdate.length; i += chunkSize) {
            const chunk = messagesToUpdate.slice(i, i + chunkSize);
            const chunkNumber = Math.floor(i / chunkSize) + 1;
            const totalChunks = Math.ceil(messagesToUpdate.length / chunkSize);
            
            console.log(`   💾 Processando chunk ${chunkNumber}/${totalChunks} (${chunk.length} mensagens)...`);
            
            const updatePromises = chunk.map(async ({ message, newStatus, errorDetails, updatedAt }) => {
                try {
                    await base44.entities.Message.update(message.id, {
                        status: newStatus,
                        error_details: errorDetails,
                        updated_at: updatedAt || Date.now()
                    });
                    updatedCount++;
                } catch (error) {
                    console.error(`   ⚠️ Erro ao atualizar mensagem ${message.id}:`, error.message);
                    errors.push({ message_id: message.id, error: error.message });
                }
            });
            
            await Promise.all(updatePromises);
            
            // Calcular e enviar progresso
            const progress = Math.round(((i + chunk.length) / messagesToUpdate.length) * 100);
            
            console.log(`   ✓ Chunk ${chunkNumber} concluído (${updatedCount}/${messagesToUpdate.length}) - ${progress}%`);

            // Enviar update via WebSocket
            await fetch(Deno.env.get('BASE44_APP_URL') + '/functions/sendWebSocketUpdate', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Deno.env.get('BASE44_SERVICE_ROLE_KEY')}`
                },
                body: JSON.stringify({
                    company_id: company_id,
                    event_type: 'sync_progress',
                    data: {
                        job_id: job_id,
                        schedule_id: schedule_id,
                        status: 'processing',
                        updated_count: updatedCount,
                        total_jobs: messagesToUpdate.length,
                        progress: progress
                    }
                })
            });

            // Delay entre chunks
            if (i + chunkSize < messagesToUpdate.length) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        console.log(`\n✅ [Worker Sync] Sincronização concluída`);
        console.log(`   📊 Total atualizado: ${updatedCount} mensagens`);
        if (errors.length > 0) {
            console.log(`   ⚠️ Erros: ${errors.length}`);
        }

        // PASSO 8: Verificar se a campanha foi concluída
        if (!hasPendingJobs) {
            let finalStatus = 'completed';
            
            if (schedule.status === 'cancelling') {
                finalStatus = 'cancelled';
                console.log(`   ✅ Campanha estava em cancelamento, marcando como cancelada`);
            } else {
                console.log(`   ✅ Campanha concluída, todas as mensagens foram processadas`);
            }
            
            await base44.entities.Schedule.update(schedule_id, {
                status: finalStatus,
                ...(finalStatus === 'cancelled' ? { cancelled_at: new Date().toISOString() } : { completed_at: new Date().toISOString() })
            });
        }

        // Enviar update final via WebSocket
        await fetch(Deno.env.get('BASE44_APP_URL') + '/functions/sendWebSocketUpdate', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('BASE44_SERVICE_ROLE_KEY')}`
            },
            body: JSON.stringify({
                company_id: company_id,
                event_type: 'sync_complete',
                data: {
                    job_id: job_id,
                    schedule_id: schedule_id,
                    status: 'completed',
                    updated_count: updatedCount,
                    total_jobs: messagesToUpdate.length,
                    progress: 100,
                    errors: errors,
                    campaign_completed: !hasPendingJobs,
                    summary: summary
                }
            })
        });

        return new Response(JSON.stringify({
            success: true,
            updated_count: updatedCount,
            total_to_update: messagesToUpdate.length,
            total_pending_base44: pendingMessages.length,
            errors: errors.length > 0 ? errors : undefined,
            campaign_completed: !hasPendingJobs,
            summary: summary,
            message: `Sincronização concluída. ${updatedCount} mensagens atualizadas.`
        }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
        });

    } catch (error) {
        console.error('❌ [Worker Sync] Erro fatal:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Erro interno ao sincronizar mensagens.',
            details: error.message
        }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }
});