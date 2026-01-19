import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// ✅ NOVO: Função para limpar número de telefone
function cleanPhoneNumber(phone) {
    if (!phone || typeof phone !== 'string') return null;
    return phone.replace(/\D/g, '');
}

// ✅ NOVO: Função para verificar número no WhatsApp (chamada única)
async function checkSingleNumber(phone, sessionName, apiKey, apiUrl) {
    try {
        const cleanedPhone = cleanPhoneNumber(phone);
        if (!cleanedPhone) return { verified: false, exists: false, reason: 'Número inválido' };

        const cleanBase = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
        const checkUrl = `${cleanBase}/api/contacts/check-exists?session=${sessionName}&phone=${cleanedPhone}`;

        const response = await fetch(checkUrl, {
            method: 'GET',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json',
                'X-Api-Key': apiKey
            }
        });

        if (!response.ok) {
            return { verified: false, exists: null, reason: `API Error: ${response.status}` };
        }

        const data = await response.json();
        return {
            verified: true,
            exists: data.numberExists,
            chat_id: data.chatId,
            phoneChecked: cleanedPhone,
            reason: data.numberExists ? 'Verificado' : 'Número não existe no WhatsApp'
        };

    } catch (error) {
        console.error(`❌ Erro ao verificar ${phone}:`, error.message);
        return { verified: false, exists: null, reason: error.message };
    }
}

// ✅ NOVO: Gerar variações do número (com/sem 9)
function generatePhoneVariations(phone) {
    const cleaned = cleanPhoneNumber(phone);
    if (!cleaned) return [];
    
    const variations = [cleaned];
    
    // Formato esperado: DDI + DDD + NÚMERO
    // Brasil: 55 + 2 dígitos DDD + 8 ou 9 dígitos
    
    // Se tem 13 dígitos (55 + 2 DDD + 9 + 8 número) - tentar sem o 9
    if (cleaned.length === 13 && cleaned.startsWith('55')) {
        const ddd = cleaned.substring(2, 4);
        const ninthDigit = cleaned.substring(4, 5);
        const restOfNumber = cleaned.substring(5);
        
        // Se o 5º dígito é 9, gerar versão sem ele
        if (ninthDigit === '9' && restOfNumber.length === 8) {
            const withoutNine = `55${ddd}${restOfNumber}`;
            variations.push(withoutNine);
            // console.log(`📱 Variação sem 9: ${cleaned} -> ${withoutNine}`);
        }
    }
    
    // Se tem 12 dígitos (55 + 2 DDD + 8 número) - tentar com o 9
    if (cleaned.length === 12 && cleaned.startsWith('55')) {
        const ddd = cleaned.substring(2, 4);
        const number = cleaned.substring(4);
        
        if (number.length === 8) {
            const withNine = `55${ddd}9${number}`;
            variations.push(withNine);
            // console.log(`📱 Variação com 9: ${cleaned} -> ${withNine}`);
        }
    }
    
    // Se não tem DDI (10 ou 11 dígitos) - adicionar 55 e variações
    if (cleaned.length === 11 && !cleaned.startsWith('55')) {
        // 11 dígitos sem DDI = DDD + 9 + número
        const withDDI = `55${cleaned}`;
        variations.push(withDDI);
        
        // Também tentar sem o 9
        const ddd = cleaned.substring(0, 2);
        const ninthDigit = cleaned.substring(2, 3);
        const restOfNumber = cleaned.substring(3);
        
        if (ninthDigit === '9' && restOfNumber.length === 8) {
            const withDDIWithoutNine = `55${ddd}${restOfNumber}`;
            variations.push(withDDIWithoutNine);
        }
    }
    
    if (cleaned.length === 10 && !cleaned.startsWith('55')) {
        // 10 dígitos sem DDI = DDD + número (sem 9)
        const withDDI = `55${cleaned}`;
        variations.push(withDDI);
        
        // Também tentar com o 9
        const ddd = cleaned.substring(0, 2);
        const number = cleaned.substring(2);
        
        if (number.length === 8) {
            const withDDIWithNine = `55${ddd}9${number}`;
            variations.push(withDDIWithNine);
        }
    }
    
    // Remover duplicatas
    return [...new Set(variations)];
}

