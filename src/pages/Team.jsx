import React, { useState, useEffect, useCallback } from "react";
import { User } from "@/entities/User";
import { Role } from "@/entities/Role";
import { Company } from "@/entities/Company";
import { Invitation } from "@/entities/Invitation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Users,
  Shield,
  UserPlus,
  Edit,
  MoreVertical,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Send,
  UsersRound,
  LayoutGrid,
  List,
  RefreshCw,
  Mail,
  Phone,
  X,
  Copy,
  CheckCircle,
  Trash2,
  UserMinus,
  Loader2
} from "lucide-react";

import InviteUserForm from "../components/team/InviteUserForm";
import EditUserForm from "../components/team/EditUserForm";
import { inviteTeamMember } from "@/functions/inviteTeamMember";
import { getTeamMembers } from "@/functions/getTeamMembers";
import { updateTeamMember } from "@/functions/updateTeamMember";
import { base44 } from "@/api/base44Client";

export default function Team() {
  const [currentUser, setCurrentUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [error, setError] = useState("");
  const [hasTeamPermission, setHasTeamPermission] = useState(false);

  // View mode state
  const [viewMode, setViewMode] = useState(() => {
    const saved = localStorage.getItem('team_viewMode');
    return saved || "grid";
  });

  // Notification state
  const [notification, setNotification] = useState({
    show: false,
    type: 'success',
    message: ''
  });

  const checkTeamPermissions = (user, userRole) => {
    // Qualquer usuário autenticado pode acessar a página de equipe
    return true;
  };

  const saveViewPreferences = (preferences) => {
    if (preferences.viewMode !== undefined) {
      localStorage.setItem('team_viewMode', preferences.viewMode);
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

  const loadTeamData = useCallback(async () => {
    try {
      setError("");
      setIsLoading(true);

      const user = await User.me();
      setCurrentUser(user);

      if (user.company_id) {
        const companies = await Company.list();
        const userCompany = companies.find(c => c.id === user.company_id);
        setCompany(userCompany);

        const roleList = await Role.filter({ company_id: user.company_id }, 'name');
        setRoles(roleList);

        const userRole = roleList.find(r => r.id === user.role_id);
        const hasPermission = checkTeamPermissions(user, userRole);
        setHasTeamPermission(hasPermission);

        if (!hasPermission) {
          setError("Você não tem permissão para acessar o gerenciamento de equipe.");
          setIsLoading(false);
          return;
        }

        const [usersResponse, invites] = await Promise.all([
          getTeamMembers(),
          Invitation.filter({ company_id: user.company_id, status: 'pending' })
        ]);
        
        if (usersResponse.data?.success) {
            setTeamMembers(usersResponse.data.team_members);
        } else {
            throw new Error(usersResponse.data?.error || "Falha ao buscar membros da equipe.");
        }
        
        setPendingInvites(invites);
      }
    } catch (error) {
      console.error("Error loading team data:", error);
      setError("Falha ao carregar dados da equipe.");
      showNotification('error', `Falha ao carregar dados da equipe: ${error.message || ''}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkForInviteAction = useCallback(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'invite') {
      setShowInviteForm(true);
    }
  }, []);

  useEffect(() => {
    loadTeamData();
    checkForInviteAction();
  }, [loadTeamData, checkForInviteAction]);

  const [showInviteSuccess, setShowInviteSuccess] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmDialogData, setConfirmDialogData] = useState(null);
  const [pendingFormData, setPendingFormData] = useState(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [userToRemove, setUserToRemove] = useState(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const handleInviteSubmit = async (formData, forceInvite = false) => {
    try {
      setError('');
      
      const invitationData = {
        email: formData.email,
        full_name: formData.full_name,
        role_id: formData.role_id,
        company_id: currentUser.company_id,
        company_name: company.name,
        system_role: null,
        invited_by_name: currentUser.full_name,
        force_invite: forceInvite
      };

      const response = await inviteTeamMember(invitationData);

      if (response.data?.success && response.data?.requires_confirmation && !forceInvite) {
        // Usuário existe, mostrar modal de confirmação
        setConfirmDialogData({
          message: response.data.message,
          currentCompanyName: response.data.current_company_name
        });
        setPendingFormData(formData);
        setShowConfirmDialog(true);
      } else if (response.data?.success) {
        setInviteUrl(response.data.invite_url || '');
        setShowInviteSuccess(true);
        setShowInviteForm(false);
        await loadTeamData();
      } else {
        const errorMessage = response.data?.error || response.data?.message || 'Falha ao enviar convite';
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error("Error inviting user:", error);
      const errorMessage = error.response?.data?.error || error.message || "Falha ao convidar usuário.";
      
      // Se for limite de taxa, não mostrar banner de erro, apenas alert
      if (error.response?.status === 429) {
        alert(errorMessage);
      } else {
        showNotification('error', errorMessage);
      }
    }
  };

  const handleConfirmInvite = async () => {
    setShowConfirmDialog(false);
    if (pendingFormData) {
      await handleInviteSubmit(pendingFormData, true);
      setPendingFormData(null);
      setConfirmDialogData(null);
    }
  };

  const handleCancelConfirm = () => {
    setShowConfirmDialog(false);
    setPendingFormData(null);
    setConfirmDialogData(null);
  };

  const handleUpdateUser = async (userData) => { 
    if (!editingUser) return;

    try {
      const response = await updateTeamMember({
        userIdToUpdate: editingUser.id,
        data: userData,
      });

      if (response.data?.success) {
        setShowEditForm(false);
        setEditingUser(null);
        showNotification('success', 'Usuário atualizado com sucesso!');
        await loadTeamData();
      } else {
        throw new Error(response.data?.error || 'Falha ao atualizar usuário via função de backend.');
      }
    } catch (error) {
      console.error("Error updating user:", error);
      const errorMessage = error.response?.data?.error || error.message || "Falha ao atualizar usuário.";
      showNotification('error', `Erro ao atualizar usuário: ${errorMessage}`);
    }
  };

  const handleRemoveUser = async () => {
    if (!userToRemove) return;
    
    setIsRemoving(true);
    try {
      const response = await base44.functions.invoke('removeUserFromTeam', {
        user_id_to_remove: userToRemove.id
      });

      if (response.data?.success) {
        showNotification('success', 
          response.data.restored_to_previous 
            ? 'Usuário removido e restaurado para empresa anterior.' 
            : 'Usuário removido da equipe.'
        );
        setShowRemoveConfirm(false);
        setUserToRemove(null);
        await loadTeamData();
      } else {
        throw new Error(response.data?.error || 'Falha ao remover usuário.');
      }
    } catch (error) {
      console.error("Error removing user:", error);
      showNotification('error', `Erro ao remover usuário: ${error.message || ''}`);
    } finally {
      setIsRemoving(false);
    }
  };

  const openRemoveConfirm = (user) => {
    setUserToRemove(user);
    setShowRemoveConfirm(true);
  };

  const openEditUser = (user) => {
    // Apenas o próprio administrador pode editar suas informações.
    if (user.system_role === 'admin' && currentUser.id !== user.id) {
      showNotification('error', 'Apenas o próprio administrador pode editar suas informações.');
      return;
    }
    
    setEditingUser(user);
    setShowEditForm(true);
  };

  const getUserRoleDisplay = (user) => {
    if (!user) return '';

    if (user.system_role === 'admin') {
      return 'Administrador';
    }

    const assignedRole = roles.find(r => r.id === user.role_id);
    return assignedRole?.name || 'Usuário';
  };

  const getRoleColor = (user) => {
    if (user.system_role === 'admin') {
      return 'bg-purple-100 text-purple-800 border-purple-200';
    }
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return 'Sem número';
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 13 && cleanPhone.startsWith('55')) {
      return `+${cleanPhone.slice(0, 2)} (${cleanPhone.slice(2, 4)}) ${cleanPhone.slice(4, 9)}-${cleanPhone.slice(9)}`;
    }
    if (cleanPhone.length === 11) {
      return `+55 (${cleanPhone.slice(0, 2)}) ${cleanPhone.slice(2, 7)}-${cleanPhone.slice(7)}`;
    }
    return `+${cleanPhone}`;
  };

  // Combinar membros da equipe e convites pendentes
  const allTeamData = [
    ...teamMembers.map(member => ({ ...member, type: 'member', status: 'active' })),
    ...pendingInvites.map(invite => ({ ...invite, type: 'invite', status: 'pending' }))
  ];

  const filteredTeamData = allTeamData
    .filter(item => {
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const name = item.full_name?.toLowerCase() || '';
        const email = item.email?.toLowerCase() || '';
        const department = item.department?.toLowerCase() || '';
        return name.includes(searchLower) || email.includes(searchLower) || department.includes(searchLower);
      }

      switch (activeTab) {
        case 'all': return true;
        case 'active': return item.type === 'member'; 
        case 'pending': return item.type === 'invite';
        default: return true;
      }
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_date || 0);
      const dateB = new Date(b.created_date || 0);
      return dateB.getTime() - dateA.getTime();
    });

  // Renderizar membro da equipe em formato card
  const renderMemberCard = (item) => {
    const isCurrentUser = item.id === currentUser?.id;
    const canEdit = item.type === 'member' && (isCurrentUser || item.system_role !== 'admin' && item.system_role !== 'owner');
    const canRemove = item.type === 'member' && item.system_role !== 'owner' && (
      currentUser?.role === 'admin' || 
      currentUser?.system_role === 'admin' || 
      isCurrentUser
    );

    return (
      <Card key={item.id || item.email} className="rounded-3xl border-gray-200 hover:shadow-md transition-shadow group">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12">
                {item.type === 'member' ? (
                  <>
                    <AvatarImage src={item.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-500 text-white font-medium">
                      {item.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                    </AvatarFallback>
                  </>
                ) : (
                  <AvatarFallback className="bg-yellow-100 text-yellow-600 font-medium">
                    <Send className="w-5 h-5" />
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <h3 className="font-semibold text-gray-900">
                  {item.full_name || 'Convidado'}
                  {isCurrentUser && <span className="text-sm text-gray-500 ml-2">(Você)</span>}
                </h3>
                <p className="text-sm text-gray-500">{item.email}</p>
              </div>
            </div>
            
            {item.type === 'member' && (canEdit || canRemove) && (
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
                    <DropdownMenuItem onClick={() => openEditUser(item)} className="rounded-lg">
                      <Edit className="w-4 h-4 mr-2" />
                      Editar Usuário
                    </DropdownMenuItem>
                  )}
                  {canRemove && (
                    <DropdownMenuItem 
                      onClick={() => openRemoveConfirm(item)} 
                      className="rounded-lg text-red-600 focus:text-red-600 focus:bg-red-50"
                    >
                      <UserMinus className="w-4 h-4 mr-2" />
                      Remover da Equipe
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={`text-xs rounded-full px-3 py-1 border ${getRoleColor(item)}`}>
                <Shield className="w-3 h-3 mr-1" />
                {getUserRoleDisplay(item)}
              </Badge>
              <Badge className={`text-xs rounded-full ${
                item.type === 'member' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-yellow-100 text-yellow-800 border-yellow-200'
              }`}>
                {item.type === 'member' ? 'Ativo' : 'Pendente'}
              </Badge>
            </div>

            {item.department && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="w-4 h-4 text-blue-500" />
                <span>{item.department}</span>
              </div>
            )}

            {item.phone && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="w-4 h-4 text-blue-500" />
                <span>{formatPhoneNumber(item.phone)}</span>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4 text-blue-500" />
              <span>
                {item.type === 'member' ? 'Membro desde' : 'Convidado em'} {format(new Date(item.created_date), 'dd/MM/yyyy', { locale: ptBR })}
              </span>
            </div>

            {item.type === 'invite' && (
              <div className="mt-3 p-2 rounded-lg bg-yellow-50 border border-yellow-200">
                <div className="flex items-center gap-2 text-sm text-yellow-700">
                  <Clock className="w-4 h-4" />
                  <span>
                    Expira em: {format(new Date(item.expires_at), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderMemberListItem = (item) => {
    const isCurrentUser = item.id === currentUser?.id;
    const canEdit = item.type === 'member' && (isCurrentUser || item.system_role !== 'admin' && item.system_role !== 'owner');
    const canRemove = item.type === 'member' && item.system_role !== 'owner' && (
      currentUser?.role === 'admin' || 
      currentUser?.system_role === 'admin' || 
      isCurrentUser
    );

    return (
      <Card key={item.id || item.email} className="rounded-3xl border-gray-200 hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <Avatar className="w-12 h-12">
                {item.type === 'member' ? (
                  <>
                    <AvatarImage src={item.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-500 text-white font-medium">
                      {item.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                    </AvatarFallback>
                  </>
                ) : (
                  <AvatarFallback className="bg-yellow-100 text-yellow-600 font-medium">
                    <Send className="w-5 h-5" />
                  </AvatarFallback>
                )}
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {item.full_name || 'Convidado'}
                    {isCurrentUser && <span className="text-sm text-gray-500 ml-2">(Você)</span>}
                  </h3>
                  <Badge className={`text-xs rounded-full ${getRoleColor(item)}`}>
                    <Shield className="w-3 h-3 mr-1" />
                    {getUserRoleDisplay(item)}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-blue-500" />
                    {item.email}
                  </span>
                  {item.department && (
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-blue-500" />
                      {item.department}
                    </span>
                  )}
                  <Badge className={`text-xs ${
                    item.type === 'member' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {item.type === 'member' ? 'Ativo' : 'Pendente'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {item.type === 'member' && (canEdit || canRemove) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="rounded-xl">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl">
                    {canEdit && (
                      <DropdownMenuItem onClick={() => openEditUser(item)} className="rounded-lg">
                        <Edit className="w-4 h-4 mr-2" />
                        Editar Usuário
                      </DropdownMenuItem>
                    )}
                    {canRemove && (
                      <DropdownMenuItem 
                        onClick={() => openRemoveConfirm(item)} 
                        className="rounded-lg text-red-600 focus:text-red-600 focus:bg-red-50"
                      >
                        <UserMinus className="w-4 h-4 mr-2" />
                        Remover da Equipe
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
                console.error('Logo failed to load on Team page');
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

  const rolesForInvitation = roles.filter(role => !role.is_system_role);

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
            <UsersRound className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Equipe</h1>
            <p className="text-sm sm:text-base text-gray-600 hidden sm:block">
              Gerencie membros da equipe e suas funções
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
            onClick={() => loadTeamData()}
            disabled={isLoading}
            className="rounded-xl h-10 w-10 p-0"
            size="icon"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>

          <Button
            onClick={() => setShowInviteForm(true)}
            className="bg-blue-600 hover:bg-blue-700 rounded-xl flex-1"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Enviar Convite
          </Button>
        </div>

        {/* Mobile: Barra de pesquisa */}
        <div className="relative w-full sm:hidden">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar membros..."
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
              placeholder="Buscar membros..."
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
            onClick={() => loadTeamData()}
            disabled={isLoading}
            className="rounded-xl"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          <Button
            onClick={() => setShowInviteForm(true)}
            className="bg-blue-600 hover:bg-blue-700 rounded-xl"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Enviar Convite
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="rounded-2xl bg-gray-100 p-1">
          <TabsTrigger value="all" className="rounded-xl">
            Todos ({allTeamData.length})
          </TabsTrigger>
          <TabsTrigger value="active" className="rounded-xl">
            Ativos ({teamMembers.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="rounded-xl">
            Pendentes ({pendingInvites.length})
          </TabsTrigger>
        </TabsList>

        {/* Team List */}
        <TabsContent value={activeTab} className="mt-6">
          {filteredTeamData.length === 0 ? (
            <Card className="rounded-3xl border-dashed border-2 border-gray-200">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <UsersRound className="w-16 h-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {activeTab === 'all' ? 'Nenhum membro encontrado' :
                   activeTab === 'active' ? 'Nenhum membro ativo' :
                   activeTab === 'pending' ? 'Nenhum convite pendente' : ''}
                </h3>
                <p className="text-gray-600 mb-6">
                  {activeTab === 'all' ? 'Convide membros da equipe para expandir sua empresa' :
                   'Nenhum membro nesta categoria no momento'}
                </p>
                {activeTab === 'all' && (
                  <Button
                    onClick={() => setShowInviteForm(true)}
                    className="bg-blue-600 hover:bg-blue-700 rounded-xl"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Convidar Primeiro Membro
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTeamData.map(renderMemberCard)}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTeamData.map(renderMemberListItem)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {showInviteForm && (
        <InviteUserForm
          roles={rolesForInvitation}
          onSubmit={handleInviteSubmit}
          onCancel={() => setShowInviteForm(false)}
        />
      )}

      {showEditForm && editingUser && (
        <EditUserForm
          user={editingUser}
          roles={roles}
          onSubmit={handleUpdateUser}
          onCancel={() => {
            setShowEditForm(false);
            setEditingUser(null);
          }}
        />
      )}

      {/* Confirm Dialog - Usuário já existe */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="rounded-3xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              Usuário já Cadastrado
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-700">
              {confirmDialogData?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={handleCancelConfirm}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmInvite}
              className="rounded-xl bg-blue-600 hover:bg-blue-700"
            >
              Sim, Enviar Convite
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Success Modal with Invite Link */}
      {showInviteSuccess && (
        <Dialog open={showInviteSuccess} onOpenChange={setShowInviteSuccess}>
          <DialogContent className="max-w-md w-[95vw] p-0 overflow-hidden flex flex-col rounded-[2.5rem] [&>button]:hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-green-700 rounded-2xl flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Convite Enviado!</h2>
                    <p className="text-sm text-gray-600">Link de convite gerado</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowInviteSuccess(false)}
                  className="h-8 w-8 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                <p className="text-sm text-gray-700">
                  O convite foi enviado por e-mail e uma notificação foi criada no painel do usuário.
                </p>
              </div>

              {inviteUrl && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Link do Convite</Label>
                  <div className="flex gap-2">
                    <Input
                      value={inviteUrl}
                      readOnly
                      className="rounded-xl bg-gray-50"
                    />
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(inviteUrl);
                        showNotification('success', 'Link copiado!');
                      }}
                      className="rounded-xl bg-blue-600 hover:bg-blue-700"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copiar
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Compartilhe este link diretamente com o novo membro da equipe.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end p-6 bg-gray-50 border-t border-gray-200">
              <Button
                onClick={() => setShowInviteSuccess(false)}
                className="rounded-xl bg-blue-600 hover:bg-blue-700"
              >
                Entendi
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Confirm Dialog - Usuário já existe */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="rounded-3xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              Usuário já Cadastrado
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-700">
              {confirmDialogData?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={handleCancelConfirm}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmInvite}
              className="rounded-xl bg-blue-600 hover:bg-blue-700"
            >
              Sim, Enviar Convite
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Success Modal with Invite Link */}
      {showInviteSuccess && (
        <Dialog open={showInviteSuccess} onOpenChange={setShowInviteSuccess}>
          <DialogContent className="max-w-md w-[95vw] p-0 overflow-hidden flex flex-col rounded-[2.5rem] [&>button]:hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-green-700 rounded-2xl flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Convite Enviado!</h2>
                    <p className="text-sm text-gray-600">Link de convite gerado</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowInviteSuccess(false)}
                  className="h-8 w-8 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                <p className="text-sm text-gray-700">
                  O convite foi enviado por e-mail e uma notificação foi criada no painel do usuário.
                </p>
              </div>

              {inviteUrl && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Link do Convite</Label>
                  <div className="flex gap-2">
                    <Input
                      value={inviteUrl}
                      readOnly
                      className="rounded-xl bg-gray-50"
                    />
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(inviteUrl);
                        showNotification('success', 'Link copiado!');
                      }}
                      className="rounded-xl bg-blue-600 hover:bg-blue-700"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copiar
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Compartilhe este link diretamente com o novo membro da equipe.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end p-6 bg-gray-50 border-t border-gray-200">
              <Button
                onClick={() => setShowInviteSuccess(false)}
                className="rounded-xl bg-blue-600 hover:bg-blue-700"
              >
                Entendi
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Remove User Confirmation Dialog */}
      <AlertDialog open={showRemoveConfirm} onOpenChange={setShowRemoveConfirm}>
        <AlertDialogContent className="rounded-3xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <UserMinus className="w-5 h-5 text-red-600" />
              Remover Usuário da Equipe
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-700 space-y-2">
              <p>
                Tem certeza que deseja remover <strong>{userToRemove?.full_name}</strong> da equipe?
              </p>
              {userToRemove?.previous_company_id && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mt-2">
                  <p className="text-sm text-blue-800">
                    ℹ️ Este usuário será restaurado para sua empresa anterior.
                  </p>
                </div>
              )}
              {!userToRemove?.previous_company_id && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-2">
                  <p className="text-sm text-amber-800">
                    ⚠️ O usuário perderá acesso à empresa e precisará criar uma nova ou aceitar outro convite.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRemoveConfirm(false);
                setUserToRemove(null);
              }}
              disabled={isRemoving}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRemoveUser}
              disabled={isRemoving}
              className="rounded-xl bg-red-600 hover:bg-red-700"
            >
              {isRemoving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Removendo...
                </>
              ) : (
                <>
                  <UserMinus className="w-4 h-4 mr-2" />
                  Sim, Remover
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}