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
        
        const { plan_id, price_cents, billing_period = 'monthly', release_notes, copy_from_version } = await req.json();
        
        if (!plan_id) {
            return Response.json({
                success: false,
                error: 'plan_id é obrigatório'
            }, { status: 400 });
        }
        
        // Buscar última versão para incrementar
        const existingVersions = await base44.entities.PlanVersion.filter({ plan_id }, '-version');
        const nextVersion = existingVersions.length > 0 ? Math.max(...existingVersions.map(v => v.version)) + 1 : 1;
        
        // Desativar versão atual
        for (const version of existingVersions.filter(v => v.is_active)) {
            await base44.entities.PlanVersion.update(version.id, {
                is_active: false,
                effective_to: new Date().toISOString()
            });
        }
        
        // Criar nova versão
        const newVersion = await base44.entities.PlanVersion.create({
            plan_id,
            version: nextVersion,
            effective_from: new Date().toISOString(),
            is_active: true,
            price_cents: price_cents || 0,
            billing_period,
            release_notes
        });
        
        // Copiar features da versão anterior se solicitado
        if (copy_from_version) {
            const sourceFeatures = await base44.entities.PlanFeatureValue.filter({
                plan_version_id: copy_from_version
            });
            
            for (const sourceFeature of sourceFeatures) {
                await base44.entities.PlanFeatureValue.create({
                    plan_version_id: newVersion.id,
                    feature_id: sourceFeature.feature_id,
                    value: sourceFeature.value,
                    pricing_model: sourceFeature.pricing_model,
                    price_cents: sourceFeature.price_cents,
                    tiers: sourceFeature.tiers
                });
            }
        }
        
        return Response.json({
            success: true,
            version_id: newVersion.id,
            version: nextVersion
        });
        
    } catch (error) {
        console.error('Erro ao criar versão do plano:', error);
        return Response.json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        }, { status: 500 });
    }
});