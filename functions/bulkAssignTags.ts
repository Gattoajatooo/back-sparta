import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Normalização de strings
const norm = (s) => String(s ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

// Aplicar filtros dinâmicos localmente
function applyDynamicFilters(contacts, filters, logic) {
  if (!filters || filters.length === 0) return contacts;
  
  const combinator = String(logic || 'AND').toUpperCase();
  const referenceDate = new Date();
  
  return contacts.filter(contact => {
    const results = filters.map(filter => {
      const field = String(filter.field || '').trim();
      const operator = String(filter.operator || '').toLowerCase().trim();
      const value = filter.value;
      
      // Filtro de tag
      if (field === 'has_tag') {
        const contactTags = Array.isArray(contact.tags) ? contact.tags.map(t => norm(t)) : [];
        const filterValues = Array.isArray(value) ? value.map(v => norm(v)) : [norm(value)];
        
        if (operator === 'is_true') return contactTags.length > 0;
        if (operator === 'is_false') return contactTags.length === 0;
        if (operator === 'equals' || operator === 'in') {
          return filterValues.some(v => contactTags.includes(v));
        }
        if (operator === 'not_equals' || operator === 'not_in') {
          return !filterValues.some(v => contactTags.includes(v));
        }
      }
      
      // Filtro de status
      if (field === 'status') {
        const contactStatus = norm(contact.status);
        const filterValue = norm(value);
        if (operator === 'equals') return contactStatus === filterValue;
        if (operator === 'not_equals') return contactStatus !== filterValue;
      }
      
      // Filtro de source
      if (field === 'source') {
        const contactSource = norm(contact.source);
        const filterValue = norm(value);
        if (operator === 'equals') return contactSource === filterValue;
        if (operator === 'not_equals') return contactSource !== filterValue;
      }
      
      // Filtro de aniversário
      if (field === 'birth_date') {
        if (!contact.birth_date) return false;
        const birth = new Date(contact.birth_date);
        
        if (operator === 'is_today') {
          return birth.getDate() === referenceDate.getDate() && birth.getMonth() === referenceDate.getMonth();
        }
        if (operator === 'is_this_month') {
          return birth.getMonth() === referenceDate.getMonth();
        }
      }
      
      return true;
    });
    
    if (combinator === 'OR') {
      return results.some(r => r === true);
    }
    return results.every(r => r === true);
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || !user.company_id) {
      return Response.json({ success: false, error: 'Usuário não autenticado' }, { status: 401 });
    }

    const { tag_ids, filters, filter_logic, company_id, contact_ids } = await req.json();

    console.log(`[bulkAssignTags] Dados recebidos:`, {
      tag_ids,
      contact_ids_count: contact_ids?.length || 0,
      filters_count: filters?.length || 0,
      company_id_param: company_id,
      user_company_id: user.company_id
    });

    if (!tag_ids || tag_ids.length === 0) {
      return Response.json({ success: false, error: 'Nenhum marcador selecionado' }, { status: 400 });
    }

    // Aceitar tanto contact_ids quanto filters
    if ((!contact_ids || contact_ids.length === 0) && (!filters || filters.length === 0)) {
      return Response.json({ success: false, error: 'Nenhum contato ou filtro definido' }, { status: 400 });
    }

    let matchedContacts;

    // Modo 1: Contatos pré-selecionados por IDs
    if (contact_ids && contact_ids.length > 0) {
      console.log(`[bulkAssignTags] Modo direto: ${contact_ids.length} contatos pré-selecionados`);
      
      matchedContacts = await Promise.all(
        contact_ids.map(id => base44.entities.Contact.get(id))
      );
      matchedContacts = matchedContacts.filter(Boolean);
      
      console.log(`[bulkAssignTags] ${matchedContacts.length} contatos carregados com sucesso`);
    } 
    // Modo 2: Filtros dinâmicos
    else {
      console.log(`[bulkAssignTags] Modo filtro: ${filters.length} filtros definidos`);
      
      // Buscar todos os contatos da empresa
      const allContacts = await base44.entities.Contact.filter({
        company_id: company_id || user.company_id,
        deleted: { '$ne': true }
      });

      console.log(`[bulkAssignTags] ${allContacts.length} contatos totais encontrados`);

      // Aplicar filtros
      matchedContacts = applyDynamicFilters(allContacts, filters, filter_logic);

      console.log(`[bulkAssignTags] ${matchedContacts.length} contatos correspondem aos filtros`);
    }

    if (matchedContacts.length === 0) {
      return Response.json({ 
        success: true, 
        updated_count: 0,
        message: 'Nenhum contato corresponde aos filtros'
      });
    }

    // Buscar todas as tags da empresa - usar base44 normal (com contexto do usuário)
    // ao invés de asServiceRole para evitar problemas de RLS
    const allCompanyTags = await base44.entities.Tag.filter({
      company_id: company_id || user.company_id
    });
    
    console.log(`[bulkAssignTags] ${allCompanyTags.length} tags totais da empresa`);
    console.log(`[bulkAssignTags] IDs recebidos:`, tag_ids);
    
    if (allCompanyTags.length > 0) {
      console.log(`[bulkAssignTags] Amostra de tags:`, allCompanyTags.slice(0, 3).map(t => ({ id: t.id, name: t.name })));
    }
    
    const validTags = allCompanyTags.filter(tag => tag_ids.includes(tag.id));
    const validTagIds = validTags.map(t => t.id);
    
    if (validTagIds.length === 0) {
      console.error(`[bulkAssignTags] ❌ ERRO: Nenhuma tag válida encontrada`);
      console.error(`[bulkAssignTags] tag_ids enviados:`, tag_ids);
      console.error(`[bulkAssignTags] company_id usado:`, company_id || user.company_id);
      console.error(`[bulkAssignTags] Total de tags na empresa:`, allCompanyTags.length);
      
      // Se há tags na empresa mas nenhuma corresponde aos IDs
      if (allCompanyTags.length > 0) {
        console.error(`[bulkAssignTags] Tags disponíveis na empresa:`, allCompanyTags.map(t => ({ id: t.id, name: t.name })));
      }
      
      return Response.json({ 
        success: false, 
        error: 'Nenhum marcador válido encontrado. Os marcadores selecionados não correspondem aos IDs fornecidos.' 
      }, { status: 400 });
    }

    console.log(`[bulkAssignTags] ✅ ${validTags.length} tags válidas - IDs: ${validTagIds.join(', ')} - Nomes: ${validTags.map(t => t.name).join(', ')}`);

    // Atualizar contatos em lotes
    let updatedCount = 0;
    const batchSize = 50;
    
    for (let i = 0; i < matchedContacts.length; i += batchSize) {
      const batch = matchedContacts.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (contact) => {
        try {
          // Mesclar tags existentes com novas (IDs, sem duplicar)
          const existingTags = Array.isArray(contact.tags) ? contact.tags : [];
          const mergedTags = [...new Set([...existingTags, ...validTagIds])];
          
          await base44.entities.Contact.update(contact.id, {
            tags: mergedTags
          });
          updatedCount++;
        } catch (error) {
          console.error(`[bulkAssignTags] Erro ao atualizar contato ${contact.id}:`, error.message);
        }
      }));
      
      console.log(`[bulkAssignTags] Processados ${Math.min(i + batchSize, matchedContacts.length)}/${matchedContacts.length}`);
    }

    console.log(`[bulkAssignTags] ✅ ${updatedCount} contatos atualizados com sucesso`);

    return Response.json({
      success: true,
      updated_count: updatedCount,
      total_matched: matchedContacts.length
    });

  } catch (error) {
    console.error('[bulkAssignTags] Erro:', error);
    return Response.json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    }, { status: 500 });
  }
});