import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!user.company_id) {
            return Response.json({ error: 'User has no company' }, { status: 400 });
        }

        const { aiConfig } = await req.json();

        console.log('[updateAIConfig] Updating AI config for company:', user.company_id);
        console.log('[updateAIConfig] Config:', aiConfig);

        // Buscar empresa usando SDK service role
        const company = await base44.asServiceRole.entities.Company.get(user.company_id);

        if (!company) {
            return Response.json({ error: 'Company not found' }, { status: 404 });
        }

        console.log('[updateAIConfig] Company fetched, owner:', company.owner_id);

        // Verificar se usuário tem permissão
        const isOwner = company.owner_id === user.id;
        const isSystemAdmin = user.role === 'admin';

        console.log('[updateAIConfig] Permission check:', { isOwner, isSystemAdmin, userId: user.id });

        if (!isOwner && !isSystemAdmin) {
            return Response.json({ 
                error: 'Permission denied: Only company owner can update AI configuration' 
            }, { status: 403 });
        }

        // Preparar settings atualizados mantendo tudo que já existe
        const currentSettings = company.settings || {};
        const updatedSettings = {
            ...currentSettings,
            ai_enabled: aiConfig.enabled !== undefined ? aiConfig.enabled : currentSettings.ai_enabled,
            ai_name: aiConfig.name || currentSettings.ai_name || "Atena",
            ai_business_description: aiConfig.business_description !== undefined ? aiConfig.business_description : currentSettings.ai_business_description,
            ai_business_sector: aiConfig.business_sector !== undefined ? aiConfig.business_sector : currentSettings.ai_business_sector,
            ai_target_audience: aiConfig.target_audience !== undefined ? aiConfig.target_audience : currentSettings.ai_target_audience,
            ai_main_products_services: aiConfig.main_products_services !== undefined ? aiConfig.main_products_services : currentSettings.ai_main_products_services,
            ai_value_proposition: aiConfig.value_proposition !== undefined ? aiConfig.value_proposition : currentSettings.ai_value_proposition,
            ai_company_tone: aiConfig.company_tone !== undefined ? aiConfig.company_tone : currentSettings.ai_company_tone,
            ai_business_goals: aiConfig.business_goals !== undefined ? aiConfig.business_goals : currentSettings.ai_business_goals,
            ai_competitive_advantages: aiConfig.competitive_advantages !== undefined ? aiConfig.competitive_advantages : currentSettings.ai_competitive_advantages,
            ai_permissions: aiConfig.permissions || currentSettings.ai_permissions || {
                contacts: "view",
                campaigns: "none",
                messages: "view",
                templates: "none",
                products: "view"
            }
        };

        console.log('[updateAIConfig] Updating settings via SDK...', {
            ai_name: updatedSettings.ai_name,
            ai_enabled: updatedSettings.ai_enabled
        });

        // Atualizar usando service role
        await base44.asServiceRole.entities.Company.update(user.company_id, {
            settings: updatedSettings
        });

        console.log('[updateAIConfig] ✅ AI config updated successfully');

        return Response.json({ 
            success: true,
            message: 'AI configuration updated successfully'
        });

    } catch (error) {
        console.error('[updateAIConfig] Error:', error);
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    }
});