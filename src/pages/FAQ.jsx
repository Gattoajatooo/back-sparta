
import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  HelpCircle,
  Search,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Smartphone,
  Users,
  Calendar,
  Shield,
  CreditCard,
  Settings,
  Zap,
  AlertCircle,
  CheckCircle2,
  ExternalLink
} from "lucide-react";

export default function FAQ() {
  const [user, setUser] = useState(null);
  const [faqs, setFaqs] = useState([]);
  const [filteredFaqs, setFilteredFaqs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [openItems, setOpenItems] = useState({});

  const faqCategories = [
    { id: "connection", name: "Conexão & WhatsApp", icon: Smartphone, color: "bg-green-100 text-green-800" },
    { id: "messages", name: "Envio de Mensagens", icon: MessageSquare, color: "bg-blue-100 text-blue-800" },
    { id: "contacts", name: "Gerenciamento de Contatos", icon: Users, color: "bg-purple-100 text-purple-800" },
    { id: "campaigns", name: "Campanhas", icon: Zap, color: "bg-orange-100 text-orange-800" },
    { id: "scheduling", name: "Agendamento", icon: Calendar, color: "bg-yellow-100 text-yellow-800" },
    { id: "account", name: "Conta & Perfil", icon: Settings, color: "bg-gray-100 text-gray-800" },
    { id: "billing", name: "Faturamento", icon: CreditCard, color: "bg-indigo-100 text-indigo-800" },
    { id: "security", name: "Segurança", icon: Shield, color: "bg-red-100 text-red-800" }
  ];

  const mockFaqs = [
    {
      id: "whatsapp-connection",
      category: "connection",
      question: "Como conectar meu WhatsApp ao sistema?",
      answer: "Para conectar seu WhatsApp: 1) Acesse a página Connect, 2) Clique em 'Create Session', 3) Escaneie o QR Code com seu celular, 4) Aguarde a confirmação da conexão. Certifique-se de manter o celular próximo durante o processo.",
      difficulty: "easy",
      views: 1250,
      helpful: 95
    },
    {
      id: "multiple-sessions",
      category: "connection", 
      question: "Posso conectar múltiplas contas do WhatsApp?",
      answer: "Sim, você pode conectar até 5 sessões simultaneamente, dependendo do seu plano. Cada sessão representa uma conta diferente do WhatsApp. Para adicionar mais sessões, vá em Connect > Create Session.",
      difficulty: "medium",
      views: 890,
      helpful: 87
    },
    {
      id: "session-disconnected",
      category: "connection",
      question: "Minha sessão desconectou, o que fazer?",
      answer: "Se sua sessão desconectou: 1) Verifique se seu celular está conectado à internet, 2) Na página Sessions, clique no menu da sessão e selecione 'Reconnect', 3) Se necessário, escaneie o QR Code novamente. Evite usar o WhatsApp Web em outros dispositivos simultaneamente.",
      difficulty: "easy",
      views: 2100,
      helpful: 92
    },
    {
      id: "bulk-messages",
      category: "messages",
      question: "Como enviar mensagens em massa?",
      answer: "Para enviar mensagens em massa: 1) Vá em Campaigns > Create Campaign, 2) Escolha o tipo de campanha, 3) Selecione os contatos ou grupos, 4) Configure sua mensagem usando templates, 5) Agende ou envie imediatamente. Respeite sempre os limites de envio do seu plano.",
      difficulty: "medium",
      views: 1680,
      helpful: 89
    },
    {
      id: "message-templates",
      category: "messages",
      question: "Como usar templates de mensagem?",
      answer: "Templates facilitam o envio de mensagens padronizadas. Acesse Templates > Create Template, defina variáveis como {{nome}} para personalização automática. Use templates em campanhas ou mensagens individuais para maior eficiência.",
      difficulty: "easy",
      views: 1420,
      helpful: 94
    },
    {
      id: "import-contacts",
      category: "contacts",
      question: "Como importar meus contatos em massa?",
      answer: "Para importar contatos: 1) Acesse Contacts > Import, 2) Faça download do template CSV, 3) Preencha os dados dos contatos, 4) Faça upload do arquivo, 5) Configure o mapeamento dos campos, 6) Execute a importação. O sistema validará os dados automaticamente.",
      difficulty: "medium",
      views: 980,
      helpful: 88
    },
    {
      id: "schedule-messages",
      category: "scheduling",
      question: "Como agendar mensagens para envio posterior?",
      answer: "No Scheduler: 1) Clique em 'Schedule Message', 2) Escolha os destinatários, 3) Configure sua mensagem, 4) Selecione data e horário de envio, 5) Confirme o agendamento. As mensagens são enviadas automaticamente no horário programado.",
      difficulty: "easy",
      views: 1340,
      helpful: 91
    },
    {
      id: "campaign-types",
      category: "campaigns",
      question: "Quais tipos de campanha posso criar?",
      answer: "Você pode criar campanhas de: Aniversário (automáticas), Cobrança (lembretes), Boas-vindas (novos clientes), Promocionais (ofertas), Retenção (clientes inativos), e Follow-up (pós-venda). Cada tipo tem configurações específicas e triggers automáticos.",
      difficulty: "medium",
      views: 760,
      helpful: 85
    },
    {
      id: "plan-limits",
      category: "billing",
      question: "Quais são os limites do meu plano?",
      answer: "Os limites variam por plano: Basic (5K mensagens, 6K contatos), Plus (15K mensagens, 20K contatos), Premium (50K mensagens, 100K contatos). Acesse Plans & Billing para ver seu uso atual e limites detalhados.",
      difficulty: "easy",
      views: 1890,
      helpful: 93
    },
    {
      id: "upgrade-plan",
      category: "billing",
      question: "Como fazer upgrade do meu plano?",
      answer: "Para fazer upgrade: 1) Acesse Plans & Billing, 2) Compare os planos disponíveis, 3) Clique em 'Upgrade' no plano desejado, 4) Escolha o método de pagamento, 5) Confirme a alteração. O upgrade é aplicado imediatamente.",
      difficulty: "easy",
      views: 1120,
      helpful: 90
    }
  ];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterFaqs();
  }, [searchTerm, selectedCategory, faqs]);

  const loadData = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);
      setFaqs(mockFaqs);
    } catch (error) {
      console.error("Error loading FAQ:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterFaqs = () => {
    let filtered = faqs;

    if (selectedCategory !== "all") {
      filtered = filtered.filter(faq => faq.category === selectedCategory);
    }

    if (searchTerm) {
      filtered = filtered.filter(faq => 
        faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredFaqs(filtered);
  };

  const toggleItem = (id) => {
    setOpenItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const getCategoryInfo = (categoryId) => {
    return faqCategories.find(cat => cat.id === categoryId);
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case "easy": return "bg-green-100 text-green-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "hard": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getDifficultyLabel = (difficulty) => {
    switch (difficulty) {
      case "easy": return "Fácil";
      case "medium": return "Médio";
      case "hard": return "Difícil";
      default: return "Normal";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-orange-700 rounded-2xl flex items-center justify-center">
          <HelpCircle className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">FAQ</h1>
          <p className="text-gray-600">
            Encontre respostas para as principais dúvidas sobre o sistema
          </p>
        </div>
      </div>

      {/* Search */}
      <Card className="rounded-3xl border-gray-200">
        <CardContent className="p-6">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Buscar nas perguntas frequentes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-2xl border-gray-200 text-lg py-3"
            />
          </div>
        </CardContent>
      </Card>

      {/* Categories */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {faqCategories.map(category => {
          const count = faqs.filter(faq => faq.category === category.id).length;
          const Icon = category.icon;
          
          return (
            <Card 
              key={category.id} 
              className={`rounded-2xl border-gray-200 hover:shadow-md transition-all cursor-pointer ${
                selectedCategory === category.id ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
              }`}
              onClick={() => setSelectedCategory(selectedCategory === category.id ? "all" : category.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${category.color} rounded-2xl flex items-center justify-center`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 text-sm">{category.name}</h3>
                    <p className="text-xs text-gray-500">{count} perguntas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* FAQ List */}
      <div className="space-y-3">
        {filteredFaqs.map(faq => {
          const category = getCategoryInfo(faq.category);
          const isOpen = openItems[faq.id];
          
          return (
            <Card key={faq.id} className="rounded-2xl border-gray-200">
              <Collapsible open={isOpen} onOpenChange={() => toggleItem(faq.id)}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-gray-50 rounded-t-2xl transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`w-8 h-8 ${category?.color} rounded-xl flex items-center justify-center flex-shrink-0 mt-1`}>
                          {category && <category.icon className="w-4 h-4" />}
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-left text-gray-900 text-base font-semibold">
                            {faq.question}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className={`text-xs rounded-full ${getDifficultyColor(faq.difficulty)}`}>
                              {getDifficultyLabel(faq.difficulty)}
                            </Badge>
                            <span className="text-xs text-gray-500">{faq.views} visualizações</span>
                            <span className="text-xs text-gray-500">•</span>
                            <div className="flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-green-600" />
                              <span className="text-xs text-gray-500">{faq.helpful}% útil</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {isOpen ? (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 pb-6 px-6">
                    <div className="pl-11">
                      <div className="prose max-w-none">
                        <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                      </div>
                      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
                        <span className="text-sm text-gray-600">Esta resposta foi útil?</span>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="rounded-full px-4">
                            <CheckCircle2 className="w-4 h-4 mr-1 text-green-600" />
                            Sim
                          </Button>
                          <Button variant="outline" size="sm" className="rounded-full px-4">
                            <AlertCircle className="w-4 h-4 mr-1 text-red-600" />
                            Não
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>

      {filteredFaqs.length === 0 && (
        <Card className="rounded-3xl border-gray-200">
          <CardContent className="text-center py-12">
            <HelpCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhuma pergunta encontrada</h3>
            <p className="text-gray-500 mb-4">
              Não encontrou o que procura? Tente ajustar os filtros ou entre em contato conosco.
            </p>
            <Button className="rounded-2xl">
              <ExternalLink className="w-4 h-4 mr-2" />
              Entrar em Contato
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <Card className="rounded-3xl border-gray-200 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardContent className="p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Ainda precisa de ajuda?</h3>
            <p className="text-gray-600 mb-4">
              Se não encontrou a resposta que procurava, nossa equipe de suporte está pronta para ajudar.
            </p>
            <div className="flex justify-center gap-3">
              <Button className="rounded-2xl">
                <MessageSquare className="w-4 h-4 mr-2" />
                Abrir Ticket
              </Button>
              <Button variant="outline" className="rounded-2xl">
                <ExternalLink className="w-4 h-4 mr-2" />
                Falar no WhatsApp
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
