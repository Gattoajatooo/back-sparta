import React, { useState, useEffect } from "react";
import { Tag } from "@/entities/Tag";
import { Contact } from "@/entities/Contact";
import { User } from "@/entities/User";
import { Plan } from "@/entities/Plan";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Tag as TagIcon,
  Plus,
  Search,
  Filter,
  Grid3X3,
  List,
  MoreVertical,
  Edit,
  Trash2,
  Users,
  Settings,
  Zap,
  Eye,
  AlertCircle,
  TrendingUp,
  Calendar,
  RefreshCw,
  LayoutGrid,
  X,
  ArrowUpDown
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import TagFormModal from "../components/tags/TagFormModal";
import TagDetailsModal from "../components/tags/TagDetailsModal";
import SmartTagRulesModal from "../components/tags/SmartTagRulesModal";
import { getSubscriptionStatus } from "@/functions/getSubscriptionStatus";

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

export default function Tags() {
  const [user, setUser] = useState(null);
  const [tags, setTags] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [activeTab, setActiveTab] = useState("all");
  
  // Load view preferences from user settings or localStorage
  const [viewMode, setViewMode] = useState(() => {
    const saved = localStorage.getItem('tags_viewMode');
    return saved || "grid";
  });

  // Banner state
  const [banner, setBanner] = useState({ show: false, message: '', type: 'success' });
  
  // Modal states
  const [showTagForm, setShowTagForm] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [showTagDetails, setShowTagDetails] = useState(false);
  const [selectedTag, setSelectedTag] = useState(null);
  const [showSmartRules, setShowSmartRules] = useState(false);
  const [smartRulesTag, setSmartRulesTag] = useState(null);
  const [error, setError] = useState("");
  const [tagUsage, setTagUsage] = useState(null);

  const smartTagTypes = [
    {
      id: 'customer_status',
      name: 'Status do Cliente',
      description: 'Aplica tags baseado no status do cliente',
      icon: Users
    },
    {
      id: 'activity_based',
      name: 'Baseado em Atividade',
      description: 'Aplica tags baseado na atividade do cliente',
      icon: TrendingUp
    },
    {
      id: 'date_based',
      name: 'Baseado em Data',
      description: 'Aplica tags baseado em datas específicas',
      icon: Calendar
    }
  ];

  useEffect(() => {
    loadData();
    checkForCreateAction();
    loadTagUsage();
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (!showTagForm && !showTagDetails && !showSmartRules) {
        loadData();
      }
    }, 30000); // Atualiza a cada 30 segundos

    return () => clearInterval(intervalId);
  }, [showTagForm, showTagDetails, showSmartRules]);

  const checkForCreateAction = () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'create') {
      setShowTagForm(true);
    }
  };

  const showBanner = (message, type = 'success') => {
    setBanner({ show: true, message, type });
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

      // Load user-specific view preferences after user is loaded
      if (currentUser?.settings?.view_preferences?.tags) {
        const prefs = currentUser.settings.view_preferences.tags;
        if (prefs.viewMode && !localStorage.getItem('tags_viewMode')) {
          setViewMode(prefs.viewMode);
        }
      }

      if (currentUser.company_id) {
        await Promise.all([
          loadTags(currentUser.company_id),
          loadContacts(currentUser.company_id)
        ]);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      setError("Falha ao carregar dados das tags.");
      showBanner('Erro ao carregar marcadores', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Save view preferences to user settings and localStorage
  const saveViewPreferences = async (preferences) => {
    try {
      // Save to localStorage immediately
      if (preferences.viewMode !== undefined) {
        localStorage.setItem('tags_viewMode', preferences.viewMode);
      }

      // Save to user settings in database
      if (user) {
        const currentSettings = user.settings || {};
        const updatedSettings = {
          ...currentSettings,
          view_preferences: {
            ...currentSettings.view_preferences,
            tags: {
              ...currentSettings.view_preferences?.tags,
              ...preferences
            }
          }
        };
        
        await User.updateMyUserData({ settings: updatedSettings });
      }
    } catch (error) {
      console.error("Error saving view preferences:", error);
    }
  };

  const loadTags = async (companyId) => {
    try {
      const tagList = await Tag.filter({ 
        company_id: companyId,
        type: { '$in': ['manual', 'smart'] }
      }, '-created_date');
      
      // Carregar todos os contatos para calcular as estatísticas
      const allContacts = await Contact.filter({ company_id: companyId });
      
      // Calcular estatísticas para cada tag
      const tagsWithStats = tagList.map(tag => {
        // Contar contatos que possuem esta tag
        const contactsWithTag = allContacts.filter(contact => {
          if (!contact.tags || !Array.isArray(contact.tags)) return false;
          return contact.tags.includes(tag.name) || contact.tags.includes(tag.id);
        });
        
        const contactsCount = contactsWithTag.length;
        
        // Calcular uso total (pode ser expandido para incluir outras métricas)
        const usageStats = {
          total_applied: contactsCount,
          this_month: 0, // Pode ser calculado com base em created_date
          auto_applied: 0 // Pode ser calculado se houver histórico
        };
        
        return {
          ...tag,
          contacts_count: contactsCount,
          usage_stats: usageStats
        };
      });
      
      setTags(tagsWithStats);
    } catch (error) {
      console.error("Error loading tags:", error);
    }
  };

  const loadContacts = async (companyId) => {
    try {
      const contactList = await Contact.filter({ company_id: companyId });
      setContacts(contactList);
    } catch (error) {
      console.error("Error loading contacts:", error);
    }
  };

  const loadTagUsage = async () => {
    try {
      const currentUser = await User.me();
      if (!currentUser?.company_id) return;

      const { data } = await getSubscriptionStatus();
      if (!data?.success || !data.has_active_subscription) {
        setTagUsage(null);
        return;
      }

      const planId = data.subscription.metadata?.plan_id;
      if (!planId) {
        setTagUsage(null);
        return;
      }

      let currentPlan;
      try {
        currentPlan = await Plan.get(planId);
      } catch (planError) {
        console.warn('Plano não encontrado:', planId, planError);
        setTagUsage(null);
        return;
      }

      if (!currentPlan) {
        setTagUsage(null);
        return;
      }

      const tagLimit = currentPlan.active_tags;

      const activeTags = await Tag.filter({
        company_id: currentUser.company_id,
        is_active: true
      });

      setTagUsage({
        used: activeTags.length,
        limit: tagLimit,
      });

    } catch (error) {
      console.error("Erro ao carregar uso de marcadores:", error);
      setTagUsage(null);
    }
  };

  const handleCreateTag = async (tagData) => {
    try {
      await Tag.create({
        ...tagData,
        company_id: user.company_id
      });
      
      await loadTags(user.company_id);
      await loadTagUsage();
      setShowTagForm(false);
      setEditingTag(null);
      showBanner('Marcador criado com sucesso!', 'success');
    } catch (error) {
      console.error("Error creating tag:", error);
      showBanner("Falha ao criar tag.", 'error');
    }
  };

  const handleUpdateTag = async (tagData) => {
    try {
      await Tag.update(editingTag.id, tagData);
      await loadTags(user.company_id);
      await loadTagUsage();
      setShowTagForm(false);
      setEditingTag(null);
      showBanner('Marcador atualizado com sucesso!', 'success');
    } catch (error) {
      console.error("Error updating tag:", error);
      showBanner("Falha ao atualizar tag.", 'error');
    }
  };

  const handleDeleteTag = async (tagId) => {
    if (window.confirm('Tem certeza que deseja excluir esta tag?')) {
      try {
        await Tag.delete(tagId);
        await loadTags(user.company_id);
        await loadTagUsage();
        showBanner('Marcador excluído com sucesso!', 'success');
      } catch (error) {
        console.error("Error deleting tag:", error);
        showBanner("Falha ao excluir tag.", 'error');
      }
    }
  };

  const handleEditTag = (tag) => {
    setEditingTag(tag);
    setShowTagForm(true);
    // Close other modals
    setShowTagDetails(false);
    setShowSmartRules(false);
  };

  const handleViewTag = (tag) => {
    setSelectedTag(tag);
    setShowTagDetails(true);
    // Close other modals
    setShowTagForm(false);
    setShowSmartRules(false);
  };

  const handleConfigureSmartRules = (tag) => {
    setSmartRulesTag(tag);
    setShowSmartRules(true);
    // Close other modals
    setShowTagForm(false);
    setShowTagDetails(false);
  };

  const handleSmartRulesUpdate = async (updatedTag) => {
    try {
      await Tag.update(updatedTag.id, {
        is_smart: updatedTag.is_smart,
        smart_rules: updatedTag.smart_rules
      });
      
      loadData();
      setShowSmartRules(false);
      setSmartRulesTag(null);
      showBanner('Regras inteligentes atualizadas com sucesso!', 'success');
    } catch (error) {
      console.error("Error updating smart tag rules:", error);
      showBanner("Falha ao salvar regras inteligentes.", 'error');
    }
  };

  const filteredTags = tags
    .filter(tag => {
      const matchesSearch = !searchTerm || 
        tag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tag.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || 
                           (statusFilter === "active" && tag.is_active) ||
                           (statusFilter === "inactive" && !tag.is_active);
      
      const matchesType = typeFilter === "all" ||
                         (typeFilter === "system" && tag.type === "system") ||
                         (typeFilter === "manual" && tag.type === "manual") ||
                         (typeFilter === "automatic" && tag.type === "automatic") ||
                         (typeFilter === "smart" && tag.type === "smart");
      
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
          aValue = a.is_active ? "active" : "inactive";
          bValue = b.is_active ? "active" : "inactive";
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

  const getTabTags = (tab) => {
    switch (tab) {
      case "system":
        return filteredTags.filter(t => t.type === "system");
      case "manual":
        return filteredTags.filter(t => t.type === "manual");
      case "automatic":
        return filteredTags.filter(t => t.type === "automatic");
      case "smart":
        return filteredTags.filter(t => t.type === "smart");
      case "active":
        return filteredTags.filter(t => t.is_active);
      case "inactive":
        return filteredTags.filter(t => !t.is_active);
      default:
        return filteredTags;
    }
  };

  if (isLoading && tags.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto overflow-hidden">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690a8ae384e85f405dd1958f/8d6af0619_ChatGPTImage24denovde202519_02_27.png"
              alt="Sparta Sync"
              className="w-16 h-16 object-contain"
              onError={(e) => {
                console.error('Logo failed to load on Tags page');
                e.target.onerror = null;
                e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"%3E%3Ctext x="50%25" y="50%25" font-size="24" text-anchor="middle" dominant-baseline="middle"%3ESS%3C/text%3E%3C/svg%3E';
              }}
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

  const renderTagCard = (tag) => (
    <Card key={tag.id} className="rounded-3xl border-gray-200 hover:shadow-lg transition-shadow overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div 
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: tag.color + '20', color: tag.color }}
            >
              <TagIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 text-base sm:text-lg flex items-center gap-2 flex-wrap">
                <span className="truncate">{tag.name}</span>
                {tag.type === 'system' && (
                  <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs flex-shrink-0">
                    <Settings className="w-3 h-3 mr-1" />
                    Sistema
                  </Badge>
                )}
                {tag.type === 'automatic' && (
                  <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-xs flex-shrink-0">
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Automático
                  </Badge>
                )}
                {tag.type === 'smart' && (
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs flex-shrink-0">
                    <Zap className="w-3 h-3 mr-1" />
                    Inteligente
                  </Badge>
                )}
              </h3>
              <p className="text-sm text-gray-500">
                {tag.type === 'system' ? 'Marcador de Sistema' :
                 tag.type === 'automatic' ? 'Marcador Automático' :
                 tag.type === 'smart' ? 'Marcador Inteligente' :
                 'Marcador Manual'}
              </p>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full flex-shrink-0">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="rounded-2xl" align="end">
              <DropdownMenuItem onClick={() => handleViewTag(tag)} className="rounded-xl">
                <Eye className="w-4 h-4 mr-2" />
                Ver Detalhes
              </DropdownMenuItem>
              {tag.type !== 'system' && (
                <>
                  <DropdownMenuItem onClick={() => handleEditTag(tag)} className="rounded-xl">
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  {(tag.type === 'smart' || tag.type === 'automatic') && (
                    <DropdownMenuItem 
                      onClick={() => handleConfigureSmartRules(tag)} 
                      className="rounded-xl"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Configurar Regras
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => handleDeleteTag(tag.id)} 
                    className="rounded-xl text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </>
              )}
              {tag.type === 'system' && (
                <DropdownMenuItem disabled className="rounded-xl text-gray-400">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Marcador protegido
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {tag.description && (
          <div className="bg-gray-50 rounded-2xl p-4">
            <p className="text-sm text-gray-700 line-clamp-2">
              {tag.description}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-2 bg-teal-50 rounded-xl">
            <p className="text-lg font-bold text-teal-600">{tag.contacts_count || 0}</p>
            <p className="text-xs text-teal-600">Contatos</p>
          </div>
          <div className="text-center p-2 bg-blue-50 rounded-xl">
            <p className="text-lg font-bold text-blue-600">{tag.usage_stats?.total_applied || 0}</p>
            <p className="text-xs text-blue-600">Uso Total</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>
              {tag.created_date ? format(parseISO(tag.created_date), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
            </span>
          </div>
          
          <Badge 
            variant={tag.is_active ? "default" : "secondary"}
            className="rounded-full text-xs"
          >
            {tag.is_active ? "Ativo" : "Inativo"}
          </Badge>
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

      {error && (
        <Alert variant="destructive" className="rounded-2xl">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center flex-shrink-0">
            <TagIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Marcadores</h1>
            <p className="text-sm sm:text-base text-gray-600 hidden sm:block">
              Gerencie os marcadores dos seus contatos
            </p>
          </div>
        </div>

        {/* Limite de Marcadores */}
        {tagUsage && tagUsage.limit !== -1 && (
          <div className={`px-3 sm:px-4 py-2 rounded-xl border-2 text-xs sm:text-sm ${
            tagUsage.used >= tagUsage.limit
              ? 'bg-red-100 text-red-700 border-red-200'
              : tagUsage.used >= tagUsage.limit * 0.8
              ? 'bg-amber-100 text-amber-700 border-amber-200'
              : 'bg-gray-100 text-gray-600 border-gray-200'
          }`}>
            <div className="flex items-center gap-2">
              <TagIcon className="w-4 h-4 flex-shrink-0" />
              <span className="font-bold">
                {tagUsage.used} / {tagUsage.limit === -1 ? '∞' : tagUsage.limit}
              </span>
              <span className="hidden sm:inline">marcadores</span>
            </div>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3">
        {/* Mobile: Botões primeiro */}
        <div className="flex gap-2 w-full sm:hidden">
          <div className="flex gap-1 border rounded-xl p-1 bg-white">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => {
                setViewMode('grid');
                saveViewPreferences({ viewMode: 'grid' });
              }}
              className="h-8 w-8 rounded-lg"
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => {
                setViewMode('list');
                saveViewPreferences({ viewMode: 'list' });
              }}
              className="h-8 w-8 rounded-lg"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            onClick={() => loadData()}
            disabled={isLoading}
            className="rounded-xl h-10 w-10 p-0"
            size="icon"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>

          <Button
            onClick={() => {
              setEditingTag(null);
              setShowTagForm(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 rounded-xl flex-1"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Marcador
          </Button>
        </div>

        {/* Mobile: Filtros e pesquisa */}
        <div className="flex gap-2 w-full sm:hidden">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="flex-1 rounded-xl">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">Todos Tipos</SelectItem>
              <SelectItem value="system">Sistema</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="automatic">Automático</SelectItem>
              <SelectItem value="smart">Inteligente</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="flex-1 rounded-xl">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">Todos Status</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="inactive">Inativo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Mobile: Barra de pesquisa */}
        <div className="relative w-full sm:hidden">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar marcadores..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>

        {/* Desktop: Tudo na mesma linha */}
        <div className="hidden sm:flex gap-2 items-center">
          {/* Barra de pesquisa */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar marcadores..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-36 rounded-xl">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">Todos Tipos</SelectItem>
              <SelectItem value="system">Sistema</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="automatic">Automático</SelectItem>
              <SelectItem value="smart">Inteligente</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 rounded-xl">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">Todos Status</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="inactive">Inativo</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-1 border rounded-xl p-1">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => {
                setViewMode('grid');
                saveViewPreferences({ viewMode: 'grid' });
              }}
              className="h-8 w-8 rounded-lg"
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => {
                setViewMode('list');
                saveViewPreferences({ viewMode: 'list' });
              }}
              className="h-8 w-8 rounded-lg"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            onClick={() => loadData()}
            disabled={isLoading}
            className="rounded-xl h-10 w-10 p-0"
            size="icon"
            title="Atualizar"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>

          <Button
            onClick={() => {
              setEditingTag(null);
              setShowTagForm(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 rounded-xl"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Marcador
          </Button>
          </div>
          </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* Mobile: Select dropdown */}
        <div className="sm:hidden">
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full rounded-xl">
              <SelectValue placeholder="Filtrar marcadores" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all" className="rounded-lg">Todos ({filteredTags.length})</SelectItem>
              <SelectItem value="system" className="rounded-lg">Sistema ({getTabTags('system').length})</SelectItem>
              <SelectItem value="manual" className="rounded-lg">Manuais ({getTabTags('manual').length})</SelectItem>
              <SelectItem value="automatic" className="rounded-lg">Automáticos ({getTabTags('automatic').length})</SelectItem>
              <SelectItem value="smart" className="rounded-lg">Inteligentes ({getTabTags('smart').length})</SelectItem>
              <SelectItem value="active" className="rounded-lg">Ativos ({getTabTags('active').length})</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Desktop: Tabs */}
        <TabsList className="hidden sm:grid grid-cols-6 rounded-2xl bg-gray-100 p-1">
          <TabsTrigger value="all" className="rounded-xl text-sm">
            Todos ({filteredTags.length})
          </TabsTrigger>
          <TabsTrigger value="system" className="rounded-xl text-sm">
            Sistema ({getTabTags('system').length})
          </TabsTrigger>
          <TabsTrigger value="manual" className="rounded-xl text-sm">
            Manuais ({getTabTags('manual').length})
          </TabsTrigger>
          <TabsTrigger value="automatic" className="rounded-xl text-sm">
            Automáticos ({getTabTags('automatic').length})
          </TabsTrigger>
          <TabsTrigger value="smart" className="rounded-xl text-sm">
            Inteligentes ({getTabTags('smart').length})
          </TabsTrigger>
          <TabsTrigger value="active" className="rounded-xl text-sm">
            Ativos ({getTabTags('active').length})
          </TabsTrigger>
        </TabsList>

        {['all', 'system', 'manual', 'automatic', 'smart', 'active'].map(tab => (
          <TabsContent key={tab} value={tab} className="mt-6">
            {getTabTags(tab).length === 0 ? (
              <Card className="rounded-3xl border-dashed border-2 border-gray-200">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <TagIcon className="w-16 h-16 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {tab === 'all' ? 'Nenhum marcador encontrado' : 
                     tab === 'system' ? 'Nenhum marcador de sistema' :
                     tab === 'manual' ? 'Nenhum marcador manual' :
                     tab === 'automatic' ? 'Nenhum marcador automático' :
                     tab === 'smart' ? 'Nenhum marcador inteligente' :
                     'Nenhum marcador ativo'}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {searchTerm ? 'Tente ajustar os filtros de busca' : 'Crie marcadores para organizar seus contatos'}
                  </p>
                  {tab === 'all' && !searchTerm && (
                    <Button 
                      onClick={() => setShowTagForm(true)} 
                      className="bg-blue-600 hover:bg-blue-700 rounded-xl"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Criar Primeiro Marcador
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {getTabTags(tab).map(tag => renderTagCard(tag))}
              </div>
            ) : (
              <div className="space-y-3">
                {getTabTags(tab).map(tag => renderTagCard(tag))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Modals */}
      <TagFormModal
        tag={editingTag}
        smartTagTypes={smartTagTypes}
        open={showTagForm}
        onClose={() => {
          setShowTagForm(false);
          setEditingTag(null);
        }}
        onSubmit={editingTag ? handleUpdateTag : handleCreateTag}
      />

      <TagDetailsModal
        tag={selectedTag}
        contacts={contacts}
        open={showTagDetails}
        onClose={() => {
          setShowTagDetails(false);
          setSelectedTag(null);
        }}
        onEdit={() => handleEditTag(selectedTag)}
        onConfigureRules={() => handleConfigureSmartRules(selectedTag)}
      />

      <SmartTagRulesModal
        tag={smartRulesTag}
        open={showSmartRules}
        onClose={() => {
          setShowSmartRules(false);
          setSmartRulesTag(null);
        }}
        onSave={handleSmartRulesUpdate}
      />

    </div>
  );
}