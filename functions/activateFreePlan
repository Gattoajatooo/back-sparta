import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !user.company_id) {
      return Response.json({ success: false, error: 'Usuário não autenticado ou empresa não encontrada.' }, { status: 401 });
    }

    const { plan_id } = await req.json();
    if (!plan_id) {
      return Response.json({ success: false, error: 'ID do plano é obrigatório.' }, { status: 400 });
    }

    // Verificar se o plano solicitado é realmente gratuito
    const plan = await base44.asServiceRole.entities.Plan.get(plan_id);
    if (!plan || plan.price !== 0) {
      return Response.json({ success: false, error: 'Este plano não é gratuito.' }, { status: 400 });
    }

    // Buscar e cancelar assinaturas ativas existentes para a empresa
    const existingSubscriptions = await base44.asServiceRole.entities.SubscriptionsStripe.filter({
      company_id: user.company_id,
      status: 'active'
    });

    for (const sub of existingSubscriptions) {
      console.log(`Cancelando assinatura ativa existente: ${sub.id}`);
      await base44.asServiceRole.entities.SubscriptionsStripe.update(sub.id, {
        status: 'canceled',
        canceled_at: new Date().toISOString()
      });
    }

    // Criar o novo registro de assinatura gratuita
    const newSubscription = await base44.asServiceRole.entities.SubscriptionsStripe.create({
      company_id: user.company_id,
      user_id: user.id,
      plan_name: plan.name,
      status: 'active',
      amount: 0,
      currency: 'brl',
      interval: 'year',
      interval_count: 1,
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
      metadata: {
        plan_id: plan.id,
        activation_method: 'direct_free_activation'
      }
    });

    console.log(`Plano gratuito ativado com sucesso: ${newSubscription.id}`);

    return Response.json({ success: true, subscription: newSubscription });

  } catch (error) {
    console.error('Erro ao ativar plano gratuito:', error);
    return Response.json({
      success: false,
      error: 'Erro interno do servidor.',
      details: error.message
    }, { status: 500 });
  }
});