import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Sincroniza o campo company_id com o id de todas as empresas existentes
 * Deve ser executado uma vez para popular os dados existentes
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Apenas admin pode executar
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    // Buscar todas as empresas
    const companies = await base44.asServiceRole.entities.Company.list();
    console.log(`[syncCompanyIds] Found ${companies.length} companies to sync`);

    let updated = 0;
    let skipped = 0;
    const errors = [];

    for (const company of companies) {
      try {
        // Se company_id já está preenchido e igual ao id, pula
        if (company.company_id === company.id) {
          skipped++;
          continue;
        }

        // Atualiza company_id com o valor do id
        await base44.asServiceRole.entities.Company.update(company.id, {
          company_id: company.id
        });
        
        updated++;
        console.log(`[syncCompanyIds] Updated company ${company.name} (${company.id})`);
      } catch (error) {
        console.error(`[syncCompanyIds] Error updating company ${company.id}:`, error.message);
        errors.push({ company_id: company.id, error: error.message });
      }
    }

    return Response.json({
      success: true,
      total: companies.length,
      updated,
      skipped,
      errors: errors.length > 0 ? errors : null
    });

  } catch (error) {
    console.error('[syncCompanyIds] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});