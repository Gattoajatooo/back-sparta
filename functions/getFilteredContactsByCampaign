import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verificar autenticação
        const user = await base44.auth.me();
        if (!user?.company_id) {
            return Response.json({
                success: false,
                error: 'Não autenticado ou empresa não encontrada'
            }, { status: 401 });
        }

        const { schedule_id } = await req.json();

        if (!schedule_id) {
            return Response.json({
                success: false,
                error: 'schedule_id é obrigatório'
            }, { status: 400 });
        }

        console.log('═══════════════════════════════════════════════════');
        console.log('🔍 INÍCIO - Buscar contatos da campanha');
        console.log('   Schedule ID:', schedule_id);
        console.log('   Company ID:', user.company_id);
        console.log('═══════════════════════════════════════════════════');

        // STEP 1: Buscar a campanha
        console.log('\n📋 STEP 1: Buscando campanha...');
        const schedule = await base44.asServiceRole.entities.Schedule.get(schedule_id);
        
        if (!schedule) {
            console.log('❌ Campanha não encontrada');
            return Response.json({
                success: false,
                error: 'Campanha não encontrada'
            }, { status: 404 });
        }

        console.log('✅ Campanha encontrada:');
        console.log('   Nome:', schedule.name);
        console.log('   Status:', schedule.status);
        console.log('   Company ID:', schedule.company_id);
        console.log('   Total recipients:', schedule.total_recipients);
        console.log('   Recipients array length:', schedule.recipients?.length || 0);

        // Verificar se é da mesma empresa
        if (schedule.company_id !== user.company_id) {
            console.log('⚠️ Company ID não corresponde');
            return Response.json({
                success: false,
                error: 'Acesso negado a esta campanha'
            }, { status: 403 });
        }

        // STEP 2: Extrair contact IDs do recipients
        console.log('\n👥 STEP 2: Extraindo contact IDs dos recipients...');
        
        if (!schedule.recipients || schedule.recipients.length === 0) {
            console.log('⚠️ Campanha não possui recipients');
            return Response.json({
                success: true,
                contacts: [],
                total_contacts: 0,
                debug: {
                    schedule_has_recipients: false,
                    recipients_count: 0
                }
            });
        }

        const contactIds = schedule.recipients
            .map(r => r.contact_id)
            .filter(Boolean);

        const uniqueContactIds = [...new Set(contactIds)];
        
        console.log(`   Total recipients: ${schedule.recipients.length}`);
        console.log(`   Contact IDs únicos: ${uniqueContactIds.length}`);
        console.log(`   Primeiros IDs: ${uniqueContactIds.slice(0, 5).join(', ')}`);

        if (uniqueContactIds.length === 0) {
            console.log('⚠️ Nenhum contact_id válido encontrado nos recipients');
            return Response.json({
                success: true,
                contacts: [],
                total_contacts: 0,
                debug: {
                    schedule_has_recipients: true,
                    recipients_count: schedule.recipients.length,
                    valid_contact_ids: 0
                }
            });
        }

        // STEP 3: Buscar contatos ativos
        console.log('\n📞 STEP 3: Buscando contatos ativos...');
        
        const contacts = await base44.asServiceRole.entities.Contact.filter({
            id: { $in: uniqueContactIds },
            company_id: user.company_id,
            deleted: { $ne: true }  // Apenas contatos não deletados
        });

        console.log(`✅ ${contacts.length} contatos ativos encontrados`);

        // Verificar contatos faltantes
        if (contacts.length < uniqueContactIds.length) {
            const foundIds = new Set(contacts.map(c => c.id));
            const missingIds = uniqueContactIds.filter(id => !foundIds.has(id));
            console.log(`⚠️ ${missingIds.length} contatos não encontrados (podem estar deletados ou não existir)`);
            console.log(`   IDs faltantes (primeiros 5): ${missingIds.slice(0, 5).join(', ')}`);
        }

        console.log('═══════════════════════════════════════════════════');
        console.log('✅ FIM - Retornando resultado');
        console.log(`   Total de contatos ativos: ${contacts.length}`);
        console.log('═══════════════════════════════════════════════════\n');

        return Response.json({
            success: true,
            contacts: contacts,
            total_contacts: contacts.length,
            debug: {
                schedule_recipients: schedule.recipients.length,
                unique_contact_ids: uniqueContactIds.length,
                contacts_found: contacts.length,
                contacts_missing: uniqueContactIds.length - contacts.length
            }
        });

    } catch (error) {
        console.error('❌❌❌ ERRO FATAL:', error);
        console.error('Stack:', error.stack);
        return Response.json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message,
            stack: error.stack
        }, { status: 500 });
    }
});