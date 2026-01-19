import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || !user.company_id) {
            return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 });
        }

        const now = Date.now();
        const sevenDaysFromNow = now + 7 * 24 * 60 * 60 * 1000;

        // Buscar lotes pendentes da nova entidade BatchSchedule
        const batchSchedules = await base44.entities.BatchSchedule.filter({
            company_id: user.company_id,
            status: 'pending',
            run_at: { '$gte': now, '$lte': sevenDaysFromNow }
        }, 'run_at');

        // Marcar lotes expirados como "expired"
        const expiredBatches = await base44.entities.BatchSchedule.filter({
            company_id: user.company_id,
            status: 'pending',
            run_at: { '$lt': now }
        });

        // Atualizar lotes expirados
        for (const expiredBatch of expiredBatches) {
            await base44.entities.BatchSchedule.update(expiredBatch.id, {
                status: 'expired'
            });
        }

        if (!batchSchedules || batchSchedules.length === 0) {
            return new Response(JSON.stringify({ success: true, approvals: [] }), { 
                status: 200, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        // Buscar nomes das campanhas relacionadas
        const scheduleIds = [...new Set(batchSchedules.map(batch => batch.schedule_id))];
        const schedules = await base44.entities.Schedule.filter({ id: scheduleIds });
        const scheduleMap = new Map(schedules.map(s => [s.id, s.name]));

        // Transformar BatchSchedules em formato de aprovação e ordenar por run_at
        const approvalList = batchSchedules
            .map(batch => ({
                batch_id: batch.id,
                schedule_id: batch.schedule_id,
                campaign_name: scheduleMap.get(batch.schedule_id) || 'Campanha Desconhecida',
                run_at: batch.run_at,
                recipient_count: batch.recipient_count,
                instance_sequence: batch.batch_number,
                is_dynamic: batch.is_dynamic,
                contact_filters: batch.contact_filters,
                filter_logic: batch.filter_logic
            }))
            .sort((a, b) => a.run_at - b.run_at); // Ordenar por data de execução (mais próximo primeiro)

        return new Response(JSON.stringify({ success: true, approvals: approvalList }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error in getPendingApprovals:', error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: 'Internal Server Error', 
            details: error.message 
        }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }
});