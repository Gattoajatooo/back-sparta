import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';

// Async logging function
async function logOperation(base44, logData) {
    try {
        await base44.asServiceRole.entities.SystemLog.create(logData);
    } catch (error) {
        console.error('Error logging operation:', error);
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

async function applySystemTag(base44, contactId, errorType, companyId) {
    try {
        const systemTags = await base44.asServiceRole.entities.SystemTag.filter({
            trigger_event: errorType,
            is_active: true
        });

        if (systemTags.length === 0) {
            console.log(`Nenhum marcador do sistema encontrado para o erro: ${errorType}`);
            return false;
        }

        const systemTag = systemTags[0];
        const contact = await base44.asServiceRole.entities.Contact.get(contactId);
        
        if (!contact) {
            console.error('Contato não encontrado');
            return false;
        }

        const currentTags = contact.tags || [];
        const tagName = systemTag.name;

        if (currentTags.includes(tagName)) {
            console.log('Contato já possui este marcador');
            return false;
        }

        const updatedTags = [...currentTags, tagName];
        
        await base44.asServiceRole.entities.Contact.update(contactId, {
            tags: updatedTags
        });

        console.log(`Marcador "${tagName}" aplicado ao contato ${contactId}`);
        return true;

    } catch (error) {
        console.error('Erro ao aplicar marcador do sistema:', error);
        return false;
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

        // --- VERIFICAÇÃO DE LIMITE DE MENSAGENS MENSAIS ---
        try {
            const subscriptions = await base44.asServiceRole.entities.SubscriptionsStripe.filter({
                company_id: user.company_id,
                status: 'active'
            });

            if (subscriptions.length > 0) {
                const activeSubscription = subscriptions[0];
                const planId = activeSubscription.metadata?.plan_id;
                if (planId) {
                    const currentPlan = await base44.asServiceRole.entities.Plan.get(planId);
                    if (currentPlan) {
                        const messageLimit = currentPlan.messages_per_month;
                        if (messageLimit !== -1) {
                            let cycleStartDate, nextCycleDate;
                            
                            if (activeSubscription.current_period_start) {
                                try {
                                    const currentPeriodStart = new Date(activeSubscription.current_period_start);
                                    
                                    if (isNaN(currentPeriodStart.getTime())) {
                                        throw new Error('Data de período inválida');
                                    }
                                    
                                    cycleStartDate = new Date(currentPeriodStart);
                                    nextCycleDate = new Date(currentPeriodStart);
                                    nextCycleDate.setMonth(nextCycleDate.getMonth() + 1);
                                    
                                } catch (dateError) {
                                    console.warn('Erro ao processar data da assinatura, usando fallback:', dateError);
                                    const now = new Date();
                                    cycleStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
                                    nextCycleDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                                }
                            } else {
                                const now = new Date();
                                cycleStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
                                nextCycleDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                            }
                            
                            const cycleStartEpoch = cycleStartDate.getTime();
                            const nextCycleEpoch = nextCycleDate.getTime();

                            const currentCycleMessages = await base44.entities.Message.filter({
                                company_id: user.company_id,
                                status: 'success',
                                direction: 'sent',
                                created_at: {
                                    '$gte': cycleStartEpoch,
                                    '$lt': nextCycleEpoch
                                }
                            });

                            if (currentCycleMessages.length >= messageLimit) {
                                const renewalDate = nextCycleDate.toLocaleDateString('pt-BR');
                                return new Response(JSON.stringify({
                                    success: false,
                                    error: `Limite mensal de ${messageLimit} mensagens atingido. Limite será renovado em ${renewalDate}. Para enviar mais mensagens, faça um upgrade no seu plano.`
                                }), {
                                    status: 403,
                                    headers: { 'Content-Type': 'application/json' }
                                });
                            }
                        }
                    }
                }
            }
        } catch (limitError) {
            console.warn('Erro ao verificar limite de mensagens:', limitError);
        }
        // --- FIM DA VERIFICAÇÃO ---

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
        const sendImageUrl = `${cleanBase}/api/sendImage`;

        try {
            const cleanPhone = cleanPhoneNumber(phone);
            let checkResult;
            
            try {
                checkResult = await checkNumberExists(apiUrl, apiKey, sessionName, cleanPhone);
            } catch (checkError) {
                console.error('Erro ao verificar número:', checkError);
                
                // Aplicar marcador "Número Inválido"
                if (contactId) {
                    await applySystemTag(base44, contactId, 'invalid_number', user.company_id);
                }

                return new Response(JSON.stringify({
                    success: true,
                    warning: true,
                    message: 'Erro ao verificar número',
                    system_tag_applied: 'Número Inválido',
                    contact_id: contactId
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            await updateContactAfterCheck(base44, contactId, checkResult);

            if (!checkResult.numberExists) {
                // Aplicar marcador do sistema
                if (contactId) {
                    await applySystemTag(base44, contactId, 'number_not_exists', user.company_id);
                }

                return new Response(JSON.stringify({
                    success: true,
                    warning: true,
                    message: 'Número de telefone não existe no WhatsApp',
                    system_tag_applied: 'Número Não Existe',
                    contact_id: contactId
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

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
                reply_to: null
            };

            const response = await fetch(sendImageUrl, {
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
                            console.log(`[sendImage] 🌡️ Temperatura atualizada: ${currentTemp} -> ${newTemp}`);
                        }
                    } catch (tempError) {
                        console.warn('[sendImage] ⚠️ Erro ao atualizar temperatura:', tempError.message);
                    }
                }

                logOperation(base44, {
                    company_id: user.company_id,
                    user_id: user.id,
                    action: 'send_image_message',
                    resource_type: 'message',
                    resource_id: responseData.id || null,
                    status: 'success',
                    method: 'POST',
                    endpoint: 'sendImage',
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
                logOperation(base44, {
                    company_id: user.company_id,
                    user_id: user.id,
                    action: 'send_image_message',
                    resource_type: 'message',
                    status: 'error',
                    method: 'POST',
                    endpoint: 'sendImage',
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
            console.error('Erro ao processar envio de imagem:', formatError);

            // Aplicar marcador "Número Inválido"
            if (contactId) {
                await applySystemTag(base44, contactId, 'invalid_number', user.company_id);
            }

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
            
            logOperation(base44, {
                company_id: user?.company_id,
                user_id: user?.id,
                action: 'send_image_message',
                resource_type: 'message',
                status: 'error',
                method: 'POST',
                endpoint: 'sendImage',
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