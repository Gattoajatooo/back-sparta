
import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Campaign } from "@/entities/Campaign";
import { Contact } from "@/entities/Contact";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Megaphone,
  Search,
  Plus,
  ArrowUpDown,
  Grid3X3,
  List,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Users,
  Send,
  Calendar,
  TrendingUp,
  Activity,
  CheckCircle2,
  Clock,
  XCircle,
  History,
  RefreshCw,
  LayoutGrid,
  X
} from "lucide-react";

import CampaignFormModal from "../components/campaigns/CampaignFormModal"; // Changed from Sidebar to Modal
import CampaignDetailsModal from "../components/campaigns/CampaignDetailsModal"; // Changed from Sidebar to Modal
import CampaignHistoryModal from "../components/campaigns/CampaignHistoryModal"; // Changed from Sidebar to Modal

// Banner component
const Banner = ({ show, message, type, onClose }) => {
  if (!show) return null;

  const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-yellow-500';
  const textColor = 'text-white';

  return (
    <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center justify-between ${bgColor} ${textColor}`}>
      <span>{message}</span>
      <button onClick={onClose} className="ml-4 p-1 rounded-full hover:bg-white hover:bg-opacity-20">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default function TargetAudiencePage() {
  const [campaigns, setCampaigns] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [viewMode, setViewMode] = useState("grid");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  
  // Banner state
  const [banner, setBanner] = useState({ show: false, message: '', type: 'success' });
  
  // Sidebar/Modal states
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [viewingCampaign, setViewingCampaign] = useState(null);

  useEffect(() => {
    loadData();
    checkForCreateAction();
  }, []);

  const checkForCreateAction = () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'create') {
      setShowForm(true);
    }
  };

  const showBanner = (message, type = 'success') => {
    setBanner({ show: true, message, type });
    // Hide banner after 5 seconds
    setTimeout(() => {
      hideBanner();
    }, 5000);
  };

  const hideBanner = () => {
    setBanner({ show: false, message: '', type: 'success' });
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const currentUser = await User.me();
      setUser(currentUser);

      if (currentUser.company_id) {
        const campaignList = await Campaign.filter({ company_id: currentUser.company_id }, '-created_date', 50);
        setCampaigns(campaignList);

        const contactList = await Contact.filter({ company_id: currentUser.company_id }, '-created_date', 100);
        setContacts(contactList);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      setCampaigns([]);
      showBanner('Erro ao carregar público-alvo', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCampaign = async (campaignData) => {
    try {
      const newCampaign = await Campaign.create({
        ...campaignData,
        company_id: user.company_id,
        created_by: user.id
      });
      setCampaigns(prev => [newCampaign, ...prev]);
      setShowForm(false);
      showBanner('Público-alvo criado com sucesso!', 'success');
    } catch (error) {
      console.error("Erro ao criar público-alvo:", error);
      showBanner('Erro ao criar público-alvo', 'error');
    }
  };

  const handleEditCampaign = async (campaignData) => {
    try {
      const updatedCampaign = await Campaign.update(editingCampaign.id, campaignData);
      setCampaigns(prev => prev.map(c => c.id === editingCampaign.id ? updatedCampaign : c));
      setShowForm(false);
      setEditingCampaign(null);
      showBanner('Público-alvo atualizado com sucesso!', 'success');
    } catch (error) {
      console.error("Erro ao editar público-alvo:", error);
      showBanner('Erro ao editar público-alvo', 'error');
    }
  };

  const handleDeleteCampaign = async (campaign) => {
    if (window.confirm(`Tem certeza que deseja excluir o público-alvo "${campaign.name}"?`)) {
      try {
        await Campaign.delete(campaign.id);
        setCampaigns(prev => prev.filter(c => c.id !== campaign.id));
        showBanner('Público-alvo excluído com sucesso!', 'success');
      } catch (error) {
      console.error("Erro ao excluir público-alvo:", error);
      showBanner('Erro ao excluir público-alvo', 'error');
      }
    }
  };

  const handleEditClick = (campaign) => {
    setEditingCampaign(campaign);
    setShowForm(true);
  };

  const handleViewDetails = (campaign) => {
    setViewingCampaign(campaign);
    setShowDetails(true);
  };

  const handleViewHistory = (campaign) => {
    setViewingCampaign(campaign);
    setShowHistory(true);
  };

  const filteredCampaigns = campaigns
    .filter(campaign => {
      const matchesSearch = !searchTerm || 
        campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        campaign.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = selectedStatus === "all" || campaign.status === selectedStatus;
      const matchesType = selectedType === "all" || campaign.type === selectedType;

      return matchesSearch && matchesStatus && matchesType;
    })
    .sort((a, b) => {
      let aValue, bValue;
      switch (sortBy) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "status":
          aValue = a.status.toLowerCase();
          bValue = b.status.toLowerCase();
          break;
        case "created":
          aValue = new Date(a.created_date);
          bValue = new Date(b.created_date);
          break;
        default:
          return 0;
      }
      
      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const getTabCampaigns = (tab) => {
    switch (tab) {
      case "active":
        return filteredCampaigns.filter(c => ['running', 'scheduled', 'approved'].includes(c.status));
      case "completed":
        return filteredCampaigns.filter(c => c.status === 'completed');
      case "draft":
        return filteredCampaigns.filter(c => c.status === 'draft');
      default:
        return filteredCampaigns;
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { color: 'bg-gray-100 text-gray-800', text: 'Rascunho' },
      pending_approval: { color: 'bg-yellow-100 text-yellow-800', text: 'Pendente' },
      approved: { color: 'bg-blue-100 text-blue-800', text: 'Aprovado' },
      scheduled: { color: 'bg-purple-100 text-purple-800', text: 'Agendado' },
      running: { color: 'bg-green-100 text-green-800', text: 'Executando' },
      paused: { color: 'bg-orange-100 text-orange-800', text: 'Pausado' },
      completed: { color: 'bg-green-100 text-green-800', text: 'Concluído' },
      cancelled: { color: 'bg-red-100 text-red-800', text: 'Cancelado' }
    };

    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', text: status };
    return (
      <Badge className={`${config.color} rounded-full text-xs`}>
        {config.text}
      </Badge>
    );
  };

  const getTypeColor = (type) => {
    const typeColors = {
      birthday: '#ec4899',
      billing: '#ef4444',
      welcome: '#10b981',
      promotional: '#3b82f6',
      retention: '#8b5cf6',
      follow_up: '#f59e0b',
      other: '#6b7280'
    };
    return typeColors[type] || '#6b7280';
  };

  // NOVO: Função para obter cor baseada na propriedade color da campanha
  const getCampaignColor = (campaign) => {
    const colorMap = {
      'bg-blue-500': '#3b82f6',
      'bg-green-500': '#10b981',
      'bg-purple-500': '#8b5cf6',
      'bg-red-500': '#ef4444',
      'bg-yellow-500': '#eab308',
      'bg-pink-500': '#ec4899'
    };
    
    // Prioritize campaign.color if it maps to a known hex, otherwise use type color
    if (campaign.color && colorMap[campaign.color]) {
      return colorMap[campaign.color];
    }
    return getTypeColor(campaign.type);
  };

  if (isLoading && campaigns.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/1da99ed30_LOGO_SPARTA_SYNC.png"
            alt="Sparta Sync"
            className="w-16 h-16 mx-auto object-contain mb-4"
            style={{
              animation: 'spartaFade 2s ease-in-out infinite'
            }}
          />
          <style>
            {`
              @keyframes spartaFade {
                0%, 100% {
                  opacity: 1;
                  transform: scale(1);
                }
                50% {
                  opacity: 0.5;
                  transform: scale(0.95);
                }
              }
            `}
          </style>
        </div>
      </div>
    );
  }

  const renderCampaignCard = (campaign) => (
    <Card key={campaign.id} className="rounded-3xl border-gray-200 hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ 
                backgroundColor: `${getCampaignColor(campaign)}20`, 
                color: getCampaignColor(campaign) 
              }}
            >
              <Megaphone className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">{campaign.name}</h3>
              <p className="text-sm text-gray-500 capitalize">{campaign.type}</p>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="rounded-2xl">
              <DropdownMenuItem onClick={() => handleViewDetails(campaign)} className="rounded-xl">
                <Eye className="w-4 h-4 mr-2" />
                Ver Detalhes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEditClick(campaign)} className="rounded-xl">
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleViewHistory(campaign)} className="rounded-xl">
                <History className="w-4 h-4 mr-2" />
                Ver Histórico
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleDeleteCampaign(campaign)} 
                className="rounded-xl text-red-600 focus:text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {campaign.description && (
          <div className="bg-gray-50 rounded-2xl p-4">
            <p className="text-sm text-gray-700 line-clamp-2">
              {campaign.description}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-2 bg-blue-50 rounded-xl">
            <p className="text-lg font-bold text-blue-600">{campaign.count_contacts || 0}</p>
            <p className="text-xs text-blue-600">Contatos</p>
          </div>
          <div className="text-center p-2 bg-green-50 rounded-xl">
            <p className="text-lg font-bold text-green-600">{campaign.metrics?.messages_sent || 0}</p>
            <p className="text-xs text-green-600">Enviadas</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>{new Date(campaign.created_date).toLocaleDateString('pt-BR')}</span>
          </div>
          
          {getStatusBadge(campaign.status)}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Banner */}
      <Banner
        show={banner.show}
        message={banner.message}
        type={banner.type}
        onClose={hideBanner}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Ícone com cor roxa */}
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl flex items-center justify-center">
            <Megaphone className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Público-alvo</h1>
            <p className="text-gray-600">
              {campaigns.length} público-alvo encontrados
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Toggle Grid/List */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className={`rounded-xl ${viewMode === 'grid' ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className={`rounded-xl ${viewMode === 'list' ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''}`}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          {/* Botão Atualizar */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl p-1">
            <Button
              onClick={() => loadData()}
              variant="ghost"
              size="sm"
              disabled={isLoading}
              className="rounded-xl"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Botão Novo Público-alvo */}
          <Button
            onClick={() => {
              setEditingCampaign(null);
              setShowForm(true);
            }}
            className="bg-purple-600 hover:bg-purple-700 rounded-2xl"
          >
            <Plus className="w-5 h-5 mr-2" />
            Novo Público-alvo
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex-1 flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:max-w-md">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Buscar público-alvo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-2xl border-gray-200"
            />
          </div>
          
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-40 rounded-2xl border-gray-200">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="all">Todos Status</SelectItem>
              <SelectItem value="draft">Rascunho</SelectItem>
              <SelectItem value="running">Executando</SelectItem>
              <SelectItem value="completed">Concluído</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-40 rounded-2xl border-gray-200">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="all">Todos Tipos</SelectItem>
              <SelectItem value="birthday">Aniversário</SelectItem>
              <SelectItem value="billing">Cobrança</SelectItem>
              <SelectItem value="welcome">Boas-vindas</SelectItem>
              <SelectItem value="promotional">Promocional</SelectItem>
              <SelectItem value="retention">Retenção</SelectItem>
              <SelectItem value="follow_up">Follow-up</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40 rounded-2xl border-gray-200">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="name">Nome</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="created">Data Criação</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="rounded-2xl"
          >
            <ArrowUpDown className="w-4 h-4 mr-2" />
            {sortOrder === 'asc' ? 'Crescente' : 'Decrescente'}
          </Button>
        </div>
      </div>

      {/* Campaigns Display */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {/* Changed TabsList styling */}
        <TabsList className="inline-flex h-10 items-center justify-center rounded-2xl bg-gray-100 p-1 text-muted-foreground">
          <TabsTrigger value="all" className="rounded-xl px-3">
            Todos ({filteredCampaigns.length})
          </TabsTrigger>
          <TabsTrigger value="active" className="rounded-xl px-3">
            Ativos ({getTabCampaigns('active').length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="rounded-xl px-3">
            Concluídos ({getTabCampaigns('completed').length})
          </TabsTrigger>
          <TabsTrigger value="draft" className="rounded-xl px-3">
            Rascunhos ({getTabCampaigns('draft').length})
          </TabsTrigger>
        </TabsList>

        {['all', 'active', 'completed', 'draft'].map(tab => (
          <TabsContent key={tab} value={tab} className="space-y-4">
            {getTabCampaigns(tab).length > 0 ? (
              <div className={viewMode === 'grid' 
                ? 'grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                : "space-y-4"
              }>
                {getTabCampaigns(tab).map(campaign => renderCampaignCard(campaign))}
              </div>
            ) : (
              <Card className="rounded-3xl border-gray-200">
                <CardContent className="text-center py-16">
                  <Megaphone className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {tab === 'all' ? 'Nenhum público-alvo encontrado' : 
                     tab === 'active' ? 'Nenhum público-alvo ativo' :
                     tab === 'completed' ? 'Nenhum público-alvo concluído' :
                     'Nenhum rascunho de público-alvo'}
                  </h3>
                  <p className="text-gray-500 mb-6">
                    {tab === 'all' ? 'Crie seu primeiro público-alvo para começar' : 
                     'Ajuste os filtros ou crie um novo público-alvo'}
                  </p>
                  {tab === 'all' && (
                    <Button 
                      onClick={() => setShowForm(true)} 
                      className="bg-purple-600 hover:bg-purple-700 rounded-2xl"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Criar Primeiro Público-alvo
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Modals - Replaced Sidebars with Modals */}
      <CampaignFormModal
        campaign={editingCampaign}
        open={showForm} // Changed prop name to 'open'
        onClose={() => {
          setShowForm(false);
          setEditingCampaign(null);
        }}
        onSubmit={editingCampaign ? handleEditCampaign : handleCreateCampaign}
        contacts={contacts}
      />

      <CampaignDetailsModal
        campaign={viewingCampaign}
        open={showDetails} // Changed prop name to 'open'
        onClose={() => {
          setShowDetails(false);
          setViewingCampaign(null);
        }}
        onEdit={handleEditClick}
        onViewHistory={handleViewHistory}
        contacts={contacts}
      />

      <CampaignHistoryModal
        campaign={viewingCampaign}
        open={showHistory} // Changed prop name to 'open'
        onClose={() => {
          setShowHistory(false);
          setViewingCampaign(null);
        }}
      />
    </div>
  );
}
