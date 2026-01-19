import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bot,
  Sparkles,
  Database,
  Lock,
  Eye,
  Save,
  CheckCircle2,
} from "lucide-react";

export default function AIAgents() {
  const [user, setUser] = useState(null);
  const [agent, setAgent] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    is_general: true,
    session_name: "",
    persona: "",
    greeting_message: "",
    tone: "amigavel",
    knowledge_base: "",
    conversation_ttl_minutes: 360,
    whatsapp_enabled: true,
    is_active: true,
    is_training_mode: false,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const [allAgents, allSessions] = await Promise.all([
        base44.entities.AIAgent.filter({
          company_id: currentUser.company_id,
          is_general: true,
        }),
        base44.entities.Session.filter({
          company_id: currentUser.company_id,
          is_deleted: { '$ne': true },
          status: { '$in': ['WORKING', 'SCAN_QR_CODE', 'STARTING'] }
        })
      ]);

      const companyAgent = allAgents.length > 0 ? allAgents[0] : null;
      
      if (companyAgent) {
        setAgent(companyAgent);
        setFormData({
          name: companyAgent.name,
          description: companyAgent.description || "",
          is_general: true,
          session_name: companyAgent.session_name || "",
          persona: companyAgent.persona || "",
          greeting_message: companyAgent.greeting_message || "",
          tone: companyAgent.tone || "amigavel",
          knowledge_base: companyAgent.knowledge_base || "",
          conversation_ttl_minutes: companyAgent.conversation_ttl_minutes || 360,
          whatsapp_enabled: companyAgent.whatsapp_enabled !== false,
          is_active: companyAgent.is_active !== false,
          is_training_mode: companyAgent.is_training_mode || false,
        });
      }

      setSessions(allSessions);
    } catch (error) {
      console.error("Erro ao carregar agente:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const data = {
        ...formData,
        company_id: user.company_id,
        is_general: true,
      };

      if (agent) {
        await base44.entities.AIAgent.update(agent.id, data);
      } else {
        await base44.entities.AIAgent.create(data);
      }

      await loadData();
      alert("✅ Configurações salvas com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar agente:", error);
      alert("❌ Erro ao salvar configurações do agente");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto overflow-hidden">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690a8ae384e85f405dd1958f/8d6af0619_ChatGPTImage24denovde202519_02_27.png"
              alt="Sparta Sync"
              className="w-16 h-16 object-contain"
            />
            <div className="shine-effect"></div>
          </div>
          <style>
            {`
              @keyframes shine {
                0% {
                  transform: translateX(-100%) translateY(100%) rotate(-45deg);
                  opacity: 0;
                }
                50% {
                  opacity: 1;
                }
                100% {
                  transform: translateX(100%) translateY(-100%) rotate(-45deg);
                  opacity: 0;
                }
              }
              .shine-effect {
                position: absolute;
                top: -50%;
                left: -50%;
                width: 250%;
                height: 250%;
                background: linear-gradient(
                  to right,
                  rgba(255, 255, 255, 0) 0%,
                  rgba(255, 255, 255, 0) 20%,
                  rgba(255, 255, 255, 0.8) 50%,
                  rgba(255, 255, 255, 0) 80%,
                  rgba(255, 255, 255, 0) 100%
                );
                animation: shine 2.5s ease-in-out infinite;
                pointer-events: none;
              }
            `}
          </style>
        </div>
      </div>
    );
  }

  if (user?.role !== "admin" && user?.system_role !== "admin") {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md rounded-3xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mb-4">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Agente de IA
          </h2>
          <p className="text-gray-600">
            Acesso restrito a administradores
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Agente de IA</h1>
              <p className="text-sm text-gray-500">
                Configure o agente inteligente para atendimento via WhatsApp
              </p>
            </div>
          </div>
        </div>

        {/* Info sobre acesso a dados */}
        <Card className="mb-6 rounded-2xl border-2 border-blue-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="w-5 h-5 text-blue-600" />
              Informações Acessíveis pela IA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-green-900 mb-1">Catálogo de Produtos</p>
                  <p className="text-xs text-green-700">
                    Nome, Descrição, Fabricante, Identificação, Imagens, Preço de Venda, 
                    Categoria, Marca, Subcategoria, Modelo, Código de Barras
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-green-50 rounded-xl border border-green-200">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-green-900 mb-1">Base de Conhecimento</p>
                  <p className="text-xs text-green-700">
                    Informações da empresa, produtos, serviços e instruções personalizadas
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl border border-red-200">
                <Lock className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-red-900 mb-1">Dados Bloqueados</p>
                  <p className="text-xs text-red-700">
                    Informações Fiscais, Fornecedores, Auditoria, Estoque, 
                    Custos, Notas Fiscais, Margem de Lucro
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <Eye className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-blue-900 mb-1">Transparência</p>
                  <p className="text-xs text-blue-700">
                    A IA tem acesso apenas a informações comerciais públicas 
                    para auxiliar nas vendas e atendimento
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Formulário Principal */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              Configurações do Agente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label>Nome do Agente *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Assistente de Vendas"
                className="rounded-xl"
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva o perfil e função deste agente..."
                className="rounded-xl h-20"
              />
            </div>

            <div>
              <Label>Persona/Objetivo *</Label>
              <Input
                value={formData.persona}
                onChange={(e) => setFormData({ ...formData, persona: e.target.value })}
                placeholder="Ex: Auxiliar clientes na escolha de produtos e realizar vendas"
                className="rounded-xl"
              />
            </div>

            <div>
              <Label>Sessão WhatsApp *</Label>
              <Select
                value={formData.session_name}
                onValueChange={(value) => setFormData({ ...formData, session_name: value })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Selecione uma sessão ativa" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.length === 0 ? (
                    <SelectItem value={null} disabled>Nenhuma sessão ativa</SelectItem>
                  ) : (
                    sessions.map((session) => (
                      <SelectItem key={session.id} value={session.session_name}>
                        {session.custom_name || session.session_name} - {session.phone || 'Sem número'}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Sessão que o agente usará para enviar respostas
              </p>
            </div>

            <div>
              <Label>Mensagem de Saudação</Label>
              <Textarea
                value={formData.greeting_message}
                onChange={(e) => setFormData({ ...formData, greeting_message: e.target.value })}
                placeholder="Olá! Como posso ajudar você hoje?"
                className="rounded-xl h-20"
              />
            </div>

            <div>
              <Label>Tom de Comunicação</Label>
              <Select
                value={formData.tone}
                onValueChange={(value) => setFormData({ ...formData, tone: value })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="formal">Formal</SelectItem>
                  <SelectItem value="informal">Informal</SelectItem>
                  <SelectItem value="amigavel">Amigável</SelectItem>
                  <SelectItem value="profissional">Profissional</SelectItem>
                  <SelectItem value="descontraido">Descontraído</SelectItem>
                  <SelectItem value="mineirinho">Mineirinho</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>TTL da Conversa (minutos)</Label>
              <Input
                type="number"
                value={formData.conversation_ttl_minutes}
                onChange={(e) => setFormData({ ...formData, conversation_ttl_minutes: parseInt(e.target.value) || 360 })}
                placeholder="360"
                className="rounded-xl"
              />
              <p className="text-xs text-gray-500 mt-1">
                Tempo para considerar como nova conversa (padrão: 6 horas)
              </p>
            </div>

            <div>
              <Label>Base de Conhecimento Adicional</Label>
              <Textarea
                value={formData.knowledge_base}
                onChange={(e) => setFormData({ ...formData, knowledge_base: e.target.value })}
                placeholder="Instruções específicas, políticas da empresa, informações adicionais..."
                className="rounded-xl h-32"
              />
              <p className="text-xs text-gray-500 mt-1">
                O agente já tem acesso ao catálogo de produtos. Adicione informações complementares aqui.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <Label>WhatsApp Ativo</Label>
                  <p className="text-xs text-gray-500 mt-1">
                    Permitir atendimento via WhatsApp
                  </p>
                </div>
                <Switch
                  checked={formData.whatsapp_enabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, whatsapp_enabled: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-amber-50 rounded-xl border border-amber-200">
                <div>
                  <Label>Modo Treino</Label>
                  <p className="text-xs text-gray-500 mt-1">
                    Gera respostas mas não envia
                  </p>
                </div>
                <Switch
                  checked={formData.is_training_mode}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_training_mode: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <Label>Agente Ativo</Label>
                  <p className="text-xs text-gray-500 mt-1">
                    Ativar ou desativar o agente
                  </p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button
                onClick={handleSave}
                disabled={isSaving || !formData.name || !formData.session_name}
                className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600"
              >
                {isSaving ? (
                  <>Salvando...</>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Configurações
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}