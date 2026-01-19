import React, { useState, useEffect, useRef } from "react";
import { agentSDK } from "@/agents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Bot, Send, X, Loader2, Sparkles } from "lucide-react";
import MessageBubble from "./chat/MessageBubble";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";

export default function AtenaChat({ onClose }) {
    const [conversation, setConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [userInput, setUserInput] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isAgentReplying, setIsAgentReplying] = useState(false);
    const [typingMessageId, setTypingMessageId] = useState(null);
    const [aiName, setAiName] = useState("Atena");
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        const initializeConversation = async () => {
            setIsLoading(true);
            try {
                // Buscar usuário atual
                const currentUser = await base44.auth.me();
                
                // Buscar contexto da IA
                const contextResponse = await base44.functions.invoke('getAIContext', {});
                const aiContext = contextResponse.data?.context || {};

                console.log('[AtenaChat] AI Context loaded:', aiContext);
                console.log('[AtenaChat] User company_id:', currentUser.company_id);

                // Atualizar nome da IA
                const assistantName = aiContext.name || aiContext.ai_name || "Atena";
                setAiName(assistantName);

                // Buscar conversas DESTA empresa específica
                const existingConversations = await agentSDK.listConversations({ 
                    agent_name: "atena"
                });

                // Filtrar conversas da empresa atual
                const companyConversations = existingConversations.filter(conv => 
                    conv.metadata?.company_id === currentUser.company_id
                );
                
                let conv;
                const contextMessage = buildContextMessage(aiContext, assistantName);
                
                if (companyConversations && companyConversations.length > 0) {
                    // Usar conversa existente da empresa (mantém histórico)
                    conv = companyConversations[0];
                    console.log('[AtenaChat] Usando conversa existente:', conv.id, 'com', conv.messages?.length || 0, 'mensagens');
                    
                    // SEMPRE adicionar contexto atualizado no início de cada sessão
                    // Isso garante que o agente tenha o contexto mais recente
                    await agentSDK.addMessage(conv, {
                        role: 'system',
                        content: `[CONTEXTO ATUALIZADO - ${new Date().toISOString()}]\n\n${contextMessage}`
                    });
                    
                    console.log('[AtenaChat] Contexto atualizado adicionado à conversa existente');
                } else {
                    // Criar nova conversa com contexto da empresa
                    conv = await agentSDK.createConversation({ 
                        agent_name: "atena",
                        metadata: {
                            company_id: currentUser.company_id,
                            company_name: aiContext.company_name,
                            ai_name: assistantName,
                            created_at: new Date().toISOString(),
                            last_updated: new Date().toISOString()
                        }
                    });

                    console.log('[AtenaChat] Nova conversa criada:', conv.id);

                    // Adicionar mensagem de sistema com contexto inicial
                    await agentSDK.addMessage(conv, {
                        role: 'system',
                        content: contextMessage
                    });
                    
                    console.log('[AtenaChat] Contexto inicial adicionado');
                }

                if (conv) {
                    setConversation(conv);
                    
                    // Recarregar conversa para pegar todas as mensagens atualizadas
                    const updatedConv = await agentSDK.getConversation(conv.id);
                    
                    // Filtrar mensagens do sistema para não aparecer no chat
                    // Mantém TODO o histórico de mensagens user/assistant
                    const visibleMessages = (updatedConv.messages || []).filter(m => m.role !== 'system');
                    setMessages(visibleMessages);
                    
                    console.log('[AtenaChat] Conversa inicializada com', visibleMessages.length, 'mensagens visíveis');
                } else {
                    throw new Error("Falha ao inicializar a conversa.");
                }

            } catch (error) {
                console.error("Erro ao inicializar a conversa:", error);
                setMessages([{ role: 'assistant', content: `Desculpe, não consegui iniciar uma conversa. Por favor, tente novamente mais tarde.` }]);
            } finally {
                setIsLoading(false);
            }
        };

        // Função helper para construir mensagem de contexto
        const buildContextMessage = (aiContext, assistantName) => {
            return `# CONTEXTO DA EMPRESA E IDENTIDADE DA IA

Você é **${assistantName}**, a assistente de IA personalizada e exclusiva da empresa **${aiContext.company_name}**.

## INFORMAÇÕES DA EMPRESA

**Nome:** ${aiContext.company_name || 'Não informado'}
**Setor:** ${aiContext.business_sector || 'Não informado'}

**Descrição do Negócio:**
${aiContext.business_description || 'Informações não disponíveis sobre o negócio.'}

**Público-Alvo:**
${aiContext.target_audience || 'Público-alvo não especificado.'}

**Produtos e Serviços:**
${aiContext.main_products_services || 'Produtos/serviços não especificados.'}

**Proposta de Valor:**
${aiContext.value_proposition || 'Proposta de valor não definida.'}

**Tom de Comunicação Esperado:**
${aiContext.company_tone || 'Profissional e amigável'}

**Objetivos do Negócio:**
${aiContext.business_goals || 'Objetivos não especificados.'}

**Diferenciais Competitivos:**
${aiContext.competitive_advantages || 'Diferenciais não especificados.'}

---

## REGRAS ABSOLUTAS DE COMPORTAMENTO

1. **IDENTIDADE FIXA**: Você é ${assistantName}. Use sempre este nome. Não use "Atena" ou qualquer outro nome.

2. **MEMÓRIA COMPLETA**: Você TEM acesso ao histórico completo desta conversa. Use o contexto de mensagens anteriores para dar continuidade às conversas. Refira-se a informações mencionadas anteriormente pelo usuário.

3. **CONTEXTUALIZAÇÃO OBRIGATÓRIA**: TODAS as suas respostas devem refletir o contexto da empresa acima. Quando sugerir algo, baseie-se nos produtos, público-alvo e objetivos desta empresa específica.

4. **TOM CONSISTENTE**: Use o tom "${aiContext.company_tone || 'Profissional e amigável'}" em todas as respostas. Não mude de personalidade.

5. **CONHECIMENTO ESPECÍFICO**: Você conhece profundamente:
   - Os produtos/serviços desta empresa
   - O público-alvo e suas dores
   - Os objetivos estratégicos
   - Os diferenciais competitivos

6. **PROATIVIDADE INTELIGENTE**: 
   - Sugira ações específicas baseadas no contexto do negócio
   - Identifique oportunidades relacionadas aos objetivos da empresa
   - Ofereça insights práticos sobre uso da plataforma Sparta Sync

7. **CONTINUIDADE**: Esta é uma conversa contínua. O histórico está preservado. Quando o usuário mencionar algo que discutimos antes, você deve lembrar e referenciar.

IMPORTANTE: Use as informações de contexto acima para personalizar CADA resposta. Não dê respostas genéricas.`;
        };

        initializeConversation();
    }, []);

    useEffect(() => {
        if (!conversation?.id) return;

        const unsubscribe = agentSDK.subscribeToConversation(conversation.id, (data) => {
            setConversation(data);
            const newMessages = data.messages;
            
            // Verificar se há uma nova mensagem da assistente
            const lastMessage = newMessages[newMessages.length - 1];
            const lastOldMessage = messages[messages.length - 1];
            
            if (lastMessage && 
                lastMessage.role === 'assistant' && 
                lastMessage.content &&
                (!lastOldMessage || lastMessage.id !== lastOldMessage.id)) {
                
                // Nova mensagem da assistente - iniciar efeito de digitação
                setTypingMessageId(lastMessage.id || newMessages.length - 1);
                setMessages(newMessages);
                setIsAgentReplying(true); // Manter indicador durante a digitação
            } else {
                setMessages(newMessages);
            }
            
            // Verificar se ainda está processando
            if (lastMessage && lastMessage.role === 'assistant' && lastMessage.is_complete === false) {
                setIsAgentReplying(true);
            } else if (!typingMessageId) {
                setIsAgentReplying(false);
            }
        });

        return () => unsubscribe();
    }, [conversation?.id, messages, typingMessageId]);
    
    useEffect(scrollToBottom, [messages]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!userInput.trim() || isLoading || !conversation) return;

        const newUserMessage = { role: 'user', content: userInput.trim() };
        setMessages(prev => [...prev, newUserMessage]);
        setUserInput("");
        setIsAgentReplying(true);

        try {
            await agentSDK.addMessage(conversation, newUserMessage);
        } catch (error) {
            console.error("Erro ao enviar mensagem:", error);
            setMessages(prev => [...prev, { role: 'assistant', content: "Desculpe, ocorreu um erro ao enviar sua mensagem." }]);
            setIsAgentReplying(false);
        }
    };

    const handleTypingComplete = () => {
        setTypingMessageId(null);
        setIsAgentReplying(false);
    };

    // Função para scroll durante a digitação
    const handleTypingProgress = () => {
        scrollToBottom();
    };

    const ThinkingBubble = () => (
        <div className="flex gap-3 my-4 justify-start">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-lg px-4 py-2.5 flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />
                <span className="text-sm text-slate-600">{aiName} está pensando...</span>
            </div>
        </div>
    );

    return (
        <div className="fixed bottom-24 right-8 z-50">
            <Card className="w-[440px] h-[634px] flex flex-col rounded-2xl shadow-2xl border-gray-300">
                <CardHeader className="bg-slate-50 rounded-t-2xl border-b flex-row items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white">
                            <Sparkles className="w-6 h-6" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-bold text-slate-800">{aiName}</CardTitle>
                            <p className="text-sm text-slate-500">Sua assistente de IA personalizada</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                        <X className="w-5 h-5 text-slate-600" />
                    </Button>
                </CardHeader>

                <CardContent className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
                    {isLoading ? (
                         <div className="flex items-center justify-center h-full">
                            <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                         </div>
                    ) : (
                        <>
                            {messages.map((msg, index) => (
                                <MessageBubble 
                                    key={index} 
                                    message={msg} 
                                    isTyping={typingMessageId === (msg.id || index)}
                                    onTypingComplete={handleTypingComplete}
                                    onTypingProgress={handleTypingProgress}
                                />
                            ))}
                            {isAgentReplying && !typingMessageId && <ThinkingBubble />}
                        </>
                    )}
                    <div ref={messagesEndRef} />
                </CardContent>

                <CardFooter className="p-4 border-t bg-white rounded-b-2xl">
                    <form onSubmit={handleSubmit} className="flex w-full gap-2">
                        <Input
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            placeholder={`Pergunte algo à ${aiName}...`}
                            className="flex-1 rounded-full px-4"
                        />
                        <Button 
                            type="submit" 
                            disabled={!userInput.trim()} 
                            className="rounded-full bg-blue-600 hover:bg-blue-700"
                        >
                            <Send className="w-5 h-5" />
                        </Button>
                    </form>
                </CardFooter>
            </Card>
        </div>
    );
}