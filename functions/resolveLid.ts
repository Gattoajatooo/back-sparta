import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }

    const { lid, sessionName } = await req.json();

    if (!lid || !sessionName) {
      return Response.json({
        success: false,
        error: 'lid e sessionName são obrigatórios'
      }, { status: 400 });
    }

    const wahaApiUrl = Deno.env.get('WAHA_API_URL');
    const wahaApiKey = Deno.env.get('WAHA_API_KEY');

    if (!wahaApiUrl || !wahaApiKey) {
      return Response.json({
        success: false,
        error: 'Configuração da API WAHA não encontrada'
      }, { status: 500 });
    }

    // Formatar LID se necessário
    const formattedLid = lid.includes('@lid') ? lid : `${lid}@lid`;

    const url = `${wahaApiUrl}/api/${sessionName}/lids/${encodeURIComponent(formattedLid)}`;
    
    console.log('[resolveLid] Chamando:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Api-Key': wahaApiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[resolveLid] Erro WAHA:', errorText);
      return Response.json({
        success: false,
        error: 'Erro ao resolver LID'
      }, { status: response.status });
    }

    const data = await response.json();
    console.log('[resolveLid] Resposta:', data);

    // Extrair número real do pn
    const realPhone = data.pn ? data.pn.replace('@c.us', '') : null;

    return Response.json({
      success: true,
      lid: data.lid,
      pn: data.pn,
      phone: realPhone
    });

  } catch (error) {
    console.error('[resolveLid] Erro:', error);
    return Response.json({
      success: false,
      error: error.message || 'Erro interno ao resolver LID'
    }, { status: 500 });
  }
});