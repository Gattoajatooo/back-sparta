import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

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

function formatChatId(phone) {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('55') && cleanPhone.length === 13) {
        return `${cleanPhone}@c.us`;
    }
    if (cleanPhone.startsWith('55') && cleanPhone.length === 12) {
        return `${cleanPhone}@c.us`;
    }
    if (!cleanPhone.startsWith('55')) {
        if (cleanPhone.length === 11) {
            return `55${cleanPhone}@c.us`;
        } else if (cleanPhone.length === 10) {
            return `55${cleanPhone}@c.us`;
        }
    }
    return `${cleanPhone}@c.us`;
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
        
        // MUDANÇA: Usar SDK normal do usuário em vez de asServiceRole
        await base44.entities.Contact.update(contactId, updateData);
    } catch (error) {
        console.error('Erro ao atualizar contato após verificação:', error);
    }
}

async function applySystemTag(base44, contactId, errorType, companyId) {
    console.log('');
    console.log('🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵');
    console.log('[applySystemTag] ========== INÍCIO ==========');
    console.log('[applySystemTag] contactId:', contactId);
    console.log('[applySystemTag] errorType:', errorType);
    console.log('[applySystemTag] companyId recebido:', companyId);
    
    // VALIDAÇÃO: Verificar se contactId é válido
    if (!contactId || contactId === '' || contactId === null || contactId === undefined) {
        console.error('[applySystemTag] ❌ ERRO: contactId inválido!');
        console.log('[applySystemTag] ========== FIM COM ERRO ==========');
        console.log('🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵');
        return { applied: false, tagName: null, tagId: null, error: 'contactId inválido' };
    }
    
    try {
        // PASSO 1: Buscar SystemTags (mantém asServiceRole pois não tem RLS)
        console.log('');
        console.log('📋 [PASSO 1] Buscando SystemTags...');
        
        const systemTags = await base44.asServiceRole.entities.SystemTag.filter({
            trigger_event: errorType,
            is_active: true
        });

        console.log('[applySystemTag] Quantidade encontrada:', systemTags ? systemTags.length : 0);
        
        if (!systemTags || systemTags.length === 0) {
            console.log('[applySystemTag] ❌ NENHUM marcador encontrado');
            return { applied: false, tagName: null, tagId: null, error: 'Marcador não encontrado no sistema' };
        }

        const systemTag = systemTags[0];
        console.log('[applySystemTag] ✅ SystemTag encontrada:', {
            id: systemTag.id,
            name: systemTag.name
        });

        // PASSO 2: Buscar contato COM SDK NORMAL DO USUÁRIO (MUDANÇA PRINCIPAL)
        console.log('');
        console.log('👤 [PASSO 2] Buscando contato com permissões do usuário...');
        
        let contact;
        try {
            // MUDANÇA: Usar SDK normal em vez de asServiceRole
            contact = await base44.entities.Contact.get(contactId);
            console.log('[applySystemTag] ✅ Contato encontrado com sucesso usando SDK normal');
        } catch (contactError) {
            console.error('[applySystemTag] ❌ Erro ao buscar contato:', contactError.message);
            
            if (contactError.status === 404 || contactError.message?.includes('not found')) {
                console.error('[applySystemTag] ⚠️ Contato não encontrado no banco de dados');
                return { 
                    applied: false, 
                    tagName: systemTag.name, 
                    tagId: systemTag.id, 
                    error: 'Contato não encontrado no banco de dados'
                };
            }
            
            throw contactError;
        }
        
        if (!contact) {
            console.error('[applySystemTag] ❌ Contato retornou null');
            return { 
                applied: false, 
                tagName: systemTag.name, 
                tagId: systemTag.id, 
                error: 'Contato não encontrado' 
            };
        }
        
        console.log('[applySystemTag] Company ID do contato encontrado:', contact.company_id);
        
        // Validação de company_id (mantida para segurança)
        if (companyId && contact.company_id !== companyId) {
            console.error('[applySystemTag] 🚨 ALERTA: Company ID do contato não corresponde!');
            console.error('[applySystemTag] Contato company_id:', contact.company_id);
            console.error('[applySystemTag] Usuário company_id:', companyId);
            return { 
                applied: false, 
                tagName: systemTag.name, 
                tagId: systemTag.id, 
                error: 'Company ID do contato não corresponde'
            };
        }

        console.log('[applySystemTag] ✅ Contato válido:', {
            id: contact.id,
            first_name: contact.first_name,
            tags_system: contact.tags_system
        });

        // PASSO 3: Verificar e adicionar tag
        console.log('');
        console.log('🏷️  [PASSO 3] Processando tags...');
        
        const currentSystemTags = contact.tags_system || [];
        const tagId = systemTag.id;
        const tagName = systemTag.name;

        console.log('[applySystemTag] Tags atuais do contato:', currentSystemTags);
        console.log('[applySystemTag] Tag a adicionar:', tagId);

        if (currentSystemTags.includes(tagId)) {
            console.log('[applySystemTag] ⚠️ Contato JÁ POSSUI este marcador');
            return { applied: false, tagName: tagName, tagId: tagId, alreadyHad: true };
        }

        const updatedSystemTags = [...currentSystemTags, tagId];
        console.log('[applySystemTag] Tags após adição:', updatedSystemTags);
        
        // PASSO 4: Atualizar contato com SDK NORMAL DO USUÁRIO (MUDANÇA)
        console.log('');
        console.log('💾 [PASSO 4] Atualizando contato com SDK normal...');
        
        try {
            // MUDANÇA: Usar SDK normal em vez de asServiceRole
            await base44.entities.Contact.update(contactId, {
                tags_system: updatedSystemTags
            });
            console.log('[applySystemTag] ✅ Atualização do contato concluída');
        } catch (updateError) {
            console.error('[applySystemTag] ❌ ERRO ao atualizar contato:', updateError);
            throw updateError;
        }

        // Verificação
        console.log('');
        console.log('🔍 [VERIFICAÇÃO] Recarregando contato para confirmar...');
        try {
            const updatedContact = await base44.entities.Contact.get(contactId);
            console.log('[VERIFICAÇÃO] Tags após update:', updatedContact.tags_system);
            console.log('[VERIFICAÇÃO] ✅ Confirmado!');
        } catch (verifyError) {
            console.error('[VERIFICAÇÃO] ❌ Erro ao verificar:', verifyError);
        }

        console.log('');
        console.log(`[applySystemTag] 🎉 SUCESSO! Marcador "${tagName}" (ID: ${tagId}) aplicado!`);
        console.log('[applySystemTag] ========== FIM ==========');
        console.log('🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵');
        
        return { applied: true, tagName: tagName, tagId: tagId };

    } catch (error) {
        console.log('');
        console.error('[applySystemTag] ❌❌❌ ERRO GERAL ❌❌❌');
        console.error('[applySystemTag] Tipo:', error.constructor.name);
        console.error('[applySystemTag] Mensagem:', error.message);
        console.error('[applySystemTag] Stack:', error.stack);
        console.log('[applySystemTag] ========== FIM COM ERRO ==========');
        console.log('🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵');
        return { applied: false, tagName: null, tagId: null, error: error.message };
    }
}

