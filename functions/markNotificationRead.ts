import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || !user.company_id) {
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { notification_id, mark_all = false } = await req.json();

        if (mark_all) {
            // Marcar todas como lidas
            const notifications = await base44.entities.Notification.filter({
                user_id: user.id,
                read: false
            });

            const updatePromises = notifications.map(n => 
                base44.entities.Notification.update(n.id, {
                    read: true,
                    read_at: new Date().toISOString()
                })
            );

            await Promise.all(updatePromises);

            return Response.json({
                success: true,
                marked_count: notifications.length
            });
        }

        if (!notification_id) {
            return Response.json({ 
                success: false, 
                error: 'notification_id is required' 
            }, { status: 400 });
        }

        // Buscar notificação
        const notification = await base44.entities.Notification.get(notification_id);

        if (!notification) {
            return Response.json({ 
                success: false, 
                error: 'Notification not found' 
            }, { status: 404 });
        }

        // Verificar se pertence ao usuário
        if (notification.user_id !== user.id) {
            return Response.json({ 
                success: false, 
                error: 'Access denied' 
            }, { status: 403 });
        }

        // Atualizar como lida
        await base44.entities.Notification.update(notification_id, {
            read: true,
            read_at: new Date().toISOString()
        });

        return Response.json({
            success: true,
            notification_id: notification_id
        });

    } catch (error) {
        console.error('Erro ao marcar notificação:', error);
        return Response.json({
            success: false,
            error: 'Internal server error',
            details: error.message
        }, { status: 500 });
    }
});