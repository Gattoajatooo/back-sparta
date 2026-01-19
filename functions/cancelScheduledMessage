import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || !user.company_id) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'Usuário não autenticado ou sem empresa.' 
            }), { 
                status: 401, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        const { scheduler_job_id } = await req.json();

        if (!scheduler_job_id) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'scheduler_job_id é obrigatório.' 
            }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        // Buscar a mensagem no banco
        const messages = await base44.entities.Message.filter({ 
            scheduler_job_id: scheduler_job_id, 
            company_id: user.company_id 
        });
        const message = messages[0];

        if (!message) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'Mensagem não encontrada.' 
            }), { 
                status: 404, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        // Verificar se a mensagem pode ser cancelada
        if (message.status !== 'pending' || new Date(message.run_at) <= new Date()) {
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'Apenas mensagens pendentes e futuras podem ser canceladas.' 
            }), { 
                status: 400, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        const scheduleUrl = Deno.env.get("SCHEDULE_URL");
        const jobsApiKey = Deno.env.get("JOBS_API_KEY");

        if (!scheduleUrl || !jobsApiKey) {
            console.error('Configuração do scheduler não encontrada');
            // Se não conseguimos cancelar no scheduler, pelo menos cancelamos localmente
            await base44.entities.Message.update(message.id, {
                status: 'cancelled',
                updated_at: Date.now(), // CORREÇÃO: usar timestamp em millisegundos
                error_details: 'Cancelado localmente - scheduler indisponível'
            });

            return new Response(JSON.stringify({ 
                success: true, 
                message: 'Mensagem cancelada localmente (scheduler indisponível).' 
            }), { 
                status: 200, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        // Tentar cancelar no scheduler externo
        let schedulerSuccess = false;
        let schedulerError = null;

        try {
            const cancelUrl = `${scheduleUrl.replace(/\/$/, '')}/jobs/${scheduler_job_id}/cancel`;
            const schedulerResponse = await fetch(cancelUrl, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${jobsApiKey}` },
                // Adicionar timeout para evitar travamentos
                signal: AbortSignal.timeout(10000) // 10 segundos
            });

            if (schedulerResponse.ok) {
                schedulerSuccess = true;
            } else {
                const errorText = await schedulerResponse.text();
                schedulerError = `Erro ${schedulerResponse.status}: ${errorText}`;
                console.error('Erro do scheduler:', schedulerError);
            }
        } catch (error) {
            schedulerError = `Falha na comunicação com scheduler: ${error.message}`;
            console.error('Erro ao comunicar com scheduler:', error);
        }

        // Sempre atualizar o status local para "cancelled", independente do scheduler
        await base44.entities.Message.update(message.id, {
            status: 'cancelled',
            updated_at: Date.now(), // CORREÇÃO: usar timestamp em millisegundos
            error_details: schedulerSuccess ? null : `Cancelado localmente - ${schedulerError}`
        });

        // Retornar sucesso mesmo se o scheduler falhou, pois cancelamos localmente
        return new Response(JSON.stringify({ 
            success: true, 
            message: schedulerSuccess ? 
                'Mensagem cancelada com sucesso.' : 
                'Mensagem cancelada localmente (scheduler com problemas).',
            scheduler_success: schedulerSuccess
        }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
        });

    } catch (error) {
        console.error('Erro em cancelScheduledMessage:', error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: 'Erro interno do servidor.', 
            details: error.message 
        }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }
});