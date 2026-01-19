import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Lista conversas de WhatsApp gerenciadas por IA
 * Usado para painel de atendimento humano (handoff)
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { status_filter, limit = 50, offset = 0 } = await req.json().catch(() => ({}));

    let filter = {
      company_id: user.company_id
    };

    if (status_filter) {
      filter.status = status_filter;
    }

    const conversations = await base44.entities.WhatsAppConversation.filter(filter, '-last_message_date', limit);

    // Enriquecer com dados de contato e agente
    const enrichedConversations = await Promise.all(
      conversations.map(async (conv) => {
        let contact = null;
        let agent = null;

        if (conv.contact_id) {
          try {
            contact = await base44.entities.Contact.get(conv.contact_id);
          } catch (e) {
            console.warn('Contato não encontrado:', conv.contact_id);
          }
        }

        if (conv.current_agent_id) {
          try {
            agent = await base44.entities.AIAgent.get(conv.current_agent_id);
          } catch (e) {
            console.warn('Agente não encontrado:', conv.current_agent_id);
          }
        }

        // Buscar última mensagem
        const lastMessages = await base44.entities.WhatsAppConversationMessage.filter({
          conversation_id: conv.id
        }, '-timestamp', 1);

        return {
          ...conv,
          contact,
          agent,
          last_message: lastMessages[0] || null
        };
      })
    );

    return Response.json({
      success: true,
      conversations: enrichedConversations,
      total: conversations.length
    });

  } catch (error) {
    console.error('[getAIConversations] Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});