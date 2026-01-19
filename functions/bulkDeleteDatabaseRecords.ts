import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { entityName, filters = {} } = await req.json();

    if (!entityName) {
      return Response.json({ error: 'entityName é obrigatório' }, { status: 400 });
    }

    // Filtrar registros não deletados para entidades com soft delete
    let baseFilter = {};
    
    if (entityName === 'Contact' || entityName === 'Message') {
      baseFilter = { deleted: { '$in': [false, null] } };
    }
    
    // Combinar com filtros customizados
    const combinedFilter = { ...baseFilter, ...filters };
    
    console.log('[bulkDeleteDatabaseRecords] Entity:', entityName, 'Filter:', JSON.stringify(combinedFilter));
    
    // Buscar registros que correspondem aos filtros
    const recordsToDelete = await base44.asServiceRole.entities[entityName].filter(combinedFilter);
    
    console.log('[bulkDeleteDatabaseRecords] Registros a deletar:', recordsToDelete.length);
    
    // Deletar todos os registros
    let deletedCount = 0;
    let failedCount = 0;
    
    for (const record of recordsToDelete) {
      try {
        await base44.asServiceRole.entities[entityName].delete(record.id);
        deletedCount++;
      } catch (error) {
        console.error('[bulkDeleteDatabaseRecords] Erro ao deletar:', record.id, error.message);
        failedCount++;
      }
    }

    return Response.json({
      success: true,
      deletedCount,
      failedCount,
      totalProcessed: recordsToDelete.length
    });

  } catch (error) {
    console.error('[bulkDeleteDatabaseRecords] Erro:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});