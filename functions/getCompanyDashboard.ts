import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ success: false, error: 'Acesso negado' }, { status: 403 });
    }

    const { company_id } = await req.json();
    
    if (!company_id) {
      return Response.json({ success: false, error: 'company_id é obrigatório' }, { status: 400 });
    }

    // Buscar dados em paralelo usando asServiceRole
    const [contacts, sessions, messages, teamMembers, payments, roles] = await Promise.all([
      base44.asServiceRole.entities.Contact.filter({ company_id, deleted: { '$ne': true } }),
      base44.asServiceRole.entities.Session.filter({ company_id, is_deleted: { '$ne': true } }),
      base44.asServiceRole.entities.Message.filter({ company_id }),
      base44.asServiceRole.entities.User.filter({ company_id, is_active: true }),
      base44.asServiceRole.entities.Payment.filter({ company_id }),
      base44.asServiceRole.entities.Role.filter({ company_id })
    ]);

    return Response.json({
      success: true,
      data: {
        contacts,
        sessions,
        messages,
        teamMembers,
        payments,
        roles
      }
    });

  } catch (error) {
    console.error('[getCompanyDashboard] Erro:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});