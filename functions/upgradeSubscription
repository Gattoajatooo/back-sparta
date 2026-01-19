import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_API_KEY'));

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    try {
        const user = await base44.auth.me();
        if (!user || !user.company_id) {
            return new Response(JSON.stringify({ success: false, error: 'Usuário não autenticado.' }), { status: 401 });
        }

        const { new_plan_id, billing_period = 'monthly' } = await req.json();
        if (!new_plan_id) {
            return new Response(JSON.stringify({ success: false, error: 'ID do novo plano é obrigatório.' }), { status: 400 });
        }

        // 1. Buscar assinatura ativa atual no nosso DB
        const activeSubs = await base44.entities.SubscriptionsStripe.filter({
            company_id: user.company_id,
            status: 'active'
        });
        
        if (activeSubs.length === 0) {
            return new Response(JSON.stringify({ success: false, error: 'Nenhuma assinatura ativa encontrada para migrar.' }), { status: 404 });
        }
        const currentSubscription = activeSubs[0];
        
        if (!currentSubscription.stripe_subscription_id) {
             return new Response(JSON.stringify({ success: false, error: 'Assinatura ativa não possui um ID do Stripe para migração.' }), { status: 400 });
        }

        // 2. Buscar detalhes do novo plano
        const newPlan = await base44.entities.Plan.get(new_plan_id);
        if (!newPlan) {
            return new Response(JSON.stringify({ success: false, error: 'Novo plano não encontrado.' }), { status: 404 });
        }

        // 3. Determinar o preço e intervalo do novo plano
        let price_in_cents;
        let interval;
        let interval_count;

        switch (billing_period) {
            case 'quarterly':
                price_in_cents = Math.round(newPlan.price_quarterly * 100);
                interval = 'month';
                interval_count = 3;
                break;
            // ... (outros casos se houver)
            case 'annual':
                price_in_cents = Math.round(newPlan.price_annual * 100);
                interval = 'year';
                interval_count = 1;
                break;
            case 'monthly':
            default:
                price_in_cents = Math.round(newPlan.price * 100);
                interval = 'month';
                interval_count = 1;
                break;
        }

        // 4. Criar um novo preço no Stripe para o novo plano
        // O ideal é buscar um produto existente ou criar um novo se necessário
        let stripeProduct = await stripe.products.search({ query: `metadata['plan_id']:'${newPlan.id}'`});
        if(stripeProduct.data.length === 0){
             stripeProduct = await stripe.products.create({ name: `Plano ${newPlan.name}` });
        } else {
            stripeProduct = stripeProduct.data[0];
        }

        const newStripePrice = await stripe.prices.create({
            product: stripeProduct.id,
            unit_amount: price_in_cents,
            currency: 'brl',
            recurring: {
                interval: interval,
                interval_count: interval_count,
            },
             metadata: {
                billing_period: billing_period,
            }
        });

        // 5. Atualizar a assinatura no Stripe com rateio
        const stripeSubscription = await stripe.subscriptions.retrieve(currentSubscription.stripe_subscription_id);
        
        await stripe.subscriptions.update(currentSubscription.stripe_subscription_id, {
            cancel_at_period_end: false,
            proration_behavior: 'create_prorations',
            items: [{
                id: stripeSubscription.items.data[0].id,
                price: newStripePrice.id,
            }],
            metadata: {
                company_id: user.company_id,
                user_id: user.id,
                plan_id: newPlan.id,
                plan_slug: newPlan.slug,
                plan_name: newPlan.name,
                billing_period: billing_period
            }
        });

        // O webhook `customer.subscription.updated` e `invoice.paid` tratarão de atualizar o DB local.
        return new Response(JSON.stringify({ success: true, message: 'Assinatura atualizada com sucesso. O valor será ajustado na sua próxima fatura.' }), { status: 200 });

    } catch (error) {
        console.error('Stripe Upgrade Error:', error);
        return new Response(JSON.stringify({ success: false, error: 'Erro ao migrar de plano.', details: error.message }), { status: 500 });
    }
});