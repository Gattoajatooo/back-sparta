import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        console.log('[getNotifications] User ID:', user?.id);

        if (!user || !user.id) {
            console.log('[getNotifications] Unauthorized - no user');
            return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { unread_only = false, limit = 20, offset = 0 } = await req.json().catch(() => ({}));
        
        console.log('[getNotifications] Params:', { unread_only, limit, offset, user_id: user.id });

        // Buscar TODAS as notificações do usuário usando service role (bypass RLS)
        const allNotifications = await base44.asServiceRole.entities.Notification.filter(
            { user_id: user.id },
            '-created_date'
        );
        
        console.log('[getNotifications] Total notifications found:', allNotifications.length);

        // Filtrar por não lidas se solicitado
        let filteredNotifications = allNotifications;
        if (unread_only) {
            filteredNotifications = allNotifications.filter(n => !n.read);
        }

        // Ordenar: não lidas primeiro, depois lidas, todas por data decrescente
        filteredNotifications.sort((a, b) => {
            // Não lidas antes das lidas
            if (!a.read && b.read) return -1;
            if (a.read && !b.read) return 1;
            
            // Dentro do mesmo grupo (lida/não lida), ordena por data (mais recente primeiro)
            const aDate = new Date(a.created_date || 0).getTime();
            const bDate = new Date(b.created_date || 0).getTime();
            return bDate - aDate;
        });

        // Aplicar paginação
        const paginatedNotifications = filteredNotifications.slice(offset, offset + limit);

        // Contar não lidas
        const unreadCount = allNotifications.filter(n => !n.read).length;

        console.log('[getNotifications] Returning:', {
            notifications_count: paginatedNotifications.length,
            unread_count: unreadCount,
            total: filteredNotifications.length
        });

        return Response.json({
            success: true,
            notifications: paginatedNotifications,
            unread_count: unreadCount,
            total: filteredNotifications.length,
            has_more: offset + limit < filteredNotifications.length
        });

    } catch (error) {
        console.error('[getNotifications] Error:', error);
        console.error('[getNotifications] Stack:', error.stack);
        return Response.json({
            success: false,
            error: 'Internal server error',
            details: error.message
        }, { status: 500 });
    }
});