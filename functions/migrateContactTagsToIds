import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ 
                success: false, 
                error: 'Usuário não autenticado' 
            }, { status: 401 });
        }

        console.log(`👤 Usuário: ${user.email}`);
        console.log(`\n📋 Buscando TODAS as empresas e suas tags...`);

        // 1. Buscar todas as empresas do sistema
        const allCompanies = await base44.asServiceRole.entities.Company.filter({}, 'name', 0);
        console.log(`\n🏢 ${allCompanies.length} empresas encontradas no sistema`);

        // 2. Para cada empresa, buscar suas tags
        const allTags = [];
        const tagsByCompany = {};
        const companyTagCount = {};

        for (const company of allCompanies) {
            console.log(`\n  🔍 Buscando tags da empresa: ${company.name} (${company.id})`);
            
            try {
                // Buscar tags desta empresa específica
                const companyTags = await base44.asServiceRole.entities.Tag.filter({
                    company_id: company.id
                }, 'name', 0);
                
                console.log(`     ✅ ${companyTags.length} tags encontradas`);
                
                if (companyTags.length > 0) {
                    tagsByCompany[company.id] = [];
                    companyTagCount[company.id] = companyTags.length;
                    
                    companyTags.forEach(tag => {
                        allTags.push(tag);
                        tagsByCompany[company.id].push({
                            id: tag.id,
                            name: tag.name,
                            is_smart: tag.is_smart || false,
                            is_active: tag.is_active !== false
                        });
                    });
                }
            } catch (error) {
                console.error(`     ❌ Erro ao buscar tags da empresa ${company.id}:`, error.message);
            }
        }

        console.log(`\n\n✅ TOTAL: ${allTags.length} tags encontradas em ${Object.keys(tagsByCompany).length} empresas\n`);
        
        // Mostrar resumo por empresa
        console.log('📊 RESUMO POR EMPRESA:');
        Object.entries(tagsByCompany).forEach(([companyId, tags]) => {
            const company = allCompanies.find(c => c.id === companyId);
            console.log(`\n  📍 ${company?.name || companyId} (${tags.length} tags):`);
            tags.forEach((tag, idx) => {
                const smartBadge = tag.is_smart ? ' [INTELIGENTE]' : '';
                const activeBadge = !tag.is_active ? ' [INATIVA]' : '';
                console.log(`     ${idx + 1}. "${tag.name}" (ID: ${tag.id})${smartBadge}${activeBadge}`);
            });
        });

        // Formatar resultado completo
        const tagsFormatted = allTags.map(tag => ({
            id: tag.id,
            name: tag.name,
            company_id: tag.company_id,
            is_smart: tag.is_smart || false,
            is_active: tag.is_active !== false,
            color: tag.color || '#3b82f6',
            created_date: tag.created_date
        }));

        return Response.json({
            success: true,
            total_tags: allTags.length,
            total_companies: allCompanies.length,
            companies_with_tags: Object.keys(tagsByCompany).length,
            user_company_id: user.company_id,
            company_tag_count: companyTagCount,
            companies: allCompanies.map(c => ({
                id: c.id,
                name: c.name,
                tag_count: companyTagCount[c.id] || 0
            })),
            tags: tagsFormatted,
            tags_by_company: tagsByCompany
        });

    } catch (error) {
        console.error('❌ Erro ao buscar tags:', error);
        return Response.json({
            success: false,
            error: error.message,
            details: error.stack
        }, { status: 500 });
    }
});