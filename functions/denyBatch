import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user || !user.company_id) {
            return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 });
        }

        const { batch_id } = await req.json();
        if (!batch_id) {
            return new Response(JSON.stringify({ success: false, error: 'batch_id is required' }), { status: 400 });
        }

        // Buscar o lote na nova entidade BatchSchedule
        const batchSchedule = await base44.entities.BatchSchedule.get(batch_id);
        if (!batchSchedule || batchSchedule.company_id !== user.company_id) {
            return new Response(JSON.stringify({ success: false, error: 'Lote não encontrado ou não pertence à sua empresa.' }), { status: 404 });
        }

        if (batchSchedule.status !== 'pending') {
            return new Response(JSON.stringify({ success: false, error: 'Lote já foi processado.' }), { status: 400 });
        }

        const now = new Date();

        // Atualizar o BatchSchedule como negado
        await base44.entities.BatchSchedule.update(batchSchedule.id, {
            status: 'denied',
            denied_by: user.id,
            denied_at: now.toISOString(),
            updated_at: now.toISOString()
        });

        // Criar log de sistema
        await base44.entities.SystemLog.create({
            company_id: user.company_id,
            user_id: user.id,
            action: 'deny',
            resource_type: 'batch_schedule',
            resource_id: batch_id,
            status: 'success',
            method: 'POST',
            endpoint: '/functions/denyBatch',
            request_data: { batch_id },
            metadata: {
                batch_number: batchSchedule.batch_number,
                schedule_id: batchSchedule.schedule_id,
                recipient_count: batchSchedule.recipient_count
            }
        });

        return new Response(JSON.stringify({ 
            success: true, 
            message: 'Lote negado com sucesso.' 
        }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
        });

    } catch (error) {
        console.error('Error in denyBatch:', error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: 'Erro interno do servidor', 
            details: error.message 
        }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }
});