// ✅ NOVO: Verificar número com dupla tentativa (com/sem 9)
async function checkNumberExists(phone, sessionName, apiKey, apiUrl) {
    const variations = generatePhoneVariations(phone);
    
    if (variations.length === 0) {
        return { verified: false, exists: false, reason: 'Número inválido' };
    }
    
    // console.log(`🔍 Verificando número ${phone} com ${variations.length} variação(ões): ${variations.join(', ')}`);
    
    // Tentar cada variação até encontrar uma válida
    for (const variation of variations) {
        const result = await checkSingleNumber(variation, sessionName, apiKey, apiUrl);
        
        if (result.exists) {
            // console.log(`✅ Número encontrado na variação: ${variation}`);
            return result;
        }
    }
    
    // Nenhuma variação encontrada
    // console.log(`❌ Nenhuma variação de ${phone} encontrada no WhatsApp`);
    return {
        verified: true,
        exists: false,
        phoneChecked: variations[0],
        reason: 'Número não existe no WhatsApp (tentou com/sem 9)'
    };
}

// ✅ NOVO: Função para buscar foto do WhatsApp
async function getWhatsAppPhoto(chatId, sessionName, apiKey, apiUrl) {
    try {
        const cleanBase = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
        const photoUrl = `${cleanBase}/api/contacts/profile-picture?contactId=${encodeURIComponent(chatId)}&session=${sessionName}`;

        const response = await fetch(photoUrl, {
            method: 'GET',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json',
                'X-Api-Key': apiKey
            }
        });

        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        return data.profilePictureURL || null;

    } catch (error) {
        console.error(`❌ Erro ao buscar foto ${chatId}:`, error.message);
        return null;
    }
}

