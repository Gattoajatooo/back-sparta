import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user?.company_id) {
            return Response.json({ success: false, error: 'Usuário não autenticado.' }, { status: 401 });
        }

        console.log('Buscando assinaturas pendentes...');

        // Lógica de filtro corrigida: Focamos no status e na existência do link.
        // A verificação de tempo é menos crítica aqui, pois um status 'incomplete' já indica uma ação pendente.
        // O webhook do Stripe ou uma limpeza periódica cuidará de links expirados.
        const pendingSubscriptions = await base44.entities.SubscriptionsStripe.filter({
            company_id: user.company_id,
            user_id: user.id,
            status: 'incomplete',
            payment_link_url: { '$ne': null } // A condição mais importante!
        });

        console.log(`Encontradas ${pendingSubscriptions.length} assinaturas pendentes com base no status e link.`);

        if (pendingSubscriptions.length === 0) {
             return Response.json({
                success: true,
                pending_subscriptions: []
            });
        }
        
        // Mapear para o formato esperado pelo frontend
        const result = pendingSubscriptions.map(sub => {
            const metadata = sub.metadata || {};
            return {
                id: sub.id,
                plan_id: metadata.plan_id,
                billing_period: metadata.billing_period || 'monthly',
                payment_link_url: sub.payment_link_url, // Incluir o campo principal
                created_date: sub.created_date,
            };
        });

        console.log(`Retornando ${result.length} assinaturas pendentes formatadas.`);

        return Response.json({
            success: true,
            pending_subscriptions: result
        });

    } catch (error) {
        console.error('Erro ao buscar assinaturas pendentes:', error);
        return Response.json({ 
            success: false, 
            error: 'Erro interno do servidor.',
            details: error.message 
        }, { status: 500 });
    }
});