import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Autenticar usuário
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }

    // Obter dados da requisição
    const { contactId, sessionName, refresh = false } = await req.json();

    if (!contactId || !sessionName) {
      return Response.json({
        success: false,
        error: 'contactId e sessionName são obrigatórios'
      }, { status: 400 });
    }

    // Obter configurações da API WAHA
    const wahaApiUrl = Deno.env.get('WAHA_API_URL');
    const wahaApiKey = Deno.env.get('WAHA_API_KEY');

    if (!wahaApiUrl || !wahaApiKey) {
      return Response.json({
        success: false,
        error: 'Configuração da API WAHA não encontrada'
      }, { status: 500 });
    }

    // Fazer requisição para a API WAHA
    const url = `${wahaApiUrl}/api/contacts/profile-picture?contactId=${encodeURIComponent(contactId)}&refresh=${refresh}&session=${encodeURIComponent(sessionName)}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Api-Key': wahaApiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro ao buscar foto do WhatsApp:', errorText);
      return Response.json({
        success: false,
        error: 'Erro ao buscar foto do WhatsApp'
      }, { status: response.status });
    }

    const data = await response.json();

    // Retornar URL da foto
    return Response.json({
      success: true,
      profilePictureUrl: data.profilePictureURL || null
    });

  } catch (error) {
    console.error('Erro ao buscar foto do perfil:', error);
    return Response.json({
      success: false,
      error: error.message || 'Erro interno ao buscar foto do perfil'
    }, { status: 500 });
  }
});