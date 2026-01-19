import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Retorna uma conversa para o atendimento por IA
 * Usada quando humano finaliza o atendimento
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversation_id } = await req.json();

    if (!conversation_id) {
      return Response.json({ error: 'conversation_id é obrigatório' }, { status: 400 });
    }

    const conversation = await base44.entities.WhatsAppConversation.get(conversation_id);

    if (!conversation) {
      return Response.json({ error: 'Conversa não encontrada' }, { status: 404 });
    }

    if (conversation.company_id !== user.company_id) {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Retornar para IA ativa
    await base44.entities.WhatsAppConversation.update(conversation_id, {
      status: 'ai_active',
      is_processing: false
    });

    await base44.functions.invoke('sendWebSocketUpdate', {
      type: 'conversation_returned_to_ai',
      company_id: user.company_id,
      conversation_id: conversation_id
    });

    return Response.json({ 
      success: true,
      message: 'Conversa retornada para IA'
    });

  } catch (error) {
    console.error('[returnConversationToAI] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});