import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// ✅ Mecanismo simples de lock para evitar criações duplicadas simultâneas
const processingPhones = new Map();

// Função para limpar número de telefone
function cleanPhoneNumber(phone) {
    if (!phone || typeof phone !== 'string') return null;
    return phone.replace(/\D/g, '');
}

// Gerar variações do número (com/sem 9, com/sem DDI)
function generatePhoneVariations(phone) {
    const cleaned = cleanPhoneNumber(phone);
    if (!cleaned) return [];
    
    const variations = [cleaned];
    
    // Se tem 13 dígitos (55 + 2 DDD + 9 + 8 número) - tentar sem o 9
    if (cleaned.length === 13 && cleaned.startsWith('55')) {
        const ddd = cleaned.substring(2, 4);
        const ninthDigit = cleaned.substring(4, 5);
        const restOfNumber = cleaned.substring(5);
        
        if (ninthDigit === '9' && restOfNumber.length === 8) {
            const withoutNine = `55${ddd}${restOfNumber}`;
            variations.push(withoutNine);
        }
    }
    
    // Se tem 12 dígitos (55 + 2 DDD + 8 número) - tentar com o 9
    if (cleaned.length === 12 && cleaned.startsWith('55')) {
        const ddd = cleaned.substring(2, 4);
        const number = cleaned.substring(4);
        
        if (number.length === 8) {
            const withNine = `55${ddd}9${number}`;
            variations.push(withNine);
        }
    }
    
    // Se não tem DDI (10 ou 11 dígitos) - adicionar 55 e variações
    if (cleaned.length === 11 && !cleaned.startsWith('55')) {
        const withDDI = `55${cleaned}`;
        variations.push(withDDI);
        
        const ddd = cleaned.substring(0, 2);
        const ninthDigit = cleaned.substring(2, 3);
        const restOfNumber = cleaned.substring(3);
        
        if (ninthDigit === '9' && restOfNumber.length === 8) {
            const withDDIWithoutNine = `55${ddd}${restOfNumber}`;
            variations.push(withDDIWithoutNine);
        }
    }
    
    if (cleaned.length === 10 && !cleaned.startsWith('55')) {
        const withDDI = `55${cleaned}`;
        variations.push(withDDI);
        
        const ddd = cleaned.substring(0, 2);
        const number = cleaned.substring(2);
        
        if (number.length === 8) {
            const withDDIWithNine = `55${ddd}9${number}`;
            variations.push(withDDIWithNine);
        }
    }
    
    return [...new Set(variations)];
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        if (!(await base44.auth.isAuthenticated())) {
            return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        const user = await base44.auth.me();
        if (!user?.company_id) {
            return new Response(JSON.stringify({ success: false, error: 'No company found' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // --- VERIFICAÇÃO DE LIMITE DO PLANO ---
        const subscriptions = await base44.asServiceRole.entities.SubscriptionsStripe.filter({
            company_id: user.company_id,
            status: 'active'
        });

        if (subscriptions.length > 0) {
            const activeSubscription = subscriptions[0];
            const planId = activeSubscription.metadata?.plan_id;
            if (planId) {
                let currentPlan;
                try {
                    currentPlan = await base44.asServiceRole.entities.Plan.get(planId);
                } catch (err) {
                    console.warn('Plano não encontrado:', planId);
                }
                
                if (currentPlan) {
                    const contactLimit = currentPlan.active_contacts;
                    if (contactLimit !== -1) {
                        const allContacts = await base44.entities.Contact.filter({ company_id: user.company_id });
                        if (allContacts.length >= contactLimit) {
                            return new Response(JSON.stringify({
                                success: false,
                                error: `Limite de ${contactLimit} contatos atingido. Para adicionar mais, faça um upgrade no seu plano.`
                            }), {
                                status: 403,
                                headers: { 'Content-Type': 'application/json' }
                            });
                        }
                    }
                }
            }
        }
        // --- FIM DA VERIFICAÇÃO ---

        const { contactData } = await req.json();

        if (!contactData || !contactData.first_name || (!contactData.phone && (!contactData.phones || contactData.phones.length === 0))) {
            return new Response(JSON.stringify({ success: false, error: 'First name and at least one phone are required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Normalizar phones array
        let phonesArray = contactData.phones || [];
        
        // Se phones não está definido mas phone está, criar array
        if (phonesArray.length === 0 && contactData.phone) {
            phonesArray = [{ phone: contactData.phone, type: 'primary' }];
        }
        
        // Garantir que existe um telefone primary
        let primaryPhoneEntry = phonesArray.find(p => p.type === 'primary');
        if (!primaryPhoneEntry && phonesArray.length > 0) {
            primaryPhoneEntry = phonesArray[0];
            primaryPhoneEntry.type = 'primary';
        }
        
        if (!primaryPhoneEntry) {
            return new Response(JSON.stringify({ success: false, error: 'No primary phone found' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const finalPrimaryPhone = cleanPhoneNumber(primaryPhoneEntry.phone);
        let avatarUrl = contactData.avatar_url;

        // ✅ LOCK: Verificar se já existe uma criação em andamento para este número
        const lockKey = `${user.company_id}_${finalPrimaryPhone}`;
        if (processingPhones.has(lockKey)) {
            console.log(`⚠️ Criação já em andamento para ${finalPrimaryPhone}, rejeitando duplicata`);
            return new Response(JSON.stringify({
                success: false,
                error: 'duplicate_in_progress',
                message: 'Já existe uma criação em andamento para este número. Aguarde alguns segundos.'
            }), {
                status: 409,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // ✅ LOCK: Marcar número como em processamento
        processingPhones.set(lockKey, Date.now());
        console.log(`🔒 Lock adquirido para ${finalPrimaryPhone}`);

        // Verificar duplicados em TODOS os números enviados
        console.log(`🔍 Verificando duplicados para todos os números...`);
        
        // ✅ Buscar TODOS os contatos da empresa usando entities normal (não asServiceRole)
        // asServiceRole pode ter problema com RLS, usar entities direto que respeita o company_id do user
        const existingContacts = await base44.entities.Contact.filter({
            company_id: user.company_id,
            deleted: { '$ne': true }
        });
        
        console.log(`📊 Total de contatos ativos na empresa: ${existingContacts.length}`);

        const existingPhoneToContact = new Map();
        existingContacts.forEach(contact => {
            if (contact.phone) {
                const cleanedPhone = cleanPhoneNumber(contact.phone);
                if (cleanedPhone) {
                    const variations = generatePhoneVariations(cleanedPhone);
                    variations.forEach(v => {
                        if (!existingPhoneToContact.has(v)) {
                            existingPhoneToContact.set(v, contact);
                        }
                    });
                }
            }
            if (contact.phones && Array.isArray(contact.phones)) {
                contact.phones.forEach(p => {
                    if (p.phone) {
                        const cleanedPhone = cleanPhoneNumber(p.phone);
                        if (cleanedPhone) {
                            const variations = generatePhoneVariations(cleanedPhone);
                            variations.forEach(v => {
                                if (!existingPhoneToContact.has(v)) {
                                    existingPhoneToContact.set(v, contact);
                                }
                            });
                        }
                    }
                });
            }
        });
        
        console.log(`📱 Mapa de telefones existentes: ${existingPhoneToContact.size} variações`);

        // Verificar TODOS os telefones do contato sendo criado
        let duplicateContact = null;
        for (const phoneEntry of phonesArray) {
            const cleanedInputPhone = cleanPhoneNumber(phoneEntry.phone);
            if (!cleanedInputPhone) continue;
            
            const phoneVariations = generatePhoneVariations(cleanedInputPhone);
            console.log(`🔎 Verificando ${cleanedInputPhone} com variações: ${phoneVariations.join(', ')}`);
            
            for (const variation of phoneVariations) {
                if (existingPhoneToContact.has(variation)) {
                    duplicateContact = existingPhoneToContact.get(variation);
                    console.log(`🚨 Duplicata encontrada! Variação ${variation} pertence a ${duplicateContact.first_name}`);
                    break;
                }
            }
            if (duplicateContact) break;
        }

        if (duplicateContact) {
            console.log(`⚠️ Contato duplicado encontrado: ${duplicateContact.first_name} (${duplicateContact.phone})`);
            
            // ✅ UNLOCK: Liberar o lock antes de retornar
            processingPhones.delete(lockKey);
            console.log(`🔓 Lock liberado para ${finalPrimaryPhone} (duplicado encontrado)`);
            
            return new Response(JSON.stringify({
                success: false,
                error: 'duplicate',
                duplicate: {
                    id: duplicateContact.id,
                    first_name: duplicateContact.first_name,
                    last_name: duplicateContact.last_name,
                    phone: duplicateContact.phone,
                    email: duplicateContact.email
                },
                message: `Já existe um contato com este número: ${duplicateContact.first_name} ${duplicateContact.last_name || ''}`
            }), {
                status: 409,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Limpar e remover duplicatas do phones array
        const uniquePhonesFinal = [];
        const seenPhonesClean = new Set();
        phonesArray.forEach(p => {
            const clean = cleanPhoneNumber(p.phone);
            if (clean && !seenPhonesClean.has(clean)) {
                uniquePhonesFinal.push(p);
                seenPhonesClean.add(clean);
            }
        });

        // Criar o contato
        const newContact = {
            ...contactData,
            company_id: user.company_id,
            created_by: user.id,
            phone: finalPrimaryPhone,
            phones: uniquePhonesFinal,
            checked: true,
            avatar_url: avatarUrl
        };

        console.log(`💾 Criando contato: ${newContact.first_name} - ${newContact.phone}`);
        console.log(`📞 Telefones:`, uniquePhonesFinal);
        
        const createdContact = await base44.entities.Contact.create(newContact);

        // Avaliar temperatura inicial
        let initialTemperature = 'fria';
        try {
            console.log(`🌡️ Avaliando temperatura inicial para ${finalPrimaryPhone}...`);
            
            const phoneVariations = generatePhoneVariations(finalPrimaryPhone);
            const chatIdVariations = phoneVariations.map(p => `${p}@c.us`);
            
            const allMessages = await base44.asServiceRole.entities.Message.filter({
                company_id: user.company_id,
                chat_id: { '$in': chatIdVariations }
            });
            
            console.log(`📬 ${allMessages.length} mensagens encontradas para este número`);
            
            const hasReceivedMessages = allMessages.some(msg => msg.direction === 'received');
            if (hasReceivedMessages) {
                initialTemperature = 'quente';
                console.log(`🔥 Temperatura: QUENTE (tem mensagens recebidas)`);
            } else {
                const hasSentMessages = allMessages.some(msg => msg.direction === 'sent');
                if (hasSentMessages) {
                    initialTemperature = 'morna';
                    console.log(`☀️ Temperatura: MORNA (tem mensagens enviadas)`);
                } else {
                    console.log(`❄️ Temperatura: FRIA (sem histórico)`);
                }
            }
            
            if (initialTemperature !== 'fria') {
                await base44.entities.Contact.update(createdContact.id, { temperature: initialTemperature });
                console.log(`✅ Temperatura inicial definida: ${initialTemperature}`);
            }
        } catch (tempError) {
            console.warn('⚠️ Erro ao avaliar temperatura inicial:', tempError.message);
        }

        // ✅ UNLOCK: Liberar o lock após criação
        processingPhones.delete(lockKey);
        console.log(`🔓 Lock liberado para ${finalPrimaryPhone}`);

        return new Response(JSON.stringify({ 
            success: true, 
            data: createdContact
        }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Create single contact error:', error);
        
        // ✅ UNLOCK: Liberar o lock em caso de erro também
        // Tenta liberar qualquer lock que possa ter sido criado
        for (const [key, timestamp] of processingPhones.entries()) {
            // Liberar locks mais antigos que 30 segundos (timeout de segurança)
            if (Date.now() - timestamp > 30000) {
                processingPhones.delete(key);
                console.log(`🔓 Lock expirado removido: ${key}`);
            }
        }
        
        return new Response(JSON.stringify({ success: false, error: 'Internal server error', details: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});