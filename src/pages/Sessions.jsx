import React, { useState, useEffect, useCallback } from "react";
import { User } from "@/entities/User";
import { Session } from "@/entities/Session";
import { Message } from "@/entities/Message";
import { Plan } from "@/entities/Plan";
import { Company } from "@/entities/Company";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Smartphone,
  Search,
  Plus,
  Power,
  RefreshCw,
  Trash2,
  MoreVertical,
  LogOut,
  Grid,
  List,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Star,
  Phone,
  Calendar,
  ArrowUpCircle,
  ArrowDownCircle,
  Edit2,
  Check,
  X as XIcon,
  Shield,
  Building2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { base44 } from "@/api/base44Client";
import { useWebSocket } from "@/components/hooks/useWebSocket";
import ConnectSessionModal from "@/components/sessions/ConnectSessionModal";
import TransferSessionModal from "@/components/sessions/TransferSessionModal";
import { getSubscriptionStatus } from "@/functions/getSubscriptionStatus";

export default function Sessions() {
  const [user, setUser] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [sessionStats, setSessionStats] = useState({});
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingAction, setProcessingAction] = useState("");
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("active");
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('sessionsViewMode') || 'grid';
  });
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [sessionLimit, setSessionLimit] = useState(null);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editingCustomName, setEditingCustomName] = useState("");
  const [companyFilter, setCompanyFilter] = useState("my");
  const [transferSession, setTransferSession] = useState(null); // Estado para o modal de transferência
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: "",
    description: "",
    onConfirm: null,
    variant: "default"
  });

  useEffect(() => {
    localStorage.setItem('sessionsViewMode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    loadUserAndSessions();
  }, []);

  useEffect(() => {
    if (user) {
      loadSessions();
    }
  }, [companyFilter]);

  const handleWebSocketMessage = useCallback((data) => {
    if (data.type === 'session_updated' || data.type === 'session.status') {
      loadSessions();
    }
  }, []);

  useWebSocket(
    user?.company_id,
    handleWebSocketMessage,
    ['session_updated', 'session.status']
  );

  const loadUserAndSessions = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);
      await loadSessionLimit(currentUser);
      await loadSessions(currentUser);
    } catch (error) {
      console.error("Error loading data:", error);
      setMessage("Erro ao carregar dados");
    } finally {
      setIsLoading(false);
    }
  };

  const loadSessionLimit = async (currentUser) => {
    try {
      const { data } = await getSubscriptionStatus();
      if (data?.success && data.has_active_subscription) {
        const planId = data.subscription.metadata?.plan_id;
        if (planId) {
          try {
            const currentPlan = await Plan.get(planId);
            setSessionLimit(currentPlan.active_sessions);
          } catch (planError) {
            console.warn('Plano não encontrado:', planId);
            setSessionLimit(null);
          }
        }
      }
    } catch (error) {
      console.error("Erro ao carregar limite de sessões:", error);
      setSessionLimit(null);
    }
  };

  const loadSessions = async (currentUser = null) => {
    try {
      const userToUse = currentUser || user;
      
      if (!userToUse || !userToUse.role) {
        console.warn('[Sessions] User ou role não definido, abortando loadSessions');
        return;
      }
      
      let allSessions;
      
      // Se é admin e escolheu "Todas as Sessões", buscar de todas as empresas
      if (userToUse.role === 'admin' && companyFilter === 'all') {
        allSessions = await Session.filter({
          is_deleted: { '$ne': true }
        });
      } else {
        // Caso contrário, filtrar apenas sessões da company do usuário
        allSessions = await Session.filter({
          company_id: userToUse.company_id,
          is_deleted: { '$ne': true }
        });
      }
      
      // Filtrar sessões por permissão de acesso do usuário
      if (userToUse.system_role !== 'admin') {
        const filterResponse = await base44.functions.invoke('filterSessionsByUserAccess', {
          sessions: allSessions
        });
        
        if (filterResponse.data?.success) {
          allSessions = filterResponse.data.sessions;
        }
      }
      
      setSessions(allSessions);
      
      // Carregar estatísticas de mensagens para cada sessão
      if (userToUse?.company_id) {
        await loadSessionStats(allSessions, userToUse);
        
        // Buscar fotos para sessões ativas sem avatar_url
        await fetchMissingAvatars(allSessions);
      }
    } catch (error) {
      console.error("Error loading sessions:", error);
    }
  };

  // Função para buscar fotos faltantes de sessões ativas
  const fetchMissingAvatars = async (sessionsList) => {
    const sessionsWithoutAvatar = sessionsList.filter(
      s => s.status === 'WORKING' && !s.avatar_url
    );

    if (sessionsWithoutAvatar.length === 0) return;

    console.log(`📸 Buscando fotos para ${sessionsWithoutAvatar.length} sessão(ões) sem avatar...`);

    for (const session of sessionsWithoutAvatar) {
      try {
        const response = await base44.functions.invoke('getWaProfile', {
          sessionName: session.session_name
        });

        if (response.data?.success && response.data.profile?.picture) {
          await Session.update(session.id, {
            avatar_url: response.data.profile.picture
          });
          console.log(`✅ Foto obtida para sessão ${session.custom_name || session.session_name}`);
          
          // Atualizar estado local
          setSessions(prev => prev.map(s => 
            s.id === session.id 
              ? { ...s, avatar_url: response.data.profile.picture }
              : s
          ));
        }
      } catch (error) {
        console.warn(`⚠️ Erro ao buscar foto da sessão ${session.session_name}:`, error.message);
      }
    }
  };

  const loadSessionStats = async (sessionsList, userToUse = null) => {
    const currentUser = userToUse || user;
    if (!currentUser?.company_id) {
        console.warn("User company_id not available for loading session stats.");
        setSessionStats({});
        return;
    }

    setIsLoadingStats(true);
    const stats = {};

    try {
      console.log('\n📊 ===== CARREGANDO ESTATÍSTICAS DAS SESSÕES =====');
      console.log(`Company ID: ${currentUser.company_id}`);
      
      // Buscar TODAS as mensagens da empresa (sem filtro de status)
      const allMessages = await Message.filter({
        company_id: currentUser.company_id
      });

      console.log(`✓ ${allMessages.length} mensagens totais carregadas`);

      // Processar cada sessão
      for (const session of sessionsList) {
        if (!session.phone) {
          console.log(`⚠️ Sessão ${session.session_name} SEM telefone - stats zerados`);
          stats[session.id] = { sent: 0, received: 0 };
          continue;
        }

        // Filtrar mensagens ENVIADAS (direction: sent) por session_number
        const sentMessages = allMessages.filter(msg => 
          msg.direction === 'sent' &&
          msg.session_number === session.phone
        );

        // Filtrar mensagens RECEBIDAS (direction: received) por session_number
        const receivedMessages = allMessages.filter(msg => 
          msg.direction === 'received' &&
          msg.session_number === session.phone
        );

        stats[session.id] = {
          sent: sentMessages.length,
          received: receivedMessages.length
        };

        console.log(`📱 Sessão: ${session.custom_name || session.session_name}`);
        console.log(`   Número: ${session.phone}`);
        console.log(`   → Enviadas: ${sentMessages.length}`);
        console.log(`   → Recebidas: ${receivedMessages.length}`);
      }

      console.log('===== ESTATÍSTICAS CARREGADAS =====\n');

    } catch (error) {
      console.error('❌ Erro ao carregar estatísticas:', error);
      sessionsList.forEach(session => {
        stats[session.id] = { sent: 0, received: 0 };
      });
    } finally {
      setSessionStats(stats);
      setIsLoadingStats(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setMessage("");
    try {
      await loadSessions();
      setMessage("✓ Sessões atualizadas com sucesso");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Error syncing sessions:", error);
      setMessage("Erro ao atualizar sessões");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleStartSession = (session) => {
    setConfirmDialog({
      open: true,
      title: "Iniciar Sessão",
      description: `Deseja iniciar a sessão "${session.custom_name || session.session_name}"?`,
      variant: "default",
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, open: false });
        setIsProcessing(true);
        setProcessingAction("Iniciando sessão...");
        try {
          await base44.functions.invoke('startSession', { 
            sessionName: session.session_name 
          });
          setMessage("Sessão iniciada com sucesso!");
          setTimeout(() => setMessage(""), 3000);
          await loadSessions();
        } catch (error) {
          console.error("Error starting session:", error);
          setMessage("Erro ao iniciar sessão");
        } finally {
          setIsProcessing(false);
          setProcessingAction("");
        }
      }
    });
  };

  const handleStopSession = (session) => {
    setConfirmDialog({
      open: true,
      title: "Pausar Sessão",
      description: `Deseja pausar a sessão "${session.custom_name || session.session_name}"?`,
      variant: "default",
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, open: false });
        setIsProcessing(true);
        setProcessingAction("Pausando sessão...");
        try {
          await base44.functions.invoke('stopSession', { 
            sessionName: session.session_name 
          });
          setMessage("Sessão pausada com sucesso!");
          setTimeout(() => setMessage(""), 3000);
          await loadSessions();
        } catch (error) {
          console.error("Error stopping session:", error);
          setMessage("Erro ao pausar sessão");
        } finally {
          setIsProcessing(false);
          setProcessingAction("");
        }
      }
    });
  };

  const handleRestartSession = (session) => {
    setConfirmDialog({
      open: true,
      title: "Reiniciar Sessão",
      description: `Deseja reiniciar a sessão "${session.custom_name || session.session_name}"?`,
      variant: "default",
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, open: false });
        setIsProcessing(true);
        setProcessingAction("Reiniciando sessão...");
        try {
          await base44.functions.invoke('restartSession', { 
            sessionName: session.session_name 
          });
          setMessage("Sessão reiniciada com sucesso!");
          setTimeout(() => setMessage(""), 3000);
          await loadSessions();
        } catch (error) {
          console.error("Error restarting session:", error);
          setMessage("Erro ao reiniciar sessão");
        } finally {
          setIsProcessing(false);
          setProcessingAction("");
        }
      }
    });
  };

  const handleLogoutSession = (session) => {
    setConfirmDialog({
      open: true,
      title: "Desconectar Sessão",
      description: `Tem certeza que deseja DESCONECTAR a sessão "${session.custom_name || session.session_name}"?\n\nVocê precisará escanear o QR Code novamente para reconectar.`,
      variant: "destructive",
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, open: false });
        setIsProcessing(true);
        setProcessingAction("Desconectando sessão...");
        try {
          await base44.functions.invoke('logoutSession', { 
            session_name: session.session_name 
          });
          setMessage("Sessão desconectada com sucesso!");
          setTimeout(() => setMessage(""), 3000);
          await loadSessions();
        } catch (error) {
          console.error("Error logging out session:", error);
          setMessage("Erro ao desconectar sessão");
        } finally {
          setIsProcessing(false);
          setProcessingAction("");
        }
      }
    });
  };

  const handleDeleteSession = (session) => {
    setConfirmDialog({
      open: true,
      title: "Excluir Sessão Permanentemente",
      description: `ATENÇÃO: Tem certeza que deseja EXCLUIR PERMANENTEMENTE a sessão "${session.custom_name || session.session_name}"?\n\nEsta ação NÃO pode ser desfeita!`,
      variant: "destructive",
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, open: false });
        setIsProcessing(true);
        setProcessingAction("Excluindo sessão...");
        try {
          await base44.functions.invoke('deleteSession', { 
            session_name: session.session_name 
          });
          setMessage("Sessão excluída com sucesso!");
          setTimeout(() => setMessage(""), 3000);
          await loadSessions();
        } catch (error) {
          console.error("Error deleting session:", error);
          setMessage("Erro ao excluir sessão");
        } finally {
          setIsProcessing(false);
          setProcessingAction("");
        }
      }
    });
  };

  const handleToggleDefault = async (session) => {
    try {
      const allSessions = await Session.filter({
        company_id: user.company_id,
        is_deleted: { '$ne': true }
      });

      const newDefaultValue = !session.is_default;

      await Promise.all(
        allSessions.map(s => 
          Session.update(s.id, { 
            is_default: s.id === session.id ? newDefaultValue : false 
          })
        )
      );
      
      setMessage(newDefaultValue ? "Sessão definida como padrão!" : "Sessão padrão removida!");
      setTimeout(() => setMessage(""), 3000);
      await loadSessions();
    } catch (error) {
      console.error("Error toggling default session:", error);
      setMessage("Erro ao alterar sessão padrão");
    }
  };

  const handleStartEditName = (session) => {
    setEditingSessionId(session.id);
    setEditingCustomName(session.custom_name || "");
  };

  const handleSaveCustomName = async (sessionId) => {
    try {
      await Session.update(sessionId, { custom_name: editingCustomName.trim() });
      setEditingSessionId(null);
      setEditingCustomName("");
      await loadSessions();
    } catch (error) {
      console.error("Error updating session name:", error);
      setMessage("Erro ao atualizar nome da sessão");
    }
  };

  const handleCancelEditName = () => {
    setEditingSessionId(null);
    setEditingCustomName("");
  };

  const handleToggleSystemSession = async (session) => {
    try {
      await Session.update(session.id, {
        is_system_session: !session.is_system_session
      });
      
      setMessage(session.is_system_session 
        ? 'Sessão removida do sistema' 
        : 'Sessão definida como sessão do sistema');
      setTimeout(() => setMessage(""), 3000);
      
      await loadSessions();
    } catch (error) {
      console.error("Error toggling system session:", error);
      setMessage("Erro ao atualizar sessão");
    }
  };

  const handleOpenTransferModal = (session) => {
    setTransferSession(session);
  };

  const handleTransferSuccess = async () => {
    setMessage("Sessão transferida com sucesso!");
    setTimeout(() => setMessage(""), 3000);
    await loadSessions();
  };

  const getStatusInfo = (status) => {
    const statusMap = {
      'WORKING': { label: 'Ativa', color: 'bg-green-100 text-green-700 border-green-300', icon: CheckCircle2 },
      'SCAN_QR_CODE': { label: 'Aguardando QR', color: 'bg-yellow-100 text-yellow-700 border-yellow-300', icon: AlertCircle },
      'STARTING': { label: 'Iniciando', color: 'bg-blue-100 text-blue-700 border-blue-300', icon: Loader2 },
      'FAILED': { label: 'Erro', color: 'bg-red-100 text-red-700 border-red-300', icon: XCircle },
      'STOPPED': { label: 'Pausada', color: 'bg-gray-100 text-gray-700 border-gray-300', icon: XCircle },
    };
    return statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-700', icon: AlertCircle };
  };

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = session.session_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         session.custom_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         session.phone?.includes(searchTerm) ||
                         session.push_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === 'all' || 
                      (activeTab === 'active' && session.status === 'WORKING') ||
                      (activeTab === 'inactive' && session.status !== 'WORKING');
    return matchesSearch && matchesTab;
  });

  const activeSessions = sessions.filter(s => s.status === 'WORKING').length;

  const renderSessionCard = (session) => {
    const statusInfo = getStatusInfo(session.status);
    const StatusIcon = statusInfo.icon;
    const isEditing = editingSessionId === session.id;
    const stats = sessionStats[session.id] || { sent: 0, received: 0 };

    return (
      <Card 
        key={session.id} 
        className={`rounded-3xl hover:shadow-md transition-shadow ${
          session.is_system_session 
            ? 'border-2 border-blue-400 bg-gradient-to-br from-blue-50 to-white' 
            : 'border-gray-200'
        }`}
      >
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-2 mb-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Avatar className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0">
                <AvatarImage src={session.avatar_url} />
                <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-500 text-white">
                  <Smartphone className="w-5 h-5 sm:w-6 sm:h-6" />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                {isEditing ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={editingCustomName}
                      onChange={(e) => setEditingCustomName(e.target.value)}
                      placeholder="Nome da sessão"
                      className="h-7 text-sm flex-1"
                      autoFocus
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 flex-shrink-0"
                      onClick={() => handleSaveCustomName(session.id)}
                    >
                      <Check className="w-3.5 h-3.5 text-green-600" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 flex-shrink-0"
                      onClick={handleCancelEditName}
                    >
                      <XIcon className="w-3.5 h-3.5 text-gray-600" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{session.custom_name || session.session_name}</h3>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5 flex-shrink-0"
                      onClick={() => handleStartEditName(session)}
                    >
                      <Edit2 className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                    </Button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleDefault(session);
                      }}
                      className="focus:outline-none flex-shrink-0"
                    >
                      <Star className={`w-4 h-4 cursor-pointer transition-colors ${
                        session.is_default 
                          ? 'text-yellow-500 fill-yellow-500' 
                          : 'text-gray-300 hover:text-yellow-400'
                      }`} />
                    </button>
                  </div>
                )}
                {session.push_name && (
                  <p className="text-xs sm:text-sm text-gray-600 mt-0.5 truncate">
                    {session.push_name}
                  </p>
                )}
                {session.phone && (
                  <p className="text-xs sm:text-sm text-gray-600 flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{session.phone}</span>
                  </p>
                )}
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl">
                {session.status === 'WORKING' ? (
                  <DropdownMenuItem onClick={() => handleStopSession(session)}>
                    <Power className="w-4 h-4 mr-2" />
                    Pausar Sessão
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => handleStartSession(session)}>
                    <Power className="w-4 h-4 mr-2" />
                    Iniciar Sessão
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => handleRestartSession(session)}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reiniciar
                </DropdownMenuItem>
                
                {user?.role === 'admin' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleToggleSystemSession(session)}>
                      <Shield className="w-4 h-4 mr-2" />
                      {session.is_system_session ? 'Remover do Sistema' : 'Definir como Sistema'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleOpenTransferModal(session)}>
                      <ArrowUpCircle className="w-4 h-4 mr-2" />
                      Transferir Sessão
                    </DropdownMenuItem>
                  </>
                )}
                
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleLogoutSession(session)}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Desconectar
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleDeleteSession(session)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm text-gray-600">Status:</span>
              <Badge className={`${statusInfo.color} border rounded-full px-2 sm:px-3 py-0.5 sm:py-1 text-xs`}>
                <StatusIcon className={`w-3 h-3 mr-1 ${session.status === 'STARTING' ? 'animate-spin' : ''}`} />
                {statusInfo.label}
              </Badge>
            </div>

            {session.started_at && (
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-gray-600 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span className="hidden sm:inline">Conectado em:</span>
                  <span className="sm:hidden">Conectado:</span>
                </span>
                <span className="text-gray-900 font-medium">
                  {format(new Date(session.started_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                </span>
              </div>
            )}

            {/* Mensagens do Número */}
            <div className="pt-3 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-600 mb-2">Mensagens do número</p>
              {isLoadingStats ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-1 text-gray-600">
                      <ArrowUpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="text-xs sm:text-sm">Enviadas</span>
                    </div>
                    <span className="text-base sm:text-lg font-bold text-gray-900">
                      {stats.sent}
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-1 text-gray-600">
                      <ArrowDownCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="text-xs sm:text-sm">Recebidas</span>
                    </div>
                    <span className="text-base sm:text-lg font-bold text-gray-900">
                      {stats.received}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderSessionList = (session) => {
    const statusInfo = getStatusInfo(session.status);
    const StatusIcon = statusInfo.icon;
    const isEditing = editingSessionId === session.id;
    const stats = sessionStats[session.id] || { sent: 0, received: 0 };

    return (
      <Card 
        key={session.id} 
        className={`rounded-2xl hover:shadow-md transition-shadow ${
          session.is_system_session 
            ? 'border-2 border-blue-400 bg-gradient-to-r from-blue-50 to-white' 
            : 'border-gray-200'
        }`}
      >
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <Avatar className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0">
              <AvatarImage src={session.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-500 text-white">
                <Smartphone className="w-5 h-5 sm:w-6 sm:h-6" />
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="flex items-center gap-1">
                  <Input
                    value={editingCustomName}
                    onChange={(e) => setEditingCustomName(e.target.value)}
                    placeholder="Nome da sessão"
                    className="h-7 text-sm flex-1"
                    autoFocus
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 flex-shrink-0"
                    onClick={() => handleSaveCustomName(session.id)}
                  >
                    <Check className="w-3.5 h-3.5 text-green-600" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 flex-shrink-0"
                    onClick={handleCancelEditName}
                  >
                    <XIcon className="w-3.5 h-3.5 text-gray-600" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1 mb-0.5 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate text-sm sm:text-base">{session.custom_name || session.session_name}</h3>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5 flex-shrink-0"
                    onClick={() => handleStartEditName(session)}
                  >
                    <Edit2 className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                  </Button>
                  <button
                   onClick={(e) => {
                     e.stopPropagation();
                     handleToggleDefault(session);
                   }}
                   className="focus:outline-none flex-shrink-0"
                  >
                   <Star className={`w-4 h-4 cursor-pointer transition-colors ${
                     session.is_default 
                       ? 'text-yellow-500 fill-yellow-500' 
                       : 'text-gray-300 hover:text-yellow-400'
                   }`} />
                  </button>
                  </div>
                  )}
                  <div className="flex items-center gap-1 flex-wrap">
                  {session.is_default && (
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                   Padrão
                  </Badge>
                  )}
                  {session.is_system_session && (
                  <Badge className="bg-blue-500 text-white border-blue-600 text-xs">
                   Sistema
                  </Badge>
                  )}
                  </div>
                  {session.push_name && (
                  <p className="text-xs sm:text-sm text-gray-600 truncate">
                  {session.push_name}
                  </p>
                  )}
              {session.phone && (
                <p className="text-xs sm:text-sm text-gray-600 flex items-center gap-1">
                  <Phone className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{session.phone}</span>
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <Badge className={`${statusInfo.color} border rounded-full px-2 sm:px-3 py-0.5 sm:py-1 text-xs hidden sm:flex`}>
                <StatusIcon className={`w-3 h-3 mr-1 ${session.status === 'STARTING' ? 'animate-spin' : ''}`} />
                {statusInfo.label}
              </Badge>

              <div className="hidden lg:flex items-center gap-4">
                {isLoadingStats ? (
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                ) : (
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-gray-600">
                      <ArrowUpCircle className="w-3 h-3" />
                      <span className="text-xs">Env:</span>
                      <span className="font-medium text-gray-900">{stats.sent}</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-600">
                      <ArrowDownCircle className="w-3 h-3" />
                      <span className="text-xs">Rec:</span>
                      <span className="font-medium text-gray-900">{stats.received}</span>
                    </div>
                  </div>
                )}

                {session.started_at && (
                  <div className="text-sm text-gray-600 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(session.started_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </div>
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 rounded-xl">
                  {session.status === 'WORKING' ? (
                    <DropdownMenuItem onClick={() => handleStopSession(session)}>
                      <Power className="w-4 h-4 mr-2" />
                      Pausar Sessão
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => handleStartSession(session)}>
                      <Power className="w-4 h-4 mr-2" />
                      Iniciar Sessão
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => handleRestartSession(session)}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reiniciar
                  </DropdownMenuItem>
                  
                  {user?.role === 'admin' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleToggleSystemSession(session)}>
                        <Shield className="w-4 h-4 mr-2" />
                        {session.is_system_session ? 'Remover do Sistema' : 'Definir como Sistema'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenTransferModal(session)}>
                        <ArrowUpCircle className="w-4 h-4 mr-2" />
                        Transferir Sessão
                      </DropdownMenuItem>
                    </>
                  )}
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleLogoutSession(session)}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Desconectar
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleDeleteSession(session)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
                console.error('Logo failed to load on Sessions page');
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
    <>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Smartphone className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Sessões WhatsApp</h1>
            <p className="text-sm sm:text-base text-gray-600 hidden sm:block">
              Gerencie suas conexões com a API do WhatsApp
            </p>
          </div>
        </div>

        {/* Contador de Sessões */}
        {sessionLimit !== null && (
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 self-start sm:self-auto">
            <Smartphone className="w-4 h-4 text-gray-600 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-900 whitespace-nowrap">
              {activeSessions} / {sessionLimit === -1 ? '∞' : sessionLimit}
            </span>
            <span className="text-xs text-gray-600 whitespace-nowrap">sessões ativas</span>
          </div>
        )}
      </div>

      {/* Message Alert */}
      {message && (
        <Alert className={`rounded-2xl ${message.includes('Erro') ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
          {message.includes('Erro') ? (
            <AlertCircle className="h-4 w-4 text-red-600" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          )}
          <AlertDescription className={message.includes('Erro') ? 'text-red-800' : 'text-green-800'}>
            {message}
          </AlertDescription>
        </Alert>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
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
            onClick={handleSync}
            disabled={isSyncing || isProcessing}
            className="rounded-xl h-10 w-10 p-0"
            size="icon"
          >
            <RefreshCw className={`w-4 h-4 ${(isSyncing || isProcessing) ? 'animate-spin' : ''}`} />
          </Button>

          <Button
            onClick={() => setIsConnectModalOpen(true)}
            disabled={isProcessing}
            className="bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex-1"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Sessão
          </Button>
        </div>

        {/* Barra de pesquisa */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>

        {/* Filtro Admin: Minhas/Todas Sessões */}
        {user?.role === 'admin' && (
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="w-48 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="my">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Minhas Sessões
                </div>
              </SelectItem>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Todas as Sessões
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Desktop: Botões à direita */}
        <div className="hidden sm:flex gap-2">
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
            onClick={handleSync}
            disabled={isSyncing || isProcessing}
            className="rounded-xl"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${(isSyncing || isProcessing) ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          <Button
            onClick={() => setIsConnectModalOpen(true)}
            disabled={isProcessing}
            className="bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Sessão
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="rounded-2xl bg-gray-100 p-1">
          <TabsTrigger value="active" className="rounded-xl">
            Ativas ({sessions.filter(s => s.status === 'WORKING').length})
          </TabsTrigger>
          <TabsTrigger value="all" className="rounded-xl">
            Todas ({sessions.length})
          </TabsTrigger>
          <TabsTrigger value="inactive" className="rounded-xl">
            Inativas ({sessions.filter(s => s.status !== 'WORKING').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredSessions.length === 0 ? (
            <Card className="rounded-3xl border-dashed border-2 border-gray-200">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Smartphone className="w-16 h-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nenhuma sessão encontrada
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm ? 'Tente ajustar os filtros de busca' : 'Conecte uma nova sessão para começar'}
                </p>
                {!searchTerm && (
                  <Button
                    onClick={() => setIsConnectModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 rounded-xl"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Conectar Sessão
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSessions.map(renderSessionCard)}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSessions.map(renderSessionList)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Connect Modal */}
      <ConnectSessionModal
        open={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        onSessionCreated={loadSessions}
        isAdmin={user?.role === 'admin'}
      />

      {/* Transfer Modal */}
      <TransferSessionModal
        open={!!transferSession}
        onClose={() => setTransferSession(null)}
        session={transferSession}
        onTransferSuccess={handleTransferSuccess}
      />

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
      />
    </div>
    </>
  );
}