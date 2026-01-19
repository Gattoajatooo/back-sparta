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

        // Buscar empresa com configurações da IA
        const company = await base44.asServiceRole.entities.Company.get(user.company_id);

        if (!company) {
            return Response.json({ error: 'Company not found' }, { status: 404 });
        }

        // Montar contexto da IA com dados completos
        const aiContext = {
            enabled: company.settings?.ai_enabled || false,
            ai_name: company.settings?.ai_name || "Atena",
            name: company.settings?.ai_name || "Atena", // Alias para compatibilidade
            company_name: company.name || "",
            business_description: company.settings?.ai_business_description || "",
            business_sector: company.settings?.ai_business_sector || "",
            target_audience: company.settings?.ai_target_audience || "",
            main_products_services: company.settings?.ai_main_products_services || "",
            value_proposition: company.settings?.ai_value_proposition || "",
            company_tone: company.settings?.ai_company_tone || "Profissional e amigável",
            business_goals: company.settings?.ai_business_goals || "",
            competitive_advantages: company.settings?.ai_competitive_advantages || "",
            permissions: company.settings?.ai_permissions || {
                contacts: "view",
                campaigns: "none",
                messages: "view",
                templates: "none",
                products: "view"
            }
        };

        console.log('[getAIContext] Returning context:', { 
            ai_name: aiContext.ai_name, 
            company_name: aiContext.company_name,
            has_description: !!aiContext.business_description 
        });

        return Response.json({ 
            success: true,
            context: aiContext
        });

    } catch (error) {
        console.error('[getAIContext] Error:', error);
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    }
});