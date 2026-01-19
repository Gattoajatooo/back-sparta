import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user || !user.company_id) {
            return new Response(JSON.stringify({ error: 'Usuário não autenticado ou sem empresa' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const { sessionName } = await req.json();
        
        if (!sessionName) {
            return new Response(JSON.stringify({ error: 'sessionName é obrigatório' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const apiKey = Deno.env.get('WAHA_API_KEY');
        const apiUrl = Deno.env.get('WAHA_API_URL');
        
        if (!apiKey || !apiUrl) {
            return new Response(JSON.stringify({ 
                error: 'Configurações WAHA não encontradas',
                details: 'WAHA_API_KEY ou WAHA_API_URL não configurados'
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log(`Verificando status da sessão: ${sessionName}`);

        const cleanUrl = (baseUrl, path) => {
            const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
            const cleanPath = path.startsWith('/') ? path : `/${path}`;
            return `${cleanBase}${cleanPath}`;
        };

        const fullUrl = cleanUrl(apiUrl, `/api/sessions/${sessionName}`);
        
        const wahaResponse = await fetch(fullUrl, {
            method: 'GET',
            headers: {
                'X-Api-Key': apiKey.trim(),
                'Accept': 'application/json'
            }
        });

        console.log(`WAHA API Response Status: ${wahaResponse.status}`);

        if (wahaResponse.status === 404) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Session not found in WAHA API',
                session_name: sessionName
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (!wahaResponse.ok) {
            const errorText = await wahaResponse.text();
            console.error(`WAHA API Error: ${wahaResponse.status} - ${errorText}`);
            return new Response(JSON.stringify({
                success: false,
                error: 'WAHA API error',
                status: wahaResponse.status,
                details: errorText
            }), {
                status: wahaResponse.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const wahaData = await wahaResponse.json();
        console.log('WAHA Session Data:', JSON.stringify(wahaData, null, 2));

        const sessions = await base44.entities.Session.filter({
            company_id: user.company_id,
            session_name: sessionName
        });

        let session = sessions.length > 0 ? sessions[0] : null;

        if (session) {
            const newStatus = wahaData.status;
            if (session.status !== newStatus) {
                const updateData = {
                    status: newStatus,
                    last_activity: new Date().toISOString()
                };

                // ✅ CAPTURAR phone e push_name quando sessão está WORKING
                if (newStatus === 'WORKING' && wahaData.me) {
                    if (wahaData.me.id) {
                        const phone = wahaData.me.id.split('@')[0];
                        updateData.phone = phone;
                    }
                    if (wahaData.me.pushName) {
                        updateData.push_name = wahaData.me.pushName;
                    }
                }

                await base44.entities.Session.update(session.id, updateData);
                
                session = { ...session, ...updateData };
                
                console.log(`Updated session ${sessionName} status to ${newStatus}`);
            }
        }

        return new Response(JSON.stringify({
            success: true,
            session: wahaData,
            database_session: session
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error in getSessionStatus:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Internal server error',
            details: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});