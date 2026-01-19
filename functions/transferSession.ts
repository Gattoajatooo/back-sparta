import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verificar autenticação
        if (!(await base44.auth.isAuthenticated())) {
            return Response.json({ error: 'Usuário não autenticado' }, { status: 401 });
        }

        const user = await base44.auth.me();
        
        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Apenas administradores podem transferir sessões' }, { status: 403 });
        }

        const { sessionId, targetCompanyId } = await req.json();

        if (!sessionId || !targetCompanyId) {
            return Response.json({ error: 'ID da sessão e ID da empresa alvo são obrigatórios' }, { status: 400 });
        }

        // Buscar a sessão para confirmar que existe
        const session = await base44.asServiceRole.entities.Session.get(sessionId);

        if (!session) {
            return Response.json({ error: 'Sessão não encontrada' }, { status: 404 });
        }

        // Buscar a empresa alvo para confirmar que existe
        const targetCompany = await base44.asServiceRole.entities.Company.get(targetCompanyId);

        if (!targetCompany) {
            return Response.json({ error: 'Empresa alvo não encontrada' }, { status: 404 });
        }

        // 🔒 Se for sessão de sistema, verificar se o dono da empresa alvo é admin
        if (session.is_system_session) {
            const owner = await base44.asServiceRole.entities.User.get(targetCompany.owner_id);
            if (!owner || owner.role !== 'admin') {
                return Response.json({ 
                    error: 'Sessões de sistema só podem ser transferidas para empresas pertencentes a administradores.' 
                }, { status: 403 });
            }
        }

        // Realizar a transferência
        await base44.asServiceRole.entities.Session.update(sessionId, {
            company_id: targetCompanyId
        });

        // Enviar WebSocket para notificar a mudança (opcional, mas bom para UI reativa)
        // Notificar a empresa antiga (para remover da lista)
        try {
            await base44.asServiceRole.functions.invoke('sendWebSocketUpdate', {
                type: 'session_updated',
                company_id: session.company_id,
                session_id: session.id,
                status: 'TRANSFERRED_OUT',
                data: { ...session, company_id: targetCompanyId }
            });
        } catch (wsError) {
            console.error('Erro ao enviar WS para empresa antiga:', wsError);
        }

        // Notificar a empresa nova (para adicionar na lista)
        try {
            await base44.asServiceRole.functions.invoke('sendWebSocketUpdate', {
                type: 'session_updated',
                company_id: targetCompanyId,
                session_id: session.id,
                status: session.status,
                data: { ...session, company_id: targetCompanyId }
            });
        } catch (wsError) {
            console.error('Erro ao enviar WS para empresa nova:', wsError);
        }

        return Response.json({
            success: true,
            message: `Sessão transferida com sucesso para ${targetCompany.name}`
        });

    } catch (error) {
        console.error('Erro ao transferir sessão:', error);
        return Response.json({
            error: 'Erro interno ao transferir sessão',
            details: error.message
        }, { status: 500 });
    }
});