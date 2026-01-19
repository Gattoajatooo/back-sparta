import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Busca o LID (WhatsApp Business Account ID) a partir de um número de telefone
 * Endpoint WAHA: GET /api/{session}/lids/pn/{phone}
 */

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        if (!(await base44.auth.isAuthenticated())) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const user = await base44.auth.me();
        if (!user?.company_id) {
            return Response.json({ success: false, error: 'No company found' }, { status: 400 });
        }

        const { phone, sessionName } = await req.json();

        if (!phone) {
            return Response.json({ success: false, error: 'Phone number is required' }, { status: 400 });
        }

        if (!sessionName) {
            return Response.json({ success: false, error: 'Session name is required' }, { status: 400 });
        }

        // Limpar número de telefone
        const cleanPhone = phone.replace(/\D/g, '');
        
        if (!cleanPhone) {
            return Response.json({ success: false, error: 'Invalid phone number' }, { status: 400 });
        }

        const WAHA_API_URL = Deno.env.get('WAHA_API_URL');
        const WAHA_API_KEY = Deno.env.get('WAHA_API_KEY');

        if (!WAHA_API_URL || !WAHA_API_KEY) {
            return Response.json({ success: false, error: 'WAHA configuration missing' }, { status: 500 });
        }

        console.log(`[getLidFromPhone] 🔍 Buscando LID para: ${cleanPhone} na sessão ${sessionName}`);

        // Chamar API WAHA para buscar LID
        const wahaUrl = `${WAHA_API_URL}/api/${sessionName}/lids/pn/${cleanPhone}`;
        
        const response = await fetch(wahaUrl, {
            method: 'GET',
            headers: {
                'X-Api-Key': WAHA_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.log(`[getLidFromPhone] ⚠️ WAHA retornou ${response.status}: ${errorText}`);
            
            // Se retornar 404 ou erro, significa que não é conta comercial
            if (response.status === 404) {
                return Response.json({ 
                    success: true, 
                    hasLid: false,
                    message: 'Número não possui LID (não é conta comercial)'
                });
            }
            
            return Response.json({ 
                success: false, 
                error: `WAHA error: ${response.status}`,
                details: errorText
            }, { status: response.status });
        }

        const data = await response.json();
        console.log(`[getLidFromPhone] 📡 Resposta WAHA:`, JSON.stringify(data));

        // Verificar se retornou um LID válido
        if (data && data.lid) {
            console.log(`[getLidFromPhone] ✅ LID encontrado: ${data.lid}`);
            return Response.json({
                success: true,
                hasLid: true,
                lid: data.lid,
                phone: cleanPhone
            });
        }

        // Tentar extrair LID de diferentes formatos de resposta
        if (data && typeof data === 'object') {
            // Alguns formatos retornam { id: "123456@lid" }
            const possibleLid = data.id || data._serialized || data.user;
            
            if (possibleLid && possibleLid.includes('@lid')) {
                console.log(`[getLidFromPhone] ✅ LID encontrado (formato alternativo): ${possibleLid}`);
                return Response.json({
                    success: true,
                    hasLid: true,
                    lid: possibleLid,
                    phone: cleanPhone
                });
            }
        }

        console.log(`[getLidFromPhone] ℹ️ Nenhum LID encontrado para ${cleanPhone}`);
        return Response.json({
            success: true,
            hasLid: false,
            message: 'Número não possui LID associado'
        });

    } catch (error) {
        console.error('[getLidFromPhone] ❌ Erro:', error);
        return Response.json({ 
            success: false, 
            error: 'Internal server error',
            details: error.message 
        }, { status: 500 });
    }
});