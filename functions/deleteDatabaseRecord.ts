import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { entityName, recordId } = await req.json();

    if (!entityName || !recordId) {
      return Response.json({ error: 'entityName e recordId são obrigatórios' }, { status: 400 });
    }

    await base44.asServiceRole.entities[entityName].delete(recordId);

    return Response.json({
      success: true
    });

  } catch (error) {
    console.error('Erro ao deletar registro:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});