Deno.serve(async (req) => {
    const startTime = Date.now();
    
    console.log('');
    console.log('🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀');
    console.log('[sendText] ========== NOVA REQUISIÇÃO ==========');
    console.log('[sendText] Timestamp:', new Date().toISOString());
    
    try {
        const base44 = createClientFromRequest(req);

        if (!(await base44.auth.isAuthenticated())) {
            console.log('[sendText] ❌ Não autenticado');
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const user = await base44.auth.me();
        
        if (!user) {
            console.log('[sendText] ❌ Usuário inválido ou não encontrado');
            return new Response(JSON.stringify({ error: 'Invalid user' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log('[sendText] ✅ Usuário autenticado:', user.email, `(ID: ${user.id}, Company ID: ${user.company_id})`);

        let requestData;
        try {
            requestData = await req.json();
        } catch (jsonError) {
            console.error('[sendText] ❌ Erro ao parsear JSON da requisição:', jsonError.message);
            return new Response(JSON.stringify({ success: false, error: 'Invalid JSON body' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        console.log('[sendText] 📥 Dados recebidos:', {
            phone: requestData.phone,
            hasText: !!requestData.text,
            textLength: requestData.text?.length,
            sessionName: requestData.sessionName,
            contactId: requestData.contactId,
            hasSessionProfile: !!requestData.sessionProfile,
            linkPreview: requestData.linkPreview
        });

        const { phone, text, sessionName, linkPreview = true, contactId, sessionProfile } = requestData;

        // Validações
        if (!phone) {
            console.log('[sendText] ❌ Validação falhou: Phone não fornecido');
            return new Response(JSON.stringify({ success: false, error: 'Phone is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (!text) {
            console.log('[sendText] ❌ Validação falhou: Text não fornecido');
            return new Response(JSON.stringify({ success: false, error: 'Text is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (!sessionName) {
            console.log('[sendText] ❌ Validação falhou: SessionName não fornecido');
            return new Response(JSON.stringify({ success: false, error: 'Session name is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const cleanedPhone = cleanPhoneNumber(phone);
        const apiKey = Deno.env.get('WAHA_API_KEY');
        const apiUrl = Deno.env.get('WAHA_API_URL');

        if (!apiKey || !apiUrl) {
            console.log('[sendText] ❌ Credenciais WAHA não configuradas');
            await logOperation(base44, {
                company_id: user.company_id,
                user_id: user.id,
                action: 'send_text',
                resource_type: 'whatsapp_message',
                resource_id: null,
                status: 'error',
                method: 'POST',
                endpoint: 'sendText',
                request_data: { phone: cleanedPhone, hasText: !!text },
                error_message: 'WAHA credentials not configured',
                duration_ms: Date.now() - startTime
            });

            return new Response(JSON.stringify({
                success: false,
                error: 'WhatsApp integration not configured'
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Verificar se o número existe no WhatsApp
        console.log('');
        console.log('🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢');
        console.log('[sendText] ========== VERIFICAÇÃO DE NÚMERO ==========');
        console.log('[sendText] Telefone limpo:', cleanedPhone);
        console.log('[sendText] Contact ID recebido:', contactId);
        console.log('[sendText] User Company ID:', user.company_id);
        
        let checkResult;
        try {
            checkResult = await checkNumberExists(apiUrl, apiKey, sessionName, cleanedPhone);
            console.log('[sendText] ✅ Verificação de existência do número concluída');
            console.log('[sendText] Resultado:', {
                numberExists: checkResult.numberExists,
                chatId: checkResult.chatId,
                status: checkResult.status
            });
        } catch (checkError) {
            console.error('[sendText] ❌ Erro ao verificar número no WhatsApp:', checkError.message);
            
            await logOperation(base44, {
                company_id: user.company_id,
                user_id: user.id,
                action: 'check_number_exists',
                resource_type: 'whatsapp_check',
                resource_id: contactId,
                status: 'error',
                method: 'GET',
                endpoint: 'contacts/check-exists',
                request_data: { phone: cleanedPhone },
                error_message: checkError.message,
                duration_ms: Date.now() - startTime
            });

            return new Response(JSON.stringify({
                success: false,
                error: 'Erro ao verificar número no WhatsApp',
                details: checkError.message
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        console.log('[sendText] ========== FIM VERIFICAÇÃO DE NÚMERO ==========');
        console.log('🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢');

        // Se o número não existe, aplicar marcador e retornar warning
        if (!checkResult.numberExists) {
            console.log('');
            console.log('[sendText] ⚠️⚠️⚠️ NÚMERO NÃO EXISTE NO WHATSAPP ⚠️⚠️⚠️');
            console.log('[sendText] Iniciando processo de tratamento para número não existente...');
            
            // Atualizar contato com informação de número não existente
            if (contactId) {
                console.log('[sendText] Atualizando informações do contato após verificação...');
                await updateContactAfterCheck(base44, contactId, checkResult);
                console.log('[sendText] ✅ Contato atualizado com status de número não existente');
            } else {
                console.log('[sendText] ⚠️ ContactId não fornecido, pulando atualização de contato.');
            }

            // Aplicar marcador do sistema
            console.log('');
            console.log('[sendText] 🏷️  Aplicando marcador do sistema para "number_not_exists"...');
            console.log('[sendText] Chamando applySystemTag com:');
            console.log('[sendText]   - contactId:', contactId);
            console.log('[sendText]   - errorType: number_not_exists');
            console.log('[sendText]   - user.company_id:', user.company_id);

            const tagResult = await applySystemTag(base44, contactId, 'number_not_exists', user.company_id);
            
            console.log('');
            console.log('[sendText] 📊 Resultado da aplicação do marcador:');
            console.log(JSON.stringify(tagResult, null, 2));

            await logOperation(base44, {
                company_id: user.company_id,
                user_id: user.id,
                action: 'send_text_number_not_exists',
                resource_type: 'whatsapp_message',
                resource_id: contactId,
                status: 'warning',
                method: 'POST',
                endpoint: 'sendText',
                request_data: { phone: cleanedPhone, hasText: !!text },
                response_data: { 
                    numberExists: false,
                    system_tag_applied: tagResult.tagName,
                    system_tag_id: tagResult.tagId,
                    tag_applied: tagResult.applied,
                    tag_error: tagResult.error
                },
                duration_ms: Date.now() - startTime,
                metadata: {
                    number_exists: false,
                    system_tag: tagResult.tagName,
                    system_tag_id: tagResult.tagId,
                    tag_applied: tagResult.applied,
                    tag_error: tagResult.error
                }
            });

            console.log('');
            console.log('[sendText] 📤 Preparando resposta para número não existente...');
            const response = {
                success: false,
                warning: true,
                error: 'Número de telefone não existe no WhatsApp',
                message: 'Este número não existe ou não está registrado no WhatsApp',
                system_tag_applied: tagResult.tagName,
                system_tag_id: tagResult.tagId,
                tag_was_applied: tagResult.applied,
                tag_error_details: tagResult.error,
                numberExists: false
            };
            console.log('[sendText] Resposta:', JSON.stringify(response, null, 2));
            console.log('[sendText] ========== FIM DA REQUISIÇÃO (NÚMERO NÃO EXISTE) ==========');
            console.log('🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀');
            console.log('');

            return new Response(JSON.stringify(response), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Se chegou aqui, o número existe, prosseguir com o envio
        console.log('[sendText] ✅ Número existe no WhatsApp. Prosseguindo com o envio da mensagem...');
        
        const chatId = formatChatId(cleanedPhone);
        const cleanBase = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
        const sendUrl = `${cleanBase}/api/sendText`;

        console.log('[sendText] Enviando mensagem para WAHA API...');
        const wahaResponse = await fetch(sendUrl, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json',
                'X-Api-Key': apiKey
            },
            body: JSON.stringify({
                session: sessionName,
                chatId: chatId,
                text: text,
                linkPreview: linkPreview
            })
        });

        const wahaData = await wahaResponse.json();
        console.log('[sendText] Resposta WAHA recebida:', wahaData);

        if (!wahaResponse.ok) {
            console.error('[sendText] ❌ Erro no envio da mensagem via WAHA:', wahaResponse.status, wahaResponse.statusText, wahaData);
            
            await logOperation(base44, {
                company_id: user.company_id,
                user_id: user.id,
                action: 'send_text',
                resource_type: 'whatsapp_message',
                resource_id: contactId,
                status: 'error',
                method: 'POST',
                endpoint: 'sendText',
                request_data: { phone: cleanedPhone, chatId, hasText: !!text },
                error_message: wahaData.message || 'Failed to send message via WAHA',
                response_data: wahaData,
                duration_ms: Date.now() - startTime
            });

            return new Response(JSON.stringify({
                success: false,
                error: wahaData.message || 'Failed to send message via WAHA',
                waha_status: wahaResponse.status,
                waha_details: wahaData
            }), {
                status: wahaResponse.status >= 400 && wahaResponse.status < 500 ? 400 : 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log('[sendText] ✅ Mensagem enviada com sucesso via WAHA.');

        // Atualizar contato se fornecido (agora que sabemos que o número existe e a mensagem foi enviada)
        if (contactId) {
            console.log('[sendText] Atualizando contato com sucesso de envio...');
            await updateContactAfterCheck(base44, contactId, checkResult);
            console.log('[sendText] ✅ Contato atualizado com status de número existente');
            
            // Atualizar temperatura: fria -> morna, morna -> quente
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
                    console.log(`[sendText] 🌡️ Temperatura atualizada: ${currentTemp} -> ${newTemp}`);
                }
            } catch (tempError) {
                console.warn('[sendText] ⚠️ Erro ao atualizar temperatura:', tempError.message);
            }
        } else {
            console.log('[sendText] ⚠️ ContactId não fornecido, pulando atualização de contato.');
        }

        await logOperation(base44, {
            company_id: user.company_id,
            user_id: user.id,
            action: 'send_text',
            resource_type: 'whatsapp_message',
            resource_id: contactId,
            status: 'success',
            method: 'POST',
            endpoint: 'sendText',
            request_data: { phone: cleanedPhone, chatId, hasText: !!text },
            response_data: { message_id: wahaData.id },
            duration_ms: Date.now() - startTime
        });

        console.log('[sendText] 📤 Retornando resposta de sucesso.');
        const successResponse = {
            success: true,
            message: 'Message sent successfully',
            data: wahaData
        };
        console.log('[sendText] Resposta:', JSON.stringify(successResponse, null, 2));
        console.log('[sendText] ========== FIM DA REQUISIÇÃO (SUCESSO) ==========');
        console.log('🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀');
        console.log('');

        return new Response(JSON.stringify(successResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.log('');
        console.error('[sendText] ❌❌❌ ERRO GERAL NA FUNÇÃO ❌❌❌');
        console.error('[sendText] Tipo:', error.constructor.name);
        console.error('[sendText] Mensagem:', error.message);
        console.error('[sendText] Stack:', error.stack);
        console.log('[sendText] ========== FIM COM ERRO GERAL ==========');
        console.log('🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀');

        try {
            const base44 = createClientFromRequest(req);
            const user = await base44.auth.me();
            if (user) {
                await logOperation(base44, {
                    company_id: user.company_id,
                    user_id: user.id,
                    action: 'send_text_general_error',
                    resource_type: 'whatsapp_message',
                    resource_id: null,
                    status: 'error',
                    method: 'POST',
                    endpoint: 'sendText',
                    request_data: { error_context: 'general_catch' },
                    error_message: error.message,
                    duration_ms: Date.now() - startTime
                });
            }
        } catch (logError) {
            console.error('[sendText] ❌ Erro ao tentar logar erro geral:', logError);
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