import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';

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

        const { session_names } = await req.json();

        if (!Array.isArray(session_names) || session_names.length === 0) {
            return new Response(JSON.stringify({ success: true, sessions: [] }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // A SDK do Base44 permite filtrar por um array de valores para um campo,
        // o que se traduz em uma cláusula 'IN' no banco de dados.
        const sessions = await base44.asServiceRole.entities.Session.filter({
            company_id: user.company_id,
            session_name: session_names
        });
        
        return new Response(JSON.stringify({
            success: true,
            sessions: sessions
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Erro em getSessionsDetails:', error);
        return new Response(JSON.stringify({
            error: 'Erro interno do servidor',
            details: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});