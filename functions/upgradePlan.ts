import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_API_KEY'), {
    apiVersion: '2023-10-16',
});

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user?.company_id) {
            return Response.json({ success: false, error: 'Usuário não autenticado.' }, { status: 401 });
        }

        const { new_plan_id, billing_period = 'monthly' } = await req.json();
        
        if (!new_plan_id) {
            return Response.json({ success: false, error: 'ID do novo plano é obrigatório.' }, { status: 400 });
        }

        // Buscar assinatura ativa atual
        const activeSubscriptions = await base44.entities.SubscriptionsStripe.filter({
            company_id: user.company_id,
            status: 'active'
        });

        if (activeSubscriptions.length === 0) {
            return Response.json({ success: false, error: 'Nenhuma assinatura ativa encontrada.' }, { status: 404 });
        }

        const currentSubscription = activeSubscriptions[0];

        // Buscar detalhes do novo plano
        const newPlan = await base44.entities.Plan.get(new_plan_id);
        if (!newPlan) {
            return Response.json({ success: false, error: 'Novo plano não encontrado.' }, { status: 404 });
        }

        // Calcular proration
        const now = new Date();
        const periodStart = new Date(currentSubscription.current_period_start);
        const periodEnd = new Date(currentSubscription.current_period_end);
        
        const totalDaysInPeriod = Math.ceil((periodEnd - periodStart) / (1000 * 60 * 60 * 24));
        const remainingDays = Math.ceil((periodEnd - now) / (1000 * 60 * 60 * 24));
        
        if (remainingDays <= 0) {
            return Response.json({ success: false, error: 'Período atual já expirado.' }, { status: 400 });
        }

        // Calcular valores
        const currentDailyRate = (currentSubscription.amount / 100) / totalDaysInPeriod; // Convertendo de centavos
        const credit = currentDailyRate * remainingDays;
        
        const newPlanPrice = getNewPlanPrice(newPlan, billing_period);
        const newDailyRate = newPlanPrice / 30; // Assumindo 30 dias por mês
        const newPlanCostForRemainingDays = newDailyRate * remainingDays;
        
        const amountToPay = Math.max(0, newPlanCostForRemainingDays - credit);
        const amountToPayCents = Math.round(amountToPay * 100);

        // Se existe assinatura no Stripe, tentar atualizar
        if (currentSubscription.stripe_subscription_id) {
            try {
                // Buscar o produto/preço no Stripe para o novo plano
                const stripeProducts = await stripe.products.list({ 
                    metadata: { 
                        plan_id: new_plan_id, 
                        billing_period: billing_period 
                    } 
                });

                let targetPrice = null;
                if (stripeProducts.data.length > 0) {
                    const prices = await stripe.prices.list({ 
                        product: stripeProducts.data[0].id 
                    });
                    targetPrice = prices.data.find(price => 
                        price.metadata.billing_period === billing_period
                    );
                }

                if (targetPrice) {
                    // Atualizar assinatura existente com proration automática do Stripe
                    const updatedSubscription = await stripe.subscriptions.update(
                        currentSubscription.stripe_subscription_id,
                        {
                            items: [{
                                price: targetPrice.id,
                            }],
                            proration_behavior: 'create_prorations',
                        }
                    );

                    // Atualizar registro local
                    await base44.entities.SubscriptionsStripe.update(currentSubscription.id, {
                        plan_name: newPlan.name,
                        amount: newPlanPrice,
                        metadata: {
                            ...currentSubscription.metadata,
                            plan_id: new_plan_id,
                            billing_period: billing_period,
                            upgraded_at: new Date().toISOString(),
                            previous_plan_credit: credit
                        }
                    });

                    return Response.json({
                        success: true,
                        message: 'Plano atualizado com sucesso via Stripe!',
                        credit_applied: credit,
                        new_plan: newPlan.name,
                        subscription: updatedSubscription
                    });
                }
            } catch (stripeError) {
                console.error('Erro ao atualizar no Stripe:', stripeError);
                // Continuar com o fluxo manual se falhar no Stripe
            }
        }

        // Fluxo manual: criar novo checkout com desconto
        if (amountToPayCents > 0) {
            // Criar produto e preço temporários no Stripe para o upgrade
            const upgradeProduct = await stripe.products.create({
                name: `Upgrade para ${newPlan.name}`,
                description: `Upgrade de plano com crédito de R$ ${credit.toFixed(2)} aplicado`,
                metadata: {
                    plan_id: new_plan_id,
                    billing_period: billing_period,
                    is_upgrade: 'true',
                    original_subscription_id: currentSubscription.id
                }
            });

            const upgradePrice = await stripe.prices.create({
                unit_amount: amountToPayCents,
                currency: 'brl',
                product: upgradeProduct.id,
                metadata: {
                    plan_id: new_plan_id,
                    billing_period: billing_period,
                    credit_applied: credit.toFixed(2)
                }
            });

            // Criar Payment Link
            const paymentLink = await stripe.paymentLinks.create({
                line_items: [{ price: upgradePrice.id, quantity: 1 }],
                after_completion: {
                    type: 'redirect',
                    redirect: { url: `${req.headers.get('origin')}/plans?upgrade=success` }
                },
                metadata: {
                    company_id: user.company_id,
                    user_id: user.id,
                    plan_id: new_plan_id,
                    billing_period: billing_period,
                    is_upgrade: 'true',
                    original_subscription_id: currentSubscription.id,
                    credit_applied: credit.toFixed(2)
                }
            });

            // Criar registro de upgrade pendente
            await base44.entities.SubscriptionsStripe.create({
                company_id: user.company_id,
                user_id: user.id,
                stripe_product_id: upgradeProduct.id,
                stripe_price_id: upgradePrice.id,
                stripe_payment_link_id: paymentLink.id,
                payment_link_url: paymentLink.url,
                plan_name: newPlan.name,
                status: 'incomplete',
                amount: newPlanPrice,
                currency: 'brl',
                metadata: {
                    plan_id: new_plan_id,
                    billing_period: billing_period,
                    is_upgrade: true,
                    original_subscription_id: currentSubscription.id,
                    credit_applied: credit,
                    amount_to_pay: amountToPay
                }
            });

            return Response.json({
                success: true,
                message: 'Link de upgrade criado com sucesso!',
                payment_url: paymentLink.url,
                credit_applied: credit,
                amount_to_pay: amountToPay,
                new_plan: newPlan.name
            });
        } else {
            // Crédito é maior ou igual ao custo do novo plano
            // Aplicar upgrade diretamente
            await base44.entities.SubscriptionsStripe.update(currentSubscription.id, {
                plan_name: newPlan.name,
                amount: newPlanPrice,
                metadata: {
                    ...currentSubscription.metadata,
                    plan_id: new_plan_id,
                    billing_period: billing_period,
                    upgraded_at: new Date().toISOString(),
                    credit_applied: credit,
                    remaining_credit: credit - newPlanCostForRemainingDays
                }
            });

            return Response.json({
                success: true,
                message: 'Upgrade aplicado com crédito disponível!',
                credit_applied: credit,
                remaining_credit: credit - newPlanCostForRemainingDays,
                new_plan: newPlan.name
            });
        }

    } catch (error) {
        console.error('Erro ao fazer upgrade do plano:', error);
        return Response.json({ 
            success: false, 
            error: 'Erro interno do servidor.',
            details: error.message 
        }, { status: 500 });
    }
});

function getNewPlanPrice(plan, billingPeriod) {
    switch (billingPeriod) {
        case 'quarterly':
            return plan.price_quarterly || plan.price * 3;
        case 'biannual':
            return plan.price_biannual || plan.price * 6;
        case 'annual':
            return plan.price_annual || plan.price * 12;
        default:
            return plan.price;
    }
}