import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { entityName, recordId, data } = await req.json();

    if (!entityName || !recordId || !data) {
      return Response.json({ error: 'entityName, recordId e data são obrigatórios' }, { status: 400 });
    }

    const updatedRecord = await base44.asServiceRole.entities[entityName].update(recordId, data);

    return Response.json({
      success: true,
      record: updatedRecord
    });

  } catch (error) {
    console.error('Erro ao atualizar registro:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});