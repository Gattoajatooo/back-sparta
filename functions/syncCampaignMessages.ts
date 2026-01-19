import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !user.company_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Usuário não autenticado.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { schedule_id } = await req.json();
    if (!schedule_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'schedule_id é obrigatório' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Sync] Iniciando sincronização para schedule_id: ${schedule_id}`);

    const serviceRoleBase44 = base44.asServiceRole;
    const companyId = user.company_id;

    const scheduleUrl = Deno.env.get('SCHEDULE_URL');
    const jobsApiKey = Deno.env.get('JOBS_API_KEY');

    if (!scheduleUrl || !jobsApiKey) {
      throw new Error('Configuração do scheduler ausente (SCHEDULE_URL ou JOBS_API_KEY).');
    }

    // Buscar jobs da API externa
    const apiUrl = `${scheduleUrl.replace(/\/$/, '')}/jobs/company_id=${companyId}/schedule_id=${schedule_id}`;
    console.log(`[Sync] Chamando URL: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${jobsApiKey}` }
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Erro ao buscar status dos jobs: ${response.status} - ${errorText}`);
    }

    const apiResult = await response.json();
    if (!apiResult?.success || !apiResult?.data?.rows) {
      console.warn(`[Sync] Resposta inválida da API:`, apiResult);
      return new Response(
        JSON.stringify({ success: true, updated_count: 0, message: 'Nenhum job encontrado na API externa.' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const jobsFromApi = apiResult.data.rows;
    console.log(`[Sync] Jobs encontrados na API: ${jobsFromApi.length}`);

    if (jobsFromApi.length === 0) {
      return new Response(
        JSON.stringify({ success: true, updated_count: 0, message: 'Nenhum job retornado pela API.' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Buscar mensagens no Base44 que correspondem aos scheduler_job_id
    let updatedCount = 0;
    const updatePromises = [];
    
    for (const job of jobsFromApi) {
      const schedulerJobId = job.id;
      
      try {
        // Buscar mensagem por scheduler_job_id
        const messages = await serviceRoleBase44.entities.Message.filter({ 
          scheduler_job_id: schedulerJobId 
        });

        if (messages.length > 0) {
          const message = messages[0]; // Deve haver apenas uma mensagem por scheduler_job_id
          
          // Verificar se precisa atualizar
          if (message.status !== job.status) {
            console.log(`[Sync] Atualizando mensagem ${message.id}: ${message.status} -> ${job.status}`);
            
            const updatePromise = serviceRoleBase44.entities.Message.update(message.id, {
              status: job.status,
              error_details: job.error_details || null,
              updated_at: Date.now()
            }).then(() => {
              updatedCount++;
            }).catch((error) => {
              console.error(`[Sync] Erro ao atualizar mensagem ${message.id}:`, error);
            });
            
            updatePromises.push(updatePromise);
          }
        } else {
          console.log(`[Sync] Nenhuma mensagem encontrada para scheduler_job_id: ${schedulerJobId}`);
        }
      } catch (error) {
        console.error(`[Sync] Erro ao buscar mensagem para job ${schedulerJobId}:`, error);
      }
    }

    // Aguardar todas as atualizações
    await Promise.all(updatePromises);

    console.log(`[Sync] Sincronização concluída. ${updatedCount} mensagens atualizadas.`);

    return new Response(
      JSON.stringify({
        success: true,
        updated_count: updatedCount,
        total_jobs_from_api: jobsFromApi.length,
        message: `Sincronização concluída com sucesso. ${updatedCount} mensagens atualizadas.`,
        summary: apiResult.data.summary
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na sincronização:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Erro interno ao sincronizar mensagens.',
        details: error.message
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});