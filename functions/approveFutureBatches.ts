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
    const referenceDate = runAtTimestamp ? new Date(runAtTimestamp) : new Date();
    
    return contacts.filter(contact => {
        const results = filters.map(filter => {
            const field = String(filter.field || '').trim();
            const operator = String(filter.operator || '').toLowerCase().trim();
            const value = filter.value;
            
            if (field === 'has_tag') {
                const contactTags = Array.isArray(contact.tags) ? contact.tags.map(t => norm(t)) : [];
                const filterValues = Array.isArray(value) ? value.map(v => norm(v)) : [norm(value)];
                
                if (operator === 'is_true') return contactTags.length > 0;
                if (operator === 'is_false') return contactTags.length === 0;
                if (operator === 'equals' || operator === 'in') return filterValues.some(v => contactTags.includes(v));
                if (operator === 'not_equals' || operator === 'not_in') return !filterValues.some(v => contactTags.includes(v));
            }
            
            if (field === 'status') {
                const contactStatus = norm(contact.status);
                const filterValue = norm(value);
                if (operator === 'equals') return contactStatus === filterValue;
                if (operator === 'not_equals') return contactStatus !== filterValue;
            }
            
            if (field === 'source') {
                const contactSource = norm(contact.source);
                const filterValue = norm(value);
                if (operator === 'equals') return contactSource === filterValue;
                if (operator === 'not_equals') return contactSource !== filterValue;
            }
            
            if (field === 'birth_date') {
                if (!contact.birth_date) return false;
                const birth = new Date(contact.birth_date);
                if (operator === 'is_today') return birth.getDate() === referenceDate.getDate() && birth.getMonth() === referenceDate.getMonth();
                if (operator === 'is_this_month') return birth.getMonth() === referenceDate.getMonth();
            }
            
            return true;
        });
        
        if (combinator === 'OR') return results.some(r => r === true);
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
        const { batch_id, days_to_approve } = await req.json();

        if (!batch_id) {
            return Response.json({ error: 'batch_id é obrigatório' }, { status: 400 });
        }

        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const company = await base44.entities.Company.get(user.company_id);

        // Buscar o lote original
        const originalBatch = await base44.entities.BatchSchedule.get(batch_id);
        if (!originalBatch) {
            return Response.json({ error: 'Lote não encontrado' }, { status: 404 });
        }

        const scheduleId = originalBatch.schedule_id;
        if (!scheduleId) {
            return Response.json({ error: 'Lote sem campanha associada' }, { status: 400 });
        }

        const parentSchedule = await base44.entities.Schedule.get(scheduleId);

        // Definir a janela de tempo
        const now = Date.now();
        const days = parseInt(days_to_approve) || 7;
        const maxFutureTime = now + (days * 24 * 60 * 60 * 1000);

        // Buscar lotes pendentes
        const allPending = await base44.entities.BatchSchedule.filter({
            schedule_id: scheduleId,
            status: 'pending'
        });

        // Filtrar lotes
        const batchesToApprove = allPending.filter(b => {
            if (b.id === batch_id) return true;
            return b.run_at <= maxFutureTime && b.run_at >= now;
        });

        console.log(`Aprovando ${batchesToApprove.length} lotes para a campanha ${scheduleId}`);

        let approvedCount = 0;
        const errors = [];

        // Buscar contatos e system tags uma vez se houver lotes dinâmicos
        let allContacts = null;
        let systemTags = null;
        const hasDynamic = batchesToApprove.some(b => b.is_dynamic);

        if (hasDynamic) {
            allContacts = await base44.asServiceRole.entities.Contact.filter({
                company_id: user.company_id,
                deleted: { '$ne': true }
            });
            
            const tags = await base44.asServiceRole.entities.SystemTag.list();
            const invalidNumberTag = tags.find(tag => tag.slug === 'invalid_number');
            const numberNotExistsTag = tags.find(tag => tag.slug === 'number_not_exists');
            const invalidSystemTagIds = [invalidNumberTag?.id, numberNotExistsTag?.id].filter(Boolean);

            // Filtrar inválidos
            allContacts = allContacts.filter(contact => {
                if (!contact.tags_system || contact.tags_system.length === 0) return true;
                return !contact.tags_system.some(tagId => invalidSystemTagIds.includes(tagId));
            });
        }

        // Processar cada lote
        for (const batch of batchesToApprove) {
            try {
                // Verificar expiração
                if (batch.run_at && batch.run_at < Date.now()) {
                    await base44.asServiceRole.entities.BatchSchedule.update(batch.id, {
                        status: 'expired',
                        updated_at: new Date().toISOString()
                    });
                    errors.push({ id: batch.id, error: 'Expirado' });
                    continue;
                }

                let finalRecipients = batch.recipients || [];

                // Recalcular dinâmicos
                if (batch.is_dynamic) {
                    if (!batch.contact_filters || batch.contact_filters.length === 0) {
                        errors.push({ id: batch.id, error: 'Sem filtros' });
                        continue;
                    }

                    const dynamicContacts = applyDynamicFilters(allContacts, batch.contact_filters, batch.filter_logic || 'AND', batch.run_at);
                    
                    finalRecipients = dynamicContacts.map(contact => ({
                        contact_id: contact.id,
                        name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
                        phone: contact.phone,
                        email: contact.email
                    }));

                    await base44.asServiceRole.entities.BatchSchedule.update(batch.id, {
                        recipients: finalRecipients,
                        recipient_count: finalRecipients.length
                    });
                }

                if (finalRecipients.length === 0) {
                    errors.push({ id: batch.id, error: 'Sem destinatários' });
                    continue;
                }

                // Buscar templates
                const templates = [];
                if (batch.template_ids?.length > 0) {
                    const templatePromises = batch.template_ids.map(id => 
                        base44.asServiceRole.entities.MessageTemplate.get(id).catch(() => null)
                    );
                    const results = await Promise.all(templatePromises);
                    templates.push(...results.filter(Boolean));
                }

                if (templates.length === 0) {
                    errors.push({ id: batch.id, error: 'Sem templates' });
                    continue;
                }

                // Buscar dados completos dos contatos do lote
                const contactIds = finalRecipients.map(r => r.contact_id).filter(Boolean);
                const fullContacts = {};
                
                // Otimização: se já temos allContacts, usar
                if (allContacts) {
                    contactIds.forEach(id => {
                        const c = allContacts.find(ac => ac.id === id);
                        if (c) fullContacts[id] = c;
                    });
                } else {
                    // Fallback fetch
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
                        batch_id: batch.id,
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
                            batch_id: batch.id,
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
                        if (!attachment || !attachment.url) continue;

                        const caption = template.content ? fillVariables(template.content, contactData, user, company) : '';
                        let workerMessageType = templateContentType;
                        if (templateContentType === 'audio') workerMessageType = 'voice';

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
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jobsApiKey}` },
                            body: JSON.stringify(chunk)
                        });

                        if (!schedulerResponse.ok) throw new Error(`Erro scheduler: ${await schedulerResponse.text()}`);
                        const schedulerResult = await schedulerResponse.json();

                        if (schedulerResult.success && Array.isArray(schedulerResult.data)) {
                            schedulerResult.data.forEach((jobResult, index) => {
                                const original = chunk[index];
                                messagesToCreate.push({
                                    ...original,
                                    scheduler_job_id: jobResult.ok && jobResult.job?.id ? jobResult.job.id : null,
                                    status: jobResult.ok ? 'pending' : 'failed',
                                    error_details: jobResult.ok ? null : `Falha Cloudflare: ${jobResult.error}`
                                });
                            });
                        }
                    } catch (error) {
                        chunk.forEach(p => messagesToCreate.push({ ...p, scheduler_job_id: null, status: 'failed', error_details: `Erro: ${error.message}` }));
                    }
                }

                // Salvar mensagens
                const BATCH_SIZE_BASE44 = 200;
                for (let i = 0; i < messagesToCreate.length; i += BATCH_SIZE_BASE44) {
                    try {
                        await base44.asServiceRole.entities.Message.bulkCreate(messagesToCreate.slice(i, i + BATCH_SIZE_BASE44));
                    } catch (e) { console.error('Erro salvando msgs:', e); }
                }

                // Atualizar status do lote
                await base44.asServiceRole.entities.BatchSchedule.update(batch.id, {
                    status: 'approved',
                    approved_by: user.id,
                    approved_at: new Date().toISOString()
                });

                approvedCount++;

            } catch (err) {
                console.error(`Erro lote ${batch.id}:`, err);
                errors.push({ id: batch.id, error: err.message });
            }
        }

        return Response.json({
            success: true,
            approved_count: approvedCount,
            total_attempted: batchesToApprove.length,
            errors: errors.length > 0 ? errors : null,
            days_window: days
        });

    } catch (error) {
        console.error('Erro fatal em approveFutureBatches:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});