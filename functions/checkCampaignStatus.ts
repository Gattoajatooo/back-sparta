import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !user.company_id) {
      return Response.json({ 
        success: false, 
        error: 'Usuário não autenticado.' 
      }, { status: 401 });
    }

    const { schedule_id } = await req.json();
    if (!schedule_id) {
      return Response.json({ 
        success: false, 
        error: 'schedule_id é obrigatório' 
      }, { status: 400 });
    }

    console.log(`[CheckStatus] Verificando status da campanha: ${schedule_id}`);

    const scheduleUrl = Deno.env.get('SCHEDULE_URL');
    const jobsApiKey = Deno.env.get('JOBS_API_KEY');

    if (!scheduleUrl || !jobsApiKey) {
      console.warn('[CheckStatus] Configuração do scheduler ausente');
      return Response.json({ 
        success: true, 
        cloudflare_available: false,
        message: 'Scheduler externo não disponível'
      });
    }

    // Buscar Schedule atual
    const schedule = await base44.asServiceRole.entities.Schedule.get(schedule_id);
    if (!schedule) {
      return Response.json({ 
        success: false, 
        error: 'Schedule não encontrado' 
      }, { status: 404 });
    }

    // Buscar status no Cloudflare
    const apiUrl = `${scheduleUrl.replace(/\/$/, '')}/jobs/company_id=${user.company_id}/schedule_id=${schedule_id}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${jobsApiKey}` }
    });

    if (!response.ok) {
      console.error(`[CheckStatus] Erro ao buscar do Cloudflare: ${response.status}`);
      return Response.json({ 
        success: true, 
        cloudflare_available: false,
        message: 'Erro ao buscar status do Cloudflare'
      });
    }

    const apiResult = await response.json();
    
    if (!apiResult?.success || !apiResult?.data?.summary) {
      console.warn('[CheckStatus] Resposta inválida do Cloudflare');
      return Response.json({ 
        success: true, 
        cloudflare_available: false,
        message: 'Resposta inválida do Cloudflare'
      });
    }

    const summary = apiResult.data.summary;
    const statusCounts = summary.by_status || [];
    
    console.log('[CheckStatus] Summary do Cloudflare:', summary);

    // Verificar se há mensagens pending no Cloudflare
    const pendingInCloudflare = statusCounts.find(s => s.status === 'pending');
    const hasPendingInCloudflare = pendingInCloudflare && pendingInCloudflare.count > 0;

    // CRÍTICO: Também verificar se há mensagens pending no Base44
    const pendingMessagesInBase44 = await base44.asServiceRole.entities.Message.filter({
      company_id: user.company_id,
      schedule_id: schedule_id,
      status: 'pending'
    });
    
    const hasPendingInBase44 = pendingMessagesInBase44 && pendingMessagesInBase44.length > 0;
    
    // CRÍTICO: Para campanhas recorrentes, verificar se há lotes pendentes de aprovação
    const pendingBatches = await base44.asServiceRole.entities.BatchSchedule.filter({
      company_id: user.company_id,
      schedule_id: schedule_id,
      status: 'pending'
    });
    
    const hasPendingBatches = pendingBatches && pendingBatches.length > 0;
    
    // A campanha só pode ser concluída se:
    // 1. Não há jobs pendentes no Cloudflare
    // 2. Não há mensagens pendentes no Base44
    // 3. Não há lotes pendentes de aprovação (para campanhas recorrentes)
    const hasPendingJobs = hasPendingInCloudflare || hasPendingInBase44 || hasPendingBatches;
    
    console.log(`[CheckStatus] Pending no Cloudflare: ${hasPendingInCloudflare ? pendingInCloudflare.count : 0}`);
    console.log(`[CheckStatus] Pending no Base44: ${pendingMessagesInBase44?.length || 0}`);
    console.log(`[CheckStatus] Lotes pendentes de aprovação: ${pendingBatches?.length || 0}`);
    console.log(`[CheckStatus] Tem pendentes? ${hasPendingJobs}`);

    // Verificar se a campanha está em cancelling há mais de 1 hora
    let shouldFinalizeCancellation = false;
    if (schedule.status === 'cancelling' && schedule.cancelled_at) {
      const cancelledAt = new Date(schedule.cancelled_at).getTime();
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      shouldFinalizeCancellation = cancelledAt < oneHourAgo;
    }

    // Determinar novo status
    let newStatus = null;
    let updateData = {};

    if (!hasPendingJobs) {
      // Não há mais mensagens pending em nenhum lugar
      if (schedule.status === 'cancelling' || shouldFinalizeCancellation) {
        newStatus = 'cancelled';
        updateData = {
          status: 'cancelled',
          cancelled_at: schedule.cancelled_at || new Date().toISOString()
        };
        console.log('[CheckStatus] Campanha será marcada como cancelada');
      } else if (schedule.status !== 'completed' && schedule.status !== 'cancelled') {
        newStatus = 'completed';
        updateData = {
          status: 'completed',
          completed_at: new Date().toISOString()
        };
        console.log('[CheckStatus] Campanha será marcada como concluída');
      }
    } else if (shouldFinalizeCancellation) {
      // Ainda há pending mas passou 1 hora do cancelamento
      newStatus = 'cancelled';
      updateData = {
        status: 'cancelled',
        cancelled_at: schedule.cancelled_at || new Date().toISOString()
      };
      console.log('[CheckStatus] Campanha em cancelamento há mais de 1 hora, forçando status cancelado');
    } else {
      console.log(`[CheckStatus] Campanha ainda tem ${hasPendingInBase44 ? pendingMessagesInBase44.length : 0} mensagens pendentes, não será marcada como concluída`);
    }

    // Atualizar schedule se necessário
    if (newStatus && newStatus !== schedule.status) {
      await base44.asServiceRole.entities.Schedule.update(schedule_id, updateData);
      console.log(`[CheckStatus] Schedule atualizado para: ${newStatus}`);
    }

    return Response.json({
      success: true,
      cloudflare_available: true,
      summary: summary,
      has_pending: hasPendingJobs,
      pending_cloudflare: pendingInCloudflare?.count || 0,
      pending_base44: pendingMessagesInBase44?.length || 0,
      pending_batches: pendingBatches?.length || 0,
      current_status: newStatus || schedule.status,
      status_changed: !!newStatus,
      previous_status: schedule.status
    });

  } catch (error) {
    console.error('[CheckStatus] Erro:', error);
    return Response.json({
      success: false,
      error: 'Erro interno ao verificar status',
      details: error.message
    }, { status: 500 });
  }
});