import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verificar autenticação
        if (!(await base44.auth.isAuthenticated())) {
            return Response.json({ error: 'Usuário não autenticado' }, { status: 401 });
        }

        const user = await base44.auth.me();
        if (user.role !== 'admin') {
            return Response.json({ error: 'Apenas administradores podem enviar notificações do sistema.' }, { status: 403 });
        }

        const { title, message, category, target_type, target_company_id, target_user_id } = await req.json();

        if (!title || !message || !category) {
            return Response.json({ error: 'Título, mensagem e categoria são obrigatórios.' }, { status: 400 });
        }

        let users = [];

        // Definir destinatários
        if (target_type === 'user' && target_user_id) {
            // Usuário específico
            const targetUser = await base44.asServiceRole.entities.User.get(target_user_id);
            if (targetUser) {
                users = [targetUser];
            }
        } else if (target_type === 'company' && target_company_id) {
            // Empresa específica
            users = await base44.asServiceRole.entities.User.filter({ company_id: target_company_id });
        } else {
            // Todos os usuários
            users = await base44.asServiceRole.entities.User.list();
        }

        if (users.length === 0) {
            return Response.json({ success: true, count: 0, message: "Nenhum usuário encontrado para envio." });
        }

        // Criar notificações em lote (ou loop se o SDK não suportar bulkCreate ainda, mas suporta)
        // O SDK suporta bulkCreate? Verifiquei nas instruções: "base44.entities.Todo.bulkCreate" sim.
        
        const notifications = users.map(u => ({
            user_id: u.id,
            type: 'system',
            category: category,
            title: title,
            message: message,
            priority: category === 'warning' ? 'high' : 'normal',
            read: false,
            created_by: user.email // Rastreio
        }));

        // Fazer em chunks de 50 para garantir
        const chunkSize = 50;
        let createdCount = 0;
        
        for (let i = 0; i < notifications.length; i += chunkSize) {
            const chunk = notifications.slice(i, i + chunkSize);
            await base44.asServiceRole.entities.Notification.bulkCreate(chunk);
            createdCount += chunk.length;
        }

        // Enviar WebSocket para cada usuário notificado
        for (const targetUser of users) {
            try {
                await base44.asServiceRole.functions.invoke('sendWebSocketUpdate', {
                    type: 'notification_created',
                    company_id: targetUser.company_id,
                    user_id: targetUser.id,
                    data: {
                        title: title,
                        message: message,
                        category: category
                    }
                });
            } catch (wsError) {
                console.error(`Erro ao enviar WebSocket para usuário ${targetUser.id}:`, wsError);
            }
        }

        return Response.json({
            success: true,
            count: createdCount,
            message: `Notificação enviada para ${createdCount} usuários.`
        });

    } catch (error) {
        console.error('Erro ao enviar notificação:', error);
        return Response.json({
            error: 'Erro interno ao enviar notificação',
            details: error.message
        }, { status: 500 });
    }
});