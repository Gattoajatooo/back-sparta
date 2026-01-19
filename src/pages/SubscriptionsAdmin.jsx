
import React, { useState, useEffect, useCallback } from "react";
import { User } from "@/entities/User";
import { Company } from "@/entities/Company";
import { Subscription } from "@/entities/Subscription";
import { Plan } from "@/entities/Plan";
import { PlanVersion } from "@/entities/PlanVersion";
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
  Search,
  Users,
  Building,
  CreditCard,
  Eye,
  Settings,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  LayoutGrid,
  List,
  RefreshCw,
  Calendar
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { getSubscriptionDetails } from "@/functions/getSubscriptionDetails";

export default function SubscriptionsAdmin() {
  const [user, setUser] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState("grid");

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

  const loadData = useCallback(async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);

      if (currentUser?.role !== 'admin') {
        showNotification('error', 'Acesso negado. Apenas administradores podem acessar esta página.');
        setIsLoading(false); // Ensure loading state is reset even on access denied
        return;
      }

      const [subscriptionList, companyList] = await Promise.all([
        Subscription.list('-started_at'),
        Company.list()
      ]);

      // Para cada assinatura, buscar dados do plano
      const subscriptionsWithDetails = await Promise.all(
        subscriptionList.map(async (subscription) => {
          try {
            const planVersion = await PlanVersion.get(subscription.plan_version_id);
            const plan = await Plan.get(planVersion.plan_id);
            const company = companyList.find(c => c.id === subscription.company_id);
            
            return {
              ...subscription,
              plan: plan,
              planVersion: planVersion,
              company: company
            };
          } catch (error) {
            console.error('Erro ao buscar detalhes da assinatura:', error);
            return {
              ...subscription,
              plan: null,
              planVersion: null,
              company: companyList.find(c => c.id === subscription.company_id)
            };
          }
        })
      );

      setSubscriptions(subscriptionsWithDetails);
      setCompanies(companyList);
    } catch (error) {
      console.error("Erro ao carregar assinaturas:", error);
      showNotification('error', 'Erro ao carregar dados das assinaturas.');
    } finally {
      setIsLoading(false);
    }
  }, [showNotification]); // showNotification is a dependency of loadData

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleViewDetails = async (subscription) => {
    try {
      const response = await getSubscriptionDetails({
        subscription_id: subscription.id
      });
      
      if (response.data?.success) {
        console.log('Detalhes da assinatura:', response.data);
        // Aqui você pode abrir um modal com os detalhes ou navegar para uma página
      }
    } catch (error) {
      console.error('Erro ao buscar detalhes:', error);
      showNotification('error', 'Erro ao carregar detalhes da assinatura.');
    }
  };

  const formatPrice = (priceCents) => {
    if (!priceCents || priceCents === 0) return 'Gratuito';
    return (priceCents / 100).toLocaleString('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    });
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'active':
        return { text: 'Ativa', color: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle2 };
      case 'past_due':
        return { text: 'Em Atraso', color: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: Clock };
      case 'canceled':
        return { text: 'Cancelada', color: 'bg-red-50 text-red-700 border-red-200', icon: XCircle };
      case 'trial':
        return { text: 'Teste', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: AlertCircle };
      default:
        return { text: status, color: 'bg-gray-50 text-gray-700 border-gray-200', icon: AlertCircle };
    }
  };

  const filteredSubscriptions = subscriptions.filter(subscription => {
    if (searchTerm && !subscription.company?.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !subscription.plan?.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    switch (activeTab) {
      case 'all': return true;
      case 'active': return subscription.status === 'active';
      case 'trial': return subscription.status === 'trial';
      case 'past_due': return subscription.status === 'past_due';
      case 'canceled': return subscription.status === 'canceled';
      default: return true;
    }
  });

  const renderSubscriptionCard = (subscription) => {
    const statusInfo = getStatusInfo(subscription.status);
    const StatusIcon = statusInfo.icon;

    return (
      <Card key={subscription.id} className="rounded-3xl border-sky-200 hover:shadow-lg transition-all duration-300 group">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 to-sky-500 flex items-center justify-center">
              <Building className="w-6 h-6 text-white" />
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-md border">
                <StatusIcon className="w-3 h-3 text-sky-600" />
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
                <DropdownMenuItem onClick={() => handleViewDetails(subscription)} className="rounded-lg">
                  <Eye className="w-4 h-4 mr-2" />
                  Ver Detalhes
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-lg">
                  <Settings className="w-4 h-4 mr-2" />
                  Gerenciar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 text-lg mb-2">
                {subscription.company?.name || 'Empresa não encontrada'}
              </h3>
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <Badge className={`text-xs rounded-full px-3 py-1 border ${statusInfo.color}`}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {statusInfo.text}
                </Badge>
                <Badge className="text-xs rounded-full px-3 py-1 border bg-sky-50 text-sky-700 border-sky-200">
                  {subscription.plan?.name || 'Plano não encontrado'}
                </Badge>
              </div>
            </div>

            <div className="text-2xl font-bold text-sky-600">
              {formatPrice(subscription.planVersion?.price_cents)}
              <span className="text-sm text-gray-500 font-normal">/mês</span>
            </div>

            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>
                  Iniciada em {format(new Date(subscription.started_at), 'dd/MM/yyyy', { locale: ptBR })}
                </span>
              </div>
              
              {subscription.next_billing_at && (
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-gray-400" />
                  <span>
                    Próxima cobrança: {format(new Date(subscription.next_billing_at), 'dd/MM/yyyy', { locale: ptBR })}
                  </span>
                </div>
              )}

              {subscription.canceled_at && (
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-400" />
                  <span className="text-red-600">
                    Cancelada em {format(new Date(subscription.canceled_at), 'dd/MM/yyyy', { locale: ptBR })}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-center mt-6 pt-4 border-t border-sky-100 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleViewDetails(subscription)}
              className="flex-1 rounded-xl border-sky-200 text-sky-600 hover:bg-sky-50"
            >
              <Eye className="w-4 h-4 mr-1" />
              Ver Detalhes
            </Button>
            <Button
              size="sm"
              className="flex-1 rounded-xl bg-sky-600 hover:bg-sky-700 text-white"
            >
              <Settings className="w-4 h-4 mr-1" />
              Gerenciar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderSubscriptionListItem = (subscription) => {
    const statusInfo = getStatusInfo(subscription.status);
    const StatusIcon = statusInfo.icon;

    return (
      <Card key={subscription.id} className="rounded-3xl border-sky-200 hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 to-sky-500 flex items-center justify-center">
                <Building className="w-6 h-6 text-white" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {subscription.company?.name || 'Empresa não encontrada'}
                  </h3>
                  <Badge className={`text-xs rounded-full ${statusInfo.color}`}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {statusInfo.text}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <CreditCard className="w-3 h-3" />
                    {formatPrice(subscription.planVersion?.price_cents)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(subscription.started_at), 'dd/MM/yyyy', { locale: ptBR })}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {subscription.plan?.name || 'N/A'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleViewDetails(subscription)}
                className="rounded-xl border-sky-200 text-sky-600 hover:bg-sky-50"
              >
                <Eye className="w-4 h-4" />
              </Button>
              
              <Button
                size="sm"
                className="rounded-xl bg-sky-600 hover:bg-sky-700 text-white"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (!user || (user.role !== 'admin' && !isLoading)) { // Added !isLoading to prevent immediate render before user check
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
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Assinaturas</h1>
            <p className="text-gray-600">
              Gerencie as assinaturas ativas dos clientes
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
              className={`rounded-xl ${viewMode === 'grid' ? 'bg-sky-500 text-white' : 'text-sky-600 hover:bg-sky-50'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className={`rounded-xl ${viewMode === 'list' ? 'bg-sky-500 text-white' : 'text-sky-600 hover:bg-sky-50'}`}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          {/* Botão Atualizar */}
          <Button
            onClick={() => {
              setIsLoading(true);
              loadData();
            }}
            variant="outline"
            size="sm"
            disabled={isLoading}
            className="rounded-2xl border-sky-200 text-sky-600 hover:bg-sky-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Buscar por empresa ou plano..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 rounded-2xl border-sky-200 w-64 focus:border-sky-400"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-5 rounded-2xl bg-sky-50 p-1">
          <TabsTrigger value="all" className="rounded-xl data-[state=active]:bg-sky-500 data-[state=active]:text-white">
            Todas ({subscriptions.length})
          </TabsTrigger>
          <TabsTrigger value="active" className="rounded-xl data-[state=active]:bg-sky-500 data-[state=active]:text-white">
            Ativas ({subscriptions.filter(s => s.status === 'active').length})
          </TabsTrigger>
          <TabsTrigger value="trial" className="rounded-xl data-[state=active]:bg-sky-500 data-[state=active]:text-white">
            Teste ({subscriptions.filter(s => s.status === 'trial').length})
          </TabsTrigger>
          <TabsTrigger value="past_due" className="rounded-xl data-[state=active]:bg-sky-500 data-[state=active]:text-white">
            Em Atraso ({subscriptions.filter(s => s.status === 'past_due').length})
          </TabsTrigger>
          <TabsTrigger value="canceled" className="rounded-xl data-[state=active]:bg-sky-500 data-[state=active]:text-white">
            Canceladas ({subscriptions.filter(s => s.status === 'canceled').length})
          </TabsTrigger>
        </TabsList>

        {/* Subscriptions List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin"></div>
          </div>
        ) : filteredSubscriptions.length > 0 ? (
          <div className={
            viewMode === 'grid' 
              ? 'grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
              : 'space-y-4'
          }>
            {filteredSubscriptions.map((subscription) => 
              viewMode === 'grid' ? renderSubscriptionCard(subscription) : renderSubscriptionListItem(subscription)
            )}
          </div>
        ) : (
          <Card className="rounded-3xl border-sky-200">
            <CardContent className="text-center py-16">
              <Users className="w-16 h-16 mx-auto mb-4 text-sky-300" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Nenhuma assinatura encontrada
              </h3>
              <p className="text-gray-500">
                {activeTab === 'all' 
                  ? 'Não há assinaturas cadastradas ainda' 
                  : `Não há assinaturas com o status "${activeTab}"`
                }
              </p>
            </CardContent>
          </Card>
        )}
      </Tabs>
    </div>
  );
}
