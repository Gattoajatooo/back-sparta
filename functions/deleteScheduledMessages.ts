import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';

Deno.serve(async (req) => {
    try {
        console.log('=== INÍCIO DA FUNÇÃO deleteScheduledMessages (agora cancela) ===');
        
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user || !user.company_id) {
            return new Response(JSON.stringify({ success: false, error: 'Usuário não autenticado ou sem empresa' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }
        
        const requestData = await req.json();
        const { scheduler_job_ids } = requestData;

        if (!scheduler_job_ids || !Array.isArray(scheduler_job_ids) || scheduler_job_ids.length === 0) {
            return new Response(JSON.stringify({ success: false, error: 'scheduler_job_ids é obrigatório e deve ser um array não vazio' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        console.log(`Cancelando ${scheduler_job_ids.length} mensagens agendadas...`);

        // Obter configurações do scheduler
        const scheduleUrl = Deno.env.get("SCHEDULE_URL");
        const jobsApiKey = Deno.env.get("JOBS_API_KEY");
        
        if (!scheduleUrl || !jobsApiKey) {
            throw new Error('Configurações do serviço de agendamento não encontradas.');
        }

        // Construir URL para cancelar em lote
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
            throw new Error(`Erro ao cancelar no agendamento externo: ${schedulerResponse.status} - ${errorText}`);
        }

        const schedulerResult = await schedulerResponse.json();
        console.log('Resposta do scheduler:', schedulerResult);

        // Marcar como 'cancelled' e 'deleted' no BD local
        const now = new Date().toISOString();
        let updatedCount = 0;
        
        for (const jobId of scheduler_job_ids) {
            const messages = await base44.entities.Message.filter({ scheduler_job_id: jobId, company_id: user.company_id });
            if (messages[0]) {
                await base44.asServiceRole.entities.Message.update(messages[0].id, {
                    deleted: true,
                    deleted_at: now,
                    status: 'cancelled'
                });
                updatedCount++;
            }
        }
        
        return new Response(JSON.stringify({
            success: true,
            data: {
                cancelled_count: updatedCount,
                scheduler_response: schedulerResult
            }
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        console.error('❌ Erro fatal na função deleteScheduledMessages:', error);
        return new Response(JSON.stringify({ success: false, error: 'Erro interno do servidor', details: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
});