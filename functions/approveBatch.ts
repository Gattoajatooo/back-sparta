import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Helper para normalizar strings
function norm(s) {
    return String(s ?? '')
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
        .trim();
}

// Helper para aplicar filtros dinâmicos diretamente
function applyDynamicFilters(contacts, filters, logic, runAtTimestamp) {
    if (!filters || filters.length === 0) return contacts;
    
    const combinator = String(logic || 'AND').toUpperCase();
    // Usar run_at como referência para filtros de data
    const referenceDate = runAtTimestamp ? new Date(runAtTimestamp) : new Date();
    
    console.log(`   📅 Data de referência para filtros: ${referenceDate.toISOString()}`);
    console.log(`   📅 Dia/Mês de referência: ${referenceDate.getDate()}/${referenceDate.getMonth() + 1}`);
    
    return contacts.filter(contact => {
        const results = filters.map(filter => {
            const field = String(filter.field || '').trim();
            const operator = String(filter.operator || '').toLowerCase().trim();
            const value = filter.value;
            
            // Filtro de tag
            if (field === 'has_tag') {
                const contactTags = Array.isArray(contact.tags) ? contact.tags.map(t => norm(t)) : [];
                const filterValues = Array.isArray(value) ? value.map(v => norm(v)) : [norm(value)];
                
                if (operator === 'is_true') return contactTags.length > 0;
                if (operator === 'is_false') return contactTags.length === 0;
                if (operator === 'equals' || operator === 'in') {
                    return filterValues.some(v => contactTags.includes(v));
                }
                if (operator === 'not_equals' || operator === 'not_in') {
                    return !filterValues.some(v => contactTags.includes(v));
                }
            }
            
            // Filtro de status
            if (field === 'status') {
                const contactStatus = norm(contact.status);
                const filterValue = norm(value);
                if (operator === 'equals') return contactStatus === filterValue;
                if (operator === 'not_equals') return contactStatus !== filterValue;
            }
            
            // Filtro de source
            if (field === 'source') {
                const contactSource = norm(contact.source);
                const filterValue = norm(value);
                if (operator === 'equals') return contactSource === filterValue;
                if (operator === 'not_equals') return contactSource !== filterValue;
            }
            
            // Filtro de aniversário - usar run_at como referência para campanhas agendadas
            if (field === 'birth_date') {
                if (!contact.birth_date) return false;
                const birth = new Date(contact.birth_date);
                
                if (operator === 'is_today') {
                    const match = birth.getDate() === referenceDate.getDate() && birth.getMonth() === referenceDate.getMonth();
                    return match;
                }
                if (operator === 'is_this_month') {
                    return birth.getMonth() === referenceDate.getMonth();
                }
            }
            
            // Se não reconhecer o filtro, retorna true para não bloquear
            return true;
        });
        
        // Combinar resultados
        if (combinator === 'OR') {
            return results.some(r => r === true);
        }
        return results.every(r => r === true);
    });
}

