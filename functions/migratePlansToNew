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

        const OLD_PLAN_ID = '68ceac8af0299b3d7b3e4d4a';
        const NEW_PLAN_ID = '68f58db4de932c43527e21a7';

        // Buscar todas as assinaturas
        const allSubscriptions = await base44.asServiceRole.entities.SubscriptionsStripe.list();

        const subscriptionsToUpdate = [];
        
        // Filtrar assinaturas que têm o plano antigo
        for (const subscription of allSubscriptions) {
            if (subscription.metadata?.plan_id === OLD_PLAN_ID) {
                subscriptionsToUpdate.push(subscription);
            }
        }

        console.log(`Encontradas ${subscriptionsToUpdate.length} assinaturas para atualizar`);

        // Atualizar cada assinatura
        const updatedSubscriptions = [];
        for (const subscription of subscriptionsToUpdate) {
            try {
                const updatedMetadata = {
                    ...subscription.metadata,
                    plan_id: NEW_PLAN_ID
                };

                const updated = await base44.asServiceRole.entities.SubscriptionsStripe.update(
                    subscription.id,
                    {
                        metadata: updatedMetadata
                    }
                );

                updatedSubscriptions.push({
                    id: updated.id,
                    company_id: updated.company_id,
                    old_plan: OLD_PLAN_ID,
                    new_plan: NEW_PLAN_ID
                });

                console.log(`Assinatura ${subscription.id} atualizada com sucesso`);
            } catch (error) {
                console.error(`Erro ao atualizar assinatura ${subscription.id}:`, error);
            }
        }

        return Response.json({
            success: true,
            message: `${updatedSubscriptions.length} de ${subscriptionsToUpdate.length} assinatura(s) atualizada(s) com sucesso`,
            old_plan_id: OLD_PLAN_ID,
            new_plan_id: NEW_PLAN_ID,
            updated_subscriptions: updatedSubscriptions
        });

    } catch (error) {
        console.error('Erro ao migrar planos:', error);
        return Response.json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        }, { status: 500 });
    }
});