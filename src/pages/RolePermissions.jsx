import React, { useState, useEffect, useCallback } from "react";
import { User } from "@/entities/User";
import { Role } from "@/entities/Role";
import { RoleDefault } from "@/entities/RoleDefault";
import { PermissionDefault } from "@/entities/PermissionDefault";
import { Company } from "@/entities/Company";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  Users,
  Lock,
  Plus,
  ChevronDown,
  ChevronRight,
  Edit,
  Trash2,
  MoreVertical,
  LayoutGrid,
  List,
  RefreshCw,
  Search,
  X,
  AlertCircle
} from "lucide-react";
import CreateRoleForm from "../components/team/CreateRoleForm";

export default function RolePermissions() {
  const [currentUser, setCurrentUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [roles, setRoles] = useState([]); // Custom roles
  const [roleDefaults, setRoleDefaults] = useState([]); // System default roles
  const [adminPermissions, setAdminPermissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [hasPermission, setHasPermission] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRole, setEditingRole] = useState(null);

  // View mode state
  const [viewMode, setViewMode] = useState(() => {
    const saved = localStorage.getItem('roles_viewMode');
    return saved || "grid";
  });

  // Notification state
  const [notification, setNotification] = useState({
    show: false,
    type: 'success',
    message: ''
  });

  const checkPermissions = (user, userRole) => {
    // Qualquer usuário autenticado pode acessar a página de roles e permissões
    return true;
  };

  const saveViewPreferences = (preferences) => {
    if (preferences.viewMode !== undefined) {
      localStorage.setItem('roles_viewMode', preferences.viewMode);
    }
  };

  const showNotification = (type, message) => {
    setNotification({
      show: true,
      type,
      message
    });

    setTimeout(() => {
      setNotification({
        show: false,
        type: 'success',
        message: ''
      });
    }, 5000);
  };

  const loadData = useCallback(async () => {
    try {
      setError("");
      setIsLoading(true);

      const user = await User.me();
      setCurrentUser(user);

      if (user.company_id) {
        const companies = await Company.list();
        const userCompany = companies.find(c => c.id === user.company_id);
        setCompany(userCompany);

        const hasAccess = checkPermissions(user, null);
        setHasPermission(hasAccess);

        if (!hasAccess) {
          setError("Você não tem permissão para acessar as configurações de funções e permissões.");
          setIsLoading(false);
          return;
        }

        const [customRoles, defaultRoles, defaultPermissions] = await Promise.all([
          Role.filter({ company_id: user.company_id }, 'name'),
          RoleDefault.list(),
          PermissionDefault.list()
        ]);

        setRoles(customRoles || []);
        setRoleDefaults(defaultRoles || []);
        
        // Buscar permissões do admin
        const adminRole = defaultRoles?.find(r => r.slug === 'admin');
        if (adminRole) {
          const adminPerms = defaultPermissions?.filter(p => p.role_default_id === adminRole.id) || [];
          setAdminPermissions(adminPerms);
        }
      }
    } catch (error) {
      console.error("Error loading role permissions data:", error);
      setError("Falha ao carregar dados de funções e permissões.");
      showNotification('error', `Falha ao carregar dados: ${error.message || ''}`);
    } finally {
      setIsLoading(false);
    }
  }, []); // Removido 'roles' da dependência para evitar loop infinito

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateRole = async (roleData) => {
    try {
      await Role.create({
        ...roleData,
        company_id: company.id,
      });
      setShowCreateForm(false);
      showNotification('success', 'Função criada com sucesso!');
      loadData();
    } catch (error) {
      console.error("Error creating role:", error);
      showNotification('error', "Falha ao criar função.");
    }
  };

  const handleUpdateRole = async (roleData) => {
    if (!editingRole) return;
    try {
      await Role.update(editingRole.id, roleData);
      setEditingRole(null);
      setShowCreateForm(false);
      showNotification('success', 'Função atualizada com sucesso!');
      loadData();
    } catch (error) {
      console.error("Error updating role:", error);
      showNotification('error', "Falha ao atualizar função.");
    }
  };

  const handleDeleteRole = async (role) => {
    if (window.confirm(`Tem certeza que deseja excluir a função "${role.name}"?`)) {
      try {
        await Role.delete(role.id);
        showNotification('success', 'Função excluída com sucesso!');
        loadData();
      } catch (error) {
        console.error("Error deleting role:", error);
        showNotification('error', "Falha ao excluir função.");
      }
    }
  };

  const handleEditRole = (role) => {
    setEditingRole(role);
    setShowCreateForm(true);
  };

  const getPermissionDisplay = (level) => {
    const displays = {
      'full': { text: 'Total', color: 'bg-green-100 text-green-800' },
      'view': { text: 'Visualizar', color: 'bg-blue-100 text-blue-800' },
      'none': { text: 'Nenhuma', color: 'bg-gray-100 text-gray-600' }
    };
    return displays[level] || displays.none;
  };

  const getModuleDisplay = (module) => {
    const modules = {
      'sessions': 'Sessões',
      'conversations': 'Conversas',
      'contacts': 'Contatos',
      'campaigns': 'Campanhas',
      'templates': 'Modelos',
      'tags': 'Marcadores',
      'tickets': 'Chamados',
      'plans': 'Planos',
      'billing': 'Faturamento',
      'logs': 'Logs',
      'team': 'Equipe',
      'roles': 'Funções',
      'reports': 'Relatórios'
    };
    return modules[module] || module;
  };

  // Combine all roles/functions data
  const allRolesData = [
    // System roles (admin)
    ...roleDefaults.map(role => ({
      ...role,
      type: 'system',
      permissionsCount: adminPermissions.filter(p => p.role_default_id === role.id).length
    })),
    // Custom roles
    ...roles.map(role => ({
      ...role,
      type: 'custom',
      permissionsCount: Object.values(role.permissions || {}).filter(p => p !== 'none').length
    }))
  ];

  // Filter roles based on search term and active tab
  const filteredRoles = allRolesData.filter(role => {
    const matchesSearch = searchTerm === "" || 
      role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (role.description && role.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesTab = activeTab === "all" || 
      (activeTab === "system" && role.type === 'system') ||
      (activeTab === "custom" && role.type === 'custom');
    
    return matchesSearch && matchesTab;
  });

  // Renderizar função em formato card
  const renderRoleCard = (role) => {
    const canEdit = role.type === 'custom';
    const canDelete = role.type === 'custom';

    return (
      <Card key={role.id} className="rounded-3xl border-gray-200 hover:shadow-md transition-shadow group">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                role.type === 'system' ? 'bg-red-100' : 'bg-blue-100'
              }`}>
                <Shield className={`w-6 h-6 ${
                  role.type === 'system' ? 'text-red-600' : 'text-blue-600'
                }`} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  {role.name}
                  {role.type === 'system' && (
                    <Badge className="bg-red-100 text-red-800 text-xs ml-2">
                      Sistema
                    </Badge>
                  )}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {role.description || 'Sem descrição'}
                </p>
              </div>
            </div>

            {(canEdit || canDelete) && (
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
                  {canEdit && (
                    <DropdownMenuItem onClick={() => handleEditRole(role)} className="rounded-lg">
                      <Edit className="w-4 h-4 mr-2" />
                      Editar Função
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <DropdownMenuItem 
                      onClick={() => handleDeleteRole(role)} 
                      className="rounded-lg text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir Função
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="rounded-full text-xs">
                {role.permissionsCount} módulos
              </Badge>
              <Badge className={`text-xs rounded-full ${
                (role.is_active ?? true) ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'
              }`}>
                {(role.is_active ?? true) ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>

            {role.type === 'system' ? (
              <div className="space-y-2">
                {adminPermissions
                  .filter(p => p.role_default_id === role.id)
                  .slice(0, 3)
                  .map((permission, index) => {
                    const display = getPermissionDisplay(permission.permission_level);
                    return (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{getModuleDisplay(permission.module)}</span>
                        <Badge className={`text-xs ${display.color} rounded-full`}>
                          {display.text}
                        </Badge>
                      </div>
                    );
                  })}
                {adminPermissions.filter(p => p.role_default_id === role.id).length > 3 && (
                  <p className="text-xs text-gray-500 italic">
                    +{adminPermissions.filter(p => p.role_default_id === role.id).length - 3} módulos adicionais
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(role.permissions || {})
                  .filter(([_, level]) => level !== 'none')
                  .slice(0, 3)
                  .map(([module, level], index) => {
                    const display = getPermissionDisplay(level);
                    return (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{getModuleDisplay(module)}</span>
                        <Badge className={`text-xs ${display.color} rounded-full`}>
                          {display.text}
                        </Badge>
                      </div>
                    );
                  })}
                {Object.entries(role.permissions || {}).filter(([_, level]) => level !== 'none').length > 3 && (
                  <p className="text-xs text-gray-500 italic">
                    +{Object.entries(role.permissions || {}).filter(([_, level]) => level !== 'none').length - 3} módulos adicionais
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderRoleListItem = (role) => {
    const canEdit = role.type === 'custom';
    const canDelete = role.type === 'custom';

    return (
      <Card key={role.id} className="rounded-3xl border-gray-200 hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                role.type === 'system' ? 'bg-red-100' : 'bg-blue-100'
              }`}>
                <Shield className={`w-5 h-5 ${
                  role.type === 'system' ? 'text-red-600' : 'text-blue-600'
                }`} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="font-semibold text-gray-900">{role.name}</h3>
                  {role.type === 'system' && (
                    <Badge className="bg-red-100 text-red-800 text-xs rounded-full">
                      Sistema
                    </Badge>
                  )}
                  <Badge className={`text-xs rounded-full ${
                    (role.is_active ?? true) ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {(role.is_active ?? true) ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">
                  {role.description || 'Sem descrição'} • {role.permissionsCount} módulos configurados
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {(canEdit || canDelete) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="rounded-xl">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl">
                    {canEdit && (
                      <DropdownMenuItem onClick={() => handleEditRole(role)} className="rounded-lg">
                        <Edit className="w-4 h-4 mr-2" />
                        Editar Função
                      </DropdownMenuItem>
                    )}
                    {canDelete && (
                      <DropdownMenuItem 
                        onClick={() => handleDeleteRole(role)} 
                        className="rounded-lg text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir Função
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
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
                console.error('Logo failed to load on RolePermissions page');
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

  if (error) {
    return (
      <Alert className="rounded-3xl border-red-200 bg-red-50">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          {error}
        </AlertDescription>
      </Alert>
    );
  }

  const systemRolesCount = allRolesData.filter(r => r.type === 'system').length;
  const customRolesCount = allRolesData.filter(r => r.type === 'custom').length;

  return (
    <div className="space-y-8">
      {/* Notification */}
      {notification.show && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center justify-between ${
          notification.type === 'success' ? 'bg-green-500' : 
          notification.type === 'error' ? 'bg-red-500' : 'bg-yellow-500'
        } text-white`}>
          <span>{notification.message}</span>
          <button onClick={() => setNotification(prev => ({...prev, show: false}))} className="ml-4 p-1 rounded-full hover:bg-white hover:bg-opacity-20">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Funções e Permissões</h1>
            <p className="text-sm sm:text-base text-gray-600 hidden sm:block">
              Gerencie funções e suas permissões no sistema
            </p>
          </div>
        </div>
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
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 hover:bg-blue-700 rounded-xl flex-1"
          >
            <Plus className="w-4 h-4 mr-2" />
            Criar Função
          </Button>
        </div>

        {/* Mobile: Barra de pesquisa */}
        <div className="relative w-full sm:hidden">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar funções..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>

        {/* Desktop: Tudo na mesma linha */}
        <div className="hidden sm:flex gap-2 items-center">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar funções..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>

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
            className="rounded-xl"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          <Button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 hover:bg-blue-700 rounded-xl"
          >
            <Plus className="w-4 h-4 mr-2" />
            Criar Função
          </Button>
        </div>
      </div>

      {/* Tabs and Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="rounded-2xl bg-gray-100 p-1">
          <TabsTrigger value="all" className="rounded-xl">
            Todas ({allRolesData.length})
          </TabsTrigger>
          <TabsTrigger value="system" className="rounded-xl">
            Sistema ({systemRolesCount})
          </TabsTrigger>
          <TabsTrigger value="custom" className="rounded-xl">
            Personalizadas ({customRolesCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {filteredRoles.length === 0 ? (
            <Card className="rounded-3xl border-dashed border-2 border-gray-200">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Shield className="w-16 h-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {searchTerm ? 'Nenhuma função encontrada' : 'Nenhuma função ainda'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm 
                    ? 'Tente ajustar seus termos de busca'
                    : 'Comece criando uma função personalizada para sua equipe'
                  }
                </p>
                {!searchTerm && (
                  <Button
                    onClick={() => setShowCreateForm(true)}
                    className="bg-blue-600 hover:bg-blue-700 rounded-xl"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Primeira Função
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRoles.map(renderRoleCard)}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRoles.map(renderRoleListItem)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="system" className="mt-6">
          {filteredRoles.filter(r => r.type === 'system').length === 0 ? (
            <Card className="rounded-3xl border-dashed border-2 border-gray-200">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Shield className="w-16 h-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nenhuma função de sistema encontrada
                </h3>
                <p className="text-gray-600">
                  {searchTerm && 'Tente ajustar seus termos de busca'}
                </p>
              </CardContent>
            </Card>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRoles.filter(r => r.type === 'system').map(renderRoleCard)}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRoles.filter(r => r.type === 'system').map(renderRoleListItem)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="custom" className="mt-6">
          {filteredRoles.filter(r => r.type === 'custom').length === 0 ? (
            <Card className="rounded-3xl border-dashed border-2 border-gray-200">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Shield className="w-16 h-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {searchTerm ? 'Nenhuma função personalizada encontrada' : 'Nenhuma função personalizada ainda'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm 
                    ? 'Tente ajustar seus termos de busca'
                    : 'Comece criando uma função personalizada para sua equipe'
                  }
                </p>
                {!searchTerm && (
                  <Button
                    onClick={() => setShowCreateForm(true)}
                    className="bg-blue-600 hover:bg-blue-700 rounded-xl"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Primeira Função
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRoles.filter(r => r.type === 'custom').map(renderRoleCard)}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRoles.filter(r => r.type === 'custom').map(renderRoleListItem)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Role Modal */}
      {showCreateForm && (
        <CreateRoleForm
          existingRole={editingRole}
          onSubmit={editingRole ? handleUpdateRole : handleCreateRole}
          onCancel={() => {
            setShowCreateForm(false);
            setEditingRole(null);
          }}
        />
      )}
    </div>
  );
}