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
        
        const { subscription_id } = await req.json();
        
        // Verificar permissões
        if (user.role !== 'admin' && subscription_id) {
            // Verificar se é a própria assinatura da empresa
            const subscription = await base44.entities.Subscription.get(subscription_id);
            if (subscription.company_id !== user.company_id) {
                return Response.json({
                    success: false,
                    error: 'Acesso negado'
                }, { status: 403 });
            }
        }
        
        // Se não passou subscription_id, buscar pela empresa do usuário
        let subscription;
        if (subscription_id) {
            subscription = await base44.entities.Subscription.get(subscription_id);
        } else {
            const subscriptions = await base44.entities.Subscription.filter({
                company_id: user.company_id,
                status: 'active'
            }, '-started_at', 1);
            subscription = subscriptions[0];
        }
        
        if (!subscription) {
            return Response.json({
                success: false,
                error: 'Assinatura não encontrada'
            }, { status: 404 });
        }
        
        // Buscar versão do plano
        const planVersion = await base44.entities.PlanVersion.get(subscription.plan_version_id);
        const plan = await base44.entities.Plan.get(planVersion.plan_id);
        
        // Buscar features base do plano
        const featureValues = await base44.entities.PlanFeatureValue.filter({
            plan_version_id: planVersion.id
        });
        
        // Buscar overrides da assinatura
        const overrides = await base44.entities.SubscriptionOverride.filter({
            subscription_id: subscription.id
        });
        
        // Buscar dados das features
        const allFeatureIds = [...new Set([
            ...featureValues.map(fv => fv.feature_id),
            ...overrides.map(o => o.feature_id)
        ])];
        
        const features = await base44.entities.Feature.filter({
            id: { '$in': allFeatureIds },
            is_active: true
        });
        
        const featuresMap = new Map(features.map(f => [f.id, f]));
        const overridesMap = new Map(overrides.map(o => [o.feature_id, o]));
        
        // Calcular valores efetivos
        const effectiveFeatures = featureValues.map(fv => {
            const feature = featuresMap.get(fv.feature_id);
            const override = overridesMap.get(fv.feature_id);
            
            return {
                key: feature.key,
                name: feature.name,
                type: feature.type,
                unit: feature.unit,
                base_value: fv.value,
                effective_value: override?.value_override || fv.value,
                base_price_cents: fv.price_cents,
                effective_price_cents: override?.price_override_cents || fv.price_cents,
                pricing_model: fv.pricing_model,
                has_override: !!override,
                override_note: override?.note
            };
        });
        
        return Response.json({
            success: true,
            subscription: {
                id: subscription.id,
                status: subscription.status,
                started_at: subscription.started_at,
                next_billing_at: subscription.next_billing_at
            },
            plan: {
                name: plan.name,
                code: plan.code,
                version: planVersion.version
            },
            features: effectiveFeatures
        });
        
    } catch (error) {
        console.error('Erro ao buscar detalhes da assinatura:', error);
        return Response.json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        }, { status: 500 });
    }
});