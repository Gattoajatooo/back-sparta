import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Worker que verifica lotes pendentes e cria notificações em:
 * - 24 horas antes do envio
 * - 3 horas antes do envio
 * - 1 hora antes do envio
 * Deve ser chamado periodicamente (ex: a cada 30 minutos) via cron job externo
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Verificar autenticação (pode ser service role ou usuário admin)
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        console.log('\n🔔 ========== VERIFICANDO LOTES EXPIRANDO ==========');
        const now = Date.now();
        
        // Definir janelas de tempo para notificações
        const HOUR = 60 * 60 * 1000;
        const windows = [
            { hours: 24, priority: 'normal', label: '24h', minHours: 23.5 },
            { hours: 3, priority: 'high', label: '3h', minHours: 2.5 },
            { hours: 1, priority: 'urgent', label: '1h', minHours: 0.5 }
        ];

        // Buscar todos os lotes pendentes
        const pendingBatches = await base44.asServiceRole.entities.BatchSchedule.filter({
            status: 'pending'
        });

        console.log(`📦 ${pendingBatches.length} lotes pendentes encontrados`);

        const notificationsCreated = [];
        const summary = { '24h': 0, '3h': 0, '1h': 0 };

        for (const batch of pendingBatches) {
            if (!batch.run_at || batch.run_at <= now) continue;

            const hoursUntilExpiry = (batch.run_at - now) / HOUR;

            // Verificar cada janela de notificação
            for (const window of windows) {
                // Verificar se está dentro da janela (ex: entre 23.5h e 24h para notificação de 24h)
                if (hoursUntilExpiry <= window.hours && hoursUntilExpiry > window.minHours) {
                    
                    // Verificar se já existe notificação para este lote E esta janela
                    const existingNotifications = await base44.asServiceRole.entities.Notification.filter({
                        'metadata.batch_id': batch.id,
                        'metadata.notification_window': window.label,
                        type: 'batch_expiring'
                    });

                    if (existingNotifications.length > 0) {
                        console.log(`⏭️ Notificação ${window.label} já existe para lote ${batch.id}`);
                        continue;
                    }

                    // Buscar informações do schedule pai
                    let scheduleName = 'Campanha';
                    try {
                        const schedule = await base44.asServiceRole.entities.Schedule.get(batch.schedule_id);
                        if (schedule) {
                            scheduleName = schedule.name || 'Campanha';
                        }
                    } catch (error) {
                        console.warn(`Não foi possível buscar schedule ${batch.schedule_id}`);
                    }

                    // Formatar data de expiração
                    const expirationDate = new Date(batch.run_at);
                    const formattedDate = expirationDate.toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });

                    // Definir título e emoji baseado na urgência
                    let title, emoji;
                    if (window.hours === 1) {
                        emoji = '🚨';
                        title = `${emoji} URGENTE: Campanha expira em menos de 1 hora!`;
                    } else if (window.hours === 3) {
                        emoji = '⚠️';
                        title = `${emoji} Campanha expira em menos de 3 horas`;
                    } else {
                        emoji = '⏰';
                        title = `${emoji} Campanha pendente de aprovação`;
                    }

                    const hoursRemaining = Math.round(hoursUntilExpiry);
                    const minutesRemaining = Math.round(hoursUntilExpiry * 60);

                    let timeText;
                    if (hoursUntilExpiry < 1) {
                        timeText = `${minutesRemaining} minutos`;
                    } else {
                        timeText = `${hoursRemaining} hora${hoursRemaining > 1 ? 's' : ''}`;
                    }

                    // Criar notificação
                    const notification = await base44.asServiceRole.entities.Notification.create({
                        company_id: batch.company_id,
                        type: 'batch_expiring',
                        title: title,
                        message: `O lote ${batch.batch_number || 1} da campanha "${scheduleName}" expira em ${timeText} (${formattedDate}). Aprove ou negue antes que expire.`,
                        priority: window.priority,
                        action_url: `/Campaign?schedule_id=${batch.schedule_id}`,
                        metadata: {
                            schedule_id: batch.schedule_id,
                            batch_id: batch.id,
                            expires_at: batch.run_at,
                            batch_number: batch.batch_number,
                            recipient_count: batch.recipient_count || batch.recipients?.length || 0,
                            notification_window: window.label
                        }
                    });

                    notificationsCreated.push(notification);
                    summary[window.label]++;
                    console.log(`✅ Notificação ${window.label} criada para lote ${batch.id} (expira em ${timeText})`);
                    
                    // Só criar uma notificação por lote por execução
                    break;
                }
            }
        }

        console.log(`\n📊 Resumo:`);
        console.log(`   - Notificações 24h: ${summary['24h']}`);
        console.log(`   - Notificações 3h: ${summary['3h']}`);
        console.log(`   - Notificações 1h: ${summary['1h']}`);
        console.log(`   - Total criadas: ${notificationsCreated.length}`);

        return Response.json({
            success: true,
            checked_at: new Date().toISOString(),
            total_pending_batches: pendingBatches.length,
            notifications_created: notificationsCreated.length,
            summary: summary,
            notifications: notificationsCreated.map(n => ({
                id: n.id,
                batch_id: n.metadata?.batch_id,
                window: n.metadata?.notification_window,
                priority: n.priority,
                message: n.message
            }))
        });

    } catch (error) {
        console.error('❌ Erro ao verificar lotes:', error);
        return Response.json({
            success: false,
            error: 'Internal server error',
            details: error.message
        }, { status: 500 });
    }
});