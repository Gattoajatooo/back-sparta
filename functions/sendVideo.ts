import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';

// Async logging function
async function logOperation(base44, logData) {
    try {
        await base44.asServiceRole.entities.SystemLog.create(logData);
    } catch (error) {
        console.error('Error logging operation:', error);
        // Don't throw error to avoid breaking the main operation
    }
}

function cleanPhoneNumber(phone) {
    if (!phone || typeof phone !== 'string') {
        throw new Error('Número de telefone inválido');
    }
    return phone.replace(/\D/g, '');
}

async function checkNumberExists(apiUrl, apiKey, sessionName, phone) {
    const cleanBase = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
    const checkUrl = `${cleanBase}/api/contacts/check-exists?session=${sessionName}&phone=${phone}`;
    
    const response = await fetch(checkUrl, {
        method: 'GET',
        headers: {
            'accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Api-Key': apiKey
        }
    });
    
    if (!response.ok) {
        throw new Error(`Check exists failed: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
}

async function updateContactAfterCheck(base44, contactId, checkResult) {
    if (!contactId) return;
    
    try {
        const updateData = {
            checked: true
        };
        
        if (checkResult.numberExists) {
            // Remove @c.us do chatId para atualizar o phone
            const cleanPhone = checkResult.chatId.replace('@c.us', '');
            updateData.phone = cleanPhone;
            updateData.numberExists = true;
        } else {
            updateData.phone = null;
            updateData.numberExists = false;
        }
        
        await base44.asServiceRole.entities.Contact.update(contactId, updateData);
    } catch (error) {
        console.error('Erro ao atualizar contato após verificação:', error);
    }
}

Deno.serve(async (req) => {
    const startTime = Date.now();
    
    try {
        const base44 = createClientFromRequest(req);

        if (!(await base44.auth.isAuthenticated())) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const user = await base44.auth.me();
        
        if (!user) {
            return new Response(JSON.stringify({ error: 'Invalid user' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const { phone, file, caption, sessionName, contactId, sessionProfile } = await req.json();

        const apiKey = Deno.env.get('WAHA_API_KEY');
        const apiUrl = Deno.env.get('WAHA_API_URL');
        
        if (!apiKey || !apiUrl) {
            return new Response(JSON.stringify({ 
                error: 'Configuração da API WAHA não encontrada' 
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const cleanBase = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
        const sendVideoUrl = `${cleanBase}/api/sendVideo`;

        try {
            // 1. Verificar se o número existe no WhatsApp
            const cleanPhone = cleanPhoneNumber(phone);
            let checkResult;
            
            try {
                checkResult = await checkNumberExists(apiUrl, apiKey, sessionName, cleanPhone);
            } catch (checkError) {
                console.error('Erro ao verificar número:', checkError);
                return new Response(JSON.stringify({
                    success: false,
                    error: `Erro ao verificar número: ${checkError.message}`
                }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // 2. Atualizar o contato com resultado da verificação
            await updateContactAfterCheck(base44, contactId, checkResult);

            // 3. Se o número não existe, retornar erro
            if (!checkResult.numberExists) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Número de telefone não existe no WhatsApp'
                }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // 4. Usar o chatId retornado pela verificação
            const chatId = checkResult.chatId;

            const messageData = {
                chatId,
                file: {
                    mimetype: file.mimetype,
                    filename: file.filename,
                    url: file.url
                },
                caption: caption || '',
                session: sessionName,
                reply_to: null,
                asNote: false,
                convert: true
            };

            const response = await fetch(sendVideoUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Api-Key': apiKey
                },
                body: JSON.stringify(messageData)
            });

            const responseData = await response.json();
            const duration = Date.now() - startTime;

            if (response.ok) {
                // Atualizar temperatura: fria -> morna, morna -> quente
                if (contactId) {
                    try {
                        const contact = await base44.entities.Contact.get(contactId);
                        const currentTemp = contact.temperature || 'fria';
                        let newTemp = currentTemp;
                        
                        if (currentTemp === 'fria') {
                            newTemp = 'morna';
                        } else if (currentTemp === 'morna') {
                            newTemp = 'quente';
                        }
                        
                        if (newTemp !== currentTemp) {
                            await base44.entities.Contact.update(contactId, { temperature: newTemp });
                            console.log(`[sendVideo] 🌡️ Temperatura atualizada: ${currentTemp} -> ${newTemp}`);
                        }
                    } catch (tempError) {
                        console.warn('[sendVideo] ⚠️ Erro ao atualizar temperatura:', tempError.message);
                    }
                }

                // Log success operation
                logOperation(base44, {
                    company_id: user.company_id,
                    user_id: user.id,
                    action: 'send_video_message',
                    resource_type: 'message',
                    resource_id: responseData.id || null,
                    status: 'success',
                    method: 'POST',
                    endpoint: 'sendVideo',
                    request_data: {
                        phone: phone.substring(0, 4) + '****',
                        sessionName,
                        hasCaption: !!caption,
                        fileName: file.filename,
                        contactId,
                        numberVerified: true
                    },
                    response_data: {
                        messageId: responseData.id,
                        chatId
                    },
                    ip_address: req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || 'unknown',
                    user_agent: req.headers.get('user-agent') || 'unknown',
                    duration_ms: duration
                });

                return new Response(JSON.stringify({
                    success: true,
                    messageId: responseData.id,
                    chatId,
                    data: responseData
                }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            } else {
                // Log error operation
                logOperation(base44, {
                    company_id: user.company_id,
                    user_id: user.id,
                    action: 'send_video_message',
                    resource_type: 'message',
                    status: 'error',
                    method: 'POST',
                    endpoint: 'sendVideo',
                    request_data: {
                        phone: phone.substring(0, 4) + '****',
                        sessionName,
                        hasCaption: !!caption,
                        fileName: file.filename,
                        contactId,
                        numberVerified: true
                    },
                    error_message: responseData.error || response.statusText,
                    ip_address: req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || 'unknown',
                    user_agent: req.headers.get('user-agent') || 'unknown',
                    duration_ms: duration
                });

                return new Response(JSON.stringify({
                    success: false,
                    error: responseData.error || response.statusText,
                    status: response.status
                }), {
                    status: response.status,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

        } catch (formatError) {
            const duration = Date.now() - startTime;
            console.error('Erro ao processar envio de vídeo:', formatError);

            return new Response(JSON.stringify({
                success: false,
                error: `Erro ao processar envio: ${formatError.message}`
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

    } catch (error) {
        const duration = Date.now() - startTime;
        
        try {
            const base44 = createClientFromRequest(req);
            const user = await base44.auth.me();
            
            // Log system error
            logOperation(base44, {
                company_id: user?.company_id,
                user_id: user?.id,
                action: 'send_video_message',
                resource_type: 'message',
                status: 'error',
                method: 'POST',
                endpoint: 'sendVideo',
                error_message: 'Internal server error',
                error_stack: error.stack,
                ip_address: req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || 'unknown',
                user_agent: req.headers.get('user-agent') || 'unknown',
                duration_ms: duration
            });
        } catch (logError) {
            console.error('Error logging system error:', logError);
        }

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