
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get("STRIPE_API_KEY"), {
  apiVersion: "2023-10-16",
  // Em Deno, garanta o http client baseado em fetch:
  httpClient: Stripe.createFetchHttpClient(),
});

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    if (req.method !== 'POST') {
      return Response.json({ success: false, error: 'Método não permitido.' }, { status: 405 });
    }

    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET não configurado');
      return Response.json({ success: false, error: 'Configuração ausente.' }, { status: 500 });
    }

    const body = await req.text();
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return Response.json({ success: false, error: 'Assinatura do webhook ausente.' }, { status: 400 });
    }

    let event;
    try {
      // ✅ Em Deno/Workers use a versão assíncrona:
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (error) {
      console.error('Erro na verificação do webhook:', error?.message);
      return Response.json({ success: false, error: 'Assinatura inválida.' }, { status: 400 });
    }

    console.log(`Recebido evento do Stripe: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(base44, event.data.object);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(base44, event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(base44, event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(base44, event.data.object);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(base44, event.data.object);
        break;

      default:
        console.log(`Evento não tratado: ${event.type}`);
    }

    return Response.json({ success: true, received: true });

  } catch (error) {
    console.error('Erro no processamento do webhook:', error);
    return Response.json({
      success: false,
      error: 'Erro interno do servidor.',
      details: error?.message
    }, { status: 500 });
  }
});

// ================== Handlers ==================

async function handleCheckoutCompleted(base44, session) {
  console.log('Processando checkout completado:', session.id);

  // Extrair metadados do checkout
  const metadata = session.metadata || {};
  console.log('Metadados do checkout:', metadata);

  if (!metadata.company_id || !metadata.user_id) {
    console.error('Metadados ausentes no checkout:', session.id, metadata);
    return;
  }

  try {
    // Buscar registro de assinatura existente
    let existingSubscription = null;

    // PRIMEIRO: Tenta encontrar pelo subscription_record_id nos metadados (registro original)
    if (metadata.subscription_record_id) {
      console.log('Procurando registro pelo subscription_record_id:', metadata.subscription_record_id);
      try {
        existingSubscription = await base44.asServiceRole.entities.SubscriptionsStripe.get(metadata.subscription_record_id);
        console.log('Registro encontrado:', existingSubscription.id);
      } catch (error) {
        console.log('Registro não encontrado pelo subscription_record_id');
        // It's expected for `get` to throw if the ID doesn't exist, so no need to log the error itself
      }
    }

    if (session.mode === 'subscription' && session.subscription) {
      // Pagamento recorrente - processar subscription
      const subscriptionId = typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id;

      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await handleSubscriptionUpdate(base44, subscription);
      }
    } else if (session.mode === 'payment') {
      // Pagamento one-time - atualizar registro diretamente
      console.log('Processando pagamento one-time:', session.id);

      const subscriptionData = {
        company_id: metadata.company_id,
        user_id: metadata.user_id,
        stripe_customer_id: session.customer,
        stripe_subscription_id: null, // One-time payment não tem subscription
        stripe_product_id: metadata.stripe_product_id || null,
        stripe_price_id: metadata.stripe_price_id || null,
        plan_name: metadata.plan_id ? `Plan ${metadata.plan_id}` : 'Plano Personalizado',
        status: 'active', // Pagamento one-time completado = ativo
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Representa 30 dias de "ativo" para pagamento único
        cancel_at_period_end: false,
        canceled_at: null,
        trial_start: null,
        trial_end: null,
        amount: session.amount_total ? (session.amount_total / 100) : null, // Convert cents to currency unit
        currency: session.currency ?? null,
        interval: 'month', // One-time mas representa mensal para consistência
        interval_count: 1,
        latest_invoice_id: session.invoice ?? null,
        metadata: {
          ...metadata,
          checkout_session_id: session.id,
          payment_intent_id: session.payment_intent,
          processed_at: new Date().toISOString()
        }
      };

      if (existingSubscription) {
        // Atualizar registro existente
        await base44.asServiceRole.entities.SubscriptionsStripe.update(
          existingSubscription.id,
          subscriptionData
        );
        console.log('Registro one-time ATUALIZADO:', existingSubscription.id);
      } else {
        // Criar novo registro
        console.log('Criando novo registro one-time...');
        const created = await base44.asServiceRole.entities.SubscriptionsStripe.create(subscriptionData);
        console.log('Novo registro one-time criado:', created.id);
      }

      // Atualizar status da empresa para ativo
      try {
        await base44.asServiceRole.entities.Company.update(metadata.company_id, {
          subscription_status: 'active',
          // Assuming billing_period metadata is set for one-time if needed for plan identification
          subscription_plan: metadata.billing_period === 'annual' ? 'premium' : 'advanced'
        });
        console.log('Status da empresa atualizado para ativo (one-time)');
      } catch (companyUpdateError) {
        console.error('Erro ao atualizar Company (one-time):', companyUpdateError);
      }
    }

  } catch (error) {
    console.error('Erro ao processar checkout completado:', error?.message || error);
  }
}

async function handleSubscriptionUpdate(base44, subscription) {
  console.log('Processando atualização de assinatura:', subscription.id);

  const metadata = subscription.metadata || {};
  if (!metadata.company_id || !metadata.user_id) {
    console.error('Metadados ausentes na assinatura:', subscription.id, metadata);
    return;
  }

  const item0 = subscription.items?.data?.[0];
  const price = item0?.price;
  if (!price) {
    console.error('Preço não encontrado na assinatura:', subscription.id);
    return;
  }

  try {
    // PRIMEIRO: Tenta encontrar pelo subscription_record_id nos metadados (registro original)
    let existingSubscription = null;

    if (metadata.subscription_record_id) {
      console.log('Procurando registro original pelo subscription_record_id:', metadata.subscription_record_id);
      try {
        existingSubscription = await base44.asServiceRole.entities.SubscriptionsStripe.get(metadata.subscription_record_id);
        console.log('Registro original encontrado, será atualizado:', existingSubscription.id);
      } catch (error) {
        console.log('Registro original não encontrado pelo subscription_record_id');
        // It's expected for `get` to throw if the ID doesn't exist, so no need to log the error itself
      }
    }

    // SEGUNDO: Se não encontrou pelo subscription_record_id, procura pelo stripe_subscription_id
    if (!existingSubscription) {
      console.log('Procurando registro existente pelo stripe_subscription_id:', subscription.id);
      const existingSubscriptions = await base44.asServiceRole.entities.SubscriptionsStripe.filter({
        stripe_subscription_id: subscription.id
      });

      if (existingSubscriptions.length > 0) {
        existingSubscription = existingSubscriptions[0];
        console.log('Registro encontrado pelo stripe_subscription_id, será atualizado:', existingSubscription.id);
      }
    }

    const subscriptionData = {
      company_id: metadata.company_id,
      user_id: metadata.user_id,
      stripe_customer_id: subscription.customer,
      stripe_subscription_id: subscription.id,
      stripe_product_id: price.product,
      stripe_price_id: price.id,
      plan_name: metadata.plan_id ? `Plan ${metadata.plan_id}` : 'Plano Personalizado',
      status: subscription.status,
      current_period_start: subscription.current_period_start
        ? new Date(subscription.current_period_start * 1000).toISOString()
        : null,
      current_period_end: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null,
      cancel_at_period_end: !!subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : null,
      trial_start: subscription.trial_start
        ? new Date(subscription.trial_start * 1000).toISOString()
        : null,
      trial_end: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
      amount: price.unit_amount ? (price.unit_amount / 100) : null, // Convert cents to currency unit
      currency: price.currency ?? null,
      interval: price.recurring?.interval ?? null,
      interval_count: price.recurring?.interval_count ?? null,
      latest_invoice_id: subscription.latest_invoice ?? null,
      metadata: subscription.metadata ?? {}
    };

    if (existingSubscription) {
      // ATUALIZA o registro existente
      await base44.asServiceRole.entities.SubscriptionsStripe.update(
        existingSubscription.id,
        subscriptionData
      );
      console.log('Registro de assinatura ATUALIZADO:', existingSubscription.id);
    } else {
      // CRIA um novo registro apenas se realmente não existir nenhum
      console.log('Nenhum registro existente encontrado, criando novo...');
      const created = await base44.asServiceRole.entities.SubscriptionsStripe.create(subscriptionData);
      console.log('Nova assinatura criada:', created.id);
    }

    if (subscription.status === 'active') {
      try {
        // Usar asServiceRole com privilégios elevados para atualizar a Company
        console.log('Tentando atualizar status da empresa para ativo...');
        await base44.asServiceRole.entities.Company.update(metadata.company_id, {
          subscription_status: 'active',
          subscription_plan: metadata.billing_period === 'annual' ? 'premium' : 'advanced'
        });
        console.log('Status da empresa atualizado para ativo');
      } catch (companyUpdateError) {
        console.error('Erro específico ao atualizar Company:', companyUpdateError);
        console.error('Company ID tentado:', metadata.company_id);
        console.error('Dados tentados:', {
          subscription_status: 'active',
          subscription_plan: metadata.billing_period === 'annual' ? 'premium' : 'advanced'
        });
      }
    }

  } catch (error) {
    console.error('Erro ao processar assinatura:', error?.message || error);
  }
}

async function handleSubscriptionDeleted(base44, subscription) {
  console.log('Processando cancelamento de assinatura:', subscription.id);

  try {
    const existingSubscriptions = await base44.asServiceRole.entities.SubscriptionsStripe.filter({
      stripe_subscription_id: subscription.id
    });

    if (existingSubscriptions.length > 0) {
      await base44.asServiceRole.entities.SubscriptionsStripe.update(
        existingSubscriptions[0].id,
        {
          status: 'canceled',
          canceled_at: new Date().toISOString()
        }
      );

      const metadata = subscription.metadata || {};
      if (metadata.company_id) {
        try {
          await base44.asServiceRole.entities.Company.update(metadata.company_id, {
            subscription_status: 'cancelled'
          });
          console.log('Status da empresa atualizado para cancelled');
        } catch (companyUpdateError) {
          console.error('Erro ao atualizar Company no cancelamento:', companyUpdateError);
        }
      }

      console.log('Assinatura cancelada:', existingSubscriptions[0].id);
    }
  } catch (error) {
    console.error('Erro ao processar cancelamento:', error?.message || error);
  }
}

async function handlePaymentSucceeded(base44, invoice) {
  console.log('Processando pagamento bem-sucedido:', invoice.id);

  // subscription pode ser string ou objeto
  const subscriptionId = typeof invoice.subscription === 'string'
    ? invoice.subscription
    : invoice.subscription?.id;

  if (!subscriptionId) return;

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const metadata = subscription.metadata || {};

    if (!metadata.company_id) return;

    // Campos possivelmente nulos na invoice
    const amountPaidCents = invoice.amount_paid ?? 0;
    const createdAt = invoice.created ? new Date(invoice.created * 1000) : new Date();
    const dueDate = invoice.due_date ? new Date(invoice.due_date * 1000) : null;
    const invoiceNumber = invoice.number ?? invoice.id;
    const invoicePdf = invoice.invoice_pdf ?? null;

    await base44.asServiceRole.entities.Invoice.create({
      company_id: metadata.company_id,
      user_id: metadata.user_id ?? null,
      plan_name: metadata.plan_id ? `Plan ${metadata.plan_id}` : 'Plano Personalizado',
      invoice_number: invoiceNumber,
      description: `Pagamento da assinatura - ${createdAt.toLocaleDateString('pt-BR')}`,
      amount: amountPaidCents / 100, // centavos → reais
      status: 'paid',
      issue_date: createdAt.toISOString().split('T')[0],
      due_date: dueDate ? dueDate.toISOString().split('T')[0] : null,
      paid_date: new Date().toISOString().split('T')[0],
      pdf_url: invoicePdf
    });

    console.log('Fatura registrada com sucesso');

  } catch (error) {
    console.error('Erro ao processar pagamento:', error?.message || error);
  }
}

async function handlePaymentFailed(base44, invoice) {
  console.log('Processando falha de pagamento:', invoice.id);

  const subscriptionId = typeof invoice.subscription === 'string'
    ? invoice.subscription
    : invoice.subscription?.id;

  if (!subscriptionId) return;

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const metadata = subscription.metadata || {};

    if (metadata.company_id) {
      try {
        await base44.asServiceRole.entities.Company.update(metadata.company_id, {
          subscription_status: 'suspended'
        });
        console.log('Status da empresa alterado para suspended devido à falha no pagamento');
      } catch (companyUpdateError) {
        console.error('Erro ao atualizar Company na falha de pagamento:', companyUpdateError);
      }
    }

  } catch (error) {
    console.error('Erro ao processar falha de pagamento:', error?.message || error);
  }
}