// Helper para preencher variáveis
function fillVariables(content, contact, user, company) {
    if (!content) return '';
    let message = content;
    if (contact) {
        const firstName = contact.first_name || contact.name?.split(' ')[0] || '';
        const lastName = contact.last_name || contact.name?.split(' ').slice(1).join(' ') || '';
        const fullName = (contact.first_name && contact.last_name) 
            ? `${contact.first_name} ${contact.last_name}`.trim() 
            : contact.name || firstName;
        
        message = message.replace(/{{\s*first_name\s*}}/gi, firstName);
        message = message.replace(/{{\s*last_name\s*}}/gi, lastName);
        message = message.replace(/{{\s*full_name\s*}}/gi, fullName);
        message = message.replace(/{{\s*name\s*}}/gi, fullName);
        message = message.replace(/{{\s*email\s*}}/gi, contact.email || '');
        message = message.replace(/{{\s*phone\s*}}/gi, contact.phone || '');
        message = message.replace(/{{\s*company_name\s*}}/gi, contact.company_name || '');
    }
    if (user) {
        message = message.replace(/{{\s*user.full_name\s*}}/gi, user.full_name || '');
        message = message.replace(/{{\s*user.first_name\s*}}/gi, user.full_name?.split(' ')[0] || '');
        message = message.replace(/{{\s*user.email\s*}}/gi, user.email || '');
    }
    if (company) {
        message = message.replace(/{{\s*company.name\s*}}/gi, company.name || '');
    }
    return message;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || !user.company_id) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const company = await base44.entities.Company.get(user.company_id);
        const { batch_id } = await req.json();

        if (!batch_id) {
            return Response.json({ success: false, error: 'batch_id is required' }, { status: 400 });
        }

        console.log('\n🎯 ========== APROVANDO LOTE ==========');
        console.log(`📦 Batch ID: ${batch_id}`);

        // Buscar o lote
        const batch = await base44.asServiceRole.entities.BatchSchedule.get(batch_id);

        if (!batch) {
            return Response.json({ success: false, error: 'Batch not found' }, { status: 404 });
        }

        if (batch.status !== 'pending') {
            return Response.json({ 
                success: false, 
                error: `Batch cannot be approved. Current status: ${batch.status}` 
            }, { status: 400 });
        }

        // Verificar se o prazo já passou
        const now = Date.now();
        if (batch.run_at && batch.run_at < now) {
            console.log(`⏰ Prazo expirado! run_at: ${new Date(batch.run_at).toISOString()}, now: ${new Date(now).toISOString()}`);
            
            // Atualizar status para expirado
            await base44.asServiceRole.entities.BatchSchedule.update(batch_id, {
                status: 'expired',
                updated_at: new Date().toISOString()
            });

            return Response.json({ 
                success: false, 
                error: 'O prazo de aprovação deste lote já expirou. O lote foi marcado como expirado.',
                expired: true
            }, { status: 400 });
        }

        // Buscar schedule pai primeiro para obter is_dynamic_campaign
        const parentSchedule = await base44.asServiceRole.entities.Schedule.get(batch.schedule_id);

        // Se for dinâmico, recalcular contatos
        let finalRecipients = batch.recipients || [];

        if (batch.is_dynamic) {
            console.log('\n🔄 Recalculando contatos para campanha dinâmica...');
            
            if (!batch.contact_filters || batch.contact_filters.length === 0) {
                return Response.json({ 
                    success: false, 
                    error: 'Dynamic batch has no contact filters defined' 
                }, { status: 400 });
            }

            // Buscar contatos diretamente ao invés de chamar função
            console.log('   📋 Buscando contatos da empresa...');
            let allContacts = await base44.asServiceRole.entities.Contact.filter({
                company_id: user.company_id,
                deleted: { '$ne': true }
            });
            console.log(`   ✓ ${allContacts.length} contatos encontrados na empresa`);

            // Buscar SystemTags para filtrar números inválidos
            const systemTags = await base44.asServiceRole.entities.SystemTag.list();
            const invalidNumberTag = systemTags.find(tag => tag.slug === 'invalid_number');
            const numberNotExistsTag = systemTags.find(tag => tag.slug === 'number_not_exists');
            
            const invalidSystemTagIds = [
                invalidNumberTag?.id,
                numberNotExistsTag?.id
            ].filter(Boolean);

            // Filtrar contatos com números inválidos
            allContacts = allContacts.filter(contact => {
                if (!contact.tags_system || contact.tags_system.length === 0) return true;
                const hasInvalidTag = contact.tags_system.some(tagId => invalidSystemTagIds.includes(tagId));
                return !hasInvalidTag;
            });
            console.log(`   ✓ ${allContacts.length} contatos após filtrar números inválidos`);

            // Aplicar filtros da campanha dinâmica - passando run_at como referência
            const dynamicContacts = applyDynamicFilters(allContacts, batch.contact_filters, batch.filter_logic || 'AND', batch.run_at);
            console.log(`   ✓ ${dynamicContacts.length} contatos encontrados pelos filtros`);

            finalRecipients = dynamicContacts.map(contact => ({
                contact_id: contact.id,
                name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
                phone: contact.phone,
                email: contact.email
            }));

            await base44.asServiceRole.entities.BatchSchedule.update(batch_id, {
                recipients: finalRecipients,
                recipient_count: finalRecipients.length
            });

            console.log(`   ✓ Lote atualizado com ${finalRecipients.length} destinatários`);
        }

        if (finalRecipients.length === 0) {
            return Response.json({ 
                success: false, 
                error: 'No recipients found for this batch' 
            }, { status: 400 });
        }

        // Buscar templates
        const templates = [];
        if (batch.template_ids && batch.template_ids.length > 0) {
            const templatePromises = batch.template_ids.map(id => 
                base44.asServiceRole.entities.MessageTemplate.get(id).catch(() => null)
            );
            const results = await Promise.all(templatePromises);
            templates.push(...results.filter(Boolean));
        }

        if (templates.length === 0) {
            return Response.json({ success: false, error: 'No valid templates found' }, { status: 400 });
        }

        // Buscar contatos completos
        const contactIds = finalRecipients.map(r => r.contact_id).filter(Boolean);
        const fullContacts = {};
        if (contactIds.length > 0) {
            const contactPromises = contactIds.map(id => 
                base44.asServiceRole.entities.Contact.get(id).catch(() => null)
            );
            const results = await Promise.all(contactPromises);
            results.filter(Boolean).forEach(contact => fullContacts[contact.id] = contact);
        }

        // Preparar payloads
        const allSchedulerPayloads = [];
        let currentTime = batch.run_at;

        const { interval_random_min = 20000, interval_random_max = 60000 } = batch.delivery_settings || {};

        for (const [index, recipient] of finalRecipients.entries()) {
            const contactData = fullContacts[recipient.contact_id] || recipient;
            const template = templates[index % templates.length];
            
            const templateContentType = template.content_type || 'text';

            if (index > 0) {
                const interval = Math.floor(Math.random() * (interval_random_max - interval_random_min + 1)) + interval_random_min;
                currentTime += interval;
            }

            const sessionName = batch.selected_sessions[index % batch.selected_sessions.length];
            const formattedPhone = String(contactData.phone).replace(/\D/g, '');
            const chatId = `${formattedPhone}@c.us`;

            const basePayload = {
                batch_id: batch_id,
                company_id: user.company_id,
                contact_id: recipient.contact_id,
                user_id: user.id,
                schedule_id: batch.schedule_id,
                session_name: sessionName,
                chat_id: chatId,
                direction: 'sent',
                type: 'scheduled',
                run_at: currentTime,
                created_at: Date.now(),
                updated_at: Date.now(),
                metadata: {
                    campaign_name: parentSchedule.name,
                    template_id: template.id,
                    template_name: template.name,
                    schedule_id: batch.schedule_id,
                    batch_id: batch_id,
                    recipient_name: contactData.first_name,
                    contact_name: `${contactData.first_name || ''} ${contactData.last_name || ''}`.trim(),
                    phone_number: contactData.phone
                }
            };

            let schedulerMessagePayload;
            
            if (templateContentType === 'text') {
                const finalContent = fillVariables(template.content, contactData, user, company);
                schedulerMessagePayload = {
                    ...basePayload,
                    content: finalContent,
                    message_type: 'text'
                };
            } else {
                const attachment = template.attachments?.[0];
                
                if (!attachment || !attachment.url) {
                    continue;
                }

                const caption = template.content ? fillVariables(template.content, contactData, user, company) : '';
                let workerMessageType = templateContentType;
                if (templateContentType === 'audio') {
                    workerMessageType = 'voice';
                }

                schedulerMessagePayload = {
                    ...basePayload,
                    content: caption,
                    message_type: workerMessageType,
                    caption: caption,
                    filename: attachment.filename,
                    mimetype: attachment.mimetype || attachment.type,
                    file_url: attachment.url,
                    metadata: {
                        ...basePayload.metadata,
                        attachment: {
                            url: attachment.url,
                            filename: attachment.filename,
                            mimetype: attachment.mimetype || attachment.type,
                            type: templateContentType
                        }
                    }
                };
            }

            allSchedulerPayloads.push(schedulerMessagePayload);
        }

        // Enviar para Cloudflare
        const BATCH_SIZE_CLOUDFLARE = 100;
        const messagesToCreate = [];
        
        const scheduleUrl = Deno.env.get("SCHEDULE_URL");
        const jobsApiKey = Deno.env.get("JOBS_API_KEY");

        for (let i = 0; i < allSchedulerPayloads.length; i += BATCH_SIZE_CLOUDFLARE) {
            const chunk = allSchedulerPayloads.slice(i, i + BATCH_SIZE_CLOUDFLARE);

            try {
                const schedulerResponse = await fetch(`${scheduleUrl}/jobs/batch`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json', 
                        'Authorization': `Bearer ${jobsApiKey}` 
                    },
                    body: JSON.stringify(chunk)
                });

                if (!schedulerResponse.ok) {
                    const errorText = await schedulerResponse.text();
                    throw new Error(`Erro do scheduler: ${errorText}`);
                }
                
                const schedulerResult = await schedulerResponse.json();

                if (schedulerResult.success && Array.isArray(schedulerResult.data)) {
                    schedulerResult.data.forEach((jobResult, index) => {
                        const originalPayload = chunk[index];
                        
                        if (jobResult.ok && jobResult.job?.id) {
                            messagesToCreate.push({
                                ...originalPayload,
                                scheduler_job_id: jobResult.job.id,
                                status: 'pending'
                            });
                        } else {
                            messagesToCreate.push({
                                ...originalPayload,
                                scheduler_job_id: null,
                                status: 'failed',
                                error_details: `Falha no Cloudflare: ${jobResult.error || 'Erro desconhecido'}`
                            });
                        }
                    });
                }
            } catch (error) {
                console.error(`Erro ao enviar chunk:`, error.message);
                chunk.forEach(payload => {
                    messagesToCreate.push({
                        ...payload,
                        scheduler_job_id: null,
                        status: 'failed',
                        error_details: `Erro: ${error.message}`
                    });
                });
            }
        }

        // Criar mensagens no Base44
        const BATCH_SIZE_BASE44 = 200;
        let totalCreated = 0;

        for (let i = 0; i < messagesToCreate.length; i += BATCH_SIZE_BASE44) {
            const chunkBase44 = messagesToCreate.slice(i, i + BATCH_SIZE_BASE44);
            
            try {
                await base44.asServiceRole.entities.Message.bulkCreate(chunkBase44);
                totalCreated += chunkBase44.length;
            } catch (error) {
                console.error(`Erro ao salvar mensagens:`, error.message);
            }
        }

        // Atualizar status do lote
        await base44.asServiceRole.entities.BatchSchedule.update(batch_id, {
            status: 'approved',
            approved_by: user.id,
            approved_at: new Date().toISOString()
        });

        console.log(`\n✅ Lote aprovado! ${totalCreated} mensagens criadas\n`);

        return Response.json({
            success: true,
            batch_id: batch_id,
            messages_created: totalCreated,
            recipients_count: finalRecipients.length,
            message: 'Batch approved and messages scheduled successfully'
        });

    } catch (error) {
        console.error('\n❌ Erro ao aprovar lote:', error);
        return Response.json({
            success: false,
            error: 'Internal server error',
            details: error.message
        }, { status: 500 });
    }
});