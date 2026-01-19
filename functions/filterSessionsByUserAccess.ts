import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }

    const { sessions } = await req.json();

    if (!Array.isArray(sessions)) {
      return Response.json({ 
        success: false, 
        error: 'Sessions deve ser um array' 
      }, { status: 400 });
    }

    // Se for admin do sistema, retorna todas as sessões
    if (user.system_role === 'admin') {
      console.log('[filterSessionsByUserAccess] ✅ Admin do sistema - acesso a todas as sessões');
      return Response.json({
        success: true,
        sessions: sessions
      });
    }

    // Caso contrário, filtrar pelas sessões permitidas
    const allowedSessions = user.allowed_sessions || [];
    
    console.log('[filterSessionsByUserAccess] 🔍 Filtrando sessões para usuário:', {
      userId: user.id,
      allowedSessions
    });

    // Filtrar por número de telefone (session_number)
    const filteredSessions = sessions.filter(session => {
      const sessionPhone = session.phone || session.session_number;
      return allowedSessions.includes(sessionPhone);
    });

    console.log('[filterSessionsByUserAccess] ✅ Sessões permitidas:', filteredSessions.length);

    return Response.json({
      success: true,
      sessions: filteredSessions
    });

  } catch (error) {
    console.error('[filterSessionsByUserAccess] Erro:', error);
    return Response.json({
      success: false,
      error: error.message || 'Erro interno ao filtrar sessões'
    }, { status: 500 });
  }
});