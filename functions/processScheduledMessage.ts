
import { createClient } from 'npm:@base44/sdk@0.1.0';

const base44 = createClient({
    appId: Deno.env.get('BASE44_APP_ID'),
});

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getRandomDelay(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

interface Settings {
    respect_business_hours?: boolean;
    skip_weekends?: boolean;
    start_hour?: number;
    end_hour?: number;
}

function isBusinessHours(settings: Settings): boolean {
    if (!settings.respect_business_hours) return true;
    
    const now = new Date();
    const brTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const hour = brTime.getHours();
    const day = brTime.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Check weekends
    if (settings.skip_weekends && (day === 0 || day === 6)) {
        return false;
    }
    
    // Check business hours
    return (hour >= (settings.start_hour ?? 0) && hour < (settings.end_hour ?? 24));
}

interface Session {
    id: string;
    session_name: string;
    // ... other session properties
}

function getSessionForRecipient(selectedSessions: string[], sessionStrategy: string, recipient: any, recipientIndex: number): string | null {
    if (selectedSessions.length === 0) return null;
    if (selectedSessions.length === 1) return selectedSessions[0];
    
    switch (sessionStrategy) {
        case 'sequential':
            return selectedSessions[recipientIndex % selectedSessions.length];
            
        case 'random':
            const randomIndex = Math.floor(Math.random() * selectedSessions.length);
            return selectedSessions[randomIndex];
            
        case 'intelligent':
            // TODO: Implementar lógica inteligente baseada no histórico
            // Por enquanto, usa sequencial como fallback
            return selectedSessions[recipientIndex % selectedSessions.length];
            
        default:
            return selectedSessions[0];
    }
}

function getTemplateForRecipient(templateOrder: string[], messageSequenceType: string, recipientIndex: number): string | null {
    if (templateOrder.length === 0) return null;
    if (templateOrder.length === 1) return templateOrder[0];
    
    switch (messageSequenceType) {
        case 'sequential':
            return templateOrder[recipientIndex % templateOrder.length];
            
        case 'random':
            const randomIndex = Math.floor(Math.random() * templateOrder.length);
            return templateOrder[randomIndex];
            
        default:
            return templateOrder[0];
    }
}

interface MessageTemplate {
    id: string;
    content: string;
    attachments?: Array<{
        type: 'image' | 'video' | 'file' | 'audio';
        url: string;
        mimetype?: string;
        filename?: string;
    }>;
}

interface SendMessageResult {
    success: boolean;
    error?: string;
    [key: string]: any;
}

async function sendMessageWithTemplate(templateId: string, sessionId: string, recipient: { phone: string; contact_id?: string }, contactId?: string): Promise<SendMessageResult> {
    try {
        // Buscar o template
        const template: MessageTemplate | undefined = await base44.entities.MessageTemplate.get(templateId);
        if (!template) {
            throw new Error(`Template ${templateId} not found`);
        }

        // Buscar a sessão
        const session: Session | undefined = await base44.entities.Session.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        // Preparar dados da mensagem
        const messageData = {
            phone: recipient.phone,
            sessionName: session.session_name,
            contactId: contactId
        };

        // Verificar se o template tem anexos ou é apenas texto
        const hasAttachments = template.attachments && template.attachments.length > 0;
        
        if (hasAttachments) {
            // Enviar mensagem com anexo
            const attachment = template.attachments![0]; // Usar primeiro anexo
            
            switch (attachment.type) {
                case 'image':
                    const { sendImage } = await import('./sendImage.js');
                    return await sendImage({
                        ...messageData,
                        file: {
                            url: attachment.url,
                            mimetype: attachment.mimetype || 'image/jpeg',
                            filename: attachment.filename || 'image.jpg'
                        },
                        caption: template.content || ''
                    });
                    
                case 'video':
                    const { sendVideo } = await import('./sendVideo.js');
                    return await sendVideo({
                        ...messageData,
                        file: {
                            url: attachment.url,
                            mimetype: attachment.mimetype || 'video/mp4',
                            filename: attachment.filename || 'video.mp4'
                        },
                        caption: template.content || ''
                    });
                    
                case 'file':
                case 'audio':
                    const { sendFile } = await import('./sendFile.js');
                    return await sendFile({
                        ...messageData,
                        file: {
                            url: attachment.url,
                            filename: attachment.filename || 'file'
                        }
                    });
                    
                default:
                    // Fallback para texto se tipo não reconhecido
                    const { sendText } = await import('./sendText.js');
                    return await sendText({
                        ...messageData,
                        text: template.content || ''
                    });
            }
        } else {
            // Enviar apenas texto
            const { sendText } = await import('./sendText.js');
            return await sendText({
                ...messageData,
                text: template.content || ''
            });
        }
        
    } catch (error: any) {
        console.error('Error sending message with template:', error);
        return { success: false, error: error.message };
    }
}

interface Recipient {
    phone: string;
    contact_id: string;
    status?: 'pending' | 'sent' | 'failed';
    sent_at?: string;
    error_message?: string;
    session_used?: string;
    template_used?: string;
}

interface Schedule {
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    started_at?: string;
    completed_at?: string;
    error_details?: string;
    selected_sessions: string[];
    template_order: string[];
    recipients: Recipient[];
    session_sending_strategy: 'sequential' | 'random' | 'intelligent';
    message_sequence_type: 'sequential' | 'random';
    delivery_settings?: {
        respect_business_hours?: boolean;
        skip_weekends?: boolean;
        start_hour?: number;
        end_hour?: number;
        interval_type?: 'fixed' | 'random';
        interval_fixed?: number;
        interval_random_min?: number;
        interval_random_max?: number;
    };
    sent_count?: number;
    failed_count?: number;
}

export default async function handler(req: Request): Promise<Response> {
    try {
        const { schedule_id } = await req.json();
        
        if (!schedule_id) {
            return new Response(JSON.stringify({ error: 'Schedule ID is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get schedule details
        const schedule: Schedule | undefined = await base44.entities.Schedule.get(schedule_id);
        if (!schedule) {
            return new Response(JSON.stringify({ error: 'Schedule not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Check if already processing
        if (schedule.status === 'processing') {
            return new Response(JSON.stringify({ error: 'Schedule already processing' }), {
                status: 409,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Update status to processing
        await base44.entities.Schedule.update(schedule_id, {
            status: 'processing',
            started_at: new Date().toISOString() // Data de início (UTC sem alteração)
        });

        // Verificar se tem sessões selecionadas
        if (!schedule.selected_sessions || schedule.selected_sessions.length === 0) {
            await base44.entities.Schedule.update(schedule_id, {
                status: 'failed',
                error_details: 'No sessions selected for this schedule',
                completed_at: new Date().toISOString() // Data de conclusão com erro (UTC sem alteração)
            });
            
            return new Response(JSON.stringify({ error: 'No sessions selected' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Verificar se tem templates selecionados
        if (!schedule.template_order || schedule.template_order.length === 0) {
            await base44.entities.Schedule.update(schedule_id, {
                status: 'failed',
                error_details: 'No templates selected for this schedule',
                completed_at: new Date().toISOString() // Data de conclusão com erro (UTC sem alteração)
            });
            
            return new Response(JSON.stringify({ error: 'No templates selected' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const settings = schedule.delivery_settings || {};
        let sentCount = 0;
        let failedCount = 0;
        const updatedRecipients: Recipient[] = [];

        // Process recipients
        for (let i = 0; i < schedule.recipients.length; i++) {
            const recipient = schedule.recipients[i];
            
            // Check business hours for each send
            if (!isBusinessHours(settings)) {
                console.log('Outside business hours, stopping processing');
                // If business hours are not respected, mark remaining as failed or pending based on logic.
                // For now, we'll break and update status.
                break; 
            }

            try {
                // Determinar qual sessão usar
                const selectedSessionId = getSessionForRecipient(
                    schedule.selected_sessions,
                    schedule.session_sending_strategy,
                    recipient,
                    i
                );

                // Determinar qual template usar
                const selectedTemplateId = getTemplateForRecipient(
                    schedule.template_order,
                    schedule.message_sequence_type,
                    i
                );

                if (!selectedSessionId || !selectedTemplateId) {
                    throw new Error('Failed to select session or template');
                }

                // Enviar mensagem usando template e sessão selecionados
                const result = await sendMessageWithTemplate(
                    selectedTemplateId,
                    selectedSessionId,
                    recipient,
                    recipient.contact_id
                );

                if (result && result.success) {
                    updatedRecipients.push({
                        ...recipient,
                        status: 'sent',
                        sent_at: new Date().toISOString(),
                        session_used: selectedSessionId,
                        template_used: selectedTemplateId
                    });
                    sentCount++;
                } else {
                    updatedRecipients.push({
                        ...recipient,
                        status: 'failed',
                        error_message: result?.error || 'Unknown error',
                        session_used: selectedSessionId,
                        template_used: selectedTemplateId
                    });
                    failedCount++;
                }

            } catch (error: any) {
                console.error(`Error sending to ${recipient.phone}:`, error);
                updatedRecipients.push({
                    ...recipient,
                    status: 'failed',
                    error_message: error.message
                });
                failedCount++;
            }

            // Apply delay between messages (except for last message)
            if (i < schedule.recipients.length - 1) {
                let delay: number;
                if (settings.interval_type === 'random') {
                    delay = getRandomDelay(
                        settings.interval_random_min || 1000,
                        settings.interval_random_max || 10000
                    );
                } else {
                    delay = settings.interval_fixed || 3000;
                }
                
                await sleep(delay);
            }

            // Update progress every 10 messages (or at the end)
            if ((i + 1) % 10 === 0 || (i + 1) === schedule.recipients.length) {
                await base44.entities.Schedule.update(schedule_id, {
                    recipients: updatedRecipients,
                    sent_count: sentCount,
                    failed_count: failedCount
                });
            }
        }

        // Final update
        const finalStatus = failedCount === schedule.recipients.length ? 'failed' : 'completed';
        
        await base44.entities.Schedule.update(schedule_id, {
            status: finalStatus,
            recipients: updatedRecipients,
            sent_count: sentCount,
            failed_count: failedCount,
            completed_at: new Date().toISOString() // Data de conclusão (UTC sem alteração)
        });

        return new Response(JSON.stringify({
            success: true,
            schedule_id,
            status: finalStatus,
            sent_count: sentCount,
            failed_count: failedCount,
            total_recipients: schedule.recipients.length
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error('Error processing scheduled message:', error);
        return new Response(JSON.stringify({
            error: 'Internal server error',
            details: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

Deno.serve(handler);