// ✅ NOVO: Função para enviar progresso via WebSocket (INLINED para evitar overhead/erros de invoke)
async function sendProgress(base44, companyId, progressData) {
    try {
        const wsUrl = Deno.env.get('WEBSOCKET_ENDPOINT_URL');
        const wsToken = Deno.env.get('WEBSOCKET_AUTH_TOKEN');

        if (!wsUrl || !wsToken) {
            console.warn('⚠️ [WS] Credenciais não configuradas, pulando envio.');
            return;
        }

        const payload = {
            type: 'import_progress',
            company_id: companyId,
            data: progressData,
            timestamp: new Date().toISOString()
        };

        // Envio direto via fetch para evitar erro 500 do invoke e reduzir latência
        const response = await fetch(`${wsUrl}/realtime/${companyId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${wsToken}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            // Tentar ler erro sem quebrar
            try {
                const errText = await response.text();
                console.error(`❌ [WS] Erro HTTP ${response.status}: ${errText}`);
            } catch (e) {
                console.error(`❌ [WS] Erro HTTP ${response.status}`);
            }
        }
        // Sucesso silencioso para não poluir logs
    } catch (error) {
        console.error('❌ [WS] Falha de rede ao enviar progresso:', error.message);
    }
}

// Funções auxiliares (mantidas como estão)
function convertGender(genderStr) {
    if (!genderStr || typeof genderStr !== 'string') return 'not_informed';
    const gender = genderStr.toLowerCase().trim();
    if (['masculino', 'male', 'm', 'homem'].includes(gender)) return 'male';
    if (['feminino', 'female', 'f', 'mulher'].includes(gender)) return 'female';
    if (['outro', 'other', 'o'].includes(gender)) return 'other';
    return 'not_informed';
}

function convertBrazilianDate(dateStr) {
    if (!dateStr) return null;
    if (typeof dateStr === 'string') {
        const datePattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
        const match = dateStr.match(datePattern);
        if (match) {
            const [, day, month, year] = match;
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
    }
    return null;
}

function convertValue(valueStr) {
    if (!valueStr) return null;
    if (typeof valueStr === 'number') return valueStr;
    if (typeof valueStr === 'string') {
        const cleanValue = valueStr.replace(/[^\d,.-]/g, '').replace(',', '.');
        const numValue = parseFloat(cleanValue);
        return isNaN(numValue) ? null : numValue;
    }
    return null;
}

Deno.serve(async (req) => {
    const startTime = Date.now();
    
    try {
        const base44 = createClientFromRequest(req);
        
        if (!(await base44.auth.isAuthenticated())) {
            return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
                status: 401, headers: { 'Content-Type': 'application/json' }
            });
        }

        const user = await base44.auth.me();
        if (!user?.company_id) {
            return new Response(JSON.stringify({ success: false, error: 'No company found' }), {
                status: 400, headers: { 'Content-Type': 'application/json' }
            });
        }

        const { 
            contactsData, 
            importName = 'Importação Manual',
            globalTags = [],
            individualAssignments = {},
            importId // ✅ ID passado pelo frontend
        } = await req.json();

        if (!contactsData || !Array.isArray(contactsData) || contactsData.length === 0) {
            return new Response(JSON.stringify({ success: false, error: 'Dados de contatos não fornecidos ou inválidos' }), {
                status: 400, headers: { 'Content-Type': 'application/json' }
            });
        }

        console.log(`Iniciando processamento de ${contactsData.length} contatos para empresa ${user.company_id}`);

        // ✅ ENVIAR EVENTO DE INÍCIO
        console.log(`📤 [WS] Enviando progresso inicial: ${contactsData.length} contatos`);
        await sendProgress(base44, user.company_id, {
            import_id: importId,
            total: contactsData.length,
            processed: 0,
            successful: 0,
            failed: 0,
            status: 'processing'
        });

        // 1. Buscar sessão padrão para validação de números
        let sessionForValidation = null;
        const wahaApiKey = Deno.env.get('WAHA_API_KEY');
        const wahaApiUrl = Deno.env.get('WAHA_API_URL');

        if (wahaApiKey && wahaApiUrl) {
            const defaultSessions = await base44.asServiceRole.entities.Session.filter({
                company_id: user.company_id,
                is_default: true,
                status: 'WORKING',
                is_deleted: { '$ne': true }
            });

            if (defaultSessions && defaultSessions.length > 0) {
                sessionForValidation = defaultSessions[0];
                console.log(`✅ Sessão padrão encontrada para validação: ${sessionForValidation.session_name}`);
            } else {
                const activeSessions = await base44.asServiceRole.entities.Session.filter({
                    company_id: user.company_id,
                    status: 'WORKING',
                    is_deleted: { '$ne': true }
                });

                if (activeSessions && activeSessions.length > 0) {
                    sessionForValidation = activeSessions[0];
                    console.log(`⚠️ Usando sessão ativa: ${sessionForValidation.session_name}`);
                }
            }
        }

        // 2. Buscar SystemTags para números inválidos
        let invalidNumberTag = null;
        let numberNotExistsTag = null;
        try {
            const systemTags = await base44.asServiceRole.entities.SystemTag.filter({
                slug: { '$in': ['invalid_number', 'number_not_exists'] }
            });
            
            if (systemTags && systemTags.length > 0) {
                invalidNumberTag = systemTags.find(t => t.slug === 'invalid_number');
                numberNotExistsTag = systemTags.find(t => t.slug === 'number_not_exists');
                
                if (invalidNumberTag) console.log(`✅ SystemTag 'invalid_number' encontrada: ${invalidNumberTag.id}`);
                if (numberNotExistsTag) console.log(`✅ SystemTag 'number_not_exists' encontrada: ${numberNotExistsTag.id}`);
            }
        } catch (error) {
            console.warn('⚠️ SystemTags não encontradas:', error);
        }

        // 3. Carregar tags existentes
        const allTagsInDB = await base44.entities.Tag.filter({ company_id: user.company_id });
        const existingTagNames = new Set(allTagsInDB.map(tag => tag.name));
        const tagNameToIdMap = new Map(allTagsInDB.map(tag => [tag.name.toLowerCase().trim(), tag.id]));
        
        console.log(`✅ ${allTagsInDB.length} tags existentes carregadas`);

        // 2. Coletar todas as tags necessárias
        const allTagNamesNeeded = new Set();
        
        // Tags globais
        if (Array.isArray(globalTags)) {
            globalTags.forEach(tag => {
                if (tag) {
                    const tagName = typeof tag === 'object' ? tag.name : tag;
                    if (tagName) allTagNamesNeeded.add(tagName);
                }
            });
        }
        
        // Tags individuais
        contactsData.forEach((contato, i) => {
            const contactId = contato._tempId || `contact_${i}`;
            if (individualAssignments[contactId]?.tags && Array.isArray(individualAssignments[contactId].tags)) {
                individualAssignments[contactId].tags.forEach(tag => {
                    if (tag) allTagNamesNeeded.add(tag);
                });
            }
            
            // Tags no próprio contato
            if (contato.tags) {
                if (typeof contato.tags === 'string') {
                    contato.tags.split(/[,;]/).forEach(t => {
                        const tagName = t.trim();
                        if (tagName) allTagNamesNeeded.add(tagName);
                    });
                } else if (Array.isArray(contato.tags)) {
                    contato.tags.forEach(t => {
                        if (t) allTagNamesNeeded.add(t);
                    });
                }
            }
        });

        // 3. Criar tags que não existem
        const newTagsToCreate = Array.from(allTagNamesNeeded).filter(name => !existingTagNames.has(name));
        
        if (newTagsToCreate.length > 0) {
            console.log(`🏷️ Criando ${newTagsToCreate.length} novas tags...`);
            const newTagObjects = newTagsToCreate.map(name => ({ 
                company_id: user.company_id, 
                name, 
                type: 'manual', 
                is_smart: false 
            }));
            
            const createdTags = await base44.entities.Tag.bulkCreate(newTagObjects);
            
            // Atualizar mapa com as novas tags criadas
            createdTags.forEach(tag => {
                tagNameToIdMap.set(tag.name.toLowerCase().trim(), tag.id);
            });
            
            console.log(`✅ ${createdTags.length} novas tags criadas`);
        }

        // 4. Preparar contatos (SEM validação ainda)
        console.log('📋 Preparando contatos...');
        const preparedContacts = [];

        for (let i = 0; i < contactsData.length; i++) {
            const contato = contactsData[i];
            
            let dadosContato = {
                company_id: user.company_id, 
                first_name: contato.first_name || `Contato ${i + 1}`,
                last_name: contato.last_name || '', 
                document_number: contato.document_number || '',
                gender: convertGender(contato.gender), 
                birth_date: convertBrazilianDate(contato.birth_date),
                responsible_name: contato.responsible_name || '', 
                company_name: contato.company_name || '',
                position: contato.position || '', 
                custom_position: contato.custom_position || null,
                status: contato.status || 'lead', 
                source: contato.source || 'importacao',
                notes: [], // ✅ Sempre array vazio - campo notes é lista de objetos, não string
                value: convertValue(contato.value),
                import_name: importName, 
                import_type: 'manual',
                emails: [], 
                phones: []
            };
            
            if (contato.email) { 
                dadosContato.email = contato.email; 
                dadosContato.emails.push({ email: contato.email, type: 'primary' }); 
            }
            if (contato.phone) { 
                dadosContato.phone = contato.phone; 
                dadosContato.phones.push({ phone: contato.phone, type: 'primary' }); 
            }
            if (dadosContato.document_number) { 
                const cleanDoc = dadosContato.document_number.replace(/\D/g, ''); 
                dadosContato.document_type = cleanDoc.length === 11 ? 'cpf' : 'cnpj'; 
            }

            // Converter nomes de tags para IDs
            const tagNamesForContact = new Set();
            
            if (Array.isArray(globalTags)) { 
                globalTags.forEach(tag => { 
                    if (tag) {
                        const tagName = typeof tag === 'object' ? tag.name : tag;
                        if (tagName) tagNamesForContact.add(tagName);
                    }
                }); 
            }
            
            const contactId = contato._tempId || `contact_${i}`;
            if (individualAssignments[contactId]?.tags && Array.isArray(individualAssignments[contactId].tags)) { 
                individualAssignments[contactId].tags.forEach(tag => { 
                    if (tag) tagNamesForContact.add(tag); 
                }); 
            }
            
            if (contato.tags) { 
                if (typeof contato.tags === 'string') { 
                    contato.tags.split(/[,;]/).forEach(t => {
                        const tagName = t.trim();
                        if (tagName) tagNamesForContact.add(tagName);
                    }); 
                } else if (Array.isArray(contato.tags)) { 
                    contato.tags.forEach(t => {
                        if (t) tagNamesForContact.add(t);
                    }); 
                } 
            }
            
            const tagIds = [];
            tagNamesForContact.forEach(tagName => {
                const tagId = tagNameToIdMap.get(tagName.toLowerCase().trim());
                if (tagId) {
                    tagIds.push(tagId);
                } else {
                    console.warn(`⚠️ Tag "${tagName}" não encontrada no mapa de IDs`);
                }
            });
            
            dadosContato.tags = tagIds;
            preparedContacts.push(dadosContato);
        }

        console.log(`✅ ${preparedContacts.length} contatos preparados`);

        // 5. Buscar contatos existentes para verificação posterior (APÓS validação WhatsApp)
        console.log('🔍 Carregando contatos existentes do sistema...');
        
        const existingContacts = await base44.asServiceRole.entities.Contact.filter({
            company_id: user.company_id,
            deleted: { '$ne': true }
        });
        
        // Criar mapa de telefone -> contato existente (incluindo variações com/sem 9)
        const existingPhoneToContact = new Map();
        
        // ✅ OTIMIZAÇÃO: Desativar logs detalhados durante o mapeamento massivo
        const originalConsoleLog = console.log;
        console.log = () => {}; // Silenciar logs temporariamente

        existingContacts.forEach(contact => {
            if (contact.phone) {
                const variations = generatePhoneVariations(contact.phone);
                variations.forEach(v => {
                    if (!existingPhoneToContact.has(v)) {
                        existingPhoneToContact.set(v, contact);
                    }
                });
            }
            if (contact.phones && Array.isArray(contact.phones)) {
                contact.phones.forEach(p => {
                    if (p.phone) {
                        const variations = generatePhoneVariations(p.phone);
                        variations.forEach(v => {
                            if (!existingPhoneToContact.has(v)) {
                                existingPhoneToContact.set(v, contact);
                            }
                        });
                    }
                });
            }
        });
        
        console.log = originalConsoleLog; // Restaurar logs
        console.log(`📊 ${existingContacts.length} contatos existentes mapeados para verificação de duplicidade.`);
        
        console.log(`📊 ${existingContacts.length} contatos existentes, ${existingPhoneToContact.size} variações de números mapeadas`);

        // 6. PROCESSAR EM LOTES com validação + inserção
        console.log('🔍 Iniciando processamento em lotes...');
        const BATCH_SIZE = 5; // Processar 5 contatos por vez
        let totalProcessed = 0;
        let novosInseridos = 0;
        let updatedCount = 0;
        let duplicatesWithoutChanges = 0;
        let noWhatsAppCount = 0;
        let falhasInsercao = 0;
        const erros = [];

        for (let batchIndex = 0; batchIndex < preparedContacts.length; batchIndex += BATCH_SIZE) {
            const batch = preparedContacts.slice(batchIndex, batchIndex + BATCH_SIZE);
            console.log(`\n📦 LOTE ${Math.floor(batchIndex / BATCH_SIZE) + 1}/${Math.ceil(preparedContacts.length / BATCH_SIZE)}: ${batch.length} contatos`);
            
            // ETAPA 1: Validar e enriquecer números do lote
            if (sessionForValidation && wahaApiKey && wahaApiUrl) {
                for (const contact of batch) {
                    if (contact.phone) {
                        const validation = await checkNumberExists(
                            contact.phone,
                            sessionForValidation.session_name,
                            wahaApiKey,
                            wahaApiUrl
                        );

                        contact.checked = true;
                        contact.numberExists = validation.exists || false;
                        
                        if (validation.exists && validation.chat_id) {
                            const correctedPhone = validation.chat_id.replace('@c.us', '');
                            contact.phone = correctedPhone;
                            contact.numberExists = true;
                            
                            // ✅ NOVO: Enriquecer com dados completos do WhatsApp
                            try {
                                const enrichResponse = await base44.asServiceRole.functions.invoke('enrichContactData', {
                                    chatId: validation.chat_id,
                                    sessionName: sessionForValidation.session_name,
                                    companyId: user.company_id,
                                    pushName: contact.first_name
                                });
                                
                                if (enrichResponse.data?.success && enrichResponse.data?.contact) {
                                    const enrichedData = enrichResponse.data.contact;
                                    
                                    // Atualizar com dados enriquecidos (incluindo telefone corrigido)
                                    if (enrichedData.phone) contact.phone = enrichedData.phone;
                                    if (enrichedData.avatar_url) contact.avatar_url = enrichedData.avatar_url;
                                    if (enrichedData.nickname) contact.nickname = enrichedData.nickname;
                                    if (enrichedData.lid) {
                                        // Adicionar LID aos phones
                                        contact.phones = contact.phones || [];
                                        const hasLid = contact.phones.some(p => p.type === 'lid');
                                        if (!hasLid) {
                                            contact.phones.push({ phone: enrichedData.lid, type: 'lid' });
                                        }
                                    }
                                    
                                    console.log(`✅ Contato enriquecido: ${contact.first_name} (${contact.phone})`);
                                } else {
                                    console.log(`⚠️ Falha no enriquecimento de ${contact.first_name}, usando dados básicos`);
                                    
                                    // Fallback: buscar apenas a foto
                                    const photoUrl = await getWhatsAppPhoto(
                                        validation.chat_id,
                                        sessionForValidation.session_name,
                                        wahaApiKey,
                                        wahaApiUrl
                                    );
                                    
                                    if (photoUrl) {
                                        contact.avatar_url = photoUrl;
                                    }
                                }
                            } catch (enrichError) {
                                console.error(`❌ Erro ao enriquecer ${contact.first_name}:`, enrichError.message);
                                
                                // Fallback: buscar apenas a foto
                                const photoUrl = await getWhatsAppPhoto(
                                    validation.chat_id,
                                    sessionForValidation.session_name,
                                    wahaApiKey,
                                    wahaApiUrl
                                );
                                
                                if (photoUrl) {
                                    contact.avatar_url = photoUrl;
                                }
                            }
                        } else {
                            contact.numberExists = false;
                            noWhatsAppCount++;
                            
                            if (numberNotExistsTag) {
                                contact.tags_system = contact.tags_system || [];
                                if (!contact.tags_system.includes(numberNotExistsTag.id)) {
                                    contact.tags_system.push(numberNotExistsTag.id);
                                }
                            }
                        }
                    } else {
                        contact.checked = false;
                        contact.numberExists = null;
                        noWhatsAppCount++;
                    }
                }
            }

            // ETAPA 2: Verificar duplicados do lote
            const newContactsInBatch = [];
            const contactsToUpdateInBatch = [];

            for (const contact of batch) {
                const cleanPhone = cleanPhoneNumber(contact.phone);
                let existingContact = null;
                
                if (cleanPhone) {
                    const variations = generatePhoneVariations(contact.phone);
                    for (const variation of variations) {
                        if (existingPhoneToContact.has(variation)) {
                            existingContact = existingPhoneToContact.get(variation);
                            break;
                        }
                    }
                }
                
                if (existingContact) {
                    contactsToUpdateInBatch.push({ newData: contact, existingContact });
                } else {
                    newContactsInBatch.push(contact);
                }
            }

            // ETAPA 3: Atualizar duplicados do lote
            for (const { newData, existingContact } of contactsToUpdateInBatch) {
                try {
                    const existingTags = existingContact.tags || [];
                    const newTags = newData.tags || [];
                    const mergedTags = [...new Set([...existingTags, ...newTags])];
                    
                    const hasNewTags = newTags.some(t => !existingTags.includes(t));
                    
                    if (hasNewTags) {
                        await base44.asServiceRole.entities.Contact.update(existingContact.id, {
                            tags: mergedTags,
                            import_name: importName
                        });
                        updatedCount++;
                    } else {
                        duplicatesWithoutChanges++;
                    }
                } catch (error) {
                    console.error(`❌ Erro ao atualizar contato ${existingContact.id}:`, error.message);
                    duplicatesWithoutChanges++;
                }
            }

            // ETAPA 4: Inserir novos do lote
            if (newContactsInBatch.length > 0) {
                try {
                    const createdBatch = await base44.asServiceRole.entities.Contact.bulkCreate(newContactsInBatch);
                    novosInseridos += createdBatch.length;
                    console.log(`✅ ${createdBatch.length} novos contatos inseridos`);
                } catch (error) {
                    falhasInsercao += newContactsInBatch.length;
                    erros.push(`Erro no lote ${Math.floor(batchIndex / BATCH_SIZE) + 1}: ${error.message}`);
                    console.error(`❌ Erro na inserção do lote`);
                }
            }

            // ATUALIZAR PROGRESSO APÓS CADA LOTE
            totalProcessed = batchIndex + batch.length;
            
            console.log(`📤 [WS/DB] Progresso: ${totalProcessed}/${preparedContacts.length}`);
            
            // ✅ 1. Atualizar DB para polling (Fallback)
            if (importId) {
                try {
                    await base44.asServiceRole.entities.Import.update(importId, {
                        processed_records: totalProcessed,
                        successful_records: novosInseridos,
                        failed_records: falhasInsercao,
                    });
                } catch (dbErr) {
                    console.error('⚠️ Falha ao atualizar Import no DB:', dbErr);
                }
            }

            // ✅ 2. Enviar via WebSocket (Principal)
            await sendProgress(base44, user.company_id, {
                import_id: importId,
                total: preparedContacts.length,
                processed: totalProcessed,
                successful: novosInseridos,
                failed: falhasInsercao,
                duplicates: duplicatesWithoutChanges,
                updated: updatedCount,
                noWhatsApp: noWhatsAppCount,
                status: 'processing'
            });
            
            // Pequeno delay artificial para garantir que o usuário veja o progresso (já que o lote é pequeno)
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log(`✅ Processamento concluído`);

        const duracao = Date.now() - startTime;
        console.log(`\n✅ Importação concluída em ${duracao}ms:`);
        console.log(`   - ${novosInseridos} novos contatos importados`);
        console.log(`   - ${updatedCount} contatos atualizados`);
        console.log(`   - ${noWhatsAppCount} sem WhatsApp`);
        console.log(`   - ${duplicatesWithoutChanges} sem alterações`);

        // ✅ FINALIZAÇÃO
        
        // 1. Atualizar DB final
        if (importId) {
            try {
                await base44.asServiceRole.entities.Import.update(importId, {
                    status: 'completed',
                    processed_records: totalProcessed,
                    successful_records: novosInseridos,
                    failed_records: falhasInsercao,
                    completed_date: new Date().toISOString()
                });
            } catch (dbErr) {
                console.error('⚠️ Falha ao finalizar Import no DB:', dbErr);
            }
        }

        // 2. Enviar WebSocket final
        await sendProgress(base44, user.company_id, {
            import_id: importId,
            total: preparedContacts.length,
            processed: totalProcessed,
            successful: novosInseridos,
            failed: falhasInsercao,
            duplicates: duplicatesWithoutChanges,
            updated: updatedCount,
            noWhatsApp: noWhatsAppCount,
            status: 'completed'
        });

        return new Response(JSON.stringify({
            success: true,
            message: `Importação concluída: ${novosInseridos} novos, ${updatedCount} atualizados, ${noWhatsAppCount} sem WhatsApp.`,
            data: {
                successful_records: novosInseridos,
                updated_records: updatedCount,
                failed_records: falhasInsercao,
                duplicates: duplicatesWithoutChanges,
                noWhatsApp: noWhatsAppCount,
                total_records: contactsData.length,
                errors: erros,
                duration_ms: duracao
            }
        }), { status: 200, headers: { 'Content-Type': 'application/json' }});

    } catch (error) {
        console.error('Erro crítico na importação em lotes:', error);
        return new Response(JSON.stringify({
            success: false, 
            error: 'Erro interno do servidor durante a importação em lotes', 
            details: error.message
        }), { status: 500, headers: { 'Content-Type': 'application/json' }});
    }
});