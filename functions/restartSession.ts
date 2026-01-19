import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user || !user.company_id) {
            return Response.json({ error: 'Usuário não autenticado ou sem empresa' }, { status: 401 });
        }

        const { sessionName } = await req.json();

        if (!sessionName) {
            return Response.json({ error: 'Nome da sessão é obrigatório' }, { status: 400 });
        }

        const apiKey = Deno.env.get('WAHA_API_KEY');
        const apiUrl = Deno.env.get('WAHA_API_URL');
        
        if (!apiKey || !apiUrl) {
            return Response.json({ error: 'Configurações WAHA não encontradas' }, { status: 500 });
        }

        const cleanUrl = (baseUrl, path) => {
            const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
            const cleanPath = path.startsWith('/') ? path : `/${path}`;
            return `${cleanBase}${cleanPath}`;
        };

        const fullUrl = cleanUrl(apiUrl, `/api/sessions/${sessionName}/restart`);

        const wahaResponse = await fetch(fullUrl, {
            method: 'POST',
            headers: { 'X-Api-Key': apiKey.trim() }
        });

        const wahaData = await wahaResponse.json();

        if (!wahaResponse.ok) {
            return Response.json({
                error: 'Erro ao reiniciar sessão no WAHA',
                status: wahaResponse.status,
                details: wahaData
            }, { status: wahaResponse.status });
        }

        const sessions = await base44.asServiceRole.entities.Session.filter({
            company_id: user.company_id,
            session_name: sessionName
        });

        if (sessions.length > 0) {
            const session = sessions[0];
            await base44.asServiceRole.entities.Session.update(session.id, {
                status: 'STARTING',
                last_activity: new Date().toISOString(),
                api_response: wahaData
            });
        }

        return Response.json({
            success: true,
            message: 'Sessão reiniciada com sucesso',
            session: wahaData
        });

    } catch (error) {
        console.error('Erro ao reiniciar sessão:', error);
        return Response.json({
            error: 'Erro interno do servidor',
            details: error.message
        }, { status: 500 });
    }
});