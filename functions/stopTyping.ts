import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }

    const { sessionName, chatId } = await req.json();

    if (!sessionName || !chatId) {
      return Response.json({
        success: false,
        error: 'sessionName e chatId são obrigatórios'
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

    const url = `${wahaApiUrl}/api/${sessionName}/typing`;
    
    console.log('[stopTyping] Parando typing para:', { sessionName, chatId });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Api-Key': wahaApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chatId: chatId,
        on: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[stopTyping] Erro WAHA:', errorText);
      return Response.json({
        success: false,
        error: 'Erro ao parar typing'
      }, { status: response.status });
    }

    const data = await response.json();
    console.log('[stopTyping] Sucesso:', data);

    return Response.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('[stopTyping] Erro:', error);
    return Response.json({
      success: false,
      error: error.message || 'Erro interno ao parar typing'
    }, { status: 500 });
  }
});