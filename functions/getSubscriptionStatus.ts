
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user?.company_id) {
            return Response.json({ success: false, error: 'Usuário não autenticado.' }, { status: 401 });
        }

        // Buscar assinatura ativa da empresa
        const subscriptions = await base44.entities.SubscriptionsStripe.filter({
            company_id: user.company_id,
            status: 'active'
        });

        if (subscriptions.length === 0) {
            return Response.json({
                success: true,
                has_active_subscription: false,
                subscription: null
            });
        }

        const activeSubscription = subscriptions[0];

        // CORREÇÃO: O valor do 'amount' no banco pode não estar em centavos.
        // Garantimos que o valor retornado esteja sempre em centavos para a comparação no frontend.
        const amountFromDb = activeSubscription.amount || 0;
        const amountInCents = Math.round(amountFromDb * 100);

        return Response.json({
            success: true,
            has_active_subscription: true,
            subscription: {
                id: activeSubscription.id,
                plan_name: activeSubscription.plan_name,
                status: activeSubscription.status,
                current_period_end: activeSubscription.current_period_end,
                cancel_at_period_end: activeSubscription.cancel_at_period_end,
                amount: amountInCents, // Retornando o valor corrigido em centavos
                currency: activeSubscription.currency,
                interval: activeSubscription.interval,
                interval_count: activeSubscription.interval_count,
                trial_end: activeSubscription.trial_end,
                metadata: activeSubscription.metadata // Adicionado para buscar o plan_id
            }
        });

    } catch (error) {
        console.error('Erro ao buscar status da assinatura:', error);
        return Response.json({ 
            success: false, 
            error: 'Erro interno do servidor.',
            details: error.message 
        }, { status: 500 });
    }
});
