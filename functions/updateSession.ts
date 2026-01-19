import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

async function ensureDefaultSession(base44, companyId, currentSessionId = null) {
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

        const candidates = currentSessionId 
            ? activeSessions.filter(s => s.id !== currentSessionId)
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

// ✅ NOVA FUNÇÃO: Buscar perfil do WhatsApp
async function fetchWhatsAppProfile(session_name) {
    try {
        const apiKey = Deno.env.get('WAHA_API_KEY');
        const apiUrl = Deno.env.get('WAHA_API_URL');
        
        if (!apiKey || !apiUrl) {
            console.error('[fetchWhatsAppProfile] Credenciais WAHA não configuradas');
            return null;
        }

        const cleanBase = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
        const profileUrl = `${cleanBase}/api/${session_name}/contacts/me`;
        
        console.log(`[fetchWhatsAppProfile] 🔍 Buscando perfil para ${session_name}`);
        
        const response = await fetch(profileUrl, {
            method: 'GET',
            headers: {
                'accept': 'application/json',
                'X-Api-Key': apiKey
            }
        });

        if (!response.ok) {
            console.error(`[fetchWhatsAppProfile] ❌ Erro ${response.status}`);
            return null;
        }

        const data = await response.json();
        console.log(`[fetchWhatsAppProfile] ✅ Perfil obtido:`, data);
        
        return {
            phone: data.id?.split('@')[0] || null,
            push_name: data.pushname || data.name || null,
            avatar_url: data.picture || null
        };
    } catch (error) {
        console.error('[fetchWhatsAppProfile] ❌ Erro:', error.message);
        return null;
    }
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const body = await req.json();
        const { session_name, ...updateData } = body;

        if (!session_name) {
            return Response.json({ 
                success: false, 
                error: 'session_name is required' 
            }, { status: 400 });
        }

        console.log(`[updateSession] Atualizando sessão ${session_name} com dados:`, updateData);

        const sessions = await base44.asServiceRole.entities.Session.filter({
            session_name: session_name
        });

        if (!sessions || sessions.length === 0) {
            return Response.json({ 
                success: false, 
                error: 'Session not found' 
            }, { status: 404 });
        }

        const session = sessions[0];
        const companyId = session.company_id;
        const wasDefault = session.is_default || false;
        const newStatus = updateData.status || session.status;
        
        const finalUpdateData = {
            ...updateData,
            last_activity: new Date().toISOString()
        };

        // ✅ CAPTURAR dados de perfil
        if (updateData.phone) {
            finalUpdateData.phone = updateData.phone;
        }
        if (updateData.push_name) {
            finalUpdateData.push_name = updateData.push_name;
        }
        if (updateData.avatar_url) {
            finalUpdateData.avatar_url = updateData.avatar_url;
        }

        // ✅ NOVO: Se status ficou WORKING e não tem phone/push_name, buscar da API
        if (newStatus === 'WORKING' && (!session.phone || !session.push_name)) {
            console.log(`[updateSession] 🔍 Sessão WORKING sem dados de perfil. Buscando...`);
            const profile = await fetchWhatsAppProfile(session_name);
            
            if (profile) {
                if (profile.phone) finalUpdateData.phone = profile.phone;
                if (profile.push_name) finalUpdateData.push_name = profile.push_name;
                if (profile.avatar_url) finalUpdateData.avatar_url = profile.avatar_url;
                
                console.log(`[updateSession] ✅ Perfil atualizado:`, profile);
            }
        }

        // ✅ LÓGICA DE SESSÃO PADRÃO
        if (newStatus === 'WORKING' && !wasDefault) {
            const existingDefault = await base44.asServiceRole.entities.Session.filter({
                company_id: companyId,
                is_default: true,
                status: 'WORKING',
                is_deleted: { '$ne': true }
            });

            if (!existingDefault || existingDefault.length === 0) {
                console.log(`[updateSession] 🎯 Primeira sessão WORKING. Tornando padrão: ${session_name}`);
                finalUpdateData.is_default = true;
            }
        }

        const updatedSession = await base44.asServiceRole.entities.Session.update(
            session.id, 
            finalUpdateData
        );

        console.log(`[updateSession] ✅ Sessão ${session_name} atualizada com sucesso`);

        if (wasDefault && (newStatus === 'FAILED' || newStatus === 'STOPPED' || newStatus === 'SCAN_QR_CODE')) {
            console.log(`[updateSession] ⚠️ Sessão padrão foi desconectada/parada. Buscando substituta...`);
            await ensureDefaultSession(base44, companyId, session.id);
        }

        // WEBSOCKET
        try {
            console.log(`[updateSession] 📡 Enviando notificação WebSocket...`);
            
            const wsPayload = {
                type: 'session_updated',
                company_id: session.company_id,
                session_id: session.id,
                session_name: session_name,
                status: newStatus,
                phone: finalUpdateData.phone || session.phone,
                push_name: finalUpdateData.push_name || session.push_name,
                avatar_url: finalUpdateData.avatar_url || session.avatar_url,
                is_default: finalUpdateData.is_default || session.is_default || false,
                data: {
                    ...updatedSession,
                    ...updateData
                }
            };

            const wsResponse = await base44.asServiceRole.functions.invoke('sendWebSocketUpdate', wsPayload);
            
            if (wsResponse?.data?.success) {
                console.log(`[updateSession] ✅ WebSocket enviado - ${wsResponse.data.delivered || 0} cliente(s)`);
            } else {
                console.warn(`[updateSession] ⚠️ WebSocket falhou:`, wsResponse?.data);
            }
        } catch (wsError) {
            console.error(`[updateSession] ❌ Erro ao enviar WebSocket:`, wsError.message);
        }

        return Response.json({ 
            success: true,
            session_id: session.id,
            session_name: session_name,
            updated_data: finalUpdateData
        });

    } catch (error) {
        console.error('[updateSession] ❌ Erro:', error);
        return Response.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
});