import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User } from "@/entities/User";
import { Company } from "@/entities/Company";
import { Schedule } from "@/entities/Schedule";
import { BatchSchedule } from "@/entities/BatchSchedule";
import { Plan } from "@/entities/Plan"; // Importar Plan
import { Session } from "@/entities/Session"; // Importar Session
import { Contact } from "@/entities/Contact"; // Importar Contact
import { MessageTemplate } from "@/entities/MessageTemplate"; // Importar MessageTemplate
import { Tag } from "@/entities/Tag"; // Importar Tag
import { Message } from "@/entities/Message"; // Importar Message
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AnimatePresence, motion } from "framer-motion"; // NOVO: Import framer-motion
import {
  Activity,
  AlertTriangle,
  Archive,
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  Calendar,
  Clock,
  CreditCard,
  Cpu,
  Database,
  DownloadCloud,
  Eye,
  FileSearch,
  FileText,
  FileUser,
  GitBranch,
  Globe,
  GraduationCap,
  HeadphonesIcon,
  HelpCircle,
  History,
  Home,
  Key,
  Lock,
  LogOut,
  Mail,
  Megaphone,
  Menu,
  MessageCircle,
  MessageSquare,
  MonitorSpeaker,
  Palette,
  Phone,
  Puzzle,
  QrCode,
  Search,
  Settings,
  Shield,
  Smartphone,
  Sparkles,
  Tag as TagIcon, // Renomeado para evitar conflito com a entidade Tag
  TestTube,
  Trash2,
  User as UserIcon,
  UserPlus,
  Users,
  UsersRound,
  Wrench,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Zap, // Importar Zap para campanhas dinâmicas
  DollarSign, // Adicionado para Faturamento Sistema
  TrendingDown, // Adicionado para Custos
  Send, // NEW: Send icon for campaign progress
  CheckCircle2, // NOVO: Ícone para banners de sucesso
  X, // NOVO: Ícone para fechar/minimizar
  StopCircle, // NOVO: Ícone para cancelar campanha
  Upload, // ✅ ADICIONADO: Ícone para importação
  RefreshCw, // NOVO: Ícone para sincronizar
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";
import { applySmartTags } from "@/functions/applySmartTags";
import AtenaChat from "@/components/AtenaChat";
import NotificationBellContent from "@/components/notifications/NotificationBellContent";
import MessageToast from "@/components/notifications/MessageToast";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { ScrollArea } from "@/components/ui/scroll-area"; // NOVO: Import ScrollArea

import { getPendingApprovals } from "@/functions/getPendingApprovals";
import { getFilteredContactsByRules } from "@/functions/getFilteredContactsByRules";
import { approveBatch } from "@/functions/approveBatch";
import { denyBatch } from "@/functions/denyBatch";
import { cancelBatchMessages } from "@/functions/cancelBatchMessages"; // NOVO: Importar função de cancelamento
import ScheduleDetailsModal from "@/components/scheduler/ScheduleDetailsModal";
import CampaignProgressModal from "@/components/campaigns/CampaignProgressModal"; // NEW: Campaign Progress Modal
import { useWebSocket } from "@/components/hooks/useWebSocket";
import { base44 } from "@/api/base44Client";

import { checkPendingInvitation } from "@/functions/checkPendingInvitation";
import { acceptInvitation } from "@/functions/acceptInvitation"; // Assuming this function exists or will be created
import { getTeamMembers } from "@/functions/getTeamMembers"; // Importar a função
import { getSubscriptionStatus } from "@/functions/getSubscriptionStatus"; // Importar função

function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event) => setMatches(event.matches);
    mediaQuery.addEventListener('change', handler);

    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Novos estados para o botão da Atena
  const [isAtenaEnabled, setIsAtenaEnabled] = useState(false);
  const [atenaPosition, setAtenaPosition] = useState({ bottom: 32, right: 32 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, initialRight: 0, initialBottom: 0 });
  const hasMovedRef = useRef(false);
  const [isAtenaHovered, setIsAtenaHovered] = useState(false);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0); // Novo estado para a contagem no cabeçalho
  const [isLoadingApprovals, setIsLoadingApprovals] = useState(false);
  const [processingApprovalId, setProcessingApprovalId] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [viewingSchedule, setViewingSchedule] = useState(null);
  const [sessionUsage, setSessionUsage] = useState(null); // Novo estado para uso de sessões
  const [contactUsage, setContactUsage] = useState(null); // Novo estado
  const [templateUsage, setTemplateUsage] = useState(null); // Novo estado
  const [tagUsage, setTagUsage] = useState(null); // Novo estado para uso de marcadores
  const [messageUsage, setMessageUsage] = useState(null); // Novo estado para uso de mensagens
  const [userUsage, setUserUsage] = useState(null); // Novo estado para uso de usuários
  const [campaignUsage, setCampaignUsage] = useState(null); // Estado para campanhas recorrentes/dinâmicas

  const [pendingInvitation, setPendingInvitation] = useState(null);
  const [showInvitationModal, setShowInvitationModal] = useState(false);
  const [accessDeniedInfo, setAccessDeniedInfo] = useState(null); // Novo estado

  const isMobile = useMediaQuery("(max-width: 768px)");

  // NOVO: Estados para processamento global de contatos
  const [globalBulkProgress, setGlobalBulkProgress] = useState({
    isProcessing: false,
    processType: null, // 'delete' or 'restore'
    total: 0,
    processed: 0,
    successful: 0,
    failed: 0
  });

  // ✅ NOVO: Estados para importação de contatos
  const [globalImportProgress, setGlobalImportProgress] = useState({
    isProcessing: false,
    total: 0,
    processed: 0,
    successful: 0,
    failed: 0
  });

  // NOVO: Estado para controlar se o modal central está aberto
  const [isBulkProgressModalOpen, setIsBulkProgressModalOpen] = useState(false);

  // NOVO: Estados para progresso global de campanhas
  const [globalCampaignProgress, setGlobalCampaignProgress] = useState({
    isProcessing: false,
    schedule_id: null,
    schedule_name: null,
    is_dynamic: false,
    campaign_type: 'immediate', // 'immediate', 'scheduled', 'smart', 'recurring'
    total_batches: 1,
    batches_completed: 0,
    total: 0,
    sent: 0,
    failed: 0,
    pending: 0,
    recent_messages: [] // Array dos últimos 20 envios
  });

  // NOVO: Estado para controlar modal de campanha
  const [isCampaignProgressModalOpen, setIsCampaignProgressModalOpen] = useState(false);

  // NOVO: Estado para confirmação de fechar card de campanha
  const [showCloseCampaignCardDialog, setShowCloseCampaignCardDialog] = useState(false);

  // NOVO: Estado para toast de mensagens recebidas
  const [messageToast, setMessageToast] = useState(null);
  const messageToastTimeoutRef = useRef(null);
  const notificationSoundRef = useRef(null);

  // NOVO: Sincronizar progresso de campanha
  const handleSyncCampaignProgress = async (e) => {
    e.stopPropagation();
    try {
      const savedProgress = localStorage.getItem('campaignProgress');
      if (savedProgress) {
        const progress = JSON.parse(savedProgress);
        window.dispatchEvent(new CustomEvent('campaignProgressUpdate', {
          detail: progress
        }));
      }
    } catch (error) {
      console.error('[Layout] Erro ao sincronizar progresso:', error);
    }
  };

  // NOVO: Fechar card de campanha
  const handleCloseCampaignCard = (e) => {
    e.stopPropagation();
    setShowCloseCampaignCardDialog(true);
  };

  const confirmCloseCampaignCard = () => {
    console.log('[Layout] 🧹 Usuário fechou o card de campanha');
    localStorage.removeItem('campaignProgress');

    window.dispatchEvent(new CustomEvent('campaignProgressUpdate', {
      detail: {
        isProcessing: false,
        schedule_id: null,
        schedule_name: null,
        is_dynamic: false,
        campaign_type: 'immediate',
        total_batches: 1,
        batches_completed: 0,
        total: 0,
        sent: 0,
        failed: 0,
        pending: 0,
        recent_messages: []
      }
    }));

    setShowCloseCampaignCardDialog(false);
  };


  // Helper para cores dos contadores
  const getUsageColorClass = (used, limit) => {
    if (limit === -1 || used === undefined || limit === undefined) {
      return "bg-gray-100 text-gray-600 border-gray-200";
    }

    // Treat 0 limit as effectively unlimited or not applicable for percentage calculation
    if (limit === 0) {
        if (used > 0) return "bg-red-100 text-red-700 border-red-200"; // If limit is 0 but used > 0, it's an overflow
        return "bg-gray-100 text-gray-600 border-gray-200"; // If limit is 0 and used is 0, it's fine.
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

  // Adicionando mapa de tradução para os títulos das páginas
  const pageTitles = {
    Dashboard: "Início",
    Sessions: "Sessões",
    Chat: "Conversas",
    Contacts: "Contatos",
    MessageTemplates: "Modelos de Mensagem",
    Campaign: "Campanhas",
    Scheduler: "Campanhas",
    Tags: "Marcadores",
    Products: "Produtos",
    AIAgents: "Agentes IA",
    UserPreferences: "Central",
    Plans: "Plano",
    Billing: "Faturamento",
    Team: "Equipe",
    RolePermissions: "Funções e Permissões",
    PlansAdmin: "Catálogo de Planos",
    SubscriptionsAdmin: "Assinaturas",
    OffersAdmin: "Ofertas",
    ProfileSettings: "Configurações de Perfil",
    CompanySetup: "Configuração da Empresa",
    TaskBoard: "Gestão de Tarefas",
    Customers: "Clientes",
    SystemBilling: "Faturamento Sistema",
    Costs: "Custos",
  };
  const translatedPageName = pageTitles[currentPageName] || currentPageName;

  useEffect(() => {
    if (isMobile) {
      setIsSidebarCollapsed(true);
    } else {
      setIsSidebarCollapsed(false);
    }
  }, [isMobile]);

  // NOVO: Escutar mudanças no estado do modal central
  useEffect(() => {
    const handleModalStateChange = (e) => {
      setIsBulkProgressModalOpen(e.detail.isOpen);
    };

    window.addEventListener('bulkProgressModalStateChange', handleModalStateChange);

    return () => {
      window.removeEventListener('bulkProgressModalStateChange', handleModalStateChange);
    };
  }, []);

  // NOVO: Carregar estado de processamento do localStorage com polling mais agressivo
  useEffect(() => {
    const checkProcessingStatus = () => {
      try {
        const savedProgress = localStorage.getItem('bulkContactsProgress');
        if (savedProgress) {
          const progress = JSON.parse(savedProgress);

          // Atualizar sempre, mesmo que os valores sejam os mesmos
          setGlobalBulkProgress({
            isProcessing: progress.isProcessing || false,
            processType: progress.processType || null,
            total: progress.total || 0,
            processed: progress.processed || 0,
            successful: progress.successful || 0,
            failed: progress.failed || 0
          });
        } else {
          // Se não há dados no localStorage, limpar o estado
          setGlobalBulkProgress({
            isProcessing: false,
            processType: null,
            total: 0,
            processed: 0,
            successful: 0,
            failed: 0
          });
        }
      } catch (error) {
        console.error('Error loading processing status:', error);
      }
    };

    // Verificar imediatamente
    checkProcessingStatus();

    // Polling agressivo a cada 500ms para garantir atualização em tempo real
    const pollingInterval = setInterval(() => {
      checkProcessingStatus();
    }, 500);

    // Escutar mudanças no localStorage de outras tabs/páginas
    const handleStorageChange = (e) => {
      if (e.key === 'bulkContactsProgress') {
        if (e.newValue) {
          try {
            const progress = JSON.parse(e.newValue);
            setGlobalBulkProgress({
              isProcessing: progress.isProcessing || false,
              processType: progress.processType || null,
              total: progress.total || 0,
              processed: progress.processed || 0,
              successful: progress.successful || 0,
              failed: progress.failed || 0
            });
          } catch (error) {
            console.error('Error parsing storage change:', error);
          }
        } else {
          // localStorage foi limpo
          setGlobalBulkProgress({
            isProcessing: false,
            processType: null,
            total: 0,
            processed: 0,
            successful: 0,
            failed: 0
          });
        }
      }
    };

    // Escutar evento customizado para atualização dentro da mesma tab
    const handleProgressUpdate = (e) => {
      setGlobalBulkProgress({
        isProcessing: e.detail.isProcessing || false,
        processType: e.detail.processType || null,
        total: e.detail.total || 0,
        processed: e.detail.processed || 0,
        successful: e.detail.successful || 0,
        failed: e.detail.failed || 0
      });
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('bulkProgressUpdate', handleProgressUpdate);

    return () => {
      clearInterval(pollingInterval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('bulkProgressUpdate', handleProgressUpdate);
    };
  }, []);

  // NOVO: Carregar estado de campanha do localStorage
  useEffect(() => {
    const checkCampaignStatus = () => {
      try {
        const savedProgress = localStorage.getItem('campaignProgress');
        if (savedProgress) {
          const progress = JSON.parse(savedProgress);

          setGlobalCampaignProgress({
            isProcessing: progress.isProcessing || false,
            schedule_id: progress.schedule_id || null,
            schedule_name: progress.schedule_name || null,
            is_dynamic: progress.is_dynamic || false,
            campaign_type: progress.campaign_type || 'immediate',
            total_batches: progress.total_batches || 1,
            batches_completed: progress.batches_completed || 0,
            total: progress.total || 0,
            sent: progress.sent || 0,
            failed: progress.failed || 0,
            pending: progress.pending || 0,
            recent_messages: progress.recent_messages || []
          });
        } else {
          setGlobalCampaignProgress({
            isProcessing: false,
            schedule_id: null,
            schedule_name: null,
            is_dynamic: false,
            campaign_type: 'immediate',
            total_batches: 1,
            batches_completed: 0,
            total: 0,
            sent: 0,
            failed: 0,
            pending: 0,
            recent_messages: []
          });
        }
      } catch (error) {
        console.error('[Layout] Error loading campaign status:', error);
      }
    };

    checkCampaignStatus();

    const pollingInterval = setInterval(() => {
      checkCampaignStatus();
    }, 500);

    const handleStorageChange = (e) => {
      if (e.key === 'campaignProgress') {
        if (e.newValue) {
          try {
            const progress = JSON.parse(e.newValue);
            setGlobalCampaignProgress({
              isProcessing: progress.isProcessing || false,
              schedule_id: progress.schedule_id || null,
              schedule_name: progress.schedule_name || null,
              is_dynamic: progress.is_dynamic || false,
              campaign_type: progress.campaign_type || 'immediate',
              total_batches: progress.total_batches || 1,
              batches_completed: progress.batches_completed || 0,
              total: progress.total || 0,
              sent: progress.sent || 0,
              failed: progress.failed || 0,
              pending: progress.pending || 0,
              recent_messages: progress.recent_messages || []
            });
          } catch (error) {
            console.error('[Layout] Error parsing storage change:', error);
          }
        } else {
          setGlobalCampaignProgress({
            isProcessing: false,
            schedule_id: null,
            schedule_name: null,
            is_dynamic: false,
            campaign_type: 'immediate',
            total_batches: 1,
            batches_completed: 0,
            total: 0,
            sent: 0,
            failed: 0,
            pending: 0,
            recent_messages: []
          });
        }
      }
    };

    const handleCampaignProgressUpdate = (e) => {
      setGlobalCampaignProgress({
        isProcessing: e.detail.isProcessing || false,
        schedule_id: e.detail.schedule_id || null,
        schedule_name: e.detail.schedule_name || null,
        is_dynamic: e.detail.is_dynamic || false,
        campaign_type: e.detail.campaign_type || 'immediate',
        total_batches: e.detail.total_batches || 1,
        batches_completed: e.detail.batches_completed || 0,
        total: e.detail.total || 0,
        sent: e.detail.sent || 0,
        failed: e.detail.failed || 0,
        pending: e.detail.pending || 0,
        recent_messages: e.detail.recent_messages || []
      });
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('campaignProgressUpdate', handleCampaignProgressUpdate);

    return () => {
      clearInterval(pollingInterval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('campaignProgressUpdate', handleCampaignProgressUpdate);
    };
  }, []);





  // ✅ NOVO: Carregar estado de importação do localStorage (com Fallback de Polling no BD)
  useEffect(() => {
    const checkImportStatus = async () => {
      try {
        const savedProgress = localStorage.getItem('importProgress');
        if (savedProgress) {
          let progress = JSON.parse(savedProgress);

          // ✅ Fallback: Se tiver importId e estiver processando, buscar do banco de dados
          // Isso garante atualização mesmo se o WebSocket falhar (Erro 1006)
          if (progress.importId && progress.isProcessing) {
            try {
              // Usar entity.get para buscar status atualizado
              const importRecord = await base44.entities.Import.get(progress.importId);
              if (importRecord) {
                // Atualizar dados locais com os do banco
                progress.processed = importRecord.processed_records || progress.processed;
                progress.successful = importRecord.successful_records || progress.successful;
                progress.failed = importRecord.failed_records || progress.failed;
                
                if (importRecord.status === 'completed' || importRecord.status === 'failed') {
                  progress.isProcessing = false;
                  progress.status = importRecord.status;
                }
                
                // Salvar atualização no localStorage para persistência
                localStorage.setItem('importProgress', JSON.stringify(progress));
                
                // Disparar evento para atualizar modal se estiver aberto
                window.dispatchEvent(new CustomEvent('importProgressUpdate', { detail: progress }));
              }
            } catch (dbError) {
              console.warn('[Layout] Falha no polling do DB para importação:', dbError);
            }
          }

          // ✅ Limpar se total = 0
          if (!progress.total || progress.total === 0) {
            localStorage.removeItem('importProgress');
            setGlobalImportProgress({
              isProcessing: false,
              total: 0,
              processed: 0,
              successful: 0,
              failed: 0
            });
            return;
          }

          setGlobalImportProgress({
            isProcessing: progress.isProcessing || false,
            total: progress.total || 0,
            processed: progress.processed || 0,
            successful: progress.successful || 0,
            failed: progress.failed || 0
          });
        } else {
          setGlobalImportProgress({
            isProcessing: false,
            total: 0,
            processed: 0,
            successful: 0,
            failed: 0
          });
        }
      } catch (error) {
        console.error('[Layout] Error loading import status:', error);
      }
    };

    checkImportStatus();

    const pollingInterval = setInterval(() => {
      checkImportStatus();
    }, 2000); // Polling a cada 2 segundos para garantir atualizações suaves

    const handleStorageChange = (e) => {
      if (e.key === 'importProgress') {
        if (e.newValue) {
          try {
            const progress = JSON.parse(e.newValue);
            
            if (!progress.total || progress.total === 0) return;
            
            setGlobalImportProgress({
              isProcessing: progress.isProcessing || false,
              total: progress.total || 0,
              processed: progress.processed || 0,
              successful: progress.successful || 0,
              failed: progress.failed || 0
            });
          } catch (error) {
            console.error('[Layout] Error parsing storage change:', error);
          }
        } else {
          setGlobalImportProgress({
            isProcessing: false,
            total: 0,
            processed: 0,
            successful: 0,
            failed: 0
          });
        }
      }
    };

    const handleImportProgressUpdate = (e) => {
      if (!e.detail.total || e.detail.total === 0) return;
      
      setGlobalImportProgress({
        isProcessing: e.detail.isProcessing || false,
        total: e.detail.total || 0,
        processed: e.detail.processed || 0,
        successful: e.detail.successful || 0,
        failed: e.detail.failed || 0
      });
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('importProgressUpdate', handleImportProgressUpdate);

    return () => {
      clearInterval(pollingInterval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('importProgressUpdate', handleImportProgressUpdate);
    };
  }, []);


  // NOVO: Escutar mudanças no modal de campanha
  useEffect(() => {
    const handleCampaignModalStateChange = (e) => {
      setIsCampaignProgressModalOpen(e.detail.isOpen);
    };

    window.addEventListener('campaignProgressModalStateChange', handleCampaignModalStateChange);

    return () => {
      window.removeEventListener('campaignProgressModalStateChange', handleCampaignModalStateChange);
    };
  }, []);

  // NOVO: Esconder card quando abrir modal de detalhes
  useEffect(() => {
    const handleOpenScheduleDetailsModal = () => {
      setIsCampaignProgressModalOpen(false);
    };

    const handleCloseScheduleDetailsModal = () => {
      // Verificar se a campanha está 100% concluída
      const isCompleted = (globalCampaignProgress.sent + globalCampaignProgress.failed) >= globalCampaignProgress.total && globalCampaignProgress.total > 0;

      if (isCompleted) {
        console.log('[Layout] 🧹 Campanha concluída e modal fechado, limpando card...');
        localStorage.removeItem('campaignProgress');

        window.dispatchEvent(new CustomEvent('campaignProgressUpdate', {
          detail: {
            isProcessing: false,
            schedule_id: null,
            schedule_name: null,
            is_dynamic: false,
            total: 0,
            sent: 0,
            failed: 0,
            pending: 0,
            recent_messages: []
          }
        }));
      }
    };

    window.addEventListener('openScheduleDetailsModal', handleOpenScheduleDetailsModal);
    window.addEventListener('scheduleDetailsModalClosed', handleCloseScheduleDetailsModal);

    return () => {
      window.removeEventListener('openScheduleDetailsModal', handleOpenScheduleDetailsModal);
      window.removeEventListener('scheduleDetailsModalClosed', handleCloseScheduleDetailsModal);
    };
  }, [globalCampaignProgress]);

  const loadNotificationsCount = useCallback(async () => {
    try {
      const response = await base44.functions.invoke('getNotifications', { 
        limit: 1,
        offset: 0 
      });
      
      if (response.data?.success) {
        setUnreadNotificationsCount(response.data.unread_count || 0);
      }
    } catch (error) {
      console.error('Erro ao carregar contagem de notificações:', error);
    }
  }, []);

  const loadMessagesCount = useCallback(async () => {
    if (!user?.company_id) return;
    
    try {
      const allMessages = await base44.entities.Message.filter({
        company_id: user.company_id,
        direction: 'received',
        created_at: { '$gte': Date.now() - (7 * 24 * 60 * 60 * 1000) }
      });

      const unreadMessages = allMessages.filter(msg => !msg.metadata?.read_in_notification);
      const messagesByChat = {};
      
      unreadMessages.forEach(msg => {
        if (!messagesByChat[msg.chat_id] || new Date(msg.created_at) > new Date(messagesByChat[msg.chat_id].created_at)) {
          messagesByChat[msg.chat_id] = msg;
        }
      });

      const count = Object.keys(messagesByChat).length;
      setUnreadMessagesCount(count);

      window.dispatchEvent(new CustomEvent('messagesCountChanged', {
        detail: { count }
      }));
    } catch (error) {
      console.error('[Layout] Erro ao carregar contagem de mensagens:', error);
    }
  }, [user?.company_id]);

  const loadUserData = useCallback(async () => {
    try {
      console.log('Loading user data...');
      const currentUser = await User.me();
      console.log('User loaded:', currentUser);
      setUser(currentUser);
      
      // Carregar contagem de notificações e mensagens
      loadNotificationsCount();
      loadMessagesCount();

      // NOVO: Checa se o usuário está inativo
      if (currentUser.is_active === false) {
        console.log('User is inactive. Denying access.');
        let adminName = 'o administrador da empresa';
        let adminEmail = 'desconhecido';

        if (currentUser.company_id) {
          try {
            const companies = await Company.list();
            const userCompany = companies.find(c => c.id === currentUser.company_id);

            if (userCompany && userCompany.owner_id) {
              try {
                const owner = await User.get(userCompany.owner_id);
                if (owner) {
                  adminName = owner.full_name || 'Proprietário da empresa';
                  adminEmail = owner.email || 'desconhecido';
                  console.log('Found company owner:', { name: adminName, email: adminEmail });
                }
              } catch (ownerError) {
                console.warn('Could not fetch owner by owner_id, trying team members approach:', ownerError);
              }
            }

            if (adminName === 'o administrador da empresa') {
              const teamResponse = await getTeamMembers();
              console.log('Team response:', teamResponse.data);

              if (teamResponse.data?.success && teamResponse.data?.team_members) {
                console.log('Searching in team members:', teamResponse.data.team_members);

                let contactPerson = teamResponse.data.team_members.find(member => {
                  console.log('Checking member:', member.full_name, 'system_role:', member.system_role);
                  return member.system_role === 'owner';
                });

                if (!contactPerson) {
                  contactPerson = teamResponse.data.team_members.find(member =>
                    member.system_role === 'admin'
                  );
                }

                if (contactPerson) {
                  adminName = contactPerson.full_name || 'Administrador da empresa';
                  adminEmail = contactPerson.email || 'desconhecido';
                  console.log('Found contact person via team:', { name: adminName, email: adminEmail });
                }
              }
            }

          } catch (err) {
            console.error("Error fetching company or team members for inactive user:", err);
          }
        }

        console.log('Final admin info:', { adminName, adminEmail });
        setAccessDeniedInfo({ adminName, adminEmail });
        setIsLoading(false);
        return;
      }

      if (!currentUser.company_id) {
        console.log('User has no company_id, checking for pending invitations...');
        try {
          const invitationResponse = await checkPendingInvitation();
          if (invitationResponse.data?.success && invitationResponse.data?.has_invitation) {
            console.log('Found pending invitation:', invitationResponse.data.invitation);
            setPendingInvitation(invitationResponse.data.invitation);
            setShowInvitationModal(true);
            setIsLoading(false);
            return;
          }
        } catch (error) {
          console.error('Error checking invitation:', error);
        }

        console.log('No pending invitations, redirecting to CompanySetup');
        if (location.pathname !== createPageUrl("CompanySetup")) {
          navigate(createPageUrl("CompanySetup"), { replace: true });
        }
        setIsLoading(false);
        return;

      } else {
        console.log('User has company_id:', currentUser.company_id);

        let comp = null;
        try {
          if (currentUser.role === 'admin') {
            console.log('Admin user - listing all companies');
            const companies = await Company.list();
            console.log('Company.list() returned:', companies.length, 'companies');
            comp = companies.find((c) => c.id === currentUser.company_id);
            console.log('Found company for admin:', comp);
          } else {
            console.log('Regular user - filtering company by ID:', currentUser.company_id);
            const companies = await Company.filter({ id: currentUser.company_id });
            console.log('Company.filter() returned:', companies.length, 'companies');
            comp = companies.length > 0 ? companies[0] : null;
            console.log('Found company for user:', comp);
          }
        } catch (error) {
          console.error('Error fetching company:', error.message);
        }

        if (!comp) {
          console.error('CRITICAL: Company not found for ID:', currentUser.company_id);
          console.error('This indicates a data inconsistency. Forcing logout and redirect to login.');

          // Limpar company_id inválido e forçar logout
          try {
            await base44.asServiceRole.entities.User.update(currentUser.id, { company_id: null });
          } catch (updateError) {
            console.error('Failed to clear invalid company_id:', updateError);
          }

          await User.logout();
          return;
        }

        console.log('✅ Company found:', comp);
        setCompany(comp);

        // Set AI enabled status
        const aiEnabled = comp.settings?.ai_enabled || false;
        console.log('[Layout] AI Enabled:', aiEnabled);
        setIsAtenaEnabled(aiEnabled);

        if (location.pathname === createPageUrl("CompanySetup")) {
          navigate(createPageUrl("Dashboard"), { replace: true });
        }
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
      setAuthError(true);
      base44.auth.redirectToLogin(window.location.href);
    }
    }, [navigate, location.pathname]);

  const showNotification = (type, message) => {
    console.log(`Notification (${type}): ${message}`);
    // In a real application, this would dispatch a toast or similar UI notification
    // For now, let's just log and maybe set a notification state if needed.
    setNotifications(prev => [...prev, { id: Date.now(), type, message }]);
  };

  // Recarregar contagem de notificações e mensagens periodicamente
  useEffect(() => {
    if (user?.id) {
      const interval = setInterval(() => {
        loadNotificationsCount();
        loadMessagesCount();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [user?.id, loadNotificationsCount, loadMessagesCount]);

  // Escutar mudanças na contagem de mensagens
  useEffect(() => {
    const handleMessagesCountChange = (e) => {
      setUnreadMessagesCount(e.detail.count || 0);
    };

    window.addEventListener('messagesCountChanged', handleMessagesCountChange);
    return () => window.removeEventListener('messagesCountChanged', handleMessagesCountChange);
  }, []);



  // 🔥 WebSocket para atualizações em tempo real
  const handleWebSocketMessage = useCallback((wsData) => {
    console.log('[Layout] 📨 WebSocket message:', wsData.type);

    // Recarregar contagem quando receber nova notificação
    if (wsData.type === 'notification_created') {
      loadNotificationsCount();
    }

    // NOVO: Mostrar toast de mensagem recebida
    if (wsData.type === 'message_updated' || wsData.type === 'message_received') {
      const messageData = wsData.data;

      // Apenas mostrar se for mensagem recebida
      if (messageData?.direction === 'received') {
        console.log('[Layout] 📬 Nova mensagem recebida, mostrando toast');

        // Tocar som
        if (notificationSoundRef.current) {
          notificationSoundRef.current.play().catch(err => {
            console.log('[Layout] Não foi possível tocar som:', err);
          });
        }

        // Limpar timeout anterior
        if (messageToastTimeoutRef.current) {
          clearTimeout(messageToastTimeoutRef.current);
        }

        // Se já tem uma mensagem sendo exibida, fazer fade out antes
        if (messageToast) {
          setMessageToast(prev => ({ ...prev, isExiting: true }));

          // Aguardar fade out completar antes de mostrar nova
          messageToastTimeoutRef.current = setTimeout(() => {
            setMessageToast(messageData);
          }, 300);
        } else {
          setMessageToast(messageData);
        }
      }
    }

    // ✅ NOVO: Processar progresso de delete/restore
    if (wsData.type === 'bulk_delete_progress') {
      console.log('[Layout] 🗑️ Progresso de delete/restore:', wsData.data);

      if (wsData.data) {
        const progressData = {
          isProcessing: wsData.data.status !== 'completed',
          processType: wsData.data.status === 'completed' ? null : (localStorage.getItem('bulkContactsProgress') ? JSON.parse(localStorage.getItem('bulkContactsProgress')).processType : 'delete'),
          total: wsData.data.total || 0,
          processed: wsData.data.processed || 0,
          successful: wsData.data.successful || 0,
          failed: wsData.data.failed || 0
        };

        console.log('[Layout] 💾 Atualizando progresso bulk:', progressData);

        localStorage.setItem('bulkContactsProgress', JSON.stringify(progressData));

        window.dispatchEvent(new CustomEvent('bulkProgressUpdate', {
          detail: progressData
        }));

        // ✅ Disparar evento específico para a página de contatos
        window.dispatchEvent(new CustomEvent('bulkDeleteProgressUpdate', {
          detail: wsData.data
        }));
      }
    }

    // ✅ NOVO: Processar progresso de importação
    if (wsData.type === 'import_progress') {
      console.log('[Layout] 📥 Progresso de importação:', wsData.data);

      if (wsData.data) {
        const isStillProcessing = wsData.data.status !== 'completed' && wsData.data.status !== 'failed';

        const progressData = {
          isProcessing: isStillProcessing,
          total: wsData.data.total || 0,
          processed: wsData.data.processed || 0,
          successful: wsData.data.successful || 0,
          failed: wsData.data.failed || 0,
          duplicates: wsData.data.duplicates || 0,
          updated: wsData.data.updated || 0,
          noWhatsApp: wsData.data.noWhatsApp || 0,
          status: wsData.data.status || 'processing'
        };

        console.log('[Layout] 💾 Atualizando progresso completo:', progressData);

        localStorage.setItem('importProgress', JSON.stringify(progressData));

        window.dispatchEvent(new CustomEvent('importProgressUpdate', {
          detail: progressData
        }));
      }
    }

    // NOVO: Processar evento de início de campanha
    if (wsData.type === 'campaign_started') {
      console.log('[Layout] 🚀 Campanha iniciada:', wsData.data);

      if (wsData.data) {
        localStorage.setItem('campaignProgress', JSON.stringify(wsData.data));

        window.dispatchEvent(new CustomEvent('campaignProgressUpdate', {
          detail: wsData.data
        }));
      }
    }

    // NOVO: Atualizar progresso de campanha com mensagens
    if (wsData.type === 'message_updated') {
      const scheduleId = wsData.schedule_id || wsData.data?.schedule_id;
      const messageId = wsData.message_id || wsData.data?.message_id;
      const status = wsData.status || wsData.data?.status;
      const contactName = wsData.data?.metadata?.contact_name || wsData.data?.contact_name || 'Contato';
      const phoneNumber = wsData.data?.metadata?.phone_number || wsData.data?.phone_number || '';

      if (!scheduleId) return;

      const savedProgress = localStorage.getItem('campaignProgress');
      if (savedProgress) {
        try {
          const progress = JSON.parse(savedProgress);

          if (progress.isProcessing && progress.schedule_id === scheduleId) {
            console.log(`[Layout] 📨 Atualização de mensagem para campanha ${scheduleId}:`, status);

            // Initialize with current values if they exist, otherwise 0
            let newSent = progress.sent || 0;
            let newFailed = progress.failed || 0;
            let newPending = progress.pending || 0;

            // Keep track of processed message IDs to prevent double counting
            const processedMessageIds = new Set(progress.processed_message_ids || []);

            // Only update counts if the message status implies a final state AND it hasn't been processed
            if (!processedMessageIds.has(messageId)) {
                if (status === 'success' || status === 'delivered') {
                    newSent++;
                    newPending = Math.max(0, newPending - 1);
                    processedMessageIds.add(messageId);
                } else if (status === 'failed' || status === 'error') {
                    newFailed++;
                    newPending = Math.max(0, newPending - 1);
                    processedMessageIds.add(messageId);
                }
            }

            // Ensure pending doesn't go below 0
            newPending = Math.max(0, newPending);

            // Add to recent messages list, filter out duplicates, sort, and slice
            const newMessage = {
              message_id: messageId,
              contact_name: contactName,
              phone_number: phoneNumber,
              status: (status === 'success' || status === 'delivered') ? 'success' : (status === 'failed' || status === 'error') ? 'failed' : 'pending',
              timestamp: Date.now()
            };

            const recentMessages = [...(progress.recent_messages || []).filter(msg => msg.message_id !== messageId), newMessage]
                .sort((a,b) => b.timestamp - a.timestamp) // Sort by most recent
                .slice(0, 20); // Keep only the last 20 messages

            // Check if completed (all messages either sent or failed)
            const isCompleted = (newSent + newFailed) >= progress.total;

            const updatedProgress = {
              ...progress,
              sent: newSent,
              failed: newFailed,
              pending: newPending,
              recent_messages: recentMessages,
              processed_message_ids: Array.from(processedMessageIds), // Save processed IDs
              isProcessing: !isCompleted // Set to false if completed
            };

            // Save to localStorage
            localStorage.setItem('campaignProgress', JSON.stringify(updatedProgress));

            // Dispatch event
            window.dispatchEvent(new CustomEvent('campaignProgressUpdate', {
              detail: updatedProgress
            }));

            console.log(`[Layout] ✅ Progresso atualizado: ${newSent}/${progress.total} (${progress.total > 0 ? Math.round((newSent / progress.total) * 100) : 0}%)`);
          }
        } catch (error) {
          console.error('[Layout] Erro ao processar atualização de campanha:', error);
        }
      }
    }

    // NOVO: Recarregar contagem de mensagens ao receber nova
    if (wsData.type === 'message_updated' || wsData.type === 'message_received') {
      loadMessagesCount();
    }
  }, [messageToast, loadMessagesCount]);

    // 🔥 Conectar WebSocket
  // Log WebSocket configuration
  useEffect(() => {
    if (user?.company_id) {
      console.log('[Layout] ✅ WebSocket configurado para empresa:', user.company_id);
      console.log('[Layout] 📡 Eventos aceitos: message_updated, campaign_started, import_progress, bulk_delete_progress');
    } else {
      console.log('[Layout] ⚠️ WebSocket não configurado: aguardando company_id');
    }
  }, [user?.company_id]);

  useWebSocket(
    user?.company_id,
    handleWebSocketMessage,
    ['message_updated', 'message_received', 'campaign_started', 'import_progress', 'bulk_delete_progress', 'notification_created']
  );

  const calculateDynamicCount = async (approval) => {
    setPendingApprovals(prev => prev.map(app =>
        app.batch_id === approval.batch_id ? { ...app, is_calculating: true } : app
    ));

    try {
      console.log(`Calculando contatos para lote ${approval.batch_id}:`, { filters: approval.contact_filters, logic: approval.filter_logic, date: new Date(approval.run_at) });

      const response = await getFilteredContactsByRules({
        filters: approval.contact_filters,
        logic: approval.filter_logic,
        simulation_date: new Date(approval.run_at).toISOString()
      });

      console.log(`Resposta para lote ${approval.batch_id}:`, response.data);

      if (response.data?.success) {
        setPendingApprovals(prev => prev.map(app =>
          app.batch_id === approval.batch_id
            ? { ...app, live_recipient_count: response.data.count, is_calculating: false }
            : app
        ));
      } else {
         setPendingApprovals(prev => prev.map(app =>
          app.batch_id === approval.batch_id ? { ...app, is_calculating: false, live_recipient_count: 0 } : app
        ));
      }
    } catch (error) {
      console.error(`Erro ao calcular contatos para o lote ${approval.batch_id}:`, error);
      setPendingApprovals(prev => prev.map(app =>
        app.batch_id === approval.batch_id ? { ...app, is_calculating: false, live_recipient_count: 0 } : app
      ));
    }
  };

  const loadAndCalculateApprovals = useCallback(async () => {
    setIsLoadingApprovals(true);
    try {
      const response = await getPendingApprovals();
      let approvals = [];
      if (response.data?.success) {
        approvals = response.data.approvals.map(app => ({
          ...app,
          live_recipient_count: app.is_dynamic ? null : app.recipient_count,
          is_calculating: false
        })) || [];
      }
      setPendingApprovals(approvals);
      setPendingApprovalsCount(approvals.length); // Atualiza a contagem para o cabeçalho

      if (approvals.length > 0) {
        approvals.forEach(approval => {
          if (approval.is_dynamic && approval.contact_filters && approval.contact_filters.length > 0) {
            console.log(`Iniciando cálculo para lote dinâmico ${approval.batch_id} com filtros:`, approval.contact_filters);
            calculateDynamicCount(approval);
          } else if (approval.is_dynamic && (!approval.contact_filters || approval.contact_filters.length === 0)) {
            setPendingApprovals(prev => prev.map(app =>
                app.batch_id === approval.batch_id ? { ...app, live_recipient_count: 0, is_calculating: false } : app
            ));
          }
        });
      }
    } catch (error) {
      console.error('Erro ao carregar aprovações pendentes:', error);
      setPendingApprovals([]);
      setPendingApprovalsCount(0); // Garante que o contador seja zerado em caso de erro
    } finally {
      setIsLoadingApprovals(false);
    }
  }, []);

  const loadSessionUsage = useCallback(() => {
    if (!user || !user.company_id) return;
    const fetchUsage = async () => {
      try {
        // 1. Obter a assinatura ativa
        const { data } = await getSubscriptionStatus();
        if (!data?.success || !data.has_active_subscription) {
          setSessionUsage(null);
          return;
        }

        const planId = data.subscription.metadata?.plan_id;
        if (!planId) {
          setSessionUsage(null);
          return;
        }

        // 2. Obter os detalhes do plano - com tratamento de erro
        let currentPlan;
        try {
          currentPlan = await Plan.get(planId);
        } catch (planError) {
          console.warn('Plano de sessão não encontrado:', planId, planError);
          setSessionUsage(null);
          return;
        }

        if (!currentPlan) {
          setSessionUsage(null);
          return;
        }

        const sessionLimit = currentPlan.active_sessions;

        // 3. Obter as sessões ativas
        const activeSessions = await Session.filter({
          company_id: user.company_id,
          is_deleted: { '$ne': true },
          status: { '$in': ['WORKING', 'SCAN_QR_CODE', 'STARTING'] }
        });

        setSessionUsage({
          used: activeSessions.length,
          limit: sessionLimit,
        });

      } catch (error) {
        console.error("Erro ao carregar uso de sessões:", error);
        setSessionUsage(null);
      }
    };
    fetchUsage();
  }, [user]);

  const loadContactUsage = useCallback(() => {
    if (!user || !user.company_id) return;
    const fetchUsage = async () => {
      try {
        const { data } = await getSubscriptionStatus();
        if (!data?.success || !data.has_active_subscription) {
          setContactUsage(null);
          return;
        }

        const planId = data.subscription.metadata?.plan_id;
        if (!planId) {
          setContactUsage(null);
          return;
        }

        let currentPlan;
        try {
          currentPlan = await Plan.get(planId);
        } catch (planError) {
          console.warn('Plano de contato não encontrado:', planId, planError);
          setContactUsage(null);
          return;
        }

        if (!currentPlan) {
          setContactUsage(null);
          return;
        }

        const contactLimit = currentPlan.active_contacts;

        const activeContacts = await Contact.filter({
          company_id: user.company_id,
        });

        setContactUsage({
          used: activeContacts.length,
          limit: contactLimit,
        });

      } catch (error) {
        console.error("Erro ao carregar uso de contatos:", error);
        setContactUsage(null);
      }
    };
    fetchUsage();
  }, [user]);

  const loadTemplateUsage = useCallback(() => {
    if (!user || !user.company_id) return;
    const fetchUsage = async () => {
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
    fetchUsage();
  }, [user]);

  const loadTagUsage = useCallback(() => {
    if (!user || !user.company_id) return;
    const fetchUsage = async () => {
      try {
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
          console.warn('Plano de tag não encontrado:', planId, planError);
          setTagUsage(null);
          return;
        }

        if (!currentPlan) {
          setTagUsage(null);
          return;
        }

        const tagLimit = currentPlan.active_tags;

        const activeTags = await Tag.filter({
          company_id: user.company_id,
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
    fetchUsage();
  }, [user]);

  const loadMessageUsage = useCallback(() => {
    if (!user || !user.company_id) return;
    const fetchUsage = async () => {
      try {
        const { data } = await getSubscriptionStatus();
        if (!data?.success || !data.has_active_subscription) {
          setMessageUsage(null);
          return;
        }

        const planId = data.subscription.metadata?.plan_id;
        if (!planId) {
          setMessageUsage(null);
          return;
        }

        let currentPlan;
        try {
          currentPlan = await Plan.get(planId);
        } catch (planError) {
          console.warn('Plano de mensagem não encontrado:', planId, planError);
          setMessageUsage(null);
          return;
        }

        if (!currentPlan) {
          setMessageUsage(null);
          return;
        }

        const messageLimit = currentPlan.messages_per_month;

        let cycleStartDate, renewalDate;

        if (data.subscription.current_period_start && data.subscription.current_period_end) {
          cycleStartDate = new Date(data.subscription.current_period_start);
          renewalDate = new Date(data.subscription.current_period_end);
        } else {
          const now = new Date();
          cycleStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
          renewalDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        }

        const cycleStartEpoch = cycleStartDate.getTime();
        const renewalEpoch = renewalDate.getTime();

        const [successMessages, pendingSchedules] = await Promise.all([
          Message.filter({
            company_id: user.company_id,
            status: 'success',
            direction: 'sent',
            created_at: {
              '$gte': cycleStartEpoch,
              '$lt': renewalEpoch
            }
          }),
          Schedule.filter({
            company_id: user.company_id,
            status: { '$in': ['pending', 'processing'] },
            scheduled_date: { '$gte': cycleStartDate.toISOString(), '$lt': renewalDate.toISOString() }
          })
        ]);

        const reservedMessages = pendingSchedules.reduce((acc, schedule) => {
          const templatesCount = schedule.template_ids?.length || 1;
          const recipientsCount = schedule.total_recipients || 0;
          return acc + (recipientsCount * templatesCount);
        }, 0);

        const messageUsageData = {
          used: successMessages.length + reservedMessages,
          limit: messageLimit,
          renewalDate: renewalDate.toISOString(),
          renewalDateFormatted: renewalDate.toLocaleDateString('pt-BR'),
        };

        setMessageUsage(messageUsageData);

      } catch (error) {
        console.error("Erro ao carregar uso de mensagens:", error);
        setMessageUsage(null);
      }
    };
    fetchUsage();
  }, [user]);

  const loadUserUsage = useCallback(() => {
    if (!user || !user.company_id) return;
    const fetchUsage = async () => {
      try {
        const { data } = await getSubscriptionStatus();
        if (!data?.success || !data.has_active_subscription) {
          setUserUsage(null);
          return;
        }

        const planId = data.subscription.metadata?.plan_id;
        if (!planId) {
          setUserUsage(null);
          return;
        }

        let currentPlan;
        try {
          currentPlan = await Plan.get(planId);
        } catch (planError) {
          console.warn('Plano de usuário não encontrado:', planId, planError);
          setUserUsage(null);
          return;
        }

        if (!currentPlan) {
          setUserUsage(null);
          return;
        }

        const userLimit = currentPlan.company_users;

        const activeUsers = await User.filter({
          company_id: user.company_id,
          is_active: true
        });

        setUserUsage({
          used: activeUsers.length,
          limit: userLimit,
        });

      } catch (error) {
        console.error("Erro ao carregar uso de usuários:", error);
        setUserUsage(null);
      }
    };
    fetchUsage();
  }, [user]);

  const loadCampaignUsage = useCallback(() => {
    if (!user || !user.company_id) return;
    const fetchUsage = async () => {
      try {
        const { data } = await getSubscriptionStatus();
        if (!data?.success || !data.has_active_subscription) {
          setCampaignUsage(null);
          return;
        }

        const planId = data.subscription.metadata?.plan_id;
        if (!planId) {
          setCampaignUsage(null);
          return;
        }

        let currentPlan;
        try {
          currentPlan = await Plan.get(planId);
        } catch (planError) {
          console.warn('Plano de campanha não encontrado:', planId, planError);
          setCampaignUsage(null);
          return;
        }

        if (!currentPlan) {
          setCampaignUsage(null);
          return;
        }

        // ✅ OTIMIZADO: Buscar todos os dados em paralelo com apenas 3 requisições
        const [allRecurringSchedules, allDynamicSchedules, allPendingBatches] = await Promise.all([
          Schedule.filter({
            company_id: user.company_id,
            type: 'recurring',
            status: { '$nin': ['cancelled', 'finished'] }
          }),
          Schedule.filter({
            company_id: user.company_id,
            is_dynamic_campaign: true,
            status: { '$nin': ['cancelled', 'finished'] }
          }),
          BatchSchedule.filter({
            company_id: user.company_id,
            status: 'pending'
          })
        ]);

        // Criar um Set de schedule_ids que têm lotes pendentes
        const scheduleIdsWithPendingBatches = new Set(
          allPendingBatches.map(batch => batch.schedule_id)
        );

        // Contar campanhas recorrentes com lotes pendentes
        const recurringCampaignsCount = allRecurringSchedules.filter(schedule => 
          scheduleIdsWithPendingBatches.has(schedule.id)
        ).length;

        // Contar campanhas dinâmicas com lotes pendentes
        const dynamicCampaignsCount = allDynamicSchedules.filter(schedule => 
          scheduleIdsWithPendingBatches.has(schedule.id)
        ).length;

        setCampaignUsage({
          recurring: {
            used: recurringCampaignsCount,
            limit: currentPlan.recurring_campaigns
          },
          dynamic: {
            used: dynamicCampaignsCount,
            limit: currentPlan.dynamic_campaigns
          }
        });
      } catch (error) {
        console.error("Erro ao carregar uso de campanhas:", error);
        setCampaignUsage(null);
      }
    };
    fetchUsage();
  }, [user]);

  const handleApproveApproval = async (batchId) => {
    setProcessingApprovalId(batchId);
    try {
      const response = await approveBatch({ batch_id: batchId });
      if (response.data?.success) {
        showNotification('success', 'Lote de envio aprovado com sucesso!');
        await loadAndCalculateApprovals();
      } else {
        throw new Error(response.data?.error || 'Erro desconhecido ao aprovar lote.');
      }
    } catch (error) {
      console.error('Erro ao aprovar lote:', error);
      showNotification('error', `Erro ao aprovar lote: ${error.message}`);
    } finally {
      setProcessingApprovalId(null);
    }
  };

  const handleDenyApproval = async (batchId) => {
    setProcessingApprovalId(batchId);
    try {
      const response = await denyBatch({ batch_id: batchId });
       if (response.data?.success) {
        showNotification('info', 'Lote de envio negado.');
        await loadAndCalculateApprovals();
      } else {
        throw new Error(response.data?.error || 'Erro desconhecido ao negar lote.');
      }
    } catch (error) {
      console.error('Erro ao negar lote:', error);
      showNotification('error', `Erro ao negar lote: ${error.message}`);
    } finally {
      setProcessingApprovalId(null);
    }
  };

  const handleViewDetails = async (scheduleId) => {
    if (!scheduleId) {
        console.error("No schedule ID provided");
        return;
    }
    try {
        const schedule = await Schedule.get(scheduleId);
        setViewingSchedule(schedule);
        setShowDetailsModal(true);
    } catch (error) {
        console.error("Error fetching schedule details for modal:", error);
        showNotification('error', 'Não foi possível carregar os detalhes da campanha.');
    }
  };





  const handleAcceptInvitation = async () => {
    try {
      const response = await acceptInvitation({ token: pendingInvitation.token });
      if (response.data?.success) {
        showNotification('success', 'Convite aceito com sucesso! Redirecionando...');
        setShowInvitationModal(false);
        setPendingInvitation(null);

        // Fazer logout e redirect para forçar reload completo da sessão
        setTimeout(async () => {
          await base44.auth.logout(createPageUrl("Dashboard"));
        }, 1000);
      } else {
        throw new Error(response.data?.error || 'Erro ao aceitar convite.');
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      showNotification('error', `Erro ao aceitar convite: ${error.message}`);
    }
  };

  const handleDeclineInvitation = () => {
    showNotification('info', 'Convite recusado. Por favor, crie uma nova empresa.');
    setShowInvitationModal(false);
    setPendingInvitation(null);
    navigate(createPageUrl("CompanySetup"), { replace: true });
  };

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // Escutar mudanças na configuração da IA
  useEffect(() => {
    const handleAiConfigChange = (e) => {
      console.log('[Layout] AI config changed:', e.detail);
      setIsAtenaEnabled(e.detail.enabled);
    };

    window.addEventListener('aiConfigChanged', handleAiConfigChange);
    return () => window.removeEventListener('aiConfigChanged', handleAiConfigChange);
  }, []);

  // Função para iniciar o arrasto
  const handleMouseDown = (e) => {
    if (!isAtenaEnabled) return;

    e.preventDefault();
    e.stopPropagation();

    setIsDragging(true);
    hasMovedRef.current = false;

    // ✅ Corrigido: armazenar posição inicial do mouse e do botão
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      initialRight: atenaPosition.right,
      initialBottom: atenaPosition.bottom
    });
  };

  // Função para arrastar
  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;

    // ✅ Calcular quanto o mouse se moveu desde o início
    const deltaX = dragStart.x - e.clientX; // right aumenta quando mouse vai pra esquerda
    const deltaY = dragStart.y - e.clientY; // bottom aumenta quando mouse vai pra cima

    // ✅ Calcular nova posição baseada na posição inicial + delta
    const newRight = dragStart.initialRight + deltaX;
    const newBottom = dragStart.initialBottom + deltaY;

    // Define tamanho do botão e padding
    const buttonSize = 64; // h-16 w-16 = 64px
    const padding = 16;

    // ✅ Limitar dentro dos bounds da tela
    const clampedRight = Math.max(padding, Math.min(window.innerWidth - buttonSize - padding, newRight));
    const clampedBottom = Math.max(padding, Math.min(window.innerHeight - buttonSize - padding, newBottom));

    // Atualizar posição se mudou
    if (clampedRight !== atenaPosition.right || clampedBottom !== atenaPosition.bottom) {
      setAtenaPosition({
        right: clampedRight,
        bottom: clampedBottom
      });
      hasMovedRef.current = true;
    }
  }, [isDragging, dragStart, atenaPosition]); // dependency array also changed: atenaPosition instead of atenaPosition.right, atenaPosition.bottom

  // Função para finalizar o arrasto
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Adicionar/remover event listeners para arrastar
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);


  useEffect(() => {
    if (currentPageName === "Sessions") {
      loadSessionUsage();
    } else {
      setSessionUsage(null); // Limpa os dados ao sair da página
    }

    if (currentPageName === "Contacts") {
      loadContactUsage();
    } else {
      setContactUsage(null);
    }

    if (currentPageName === "MessageTemplates") {
      loadTemplateUsage();
    } else {
      setTemplateUsage(null);
    }

    if (currentPageName === "Tags") {
      loadTagUsage();
    } else {
      setTagUsage(null);
    }

    if (currentPageName === "Chat") {
      loadMessageUsage();
    } else {
      setMessageUsage(null);
    }

    if (currentPageName === "Scheduler" || currentPageName === "Campaign") {
        loadCampaignUsage();
    } else {
        setCampaignUsage(null);
    }

    if (currentPageName === "Team") {
      loadUserUsage();
    } else {
      setUserUsage(null);
    }
  }, [currentPageName, loadSessionUsage, loadContactUsage, loadTemplateUsage, loadTagUsage, loadMessageUsage, loadUserUsage, loadCampaignUsage]);

  const handleLogout = async () => {
    await User.logout();
  };

  const adminNavigationItems = [
    {
      groupTitle: "Administração",
      items: [
        {
          title: "Clientes",
          url: createPageUrl("Customers"),
          icon: UsersRound
        },
        {
          title: "Faturamento Sistema",
          url: createPageUrl("SystemBilling"),
          icon: DollarSign
        },
        {
          title: "Custos",
          url: createPageUrl("Costs"),
          icon: TrendingDown
        },
        {
          title: "Catálogo de Planos",
          url: createPageUrl("PlansAdmin"),
          icon: CreditCard
        },
        {
          title: "Assinaturas",
          url: createPageUrl("SubscriptionsAdmin"),
          icon: Users
        },
        {
          title: "Ofertas",
          url: createPageUrl("OffersAdmin"),
          icon: FileText
        },
        {
          title: "Gestão de Tarefas",
          url: createPageUrl("TaskBoard"),
          icon: Activity
        },
        {
          title: "Notificações",
          url: createPageUrl("NotificationsAdmin"),
          icon: Bell
        }
      ]
    }
  ];

  const userNavigationItems = [
    {
      groupTitle: "",
      items: [
        {
          title: "Início",
          url: createPageUrl("Dashboard"),
          icon: Home
        },
        {
          title: "Sessões",
          url: createPageUrl("Sessions"),
          icon: Smartphone
        },
        {
          title: "Conversas",
          url: createPageUrl("Chat"),
          icon: MessageSquare
        },
        {
          title: "Contatos",
          url: createPageUrl("Contacts"),
          icon: FileUser
        },
        {
          title: "Modelos",
          url: createPageUrl("MessageTemplates"),
          icon: FileText
        },
        {
          title: "Campanhas",
          url: createPageUrl("Campaign"),
          icon: Calendar
        },
        {
          title: "Marcadores",
          url: createPageUrl("Tags"),
          icon: TagIcon
        },
        {
          title: "Relatórios",
          url: createPageUrl("Reports"),
          icon: BarChart3,
          disabled: true
        },
        {
          title: "Produtos",
          url: createPageUrl("Products"),
          icon: Database,
          badge: "Novo"
        },
        {
          title: "Agentes IA",
          url: createPageUrl("AIAgents"),
          icon: Bot,
          adminOnly: true
        },
        {
          title: "Central",
          url: createPageUrl("UserPreferences"),
          icon: Puzzle
        }
      ]
    }
  ];

  const getNavigationItems = () => {
    if (!user) return [];

    let items = [...userNavigationItems];

    // Filtrar itens que requerem admin
    items = items.map(group => ({
      ...group,
      items: group.items.filter(item => {
        if (item.adminOnly && user.role !== 'admin') {
          return false;
        }
        return true;
      })
    }));

    if (user.role === 'admin') {
      items = [...items, ...adminNavigationItems];
    }

    return items;
  };

  const getUserRoleDisplay = () => {
    if (!user) return '';

    if (user.role === 'admin') {
      return 'Administrador';
    }

    const roleMap = {
      'owner': 'Proprietário',
      'admin': 'Administrador',
      'user': 'Usuário'
    };

    return roleMap[user.system_role] || 'Usuário';
  };

  // Definir navigationItems baseado no usuário atual
  const navigationItems = getNavigationItems();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto overflow-hidden">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690a8ae384e85f405dd1958f/8d6af0619_ChatGPTImage24denovde202519_02_27.png"
              alt="Sparta Sync"
              className="w-16 h-16 object-contain"
              onError={(e) => {
                console.error('Logo failed to load in Layout loading screen');
                e.target.onerror = null;
                e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"%3E%3Ctext x="50%25" y="50%25" font-size="24" text-anchor="middle" dominant-baseline="middle"%3ESS%3C/svg%3E';
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

  if (authError) {
    return null;
  }

  // NOVO: Renderiza a tela de acesso negado
  if (accessDeniedInfo) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4 rounded-3xl shadow-xl p-8 text-center border-red-200">
          <CardHeader>
            <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">Acesso Negado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-6">
              Sua conta foi desativada. Por favor, entre em contato com o administrador da sua empresa para reativar seu acesso.
            </p>
            <div className="bg-gray-50 rounded-2xl p-4 text-left space-y-2">
              <h4 className="font-semibold text-gray-800">Contato do Administrador:</h4>
              <p className="text-sm text-gray-700"><strong>Nome:</strong> {accessDeniedInfo.adminName}</p>
              <p className="text-sm text-gray-700"><strong>Email:</strong> {accessDeniedInfo.adminEmail}</p>
            </div>
            <Button onClick={handleLogout} className="w-full mt-6 bg-gray-700 hover:bg-gray-800 rounded-2xl">
              Sair
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show invitation modal if there's a pending invitation
  if (showInvitationModal && pendingInvitation) {
    console.log('Rendering invitation modal for:', pendingInvitation);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690a8ae384e85f405dd1958f/f927712ff_ChatGPTImage21denovde202512_16_16.png"
              alt="Sparta Sync"
              className="w-16 h-16 mx-auto object-contain mb-6"
            />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Convite para Equipe</h2>
            <p className="text-gray-600 mb-6">
              Você foi convidado para fazer parte da empresa <strong>{pendingInvitation.company_name}</strong>.
              {pendingInvitation.invited_by_name && (
                <span className="block mt-2">
                  Convite enviado por: <strong>{pendingInvitation.invited_by_name}</strong>
                </span>
              )}
            </p>

            {pendingInvitation.previous_company_name && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
                <p className="text-sm text-amber-800 font-medium">
                  ⚠️ Atenção
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  Ao aceitar este convite, você será transferido da empresa <strong>"{pendingInvitation.previous_company_name}"</strong> para <strong>"{pendingInvitation.company_name}"</strong>.
                </p>
              </div>
            )}

            <div className="space-y-3">
              <Button
                onClick={handleAcceptInvitation}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl"
              >
                Aceitar Convite
              </Button>
              <Button
                onClick={handleDeclineInvitation}
                variant="outline"
                className="w-full rounded-2xl"
              >
                {pendingInvitation.previous_company_name ? 'Recusar e Manter Empresa Atual' : 'Recusar e Criar Nova Empresa'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (user && !user.company_id && location.pathname === createPageUrl("CompanySetup")) {
    return children;
  }

  if (user && !user.company_id && !showInvitationModal) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto overflow-hidden">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690a8ae384e85f405dd1958f/8d6af0619_ChatGPTImage24denovde202519_02_27.png"
              alt="Sparta Sync"
              className="w-16 h-16 object-contain"
              onError={(e) => {
                console.error('Logo failed to load - no company screen');
                e.target.onerror = null;
                e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"%3E%3Ctext x="50%25" y="50%25" font-size="24" text-anchor="middle" dominant-baseline="middle"%3ESS%3C/svg%3E';
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

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto overflow-hidden">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690a8ae384e85f405dd1958f/8d6af0619_ChatGPTImage24denovde202519_02_27.png"
              alt="Sparta Sync"
              className="w-16 h-16 object-contain"
              onError={(e) => {
                console.error('Logo failed to load - no user screen');
                e.target.onerror = null;
                e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"%3E%3Ctext x="50%25" y="50%25" font-size="24" text-anchor="middle" dominant-baseline="middle"%3ESS%3C/svg%3E';
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
    <TooltipProvider delayDuration={200}>
      {/* Som de notificação */}
      <audio
        ref={notificationSoundRef}
        src="https://cdn.pixabay.com/audio/2022/03/15/audio_4deafc169b.mp3"
        preload="auto"
      />

      <div className={`flex h-screen bg-gray-50 font-sans antialiased ${isSidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        <style>{`
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

          .sidebar-collapsed aside {
            width: 5rem;
          }

          .sidebar-collapsed .sidebar-title,
          .sidebar-collapsed .sidebar-subtitle,
          .sidebar-collapsed .sidebar-item-text,
          .sidebar-collapsed .sidebar-item-badge,
          .sidebar-collapsed .user-info-text,
          .sidebar-collapsed .user-role-badge,
          .sidebar-collapsed .settings-button {
            display: none;
          }

          .sidebar-collapsed .sidebar-header-center,
          .sidebar-collapsed .sidebar-footer-center,
          .sidebar-collapsed .sidebar-item-center {
            justify-content: center;
          }

          .sidebar-collapsed .sidebar-header-padding,
          .sidebar-collapsed .sidebar-footer-padding,
          .sidebar-collapsed .sidebar-group-label-hidden {
            padding-left: 0.75rem;
            padding-right: 0.75rem;
          }
          .atena-button-dragging {
            cursor: grabbing !important;
            user-select: none;
          }
          .atena-button-disabled {
            pointer-events: none;
          }
        `}</style>

        {/* Sidebar */}
        {!isMobile && (
          <aside className={`flex flex-col border-r border-gray-200 bg-white transition-all duration-300 ${isSidebarCollapsed ? "w-20" : "w-64"}`}>
            {/* Header */}
            <div className={`p-4 border-b border-gray-200 flex items-center relative ${isSidebarCollapsed ? "justify-center p-3 sidebar-header-center" : "gap-3"}`} style={{ height: '64px' }}>
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690a8ae384e85f405dd1958f/f927712ff_ChatGPTImage21denovde202512_16_16.png"
                alt="Sparta Sync"
                className={`object-contain flex-shrink-0 ${isSidebarCollapsed ? 'w-10 h-10 mx-auto' : 'w-10 h-10'}`}
                onError={(e) => {
                  console.error('Logo failed to load');
                  e.target.onerror = null;
                  e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"%3E%3Ctext x="50%25" y="50%25" font-size="16" text-anchor="middle" dominant-baseline="middle"%3ESS%3C/svg%3E';
                }}
              />

              {!isSidebarCollapsed && (
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-gray-900 sidebar-title">Sparta Sync</h2>
                  </div>
                  <p className="text-xs text-gray-500 sidebar-subtitle">Plataforma CRM</p>
                </div>
              )}

              {/* Botão de Colapsar Sidebar */}
              {!isSidebarCollapsed ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  className="h-8 w-8 rounded-lg hover:bg-gray-100 flex-shrink-0"
                >
                  <ArrowRight className="w-4 h-4 text-gray-600 rotate-180" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  className="absolute -right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 opacity-50 hover:opacity-100 transition-opacity shadow-sm z-10"
                >
                  <ArrowRight className="w-4 h-4 text-gray-600" />
                </Button>
              )}
            </div>

            {/* Content */}
            <nav className="flex-1 flex flex-col gap-2 overflow-y-auto px-3 py-4">
              {navigationItems.map((group, groupIndex) => (
                <div key={groupIndex}>
                  {group.groupTitle && !isSidebarCollapsed && (
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 sidebar-group-label-hidden">
                      {group.groupTitle}
                    </h3>
                  )}
                  <ul className="space-y-1">
                    {group.items.map((item, itemIndex) => (
                      <li key={itemIndex}>
                        {item.disabled ? (
                          <div
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors w-full text-sm text-gray-400 cursor-not-allowed opacity-50 ${isSidebarCollapsed ? 'justify-center gap-0 px-0 sidebar-item-center' : ''}`}
                          >
                            <item.icon className="w-4 h-4 flex-shrink-0" />
                            {!isSidebarCollapsed && <span className="flex-1 text-left sidebar-item-text">{item.title}</span>}
                            {!isSidebarCollapsed && (
                              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full sidebar-item-badge">
                                {item.title === "Telefone" || item.title === "Relatórios" ? "Desabilitado" : "Em breve"}
                              </span>
                            )}
                          </div>
                        ) : (
                          <Link
                            to={item.url}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors w-full text-sm ${location.pathname === item.url ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-gray-700 hover:bg-gray-50'} ${isSidebarCollapsed ? 'justify-center gap-0 px-0 sidebar-item-center' : ''}`}
                          >
                            <item.icon className="w-4 h-4 flex-shrink-0" />
                            {!isSidebarCollapsed && (
                              <>
                                <span className="flex-1 text-left sidebar-item-text">{item.title}</span>
                                {item.badge && (
                                  <span className="text-xs bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-2 py-1 rounded-full sidebar-item-badge font-medium">
                                    {item.badge}
                                  </span>
                                )}
                              </>
                            )}
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>

            {/* Footer */}
            <div className={`flex flex-col gap-2 border-t border-gray-200 px-4 py-2 ${isSidebarCollapsed ? 'p-3 sidebar-footer-padding' : ''}`}>
              {/* NOVO: Toast de Mensagens na Sidebar */}
              {!isSidebarCollapsed && (
                <AnimatePresence>
                  {messageToast && (
                    <MessageToast
                      message={messageToast}
                      onClose={() => setMessageToast(null)}
                      onNavigate={async (msg) => {
                        console.log('[Layout] 🚀 Navegando para conversa:', msg.chat_id);

                        let contactData = msg.contact;

                        if (!contactData && msg.contact_id) {
                          try {
                            contactData = await base44.entities.Contact.get(msg.contact_id);
                          } catch (error) {
                            console.error('[Layout] Erro ao buscar contato:', error);
                          }
                        }

                        // Fechar toast
                        setMessageToast(null);

                        // Navegar para Chat
                        navigate(createPageUrl('Chat'), { 
                          state: { 
                            selectedChatId: msg.chat_id,
                            contact: contactData
                          } 
                        });
                      }}
                    />
                  )}
                </AnimatePresence>
              )}
              <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center sidebar-footer-center' : 'gap-3'}`}>
                <Popover>
                  <PopoverTrigger asChild>
                    <div className="relative cursor-pointer">
                      <Avatar className={`w-10 h-10 border-2 flex-shrink-0 ${
                        user?.role === 'admin' 
                          ? 'border-blue-500' 
                          : user?.role === 'user' && user?.system_role === 'admin'
                          ? 'border-green-700'
                          : 'border-gray-400'
                      }`}>
                        <AvatarImage src={user?.avatar_url} />
                        <AvatarFallback className="bg-blue-500 text-white text-xs">
                          {user?.full_name?.split(' ').map((n) => n[0]).join('') || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      {(unreadNotificationsCount > 0 || unreadMessagesCount > 0) && (
                        <Badge 
                          className={`absolute -top-1.5 -right-1.5 h-5 min-w-[20px] flex items-center justify-center p-0 px-1.5 text-[10px] text-white border-2 border-white rounded-full ${
                            unreadNotificationsCount > 0 && unreadMessagesCount > 0
                              ? 'bg-gradient-to-r from-red-500 to-green-500'
                              : unreadMessagesCount > 0
                              ? 'bg-green-500'
                              : 'bg-red-500'
                          }`}
                        >
                          {(unreadNotificationsCount + unreadMessagesCount) > 9 ? '9+' : unreadNotificationsCount + unreadMessagesCount}
                        </Badge>
                      )}
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0 rounded-2xl" align="end" side="right" sideOffset={8}>
                    <NotificationBellContent />
                  </PopoverContent>
                </Popover>
                {!isSidebarCollapsed && (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate user-info-text">
                      {user?.full_name || 'Usuário'}
                    </p>
                    <p className="text-xs text-gray-500 truncate mt-0.5 user-role-badge">
                      {company?.name || 'Empresa'}
                    </p>
                  </div>
                )}
                {!isSidebarCollapsed && (
                  <div className="flex-shrink-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 settings-button">
                          <Menu className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-lg">
                        <DropdownMenuItem onClick={() => navigate(createPageUrl("ProfileSettings"))} className="flex items-center gap-2 rounded-lg">
                          <UserIcon className="w-4 h-4 mr-2" />
                          Perfil
                        </DropdownMenuItem>
                        {user?.role === 'admin' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => navigate(createPageUrl("Sistema"))} className="flex items-center gap-2 rounded-lg">
                              <Settings className="w-4 h-4 mr-2" />
                              Sistema
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 text-red-600 focus:text-red-600 focus:bg-red-50 rounded-lg">
                          <LogOut className="w-4 h-4 mr-2" />
                          Sair
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            </div>
          </aside>
        )}

        {/* Mobile Sidebar (Drawer) */}
        {isMobile && (
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetContent side="left" className="p-0 w-full max-w-full sm:max-w-xs flex flex-col">
              <SheetHeader className="p-4 border-b border-gray-200 flex-shrink-0">
                <SheetTitle className="flex items-center gap-3">
                  <img
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690a8ae384e85f405dd1958f/f927712ff_ChatGPTImage21denovde202512_16_16.png"
                    alt="Sparta Sync"
                    className="w-10 h-10 object-contain flex-shrink-0"
                    onError={(e) => {
                      console.error('Logo failed to load in mobile');
                      e.target.onerror = null;
                      e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"%3E%3Ctext x="50%25" y="50%25" font-size="16" text-anchor="middle" dominant-baseline="middle"%3ESS%3C/svg%3E';
                    }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-gray-900">Sparta Sync</h2>
                    </div>
                    <p className="text-xs text-gray-500">Plataforma CRM</p>
                  </div>
                </SheetTitle>
              </SheetHeader>

              <nav className="flex-1 flex flex-col gap-2 overflow-y-auto px-3 py-4">
                {navigationItems.map((group, groupIndex) => (
                  <div key={groupIndex}>
                    {group.groupTitle && (
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                        {group.groupTitle}
                      </h3>
                    )}
                    <ul className="space-y-1">
                      {group.items.map((item, itemIndex) => (
                        <li key={itemIndex}>
                          {item.disabled ? (
                            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors w-full text-sm text-gray-400 cursor-not-allowed opacity-50">
                              <item.icon className="w-5 h-5 flex-shrink-0" />
                              <span className="flex-1 text-left">{item.title}</span>
                              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                                {item.title === "Telefone" || item.title === "Relatórios" ? "Desabilitado" : "Em breve"}
                              </span>
                            </div>
                          ) : (
                            <Link
                              to={item.url}
                              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors w-full text-sm ${location.pathname === item.url ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-gray-700 hover:bg-gray-50'}`}
                              onClick={() => setIsMobileMenuOpen(false)}
                            >
                              <item.icon className="w-5 h-5 flex-shrink-0" />
                              <span className="flex-1 text-left">{item.title}</span>
                              {item.badge && (
                                <span className="text-xs bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-2 py-1 rounded-full font-medium">
                                  {item.badge}
                                </span>
                              )}
                            </Link>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </nav>
              {/* Footer for Mobile Sheet - Fixed */}
              <div className="flex-shrink-0 border-t border-gray-200 px-4 py-3 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Popover>
                      <PopoverTrigger asChild>
                        <div className="relative cursor-pointer">
                          <Avatar className={`w-12 h-12 border-2 flex-shrink-0 ${
                            user?.role === 'admin' 
                              ? 'border-blue-500' 
                              : user?.role === 'user' && user?.system_role === 'admin'
                              ? 'border-green-700'
                              : 'border-gray-400'
                          }`}>
                            <AvatarImage src={user?.avatar_url} />
                            <AvatarFallback className="bg-blue-500 text-white text-sm">
                              {user?.full_name?.split(' ').map((n) => n[0]).join('') || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          {(unreadNotificationsCount > 0 || unreadMessagesCount > 0) && (
                            <Badge 
                              className={`absolute -top-1 -right-1 h-5 min-w-[20px] flex items-center justify-center p-0 px-1.5 text-[10px] text-white border-2 border-white rounded-full ${
                                unreadNotificationsCount > 0 && unreadMessagesCount > 0
                                  ? 'bg-gradient-to-r from-red-500 to-green-500'
                                  : unreadMessagesCount > 0
                                  ? 'bg-green-500'
                                  : 'bg-red-500'
                              }`}
                            >
                              {(unreadNotificationsCount + unreadMessagesCount) > 9 ? '9+' : unreadNotificationsCount + unreadMessagesCount}
                            </Badge>
                          )}
                        </div>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-0 rounded-2xl" align="end" side="right" sideOffset={8}>
                        <NotificationBellContent />
                      </PopoverContent>
                    </Popover>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user?.full_name || 'Usuário'}
                      </p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {company?.name || 'Empresa'}
                      </p>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-10 w-10">
                          <Menu className="w-5 h-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-lg">
                        <DropdownMenuItem onClick={() => { navigate(createPageUrl("ProfileSettings")); setIsMobileMenuOpen(false); }} className="flex items-center gap-2 rounded-lg">
                          <UserIcon className="w-4 h-4 mr-2" />
                          Perfil
                        </DropdownMenuItem>
                        {user?.role === 'admin' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => { navigate(createPageUrl("Sistema")); setIsMobileMenuOpen(false); }} className="flex items-center gap-2 rounded-lg">
                              <Settings className="w-4 h-4 mr-2" />
                              Sistema
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 text-red-600 focus:text-red-600 focus:bg-red-50 rounded-lg">
                          <LogOut className="w-4 h-4 mr-2" />
                          Sair
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        )}

        {/* Main Content */}
        <div className="flex flex-col flex-1 overflow-y-auto">
<header className="md:hidden sticky top-0 bg-white/60 backdrop-blur-xl z-10 p-4 border-b border-gray-100 flex items-center justify-between">
  <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(true)} className="h-8 w-8">
    <Menu className="w-5 h-5 text-gray-700" />
  </Button>
  <h1 className="font-bold text-lg text-gray-900">{translatedPageName}</h1>
  <img
    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690a8ae384e85f405dd1958f/230ab1f44_IMG_1304.png"
    alt="Sparta Sync"
    className="h-7 w-7 object-contain"
  />
</header>
          <main className="flex-1 bg-gray-50 p-4 sm:p-6">
            {children}
          </main>
        </div>
      </div>

      {/* ✅ CARDS FLUTUANTES ACUMULADOS */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3">
        {/* Card de Delete/Restore Contatos */}
        {globalBulkProgress.isProcessing && !isBulkProgressModalOpen && (
          <div
            onClick={() => {
              if (currentPageName === 'Contacts') {
                window.dispatchEvent(new CustomEvent('openBulkProgressModal'));
              } else {
                navigate(createPageUrl('Contacts'));
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('openBulkProgressModal'));
                }, 300);
              }
            }}
            className="cursor-pointer hover:scale-105 transition-transform"
          >
            <Card
              className="rounded-2xl shadow-2xl w-80 bg-white"
              style={{
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor: globalBulkProgress.processType === 'delete' ? '#ef4444' : '#3b82f6'
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{
                      backgroundColor: globalBulkProgress.processType === 'delete' ? '#fee2e2' : '#dbeafe'
                    }}
                  >
                    <style>
                        {`
                          @keyframes trash-lid-float {
                            0%, 100% { transform: translateY(0) rotate(0); }
                            50% { transform: translateY(-2px) rotate(-10deg); }
                          }
                          .trash-lid-animated {
                            animation: trash-lid-float 1s ease-in-out infinite;
                          }
                        `}
                      </style>
                    <Trash2 className={`w-5 h-5 ${
                      globalBulkProgress.processType === 'delete'
                        ? 'text-red-600 trash-lid-animated'
                        : 'text-blue-600'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">
                      {globalBulkProgress.processType === 'delete' ? 'Deletando' : 'Restaurando'} Contatos
                    </div>
                    <div className="text-xs text-gray-500">
                      {globalBulkProgress.processed} de {globalBulkProgress.total}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">
                      {globalBulkProgress.total > 0
                        ? Math.round((globalBulkProgress.processed / globalBulkProgress.total) * 100)
                        : 0}%
                    </div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${globalBulkProgress.total > 0 ? (globalBulkProgress.processed / globalBulkProgress.total) * 100 : 0}%`,
                      backgroundColor: globalBulkProgress.processType === 'delete' ? '#ef4444' : '#3b82f6'
                    }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-gray-600">
                  <span>✓ {globalBulkProgress.successful}</span>
                  <span>✗ {globalBulkProgress.failed}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Card de Importação */}
        {globalImportProgress.total > 0 && !globalBulkProgress.isProcessing && (
          <div
            onClick={() => {
              if (currentPageName === 'Contacts') {
                window.dispatchEvent(new CustomEvent('openImportProgressModal'));
              } else {
                navigate(createPageUrl('Contacts'));
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('openImportProgressModal'));
                }, 300);
              }
            }}
            className="cursor-pointer hover:scale-105 transition-transform"
          >
            <Card className="rounded-2xl shadow-2xl w-80 bg-white border-2 border-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-700">
                    <Upload className="w-5 h-5 text-white animate-pulse" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">
                      Importando Contatos
                    </div>
                    <div className="text-xs text-gray-500">
                      {globalImportProgress.processed} de {globalImportProgress.total}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">
                      {globalImportProgress.total > 0
                        ? Math.round((globalImportProgress.processed / globalImportProgress.total) * 100)
                        : 0}%
                    </div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-300 bg-gradient-to-r from-blue-600 to-blue-700"
                    style={{
                      width: `${globalImportProgress.total > 0 ? (globalImportProgress.processed / globalImportProgress.total) * 100 : 0}%`
                    }}
                  />
                </div>
                {/* Removido contadores ✓ e ✗ conforme solicitado */}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Card de Campanha - só aparece quando já começou a enviar (sent > 0 ou failed > 0) */}
        {globalCampaignProgress.total > 0 && (globalCampaignProgress.sent > 0 || globalCampaignProgress.failed > 0) && !globalBulkProgress.isProcessing && !globalImportProgress.isProcessing && !isCampaignProgressModalOpen && (
          <Card className="rounded-2xl shadow-2xl w-80 bg-white border-2 border-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div 
                  onClick={() => {
                    // Verificar se está 100% concluído
                    const isCompleted = (globalCampaignProgress.sent + globalCampaignProgress.failed) >= globalCampaignProgress.total;

                    // Sempre abrir modal de detalhes
                    if (currentPageName === 'Campaign') {
                      window.dispatchEvent(new CustomEvent('openScheduleDetailsModal', {
                        detail: { scheduleId: globalCampaignProgress.schedule_id }
                      }));
                    } else {
                      navigate(createPageUrl('Campaign'));
                      setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('openScheduleDetailsModal', {
                          detail: { scheduleId: globalCampaignProgress.schedule_id }
                        }));
                      }, 300);
                    }

                    // Se concluído, limpar o card após abrir o modal
                    if (isCompleted) {
                      console.log('[Layout] 🧹 Card de campanha concluída clicado, removendo...');
                      localStorage.removeItem('campaignProgress');

                      window.dispatchEvent(new CustomEvent('campaignProgressUpdate', {
                        detail: {
                          isProcessing: false,
                          schedule_id: null,
                          schedule_name: null,
                          is_dynamic: false,
                          campaign_type: 'immediate',
                          total_batches: 1,
                          batches_completed: 0,
                          total: 0,
                          sent: 0,
                          failed: 0,
                          pending: 0,
                          recent_messages: []
                        }
                      }));
                    }
                  }}
                  className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-700 cursor-pointer hover:scale-105 transition-transform"
                >
                  <Send className="w-5 h-5 text-white animate-pulse" />
                </div>
                <div 
                  onClick={() => {
                    const isCompleted = (globalCampaignProgress.sent + globalCampaignProgress.failed) >= globalCampaignProgress.total;
                    if (currentPageName === 'Campaign') {
                      window.dispatchEvent(new CustomEvent('openScheduleDetailsModal', {
                        detail: { scheduleId: globalCampaignProgress.schedule_id }
                      }));
                    } else {
                      navigate(createPageUrl('Campaign'));
                      setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('openScheduleDetailsModal', {
                          detail: { scheduleId: globalCampaignProgress.schedule_id }
                        }));
                      }, 300);
                    }
                    if (isCompleted) {
                      localStorage.removeItem('campaignProgress');
                      window.dispatchEvent(new CustomEvent('campaignProgressUpdate', {
                        detail: { 
                          isProcessing: false, 
                          schedule_id: null, 
                          schedule_name: null, 
                          is_dynamic: false, 
                          campaign_type: 'immediate',
                          total_batches: 1,
                          batches_completed: 0,
                          total: 0, 
                          sent: 0, 
                          failed: 0, 
                          pending: 0, 
                          recent_messages: [] 
                        }
                      }));
                    }
                  }}
                  className="flex-1 cursor-pointer"
                >
                  {(() => {
                    const hasStarted = globalCampaignProgress.sent > 0 || globalCampaignProgress.failed > 0;
                    const campaignType = globalCampaignProgress.campaign_type;
                    const isDynamic = globalCampaignProgress.is_dynamic;

                    // Montar labels
                    let typeLabel = '';
                    if (campaignType === 'recurring') {
                      typeLabel = isDynamic ? 'Recorrente e Dinâmica' : 'Recorrente';
                    } else if (campaignType === 'smart') {
                      typeLabel = 'Inteligente';
                    } else if (campaignType === 'scheduled') {
                      typeLabel = isDynamic ? 'Dinâmica' : 'Agendada';
                    } else {
                      typeLabel = isDynamic ? 'Dinâmica' : 'Enviando';
                    }

                    // Se já começou a enviar, trocar para "Enviando"
                    const finalLabel = hasStarted ? 'Enviando Campanha' : typeLabel;

                    return (
                      <>
                        <div className="font-semibold text-gray-900">
                          {finalLabel}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {globalCampaignProgress.schedule_name}
                        </div>
                      </>
                    );
                  })()}
                </div>
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleSyncCampaignProgress}
                        className="h-7 w-7 rounded-lg hover:bg-blue-50"
                      >
                        <RefreshCw className="w-4 h-4 text-blue-600" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="rounded-lg">
                      <p>Sincronizar progresso</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCloseCampaignCard}
                        className="h-7 w-7 rounded-lg hover:bg-red-50"
                      >
                        <X className="w-4 h-4 text-red-600" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="rounded-lg">
                      <p>Fechar card</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
              <div 
                onClick={() => {
                  const isCompleted = (globalCampaignProgress.sent + globalCampaignProgress.failed) >= globalCampaignProgress.total;
                  if (currentPageName === 'Campaign') {
                    window.dispatchEvent(new CustomEvent('openScheduleDetailsModal', {
                      detail: { scheduleId: globalCampaignProgress.schedule_id }
                    }));
                  } else {
                    navigate(createPageUrl('Campaign'));
                    setTimeout(() => {
                      window.dispatchEvent(new CustomEvent('openScheduleDetailsModal', {
                        detail: { scheduleId: globalCampaignProgress.schedule_id }
                      }));
                    }, 300);
                  }
                  if (isCompleted) {
                    localStorage.removeItem('campaignProgress');
                    window.dispatchEvent(new CustomEvent('campaignProgressUpdate', {
                      detail: { isProcessing: false, schedule_id: null, schedule_name: null, is_dynamic: false, total: 0, sent: 0, failed: 0, pending: 0, recent_messages: [] }
                    }));
                  }
                }}
                className="cursor-pointer"
              >
                <div className="text-right mb-2">
                  <div className="text-lg font-bold text-gray-900">
                    {globalCampaignProgress.total > 0
                      ? Math.round((globalCampaignProgress.sent / globalCampaignProgress.total) * 100)
                      : 0}%
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-300 bg-gradient-to-r from-blue-600 to-blue-700"
                    style={{
                      width: `${globalCampaignProgress.total > 0 ? (globalCampaignProgress.sent / globalCampaignProgress.total) * 100 : 0}%`
                    }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-gray-600">
                  <span>✓ {globalCampaignProgress.sent}</span>
                  {globalCampaignProgress.campaign_type === 'smart' && globalCampaignProgress.total_batches > 1 && (
                    <span className="text-blue-600 font-medium">
                      Dia {globalCampaignProgress.batches_completed + 1}/{globalCampaignProgress.total_batches}
                    </span>
                  )}
                  <span>✗ {globalCampaignProgress.failed}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>





      {/* Atena AI Floating Button and Chat Window */}
      {isAtenaEnabled && (
        <div className="absolute">
          {!isChatOpen && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onMouseDown={handleMouseDown}
                  onMouseEnter={() => setIsAtenaHovered(true)}
                  onMouseLeave={() => setIsAtenaHovered(false)}
                  onClick={(e) => {
                    if (!hasMovedRef.current) {
                      setIsChatOpen(true);
                    }
                  }}
                  className={`fixed h-16 w-16 rounded-full text-white shadow-2xl transition-all duration-300 ${
                    isDragging ? 'atena-button-dragging' : ''
                  } bg-gradient-to-br from-blue-500 to-indigo-600 hover:scale-110 cursor-grab active:cursor-grabbing`}
                  style={{
                    bottom: `${atenaPosition.bottom}px`,
                    right: `${atenaPosition.right}px`,
                    zIndex: 1000,
                    opacity: isAtenaHovered ? 1 : 0.3
                  }}
                >
                  <Sparkles className="w-8 h-8" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="rounded-lg">
                <p>Falar com {company?.settings?.ai_name || 'Atena'}, sua assistente de IA</p>
              </TooltipContent>
            </Tooltip>
          )}
          {isChatOpen && <AtenaChat onClose={() => setIsChatOpen(false)} />}
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && viewingSchedule && (
        <ScheduleDetailsModal
          schedule={viewingSchedule}
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setViewingSchedule(null);
          }}
          onEdit={() => {
            setShowDetailsModal(false);
          }}
        />
      )}

      {/* NOVO: Modal de Progresso de Campanha */}
      <CampaignProgressModal
        isOpen={isCampaignProgressModalOpen}
        onClose={() => {
          setIsCampaignProgressModalOpen(false);
          window.dispatchEvent(new CustomEvent('campaignProgressModalStateChange', {
            detail: { isOpen: false }
          }));
        }}
        campaignData={globalCampaignProgress}
      />

      {/* NOVO: Dialog de confirmação para fechar card de campanha */}
      <AlertDialog open={showCloseCampaignCardDialog} onOpenChange={setShowCloseCampaignCardDialog}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Fechar card de progresso?</AlertDialogTitle>
            <AlertDialogDescription>
              O card de progresso será removido, mas a campanha continuará sendo enviada em segundo plano. Você pode visualizar o progresso novamente na página de Campanhas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCloseCampaignCard} className="rounded-xl bg-blue-600 hover:bg-blue-700">
              Sim, fechar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      </TooltipProvider>
      );
      }