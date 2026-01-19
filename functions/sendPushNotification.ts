import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ 
                success: false, 
                error: 'Unauthorized' 
            }, { status: 401 });
        }

        const { userId, title, body, deepLinkUrl, notificationType } = await req.json();

        if (!userId || !title || !body) {
            return Response.json({ 
                success: false, 
                error: 'userId, title e body são obrigatórios' 
            }, { status: 400 });
        }

        // Buscar configurações do Worker de notificação
        const notificationWorkerUrl = Deno.env.get("NOTIFICATION_WORKER_URL");
        const notificationWorkerApiKey = Deno.env.get("NOTIFICATION_WORKER_API_KEY");

        if (!notificationWorkerUrl || !notificationWorkerApiKey) {
            console.error('[sendPushNotification] URL ou API Key do Notification Worker não configurados.');
            return Response.json({ 
                success: false, 
                error: 'Configuração do servidor de notificação ausente.' 
            }, { status: 500 });
        }

        // Enviar para o Cloudflare Worker de notificações
        const response = await fetch(`${notificationWorkerUrl}/notify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${notificationWorkerApiKey}`
            },
            body: JSON.stringify({ 
                userId, 
                title, 
                body, 
                deepLinkUrl,
                notificationType,
                timestamp: Date.now()
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[sendPushNotification] Erro do Cloudflare Worker:', errorText);
            return Response.json({ 
                success: false, 
                error: `Falha ao enviar notificação: ${errorText}` 
            }, { status: response.status });
        }

        const result = await response.json();
        console.log('[sendPushNotification] ✅ Notificação enviada para processamento:', result);

        return Response.json({ 
            success: true, 
            message: 'Notificação enviada para processamento.',
            result 
        }, { status: 200 });

    } catch (error) {
        console.error('[sendPushNotification] Erro:', error);
        return Response.json({ 
            success: false, 
            error: 'Erro interno do servidor.',
            details: error.message 
        }, { status: 500 });
    }
});