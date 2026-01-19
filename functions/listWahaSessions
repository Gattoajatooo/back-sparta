import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

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

        const apiKey = Deno.env.get('WAHA_API_KEY');
        const apiUrl = Deno.env.get('WAHA_API_URL');

        if (!apiKey || !apiUrl) {
            return new Response(JSON.stringify({
                error: 'Configurações da API WAHA não encontradas'
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const wahaResponse = await fetch(`${apiUrl}/api/sessions?all=true`, {
            method: 'GET',
            headers: { 'X-Api-Key': apiKey }
        });

        if (!wahaResponse.ok) {
            const errorText = await wahaResponse.text();
            console.error('Erro ao chamar API WAHA:', wahaResponse.status, errorText);
            return new Response(JSON.stringify({
                error: 'Erro ao consultar API WAHA',
                details: errorText
            }), {
                status: wahaResponse.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const wahaSessions = await wahaResponse.json();

        const companySessions = wahaSessions.filter(session =>
            session.config?.metadata?.['user.id'] === user.company_id
        );

        return new Response(JSON.stringify({
            success: true,
            sessions: companySessions
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Erro em listWahaSessions:', error);
        return new Response(JSON.stringify({
            error: 'Erro interno do servidor',
            details: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});