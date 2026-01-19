import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user || user.role !== 'admin') {
            return Response.json({
                success: false,
                error: 'Acesso negado'
            }, { status: 403 });
        }
        
        const { company_id, plan_version_id, name, description, overrides, expires_in_days = 30 } = await req.json();
        
        // Validações
        if (!company_id || !plan_version_id || !name) {
            return Response.json({
                success: false,
                error: 'Campos obrigatórios: company_id, plan_version_id, name'
            }, { status: 400 });
        }
        
        // Calcular data de expiração
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expires_in_days);
        
        // Buscar versão do plano base
        const planVersion = await base44.entities.PlanVersion.get(plan_version_id);
        const baseFeatureValues = await base44.entities.PlanFeatureValue.filter({
            plan_version_id: plan_version_id
        });
        
        // Calcular preço total
        let totalPriceCents = planVersion.price_cents || 0;
        
        // Adicionar preços dos overrides
        if (overrides && Array.isArray(overrides)) {
            for (const override of overrides) {
                if (override.price_override_cents) {
                    // Encontrar feature base para saber se deve substituir ou adicionar
                    const baseFeature = baseFeatureValues.find(bfv => bfv.feature_id === override.feature_id);
                    if (baseFeature && baseFeature.pricing_model === 'included') {
                        totalPriceCents += override.price_override_cents;
                    } else if (baseFeature) {
                        totalPriceCents = totalPriceCents - (baseFeature.price_cents || 0) + override.price_override_cents;
                    }
                }
            }
        }
        
        // Criar oferta
        const offer = await base44.entities.Offer.create({
            company_id,
            plan_version_id,
            name,
            description,
            expires_at: expiresAt.toISOString(),
            total_price_cents: totalPriceCents,
            created_by: user.id,
            status: 'draft'
        });
        
        // Criar overrides da oferta
        if (overrides && Array.isArray(overrides)) {
            for (const override of overrides) {
                await base44.entities.OfferFeatureOverride.create({
                    offer_id: offer.id,
                    feature_id: override.feature_id,
                    value_override: override.value_override,
                    price_override_cents: override.price_override_cents
                });
            }
        }
        
        return Response.json({
            success: true,
            offer_id: offer.id,
            total_price_cents: totalPriceCents
        });
        
    } catch (error) {
        console.error('Erro ao criar oferta:', error);
        return Response.json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        }, { status: 500 });
    }
});