import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user || !user.company_id) {
            return Response.json({ error: 'Usuário não autenticado ou sem empresa' }, {
                status: 401
            });
        }

        const { sessionName, phoneNumber } = await req.json();

        if (!sessionName || !phoneNumber) {
            return Response.json({ error: 'Nome da sessão e número de telefone são obrigatórios' }, {
                status: 400
            });
        }

        console.log(`[requestPairingCode] Solicitando código para sessão ${sessionName}, telefone: ${phoneNumber}`);

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
        const wahaResponse = await fetch(`${cleanBase}/api/${sessionName}/auth/request-code`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': apiKey
            },
            body: JSON.stringify({
                phoneNumber: phoneNumber
            })
        });

        const wahaData = await wahaResponse.json();

        if (!wahaResponse.ok) {
            console.error(`[requestPairingCode] ❌ Erro WAHA: ${wahaResponse.status}`, wahaData);
            return Response.json({
                error: 'Erro ao solicitar código de pareamento no WAHA',
                status: wahaResponse.status,
                details: wahaData
            }, {
                status: wahaResponse.status
            });
        }

        console.log(`[requestPairingCode] ✅ Código gerado: ${wahaData.code}`);

        return Response.json({
            success: true,
            code: wahaData.code,
            session_name: sessionName,
            phone_number: phoneNumber
        });

    } catch (error) {
        console.error('[requestPairingCode] Erro:', error);
        return Response.json({
            error: 'Erro interno do servidor',
            details: error.message
        }, {
            status: 500
        });
    }
});