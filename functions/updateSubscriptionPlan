import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verificar autenticação
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ 
                success: false, 
                error: 'Não autenticado' 
            }, { status: 401 });
        }

        // Verificar se é admin
        if (user.role !== 'admin') {
            return Response.json({ 
                success: false, 
                error: 'Apenas administradores podem executar esta função' 
            }, { status: 403 });
        }

        const { company_id, new_plan_id } = await req.json();

        if (!company_id || !new_plan_id) {
            return Response.json({ 
                success: false, 
                error: 'company_id e new_plan_id são obrigatórios' 
            }, { status: 400 });
        }

        // Buscar assinatura da empresa
        const subscriptions = await base44.asServiceRole.entities.SubscriptionsStripe.filter({
            company_id: company_id
        });

        if (subscriptions.length === 0) {
            return Response.json({ 
                success: false, 
                error: 'Nenhuma assinatura encontrada para esta empresa' 
            }, { status: 404 });
        }

        // Atualizar cada assinatura
        const updatedSubscriptions = [];
        for (const subscription of subscriptions) {
            const updatedMetadata = {
                ...(subscription.metadata || {}),
                plan_id: new_plan_id
            };

            const updated = await base44.asServiceRole.entities.SubscriptionsStripe.update(
                subscription.id,
                {
                    metadata: updatedMetadata
                }
            );

            updatedSubscriptions.push(updated);
        }

        return Response.json({
            success: true,
            message: `${updatedSubscriptions.length} assinatura(s) atualizada(s) com sucesso`,
            subscriptions: updatedSubscriptions
        });

    } catch (error) {
        console.error('Erro ao atualizar plano da assinatura:', error);
        return Response.json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        }, { status: 500 });
    }
});