
import React, { useState, useEffect, useCallback } from "react";
import { Plan } from "@/entities/Plan";
import { PlanVersion } from "@/entities/PlanVersion";
import { Feature } from "@/entities/Feature";
import { PlanFeatureValue } from "@/entities/PlanFeatureValue";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Plus,
  CreditCard,
  Settings,
  Eye,
  Edit,
  MoreVertical,
  Star,
  Package,
  Users,
  CheckCircle2,
  AlertCircle,
  LayoutGrid,
  List,
  RefreshCw
} from "lucide-react";

import PlanFormModal from "../components/plans/PlanFormModal";
import PlanDetailsModal from "../components/plans/PlanDetailsModal";

export default function PlansAdmin() {
  const [user, setUser] = useState(null);
  const [plans, setPlans] = useState([]);
  const [features, setFeatures] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [billingPeriod, setBillingPeriod] = useState("monthly"); // Added billing period state

  // Modal states
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [viewingPlan, setViewingPlan] = useState(null);

  // Notification state
  const [notification, setNotification] = useState({
    show: false,
    type: 'success',
    message: ''
  });

  const showNotification = (type, message) => {
    setNotification({ show: true, type, message });
    setTimeout(() => {
      setNotification({ show: false, type: 'success', message: '' });
    }, 5000);
  };

  // Helper para aguardar entre requisições (rate limiting)
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const getAllAvailableFeatures = () => {
    return [
      { key: 'active_sessions', name: 'Sessões Ativas', description: 'Número de sessões de WhatsApp simultâneas que você pode manter conectadas', type: 'number', unit: 'sessões' },
      { key: 'active_contacts', name: 'Contatos Ativos', description: 'Quantidade total de contatos que podem ser armazenados na plataforma', type: 'number', unit: 'contatos' },
      { key: 'messages_per_month', name: 'Mensagens por Mês', description: 'Número de mensagens que podem ser enviadas por mês', type: 'number', unit: 'mensagens' },
      { key: 'template_models', name: 'Modelos de Template', description: 'Quantidade de templates de mensagem que você pode criar e salvar', type: 'number', unit: 'modelos' },
      { key: 'message_reception', name: 'Recepção de Mensagens', description: 'Permite receber e visualizar respostas dos contatos na plataforma', type: 'boolean' },
      { key: 'recurring_campaigns', name: 'Campanhas Recorrentes', description: 'Campanhas que se repetem automaticamente em intervalos definidos', type: 'number', unit: 'campanhas' },
      { key: 'dynamic_campaigns', name: 'Campanhas Dinâmicas', description: 'Campanhas que se adaptam aos contatos em tempo real baseado em filtros', type: 'number', unit: 'campanhas' },
      { key: 'active_tags', name: 'Marcadores Ativos', description: 'Tags para organizar e segmentar seus contatos', type: 'number', unit: 'marcadores' },
      { key: 'active_smart_tags', name: 'Marcadores Inteligentes', description: 'Tags automáticas baseadas em regras e comportamento dos contatos', type: 'number', unit: 'marcadores' },
      { key: 'report_personalization', name: 'Relatórios Personalizados', description: 'Relatórios personalizados para acompanhar métricas específicas', type: 'number', unit: 'relatórios' },
      { key: 'support_hours', name: 'Suporte (horas)', description: 'Tempo máximo de resposta do suporte técnico em horas', type: 'number', unit: 'horas' },
      { key: 'implementation_help', name: 'Ajuda na Implementação', description: 'Suporte especializado para configurar e otimizar sua conta', type: 'boolean' },
      { key: 'company_users', name: 'Usuários da Empresa', description: 'Número de pessoas da sua equipe que podem acessar a plataforma', type: 'number', unit: 'usuários' },
      { key: 'roles_permissions', name: 'Funções e Permissões', description: 'Perfis de acesso customizados com permissões específicas', type: 'number', unit: 'funções' },
      { key: 'daily_whatsapp_notifications', name: 'Relatórios Diários WhatsApp', description: 'Receba um resumo diário das atividades da sua conta via WhatsApp', type: 'boolean' }
    ];
  };

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Verificar auth primeiro
      const currentUser = await User.me();
      setUser(currentUser);

      if (currentUser?.role !== 'admin') {
        showNotification('error', 'Acesso negado. Apenas administradores podem acessar esta página.');
        setIsLoading(false);
        return;
      }

      // Aguardar um pouco antes de fazer mais chamadas
      await delay(500);

      // Buscar apenas planos reais do banco de dados
      const planList = await Plan.list('-display_order');
      
      await delay(300);
      
      const featureList = await Feature.filter({ is_active: true }, 'name');
      
      setFeatures(featureList);

      // Usar apenas planos reais do banco - sem dados de exemplo
      const processedPlans = planList.map(plan => ({
        ...plan,
        activeVersion: {
          price_cents: plan.price * 100, // Converter para centavos
          is_active: plan.is_active
        },
        features: [] // Deixar vazio por agora para evitar muitas requisições
      }));

      setPlans(processedPlans);

    } catch (error) {
      console.error("Erro ao carregar planos:", error);
      
      if (error.response?.status === 429) {
        showNotification('error', 'Muitas requisições. Aguarde um momento e tente novamente.');
      } else {
        showNotification('error', 'Erro ao carregar dados dos planos.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Debounce o carregamento inicial
    const timer = setTimeout(() => {
      loadData();
    }, 100);

    return () => clearTimeout(timer);
  }, [loadData]);

  const handleCreatePlan = () => {
    setEditingPlan(null);
    setShowPlanForm(true);
  };

  const handleEditPlan = (plan) => {
    setEditingPlan(plan);
    setShowPlanForm(true);
  };

  const handleViewDetails = (plan) => {
    setViewingPlan(plan);
    setShowDetailsModal(true);
  };

  const handleDeletePlan = async (plan) => {
    if (window.confirm(`Tem certeza que deseja excluir o plano "${plan.name}"?`)) {
      try {
        await Plan.delete(plan.id);
        showNotification('success', 'Plano excluído com sucesso!');
        
        // Aguardar antes de recarregar
        await delay(1000);
        loadData();
      } catch (error) {
        console.error("Erro ao excluir plano:", error);
        showNotification('error', 'Erro ao excluir plano.');
      }
    }
  };

  const formatPrice = (priceCents) => {
    if (!priceCents || priceCents === 0) return 'Gratuito';
    return (priceCents / 100).toLocaleString('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    });
  };

  const calculateDiscount = (periodPrice, monthlyPrice, months) => {
    if (!periodPrice || !monthlyPrice || monthlyPrice === 0) return 0;
    const expectedTotal = monthlyPrice * months;
    const discount = ((periodPrice / expectedTotal) - 1) * 100;
    return Math.round(discount * 10) / 10; // Round to 1 decimal
  };

  const getFeatureDisplayValue = (feature, value) => {
    if (feature.type === 'quota') {
      const numValue = parseInt(value);
      if (numValue === -1) return 'Ilimitado';
      if (numValue === 0) return 'Nenhum';
      return `${numValue} ${feature.unit || ''}`;
    }
    if (feature.type === 'toggle') {
      return value === 'true' ? 'Incluído' : 'Não incluído';
    }
    return value;
  };

  const filteredPlans = plans.filter(plan => {
    if (searchTerm && !plan.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    switch (activeTab) {
      case 'all': return true;
      case 'active': return plan.is_active !== false;
      case 'inactive': return plan.is_active === false;
      case 'listed': return plan.is_listed === true;
      default: return true;
    }
  });

  const renderPlanCard = (plan) => (
    <Card key={plan.id} className="rounded-3xl border-sky-200 hover:shadow-lg transition-all duration-300 group relative overflow-hidden">
      {plan.is_popular && (
        <div className="absolute top-0 right-0 bg-gradient-to-l from-sky-500 to-sky-600 text-white px-4 py-1 rounded-bl-2xl">
          <div className="flex items-center gap-1 text-xs font-medium">
            <Star className="w-3 h-3" />
            Popular
          </div>
        </div>
      )}
      
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 to-sky-500 flex items-center justify-center">
            <Package className="w-6 h-6 text-white" />
            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-md border">
              <CreditCard className="w-3 h-3 text-sky-600" />
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
              <DropdownMenuItem onClick={() => handleViewDetails(plan)} className="rounded-lg">
                <Eye className="w-4 h-4 mr-2" />
                Ver Detalhes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEditPlan(plan)} className="rounded-lg">
                <Edit className="w-4 h-4 mr-2" />
                Editar Plano
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900 text-lg mb-2">
              {plan.name}
            </h3>
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <Badge className="text-xs rounded-full px-3 py-1 border bg-sky-50 text-sky-700 border-sky-200">
                {plan.slug}
              </Badge>
              {plan.is_listed && (
                <Badge className="text-xs rounded-full px-3 py-1 border bg-green-50 text-green-700 border-green-200">
                  Listado
                </Badge>
              )}
              {plan.is_custom_base && (
                <Badge className="text-xs rounded-full px-3 py-1 border bg-purple-50 text-purple-700 border-purple-200">
                  Personalizável
                </Badge>
              )}
            </div>
          </div>

          {/* Pricing Section */}
          <div className="space-y-3">
            <div className="text-2xl font-bold text-sky-600">
              {formatPrice(plan.price * 100)}
              <span className="text-sm text-gray-500 font-normal">/mês</span>
            </div>

            {/* Removed Alternative Pricing display as per instruction "Remover períodos longos" */}
          </div>

          {plan.description && (
            <p className="text-sm text-gray-600">{plan.description}</p>
          )}

          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">Recursos principais:</div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-3 h-3 text-sky-600 flex-shrink-0" />
                <span className="text-gray-600">
                  <span className="font-medium">Sessões:</span> {plan.active_sessions === -1 ? 'Ilimitadas' : plan.active_sessions}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-3 h-3 text-sky-600 flex-shrink-0" />
                <span className="text-gray-600">
                  <span className="font-medium">Contatos:</span> {plan.active_contacts === -1 ? 'Ilimitados' : plan.active_contacts}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-3 h-3 text-sky-600 flex-shrink-0" />
                <span className="text-gray-600">
                  <span className="font-medium">Mensagens/mês:</span> {plan.messages_per_month === -1 ? 'Ilimitadas' : plan.messages_per_month}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center mt-6 pt-4 border-t border-sky-100 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewDetails(plan)}
            className="flex-1 rounded-xl border-sky-200 text-sky-600 hover:bg-sky-50"
          >
            <Eye className="w-4 h-4 mr-1" />
            Ver Detalhes
          </Button>
          <Button
            size="sm"
            onClick={() => handleEditPlan(plan)}
            className="flex-1 rounded-xl bg-sky-600 hover:bg-sky-700 text-white"
          >
            <Edit className="w-4 h-4 mr-1" />
            Editar
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderPlanListItem = (plan) => (
    <Card key={plan.id} className="rounded-3xl border-sky-200 hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 to-sky-500 flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="font-semibold text-gray-900 truncate">
                  {plan.name}
                </h3>
                {plan.is_popular && (
                  <Badge className="text-xs rounded-full bg-sky-50 text-sky-700 border-sky-200">
                    <Star className="w-3 h-3 mr-1" />
                    Popular
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <CreditCard className="w-3 h-3" />
                  {formatPrice(plan.price * 100)}
                </span>
                {/* Removed annual pricing display as per instruction "Remover períodos longos" */}
                <span className="flex items-center gap-1">
                  <Settings className="w-3 h-3" />
                  {plan.features?.length || 0} recursos
                </span>
                <Badge variant="outline" className="text-xs">
                  {plan.slug}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleViewDetails(plan)}
              className="rounded-xl border-sky-200 text-sky-600 hover:bg-sky-50"
            >
              <Eye className="w-4 h-4" />
            </Button>
            
            <Button
              size="sm"
              onClick={() => handleEditPlan(plan)}
              className="rounded-xl bg-sky-600 hover:bg-sky-700 text-white"
            >
              <Edit className="w-4 h-4" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="rounded-xl">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
                <DropdownMenuItem onClick={() => handleViewDetails(plan)} className="rounded-lg">
                  <Eye className="w-4 h-4 mr-2" />
                  Ver Detalhes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleEditPlan(plan)} className="rounded-lg">
                  <Edit className="w-4 h-4 mr-2" />
                  Editar Plano
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="rounded-3xl border-red-200 max-w-md">
          <CardContent className="text-center p-8">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Acesso Negado</h3>
            <p className="text-gray-500">
              Apenas administradores podem acessar esta página.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      {/* Notificação */}
      {notification.show && (
        <div className="fixed top-4 right-4 z-[9999]">
          <Alert 
            className={`rounded-2xl shadow-lg border-2 ${
              notification.type === 'success' 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription className="font-medium">
              {notification.message}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-400 to-sky-500 flex items-center justify-center">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Catálogo de Planos</h1>
            <p className="text-gray-600">
              Gerencie os planos disponíveis e suas configurações
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Toggle Grid/List */}
          <div className="flex items-center gap-2 bg-white border border-sky-200 rounded-2xl p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className={`rounded-xl h-9 ${viewMode === 'grid' ? 'bg-sky-500 text-white' : 'text-sky-600 hover:bg-sky-50'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className={`rounded-xl h-9 ${viewMode === 'list' ? 'bg-sky-500 text-white' : 'text-sky-600 hover:bg-sky-50'}`}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          {/* Botão Atualizar */}
          <Button
            onClick={() => {
              loadData();
            }}
            variant="outline"
            size="icon"
            disabled={isLoading}
            className="rounded-2xl border-sky-200 text-sky-600 hover:bg-sky-50 h-10 w-10"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>

          <Button
            onClick={handleCreatePlan}
            className="rounded-2xl bg-sky-600 hover:bg-sky-700 text-white h-10"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Plano
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Buscar planos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 rounded-2xl border-sky-200 w-64 focus:border-sky-400"
          />
        </div>

        {/* Added Select component for billing period */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 sr-only">Período de Cobrança:</label>
          <Select value={billingPeriod} onValueChange={setBillingPeriod}>
            <SelectTrigger className="w-36 rounded-2xl border-sky-200 focus:border-sky-400">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="monthly">Mensal</SelectItem>
              <SelectItem value="quarterly" disabled>Trimestral (Em breve)</SelectItem>
              <SelectItem value="biannual" disabled>Semestral (Em breve)</SelectItem>
              <SelectItem value="annual" disabled>Anual (Em breve)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-4 rounded-2xl bg-sky-50 p-1">
          <TabsTrigger value="all" className="rounded-xl data-[state=active]:bg-sky-500 data-[state=active]:text-white">
            Todos ({plans.length})
          </TabsTrigger>
          <TabsTrigger value="active" className="rounded-xl data-[state=active]:bg-sky-500 data-[state=active]:text-white">
            Ativos ({plans.filter(p => p.is_active !== false).length})
          </TabsTrigger>
          <TabsTrigger value="listed" className="rounded-xl data-[state=active]:bg-sky-500 data-[state=active]:text-white">
            Listados ({plans.filter(p => p.is_listed === true).length})
          </TabsTrigger>
          <TabsTrigger value="inactive" className="rounded-xl data-[state=active]:bg-sky-500 data-[state=active]:text-white">
            Inativos ({plans.filter(p => p.is_active === false).length})
          </TabsTrigger>
        </TabsList>

        {/* Plans List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin"></div>
          </div>
        ) : filteredPlans.length > 0 ? (
          <div className={
            viewMode === 'grid' 
              ? 'grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
              : 'space-y-4'
          }>
            {filteredPlans.map((plan) => 
              viewMode === 'grid' ? renderPlanCard(plan) : renderPlanListItem(plan)
            )}
          </div>
        ) : (
          <Card className="rounded-3xl border-sky-200">
            <CardContent className="text-center py-16">
              <Package className="w-16 h-16 mx-auto mb-4 text-sky-300" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Nenhum plano encontrado
              </h3>
              <p className="text-gray-500 mb-6">
                Comece criando seu primeiro plano
              </p>
              <Button
                onClick={handleCreatePlan}
                className="rounded-2xl bg-sky-600 hover:bg-sky-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Plano
              </Button>
            </CardContent>
          </Card>
        )}
      </Tabs>

      {/* Modals */}
      {showPlanForm && (
        <PlanFormModal
          plan={editingPlan}
          features={features}
          open={showPlanForm}
          onClose={() => {
            setShowPlanForm(false);
            setEditingPlan(null);
          }}
          onSuccess={() => {
            setShowPlanForm(false);
            setEditingPlan(null);
            showNotification('success', editingPlan ? 'Plano atualizado com sucesso!' : 'Plano criado com sucesso!');
            loadData();
          }}
        />
      )}

      {showDetailsModal && viewingPlan && (
        <PlanDetailsModal
          plan={viewingPlan}
          features={features}
          open={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setViewingPlan(null);
          }}
          onEdit={(plan) => {
            setShowDetailsModal(false);
            setViewingPlan(null);
            handleEditPlan(plan);
          }}
        />
      )}
    </div>
  );
}
