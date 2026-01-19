import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contactId, sessionName } = await req.json();

    if (!contactId || !sessionName) {
      return Response.json({ 
        error: 'contactId e sessionName são obrigatórios' 
      }, { status: 400 });
    }

    const WAHA_API_URL = Deno.env.get('WAHA_API_URL');
    const WAHA_API_KEY = Deno.env.get('WAHA_API_KEY');

    if (!WAHA_API_URL || !WAHA_API_KEY) {
      return Response.json({ 
        error: 'WAHA API não configurada' 
      }, { status: 500 });
    }

    // Garantir que contactId tem @c.us
    const formattedContactId = contactId.includes('@') ? contactId : `${contactId}@c.us`;

    const url = `${WAHA_API_URL}/api/contacts?contactId=${encodeURIComponent(formattedContactId)}&session=${encodeURIComponent(sessionName)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': '*/*',
        'X-Api-Key': WAHA_API_KEY
      }
    });

    if (!response.ok) {
      console.error('WAHA API error:', response.status, await response.text());
      return Response.json({ 
        success: false,
        error: `Erro ao buscar informações: ${response.status}` 
      }, { status: response.status });
    }

    const contactInfo = await response.json();

    return Response.json({
      success: true,
      contact: contactInfo
    });

  } catch (error) {
    console.error('Error in getContactInfo:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});