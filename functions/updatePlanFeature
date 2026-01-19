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
        
        const { plan_version_id, feature_id, value, pricing_model, price_cents, tiers } = await req.json();
        
        // Validações
        if (!plan_version_id || !feature_id || !value || !pricing_model) {
            return Response.json({
                success: false,
                error: 'Campos obrigatórios: plan_version_id, feature_id, value, pricing_model'
            }, { status: 400 });
        }
        
        // Buscar feature value existente
        const existingFeatureValues = await base44.entities.PlanFeatureValue.filter({
            plan_version_id,
            feature_id
        });
        
        const updateData = {
            value,
            pricing_model,
            price_cents: price_cents || 0,
            tiers: tiers || []
        };
        
        let featureValue;
        if (existingFeatureValues.length > 0) {
            // Atualizar existente
            featureValue = await base44.entities.PlanFeatureValue.update(existingFeatureValues[0].id, updateData);
        } else {
            // Criar novo
            featureValue = await base44.entities.PlanFeatureValue.create({
                plan_version_id,
                feature_id,
                ...updateData
            });
        }
        
        return Response.json({
            success: true,
            feature_value: featureValue
        });
        
    } catch (error) {
        console.error('Erro ao atualizar feature do plano:', error);
        return Response.json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        }, { status: 500 });
    }
});