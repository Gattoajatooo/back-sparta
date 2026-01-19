import React, { useState, useEffect, useCallback } from "react";
import { User } from "@/entities/User";
import { MessageTemplate } from "@/entities/MessageTemplate";
import { Plan } from "@/entities/Plan"; // Import Plan entity
import { getSubscriptionStatus } from "@/functions/getSubscriptionStatus"; // Import getSubscriptionStatus function
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
  FileText,
  Search,
  Plus,
  ArrowUpDown,
  Grid3X3,
  Grid,
  List,
  Gift,
  DollarSign,
  Heart,
  Megaphone,
  Star,
  Clock,
  AlertTriangle,
  Target,
  Calendar,
  TrendingUp,
  MessageSquare,
  Send,
  Zap,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  CheckCircle2,
  RefreshCw,
  LayoutGrid,
  X,
  Activity,
  Users,
  Briefcase,
  Sparkles
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import TemplateFormModal from "../components/templates/TemplateFormModal";
import TemplateDetailsModal from "../components/templates/TemplateDetailsModal";

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

export default function MessageTemplates() {
  const [templates, setTemplates] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [viewMode, setViewMode] = useState("grid");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [templateUsage, setTemplateUsage] = useState(null);

  // Banner state
  const [banner, setBanner] = useState({ show: false, message: '', type: 'success' });

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [viewingTemplate, setViewingTemplate] = useState(null);
  const [isSaving, setIsSaving] = useState(false); // New state for saving status

  const getUsageColorClass = (used, limit) => {
    if (limit === -1 || used === undefined || limit === undefined) {
      return "bg-gray-100 text-gray-600 border-gray-200";
    }

    if (limit === 0) {
        if (used > 0) return "bg-red-100 text-red-700 border-red-200";
        return "bg-gray-100 text-gray-600 border-gray-200";
    }

    const percentage = (used / limit) * 100;

    if (percentage >= 100) {
      return "bg-red-100 text-red-700 border-red-200";
    }
    if (percentage >= 80) {
      return "bg-amber-100 text-amber-700 border-amber-200";
    }

    return "bg-gray-100 text-gray-600 border-gray-200";
  };

  // Stats calculation
  const totalTemplates = templates.length;
  const activeTemplates = templates.filter(t => t.is_active).length;
  const totalUsage = templates.reduce((sum, t) => sum + (t.usage_count || 0), 0);
  const averageSuccessRate = templates.length > 0
    ? templates.reduce((sum, t) => sum + (t.success_rate || 0), 0) / templates.length * 100
    : 0;

  // Template categories and types
  const templateCategories = [
    { id: 'birthday', name: 'Aniversário', icon: Gift, color: 'bg-pink-100 text-pink-800' },
    { id: 'billing', name: 'Cobrança', icon: DollarSign, color: 'bg-red-100 text-red-800' },
    { id: 'congratulations', name: 'Felicitações', icon: Heart, color: 'bg-green-100 text-green-800' },
    { id: 'promotions', name: 'Promoções', icon: Megaphone, color: 'bg-blue-100 text-blue-800' },
    { id: 'welcome', name: 'Boas-vindas', icon: Star, color: 'bg-yellow-100 text-yellow-800' },
    { id: 'follow_up', name: 'Follow-up', icon: Clock, color: 'bg-purple-100 text-purple-800' },
    { id: 'reminders', name: 'Lembretes', icon: AlertTriangle, color: 'bg-orange-100 text-orange-800' },
    { id: 'surveys', name: 'Pesquisas', icon: Target, color: 'bg-indigo-100 text-indigo-800' },
    { id: 'seasonal', name: 'Sazonais', icon: Calendar, color: 'bg-teal-100 text-teal-800' },
    { id: 'retention', name: 'Retenção', icon: TrendingUp, color: 'bg-emerald-100 text-emerald-800' },
    ...(user?.role === 'admin' ? [{ id: 'notifications', name: 'Notificações', icon: Activity, color: 'bg-blue-100 text-blue-800' }] : [])
  ];

  const templateTypes = [
    { id: 'whatsapp', name: 'WhatsApp', icon: MessageSquare },
    { id: 'email', name: 'Email', icon: Send },
    { id: 'sms', name: 'SMS', icon: Zap }
  ];

  const hideBanner = useCallback(() => {
    setBanner({ show: false, message: '', type: 'success' });
  }, []);

  const showBanner = useCallback((message, type = 'success') => {
    setBanner({ show: true, message, type });
    setTimeout(() => {
      hideBanner();
    }, 5000);
  }, [hideBanner]);

  const loadTemplates = useCallback(async () => { // Renamed from loadData and wrapped in useCallback
    setIsLoading(true);
    try {
      const currentUser = await User.me();
      setUser(currentUser);

      if (currentUser.company_id) {
        const fetchedTemplates = await MessageTemplate.filter(
          { company_id: currentUser.company_id },
          "-updated_date" // Sort by updated_date as per outline
        );
        setTemplates(fetchedTemplates);
      } else {
        setTemplates([]);
      }
    } catch (error) {
      console.error("Erro ao carregar modelos:", error);
      setTemplates([]);
      showBanner('Erro ao carregar modelos', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showBanner]);

  useEffect(() => {
    loadTemplates();
    checkForCreateAction();
    loadTemplateUsage();
  }, [loadTemplates]); // Added loadTemplates to dependency array

  const loadTemplateUsage = async () => {
    try {
      const { data } = await getSubscriptionStatus();
      if (!data?.success || !data.has_active_subscription) {
        setTemplateUsage(null);
        return;
      }

      const planId = data.subscription.metadata?.plan_id;
      if (!planId) {
        setTemplateUsage(null);
        return;
      }

      let currentPlan;
      try {
        currentPlan = await Plan.get(planId);
      } catch (planError) {
        console.warn('Plano de modelo não encontrado:', planId, planError);
        setTemplateUsage(null);
        return;
      }

      if (!currentPlan) {
        setTemplateUsage(null);
        return;
      }

      const templateLimit = currentPlan.template_models;

      const activeTemplates = await MessageTemplate.filter({
        company_id: user.company_id,
        is_active: true
      });

      setTemplateUsage({
        used: activeTemplates.length,
        limit: templateLimit,
      });

    } catch (error) {
      console.error("Erro ao carregar uso de modelos:", error);
      setTemplateUsage(null);
    }
  };

  const checkForCreateAction = () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'create') {
      setShowForm(true);
    }
  };

  const handleSave = async (templateData) => { // Unified save function for create and edit
    setIsSaving(true);
    try {
      // VERIFICAÇÃO DE LIMITE DE PLANO AO CRIAR
      if (!editingTemplate) { // Only check limit for new template creation
        const { data } = await getSubscriptionStatus();
        if (data?.success && data.has_active_subscription) {
          const planId = data.subscription?.metadata?.plan_id; // Use optional chaining
          if (planId) {
            const currentPlan = await Plan.get(planId);
            if (currentPlan) {
              const templateLimit = currentPlan.template_models;
              // Check if templateLimit is defined and not -1 (unlimited)
              if (templateLimit !== undefined && templateLimit !== -1) {
                // Count current active templates (as per outline example)
                const currentTemplates = await MessageTemplate.filter({ company_id: user.company_id, is_active: true });
                if (currentTemplates.length >= templateLimit) {
                  throw new Error(`Limite de ${templateLimit} modelos atingido. Para adicionar mais, faça um upgrade no seu plano.`);
                }
              }
            }
          }
        }
      }

      if (editingTemplate) {
        const updatedTemplate = await MessageTemplate.update(editingTemplate.id, {
          ...templateData,
          company_id: user.company_id,
        });
        setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? updatedTemplate : t));
        showBanner("Modelo atualizado com sucesso!");
      } else {
        const newTemplate = await MessageTemplate.create({
          ...templateData,
          company_id: user.company_id,
        });
        setTemplates(prev => [newTemplate, ...prev]); // Add new template to state
        showBanner("Modelo criado com sucesso!");
      }
      setShowForm(false);
      setEditingTemplate(null);
      await loadTemplates(); // Reload all templates to ensure data consistency
    } catch (error) {
      console.error("Erro ao salvar o modelo:", error);
      showBanner(error.message || "Erro ao salvar o modelo", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTemplate = async (template) => {
    if (window.confirm(`Tem certeza que deseja excluir o modelo "${template.name}"?`)) {
      try {
        await MessageTemplate.delete(template.id);
        setTemplates(prev => prev.filter(t => t.id !== template.id));
        showBanner('Modelo excluído com sucesso!', 'success');
      } catch (error) {
        console.error("Erro ao excluir modelo:", error);
        showBanner('Erro ao excluir modelo', 'error');
      }
    }
  };

  const handleEditClick = (template) => {
    setEditingTemplate(template);
    setShowForm(true);
  };

  const handleViewDetails = (template) => {
    setViewingTemplate(template);
    setShowDetails(true);
  };

  const filteredTemplates = templates
    .filter(template => {
      const matchesSearch = !searchTerm ||
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.content.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = selectedCategory === "all" || template.category === selectedCategory;
      const matchesType = selectedType === "all" || template.type === selectedType;

      return matchesSearch && matchesCategory && matchesType;
    })
    .sort((a, b) => {
      let aValue, bValue;
      switch (sortBy) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "category":
          aValue = a.category.toLowerCase();
          bValue = b.category.toLowerCase();
          break;
        case "usage":
          aValue = a.usage_count || 0;
          bValue = b.usage_count || 0;
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

  const getTabTemplates = (tab) => {
    switch (tab) {
      case "active":
        return filteredTemplates.filter(t => t.is_active);
      case "inactive":
        return filteredTemplates.filter(t => !t.is_active);
      default:
        return filteredTemplates;
    }
  };

  const renderTemplateCard = (template) => {
    const categoryData = templateCategories.find(cat => cat.id === template.category);
    const IconComponent = categoryData?.icon || Gift;
    const iconColorClass = categoryData?.color || 'bg-pink-100 text-pink-800';

    const typeData = templateTypes.find(type => type.id === template.type);
    const TypeIconComponent = typeData?.icon || MessageSquare;

    const isSmartTemplate = template.is_smart_template && template.content_variations?.length > 0;
    const totalMessages = isSmartTemplate ? (template.content_variations.length + 1) : 1;
    const stackCount = Math.min(totalMessages, 10);

    return (
      <div className="relative" style={{ paddingBottom: isSmartTemplate ? `${stackCount * 4}px` : '0' }}>
        
        <Card 
          key={template.id} 
          className={`rounded-3xl hover:shadow-lg transition-all overflow-hidden relative h-full ${
            template.is_system_template 
              ? 'border-2 border-blue-400 bg-gradient-to-br from-blue-50 to-white' 
              : 'border-gray-200 bg-white'
          }`}
          style={{ zIndex: stackCount }}
        >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 ${iconColorClass} rounded-2xl flex items-center justify-center flex-shrink-0`}>
                <IconComponent className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-gray-900 text-base sm:text-lg truncate">{template.name}</h3>
                <p className="text-sm text-gray-500 capitalize truncate">{categoryData?.name || template.category}</p>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full flex-shrink-0">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="rounded-2xl" align="end">
                <DropdownMenuItem onClick={() => handleEditClick(template)} className="rounded-xl">
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleViewDetails(template)} className="rounded-xl">
                  <Eye className="w-4 h-4 mr-2" />
                  Ver Detalhes
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDeleteTemplate(template)}
                  className="rounded-xl text-red-600 focus:text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 flex flex-col h-[calc(100%-5rem)]">
          {/* Content Preview */}
          <div className="bg-gray-50 rounded-2xl p-4 flex-1 min-h-[80px]">
            <p className="text-sm text-gray-700 line-clamp-3">
              {template.content}
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100 flex-shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <TypeIconComponent className="w-4 h-4" />
                <span className="hidden sm:inline">{typeData?.name || template.type}</span>
              </div>
              {isSmartTemplate && (
                <Badge className="bg-purple-100 text-purple-700 border-purple-300 text-xs">
                  <Sparkles className="w-3 h-3 mr-1" />
                  {totalMessages} msgs
                </Badge>
              )}
            </div>

            <Badge variant="outline" className={`rounded-full text-xs flex-shrink-0 ${template.is_active ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
              {template.is_active ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
        </CardContent>
      </Card>
      
      {isSmartTemplate && Array.from({ length: stackCount - 1 }).map((_, idx) => (
        <div
          key={`stack-${idx}`}
          className="absolute bg-gray-100 rounded-3xl border border-gray-200"
          style={{
            top: `${(idx + 1) * 4}px`,
            left: 0,
            right: 0,
            bottom: `-${(idx + 1) * 4}px`,
            zIndex: stackCount - (idx + 1),
            opacity: 1 - (idx * 0.15),
            boxShadow: `0 ${2 + idx}px ${4 + idx * 2}px rgba(0, 0, 0, 0.08)`
          }}
        />
      ))}
      </div>
    );
  };

  if (isLoading && templates.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto overflow-hidden">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690a8ae384e85f405dd1958f/8d6af0619_ChatGPTImage24denovde202519_02_27.png"
              alt="Sparta Sync"
              className="w-16 h-16 object-contain"
              onError={(e) => {
                console.error('Logo failed to load on MessageTemplates');
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center flex-shrink-0">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Modelos de Mensagem</h1>
            <p className="text-sm sm:text-base text-gray-600 hidden sm:block">
              Crie e gerencie templates reutilizáveis
            </p>
          </div>
        </div>

        {/* Plan Limit Badge */}
        {templateUsage && (
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 self-start sm:self-auto">
            <FileText className="w-4 h-4 text-gray-600 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-900 whitespace-nowrap">
              {templateUsage.used} / {templateUsage.limit === -1 ? '∞' : templateUsage.limit}
            </span>
            <span className="text-xs text-gray-600 whitespace-nowrap">modelos ativos</span>
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
              onClick={() => setViewMode('grid')}
              className="h-8 w-8 rounded-lg"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
              className="h-8 w-8 rounded-lg"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            onClick={() => loadTemplates()}
            disabled={isLoading}
            className="rounded-xl h-10 w-10 p-0"
            size="icon"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>

          <Button
            onClick={() => {
              setEditingTemplate(null);
              setShowForm(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 rounded-xl flex-1"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Modelo
          </Button>
        </div>

        {/* Mobile: Ordenação */}
        <div className="flex gap-2 sm:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="rounded-xl flex-1 justify-between">
                <span className="flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4" />
                  {sortBy === 'name' ? 'Nome' : 
                   sortBy === 'category' ? 'Categoria' : 
                   sortBy === 'usage' ? 'Uso' : 
                   sortBy === 'created' ? 'Data' : 'Ordenar'}
                </span>
                <span className="text-xs text-gray-500">
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48 rounded-xl">
              {[
                { value: 'name', label: 'Nome' },
                { value: 'category', label: 'Categoria' },
                { value: 'usage', label: 'Uso' },
                { value: 'created', label: 'Data de Criação' }
              ].map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={(e) => {
                    e.preventDefault();
                    if (sortBy === option.value) {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy(option.value);
                      setSortOrder('asc');
                    }
                  }}
                  className="rounded-lg flex justify-between cursor-pointer"
                >
                  <span>{option.label}</span>
                  {sortBy === option.value && (
                    <span className="text-blue-600 font-medium">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Mobile: Barra de pesquisa */}
        <div className="relative w-full sm:hidden">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Pesquisar modelos..."
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
              placeholder="Pesquisar modelos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>

          {/* Ordenação com toggle integrado */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="rounded-xl w-44 justify-between">
                <span className="flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4" />
                  {sortBy === 'name' ? 'Nome' : 
                   sortBy === 'category' ? 'Categoria' : 
                   sortBy === 'usage' ? 'Uso' : 
                   sortBy === 'created' ? 'Data de Criação' : 'Ordenar por'}
                </span>
                <span className="text-xs text-gray-500">
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-44 rounded-xl">
              {[
                { value: 'name', label: 'Nome' },
                { value: 'category', label: 'Categoria' },
                { value: 'usage', label: 'Uso' },
                { value: 'created', label: 'Data de Criação' }
              ].map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={(e) => {
                    e.preventDefault();
                    if (sortBy === option.value) {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy(option.value);
                      setSortOrder('asc');
                    }
                  }}
                  className="rounded-lg flex justify-between cursor-pointer"
                >
                  <span>{option.label}</span>
                  {sortBy === option.value && (
                    <span className="text-blue-600 font-medium">
                      {sortOrder === 'asc' ? '↑ Cresc.' : '↓ Decresc.'}
                    </span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex gap-1 border rounded-xl p-1">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
              className="h-8 w-8 rounded-lg"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
              className="h-8 w-8 rounded-lg"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            onClick={() => loadTemplates()}
            disabled={isLoading}
            className="rounded-xl h-10 w-10 p-0"
            size="icon"
            title="Atualizar"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>

          <Button
            onClick={() => {
              setEditingTemplate(null);
              setShowForm(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 rounded-xl"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Modelo
          </Button>
        </div>

        {/* Filtros de Categoria e Tipo */}
        <div className="flex flex-wrap gap-2">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-48 rounded-xl">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">Todas Categorias</SelectItem>
              {templateCategories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-full sm:w-32 rounded-xl">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">Todos Tipos</SelectItem>
              {templateTypes.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Templates Display */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="inline-flex h-10 items-center justify-center rounded-2xl bg-gray-100 p-1 text-muted-foreground">
          <TabsTrigger value="all" className="rounded-xl px-3">Todos ({filteredTemplates.length})</TabsTrigger>
          <TabsTrigger value="active" className="rounded-xl px-3">Ativos ({getTabTemplates('active').length})</TabsTrigger>
          <TabsTrigger value="inactive" className="rounded-xl px-3">Inativos ({getTabTemplates('inactive').length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {getTabTemplates("all").length > 0 ? (
            <div className={viewMode === 'grid'
              ? "grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 auto-rows-fr"
              : "space-y-4"
            }>
              {getTabTemplates("all").map((template) => renderTemplateCard(template))}
            </div>
          ) : (
            <Card className="rounded-3xl border-gray-200">
              <CardContent className="text-center py-16">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhum modelo encontrado</h3>
                <p className="text-gray-500 mb-6">Crie seu primeiro modelo de mensagem para começar</p>
                <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 rounded-2xl">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeiro Modelo
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          {getTabTemplates("active").length > 0 ? (
            <div className={viewMode === 'grid'
              ? "grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 auto-rows-fr"
              : "space-y-4"
            }>
              {getTabTemplates("active").map((template) => renderTemplateCard(template))}
            </div>
          ) : (
            <Card className="rounded-3xl border-gray-200">
              <CardContent className="text-center py-16">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhum modelo ativo</h3>
                <p className="text-gray-500">Todos os modelos estão ativos no momento</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="inactive" className="space-y-4">
          {getTabTemplates("inactive").length > 0 ? (
            <div className={viewMode === 'grid'
              ? "grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 auto-rows-fr"
              : "space-y-4"
            }>
              {getTabTemplates("inactive").map((template) => renderTemplateCard(template))}
            </div>
          ) : (
            <Card className="rounded-3xl border-gray-200">
              <CardContent className="text-center py-16">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhum modelo inativo</h3>
                <p className="text-gray-500">Todos os modelos estão ativos no momento</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <TemplateFormModal
        template={editingTemplate}
        categories={templateCategories}
        types={templateTypes}
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingTemplate(null);
        }}
        onSubmit={handleSave}
        isSaving={isSaving}
        currentUser={user}
      />

      <TemplateDetailsModal
        template={viewingTemplate}
        open={showDetails}
        onClose={() => {
          setShowDetails(false);
          setViewingTemplate(null);
        }}
        onEdit={() => {
          setEditingTemplate(viewingTemplate);
          setShowDetails(false);
          setShowForm(true);
        }}
      />
    </div>
  );
}