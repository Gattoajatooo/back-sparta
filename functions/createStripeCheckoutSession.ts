
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get("STRIPE_API_KEY"), { apiVersion: "2023-10-16" });

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.company_id) {
      return Response.json({ success: false, error: 'Usuário não autenticado.' }, { status: 401 });
    }

    const company = await base44.entities.Company.get(user.company_id);
    const { plan_id, billing_period = 'monthly' } = await req.json();
    if (!plan_id) return Response.json({ success: false, error: 'Plan ID é obrigatório.' }, { status: 400 });

    const plan = await base44.entities.Plan.get(plan_id);
    if (!plan) return Response.json({ success: false, error: 'Plano não encontrado.' }, { status: 404 });

    // === REAPROVEITAR LINK EXISTENTE (24h) ===
    console.log('Verificando se já existe tentativa de assinatura pendente...');
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const existingAttempts = await base44.entities.SubscriptionsStripe.filter({
      company_id: user.company_id,
      user_id: user.id,
      status: 'incomplete',
      'metadata.plan_id': plan_id,
      'metadata.billing_period': billing_period,
      payment_link_url: { '$ne': null },
      created_date: { '$gte': twentyFourHoursAgo.toISOString() }
    });

    if (existingAttempts?.length > 0) {
      const existingAttempt = existingAttempts.sort((a, b) =>
        new Date(b.created_date) - new Date(a.created_date)
      )[0];

      console.log(`Reutilizando link existente para SubscriptionsStripe ID: ${existingAttempt.id}`);
      return Response.json({
        success: true,
        checkout_url: existingAttempt.payment_link_url,
        subscription_record_id: existingAttempt.id,
        is_existing_attempt: true,
        message: 'Redirecionando para seu link de pagamento existente.'
      });
    }

    // === DEFINIR VALOR E PERÍODO ===
    console.log('Nenhuma tentativa pendente válida encontrada. Criando novo fluxo...');
    let amount, intervalCount, interval;
    switch (billing_period) {
      case 'quarterly': amount = Math.round(plan.price_quarterly * 100); intervalCount = 3; interval = 'month'; break;
      case 'biannual':  amount = Math.round(plan.price_biannual  * 100); intervalCount = 6; interval = 'month'; break;
      case 'annual':    amount = Math.round(plan.price_annual    * 100); intervalCount = 1; interval = 'year';  break;
      default:          amount = Math.round(plan.price           * 100); intervalCount = 1; interval = 'month'; break; // monthly
    }

    // === REGRAS DE PARCELAS (informativo) ===
    const maxInstallments =
      billing_period === 'annual' ? 12 :
      billing_period === 'biannual' ? 6 :
      billing_period === 'quarterly' ? 3 : 1;

    // === MODO DE COBRANÇA ===
    const isOneTime = (billing_period === 'monthly'); // mensal = avulso (permite PIX/BOLETO); demais = recorrente

    // === PASSO 1: REGISTRO INICIAL ===
    console.log('PASSO 1: Criando registro inicial...');
    const initialSubscription = await base44.entities.SubscriptionsStripe.create({
      company_id: user.company_id,
      user_id: user.id,
      plan_name: `${plan.name} (${billing_period})`,
      status: 'incomplete',
      amount,
      currency: 'brl',
      interval,
      interval_count: intervalCount,
      metadata: {
        plan_id: plan.id,
        billing_period,
        mode: isOneTime ? 'one_time' : 'subscription', // <— marca o modo
        max_installments: maxInstallments,
        process_step: 'initiating',
        created_timestamp: new Date().toISOString(),
        access_count: 1
      }
    });

    console.log(`Registro criado: ${initialSubscription.id}`);

    try {
      // === PASSO 2: PRODUTO ===
      console.log('PASSO 2: Criando produto no Stripe...');
      const product = await stripe.products.create({
        name: `Assinatura ${plan.name} - ${company.name}`,
        description: `Acesso ao plano ${plan.name} da Sparta Sync (${billing_period})`,
        metadata: {
          company_id: user.company_id,
          user_id: user.id,
          plan_id: plan.id,
          subscription_record_id: initialSubscription.id
        }
      });

      await base44.entities.SubscriptionsStripe.update(initialSubscription.id, {
        stripe_product_id: product.id,
        metadata: { ...initialSubscription.metadata, process_step: 'product_created' }
      });

      // === PASSO 3: PREÇO ===
      console.log('PASSO 3: Criando preço no Stripe...');
      const price = isOneTime
        ? await stripe.prices.create({
            unit_amount: amount,
            currency: 'brl',
            product: product.id,                     // sem "recurring" → avulso
            metadata: { subscription_record_id: initialSubscription.id, mode: 'one_time' }
          })
        : await stripe.prices.create({
            unit_amount: amount,
            currency: 'brl',
            recurring: { interval, interval_count: intervalCount }, // recorrente
            product: product.id,
            metadata: { subscription_record_id: initialSubscription.id, mode: 'subscription' }
          });

      await base44.entities.SubscriptionsStripe.update(initialSubscription.id, {
        stripe_price_id: price.id,
        metadata: { ...initialSubscription.metadata, process_step: 'price_created' }
      });

      // === PASSO 4: PAYMENT LINK ===
      console.log('PASSO 4: Criando Payment Link...');
      const appUrl = `${req.headers.get('origin') || 'https://preview--spartasync2.base44.app'}/Plans?payment_success=true`;

      // AJUSTE: Removido 'pix' e 'boleto' para evitar erro em contas não habilitadas.
      // Para reativar, garanta que 'pix' e 'boleto' estejam habilitados em https://dashboard.stripe.com/account/payments/settings
      const oneTimePaymentMethods = ['card']; 

      const paymentLink = isOneTime
        // MENSAL = AVULSO → aceita cartão. PIX/Boleto removidos para evitar erros.
        ? await stripe.paymentLinks.create({
            line_items: [{ price: price.id, quantity: 1 }],
            allow_promotion_codes: true,
            phone_number_collection: { enabled: true },
            payment_method_types: oneTimePaymentMethods, // <-- AJUSTE APLICADO
            after_completion: { type: 'redirect', redirect: { url: appUrl } },
            metadata: {
              company_id: user.company_id,
              user_id: user.id,
              plan_id: plan.id,
              billing_period,
              mode: 'one_time',
              max_installments: maxInstallments,
              subscription_record_id: initialSubscription.id
            }
          })
        // TRIMESTRAL/SEMESTRAL/ANUAL = RECORRENTE → só cartão
        : await stripe.paymentLinks.create({
            line_items: [{ price: price.id, quantity: 1 }],
            allow_promotion_codes: true,
            phone_number_collection: { enabled: true },
            payment_method_types: ['card'],                       // assinatura: PIX/BOLETO não aparecem
            after_completion: { type: 'redirect', redirect: { url: appUrl } },
            // (Opcional) metadata na SUBSCRIPTION criada pelo link:
            subscription_data: {
              metadata: {
                company_id: user.company_id,
                user_id: user.id,
                plan_id: plan.id,
                billing_period,
                mode: 'subscription',
                max_installments: maxInstallments,
                subscription_record_id: initialSubscription.id
              }
            },
            metadata: {
              company_id: user.company_id,
              user_id: user.id,
              plan_id: plan.id,
              billing_period,
              mode: 'subscription',
              max_installments: maxInstallments,
              subscription_record_id: initialSubscription.id
            }
          });

      await base44.entities.SubscriptionsStripe.update(initialSubscription.id, {
        stripe_payment_link_id: paymentLink.id,
        payment_link_url: paymentLink.url,
        metadata: { ...initialSubscription.metadata, process_step: 'payment_link_created', link_created_at: new Date().toISOString() }
      });

      return Response.json({
        success: true,
        checkout_url: paymentLink.url,
        payment_link_id: paymentLink.id,
        subscription_record_id: initialSubscription.id,
        is_existing_attempt: false,
        message: 'Link de pagamento criado com sucesso.'
      });

    } catch (stripeError) {
      console.error('Erro na integração com Stripe:', stripeError);
      await base44.entities.SubscriptionsStripe.update(initialSubscription.id, {
        status: 'incomplete_expired',
        metadata: { ...initialSubscription.metadata, process_step: 'error', error_message: stripeError.message, error_timestamp: new Date().toISOString() }
      });
      return Response.json({ success: false, error: 'Erro ao processar pagamento com Stripe.', details: stripeError.message }, { status: 500 });
    }

  } catch (error) {
    console.error('Erro geral na criação da sessão de checkout:', error);
    return Response.json({ success: false, error: 'Erro interno do servidor.', details: error.message }, { status: 500 });
  }
});
