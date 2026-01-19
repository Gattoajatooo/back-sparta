import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Buscar planos ativos e listados
        const plans = await base44.entities.Plan.filter({ is_listed: true, is_active: true }, 'display_order');
        
        const catalogPlans = [];
        
        for (const plan of plans) {
            // Buscar versão ativa do plano
            const activeVersions = await base44.entities.PlanVersion.filter({ 
                plan_id: plan.id, 
                is_active: true 
            }, '-effective_from', 1);
            
            if (activeVersions.length === 0) continue;
            
            const activeVersion = activeVersions[0];
            
            // Buscar features desta versão
            const featureValues = await base44.entities.PlanFeatureValue.filter({
                plan_version_id: activeVersion.id
            });
            
            // Buscar dados das features
            const featureIds = featureValues.map(fv => fv.feature_id);
            const features = await base44.entities.Feature.filter({
                id: { '$in': featureIds },
                is_active: true
            });
            
            const featuresMap = new Map(features.map(f => [f.id, f]));
            
            // Montar features do plano
            const planFeatures = featureValues.map(fv => {
                const feature = featuresMap.get(fv.feature_id);
                return {
                    key: feature.key,
                    name: feature.name,
                    type: feature.type,
                    unit: feature.unit,
                    value: fv.value,
                    pricing_model: fv.pricing_model,
                    price_cents: fv.price_cents,
                    tiers: fv.tiers
                };
            });
            
            catalogPlans.push({
                id: plan.id,
                code: plan.code,
                name: plan.name,
                slug: plan.slug,
                description: plan.description,
                price_cents: activeVersion.price_cents,
                price_string: plan.price_string,
                is_popular: plan.is_popular,
                is_custom_base: plan.is_custom_base,
                billing_period: activeVersion.billing_period,
                features: planFeatures,
                version: {
                    id: activeVersion.id,
                    version: activeVersion.version
                }
            });
        }
        
        return Response.json({
            success: true,
            plans: catalogPlans
        });
        
    } catch (error) {
        console.error('Erro ao buscar catálogo de planos:', error);
        return Response.json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        }, { status: 500 });
    }
});