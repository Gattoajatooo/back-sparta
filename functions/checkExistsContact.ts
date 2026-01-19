import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Função helper para limpar telefone
function cleanPhoneNumber(phone) {
    if (!phone || typeof phone !== 'string') return null;
    return phone.replace(/\D/g, '');
}

// ✅ Função helper para extrair número limpo do chatId
function extractPhoneFromChatId(chatId) {
    if (!chatId) return null;
    // Remove @c.us, @s.whatsapp.net, etc
    return chatId.split('@')[0];
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user || !user.company_id) {
            return Response.json({ 
                success: false, 
                error: 'Unauthorized' 
            }, { status: 401 });
        }

        const { phones } = await req.json();

        if (!phones || !Array.isArray(phones) || phones.length === 0) {
            return Response.json({
                success: false,
                error: 'phones é obrigatório e deve ser um array'
            }, { status: 400 });
        }

        console.log(`[CheckExistsContact] Verificando ${phones.length} telefone(s)...`);

        // ✅ MUDANÇA: Buscar sessão PADRÃO primeiro
        let sessionToUse = null;
        
        const defaultSessions = await base44.asServiceRole.entities.Session.filter({
            company_id: user.company_id,
            is_default: true,
            status: 'WORKING',
            is_deleted: { '$ne': true }
        });

        if (defaultSessions && defaultSessions.length > 0) {
            sessionToUse = defaultSessions[0];
            console.log(`[CheckExistsContact] ✅ Usando sessão padrão: ${sessionToUse.session_name}`);
        } else {
            // Fallback: buscar qualquer sessão ativa
            const activeSessions = await base44.asServiceRole.entities.Session.filter({
                company_id: user.company_id,
                status: 'WORKING',
                is_deleted: { '$ne': true }
            });

            if (activeSessions && activeSessions.length > 0) {
                sessionToUse = activeSessions[0];
                console.log(`[CheckExistsContact] ⚠️ Nenhuma sessão padrão. Usando: ${sessionToUse.session_name}`);
            }
        }

        // Se não há sessões ativas, retornar sem verificação
        if (!sessionToUse) {
            console.log('[CheckExistsContact] ⚠️ Nenhuma sessão ativa. Contatos serão criados sem verificação.');
            
            const results = phones.map(phone => ({
                phone: phone,
                cleaned_phone: cleanPhoneNumber(phone),
                verified: false,
                exists: null,
                reason: 'Nenhuma sessão ativa disponível'
            }));

            return Response.json({
                success: true,
                has_active_session: false,
                results: results,
                message: 'Nenhuma sessão ativa. Contatos criados sem verificação.'
            });
        }

        const sessionName = sessionToUse.session_name;

        // Obter credenciais WAHA
        const apiKey = Deno.env.get('WAHA_API_KEY');
        const apiUrl = Deno.env.get('WAHA_API_URL');

        if (!apiKey || !apiUrl) {
            console.error('[CheckExistsContact] ❌ Credenciais WAHA não configuradas');
            
            const results = phones.map(phone => ({
                phone: phone,
                cleaned_phone: cleanPhoneNumber(phone),
                verified: false,
                exists: null,
                reason: 'API WhatsApp não configurada'
            }));

            return Response.json({
                success: true,
                has_active_session: true,
                results: results,
                message: 'API WhatsApp não configurada. Contatos criados sem verificação.'
            });
        }

        // Verificar cada telefone
        const results = [];
        const cleanBase = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;

        for (const phone of phones) {
            const cleanedPhone = cleanPhoneNumber(phone);
            
            if (!cleanedPhone) {
                results.push({
                    phone: phone,
                    cleaned_phone: null,
                    verified: false,
                    exists: null,
                    reason: 'Número inválido'
                });
                continue;
            }

            try {
                const checkUrl = `${cleanBase}/api/contacts/check-exists?session=${sessionName}&phone=${cleanedPhone}`;
                
                console.log(`[CheckExistsContact] 🔍 Verificando: ${cleanedPhone}`);
                
                const checkResponse = await fetch(checkUrl, {
                    method: 'GET',
                    headers: {
                        'accept': 'application/json',
                        'Content-Type': 'application/json',
                        'X-Api-Key': apiKey
                    }
                });

                if (!checkResponse.ok) {
                    console.error(`[CheckExistsContact] ❌ Erro ao verificar ${cleanedPhone}:`, checkResponse.status);
                    
                    results.push({
                        phone: phone,
                        cleaned_phone: cleanedPhone,
                        verified: false,
                        exists: null,
                        reason: `Erro na API: ${checkResponse.status}`
                    });
                    continue;
                }

                const checkData = await checkResponse.json();
                
                // ✅ MUDANÇA: Extrair número limpo do chatId e detectar LID
                const chatId = checkData.chatId;
                const verifiedPhone = extractPhoneFromChatId(chatId);
                
                // Detectar se é LID (contém "lid" no chatId)
                const isLid = chatId && chatId.includes(':lid@');
                const originalNumber = cleanedPhone;
                
                console.log(`[CheckExistsContact] ✅ ${cleanedPhone}: ${checkData.numberExists ? 'EXISTE' : 'NÃO EXISTE'}`);
                if (verifiedPhone) {
                    console.log(`[CheckExistsContact]    Número verificado: ${verifiedPhone}${isLid ? ' (LID)' : ''}`);
                }
                if (isLid) {
                    console.log(`[CheckExistsContact]    🏢 Conta comercial detectada - LID: ${verifiedPhone}`);
                }

                results.push({
                    phone: phone,
                    cleaned_phone: cleanedPhone,
                    verified_phone: verifiedPhone,
                    is_lid: isLid,
                    original_number: originalNumber,
                    verified: true,
                    exists: checkData.numberExists,
                    chat_id: checkData.chatId,
                    reason: checkData.numberExists ? 'Número verificado' : 'Número não existe no WhatsApp'
                });

            } catch (error) {
                console.error(`[CheckExistsContact] ❌ Erro ao verificar ${cleanedPhone}:`, error.message);
                
                results.push({
                    phone: phone,
                    cleaned_phone: cleanedPhone,
                    verified: false,
                    exists: null,
                    reason: `Erro: ${error.message}`
                });
            }
        }

        const verifiedCount = results.filter(r => r.verified).length;
        const existsCount = results.filter(r => r.exists === true).length;

        console.log(`[CheckExistsContact] 📊 Resumo:`);
        console.log(`   - Total: ${results.length}`);
        console.log(`   - Verificados: ${verifiedCount}`);
        console.log(`   - Existem no WhatsApp: ${existsCount}`);

        return Response.json({
            success: true,
            has_active_session: true,
            session_used: sessionName,
            is_default_session: sessionToUse.is_default || false, // ✅ Informar se é sessão padrão
            results: results,
            summary: {
                total: results.length,
                verified: verifiedCount,
                exists: existsCount,
                not_exists: results.filter(r => r.exists === false).length,
                not_verified: results.filter(r => !r.verified).length
            }
        });

    } catch (error) {
        console.error('[CheckExistsContact] Erro:', error);
        return Response.json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        }, { status: 500 });
    }
});