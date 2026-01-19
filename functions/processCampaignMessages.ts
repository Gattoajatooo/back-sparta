import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';

Deno.serve(async (req) => {
    const startTime = Date.now();
    
    try {
        console.log('\n🚀 ========== PROCESSAR MENSAGENS DA CAMPANHA ==========');
        
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({
                success: false,
                error: 'Usuário não autenticado'
            }, { status: 401 });
        }

        console.log(`👤 Usuário: ${user.email}`);
        console.log(`🏢 Empresa: ${user.company_id}`);

        // ============================================
        // ETAPA 1: RECEBER E VALIDAR PAYLOAD
        // ============================================
        console.log('\n📥 [1/5] Recebendo payload...');
        const payload = await req.json();
        
        const {
            schedule_id,
            batch_id,
            recipients,
            templates,
            custom_message,
            selected_sessions,
            session_sending_strategy,
            delivery_settings,
            run_at,
            company_data
        } = payload;

        console.log(`   → schedule_id: ${schedule_id || '✗ AUSENTE'}`);
        console.log(`   → batch_id: ${batch_id || '✗ AUSENTE'}`);
        console.log(`   → recipients: ${recipients?.length || '✗ AUSENTE'}`);
        console.log(`   → templates: ${templates?.length || '✗ AUSENTE'}`);
        console.log(`   → selected_sessions: ${selected_sessions?.length || '✗ AUSENTE'}`);
        console.log(`   → run_at: ${run_at ? new Date(run_at).toLocaleString('pt-BR') : '✗ AUSENTE'}`);

        // Validações obrigatórias
        if (!schedule_id) throw new Error('schedule_id é obrigatório');
        if (!batch_id) throw new Error('batch_id é obrigatório');
        if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
            throw new Error('recipients deve ser um array não vazio');
        }
        if (!templates || !Array.isArray(templates) || templates.length === 0) {
            throw new Error('templates deve ser um array não vazio');
        }
        if (!selected_sessions || !Array.isArray(selected_sessions) || selected_sessions.length === 0) {
            throw new Error('selected_sessions deve ser um array não vazio');
        }
        if (!run_at) throw new Error('run_at é obrigatório');

        console.log('   ✓ Todas as validações passaram');

        // ============================================
        // ETAPA 2: BUSCAR TEMPLATES
        // ============================================
        console.log('\n📄 [2/5] Buscando templates...');
        const templateObjects = [];
        
        for (const templateId of templates) {
            try {
                const template = await base44.asServiceRole.entities.MessageTemplate.get(templateId);
                if (template) {
                    templateObjects.push(template);
                    console.log(`   ✓ Template encontrado: ${template.name}`);
                }
            } catch (error) {
                console.warn(`   ⚠ Template ${templateId} não encontrado`);
            }
        }

        if (templateObjects.length === 0) {
            throw new Error('Nenhum template válido encontrado');
        }

        // ============================================
        // ETAPA 3: BUSCAR SCHEDULE
        // ============================================
        console.log('\n📋 [3/5] Buscando campanha...');
        const schedule = await base44.asServiceRole.entities.Schedule.get(schedule_id);
        
        if (!schedule) {
            throw new Error('Campanha não encontrada');
        }

        console.log(`   ✓ Campanha: ${schedule.name}`);

        // ============================================
        // ETAPA 4: VERIFICAR CLOUDFLARE SCHEDULER
        // ============================================
        console.log('\n☁️ [4/5] Verificando Cloudflare Scheduler...');
        const SCHEDULE_URL = Deno.env.get('SCHEDULE_URL');
        const JOBS_API_KEY = Deno.env.get('JOBS_API_KEY');

        if (!SCHEDULE_URL || !JOBS_API_KEY) {
            throw new Error('Configuração do Cloudflare Scheduler não encontrada');
        }

        console.log(`   ✓ Scheduler URL configurado`);
        console.log(`   ✓ API Key configurado`);

        // ============================================
        // ETAPA 5: CRIAR MENSAGENS E AGENDAR
        // ============================================
        console.log('\n📨 [5/5] Criando mensagens...');
        const sessionStrategy = session_sending_strategy || 'sequential';
        console.log(`   → Estratégia: ${sessionStrategy}`);

        // ============================================
        // BUSCAR DETALHES DAS SESSÕES
        // ============================================
        console.log('\n📱 Buscando detalhes das sessões...');
        console.log(`   → Sessões a buscar: ${JSON.stringify(selected_sessions)}`);
        
        const sessionDetails = {};
        
        // Buscar TODAS as sessões da empresa de uma vez
        const allSessions = await base44.asServiceRole.entities.Session.filter({
            company_id: user.company_id,
            is_deleted: { '$ne': true }
        });
        
        console.log(`   → Total de sessões ativas da empresa: ${allSessions.length}`);
        
        // Mapear sessões por session_name
        for (const session of allSessions) {
            if (selected_sessions.includes(session.session_name)) {
                sessionDetails[session.session_name] = {
                    phone: session.phone || null,
                    push_name: session.push_name || null
                };
                console.log(`   ✓ Sessão mapeada: ${session.session_name} → phone: ${session.phone || 'NULL'}`);
            }
        }
        
        // Verificar se todas as sessões selecionadas foram encontradas
        for (const sessionName of selected_sessions) {
            if (!sessionDetails[sessionName]) {
                console.warn(`   ⚠️ AVISO: Sessão ${sessionName} não encontrada no banco!`);
                sessionDetails[sessionName] = { phone: null, push_name: null };
            }
        }
        
        console.log(`\n   📊 Resumo das sessões mapeadas:`);
        for (const [name, info] of Object.entries(sessionDetails)) {
            console.log(`      ${name} → ${info.phone || 'SEM TELEFONE'}`);
        }

        const createdMessages = [];

        for (let i = 0; i < recipients.length; i++) {
            const recipient = recipients[i];
            
            // Validar recipient
            if (!recipient.contact_id || !recipient.phone) {
                console.warn(`   ⚠ Recipient ${i + 1} inválido, pulando...`);
                continue;
            }

            // Selecionar sessão
            let selectedSessionName;
            if (sessionStrategy === 'random') {
                selectedSessionName = selected_sessions[Math.floor(Math.random() * selected_sessions.length)];
            } else {
                selectedSessionName = selected_sessions[i % selected_sessions.length];
            }

            // Obter número da sessão
            const sessionInfo = sessionDetails[selectedSessionName] || {};
            const sessionNumber = sessionInfo.phone || null;
            
            if (i < 3) { // Log apenas as 3 primeiras para não poluir
                console.log(`   → Msg ${i + 1}/${recipients.length}: session_name=${selectedSessionName}, session_number=${sessionNumber || 'NULL'}`);
            }

            // Selecionar template
            const template = templateObjects[i % templateObjects.length];

            // Preparar conteúdo da mensagem
            let messageContent = custom_message || template.content;
            messageContent = replaceVariables(messageContent, recipient, company_data);

            // Criar mensagem no banco
            const chatId = `${recipient.phone}@c.us`;
            
            const messageData = {
                batch_id: batch_id,
                company_id: schedule.company_id,
                contact_id: recipient.contact_id,
                user_id: schedule.user_id,
                schedule_id: schedule_id,
                session_name: selectedSessionName,
                session_number: sessionNumber,
                chat_id: chatId,
                content: messageContent,
                direction: 'sent',
                type: 'scheduled',
                run_at: run_at,
                status: 'pending',
                attempt_count: 0,
                next_attempt_at: run_at,
                created_at: Date.now(),
                updated_at: Date.now(),
                metadata: {
                    campaign_name: schedule.name,
                    template_id: template.id,
                    recipient_name: recipient.name,
                    contact_name: recipient.name,
                    phone_number: recipient.phone
                }
            };

            // Log detalhado da primeira mensagem
            if (i === 0) {
                console.log(`\n   🔍 DEBUG - Primeira mensagem a ser criada:`);
                console.log(`      session_name: ${messageData.session_name}`);
                console.log(`      session_number: ${messageData.session_number || 'NULL'}`);
                console.log(`      chat_id: ${messageData.chat_id}`);
                console.log(`      MessageData completo:`, JSON.stringify(messageData, null, 2));
            }

            try {
                const createdMessage = await base44.asServiceRole.entities.Message.create(messageData);
                
                // Verificar se session_number foi salvo
                if (i === 0) {
                    console.log(`\n   ✅ Mensagem criada no banco:`);
                    console.log(`      ID: ${createdMessage.id}`);
                    console.log(`      session_name: ${createdMessage.session_name}`);
                    console.log(`      session_number: ${createdMessage.session_number || 'NULL - NÃO FOI SALVO!'}`);
                }
                
                // Agendar no Cloudflare
                try {
                    const cloudflarePayload = {
                        job_id: createdMessage.id,
                        schedule_id: schedule_id,
                        batch_id: batch_id,
                        company_id: schedule.company_id,
                        contact_id: recipient.contact_id,
                        session_name: selectedSession,
                        chat_id: chatId,
                        content: messageContent,
                        run_at: run_at,
                        type: 'scheduled',
                        metadata: messageData.metadata
                    };

                    console.log(`   → Agendando mensagem ${i + 1} no Cloudflare...`);
                    console.log(`      URL: ${SCHEDULE_URL}`);
                    console.log(`      Payload:`, JSON.stringify(cloudflarePayload, null, 2));

                    const cloudflareResponse = await fetch(SCHEDULE_URL, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${JOBS_API_KEY}`
                        },
                        body: JSON.stringify(cloudflarePayload)
                    });

                    const responseText = await cloudflareResponse.text();
                    console.log(`      Status: ${cloudflareResponse.status}`);
                    console.log(`      Response: ${responseText}`);

                    if (cloudflareResponse.ok) {
                        let cloudflareData;
                        try {
                            cloudflareData = JSON.parse(responseText);
                        } catch (e) {
                            console.warn(`      ⚠️ Resposta não é JSON válido, usando ID da mensagem: ${e.message}`);
                            cloudflareData = { job_id: createdMessage.id };
                        }
                        
                        // Atualizar mensagem com scheduler_job_id
                        await base44.asServiceRole.entities.Message.update(createdMessage.id, {
                            scheduler_job_id: cloudflareData.job_id || createdMessage.id
                        });
                        
                        console.log(`      ✓ Mensagem ${i + 1} agendada com sucesso`);
                    } else {
                        console.error(`      ✗ Erro ao agendar no Cloudflare:`);
                        console.error(`         Status: ${cloudflareResponse.status}`);
                        console.error(`         Response: ${responseText}`);
                        
                        // Marcar mensagem como failed
                        await base44.asServiceRole.entities.Message.update(createdMessage.id, {
                            status: 'failed',
                            error_details: `Cloudflare error ${cloudflareResponse.status}: ${responseText}`
                        });
                    }
                } catch (cloudflareError) {
                    console.error(`      ✗ Erro ao conectar com Cloudflare:`, cloudflareError.message);
                    console.error(`         Stack:`, cloudflareError.stack);
                    
                    // Marcar mensagem como failed
                    await base44.asServiceRole.entities.Message.update(createdMessage.id, {
                        status: 'failed',
                        error_details: `Cloudflare connection error: ${cloudflareError.message}`
                    });
                }

                createdMessages.push(createdMessage);
                
                if ((i + 1) % 10 === 0 || i === recipients.length - 1) {
                    console.log(`   → Processados: ${i + 1}/${recipients.length}`);
                }

            } catch (error) {
                console.error(`   ✗ Erro ao criar mensagem ${i + 1}:`, error.message);
            }
        }

        const duration = Date.now() - startTime;

        console.log('\n🎉 ========== PROCESSAMENTO CONCLUÍDO ==========');
        console.log(`⏱️  Tempo total: ${(duration / 1000).toFixed(2)}s`);
        console.log(`📨 Mensagens criadas: ${createdMessages.length}`);
        console.log(`👥 Destinatários processados: ${recipients.length}`);

        return Response.json({
            success: true,
            messages_created: createdMessages.length,
            batch_id: batch_id,
            schedule_id: schedule_id
        });

    } catch (error) {
        const duration = Date.now() - startTime;
        
        console.error('\n❌ ========== ERRO NO PROCESSAMENTO ==========');
        console.error(`❌ Erro: ${error.message}`);
        console.error(`⏱️  Tempo até o erro: ${(duration / 1000).toFixed(2)}s`);
        
        return Response.json({
            success: false,
            error: error.message
        }, { status: 400 });
    }
});

// Função para substituir variáveis
function replaceVariables(content, recipient, companyData) {
    if (!content || typeof content !== 'string') {
        return content;
    }

    let processedContent = content;
    
    // Data e hora atual
    const now = new Date();
    const currentDate = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const currentTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
    const currentDay = now.toLocaleDateString('pt-BR', { day: '2-digit' });
    const currentMonth = now.toLocaleDateString('pt-BR', { month: 'long' });
    const currentYear = now.getFullYear().toString();

    const replacements = {
        '{{first_name}}': recipient.name?.split(' ')[0] || '[Nome]',
        '{{last_name}}': recipient.name?.split(' ').slice(1).join(' ') || '[Sobrenome]',
        '{{full_name}}': recipient.name || '[Nome Completo]',
        '{{email}}': recipient.email || '[Email]',
        '{{phone}}': recipient.phone || '[Telefone]',
        '{{current_date}}': currentDate,
        '{{current_time}}': currentTime,
        '{{current_day}}': currentDay,
        '{{current_month}}': currentMonth,
        '{{current_year}}': currentYear
    };

    // Adicionar variáveis da empresa se disponíveis
    if (companyData) {
        replacements['{{company.name}}'] = companyData.name || '[Nome da Empresa]';
        replacements['{{company.phone}}'] = companyData.phone || '[Telefone da Empresa]';
        replacements['{{company.website}}'] = companyData.website || '[Site da Empresa]';
    }

    // Aplicar todas as substituições
    Object.entries(replacements).forEach(([variable, value]) => {
        const regex = new RegExp(variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        processedContent = processedContent.replace(regex, value);
    });

    return processedContent;
}