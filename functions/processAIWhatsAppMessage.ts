import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

function nowIso(ts) {
  return new Date(ts || Date.now()).toISOString();
}

function safeErr(e) {
  return {
    message: e?.message || String(e),
    name: e?.name,
    stack: e?.stack,
    status: e?.status,
    details: e?.details,
    response_status: e?.response?.status,
    response_data: e?.response?.data,
  };
}

function extractPhoneFromChatId(chatId) {
  if (!chatId) return null;
  // "553192157534@c.us" -> "553192157534"
  const raw = String(chatId).split("@")[0].split("-")[0];
  // mantém só dígitos (garante compatibilidade)
  const digits = raw.replace(/\D+/g, "");
  return digits || null;
}

function isPhoneRequiredError(e) {
  const msg = (e?.response?.data?.error || e?.message || "").toLowerCase();
  return msg.includes("phone is required");
}

async function fetchHistory(base44, conversationId) {
  try {
    const rows = await base44.asServiceRole.entities.WhatsAppConversationMessage.filter(
      { conversation_id: conversationId },
      "-timestamp",
      30
    );
    return Array.isArray(rows) ? rows : [];
  } catch (_) {
    const all = await base44.asServiceRole.entities.WhatsAppConversationMessage.filter({
      conversation_id: conversationId,
    });

    const arr = Array.isArray(all) ? all : [];
    arr.sort((a, b) => {
      const ta = new Date(a.timestamp || 0).getTime();
      const tb = new Date(b.timestamp || 0).getTime();
      return tb - ta;
    });

    return arr.slice(0, 30);
  }
}

async function invokeLLM(base44, { systemPrompt, conversationHistory, userContent }) {
  const fullPrompt = `${systemPrompt}

---

**Histórico da Conversa (últimas ${conversationHistory.length} mensagens):**
${
  conversationHistory.length > 0
    ? conversationHistory
        .map((m) => `${m.role === "user" ? "Cliente" : "Agente"}: ${m.content}`)
        .join("\n")
    : "Nenhuma mensagem anterior"
}

---

**Mensagem Atual do Cliente:**
${userContent}

**Sua resposta:**`;

  try {
    const r1 = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: fullPrompt,
      add_context_from_internet: false,
    });

    const text = typeof r1 === "string" ? r1 : r1?.output || r1?.response || r1?.text || "";
    return { text, mode: "prompt" };
  } catch (e1) {
    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: userContent },
    ];

    try {
      const r2 = await base44.asServiceRole.integrations.Core.InvokeLLM({
        messages,
        add_context_from_internet: false,
      });

      const text = typeof r2 === "string" ? r2 : r2?.output || r2?.response || r2?.text || "";
      return { text, mode: "messages" };
    } catch (e2) {
      const err = new Error("InvokeLLM falhou em prompt e messages");
      err.details = { e1: safeErr(e1), e2: safeErr(e2) };
      throw err;
    }
  }
}

