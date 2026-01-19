import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user?.company_id) {
            return Response.json({ success: false, error: 'Usuário não autenticado.' }, { status: 401 });
        }

        const { subscription_id } = await req.json();
        
        if (!subscription_id) {
            return Response.json({ success: false, error: 'ID da assinatura é obrigatório.' }, { status: 400 });
        }

        // Buscar a assinatura pendente
        const subscription = await base44.entities.SubscriptionsStripe.get(subscription_id);
        
        if (!subscription) {
            return Response.json({ success: false, error: 'Assinatura não encontrada.' }, { status: 404 });
        }

        // Verificar se o usuário tem permissão para cancelar
        if (subscription.company_id !== user.company_id || subscription.user_id !== user.id) {
            return Response.json({ success: false, error: 'Sem permissão para cancelar esta assinatura.' }, { status: 403 });
        }

        // Verificar se a assinatura pode ser cancelada
        if (subscription.status !== 'incomplete') {
            return Response.json({ success: false, error: 'Apenas assinaturas pendentes podem ser canceladas.' }, { status: 400 });
        }

        // Atualizar o status para cancelada
        await base44.entities.SubscriptionsStripe.update(subscription_id, {
            status: 'canceled',
            canceled_at: new Date().toISOString(),
            metadata: {
                ...subscription.metadata,
                canceled_by_user: true,
                canceled_reason: 'user_requested',
                canceled_timestamp: new Date().toISOString()
            }
        });

        return Response.json({
            success: true,
            message: 'Solicitação de assinatura cancelada com sucesso.'
        });

    } catch (error) {
        console.error('Erro ao cancelar assinatura pendente:', error);
        return Response.json({ 
            success: false, 
            error: 'Erro interno do servidor.',
            details: error.message 
        }, { status: 500 });
    }
});