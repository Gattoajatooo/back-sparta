import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

async function ensureDefaultSession(base44, companyId, excludeSessionId = null) {
    try {
        console.log(`[ensureDefaultSession] Verificando sessão padrão para empresa ${companyId}...`);
        
        const defaultSessions = await base44.asServiceRole.entities.Session.filter({
            company_id: companyId,
            is_default: true,
            status: 'WORKING',
            is_deleted: { '$ne': true }
        });

        if (defaultSessions && defaultSessions.length > 0) {
            console.log(`[ensureDefaultSession] ✅ Já existe sessão padrão: ${defaultSessions[0].session_name}`);
            return;
        }

        console.log(`[ensureDefaultSession] ⚠️ Nenhuma sessão padrão ativa. Buscando candidata...`);

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

        console.log(`[logoutSession] Desconectando sessão: ${sessionName}`);

        const apiKey = Deno.env.get('WAHA_API_KEY');
        const apiUrl = Deno.env.get('WAHA_API_URL');
        
        if (!apiKey || !apiUrl) {
            return Response.json({ 
                error: 'Configurações WAHA não encontradas' 
            }, {
                status: 500
            });
        }

        const cleanBase = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
        const wahaResponse = await fetch(`${cleanBase}/api/sessions/${sessionName}/logout`, {
            method: 'POST',
            headers: { 'X-Api-Key': apiKey }
        });

        const wahaData = await wahaResponse.json();

        if (!wahaResponse.ok) {
            if (wahaResponse.status !== 404) {
              return Response.json({
                  error: 'Erro ao fazer logout da sessão no WAHA',
                  status: wahaResponse.status,
                  details: wahaData
              }, {
                  status: wahaResponse.status
              });
            }
        }

        const sessions = await base44.asServiceRole.entities.Session.filter({
            company_id: user.company_id,
            session_name: sessionName
        });

        if (sessions.length > 0) {
            const session = sessions[0];
            const wasDefault = session.is_default || false;
            
            await base44.asServiceRole.entities.Session.update(session.id, {
                status: 'SCAN_QR_CODE',
                phone: null,
                avatar_url: null,
                push_name: null,
                is_default: false,
                last_activity: new Date().toISOString(),
                api_response: wahaData
            });

            console.log(`[logoutSession] ✅ Sessão ${sessionName} desconectada`);

            if (wasDefault) {
                console.log(`[logoutSession] ⚠️ Sessão padrão foi desconectada. Buscando substituta...`);
                await ensureDefaultSession(base44, user.company_id, session.id);
            }
        }

        return Response.json({
            success: true,
            message: 'Logout da sessão realizado com sucesso',
            session: wahaData
        });

    } catch (error) {
        console.error('[logoutSession] Erro:', error);
        return Response.json({
            error: 'Erro interno do servidor',
            details: error.message
        }, {
            status: 500
        });
    }
});