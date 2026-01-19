import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  ArrowRight,
  Grid,
  List,
  CreditCard,
  FileText,
  Users,
  Settings,
  BarChart3,
  UserIcon,
  Shield,
  GraduationCap,
  BookOpen,
  HelpCircle,
  Mail,
  FileSearch,
  History,
  Bell,
  MessageCircle,
  Cpu,
  Filter
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

// Banner Component
const Banner = ({ type = "success", message, onDismiss }) => {
  if (!message) return null;

  const styles = {
    success: "bg-green-50 border-green-200 text-green-800",
    error: "bg-red-50 border-red-200 text-red-800",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
  };

  return (
    <div className={`${styles[type]} border rounded-xl p-4 mb-6 flex items-center justify-between`}>
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onDismiss} className="text-gray-500 hover:text-gray-700">
        ✕
      </button>
    </div>
  );
};

export default function UserPreferences() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [banner, setBanner] = useState({ show: false, type: "", message: "" });

  const showBanner = (type, message) => {
    setBanner({ show: true, type, message });
    setTimeout(() => setBanner({ show: false, type: "", message: "" }), 5000);
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Error loading user:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, []);

  const applications = [
    {
      id: "profile",
      title: "Perfil",
      description: "Gerencie suas informações pessoais e preferências de conta",
      icon: UserIcon,
      color: "text-blue-600 bg-blue-50",
      category: "account",
      url: createPageUrl("ProfileSettings"),
      enabled: true
    },
    {
      id: "plans",
      title: "Planos e Assinaturas",
      description: "Visualize e gerencie seu plano atual",
      icon: CreditCard,
      color: "text-purple-600 bg-purple-50",
      category: "billing",
      url: createPageUrl("Plans"),
      enabled: true
    },
    {
      id: "billing",
      title: "Faturamento",
      description: "Histórico de pagamentos e faturas",
      icon: FileText,
      color: "text-green-600 bg-green-50",
      category: "billing",
      url: createPageUrl("Billing"),
      enabled: true
    },
    {
      id: "team",
      title: "Equipe",
      description: "Gerencie membros da equipe e permissões",
      icon: Users,
      color: "text-orange-600 bg-orange-50",
      category: "team",
      url: createPageUrl("Team"),
      enabled: true
    },
    {
      id: "roles",
      title: "Funções e Permissões",
      description: "Configure papéis e níveis de acesso",
      icon: Shield,
      color: "text-red-600 bg-red-50",
      category: "team",
      url: createPageUrl("RolePermissions"),
      enabled: true
    },
    {
      id: "company",
      title: "Configurações da Empresa",
      description: "Informações e configurações da empresa",
      icon: Settings,
      color: "text-gray-600 bg-gray-50",
      category: "account",
      url: createPageUrl("CompanySetup"),
      enabled: true
    },
    {
      id: "reports",
      title: "Relatórios",
      description: "Análises e métricas de desempenho",
      icon: BarChart3,
      color: "text-indigo-600 bg-indigo-50",
      category: "analytics",
      url: "#",
      enabled: false,
      comingSoon: true
    },
    {
      id: "tutorial",
      title: "Tutorial",
      description: "Aprenda a usar todas as funcionalidades do sistema",
      icon: GraduationCap,
      color: "text-cyan-600 bg-cyan-50",
      category: "help",
      url: createPageUrl("Tutorial"),
      enabled: false,
      comingSoon: true
    },
    {
      id: "documentation",
      title: "Documentação",
      description: "Documentação completa da plataforma",
      icon: BookOpen,
      color: "text-teal-600 bg-teal-50",
      category: "help",
      url: createPageUrl("Documentation"),
      enabled: false,
      comingSoon: true
    },
    {
      id: "faq",
      title: "FAQ",
      description: "Perguntas frequentes e respostas rápidas",
      icon: HelpCircle,
      color: "text-lime-600 bg-lime-50",
      category: "help",
      url: createPageUrl("FAQ"),
      enabled: false,
      comingSoon: true
    },
    {
      id: "contact",
      title: "Contato",
      description: "Entre em contato com nossa equipe de suporte",
      icon: Mail,
      color: "text-pink-600 bg-pink-50",
      category: "support",
      url: createPageUrl("ContactSupport"),
      enabled: false,
      comingSoon: true
    },
    {
      id: "tickets",
      title: "Tickets",
      description: "Acompanhe seus tickets de suporte",
      icon: FileSearch,
      color: "text-rose-600 bg-rose-50",
      category: "support",
      url: createPageUrl("SupportTickets"),
      enabled: false,
      comingSoon: true
    },
    {
      id: "logs",
      title: "Logs",
      description: "Visualize o histórico de atividades do sistema",
      icon: History,
      color: "text-slate-600 bg-slate-50",
      category: "system",
      url: "#",
      enabled: false,
      comingSoon: true
    },
    {
      id: "notifications",
      title: "Notificações",
      description: "Configure suas preferências de notificações",
      icon: Bell,
      color: "text-amber-600 bg-amber-50",
      category: "system",
      url: createPageUrl("Notifications"),
      enabled: false,
      comingSoon: true
    },
    {
      id: "messages",
      title: "Mensagens",
      description: "Central de mensagens e comunicações internas",
      icon: MessageCircle,
      color: "text-sky-600 bg-sky-50",
      category: "communication",
      url: "#",
      enabled: false,
      comingSoon: true
    },
    {
      id: "system",
      title: "Sistema",
      description: "Configurações avançadas do sistema",
      icon: Cpu,
      color: "text-stone-600 bg-stone-50",
      category: "system",
      url: createPageUrl("Sistema"),
      enabled: true,
      adminOnly: true
    }
  ];

  const categories = [
    { id: "all", name: "Todos" },
    { id: "account", name: "Conta" },
    { id: "billing", name: "Faturamento" },
    { id: "team", name: "Equipe" },
    { id: "analytics", name: "Análises" },
    { id: "help", name: "Ajuda" },
    { id: "support", name: "Suporte" },
    { id: "communication", name: "Comunicação" },
    { id: "system", name: "Sistema" }
  ];

  const filteredApplications = applications.filter(app => {
    const matchesSearch = app.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || app.category === selectedCategory;
    const matchesRole = !app.adminOnly || user?.role === 'admin';
    return matchesSearch && matchesCategory && matchesRole;
  });

  const handleAppClick = (app) => {
    if (!app.enabled) {
      showBanner("warning", "Esta funcionalidade estará disponível em breve!");
      return;
    }
    navigate(app.url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto overflow-hidden">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690a8ae384e85f405dd1958f/8d6af0619_ChatGPTImage24denovde202519_02_27.png"
              alt="Sparta Sync"
              className="w-16 h-16 object-contain"
              onError={(e) => {
                console.error('Logo failed to load on UserPreferences page');
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
      <style>{`
        @keyframes spartaFade {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.95); }
        }
      `}</style>

      {banner.show && (
        <Banner 
          type={banner.type} 
          message={banner.message} 
          onDismiss={() => setBanner({ show: false, type: "", message: "" })} 
        />
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-3xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Central de Aplicações</h1>
        <p className="text-blue-100">
          Gerencie suas configurações e acesse todas as funcionalidades
        </p>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col gap-3">
        {/* Mobile: Botões e filtro */}
        <div className="flex gap-2 w-full sm:hidden">
          <div className="flex gap-1 border rounded-xl p-1 bg-white">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("grid")}
              className="h-8 w-8 rounded-lg"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("list")}
              className="h-8 w-8 rounded-lg"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="flex-1 rounded-xl">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {categories.map(category => (
                <SelectItem key={category.id} value={category.id} className="rounded-lg">
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Mobile: Barra de pesquisa */}
        <div className="relative w-full sm:hidden">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar aplicações..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>

        {/* Desktop: Tudo na mesma linha */}
        <div className="hidden sm:flex gap-2 items-center">
          {/* Barra de pesquisa primeiro */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar aplicações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>

          <div className="flex gap-1 border rounded-xl p-1">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("grid")}
              className="h-8 w-8 rounded-lg"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("list")}
              className="h-8 w-8 rounded-lg"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-40 rounded-xl">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {categories.map(category => (
                <SelectItem key={category.id} value={category.id} className="rounded-lg">
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Applications Grid/List */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredApplications.map(app => (
            <Card 
              key={app.id} 
              className={`rounded-3xl border-gray-100 hover:shadow-lg transition-all cursor-pointer ${!app.enabled ? 'opacity-60' : ''}`}
              onClick={() => handleAppClick(app)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className={`w-12 h-12 rounded-2xl ${app.color} flex items-center justify-center`}>
                    <app.icon className="w-6 h-6" />
                  </div>
                  {app.comingSoon && (
                    <Badge variant="secondary" className="rounded-full text-xs">
                      Em breve
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-lg mt-4">{app.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">{app.description}</p>
                <Button 
                  variant="ghost" 
                  className="w-full justify-between rounded-xl"
                  disabled={!app.enabled}
                >
                  Acessar
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredApplications.map(app => (
            <Card 
              key={app.id} 
              className={`rounded-2xl border-gray-100 hover:shadow-md transition-all cursor-pointer ${!app.enabled ? 'opacity-60' : ''}`}
              onClick={() => handleAppClick(app)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl ${app.color} flex items-center justify-center flex-shrink-0`}>
                    <app.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{app.title}</h3>
                      {app.comingSoon && (
                        <Badge variant="secondary" className="rounded-full text-xs">
                          Em breve
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{app.description}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredApplications.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">Nenhuma aplicação encontrada</p>
        </div>
      )}
    </div>
  );
}