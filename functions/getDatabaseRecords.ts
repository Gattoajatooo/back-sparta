import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { entityName, page = 0, limit = 100, searchTerm = '', filters = {} } = await req.json();

    if (!entityName) {
      return Response.json({ error: 'entityName é obrigatório' }, { status: 400 });
    }

    const offset = page * limit;

    // Filtrar registros não deletados para entidades com soft delete
    let baseFilter = {};

    if (entityName === 'Contact' || entityName === 'Message') {
      baseFilter = { 
        deleted: { '$in': [false, null] },
        is_deleted: { '$in': [false, null] }
      };
    }

    // Processar filtros especiais (como length)
    const processedFilters = {};
    const lengthFilters = {};

    for (const [key, value] of Object.entries(filters)) {
      if (key.endsWith('__length')) {
        // Filtro por comprimento - processar depois
        const fieldName = key.replace('__length', '');
        lengthFilters[fieldName] = parseInt(value);
      } else {
        // Filtro normal
        processedFilters[key] = value;
      }
    }

    // Combinar com filtros customizados
    const combinedFilter = { ...baseFilter, ...processedFilters };
    
    console.log('[getDatabaseRecords] Entity:', entityName, 'Filter:', JSON.stringify(combinedFilter));
    console.log('[getDatabaseRecords] Page:', page, 'Limit:', limit, 'Offset:', offset);
    
    // Buscar registros com paginação
    const paginatedRecords = await base44.asServiceRole.entities[entityName].filter(
      combinedFilter,
      null,
      limit,
      offset
    );

    console.log('[getDatabaseRecords] Registros da página:', paginatedRecords.length);

    // Para o total, buscar sem limite (isso vai ser menos eficiente mas funcional)
    const allRecords = await base44.asServiceRole.entities[entityName].filter(combinedFilter);
    let totalFound = allRecords.length;

    console.log('[getDatabaseRecords] Total de registros:', totalFound);

    // Aplicar filtros de comprimento (length)
    let filteredByLength = paginatedRecords;
    let allFilteredByLength = allRecords;

    if (Object.keys(lengthFilters).length > 0) {
      console.log('[getDatabaseRecords] Aplicando filtros de comprimento:', lengthFilters);

      filteredByLength = paginatedRecords.filter(record => {
        for (const [field, expectedLength] of Object.entries(lengthFilters)) {
          const fieldValue = record[field];
          if (fieldValue === null || fieldValue === undefined) return false;

          const actualLength = String(fieldValue).length;
          if (actualLength !== expectedLength) return false;
        }
        return true;
      });

      allFilteredByLength = allRecords.filter(record => {
        for (const [field, expectedLength] of Object.entries(lengthFilters)) {
          const fieldValue = record[field];
          if (fieldValue === null || fieldValue === undefined) return false;

          const actualLength = String(fieldValue).length;
          if (actualLength !== expectedLength) return false;
        }
        return true;
      });

      totalFound = allFilteredByLength.length;
      console.log('[getDatabaseRecords] Após filtro de comprimento:', filteredByLength.length);
    }

    // Se tiver termo de busca, filtrar apenas nos registros da página
    let finalRecords = filteredByLength;
    if (searchTerm && searchTerm.trim() !== '') {
      const search = searchTerm.toLowerCase().trim();
      console.log('[getDatabaseRecords] Filtrando por:', search);

      finalRecords = filteredByLength.filter(record => {
        try {
          const recordString = JSON.stringify(record).toLowerCase();
          return recordString.includes(search);
        } catch (e) {
          return false;
        }
      });

      console.log('[getDatabaseRecords] Após busca:', finalRecords.length);
    }

    console.log('[getDatabaseRecords] Retornando página', page, ':', finalRecords.length, 'registros');
    console.log('[getDatabaseRecords] Tipo:', Array.isArray(finalRecords) ? 'array' : typeof finalRecords);
    
    return Response.json({
      success: true,
      records: finalRecords,
      total: totalFound,
      page: page,
      limit: limit,
      totalPages: Math.ceil(totalFound / limit)
    });

  } catch (error) {
    console.error('[getDatabaseRecords] Erro:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});