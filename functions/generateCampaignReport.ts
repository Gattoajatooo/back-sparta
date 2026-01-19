
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';
import { jsPDF } from 'npm:jspdf@2.5.1';
import 'npm:jspdf-autotable@3.8.2';
// O XLSX não é mais necessário, será removido

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const { schedule_id, format } = await req.json();

        if (!schedule_id || !format) {
            return new Response(JSON.stringify({ error: 'Schedule ID and format are required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Buscar dados da campanha
        const schedule = await base44.entities.Schedule.get(schedule_id);
        if (!schedule) {
            return new Response(JSON.stringify({ error: 'Campaign not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Buscar mensagens relacionadas ANTES de checar o status
        const messages = await base44.entities.Message.filter({ 
            company_id: user.company_id,
            schedule_id: schedule_id 
        });

        // Calcular contagens reais para uma checagem robusta
        const totalRecipients = messages.length;
        const successMessages = messages.filter(m => m.status === 'success' || m.status === 'delivered');
        const failedMessages = messages.filter(m => m.status === 'failed' || m.status === 'error');
        const totalProcessed = successMessages.length + failedMessages.length;

        // A campanha é considerada "concluída" se o status no BD for 'completed'
        // OU se todos os destinatários esperados já foram processados.
        const isEffectivelyComplete = (totalRecipients > 0 && totalProcessed >= totalRecipients);

        // A checagem de status agora usa a lógica aprimorada
        if (schedule.status !== 'completed' && !isEffectivelyComplete) {
            return new Response(JSON.stringify({ error: 'Aguarde a conclusão de todos os envios para baixar o relatório.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Buscar contatos relacionados
        const contactIds = [...new Set(messages.map(m => m.contact_id).filter(Boolean))];
        let contacts = [];
        if (contactIds.length > 0) {
            contacts = await base44.entities.Contact.filter({ id: { $in: contactIds } });
        }
        
        // Mapear contatos por ID para fácil acesso
        const contactMap = new Map(contacts.map(c => [c.id, c]));

        // Determinar status da campanha baseado nos envios
        let campaignStatus = schedule.status;
        if (messages.length > 0) {
            if (successMessages.length > 0) {
                campaignStatus = 'success'; // Pelo menos um sucesso
            } else if (failedMessages.length > 0) {
                campaignStatus = 'failed'; // Só falhas
            }
        }

        const templateIds = schedule.template_ids || schedule.selected_templates || [];
        const templates = await Promise.all(templateIds.map(id => base44.entities.MessageTemplate.get(id).catch(() => null)));
        
        const sessionNames = schedule.selected_sessions || [];
        let sessions = [];
        if (sessionNames.length > 0) {
             sessions = await base44.entities.Session.filter({ company_id: user.company_id, session_name: { $in: sessionNames } }).catch(() => []);
        }

        const reportData = {
            campaign: {
                name: schedule.name || 'N/A',
                status: getStatusText(campaignStatus),
                channel: getChannelText(schedule.message_type),
                created_date: schedule.created_date,
                scheduled_date: schedule.scheduled_date,
                total_recipients: totalRecipients,
                sent_count: successMessages.length,
                failed_count: failedMessages.length,
                delivery_settings: schedule.delivery_settings || {},
                session_strategy: getStrategyText(schedule.session_sending_strategy),
            },
            messages: messages || [],
            templates: templates.filter(Boolean),
            sessions: sessions,
            contactMap
        };

        if (format === 'csv') {
            return generateCsvReport(reportData);
        } else if (format === 'pdf') {
            return generatePDFReport(reportData);
        } else {
            return new Response(JSON.stringify({ error: 'Invalid format. Use "csv" or "pdf"' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

    } catch (error) {
        console.error('Error generating report:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});

// ############ FUNÇÕES HELPER ############
function getStatusText(status) {
    const statusMap = {
        pending: 'Agendada',
        processing: 'Enviando',
        completed: 'Concluída',
        failed: 'Falhou',
        cancelled: 'Cancelada',
        success: 'Sucesso', // Status dinâmico
        delivered: 'Entregue',
        error: 'Erro'
    };
    return statusMap[status] || status;
}

function getChannelText(type) { return type === 'whatsapp' ? 'WhatsApp' : (type || ''); }
function getStrategyText(strategy) {
    const map = { sequential: 'Sequencial', random: 'Aleatório', smart: 'Inteligente' };
    return map[strategy] || '';
}

function formatDate(dateString, includeSeconds = false) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        
        const options = {
            timeZone: 'America/Sao_Paulo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            ...(includeSeconds && { second: '2-digit' })
        };
        
        let formatted = new Intl.DateTimeFormat('pt-BR', options).format(date);
        return formatted.replace(', ', ' ');

    } catch (e) {
        return '';
    }
}

function formatPhoneNumber(phone) {
    if (!phone) return '';
    const cleanPhone = String(phone).replace(/\D/g, '');
    if (cleanPhone.length >= 11) {
        const country = cleanPhone.length > 11 ? `+${cleanPhone.slice(0, -11)} ` : '';
        const area = cleanPhone.slice(-11, -9);
        const firstPart = cleanPhone.slice(-9, -4);
        const secondPart = cleanPhone.slice(-4);
        return `${country}(${area}) ${firstPart}-${secondPart}`;
    }
    return phone;
}

function getSpeedModeText(speedMode) {
    const speedMap = {
        'aggressive': 'Agressivo',
        'moderate': 'Moderado', 
        'conservative': 'Conservador'
    };
    return speedMap[speedMode] || '';
}

function cleanTextForPDF(text) {
    if (!text) return '';
    if (text === 'N/A') return '';
    
    return String(text)
        .normalize('NFD').replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w\s\-.,;:()%]/g, ' ')
        .replace(/\s+/g, ' ').trim();
}

// ############ GERAÇÃO DE CSV ############
function generateCsvReport(data) {
    // Criar dados dos destinatários para CSV
    const recipientData = [];
    
    // Cabeçalho do CSV
    recipientData.push([
        'Nome',
        'Telefone', 
        'Data de Envio',
        'Status',
        'Erro'
    ]);

    // Dados dos destinatários
    data.messages.forEach(message => {
        const contact = data.contactMap.get(message.contact_id);
        const fullName = contact ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim() : 'Contato não encontrado';
        // Check if message.created_at is a Unix timestamp (seconds) and convert to ISO string for formatDate
        const sentDate = message.created_at ? formatDate(new Date(message.created_at * 1000).toISOString(), true) : '';
        const phone = contact?.phone ? formatPhoneNumber(contact.phone) : '';
        const status = getStatusText(message.status);
        const error = cleanTextForPDF(message.error_details || '');

        recipientData.push([
            cleanTextForPDF(fullName),
            cleanTextForPDF(phone),
            cleanTextForPDF(sentDate),
            cleanTextForPDF(status),
            error
        ]);
    });

    // Converter para CSV
    const csvContent = recipientData.map(row => 
        row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const encoder = new TextEncoder();
    const csvBytes = encoder.encode('\ufeff' + csvContent); // BOM para UTF-8

    return new Response(csvBytes, {
        status: 200,
        headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="relatorio_campanha_${data.campaign.name.replace(/[^a-zA-Z0-9]/g, '_')}.csv"`
        }
    });
}

// ############ GERAÇÃO DE PDF ############
function generatePDFReport(data) {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;

    // Cabeçalho
    doc.setFillColor(245, 124, 0);
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text('SPARTA SYNC', 15, 20);
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text(cleanTextForPDF('Relatório de Campanha'), 15, 28);

    doc.setTextColor(0, 0, 0);
    yPosition = 50;

    // Título da Campanha
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(cleanTextForPDF(`Campanha: ${data.campaign.name}`), 15, yPosition);
    yPosition += 15;

    // Seção de Informações
    doc.setFillColor(240, 240, 240);
    doc.rect(15, yPosition - 5, pageWidth - 30, 8, 'F');
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('INFORMACOES GERAIS', 15, yPosition);
    yPosition += 10;
    
    const generalInfo = [
        ['Status:', data.campaign.status],
        ['Canal:', data.campaign.channel],
        ['Data de Criacao:', formatDate(data.campaign.created_date)],
        ['Data Agendada:', formatDate(data.campaign.scheduled_date)]
    ];
    doc.setFontSize(10);
    generalInfo.forEach(([label, value]) => {
        doc.setFont(undefined, 'bold');
        doc.text(cleanTextForPDF(label), 15, yPosition);
        doc.setFont(undefined, 'normal');
        doc.text(cleanTextForPDF(value), 60, yPosition);
        yPosition += 7;
    });
    yPosition += 5;

    // Estatísticas
    doc.setFillColor(240, 240, 240);
    doc.rect(15, yPosition - 5, pageWidth - 30, 8, 'F');
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('ESTATISTICAS', 15, yPosition);
    yPosition += 10;
    
    const successRate = data.campaign.total_recipients > 0 ? `${((data.campaign.sent_count / data.campaign.total_recipients) * 100).toFixed(1)}%` : '0.0%';
    const statistics = [
        ['Total de Destinatarios:', String(data.campaign.total_recipients)],
        ['Mensagens Enviadas:', String(data.campaign.sent_count)],
        ['Mensagens Falharam:', String(data.campaign.failed_count)],
        ['Taxa de Sucesso:', successRate]
    ];
    doc.setFontSize(10);
    statistics.forEach(([label, value]) => {
        doc.setFont(undefined, 'bold');
        doc.text(cleanTextForPDF(label), 15, yPosition);
        doc.setFont(undefined, 'normal');
        doc.text(cleanTextForPDF(value), 60, yPosition);
        yPosition += 7;
    });
    yPosition += 5;

    // Configurações de Envio
    doc.setFillColor(240, 240, 240);
    doc.rect(15, yPosition - 5, pageWidth - 30, 8, 'F');
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('CONFIGURACOES DE ENVIO', 15, yPosition);
    yPosition += 10;
    
    const deliverySettings = [
        ['Estrategia de Sessoes:', data.campaign.session_strategy],
        ['Velocidade:', getSpeedModeText(data.campaign.delivery_settings.speed_mode)],
        ['Horario Comercial:', data.campaign.delivery_settings.respect_business_hours ? 'Sim' : 'Nao']
    ];
    doc.setFontSize(10);
    deliverySettings.forEach(([label, value]) => {
        doc.setFont(undefined, 'bold');
        doc.text(cleanTextForPDF(label), 15, yPosition);
        doc.setFont(undefined, 'normal');
        doc.text(cleanTextForPDF(value), 60, yPosition);
        yPosition += 7;
    });
    yPosition += 5;

    // Sessões Utilizadas
    doc.setFillColor(240, 240, 240);
    doc.rect(15, yPosition - 5, pageWidth - 30, 8, 'F');
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('SESSOES UTILIZADAS', 15, yPosition);
    yPosition += 10;
    doc.setFontSize(10);
    data.sessions.forEach(session => {
        doc.text(cleanTextForPDF(formatPhoneNumber(session.phone)), 15, yPosition);
        yPosition += 7;
    });
    yPosition += 5;

    // DESTINATÁRIOS
    if (data.messages && data.messages.length > 0) {
        // Verificar se precisa de nova página
        if (yPosition > pageHeight - 50) {
            doc.addPage();
            yPosition = 20;
        }

        doc.setFillColor(240, 240, 240);
        doc.rect(15, yPosition - 5, pageWidth - 30, 8, 'F');
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('DETALHES DE ENVIO', 15, yPosition);
        yPosition += 15; // Adjusted spacing based on outline

        // Preparar dados dos destinatários
        const recipientRows = data.messages.map(message => {
            const contact = data.contactMap.get(message.contact_id);
            const fullName = contact ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim() : 'Contato não encontrado';
            const phone = contact?.phone ? formatPhoneNumber(contact.phone) : '';
            // Check if message.created_at is a Unix timestamp (seconds) and convert to ISO string for formatDate
            const sentDate = message.created_at ? formatDate(new Date(message.created_at * 1000).toISOString(), true) : '';
            const status = getStatusText(message.status);
            const error = cleanTextForPDF(message.error_details || '');

            return [
                cleanTextForPDF(fullName),
                cleanTextForPDF(phone),
                cleanTextForPDF(sentDate),
                cleanTextForPDF(status),
                error
            ];
        });

        // Criar tabela de destinatários
        doc.autoTable({
            head: [['Nome', 'Telefone', 'Data de Envio', 'Status', 'Erro']],
            body: recipientRows,
            startY: yPosition,
            styles: {
                fontSize: 8,
                cellPadding: 2,
            },
            headStyles: {
                fillColor: [245, 124, 0],
                textColor: [255, 255, 255],
                fontStyle: 'bold'
            },
            columnStyles: {
                0: { cellWidth: 35 }, // Nome
                1: { cellWidth: 35 }, // Telefone
                2: { cellWidth: 35 }, // Data de Envio
                3: { cellWidth: 25 }, // Status
                4: { cellWidth: 50 }  // Erro
            },
            margin: { left: 15, right: 15 }
        });
    }

    // Gerar PDF e retornar
    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
        status: 200,
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="relatorio_campanha_${data.campaign.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`
        }
    });
}
