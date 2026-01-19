import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

// ✅ NOVA FUNÇÃO: Garantir que há uma sessão padrão
async function ensureDefaultSession(base44, companyId, excludeSessionId = null) {
    try {
        console.log(`[ensureDefaultSession] Verificando sessão padrão para empresa ${companyId}...`);
        
        // Verificar se já existe uma sessão padrão ativa
        const defaultSessions = await base44.asServiceRole.entities.Session.filter({
            company_id: companyId,
            is_default: true,
            status: 'WORKING',
            is_deleted: { '$ne': true }
        });

        // Se já tem uma sessão padrão válida, não fazer nada
        if (defaultSessions && defaultSessions.length > 0) {
            console.log(`[ensureDefaultSession] ✅ Já existe sessão padrão: ${defaultSessions[0].session_name}`);
            return;
        }

        console.log(`[ensureDefaultSession] ⚠️ Nenhuma sessão padrão ativa. Buscando candidata...`);

        // Buscar todas as sessões ativas (exceto a que foi excluída)
        const activeSessions = await base44.asServiceRole.entities.Session.filter({
            company_id: companyId,
            status: 'WORKING',
            is_deleted: { '$ne': true }
        });

        const candidates = excludeSessionId 
            ? activeSessions.filter(s => s.id !== excludeSessionId)
            : activeSessions;

        if (candidates && candidates.length > 0) {
            const newDefaultSession = candidates[0];
            
            console.log(`[ensureDefaultSession] 🎯 Definindo nova sessão padrão: ${newDefaultSession.session_name}`);
            
            await base44.asServiceRole.entities.Session.update(newDefaultSession.id, {
                is_default: true
            });

            console.log(`[ensureDefaultSession] ✅ Sessão ${newDefaultSession.session_name} agora é padrão`);
        } else {
            console.log(`[ensureDefaultSession] ℹ️ Nenhuma sessão ativa disponível para ser padrão`);
        }
    } catch (error) {
        console.error('[ensureDefaultSession] ❌ Erro:', error.message);
    }
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user || !user.company_id) {
            return Response.json({ error: 'Usuário não autenticado ou sem empresa' }, {
                status: 401
            });
        }

        const body = await req.json();
        const sessionName = body.session_name || body.sessionName;

        if (!sessionName) {
            return Response.json({ error: 'Nome da sessão é obrigatório' }, {
                status: 400
            });
        }

        console.log(`[deleteSession] Deletando sessão: ${sessionName}`);

        const apiKey = Deno.env.get('WAHA_API_KEY');
        const apiUrl = Deno.env.get('WAHA_API_URL');
        
        if (!apiKey || !apiUrl) {
            return Response.json({ 
                error: 'Configurações WAHA não encontradas' 
            }, {
                status: 500
            });
        }

        // Chamar a API do WAHA para deletar a sessão
        const cleanBase = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
        const wahaResponse = await fetch(`${cleanBase}/api/sessions/${sessionName}`, {
            method: 'DELETE',
            headers: { 'X-Api-Key': apiKey }
        });

        if (!wahaResponse.ok && wahaResponse.status !== 404) {
             console.error(`WAHA API error during session delete for ${sessionName}, but proceeding with soft delete.`);
        }

        // Marcar a sessão como deletada no nosso banco de dados
        const sessions = await base44.asServiceRole.entities.Session.filter({
            company_id: user.company_id,
            session_name: sessionName
        });

        if (sessions.length > 0) {
            const session = sessions[0];
            const wasDefault = session.is_default || false;
            
            await base44.asServiceRole.entities.Session.update(session.id, {
                is_deleted: true,
                deleted_at: new Date().toISOString(),
                status: 'STOPPED',
                is_default: false
            });

            console.log(`[deleteSession] ✅ Sessão ${sessionName} marcada como deletada`);

            // ✅ Se era a sessão padrão, garantir que outra seja definida
            if (wasDefault) {
                console.log(`[deleteSession] ⚠️ Sessão padrão foi deletada. Buscando substituta...`);
                await ensureDefaultSession(base44, user.company_id, session.id);
            }
        } else {
             return Response.json({
                success: true,
                message: 'Sessão não encontrada no banco de dados, mas considerada deletada.'
            });
        }

        return Response.json({
            success: true,
            message: 'Sessão deletada com sucesso'
        });

    } catch (error) {
        console.error('[deleteSession] Erro:', error);
        return Response.json({
            error: 'Erro interno do servidor',
            details: error.message
        }, {
            status: 500
        });
    }
});