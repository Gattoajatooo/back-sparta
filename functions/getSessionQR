import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

// Função para limpar URL e evitar barras duplas
function cleanUrl(baseUrl, path) {
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${cleanBase}${cleanPath}`;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verificar autenticação
        if (!(await base44.auth.isAuthenticated())) {
            return Response.json({ error: 'Usuário não autenticado' }, { status: 401 });
        }

        const user = await base44.auth.me();
        
        if (!user || !user.company_id) {
            return Response.json({ error: 'Usuário não autenticado ou sem empresa' }, { status: 401 });
        }

        // Pegar dados da requisição
        const { sessionName } = await req.json();

        if (!sessionName) {
            return Response.json({ error: 'Nome da sessão é obrigatório' }, { status: 400 });
        }

        // Verificar configurações WAHA
        const apiKey = Deno.env.get('WAHA_API_KEY');
        const apiUrl = Deno.env.get('WAHA_API_URL');
        
        if (!apiKey || !apiUrl) {
            return Response.json({ error: 'Configurações WAHA não encontradas' }, { status: 500 });
        }

        // Fazer chamada para API do WAHA para pegar QR code
        const qrUrl = cleanUrl(apiUrl, `/api/${sessionName}/auth/qr`);
        
        const wahaResponse = await fetch(qrUrl, {
            method: 'GET',
            headers: {
                'X-Api-Key': apiKey.trim(),
                'Accept': 'application/json'
            }
        });

        const responseText = await wahaResponse.text();
        
        if (!wahaResponse.ok) {
            let errorData;
            try {
                errorData = responseText ? JSON.parse(responseText) : {};
            } catch {
                errorData = { message: responseText };
            }

            return Response.json({
                error: 'Erro ao obter QR code no WAHA',
                status: wahaResponse.status,
                details: errorData
            }, { status: wahaResponse.status });
        }

        let qrData;
        try {
            qrData = responseText ? JSON.parse(responseText) : {};
        } catch (parseError) {
            qrData = { qr: responseText };
        }

        return Response.json({
            success: true,
            qr_code: qrData.qr || qrData,
            session_name: sessionName
        });

    } catch (error) {
        console.error('[getSessionQR] ❌ Erro:', error.message);
        return Response.json({
            error: 'Erro interno do servidor',
            details: error.message
        }, { status: 500 });
    }
});