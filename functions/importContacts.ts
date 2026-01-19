
import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        if (!(await base44.auth.isAuthenticated())) {
            return new Response(JSON.stringify({ 
                success: false,
                error: 'Unauthorized' 
            }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const user = await base44.auth.me();
        if (!user?.company_id) {
            return new Response(JSON.stringify({ 
                success: false,
                error: 'No company found' 
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const { 
            importName, 
            importType, 
            contacts, 
            mapping,
            saveTemplate,
            templateName 
        } = await req.json();

        if (!importName || !importType || !contacts || !Array.isArray(contacts)) {
            return new Response(JSON.stringify({ 
                success: false,
                error: 'Missing required fields: importName, importType, contacts' 
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // --- VERIFICAÇÃO DE LIMITE DO PLANO ---
        let contactLimit = -1; // -1 means no limit
        const subscriptions = await base44.asServiceRole.entities.SubscriptionsStripe.filter({
            company_id: user.company_id,
            status: 'active'
        });

        if (subscriptions.length > 0) {
            const activeSubscription = subscriptions[0]; // Assuming only one active subscription matters
            const planId = activeSubscription.metadata?.plan_id;
            if (planId) {
                const currentPlan = await base44.asServiceRole.entities.Plan.get(planId);
                if (currentPlan) {
                    contactLimit = currentPlan.active_contacts || -1; // Use -1 if active_contacts is not set or 0
                }
            }
        }
        // --- FIM DA VERIFICAÇÃO ---

        let successCount = 0;
        let failedCount = 0;
        const errors = [];

        // Load all existing contacts for duplicate validation
        const existingContacts = await base44.entities.Contact.filter({ company_id: user.company_id });
        const existingEmails = new Set(existingContacts.map(c => c.email?.toLowerCase()).filter(Boolean));
        const existingPhones = new Set(existingContacts.map(c => c.phone).filter(Boolean));
        let currentContactCount = existingContacts.length; // Initialize with existing contacts

        // Process each contact
        for (let i = 0; i < contacts.length; i++) {
            const contactData = contacts[i];
            
            try {
                // VERIFICAR LIMITE ANTES DE PROCESSAR
                if (contactLimit !== -1 && currentContactCount >= contactLimit) {
                    throw new Error(`Limite de ${contactLimit} contatos do plano atingido. Este contato não foi importado.`);
                }

                // Updated validation: only first_name and phone are required
                if (!contactData.first_name?.trim()) {
                    throw new Error('Nome é obrigatório');
                }

                if (!contactData.phone?.trim()) {
                    throw new Error('Telefone é obrigatório');
                }

                // Clean and validate email (optional)
                let cleanEmail = '';
                if (contactData.email) {
                    cleanEmail = String(contactData.email).trim().toLowerCase();
                    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
                        throw new Error('Formato de email inválido');
                    }
                }

                // Clean and validate phone number
                let cleanPhone = '';
                if (contactData.phone) {
                    cleanPhone = String(contactData.phone).replace(/\D/g, '');
                    if (cleanPhone && !cleanPhone.startsWith('55')) {
                        cleanPhone = '55' + cleanPhone;
                    }
                }

                // Check for duplicates
                if (cleanEmail && existingEmails.has(cleanEmail)) {
                    throw new Error(`Email já existe: ${cleanEmail}`);
                }

                if (cleanPhone && existingPhones.has(cleanPhone)) {
                    throw new Error(`Telefone já existe: ${cleanPhone}`);
                }

                // Clean and validate value
                let cleanValue = null;
                if (contactData.value) {
                    const numValue = parseFloat(String(contactData.value).replace(/[^\d.-]/g, ''));
                    if (!isNaN(numValue)) {
                        cleanValue = numValue;
                    }
                }

                // Prepare address data from individual fields
                const addresses = [];
                if (contactData.street || contactData.cep || contactData.city) {
                    addresses.push({
                        type: 'residential',
                        cep: contactData.cep || '',
                        street: contactData.street || '',
                        number: contactData.number || '',
                        complement: contactData.complement || '',
                        neighborhood: contactData.neighborhood || '',
                        city: contactData.city || '',
                        state: contactData.state || '',
                        country: contactData.country || 'Brasil'
                    });
                }

                // Prepare social profiles
                const socialProfiles = {};
                if (contactData.linkedin) socialProfiles.linkedin = contactData.linkedin;
                if (contactData.twitter) socialProfiles.twitter = contactData.twitter;
                if (contactData.website) socialProfiles.website = contactData.website;

                // Prepare contact data with proper type conversions
                const newContact = {
                    company_id: String(user.company_id),
                    first_name: String(contactData.first_name || '').trim(),
                    last_name: String(contactData.last_name || '').trim(),
                    document_number: String(contactData.document_number || '').trim(),
                    gender: contactData.gender || '',
                    email: cleanEmail,
                    phone: cleanPhone,
                    birth_date: contactData.birth_date || null,
                    company_name: String(contactData.company_name || '').trim(),
                    position: String(contactData.position || '').trim(),
                    custom_position: String(contactData.custom_position || '').trim(),
                    status: contactData.status || 'lead',
                    source: contactData.source || 'import',
                    tags: Array.isArray(contactData.tags) ? contactData.tags : [],
                    notes: String(contactData.notes || '').trim(),
                    value: cleanValue,
                    addresses: addresses.length > 0 ? addresses : null,
                    social_profiles: Object.keys(socialProfiles).length > 0 ? socialProfiles : null,
                    banking_data: contactData.banking_data || null,
                    import_name: String(importName),
                    import_type: String(importType)
                };

                // Create contact
                await base44.entities.Contact.create(newContact);
                
                // Add to existing sets to prevent duplicates within the same import
                if (cleanEmail) existingEmails.add(cleanEmail);
                if (cleanPhone) existingPhones.add(cleanPhone);
                
                successCount++;
                currentContactCount++; // Incrementar contagem local após criação bem-sucedida

            } catch (error) {
                console.error(`Error processing contact ${i + 1}:`, error);
                errors.push({
                    row: i + 1,
                    data: {
                        name: `${contactData.first_name || ''} ${contactData.last_name || ''}`.trim(),
                        email: contactData.email,
                        phone: contactData.phone
                    },
                    error: error.message
                });
                failedCount++;
            }
        }

        // Save template if requested
        if (saveTemplate && templateName && mapping) {
            try {
                await base44.entities.ImportTemplate.create({
                    company_id: String(user.company_id),
                    user_id: String(user.id),
                    name: String(templateName),
                    type: String(importType),
                    mapping: mapping,
                    created_date: new Date().toISOString()
                });
            } catch (templateError) {
                console.error('Error saving template:', templateError);
                // Don't fail the whole import for template errors
            }
        }

        const message = `Importação concluída: ${successCount} contatos importados com sucesso${failedCount > 0 ? `, ${failedCount} falharam` : ''}`;

        return new Response(JSON.stringify({
            success: true,
            message: message,
            data: {
                total_processed: contacts.length,
                successful: successCount,
                failed: failedCount,
                errors: errors
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Import contacts error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});
