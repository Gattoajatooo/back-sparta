import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        // Validar autenticação via Bearer token (apenas o Cloudflare Worker pode chamar)
        const authHeader = req.headers.get('Authorization');
        const expectedToken = `Bearer ${Deno.env.get('BASE44_NOTIFICATION_KEY')}`;
        
        if (!authHeader || authHeader !== expectedToken) {
            console.error('[getPushToken] Tentativa de acesso não autorizado');
            return Response.json({ 
                success: false, 
                error: 'Unauthorized' 
            }, { status: 401 });
        }

        const { userId } = await req.json();

        if (!userId) {
            return Response.json({ 
                success: false, 
                error: 'userId é obrigatório' 
            }, { status: 400 });
        }

        // Usar service role para buscar o usuário (não há contexto de usuário autenticado aqui)
        const base44 = createClientFromRequest(req);
        const targetUser = await base44.asServiceRole.entities.User.get(userId);

        if (!targetUser) {
            console.log(`[getPushToken] Usuário ${userId} não encontrado`);
            return Response.json({ 
                success: false, 
                error: 'Usuário não encontrado' 
            }, { status: 404 });
        }

        // Retornar o pushSubscription se existir
        if (!targetUser.pushSubscription || !targetUser.pushSubscription.endpoint) {
            console.log(`[getPushToken] Usuário ${userId} não possui pushSubscription ativa`);
            return Response.json({ 
                success: false, 
                error: 'Push subscription não encontrada' 
            }, { status: 404 });
        }

        // Verificar preferências de notificação
        const preferences = targetUser.notificationPreferences || { enabled: true };

        console.log(`[getPushToken] ✅ Push token encontrado para usuário ${userId}`);

        return Response.json({ 
            success: true,
            pushSubscription: targetUser.pushSubscription,
            preferences: preferences,
            user: {
                id: targetUser.id,
                email: targetUser.email,
                full_name: targetUser.full_name
            }
        }, { status: 200 });

    } catch (error) {
        console.error('[getPushToken] Erro:', error);
        return Response.json({ 
            success: false, 
            error: 'Erro interno do servidor',
            details: error.message 
        }, { status: 500 });
    }
});