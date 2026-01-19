import { createClient } from 'npm:@base44/sdk@0.1.0';

const base44 = createClient({
    appId: Deno.env.get('BASE44_APP_ID'),
});

// This function runs periodically in the background to apply smart tags
Deno.serve(async (req) => {
    try {
        console.log('Starting background smart tags processing...');

        // Get all companies with active smart tags
        const smartTags = await base44.entities.Tag.filter({ 
            is_smart: true, 
            is_active: true 
        });

        if (smartTags.length === 0) {
            return new Response(JSON.stringify({
                success: true,
                message: 'No active smart tags found'
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Group tags by company
        const tagsByCompany = {};
        smartTags.forEach(tag => {
            if (!tagsByCompany[tag.company_id]) {
                tagsByCompany[tag.company_id] = [];
            }
            tagsByCompany[tag.company_id].push(tag);
        });

        let totalAppliedTags = 0;
        let totalProcessedContacts = 0;
        let processedCompanies = 0;

        // Process each company
        for (const [companyId, companyTags] of Object.entries(tagsByCompany)) {
            try {
                processedCompanies++;
                
                // Get all contacts for this company
                const contacts = await base44.entities.Contact.filter({ company_id: companyId });
                
                for (const tag of companyTags) {
                    if (!tag.smart_rules?.auto_apply || !tag.smart_rules?.conditions) {
                        continue;
                    }

                    for (const contact of contacts) {
                        totalProcessedContacts++;
                        
                        // Check if contact already has this tag
                        if (contact.tags && contact.tags.includes(tag.name)) {
                            continue;
                        }

                        // Evaluate conditions
                        let conditionsMet = true;
                        
                        for (const condition of tag.smart_rules.conditions) {
                            const { field, operator, value } = condition;
                            const contactValue = getContactFieldValue(contact, field);
                            
                            if (!evaluateCondition(contactValue, operator, value)) {
                                conditionsMet = false;
                                break;
                            }
                        }

                        if (conditionsMet) {
                            // Apply tag to contact
                            const updatedTags = contact.tags ? [...contact.tags, tag.name] : [tag.name];
                            
                            await base44.entities.Contact.update(contact.id, {
                                tags: updatedTags
                            });

                            // Update tag statistics
                            const currentStats = tag.usage_stats || {};
                            const now = new Date();
                            const isThisMonth = true; // For simplicity, we'll update this monthly in a separate job
                            
                            const updatedStats = {
                                ...currentStats,
                                total_applied: (currentStats.total_applied || 0) + 1,
                                auto_applied: (currentStats.auto_applied || 0) + 1,
                                this_month: isThisMonth ? (currentStats.this_month || 0) + 1 : currentStats.this_month || 0,
                                last_processed: now.toISOString()
                            };

                            await base44.entities.Tag.update(tag.id, {
                                usage_stats: updatedStats,
                                contacts_count: (tag.contacts_count || 0) + 1
                            });

                            totalAppliedTags++;

                            // Execute actions if defined
                            if (tag.smart_rules.actions) {
                                for (const action of tag.smart_rules.actions) {
                                    await executeAction(action, contact, companyId);
                                }
                            }
                        }
                    }
                }

                console.log(`Processed company ${companyId}: ${companyTags.length} smart tags`);
                
            } catch (companyError) {
                console.error(`Error processing company ${companyId}:`, companyError);
            }
        }

        console.log(`Background processing complete: ${totalAppliedTags} tags applied to ${totalProcessedContacts} contacts across ${processedCompanies} companies`);

        return new Response(JSON.stringify({
            success: true,
            totalAppliedTags,
            totalProcessedContacts,
            processedCompanies,
            message: `Background job completed successfully`
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Background smart tags processing error:', error);
        return new Response(JSON.stringify({ 
            error: 'Internal server error',
            details: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});

function getContactFieldValue(contact, field) {
    switch (field) {
        case 'status':
            return contact.status;
        case 'source':
            return contact.source;
        case 'company_name':
            return contact.company_name;
        case 'email':
            return contact.email;
        case 'phone':
            return contact.phone;
        case 'value':
            return contact.value || 0;
        case 'created_date':
            return contact.created_date;
        case 'last_contact_date':
            return contact.last_contact_date;
        case 'tags':
            return contact.tags || [];
        case 'first_name':
            return contact.first_name;
        case 'last_name':
            return contact.last_name;
        case 'position':
            return contact.position;
        default:
            return null;
    }
}

function evaluateCondition(contactValue, operator, conditionValue) {
    if (contactValue === null || contactValue === undefined) {
        return operator === 'is_empty' || operator === 'not_exists';
    }

    switch (operator) {
        case 'equals':
            return String(contactValue).toLowerCase() === String(conditionValue).toLowerCase();
        case 'not_equals':
            return String(contactValue).toLowerCase() !== String(conditionValue).toLowerCase();
        case 'contains':
            return String(contactValue).toLowerCase().includes(String(conditionValue).toLowerCase());
        case 'not_contains':
            return !String(contactValue).toLowerCase().includes(String(conditionValue).toLowerCase());
        case 'starts_with':
            return String(contactValue).toLowerCase().startsWith(String(conditionValue).toLowerCase());
        case 'ends_with':
            return String(contactValue).toLowerCase().endsWith(String(conditionValue).toLowerCase());
        case 'greater_than':
            return Number(contactValue) > Number(conditionValue);
        case 'less_than':
            return Number(contactValue) < Number(conditionValue);
        case 'greater_equal':
            return Number(contactValue) >= Number(conditionValue);
        case 'less_equal':
            return Number(contactValue) <= Number(conditionValue);
        case 'is_empty':
            return !contactValue || String(contactValue).trim() === '';
        case 'not_empty':
            return contactValue && String(contactValue).trim() !== '';
        case 'in_list':
            const listValues = String(conditionValue).split(',').map(v => v.trim().toLowerCase());
            return listValues.includes(String(contactValue).toLowerCase());
        case 'not_in_list':
            const listValues2 = String(conditionValue).split(',').map(v => v.trim().toLowerCase());
            return !listValues2.includes(String(contactValue).toLowerCase());
        case 'days_ago':
            const daysAgo = parseInt(conditionValue);
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() - daysAgo);
            const contactDate = new Date(contactValue);
            return contactDate <= targetDate;
        case 'days_ahead':
            const daysAhead = parseInt(conditionValue);
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + daysAhead);
            const contactFutureDate = new Date(contactValue);
            return contactFutureDate <= futureDate;
        default:
            return false;
    }
}

async function executeAction(action, contact, companyId) {
    try {
        switch (action.type) {
            case 'send_email':
                console.log(`Would send email to ${contact.email}: ${action.value}`);
                break;
            case 'add_note':
                const updatedNotes = contact.notes ? 
                    `${contact.notes}\n\n[Auto] ${action.value}` : 
                    `[Auto] ${action.value}`;
                
                await base44.entities.Contact.update(contact.id, {
                    notes: updatedNotes
                });
                break;
            case 'update_status':
                await base44.entities.Contact.update(contact.id, {
                    status: action.value
                });
                break;
            case 'assign_campaign':
                const campaignIds = contact.campaign_ids || [];
                if (!campaignIds.includes(action.value)) {
                    campaignIds.push(action.value);
                    await base44.entities.Contact.update(contact.id, {
                        campaign_ids: campaignIds
                    });
                }
                break;
            default:
                console.log(`Unknown action type: ${action.type}`);
        }
    } catch (error) {
        console.error(`Error executing action ${action.type}:`, error);
    }
}