Deno.serve(async (req) => {
  let base44 = null;
  let payload = null;
  let stage = "start";

  try {
    base44 = createClientFromRequest(req);
    payload = await req.json();

    const {
      chat_id,
      message_id,
      content,
      session_name,
      timestamp,
      company_id,
      contact_id,
      agent_id,
      created_message_entity_id,
    } = payload;

    console.log(`[processAIWhatsAppMessage] ========== INÍCIO ==========`); 
    console.log(`[processAIWhatsAppMessage] 📨 Payload:`, {
      chat_id,
      message_id,
      company_id,
      session_name,
      contact_id,
      agent_id,
      created_message_entity_id,
    });

    stage = "validate";
    const inboundSessionName = String(session_name || "").trim();
    if (!chat_id || !message_id || !company_id || !content || !inboundSessionName) {
      console.log(`[processAIWhatsAppMessage] ❌ Dados incompletos`);
      return Response.json({ error: "Dados incompletos" }, { status: 400 });
    }

    stage = "dedupe";
    const existingMessages = await base44.asServiceRole.entities.WhatsAppConversationMessage.filter({
      message_id: message_id,
    });

    if (existingMessages?.length > 0) {
      console.log(`[processAIWhatsAppMessage] ⚠️ Duplicada ignorada: ${message_id}`);
      return Response.json({ success: true, message: "Mensagem já processada" });
    }

    stage = "conversation_lookup";
    let conversation = null;

    const conversations = await base44.asServiceRole.entities.WhatsAppConversation.filter({
      company_id: company_id,
      chat_id: chat_id,
    });

    if (conversations?.length > 0) conversation = conversations[0];

    stage = "conversation_lock";
    if (conversation) {
      if (conversation.is_processing) {
        const startedAt = conversation.processing_started_at
          ? new Date(conversation.processing_started_at).getTime()
          : 0;

        const diffMinutes = startedAt ? (Date.now() - startedAt) / 1000 / 60 : 999;

        if (diffMinutes < 2) {
          console.log(`[processAIWhatsAppMessage] 🔒 Já em processamento: ${diffMinutes.toFixed(2)} min`);
          return Response.json({ success: true, message: "Já em processamento" });
        }

        console.log(`[processAIWhatsAppMessage] ⚠️ Lock expirado, liberando...`);
        await base44.asServiceRole.entities.WhatsAppConversation.update(conversation.id, {
          is_processing: false,
        });
      }

      await base44.asServiceRole.entities.WhatsAppConversation.update(conversation.id, {
        is_processing: true,
        processing_started_at: nowIso(),
      });
    } else {
      conversation = await base44.asServiceRole.entities.WhatsAppConversation.create({
        company_id: company_id,
        chat_id: chat_id,
        contact_id: contact_id || null,
        status: "ai_active",
        first_message_date: nowIso(timestamp),
        last_message_date: nowIso(timestamp),
        message_count: 0,
        is_processing: true,
        processing_started_at: nowIso(),
      });
    }

    console.log(`[processAIWhatsAppMessage] ✅ Conversation:`, {
      id: conversation.id,
      status: conversation.status,
      current_agent_id: conversation.current_agent_id || null,
    });

    stage = "agent_resolve";
    let agent = null;

    if (agent_id) {
      const a = await base44.asServiceRole.entities.AIAgent.get(agent_id);
      if (a && a.company_id === company_id && String(a.session_name || "").trim() === inboundSessionName) {
        agent = a;
        console.log(`[processAIWhatsAppMessage] ✅ Agente por agent_id: ${agent.name} (${agent.id})`);
      } else {
        console.log(`[processAIWhatsAppMessage] ⚠️ agent_id não bate company/session`, {
          agent_id,
          agent_company_id: a?.company_id,
          agent_session_name: a?.session_name,
          inboundSessionName,
        });
      }
    }

    if (!agent) {
      const agents = await base44.asServiceRole.entities.AIAgent.filter({
        company_id: company_id,
        session_name: inboundSessionName,
      });
      if (agents?.length) {
        agent = agents[0];
        console.log(`[processAIWhatsAppMessage] ✅ Agente por company+session: ${agent.name} (${agent.id})`);
      }
    }

    if (!agent) {
      console.log(`[processAIWhatsAppMessage] ❌ Nenhum agente configurado para company+session`);
      await base44.asServiceRole.entities.WhatsAppConversation.update(conversation.id, {
        is_processing: false,
      });
      return Response.json({ error: "Nenhum agente configurado para esta sessão" }, { status: 404 });
    }

    stage = "conversation_set_agent";
    try {
      if (!conversation.current_agent_id || conversation.current_agent_id !== agent.id) {
        await base44.asServiceRole.entities.WhatsAppConversation.update(conversation.id, {
          current_agent_id: agent.id,
        });
      }
    } catch (e) {
      console.log(`[processAIWhatsAppMessage] ⚠️ Falha ao setar current_agent_id (ignorado):`, safeErr(e));
    }

    stage = "save_inbound";
    await base44.asServiceRole.entities.WhatsAppConversationMessage.create({
      company_id: company_id,
      conversation_id: conversation.id,
      chat_id: chat_id,
      message_id: message_id,
      direction: "inbound",
      content: content,
      timestamp: nowIso(timestamp),
      agent_id: agent.id,
      metadata: {
        source: "processAIWhatsAppMessage",
        session_name: inboundSessionName,
      },
    });

    stage = "history";
    const historyMessages = await fetchHistory(base44, conversation.id);
    console.log(`[processAIWhatsAppMessage] ✅ History loaded: ${historyMessages.length}`);

    stage = "contact";
    let contact = null;
    if (contact_id) {
      try {
        contact = await base44.asServiceRole.entities.Contact.get(contact_id);
      } catch (e) {
        console.log(`[processAIWhatsAppMessage] ⚠️ Falha ao carregar contato (ignorado):`, safeErr(e));
      }
    }

    stage = "products";
    let productsContext = "";
    try {
      const products = await base44.asServiceRole.entities.Product.filter({
        company_id: company_id,
        is_deleted: { '$ne': true },
        status: 'active',
      });

      if (products && products.length > 0) {
        const productsList = products.map(p => {
          const parts = [
            `**${p.name}**`,
            p.short_name ? `(${p.short_name})` : '',
            p.brand ? `Marca: ${p.brand}` : '',
            p.category ? `Categoria: ${p.category}` : '',
            p.subcategory ? `Subcategoria: ${p.subcategory}` : '',
            p.manufacturer_model ? `Modelo: ${p.manufacturer_model}` : '',
            p.sku ? `SKU: ${p.sku}` : '',
            p.ean ? `EAN: ${p.ean}` : '',
            p.sale_price ? `Preço: R$ ${p.sale_price.toFixed(2)}` : '',
            p.short_description ? `Descrição: ${p.short_description}` : '',
            p.detailed_description ? `Detalhes: ${p.detailed_description}` : '',
            p.is_on_promotion && p.promotion_price ? `PROMOÇÃO: R$ ${p.promotion_price.toFixed(2)}` : '',
          ].filter(Boolean).join(' | ');
          
          return `- ${parts}`;
        }).join('\n');

        productsContext = `\n\n**CATÁLOGO DE PRODUTOS DISPONÍVEIS:**\n${productsList}\n`;
        console.log(`[processAIWhatsAppMessage] ✅ ${products.length} produtos carregados no contexto`);
      } else {
        console.log(`[processAIWhatsAppMessage] ℹ️ Nenhum produto ativo encontrado`);
      }
    } catch (e) {
      console.log(`[processAIWhatsAppMessage] ⚠️ Falha ao carregar produtos (ignorado):`, safeErr(e));
    }

    stage = "prompt";
    const ttlMinutes = agent.conversation_ttl_minutes || 360;
    const lastMessageDate = conversation.last_message_date ? new Date(conversation.last_message_date) : null;
    const isNewCycle =
      lastMessageDate && (Date.now() - lastMessageDate.getTime()) / 1000 / 60 > ttlMinutes;

    const systemPrompt = `Você é **${agent.name}**, um agente de IA para atendimento via WhatsApp.

**Persona/Objetivo:** ${agent.persona || "Assistente geral"}
**Tom de Comunicação:** ${agent.tone || "neutro"}

**Base de Conhecimento:**
${agent.knowledge_base || "Sem informações adicionais"}
${productsContext}

**Regras de Resposta:**
${(agent.response_rules || []).map((rule, i) => `${i + 1}. ${rule}`).join("\n") || "Nenhuma regra específica"}

**Informações do Cliente:**
- Nome: ${contact?.first_name || "Cliente"} ${contact?.last_name || ""}
- Telefone: ${contact?.phone || chat_id.split("@")[0]}
- Tags: ${(contact?.tags || []).join(", ") || "Nenhuma"}
- Temperatura: ${contact?.temperature || "fria"}

${isNewCycle ? "**IMPORTANTE:** Retomada após inatividade. Cumprimente adequadamente." : ""}

**Instruções:**
- Seja prestativo e claro
- Mantenha o tom ${agent.tone || "neutro"}
- Use o histórico para contextualizar
- Use o catálogo de produtos para responder perguntas sobre disponibilidade, preços e características
- ${agent.is_training_mode ? "MODO TREINO: Gere resposta mas informe que é simulação" : "Responda naturalmente"}`;

    const conversationHistory = historyMessages
      .slice()
      .reverse()
      .map((msg) => ({
        role: msg.direction === "inbound" ? "user" : "assistant",
        content: msg.content,
      }));

    stage = "llm";
    const llm = await invokeLLM(base44, {
      systemPrompt,
      conversationHistory,
      userContent: content,
    });

    const aiResponseText = (llm?.text || "").trim();
    console.log(
      `[processAIWhatsAppMessage] 🤖 LLM ok | mode=${llm.mode} | preview=`,
      aiResponseText.substring(0, 120)
    );

    if (!aiResponseText) throw new Error("LLM retornou vazio");

    stage = "save_outbound";
    await base44.asServiceRole.entities.WhatsAppConversationMessage.create({
      company_id: company_id,
      conversation_id: conversation.id,
      chat_id: chat_id,
      message_id: `ai_${Date.now()}`,
      direction: "outbound",
      content: aiResponseText,
      timestamp: nowIso(),
      agent_id: agent.id,
      confidence: 0.8,
      is_preview: !!agent.is_training_mode,
      metadata: {
        session_name: inboundSessionName,
        llm_mode: llm.mode,
      },
    });

    // ✅ ENVIO: session = a mesma que recebeu | phone = contato que mandou msg
    stage = "send_text";
    if (!agent.is_training_mode) {
      const sendSessionName = inboundSessionName;

      // phone: prioriza contact.phone, senão extrai do chat_id
      let phone =
        (contact?.phone ? String(contact.phone).replace(/\D+/g, "") : null) ||
        extractPhoneFromChatId(chat_id);

      // ✅ Se chat_id for @lid, resolver o telefone real via resolveLid
      const isLidChat = chat_id && String(chat_id).includes("@lid");
      if (isLidChat) {
        console.log(`[processAIWhatsAppMessage] 🔍 Detectado @lid, resolvendo telefone real...`);
        console.log(`[processAIWhatsAppMessage] 🔍 Chamando resolveLid com:`, {
          lid: chat_id,
          sessionName: sendSessionName,
        });
        try {
          const lidResponse = await base44.asServiceRole.functions.invoke("resolveLid", {
            sessionName: sendSessionName,
            lid: chat_id,
          });

          console.log(`[processAIWhatsAppMessage] 🔍 Resposta resolveLid:`, lidResponse?.data);

          if (lidResponse?.data?.success && lidResponse?.data?.pn) {
            const realChatId = lidResponse.data.pn;
            phone = String(lidResponse.data.phone || realChatId.split('@')[0]).replace(/\D+/g, "");
            console.log(`[processAIWhatsAppMessage] ✅ LID resolvido: ${chat_id} -> ${realChatId} (phone: ${phone})`);

            // ✅ Iniciar typing após resolver LID
            try {
              await base44.asServiceRole.functions.invoke("startTyping", {
                sessionName: sendSessionName,
                chatId: realChatId,
              });
              console.log(`[processAIWhatsAppMessage] ⌨️ Typing iniciado`);
            } catch (typingError) {
              console.warn(`[processAIWhatsAppMessage] ⚠️ Erro ao iniciar typing (ignorado):`, safeErr(typingError));
            }
          } else {
            console.warn(`[processAIWhatsAppMessage] ⚠️ Falha ao resolver LID:`, lidResponse?.data);
          }
        } catch (lidError) {
          console.error(`[processAIWhatsAppMessage] ❌ Erro ao resolver LID:`, safeErr(lidError));
        }
      }

      console.log(`[processAIWhatsAppMessage][DEBUG] 📤 sendText resolve:`, {
        inbound_session_name: sendSessionName,
        chat_id,
        phone,
        has_contact_phone: !!contact?.phone,
        is_lid_chat: isLidChat,
      });

      if (!phone) {
        console.error(`[processAIWhatsAppMessage] ❌ phone não pôde ser determinado (chat_id inválido?)`);
      } else {
        const sendArgs = {
          session_name: sendSessionName,
          phone: phone,
          text: aiResponseText,
          // (opcional) manda também chat_id como extra, sem depender dele
          chat_id: chat_id,
        };

        console.log(`[processAIWhatsAppMessage][DEBUG] 📤 sendText args:`, {
          session_name: sendArgs.session_name,
          phone: sendArgs.phone,
          chat_id: sendArgs.chat_id,
          text_preview: String(sendArgs.text || "").substring(0, 60),
        });

        // ✅ Parar typing antes de enviar mensagem
        try {
          await base44.asServiceRole.functions.invoke("stopTyping", {
            sessionName: sendSessionName,
            chatId: chat_id,
          });
          console.log(`[processAIWhatsAppMessage] ⌨️ Typing parado`);
        } catch (typingError) {
          console.warn(`[processAIWhatsAppMessage] ⚠️ Erro ao parar typing (ignorado):`, safeErr(typingError));
        }

        try {
          await base44.asServiceRole.functions.invoke("sendText", sendArgs);
          console.log(`[processAIWhatsAppMessage] ✅ Resposta enviada via WhatsApp`);
        } catch (sendError1) {
          console.error(`[processAIWhatsAppMessage] ❌ Erro ao enviar WhatsApp (1):`, safeErr(sendError1));

          // fallback: aliases comuns de session
          if (isPhoneRequiredError(sendError1)) {
            console.error(`[processAIWhatsAppMessage] ❌ sendText ainda reclamou de phone (inesperado)`);
          }

          const sendArgsFallback = {
            session: sendSessionName,
            sessionName: sendSessionName,
            session_name: sendSessionName,
            phone: phone,
            text: aiResponseText,
            chat_id: chat_id,
          };

          console.log(`[processAIWhatsAppMessage][DEBUG] 📤 sendText fallback args:`, {
            session_name: sendArgsFallback.session_name,
            session: sendArgsFallback.session,
            sessionName: sendArgsFallback.sessionName,
            phone: sendArgsFallback.phone,
            chat_id: sendArgsFallback.chat_id,
            text_preview: String(sendArgsFallback.text || "").substring(0, 60),
          });

          try {
            await base44.asServiceRole.functions.invoke("sendText", sendArgsFallback);
            console.log(`[processAIWhatsAppMessage] ✅ Resposta enviada via WhatsApp (fallback)`);
          } catch (sendError2) {
            console.error(`[processAIWhatsAppMessage] ❌ Erro ao enviar WhatsApp (2/fallback):`, safeErr(sendError2));
          }
        }
      }
    } else {
      console.log(`[processAIWhatsAppMessage] 🎭 Modo treino - não enviou WhatsApp`);
    }

    stage = "conversation_update";
    await base44.asServiceRole.entities.WhatsAppConversation.update(conversation.id, {
      is_processing: false,
      last_message_date: nowIso(),
      last_ai_response_date: nowIso(),
      message_count: (conversation.message_count || 0) + 2,
    });

    stage = "agent_stats";
    try {
      await base44.asServiceRole.entities.AIAgent.update(agent.id, {
        stats: {
          ...agent.stats,
          total_conversations: (agent.stats?.total_conversations || 0) + 1,
        },
      });
    } catch (e) {
      console.log(`[processAIWhatsAppMessage] ⚠️ Falha stats (ignorado):`, safeErr(e));
    }

    console.log(`[processAIWhatsAppMessage] ========== FIM (SUCESSO) ==========`);

    return Response.json({
      success: true,
      agent_name: agent.name,
      response: aiResponseText,
      is_training_mode: !!agent.is_training_mode,
      llm_mode: llm.mode,
      send_session_name: inboundSessionName,
      send_phone: extractPhoneFromChatId(chat_id),
    });
  } catch (error) {
    console.error("[processAIWhatsAppMessage] ❌ ERRO:", { stage, error: safeErr(error) });

    // liberar lock
    try {
      const chat_id = payload?.chat_id;
      const company_id = payload?.company_id;

      if (base44 && chat_id && company_id) {
        const convs = await base44.asServiceRole.entities.WhatsAppConversation.filter({
          company_id,
          chat_id,
        });
        if (convs?.length) {
          await base44.asServiceRole.entities.WhatsAppConversation.update(convs[0].id, {
            is_processing: false,
          });
        }
      }
    } catch (unlockError) {
      console.error("[processAIWhatsAppMessage] ⚠️ Erro ao liberar lock:", safeErr(unlockError));
    }

    return Response.json(
      {
        success: false,
        stage,
        error: error?.message || String(error),
        details: error?.details || null,
      },
      { status: 500 }
    );
  }
});