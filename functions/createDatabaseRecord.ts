import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { entityName, data } = await req.json();

    if (!entityName || !data) {
      return Response.json({ error: 'entityName e data são obrigatórios' }, { status: 400 });
    }

    const createdRecord = await base44.asServiceRole.entities[entityName].create(data);

    return Response.json({
      success: true,
      record: createdRecord
    });

  } catch (error) {
    console.error('Erro ao criar registro:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});