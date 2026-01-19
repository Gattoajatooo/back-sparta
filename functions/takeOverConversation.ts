import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Permite que um humano assuma uma conversa que estava com IA
 * Usada quando há handoff_pending ou quando usuário quer assumir manualmente
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

    // Buscar conversa
    const conversation = await base44.entities.WhatsAppConversation.get(conversation_id);

    if (!conversation) {
      return Response.json({ error: 'Conversa não encontrada' }, { status: 404 });
    }

    if (conversation.company_id !== user.company_id) {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Atualizar status para humano ativo
    await base44.entities.WhatsAppConversation.update(conversation_id, {
      status: 'human_active',
      is_processing: false,
      handoff_history: [
        ...(conversation.handoff_history || []),
        {
          from_agent_id: conversation.current_agent_id,
          to_human: true,
          reason: 'Assumido manualmente por humano',
          timestamp: new Date().toISOString(),
          user_id: user.id,
          user_name: user.full_name
        }
      ]
    });

    // Enviar notificação via WebSocket
    await base44.functions.invoke('sendWebSocketUpdate', {
      type: 'conversation_taken_over',
      company_id: user.company_id,
      conversation_id: conversation_id,
      user_id: user.id
    });

    return Response.json({ 
      success: true,
      message: 'Conversa assumida com sucesso'
    });

  } catch (error) {
    console.error('[takeOverConversation] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});