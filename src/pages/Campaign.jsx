import React, { useState, useEffect, useCallback } from "react";
import { User } from "@/entities/User";
import { Contact } from "@/entities/Contact";
import { MessageTemplate } from "@/entities/MessageTemplate";
import { Schedule } from "@/entities/Schedule";
import { Message } from "@/entities/Message";
import { SystemTag } from "@/entities/SystemTag";
import { Plan } from "@/entities/Plan";
import { BatchSchedule } from "@/entities/BatchSchedule";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Send,
  Search,
  Plus,
  Clock,
  Users,
  Calendar,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  FileText,
  AlertCircle,
  LayoutGrid,
  List,
  RefreshCw,
  Zap,
  Download,
  Brain,
  Loader2,
  Copy,
  StopCircle, // Added for cancelling status
  Info,       // Added for default status info
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import ScheduleFormModal from "../components/scheduler/ScheduleFormModal";
import ScheduleDetailsModal from "../components/scheduler/ScheduleDetailsModal";
import BatchApprovalButtons from "../components/campaigns/BatchApprovalButtons";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { useWebSocket } from "../components/hooks/useWebSocket";
import { base44 } from "@/api/base44Client";

export default function Campaign() {
  const [user, setUser] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("andamento");
  const [allMessages, setAllMessages] = useState([]);
  const [campaignUsage, setCampaignUsage] = useState(null);

  const [viewMode, setViewMode] = useState(() => {
    const saved = localStorage.getItem('campaigns_viewMode');
    return saved || "grid";
  });
  
  // ✅ NOVO: Estado para armazenar todos os lotes pendentes (carregados uma única vez)
  const [allPendingBatches, setAllPendingBatches] = useState([]);

  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [viewingSchedule, setViewingSchedule] = useState(null);

  const [notification, setNotification] = useState({
    show: false,
    type: 'success',
    message: ''
  });

  const [updatingScheduleId, setUpdatingScheduleId] = useState(null);
  const [creatingCampaign, setCreatingCampaign] = useState(false);
  const [campaignCreationMessage, setCampaignCreationMessage] = useState('');
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  
  // ✅ NOVO: Estados para spinners individuais nos botões
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewingScheduleId, setViewingScheduleId] = useState(null);
  const [duplicatingScheduleId, setDuplicatingScheduleId] = useState(null);
  const [downloadingReportId, setDownloadingReportId] = useState(null);
  
  // Estado para modal de confirmação de cancelamento
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [scheduleToCancelInfo, setScheduleToCancelInfo] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // NOVO: Estado para progresso de cancelamento em massa
  const [globalCancellationProgress, setGlobalCancellationProgress] = useState({
    isProcessing: false,
    type: null,
    schedule_id: null,
    schedule_name: null,
    total_messages_to_cancel: 0,
    total_batches_to_deny: 0,
    cancelled_messages: 0,
    denied_batches: 0,
    successful: 0,
    failed: 0
  });

  const showNotification = useCallback((type, message) => {
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
  }, []);

  const checkForCreateAction = useCallback(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'create') {
      setShowScheduleForm(true);
    }
  }, []);

  const saveViewPreferences = (preferences) => {
    if (preferences.viewMode !== undefined) {
      localStorage.setItem('campaigns_viewMode', preferences.viewMode);
    }
  };

  const loadContacts = useCallback(async (companyId) => {
    if (!companyId) return;
    try {
      setIsLoadingContacts(true);
      
      const systemTags = await SystemTag.list();
      const invalidNumberTag = systemTags.find(tag => tag.slug === 'invalid_number');
      const numberNotExistsTag = systemTags.find(tag => tag.slug === 'number_not_exists');
      
      const invalidTagIds = [
        invalidNumberTag?.id,
        numberNotExistsTag?.id
      ].filter(Boolean);

      const contactsList = await Contact.filter({ company_id: companyId });
      
      const validContacts = contactsList.filter(contact => {
        if (!contact.tags_system || contact.tags_system.length === 0) return true;
        
        const hasInvalidTag = contact.tags_system.some(tagId => invalidTagIds.includes(tagId));
        
        return !hasInvalidTag;
      });
      
      setContacts(validContacts);
      
      const filteredCount = contactsList.length - validContacts.length;
      if (filteredCount > 0) {
        console.log(`ℹ️ ${filteredCount} contato(s) com número inválido foram filtrados`);
      }
    } catch (error) {
      console.error('Erro ao carregar contatos:', error);
      showNotification('error', 'Erro ao carregar contatos');
    } finally {
      setIsLoadingContacts(false);
    }
  }, [showNotification]);

  // Refactored function to load only schedules and messages for a given company ID
  const loadSchedulesAndMessages = useCallback(async (companyId) => {
    if (!companyId) {
        setSchedules([]);
        setAllMessages([]);
        return []; // Return empty array if no companyId
    }

    try {
        const [scheduleList, messageList] = await Promise.all([
            Schedule.filter({ company_id: companyId }, '-created_date'),
            Message.filter({ company_id: companyId })
        ]);
        
        const schedules = Array.isArray(scheduleList) ? scheduleList : [];
        const messages = Array.isArray(messageList) ? messageList : [];
        setAllMessages(messages);

        const messagesBySchedule = messages.reduce((acc, msg) => {
            const scheduleId = msg.schedule_id;
            if (scheduleId) {
                if (!acc[scheduleId]) {
                    acc[scheduleId] = [];
                }
                acc[scheduleId].push(msg);
            }
            return acc;
        }, {});

        const processedSchedules = schedules.map(schedule => {
            const relatedMessages = messagesBySchedule[schedule.id] || [];
            
            const sent_count = relatedMessages.filter(m => 
                m.status === 'success' || m.status === 'delivered'
            ).length;
            
            const failed_count = relatedMessages.filter(m => 
                m.status === 'failed' || m.status === 'error'
            ).length;
            
            const pending_count = relatedMessages.filter(m => 
                m.status === 'pending'
            ).length;
            
            const processing_count = relatedMessages.filter(m => 
                m.status === 'retry'
            ).length;
            
            const cancelled_count = relatedMessages.filter(m => 
                m.status === 'cancelled' || m.status === 'cancel'
            ).length;
            
            const effectiveTotalRecipients = relatedMessages.length - cancelled_count;
            const totalProcessed = sent_count + failed_count;

            let dynamicStatus = schedule.status;
            
            if (relatedMessages.length > 0 && effectiveTotalRecipients === 0) {
              dynamicStatus = 'cancelled';
            } else if (schedule.status !== 'cancelled' && schedule.status !== 'failed' && schedule.status !== 'cancelling') {
              if (effectiveTotalRecipients > 0 && totalProcessed >= effectiveTotalRecipients) {
                dynamicStatus = 'completed';
              } else if (totalProcessed > 0 || processing_count > 0) {
                // Apenas considerar como processing se houver progresso real (enviado ou retry)
                // Campanhas agendadas com apenas pending devem continuar como pending
                dynamicStatus = 'processing';
              }
              // Se só tem pending_count e nenhum enviado/retry, mantém o status original (pending)
            }
            
            return {
                ...schedule,
                status: dynamicStatus,
                sent_count: sent_count,
                failed_count: failed_count,
                total_recipients: effectiveTotalRecipients || schedule.total_recipients || 0,
            };
        });

        setSchedules(processedSchedules);
        return processedSchedules;
    } catch (error) {
        console.error("Erro ao carregar e processar campanhas:", error);
        setSchedules([]);
        setAllMessages([]);
        throw error;
    }
  }, []);

  // Refactored function to load only templates for a given company ID
  const loadTemplates = useCallback(async (companyId) => {
    if (!companyId) {
      setTemplates([]);
      return;
    }
    try {
      const templateList = await MessageTemplate.filter({ 
        company_id: companyId 
      }, 'name', 50);
      setTemplates(Array.isArray(templateList) ? templateList : []);
    } catch (error) {
      console.error("Erro ao carregar templates:", error);
      setTemplates([]);
    }
  }, []);

  // ✅ NOVO: Função para carregar todos os lotes pendentes de uma vez
  const loadAllPendingBatches = useCallback(async (companyId) => {
    if (!companyId) {
      setAllPendingBatches([]);
      return [];
    }
    
    try {
      const batches = await BatchSchedule.filter({
        company_id: companyId,
        status: 'pending'
      });
      setAllPendingBatches(batches || []);
      return batches || [];
    } catch (error) {
      console.error('Erro ao carregar lotes pendentes:', error);
      setAllPendingBatches([]);
      return [];
    }
  }, []);

  // The main data loading function for initial mount and full refresh
  const loadAllInitialData = useCallback(async () => {
    try {
        setIsLoading(true);
        console.log('Loading user data...');
        const currentUser = await User.me();
        console.log('User loaded:', currentUser);
        setUser(currentUser);

        if (currentUser?.company_id) {
            // Use Promise.all to fetch all initial data concurrently
            // ✅ Incluir lotes pendentes na carga inicial
            await Promise.all([
                loadContacts(currentUser.company_id),
                loadSchedulesAndMessages(currentUser.company_id),
                loadTemplates(currentUser.company_id),
                loadAllPendingBatches(currentUser.company_id),
            ]);
        } else {
             // If no company_id, ensure states are cleared
            setContacts([]);
            setSchedules([]);
            setAllMessages([]);
            setTemplates([]);
            setAllPendingBatches([]);
        }
    } catch (error) {
        console.error("Erro ao carregar todos os dados iniciais:", error);
        // Clear all states on error
        setUser(null);
        setContacts([]);
        setSchedules([]);
        setAllMessages([]);
        setTemplates([]);
        setAllPendingBatches([]);
    } finally {
        setIsLoading(false);
    }
  }, [loadContacts, loadSchedulesAndMessages, loadTemplates, loadAllPendingBatches]);

  // NOVO: Escutar evento para abrir modal de detalhes
  useEffect(() => {
    const handleOpenDetailsModal = async (event) => {
      const scheduleId = event.detail?.scheduleId;
      if (!scheduleId) return;

      try {
        const schedule = await Schedule.get(scheduleId);
        if (schedule) {
          setViewingSchedule(schedule);
          setShowDetailsModal(true);
        }
      } catch (error) {
        console.error('Erro ao buscar campanha para modal:', error);
        showNotification('error', 'Erro ao carregar detalhes da campanha.');
      }
    };

    window.addEventListener('openScheduleDetailsModal', handleOpenDetailsModal);

    return () => {
      window.removeEventListener('openScheduleDetailsModal', handleOpenDetailsModal);
    };
  }, [showNotification]);

  // NOVO: Sincronizar progresso de cancelamento via localStorage/eventos
  useEffect(() => {
    const checkCancellationStatus = () => {
      try {
        const savedProgress = localStorage.getItem('cancellationProgress');
        if (savedProgress) {
          const progress = JSON.parse(savedProgress);
          setGlobalCancellationProgress(progress);
        }
      } catch (error) {
        console.error('[Campaign] Error loading cancellation status:', error);
      }
    };

    checkCancellationStatus();

    const handleCancellationProgressUpdate = (e) => {
      setGlobalCancellationProgress(e.detail);
    };

    window.addEventListener('cancellationProgressUpdate', handleCancellationProgressUpdate);

    return () => {
      window.removeEventListener('cancellationProgressUpdate', handleCancellationProgressUpdate);
    };
  }, []);

  const loadCampaignUsage = useCallback(async () => {
    if (!user?.company_id) return;
    
    try {
      const { data } = await base44.functions.invoke('getSubscriptionStatus');
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
        console.warn('Plano não encontrado:', planId, planError);
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
  }, [user]);

  useEffect(() => {
    loadAllInitialData();
    checkForCreateAction();
  }, [loadAllInitialData, checkForCreateAction]);

  useEffect(() => {
    if (user) {
      loadCampaignUsage();
    }
  }, [user, loadCampaignUsage]);

  // WebSocket para atualizações em tempo real
  const handleWebSocketMessage = useCallback((wsData) => {
    console.log('[Campaign] Recebida atualização WebSocket:', wsData);
    
    if (wsData.type === 'message_updated') {
      // 🔥 EXTRAIR DADOS TANTO DO NÍVEL RAIZ QUANTO DE DENTRO DE data (resiliente)
      const scheduleId = wsData.schedule_id || wsData.data?.schedule_id;
      const messageId = wsData.message_id || wsData.data?.message_id;
      const schedulerJobId = wsData.scheduler_job_id || wsData.data?.scheduler_job_id;
      const status = wsData.status || wsData.data?.status;
      const typeError = wsData.type_error || wsData.data?.type_error;
      const attemptCount = wsData.attempt_count || wsData.data?.attempt_count;
      const errorDetails = wsData.error_details || wsData.data?.error_details;
      const updatedAt = wsData.data?.updated_at || Date.now();
      
      console.log(`[Campaign] 📦 Dados extraídos:`, {
        scheduleId,
        messageId,
        schedulerJobId,
        status,
        typeError
      });
      
      if (!scheduleId) {
        console.warn('[Campaign] ⚠️ schedule_id não encontrado no payload WebSocket');
        return;
      }
      
      // Update the specific message in the local state, then update schedules based on the new message list
      setAllMessages(prevMessages => {
        const updatedMessages = prevMessages.map(msg => {
          if (msg.id === messageId || msg.scheduler_job_id === schedulerJobId) {
            console.log(`[Campaign] Atualizando mensagem ${msg.id} de status ${msg.status} para ${status}`);
            return {
              ...msg,
              status: status,
              type_error: typeError,
              attempt_count: attemptCount,
              error_details: errorDetails,
              updated_at: updatedAt
            };
          }
          return msg;
        });

        // Recalculate the schedule status based on the *just updated* messages list
        setSchedules(prevSchedules => {
          return prevSchedules.map(schedule => {
            if (schedule.id === scheduleId) {
              // Buscar todas as mensagens desta campanha a partir da lista atualizada
              const messagesForThisSchedule = updatedMessages.filter(m => m.schedule_id === scheduleId);
              
              // Atualizar contadores
              const sent_count = messagesForThisSchedule.filter(m => 
                m.status === 'success' || m.status === 'delivered'
              ).length;
              
              const failed_count = messagesForThisSchedule.filter(m => 
                m.status === 'failed' || m.status === 'error'
              ).length;
              
              const pending_count = messagesForThisSchedule.filter(m => 
                m.status === 'pending'
              ).length;
              
              const processing_count = messagesForThisSchedule.filter(m => 
                m.status === 'retry'
              ).length;
              
              const cancelled_count = messagesForThisSchedule.filter(m => 
                m.status === 'cancelled' || m.status === 'cancel'
              ).length;
              
              const effectiveTotalRecipients = messagesForThisSchedule.length - cancelled_count;
              const totalProcessed = sent_count + failed_count;

              let dynamicStatus = schedule.status;
              
              if (messagesForThisSchedule.length > 0 && effectiveTotalRecipients === 0) {
                dynamicStatus = 'cancelled';
              } else if (schedule.status !== 'cancelled' && schedule.status !== 'failed' && schedule.status !== 'cancelling') {
                if (effectiveTotalRecipients > 0 && totalProcessed >= effectiveTotalRecipients) {
                  dynamicStatus = 'completed';
                } else if (totalProcessed > 0 || processing_count > 0) {
                  // Apenas considerar como processing se houver progresso real (enviado ou retry)
                  // Campanhas agendadas com apenas pending devem continuar como pending
                  dynamicStatus = 'processing';
                }
                // Se só tem pending_count e nenhum enviado/retry, mantém o status original (pending)
              }
              
              console.log(`[Campaign] Atualizando campanha ${schedule.id} - Status: ${dynamicStatus}, Enviadas: ${sent_count}, Falhadas: ${failed_count}`);
              
              return {
                ...schedule,
                status: dynamicStatus,
                sent_count: sent_count,
                failed_count: failed_count,
                total_recipients: effectiveTotalRecipients || schedule.total_recipients || 0,
              };
            }
            return schedule;
          });
        });
        
        return updatedMessages;
      });
    } else if (wsData.type === 'cancellation_progress_update') {
      // Atualizar progresso de cancelamento global
      setGlobalCancellationProgress(wsData.data);
    }
  }, []);

  useWebSocket(
    user?.company_id,
    handleWebSocketMessage,
    ['message_updated', 'cancellation_progress_update']
  );

  const handleCreateSchedule = useCallback(async (scheduleData) => {
    try {
      console.log('Criando campanha com dados:', scheduleData);
      
      setCreatingCampaign(true);
      setCampaignCreationMessage('Processando campanha...');
      
      const response = await base44.functions.invoke('createSchedule', scheduleData);
      
      console.log('Resposta da criação rápida:', response);
      
      if (response.data?.success) {
        setCampaignCreationMessage('Campanha criada com sucesso!');
        if (user?.company_id) {
          await loadSchedulesAndMessages(user.company_id);
        }
        
        setTimeout(() => {
          setCreatingCampaign(false);
          setCampaignCreationMessage('');
        }, 2000);
        
        return response.data;
      } else {
        const errorMsg = response.data?.error || 'Erro desconhecido';
        setCampaignCreationMessage(`Erro: ${errorMsg}`);
        
        setTimeout(() => {
          setCreatingCampaign(false);
          setCampaignCreationMessage('');
        }, 5000);
        
        return response.data;
      }
    } catch (error) {
      console.error('Erro ao criar campanha:', error);
      setCampaignCreationMessage(`Erro: ${error.message}`);
      
      setTimeout(() => {
        setCreatingCampaign(false);
        setCampaignCreationMessage('');
      }, 5000);
      
      return { success: false, error: error.message };
    }
  }, [loadSchedulesAndMessages, user]);

  const handleUpdateSingleCampaign = useCallback(async (scheduleId) => {
    if (updatingScheduleId) return;
    
    setUpdatingScheduleId(scheduleId);
    try {
      const response = await base44.functions.invoke('syncCampaignMessages', { schedule_id: scheduleId });
      const updatedCount = response.data?.updated_count ?? 0;

      if (response.data?.success) {
        showNotification('success', `Sincronização concluída! ${updatedCount} mensagens atualizadas.`);
        if (user?.company_id) {
          await loadSchedulesAndMessages(user.company_id);
        }
      } else {
        const errorMsg = response.data?.error || "Falha na sincronização.";
        showNotification('error', `Erro na sincronização: ${errorMsg}`);
      }
    } catch (error) {
      console.error('Erro ao atualizar campanha:', error);
      showNotification('error', `Erro inesperado: ${error.message}`);
    } finally {
      setUpdatingScheduleId(null);
    }
  }, [updatingScheduleId, showNotification, loadSchedulesAndMessages, user]);

  const handleViewDetails = async (schedule) => {
    setViewingScheduleId(schedule.id);
    try {
      // Verificar status atual no Cloudflare antes de abrir
      const response = await base44.functions.invoke('checkCampaignStatus', { schedule_id: schedule.id });
      
      let scheduleToView = schedule;

      // Se o status mudou, recarregar a lista de campanhas
      if (response.data?.status_changed && user?.company_id) {
        console.log(`[Campaign] Status da campanha ${schedule.id} mudou, recarregando lista...`);
        // Reload all schedules to get the updated list and state
        await loadSchedulesAndMessages(user.company_id);
        
        // Buscar o schedule atualizado
        const updatedSchedule = await Schedule.get(schedule.id);
        if (updatedSchedule) {
          scheduleToView = updatedSchedule;
        } else {
          console.warn(`[Campaign] Não foi possível encontrar a campanha atualizada com ID: ${schedule.id}`);
        }
      } else {
        console.log(`[Campaign] Status da campanha ${schedule.id} inalterado ou user.company_id não disponível.`);
      }
      
      setViewingSchedule(scheduleToView);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Erro ao verificar status da campanha ou carregar dados:', error);
      // Fallback to viewing the original schedule if there's an error
      setViewingSchedule(schedule);
      setShowDetailsModal(true);
    } finally {
      setViewingScheduleId(null);
    }
  };

  const handleEditSchedule = (schedule) => {
    if (schedule.type === 'immediate') {
      showNotification('info', 'Campanhas de envio imediato não podem ser editadas após a criação.');
      return;
    }
    
    setEditingSchedule(schedule);
    setShowScheduleForm(true);
  };

  const handleCancelSchedule = async (schedule) => {
    const now = Date.now();
    const fiveSecondsFromNow = now + (5 * 1000);
    
    const relatedMessages = allMessages.filter(m => m.schedule_id === schedule.id);
    const cancellableMessages = relatedMessages.filter(msg => 
      msg.status === 'pending' && 
      msg.scheduler_job_id && 
      msg.run_at && 
      new Date(msg.run_at).getTime() > fiveSecondsFromNow
    );

    // Para campanhas recorrentes/dinâmicas, também precisamos negar lotes pendentes
    let pendingBatchesToDeny = [];
    if (schedule.type === 'recurring' || schedule.is_dynamic_campaign) {
      pendingBatchesToDeny = allPendingBatches.filter(
        batch => batch.schedule_id === schedule.id
      );
    }

    const totalActions = cancellableMessages.length + pendingBatchesToDeny.length;
    
    if (totalActions === 0) {
      showNotification('info', 'Não há mensagens agendadas ou lotes pendentes para cancelar.');
      return;
    }

    // Armazenar info para o modal de confirmação
    setScheduleToCancelInfo({
      schedule,
      cancellableMessages,
      pendingBatchesToDeny,
      originalStatus: schedule.status
    });
    setShowCancelDialog(true);
  };

  const confirmCancelSchedule = async () => {
    if (!scheduleToCancelInfo) return;
    
    const { schedule } = scheduleToCancelInfo;
    
    setIsCancelling(true);
    setShowCancelDialog(false);
    
    try {
      // Update otimista
      setSchedules(prevSchedules => 
        prevSchedules.map(s => 
          s.id === schedule.id ? { ...s, status: 'cancelling' } : s
        )
      );

      // Usar nova função unificada de cancelamento
      const response = await base44.functions.invoke('cancelCampaign', {
        schedule_id: schedule.id
      });

      if (response.data?.success) {
        showNotification('success', 
          `Campanha cancelada! ${response.data.cancelled_messages || 0} mensagens e ${response.data.cancelled_batches || 0} lotes cancelados.`
        );
      } else {
        throw new Error(response.data?.error || 'Erro ao cancelar campanha');
      }
      
      // Recarregar dados
      if (user?.company_id) {
        await Promise.all([
          loadSchedulesAndMessages(user.company_id),
          loadAllPendingBatches(user.company_id)
        ]);
      }

    } catch (error) {
      console.error("Erro ao cancelar campanha:", error);
      showNotification('error', `Erro ao cancelar campanha: ${error.message}`);
      
      // Reverter status otimista
      setSchedules(prevSchedules => 
        prevSchedules.map(s => 
          s.id === schedule.id ? { ...s, status: scheduleToCancelInfo.originalStatus } : s
        )
      );
    } finally {
      setIsCancelling(false);
      setScheduleToCancelInfo(null);
    }
  };

  const handleDuplicateCampaign = async (schedule) => {
    setDuplicatingScheduleId(schedule.id);
    console.log('Iniciando duplicação da campanha:', schedule);
    
    try {
      let fullSchedule = schedule;
      if (!schedule.recipients || schedule.recipients.length === 0 || !schedule.delivery_settings || !schedule.recurrence_settings) {
        try {
          const fetchedSchedule = await Schedule.get(schedule.id);
          if (fetchedSchedule) {
            fullSchedule = { ...schedule, ...fetchedSchedule };
          }
        } catch (error) {
          console.error('Erro ao buscar dados completos da campanha:', error);
        }
      }
      
      const selectedContactIds = fullSchedule.recipients?.map(r => r.contact_id).filter(Boolean) || [];
      const selectedTemplateIds = fullSchedule.template_ids || fullSchedule.selected_templates || [];
      const selectedSessionNames = fullSchedule.selected_sessions || [];
      
      console.log('Contatos a copiar:', selectedContactIds);
      console.log('Templates a copiar:', selectedTemplateIds);
      console.log('Sessões a copiar:', selectedSessionNames);
      
      const duplicatedSchedule = {
        name: `${fullSchedule.name} (Cópia)`,
        type: fullSchedule.type || 'scheduled',
        schedule_type: fullSchedule.type || fullSchedule.schedule_type || 'scheduled',
        message_type: fullSchedule.message_type || 'whatsapp',
        template_ids: selectedTemplateIds,
        selected_templates: selectedTemplateIds,
        selected_contacts: selectedContactIds,
        recipients: fullSchedule.recipients || [],
        total_recipients: selectedContactIds.length,
        contact_filters: fullSchedule.contact_filters || [],
        filter_logic: fullSchedule.filter_logic || 'AND',
        is_dynamic_campaign: fullSchedule.is_dynamic_campaign || false,
        selected_sessions: selectedSessionNames,
        session_sending_strategy: fullSchedule.session_sending_strategy || 'sequential',
        delivery_settings: {
          speed_mode: fullSchedule.delivery_settings?.speed_mode || 'conservative',
          respect_business_hours: fullSchedule.delivery_settings?.respect_business_hours ?? true,
          start_hour: fullSchedule.delivery_settings?.start_hour ?? 8,
          end_hour: fullSchedule.delivery_settings?.end_hour ?? 18,
          interval_type: fullSchedule.delivery_settings?.interval_type || 'random',
          interval_random_min: fullSchedule.delivery_settings?.interval_random_min || 20000,
          interval_random_max: fullSchedule.delivery_settings?.interval_random_max || 60000
        },
        recurrence_settings: fullSchedule.recurrence_settings ? {
          type: fullSchedule.recurrence_settings.type || 'daily',
          frequency: fullSchedule.recurrence_settings.frequency || 1,
          end_type: fullSchedule.recurrence_settings.end_type || 'after_count',
          end_count: fullSchedule.recurrence_settings.end_count || 30,
          end_date: fullSchedule.recurrence_settings.end_date || null,
          day_of_week: fullSchedule.recurrence_settings.day_of_week || null,
          day_of_month: fullSchedule.recurrence_settings.day_of_month || null
        } : {
          type: 'daily',
          frequency: 1,
          end_type: 'after_count',
          end_count: 30
        },
        scheduled_date: '',
        scheduled_time: '',
        status: 'pending',
        sent_count: 0,
        failed_count: 0,
        processed_recipients_count: 0
      };
      
      console.log('Campanha duplicada preparada:', duplicatedSchedule);
      
      setEditingSchedule(duplicatedSchedule);
      setShowScheduleForm(true);
    } finally {
      setDuplicatingScheduleId(null);
    }
  };

  const handleDownloadReport = async (schedule, format) => {
    if (schedule.status !== 'completed') {
      showNotification('info', 'Relatórios só podem ser baixados para campanhas concluídas.');
      return;
    }

    setDownloadingReportId(schedule.id);
    try {
      const response = await base44.functions.invoke('generateCampaignReport', {
        schedule_id: schedule.id,
        format: format
      });
      
      if (response.data) {
        const blob = new Blob([response.data], {
          type: format === 'csv' 
            ? 'text/csv;charset=utf-8;'
            : 'application/pdf'
        });
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Relatorio_${schedule.name}_${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'pdf'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        showNotification('success', `Relatório ${format === 'csv' ? 'CSV' : 'PDF'} baixado com sucesso!`);
      } else {
        showNotification('error', 'Erro ao gerar relatório');
      }
    } catch (error) {
      console.error('Erro ao baixar relatório:', error);
      showNotification('error', 'Erro ao baixar relatório: ' + error.message);
    } finally {
      setDownloadingReportId(null);
    }
  };

  const getCampaignStatusInfo = (status) => {
    switch (status) {
      case 'completed': return { text: 'Concluída', color: 'text-green-600', icon: CheckCircle2 };
      case 'processing': return { text: 'Enviando', color: 'text-blue-600', icon: Send };
      case 'pending': return { text: 'Agendada', color: 'text-yellow-600', icon: Clock };
      case 'scheduled': return { text: 'Recorrente', color: 'text-purple-600', icon: RefreshCw };
      case 'failed': return { text: 'Falhou', color: 'text-red-600', icon: AlertCircle };
      case 'cancelled': return { text: 'Cancelada', color: 'text-gray-600', icon: StopCircle };
      case 'cancelling': return { text: 'Cancelando...', color: 'text-orange-600', icon: Loader2 };
      default: return { text: status, color: 'text-gray-600', icon: Info };
    }
  };

  const getStatusColor = (status) => {
    if (!status) {
      return 'bg-gray-100 text-gray-800 border-gray-200';
    }
    
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'scheduled': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelling': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status) => {
    if (!status || status === 'undefined' || status === 'null') {
      return 'Pendente';
    }
    
    switch (status) {
      case 'pending': return 'Agendada';
      case 'scheduled': return 'Recorrente';
      case 'processing': return 'Enviando';
      case 'completed': return 'Concluída';
      case 'failed': return 'Falhou';
      case 'cancelled': return 'Cancelada';
      case 'cancelling': return 'Cancelando...';
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const filteredSchedules = schedules
    .filter(schedule => {
      if (searchTerm && !schedule.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      switch (activeTab) {
        case 'andamento': return schedule.status === 'pending' || schedule.status === 'processing' || schedule.status === 'scheduled';
        case 'scheduled': return schedule.status === 'pending' || schedule.status === 'scheduled';
        case 'completed': return schedule.status === 'completed';
        case 'failed': return schedule.status === 'failed';
        default: return false;
      }
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_date || 0);
      const dateB = new Date(b.created_date || 0);
      return dateB.getTime() - dateA.getTime();
    });

  const renderScheduleCard = (schedule) => {
    const isPastOrPresent = schedule.scheduled_date && new Date(schedule.scheduled_date) <= new Date();
    const canEdit = schedule.type !== 'immediate' && schedule.status === 'pending' && !isPastOrPresent; 

    const now = Date.now();
    const fiveSecondsFromNow = now + (5 * 1000);
    const relatedMessages = allMessages.filter(m => m.schedule_id === schedule.id);
    const hasCancellableMessages = relatedMessages.some(msg => 
      msg.status === 'pending' && 
      msg.scheduler_job_id && 
      msg.run_at && 
      new Date(msg.run_at).getTime() > fiveSecondsFromNow
    );
    
    // Verificar se há lotes pendentes para campanhas recorrentes/dinâmicas
    const hasPendingBatches = (schedule.type === 'recurring' || schedule.is_dynamic_campaign) && 
      allPendingBatches.some(batch => batch.schedule_id === schedule.id);
    
    const canCancel = schedule.status !== 'cancelling' && 
                      schedule.status !== 'cancelled' && 
                      (hasCancellableMessages || hasPendingBatches);

    const CampaignStatusIcon = getCampaignStatusInfo(schedule.status).icon;

    return (
      <Card key={schedule.id} className="rounded-3xl border-gray-200 hover:shadow-lg transition-shadow group flex flex-col overflow-hidden">
        <CardContent className="p-4 sm:p-6 flex flex-col flex-1">
          <div className="flex items-start justify-between mb-4">
            <div className="relative w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 sm:p-1 shadow-md border">
                {schedule.type === 'immediate' && <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-orange-600" title="Envio Imediato" />}
                {schedule.type === 'scheduled' && <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-600" title="Envio Agendado" />}
                {schedule.type === 'recurring' && (
                  schedule.is_dynamic_campaign ? (
                    <Brain className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-teal-600" title="Recorrente Dinâmica" />
                  ) : (
                    <RefreshCw className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-purple-600" title="Envio Recorrente" />
                  )
                )}
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity rounded-xl h-8 w-8 p-0"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
                <DropdownMenuItem onClick={() => handleViewDetails(schedule)} className="rounded-lg">
                  <Eye className="w-4 h-4 mr-2" />
                  Ver Detalhes
                </DropdownMenuItem>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className={`flex items-center px-2 py-1.5 text-sm cursor-pointer hover:bg-gray-100 rounded-lg ${schedule.status !== 'completed' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      <Download className="w-4 h-4 mr-2" />
                      Baixar Relatório
                      {schedule.status !== 'completed' && <span className="ml-2 text-xs text-gray-400">(Apenas concluídas)</span>}
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="left" className="rounded-xl">
                    <DropdownMenuItem 
                      onClick={() => handleDownloadReport(schedule, 'csv')} 
                      className="rounded-lg"
                      disabled={schedule.status !== 'completed'}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      CSV (.csv)
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDownloadReport(schedule, 'pdf')} 
                      className="rounded-lg"
                      disabled={schedule.status !== 'completed'}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      PDF (.pdf)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenuItem 
                  onClick={() => handleDuplicateCampaign(schedule)} 
                  className="rounded-lg"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Reaproveitar
                </DropdownMenuItem>

                <DropdownMenuItem 
                  onClick={() => handleEditSchedule(schedule)} 
                  disabled={!canEdit}
                  className="rounded-lg data-[disabled]:text-gray-400"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleCancelSchedule(schedule)} 
                  disabled={!canCancel}
                  className="rounded-lg text-red-600 data-[disabled]:text-gray-400"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  {schedule.status === 'cancelling' ? 'Cancelando...' : 'Cancelar'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="space-y-3 flex-1 min-w-0">
            <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 text-base sm:text-lg mb-2 truncate" title={schedule.name}>
              {schedule.name}
            </h3>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mb-3">
              <Badge className={`text-[10px] sm:text-xs rounded-full px-2 sm:px-3 py-0.5 sm:py-1 border whitespace-nowrap ${getStatusColor(schedule.status)} ${schedule.status === 'cancelling' ? 'animate-pulse' : ''}`}>
                {schedule.status === 'cancelling' && <Loader2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1 animate-spin inline" />}
                {getStatusText(schedule.status)}
              </Badge>

              {/* Type Badge */}
              {schedule.type === 'recurring' && (
                <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-[10px] sm:text-xs rounded-full whitespace-nowrap">
                  Recorrente
                </Badge>
              )}
              {schedule.type === 'smart' && (
                <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 text-[10px] sm:text-xs rounded-full whitespace-nowrap">
                  Inteligente
                </Badge>
              )}
              {schedule.type === 'scheduled' && !schedule.is_dynamic_campaign && (
                <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px] sm:text-xs rounded-full whitespace-nowrap">
                  Agendado
                </Badge>
              )}
              {schedule.type === 'immediate' && (
                <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-[10px] sm:text-xs rounded-full whitespace-nowrap">
                  Imediato
                </Badge>
              )}

              {/* Dynamic Badge */}
              {schedule.is_dynamic_campaign && (
                <Badge className="bg-teal-100 text-teal-700 border-teal-200 text-[10px] sm:text-xs rounded-full whitespace-nowrap">
                  Dinâmica
                </Badge>
              )}

              <Badge variant="outline" className="text-[10px] sm:text-xs rounded-full whitespace-nowrap">
                {schedule.message_type === 'whatsapp' ? 'WhatsApp' : schedule.message_type}
              </Badge>
            </div>
            </div>

            <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                <span className="truncate">{schedule.total_recipients || 0} destinatários</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                <span className="truncate">
                  {schedule.type === 'immediate' ? 'Imediato' :
                   schedule.type === 'smart' ? 'Inteligente' :
                   schedule.type === 'scheduled' ? 'Agendado' : 'Recorrente'}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                <span className="truncate">
                  {format(new Date(schedule.created_date), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                </span>
              </div>
              
              {schedule.selected_sessions && (
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                  <span className="truncate">{schedule.selected_sessions.length} sessões</span>
                </div>
              )}
            </div>

            {schedule.scheduled_date && schedule.type === 'scheduled' && schedule.status !== 'cancelled' && (
              <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 text-xs sm:text-sm text-blue-700">
                  <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="truncate">
                    Agendada: {(() => {
                      const relatedMessagesWithRunAt = allMessages.filter(m => m.schedule_id === schedule.id && m.run_at);
                      
                      if (relatedMessagesWithRunAt.length > 0) {
                        const validRunAts = relatedMessagesWithRunAt
                          .map(m => {
                            const runAt = typeof m.run_at === 'string' ? parseInt(m.run_at) : m.run_at;
                            return runAt && !isNaN(runAt) ? runAt : null;
                          })
                          .filter(Boolean);
                        
                        if (validRunAts.length > 0) {
                          const earliestRunAt = Math.min(...validRunAts);
                          const scheduledDate = new Date(earliestRunAt); 
                          
                          return new Intl.DateTimeFormat('pt-BR', {
                            timeZone: 'America/Sao_Paulo',
                            year: 'numeric',
                            month: '2-digit', 
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                          }).format(scheduledDate);
                        }
                      }
                      
                      const scheduledDate = new Date(schedule.scheduled_date);
                      return new Intl.DateTimeFormat('pt-BR', {
                        timeZone: 'America/Sao_Paulo',
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                      }).format(scheduledDate);
                    })()}
                  </span>
                </div>
              </div>
            )}

            {schedule.status === 'processing' && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs sm:text-sm mb-2">
                  <span className="text-gray-600">Progresso</span>
                  <span className="text-gray-600">
                    {schedule.sent_count || 0} / {schedule.total_recipients || 0}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                  <div
                    className="bg-blue-600 h-1.5 sm:h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${((schedule.sent_count || 0) / (schedule.total_recipients || 1)) * 100}%`
                    }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 gap-1.5 sm:gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleViewDetails(schedule)}
              disabled={viewingScheduleId === schedule.id}
              className="flex-1 min-w-0 rounded-xl text-xs sm:text-sm h-8 sm:h-9"
            >
              {viewingScheduleId === schedule.id ? (
                <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 flex-shrink-0 animate-spin" />
              ) : (
                <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
              )}
              <span className="truncate">Ver Detalhes</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleUpdateSingleCampaign(schedule.id)}
              disabled={updatingScheduleId !== null || schedule.status === 'completed' || schedule.status === 'cancelling'}
              className="rounded-xl px-2 sm:px-3 h-8 sm:h-9"
              title="Atualizar status da campanha"
            >
              {updatingScheduleId === schedule.id ? (
                <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              )}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl px-2 sm:px-3 h-8 sm:h-9"
              onClick={() => handleDuplicateCampaign(schedule)}
              disabled={duplicatingScheduleId === schedule.id}
              title="Reaproveitar campanha"
            >
              {duplicatingScheduleId === schedule.id ? (
                <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
              ) : (
                <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              )}
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={`rounded-xl px-2 sm:px-3 h-8 sm:h-9 ${schedule.status !== 'completed' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={schedule.status !== 'completed' || downloadingReportId === schedule.id}
                  title="Baixar relatório"
                >
                  {downloadingReportId === schedule.id ? (
                    <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
                <DropdownMenuItem 
                  onClick={() => handleDownloadReport(schedule, 'csv')} 
                  className="rounded-lg"
                  disabled={schedule.status !== 'completed'}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Relatório CSV
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleDownloadReport(schedule, 'pdf')} 
                  className="rounded-lg"
                  disabled={schedule.status !== 'completed'}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Relatório PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Botões de aprovação para campanhas recorrentes */}
          {schedule.type === 'recurring' && (
            <BatchApprovalButtons
              schedule={schedule}
              companyId={user?.company_id}
              allPendingBatches={allPendingBatches}
              onApproved={() => {
                if (user?.company_id) {
                  loadSchedulesAndMessages(user.company_id);
                  loadAllPendingBatches(user.company_id);
                }
              }}
              onDenied={() => {
                if (user?.company_id) {
                  loadSchedulesAndMessages(user.company_id);
                  loadAllPendingBatches(user.company_id);
                }
              }}
              showNotification={showNotification}
            />
          )}
        </CardContent>
      </Card>
    );
  };

  const renderScheduleListItem = (schedule) => {
    const isPastOrPresent = schedule.scheduled_date && new Date(schedule.scheduled_date) <= new Date();
    const canEdit = schedule.type !== 'immediate' && schedule.status === 'pending' && !isPastOrPresent; 

    const now = Date.now();
    const fiveSecondsFromNow = now + (5 * 1000);
    const relatedMessages = allMessages.filter(m => m.schedule_id === schedule.id);
    const hasCancellableMessages = relatedMessages.some(msg => 
      msg.status === 'pending' && 
      msg.scheduler_job_id && 
      msg.run_at && 
      new Date(msg.run_at).getTime() > fiveSecondsFromNow
    );
    
    // Verificar se há lotes pendentes para campanhas recorrentes/dinâmicas
    const hasPendingBatches = (schedule.type === 'recurring' || schedule.is_dynamic_campaign) && 
      allPendingBatches.some(batch => batch.schedule_id === schedule.id);
    
    const canCancel = schedule.status !== 'cancelling' && 
                      schedule.status !== 'cancelled' && 
                      (hasCancellableMessages || hasPendingBatches);

    return (
    <Card key={schedule.id} className="rounded-3xl border-gray-200 hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="relative w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
               <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-md border">
                {schedule.type === 'immediate' && <Zap className="w-3 h-3 text-orange-600" title="Envio Imediato" />}
                {schedule.type === 'scheduled' && <Clock className="w-3 h-3 text-blue-600" title="Envio Agendado" />}
                {schedule.type === 'recurring' && (
                  schedule.is_dynamic_campaign ? (
                    <Brain className="w-3 h-3 text-teal-600" title="Recorrente Dinâmica" />
                  ) : (
                    <RefreshCw className="w-3 h-3 text-purple-600" title="Envio Recorrente" />
                  )
                )}
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="font-semibold text-gray-900 truncate">
                  {schedule.name}
                </h3>
                
                {/* Type Badges FIRST */}
                {schedule.type === 'immediate' && (
                  <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs rounded-full whitespace-nowrap">
                    Imediato
                  </Badge>
                )}
                {schedule.type === 'smart' && (
                  <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 text-xs rounded-full whitespace-nowrap">
                    Inteligente
                  </Badge>
                )}
                {schedule.type === 'scheduled' && !schedule.is_dynamic_campaign && schedule.type !== 'smart' && (
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs rounded-full whitespace-nowrap">
                    Agendado
                  </Badge>
                )}
                {schedule.type === 'recurring' && (
                  <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-xs rounded-full whitespace-nowrap">
                    Recorrente
                  </Badge>
                )}
                {schedule.is_dynamic_campaign && (
                  <Badge className="bg-teal-100 text-teal-700 border-teal-200 text-xs rounded-full whitespace-nowrap">
                    Dinâmica
                  </Badge>
                )}
                
                {/* Status Badge SECOND */}
                <Badge className={`text-xs rounded-full ${getStatusColor(schedule.status)} ${schedule.status === 'cancelling' ? 'animate-pulse' : ''}`}>
                  {schedule.status === 'cancelling' && <Loader2 className="w-3 h-3 mr-1 animate-spin inline" />}
                  {getStatusText(schedule.status)}
                </Badge>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {schedule.total_recipients || 0} destinatários
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {schedule.type === 'scheduled' && schedule.status !== 'cancelled' ? (() => {
                      const relatedMessagesWithRunAt = relatedMessages.filter(m => m.run_at);
                      if (relatedMessagesWithRunAt.length > 0) {
                        const validRunAts = relatedMessagesWithRunAt
                          .map(m => {
                            const msgRunAt = typeof m.run_at === 'string' ? parseInt(m.run_at) : m.run_at;
                            return msgRunAt && !isNaN(msgRunAt) ? msgRunAt : null;
                          })
                          .filter(Boolean);
                        
                        if (validRunAts.length > 0) {
                          const earliestRunAt = Math.min(...validRunAts);
                          const scheduledDate = new Date(earliestRunAt);
                           return new Intl.DateTimeFormat('pt-BR', {
                             timeZone: 'America/Sao_Paulo',
                             year: 'numeric',
                             month: '2-digit', 
                             day: '2-digit',
                             hour: '2-digit',
                             minute: '2-digit',
                             hour12: false
                           }).format(scheduledDate);
                        }
                      }
                      return schedule.scheduled_date ? format(new Date(schedule.scheduled_date), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : format(new Date(schedule.created_date), 'dd/MM/yyyy', { locale: ptBR });
                    })() : format(new Date(schedule.created_date), 'dd/MM/yyyy', { locale: ptBR })
                  }
                </span>
                <Badge variant="outline" className="text-xs">
                  {schedule.message_type === 'whatsapp' ? 'WhatsApp' : schedule.message_type}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleViewDetails(schedule)}
              disabled={viewingScheduleId === schedule.id}
              className="rounded-xl"
            >
              {viewingScheduleId === schedule.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => handleDuplicateCampaign(schedule)}
              disabled={duplicatingScheduleId === schedule.id}
              title="Reaproveitar campanha"
            >
              {duplicatingScheduleId === schedule.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className={`rounded-xl ${schedule.status !== 'completed' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={schedule.status !== 'completed' || downloadingReportId === schedule.id}
                >
                  {downloadingReportId === schedule.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
                <DropdownMenuItem 
                  onClick={() => handleDownloadReport(schedule, 'csv')} 
                  className="rounded-lg"
                  disabled={schedule.status !== 'completed'}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  CSV (.csv)
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleDownloadReport(schedule, 'pdf')} 
                  className="rounded-lg"
                  disabled={schedule.status !== 'completed'}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  PDF (.pdf)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="rounded-xl">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
                <DropdownMenuItem onClick={() => handleViewDetails(schedule)} className="rounded-lg">
                  <Eye className="w-4 h-4 mr-2" />
                  Ver Detalhes
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleDuplicateCampaign(schedule)} 
                  className="rounded-lg"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Reaproveitar
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleEditSchedule(schedule)} 
                  disabled={!canEdit}
                  className="rounded-lg data-[disabled]:text-gray-400"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleCancelSchedule(schedule)}
                  disabled={!canCancel}
                  className="rounded-lg text-red-600 data-[disabled]:text-gray-400"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  {schedule.status === 'cancelling' ? 'Cancelando...' : 'Cancelar'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  )};
  
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
                console.error('Logo failed to load on Campaign page');
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
    <div className="space-y-6 max-w-full overflow-hidden">
      {creatingCampaign && (
        <div className="fixed top-4 right-4 z-[9999]">
          <Alert className={`rounded-2xl shadow-xl border-2 min-w-[300px] ${
            campaignCreationMessage.includes('sucesso') 
              ? 'bg-green-50 border-green-200' 
              : campaignCreationMessage.includes('Erro') 
              ? 'bg-red-50 border-red-200' 
              : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-center gap-3">
              {campaignCreationMessage.includes('Processando') && (
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              )}
              {campaignCreationMessage.includes('sucesso') && (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              )}
              {campaignCreationMessage.includes('Erro') && (
                <AlertCircle className="w-5 h-5 text-red-600" />
              )}
              <AlertDescription className={`font-medium ${
                campaignCreationMessage.includes('sucesso') 
                  ? 'text-green-800' 
                  : campaignCreationMessage.includes('Erro') 
                  ? 'text-red-800' 
                  : 'text-blue-800'
              }`}>
                {campaignCreationMessage}
              </AlertDescription>
            </div>
          </Alert>
        </div>
      )}

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Campanhas</h1>
            <p className="text-sm sm:text-base text-gray-600 hidden sm:block">
              Gerencie e agende envios de mensagens
            </p>
          </div>
        </div>

        {/* Campaign Usage Badge */}
        {campaignUsage && (
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 sm:px-4 py-2 text-xs sm:text-sm">
            <Calendar className="w-4 h-4 text-gray-600 flex-shrink-0" />
            <div className="flex flex-wrap gap-x-2 gap-y-1">
              <span>
                <span className="font-medium text-gray-900">
                  {campaignUsage.recurring.used}/{campaignUsage.recurring.limit === -1 ? '∞' : campaignUsage.recurring.limit}
                </span>
                <span className="text-gray-600 ml-1">recorrentes</span>
              </span>
              <span className="text-gray-400 hidden sm:inline">•</span>
              <span>
                <span className="font-medium text-gray-900">
                  {campaignUsage.dynamic.used}/{campaignUsage.dynamic.limit === -1 ? '∞' : campaignUsage.dynamic.limit}
                </span>
                <span className="text-gray-600 ml-1">dinâmicas</span>
              </span>
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
            onClick={async () => {
              if (user?.company_id) {
                setIsRefreshing(true);
                try {
                  await Promise.all([
                    loadSchedulesAndMessages(user.company_id),
                    loadAllPendingBatches(user.company_id),
                    loadCampaignUsage()
                  ]);
                } finally {
                  setIsRefreshing(false);
                }
              } else {
                showNotification('error', 'Não foi possível carregar os dados.');
              }
            }}
            variant="outline"
            disabled={isRefreshing}
            className="rounded-xl h-10 w-10 p-0"
            size="icon"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>

          <Button
            onClick={() => {
              setEditingSchedule(null);
              setShowScheduleForm(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 rounded-xl flex-1"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Campanha
          </Button>
        </div>

        {/* Mobile: Barra de pesquisa */}
        <div className="relative w-full sm:hidden">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar campanhas..."
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
              placeholder="Buscar campanhas..."
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
            onClick={async () => {
              if (user?.company_id) {
                setIsRefreshing(true);
                try {
                  await Promise.all([
                    loadSchedulesAndMessages(user.company_id),
                    loadAllPendingBatches(user.company_id),
                    loadCampaignUsage()
                  ]);
                } finally {
                  setIsRefreshing(false);
                }
              } else {
                showNotification('error', 'Não foi possível carregar os dados.');
              }
            }}
            variant="outline"
            disabled={isRefreshing}
            className="rounded-xl h-10 w-10 p-0"
            size="icon"
            title="Atualizar"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>

          <Button
            onClick={() => {
              setEditingSchedule(null);
              setShowScheduleForm(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 rounded-xl"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Campanha
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
        {/* Mobile: Select dropdown */}
        <div className="sm:hidden">
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full rounded-xl">
              <SelectValue placeholder="Filtrar campanhas" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="andamento" className="rounded-lg">Andamento ({schedules.filter(s => s.status === 'pending' || s.status === 'processing' || s.status === 'scheduled').length})</SelectItem>
              <SelectItem value="scheduled" className="rounded-lg">Agendadas ({schedules.filter(s => s.status === 'pending' || s.status === 'scheduled').length})</SelectItem>
              <SelectItem value="completed" className="rounded-lg">Concluídas ({schedules.filter(s => s.status === 'completed').length})</SelectItem>
              <SelectItem value="failed" className="rounded-lg">Falharam ({schedules.filter(s => s.status === 'failed').length})</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Desktop: Tabs */}
        <TabsList className="hidden sm:grid grid-cols-4 rounded-2xl bg-gray-100 p-1">
          <TabsTrigger value="andamento" className="rounded-xl text-sm">
            Andamento ({schedules.filter(s => s.status === 'pending' || s.status === 'processing' || s.status === 'scheduled').length})
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="rounded-xl text-sm">
            Agendadas ({schedules.filter(s => s.status === 'pending' || s.status === 'scheduled').length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="rounded-xl text-sm">
            Concluídas ({schedules.filter(s => s.status === 'completed').length})
          </TabsTrigger>
          <TabsTrigger value="failed" className="rounded-xl text-sm">
            Falharam ({schedules.filter(s => s.status === 'failed').length})
          </TabsTrigger>
        </TabsList>

        {isLoadingContacts ? ( // This will now only check isLoadingContacts because the outer isLoading covers the global loading state
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
        ) : filteredSchedules.length > 0 ? (
          <div className={
            viewMode === 'grid' 
              ? 'grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
              : 'space-y-3 sm:space-y-4'
          }>
            {filteredSchedules.map((schedule) => 
              viewMode === 'grid' ? renderScheduleCard(schedule) : renderScheduleListItem(schedule)
            )}
          </div>
        ) : (
          <Card className="rounded-3xl border-gray-200">
            <CardContent className="text-center py-16">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {activeTab === 'andamento' ? 'Nenhuma campanha em andamento' :
                 activeTab === 'scheduled' ? 'Nenhuma campanha agendada' :
                 activeTab === 'completed' ? 'Nenhuma campanha concluída' :
                 'Nenhuma campanha com falha'}
              </h3>
              <p className="text-gray-500 mb-6">
                {activeTab === 'andamento' ? 'Comece criando sua primeira campanha de mensagens' :
                 'Nenhuma campanha nesta categoria no momento'}
              </p>
              {activeTab === 'andamento' && (
                <Button
                  onClick={() => {
                    setEditingSchedule(null);
                    setShowScheduleForm(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 rounded-xl"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeira Campanha
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </Tabs>

      {showScheduleForm && (
        <ScheduleFormModal
          schedule={editingSchedule}
          contacts={contacts}
          templates={templates}
          isOpen={showScheduleForm}
          onClose={() => {
            setShowScheduleForm(false);
            setEditingSchedule(null);
          }}
          onSubmit={async (scheduleData) => {
            let result;
            if (editingSchedule && editingSchedule.id) {
              try {
                await Schedule.update(editingSchedule.id, scheduleData);
                showNotification('success', 'Campanha atualizada com sucesso!');
                if (user?.company_id) {
                  loadSchedulesAndMessages(user.company_id);
                }
                setShowScheduleForm(false);
                setEditingSchedule(null);
                result = { success: true };
              } catch (error) {
                console.error("Erro ao atualizar campanha:", error);
                showNotification('error', `Erro ao atualizar campanha: ${error.message}`);
                result = { success: false, error: error.message };
              }
            } else {
              result = await handleCreateSchedule(scheduleData);
              if (result && result.success) {
                setShowScheduleForm(false);
                setEditingSchedule(null);
              }
            }
            return result;
          }}
        />
      )}

      {showDetailsModal && viewingSchedule && (
        <ScheduleDetailsModal
          schedule={viewingSchedule}
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setViewingSchedule(null);
            if (user?.company_id) {
              loadSchedulesAndMessages(user.company_id);
            }
          }}
          onEdit={(schedule) => {
            setShowDetailsModal(false);
            setViewingSchedule(null);
            handleEditSchedule(schedule);
          }}
          showNotification={showNotification}
        />
      )}

      {/* Modal de confirmação de cancelamento */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar campanha?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Tem certeza que deseja cancelar a campanha <strong>"{scheduleToCancelInfo?.schedule?.name}"</strong>?
                </p>
                {scheduleToCancelInfo?.cancellableMessages?.length > 0 && (
                  <p className="text-sm">
                    • {scheduleToCancelInfo.cancellableMessages.length} mensagem(ns) agendada(s) será(ão) cancelada(s)
                  </p>
                )}
                {scheduleToCancelInfo?.pendingBatchesToDeny?.length > 0 && (
                  <p className="text-sm">
                    • {scheduleToCancelInfo.pendingBatchesToDeny.length} lote(s) pendente(s) será(ão) negado(s)
                  </p>
                )}
                <p className="text-sm font-medium text-red-600 mt-2">
                  Esta ação é irreversível.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              className="rounded-xl"
              disabled={isCancelling}
            >
              Voltar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmCancelSchedule}
              disabled={isCancelling}
              className="rounded-xl bg-red-600 hover:bg-red-700"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cancelando...
                </>
              ) : (
                'Sim, cancelar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* NOVO: Modal Flutuante para Progresso de Cancelamento em Massa */}
      {globalCancellationProgress.isProcessing && globalCancellationProgress.type === 'cancellation' && (
        <div className="fixed bottom-6 right-6 z-[9999] cursor-pointer hover:scale-105 transition-transform">
          <Card className="rounded-2xl shadow-2xl w-80 bg-white border-2 border-red-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-100">
                  <StopCircle className="w-5 h-5 text-red-600 animate-pulse" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">
                    Cancelando Campanha
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {globalCancellationProgress.schedule_name}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">
                    {globalCancellationProgress.total_messages_to_cancel > 0
                      ? Math.round((globalCancellationProgress.cancelled_messages / globalCancellationProgress.total_messages_to_cancel) * 100)
                      : 100}%
                  </div>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-300 bg-red-600"
                  style={{
                    width: `${globalCancellationProgress.total_messages_to_cancel > 0 ? (globalCancellationProgress.cancelled_messages / globalCancellationProgress.total_messages_to_cancel) * 100 : 100}%`
                  }}
                />
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-gray-600">
                <span>✓ {globalCancellationProgress.cancelled_messages} mensagens</span>
                <span>✓ {globalCancellationProgress.denied_batches} lotes</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}