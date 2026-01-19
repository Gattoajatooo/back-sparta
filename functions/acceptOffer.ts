import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user || !user.company_id) {
            return Response.json({
                success: false,
                error: 'Usuário não autenticado'
            }, { status: 401 });
        }
        
        const { offer_id } = await req.json();
        
        if (!offer_id) {
            return Response.json({
                success: false,
                error: 'offer_id é obrigatório'
            }, { status: 400 });
        }
        
        // Buscar oferta
        const offer = await base44.entities.Offer.get(offer_id);
        
        // Verificar permissões
        if (offer.company_id !== user.company_id && user.role !== 'admin') {
            return Response.json({
                success: false,
                error: 'Acesso negado'
            }, { status: 403 });
        }
        
        // Verificar status e expiração
        if (offer.status !== 'sent' && offer.status !== 'draft') {
            return Response.json({
                success: false,
                error: 'Oferta não pode ser aceita'
            }, { status: 400 });
        }
        
        if (new Date(offer.expires_at) < new Date()) {
            return Response.json({
                success: false,
                error: 'Oferta expirada'
            }, { status: 400 });
        }
        
        // Cancelar assinatura ativa atual (se houver)
        const activeSubscriptions = await base44.entities.Subscription.filter({
            company_id: user.company_id,
            status: 'active'
        });
        
        for (const activeSub of activeSubscriptions) {
            await base44.entities.Subscription.update(activeSub.id, {
                status: 'canceled',
                canceled_at: new Date().toISOString()
            });
        }
        
        // Criar nova assinatura
        const nextBilling = new Date();
        nextBilling.setMonth(nextBilling.getMonth() + 1); // Assumindo cobrança mensal
        
        const subscription = await base44.entities.Subscription.create({
            company_id: user.company_id,
            plan_version_id: offer.plan_version_id,
            status: 'active',
            started_at: new Date().toISOString(),
            next_billing_at: nextBilling.toISOString()
        });
        
        // Buscar overrides da oferta
        const offerOverrides = await base44.entities.OfferFeatureOverride.filter({
            offer_id: offer.id
        });
        
        // Criar overrides na assinatura
        for (const offerOverride of offerOverrides) {
            await base44.entities.SubscriptionOverride.create({
                subscription_id: subscription.id,
                feature_id: offerOverride.feature_id,
                value_override: offerOverride.value_override,
                price_override_cents: offerOverride.price_override_cents,
                effective_from: new Date().toISOString(),
                note: `Aceito via oferta: ${offer.name}`
            });
        }
        
        // Marcar oferta como aceita
        await base44.entities.Offer.update(offer.id, {
            status: 'accepted',
            accepted_at: new Date().toISOString()
        });
        
        return Response.json({
            success: true,
            subscription_id: subscription.id,
            message: 'Oferta aceita com sucesso!'
        });
        
    } catch (error) {
        console.error('Erro ao aceitar oferta:', error);
        return Response.json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        }, { status: 500 });
    }
});