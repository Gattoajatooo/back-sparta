import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const allEntities = [
      'User', 'Company', 'Session', 'Contact', 'MessageTemplate', 
      'Campaign', 'Schedule', 'Message', 'Tag', 'Activity',
      'Role', 'Permission', 'Customer', 'Communication', 'Import',
      'AuditLog', 'Invoice', 'Plan', 'Feature', 'PlanVersion',
      'Subscription', 'Offer', 'Invitation', 'BatchSchedule',
      'ImportTemplate', 'SystemLog', 'Task', 'Payment', 'Cost',
      'Notification', 'Sistema2FACode', 'SystemTag', 'Secret',
      'SystemNotification', 'ContactEvent', 'PlanFeatureValue',
      'RoleDefault', 'PermissionDefault', 'SubscriptionsStripe',
      'ProfitDistribution', 'CashBalance', 'SubscriptionOverride',
      'OfferFeatureOverride'
    ];

    const entitiesData = [];
    
    for (const entityName of allEntities) {
      try {
        const filter = (entityName === 'Contact' || entityName === 'Message')
          ? { deleted: { '$in': [false, null] } }
          : {};

        console.log(`[getDatabaseEntities] Contando ${entityName} com filtro:`, JSON.stringify(filter));
        const records = await base44.asServiceRole.entities[entityName].filter(filter);
        const count = records.length;
        console.log(`[getDatabaseEntities] ${entityName} count:`, count);

        entitiesData.push({
          name: entityName,
          count: count,
          status: 'active'
        });
      } catch (error) {
        console.error(`Erro ao carregar ${entityName}:`, error.message, error.stack);
        entitiesData.push({
          name: entityName,
          count: 0,
          status: 'error'
        });
      }
    }

    return Response.json({
      success: true,
      entities: entitiesData.sort((a, b) => b.count - a.count)
    });

  } catch (error) {
    console.error('Erro ao carregar entidades:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});