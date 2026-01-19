
import React, { useState, useEffect, useCallback } from "react";
import { User } from "@/entities/User";
import { Offer } from "@/entities/Offer";
import { Company } from "@/entities/Company";
import { Plan } from "@/entities/Plan";
import { PlanVersion } from "@/entities/PlanVersion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Plus,
  FileText,
  Eye,
  Edit,
  Send,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  LayoutGrid,
  List,
  RefreshCw,
  Calendar,
  Building,
  CreditCard
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function OffersAdmin() {
  const [user, setUser] = useState(null);
  const [offers, setOffers] = useState([]);
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

  const showNotification = useCallback((type, message) => {
    setNotification({ show: true, type, message });
    setTimeout(() => {
      setNotification({ show: false, type: 'success', message: '' });
    }, 5000);
  }, [setNotification]); // setNotification is stable

  const loadData = useCallback(async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);

      if (currentUser?.role !== 'admin') {
        showNotification('error', 'Acesso negado. Apenas administradores podem acessar esta página.');
        return;
      }

      const [offerList, companyList] = await Promise.all([
        Offer.list('-created_date'),
        Company.list()
      ]);

      // Para cada oferta, buscar dados do plano e empresa
      const offersWithDetails = await Promise.all(
        offerList.map(async (offer) => {
          try {
            const planVersion = await PlanVersion.get(offer.plan_version_id);
            const plan = await Plan.get(planVersion.plan_id);
            const company = companyList.find(c => c.id === offer.company_id);
            
            return {
              ...offer,
              plan: plan,
              planVersion: planVersion,
              company: company
            };
          } catch (error) {
            console.error('Erro ao buscar detalhes da oferta:', error);
            return {
              ...offer,
              plan: null,
              planVersion: null,
              company: companyList.find(c => c.id === offer.company_id)
            };
          }
        })
      );

      setOffers(offersWithDetails);
      setCompanies(companyList);
    } catch (error) {
      console.error("Erro ao carregar ofertas:", error);
      showNotification('error', 'Erro ao carregar dados das ofertas.');
    } finally {
      setIsLoading(false);
    }
  }, [showNotification, setUser, setOffers, setCompanies, setIsLoading]); // Added showNotification and state setters as dependencies

  useEffect(() => {
    loadData();
  }, [loadData]); // Added loadData to dependency array

  const handleCreateOffer = () => {
    // Implementar criação de oferta
    console.log('Criar nova oferta');
  };

  const handleViewDetails = (offer) => {
    console.log('Ver detalhes da oferta:', offer);
  };

  const handleEditOffer = (offer) => {
    console.log('Editar oferta:', offer);
  };

  const handleSendOffer = (offer) => {
    console.log('Enviar oferta:', offer);
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
      case 'draft':
        return { text: 'Rascunho', color: 'bg-gray-50 text-gray-700 border-gray-200', icon: Edit };
      case 'sent':
        return { text: 'Enviada', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Send };
      case 'accepted':
        return { text: 'Aceita', color: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle2 };
      case 'expired':
        return { text: 'Expirada', color: 'bg-red-50 text-red-700 border-red-200', icon: Clock };
      case 'rejected':
        return { text: 'Rejeitada', color: 'bg-red-50 text-red-700 border-red-200', icon: XCircle };
      default:
        return { text: status, color: 'bg-gray-50 text-gray-700 border-gray-200', icon: AlertCircle };
    }
  };

  const isExpired = (offer) => {
    return new Date(offer.expires_at) < new Date();
  };

  const filteredOffers = offers.filter(offer => {
    if (searchTerm && !offer.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !offer.company?.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    switch (activeTab) {
      case 'all': return true;
      case 'draft': return offer.status === 'draft';
      case 'sent': return offer.status === 'sent';
      case 'accepted': return offer.status === 'accepted';
      case 'expired': return offer.status === 'expired' || isExpired(offer);
      default: return true;
    }
  });

  const renderOfferCard = (offer) => {
    const statusInfo = getStatusInfo(offer.status);
    const StatusIcon = statusInfo.icon;
    const expired = isExpired(offer);

    return (
      <Card key={offer.id} className="rounded-3xl border-sky-200 hover:shadow-lg transition-all duration-300 group">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 to-sky-500 flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
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
                <DropdownMenuItem onClick={() => handleViewDetails(offer)} className="rounded-lg">
                  <Eye className="w-4 h-4 mr-2" />
                  Ver Detalhes
                </DropdownMenuItem>
                {offer.status === 'draft' && (
                  <DropdownMenuItem onClick={() => handleEditOffer(offer)} className="rounded-lg">
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                )}
                {offer.status === 'draft' && (
                  <DropdownMenuItem onClick={() => handleSendOffer(offer)} className="rounded-lg">
                    <Send className="w-4 h-4 mr-2" />
                    Enviar
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 text-lg mb-2">
                {offer.name}
              </h3>
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <Badge className={`text-xs rounded-full px-3 py-1 border ${statusInfo.color}`}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {statusInfo.text}
                </Badge>
                {expired && offer.status !== 'expired' && (
                  <Badge className="text-xs rounded-full px-3 py-1 border bg-red-50 text-red-700 border-red-200">
                    Expirada
                  </Badge>
                )}
              </div>
            </div>

            <div className="text-2xl font-bold text-sky-600">
              {formatPrice(offer.total_price_cents)}
              <span className="text-sm text-gray-500 font-normal">/mês</span>
            </div>

            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-gray-400" />
                <span>{offer.company?.name || 'Empresa não encontrada'}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-gray-400" />
                <span>Baseado no plano {offer.plan?.name || 'N/A'}</span>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>
                  Expira em {format(new Date(offer.expires_at), 'dd/MM/yyyy', { locale: ptBR })}
                </span>
              </div>
            </div>

            {offer.description && (
              <p className="text-sm text-gray-600 line-clamp-2">
                {offer.description}
              </p>
            )}
          </div>

          <div className="flex items-center justify-center mt-6 pt-4 border-t border-sky-100 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleViewDetails(offer)}
              className="flex-1 rounded-xl border-sky-200 text-sky-600 hover:bg-sky-50"
            >
              <Eye className="w-4 h-4 mr-1" />
              Ver Detalhes
            </Button>
            {offer.status === 'draft' && (
              <Button
                size="sm"
                onClick={() => handleSendOffer(offer)}
                className="flex-1 rounded-xl bg-sky-600 hover:bg-sky-700 text-white"
              >
                <Send className="w-4 h-4 mr-1" />
                Enviar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderOfferListItem = (offer) => {
    const statusInfo = getStatusInfo(offer.status);
    const StatusIcon = statusInfo.icon;
    const expired = isExpired(offer);

    return (
      <Card key={offer.id} className="rounded-3xl border-sky-200 hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 to-sky-500 flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {offer.name}
                  </h3>
                  <Badge className={`text-xs rounded-full ${statusInfo.color}`}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {statusInfo.text}
                  </Badge>
                  {expired && offer.status !== 'expired' && (
                    <Badge className="text-xs rounded-full bg-red-50 text-red-700 border-red-200">
                      Expirada
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <CreditCard className="w-3 h-3" />
                    {formatPrice(offer.total_price_cents)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Building className="w-3 h-3" />
                    {offer.company?.name || 'N/A'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(offer.expires_at), 'dd/MM/yyyy', { locale: ptBR })}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleViewDetails(offer)}
                className="rounded-xl border-sky-200 text-sky-600 hover:bg-sky-50"
              >
                <Eye className="w-4 h-4" />
              </Button>
              
              {offer.status === 'draft' && (
                <Button
                  size="sm"
                  onClick={() => handleSendOffer(offer)}
                  className="rounded-xl bg-sky-600 hover:bg-sky-700 text-white"
                >
                  <Send className="w-4 h-4" />
                </Button>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="rounded-xl">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl">
                  <DropdownMenuItem onClick={() => handleViewDetails(offer)} className="rounded-lg">
                    <Eye className="w-4 h-4 mr-2" />
                    Ver Detalhes
                  </DropdownMenuItem>
                  {offer.status === 'draft' && (
                    <DropdownMenuItem onClick={() => handleEditOffer(offer)} className="rounded-lg">
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

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
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ofertas</h1>
            <p className="text-gray-600">
              Gerencie ofertas personalizadas para clientes
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

          <Button
            onClick={handleCreateOffer}
            className="rounded-2xl bg-sky-600 hover:bg-sky-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Oferta
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Buscar ofertas..."
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
            Todas ({offers.length})
          </TabsTrigger>
          <TabsTrigger value="draft" className="rounded-xl data-[state=active]:bg-sky-500 data-[state=active]:text-white">
            Rascunhos ({offers.filter(o => o.status === 'draft').length})
          </TabsTrigger>
          <TabsTrigger value="sent" className="rounded-xl data-[state=active]:bg-sky-500 data-[state=active]:text-white">
            Enviadas ({offers.filter(o => o.status === 'sent').length})
          </TabsTrigger>
          <TabsTrigger value="accepted" className="rounded-xl data-[state=active]:bg-sky-500 data-[state=active]:text-white">
            Aceitas ({offers.filter(o => o.status === 'accepted').length})
          </TabsTrigger>
          <TabsTrigger value="expired" className="rounded-xl data-[state=active]:bg-sky-500 data-[state=active]:text-white">
            Expiradas ({offers.filter(o => o.status === 'expired' || isExpired(o)).length})
          </TabsTrigger>
        </TabsList>

        {/* Offers List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin"></div>
          </div>
        ) : filteredOffers.length > 0 ? (
          <div className={
            viewMode === 'grid' 
              ? 'grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
              : 'space-y-4'
          }>
            {filteredOffers.map((offer) => 
              viewMode === 'grid' ? renderOfferCard(offer) : renderOfferListItem(offer)
            )}
          </div>
        ) : (
          <Card className="rounded-3xl border-sky-200">
            <CardContent className="text-center py-16">
              <FileText className="w-16 h-16 mx-auto mb-4 text-sky-300" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Nenhuma oferta encontrada
              </h3>
              <p className="text-gray-500 mb-6">
                {activeTab === 'all' 
                  ? 'Comece criando uma oferta personalizada para seus clientes' 
                  : `Não há ofertas com o status "${activeTab}"`
                }
              </p>
              {activeTab === 'all' && (
                <Button
                  onClick={handleCreateOffer}
                  className="rounded-2xl bg-sky-600 hover:bg-sky-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeira Oferta
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </Tabs>
    </div>
  );
}
