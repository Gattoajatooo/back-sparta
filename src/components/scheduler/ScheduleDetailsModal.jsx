import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  X,
  Users,
  Calendar as CalendarIcon,
  Clock,
  FileText,
  Info,
  CheckCircle2,
  AlertCircle,
  Send,
  Zap,
  Smartphone,
  MessageSquare,
  Eye,
  User as UserIcon,
  Phone,
  Hash,
  Activity,
  Timer,
  ChevronDown,
  ChevronRight,
  Settings,
  Target,
  PlayCircle,
  PauseCircle,
  StopCircle,
  Edit,
  Loader2,
  Gauge,
  Shuffle,
  Brain,
  RefreshCw,
  XCircle,
  Paperclip,
  Tag as TagIcon,
  ThumbsUp,
  ThumbsDown
} from "lucide-react";
import { format, subHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Session } from "@/entities/Session";
import { MessageTemplate } from "@/entities/MessageTemplate";
import { Message } from "@/entities/Message";
import { Contact } from "@/entities/Contact";
import { BatchSchedule } from "@/entities/BatchSchedule";
import { Schedule } from "@/entities/Schedule";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import { getSessionsDetails } from "@/functions/getSessionsDetails";
import RecipientDetailsModal from './RecipientDetailsModal';
import { syncCampaignMessages } from "@/functions/syncCampaignMessages";
import { base44 } from "@/api/base44Client";
import { useWebSocket } from "@/components/hooks/useWebSocket"; // ✅ ADICIONAR IMPORT

export default function ScheduleDetailsModal({ 
  schedule, 
  isOpen, 
  onClose, 
  onEdit, 
  showNotification,
  isFutureApprovalMode = false,
  daysToApprove = 7,
  onConfirmFutureApproval
}) {
  const navigate = useNavigate();
  const [scheduleData, setScheduleData] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [messages, setMessages] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [batches, setBatches] = useState([]);
  const [isApprovingFuture, setIsApprovingFuture] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    recipients: true,
    sessions: true,
    templates: false,
    settings: false,
    batches: true,
    successRate: true
  });
  const [expandedBatches, setExpandedBatches] = useState({});
  const [viewingRecipient, setViewingRecipient] = useState(null);
  const [showRecipientDetails, setShowRecipientDetails] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [cancellingMessageId, setCancellingMessageId] = useState(null);
  const [processingBatchId, setProcessingBatchId] = useState(null);
  const [dynamicBatchContacts, setDynamicBatchContacts] = useState({});
  const [calculatingBatchId, setCalculatingBatchId] = useState(null);
  const [cloudflareStatus, setCloudflareStatus] = useState(null);
  const [receivedMessages, setReceivedMessages] = useState([]);
  const [contactsWithReplies, setContactsWithReplies] = useState(new Set());
  const [notification, setNotification] = useState(null);

  // Helper para mostrar notificações (usa a prop se disponível, senão usa estado local)
  const notify = useCallback((type, message) => {
    if (showNotification) {
      showNotification(type, message);
    } else {
      setNotification({ type, message });
      // Limpar notificação após 3 segundos
      setTimeout(() => setNotification(null), 3000);
    }
  }, [showNotification]);

  const getSessionDisplayName = (session) => {
    if (!session) return 'Sessão Desconhecida';
    
    // Priorizar custom_name se existir
    if (session.custom_name) {
      return session.custom_name;
    }
    
    // Depois push_name
    if (session.push_name) {
      return session.push_name;
    }
    
    if (session.api_response?.me?.pushName) {
      return session.api_response.me.pushName;
    }
    
    if (session.api_response?.name) {
      return session.api_response.name;
    }
    
    if (session.user_email) {
      const emailName = session.user_email.split('@')[0];
      return emailName.charAt(0).toUpperCase() + emailName.slice(1);
    }
    
    if (session.session_name) {
      return session.session_name;
    }
    
    return 'Sessão Desconhecida';
  };

  const fetchMessages = useCallback(async (scheduleId) => {
    if (!scheduleId) return [];
    try {
      const messageList = await Message.filter({ schedule_id: scheduleId }).catch(() => []);
      setMessages(messageList || []);
      return messageList;
    } catch (error) {
      console.error("Erro ao buscar mensagens:", error);
      setMessages([]);
      return [];
    }
  }, []);

  const handleUpdateMessages = useCallback(async () => {
    if (isUpdating || !scheduleData?.id) return { success: false, error: "Sync already in progress or no schedule data." };
    setIsUpdating(true);

    try {
      const response = await syncCampaignMessages({ schedule_id: scheduleData.id });
      const updatedCount = response.data?.updated_count ?? 0;

      if (response.data?.success) {
        console.log('Sincronização concluída:', response.data);
        notify('success', `Sincronização concluída! ${updatedCount} mensagens atualizadas.`);
        return { success: true };
      } else {
        console.error('Erro na sincronização:', response.data);
        const errorMsg = response.data?.error || "Falha na sincronização.";
        notify('error', `Erro na sincronização: ${errorMsg}`);
        return { success: false, error: errorMsg };
      }
    } catch (error) {
      console.error('Erro ao atualizar mensagens:', error);
      const errorMessage = error.message || 'Erro ao sincronizar mensagens. Tente novamente.';
      notify('error', `Erro inesperado: ${errorMessage}`);
      return { success: false, error: errorMessage };
    } finally {
      setIsUpdating(false);
    }
  }, [isUpdating, scheduleData?.id, notify]);

  const calculateDynamicBatchContacts = useCallback(async (batch) => {
    if (!batch.is_dynamic || !batch.contact_filters?.length) {
      return [];
    }

    setCalculatingBatchId(batch.id);
    
    try {
      console.log(`🔄 Calculando contatos para lote dinâmico ${batch.id}...`);
      
      const response = await base44.functions.invoke('getFilteredContactsByRules', {
        filters: batch.contact_filters,
        logic: batch.filter_logic || 'AND',
        simulation_date: new Date(batch.run_at).toISOString().split('T')[0]
      });

      if (response.data?.success) {
        const calculatedContacts = response.data.contacts || [];
        console.log(`✓ ${calculatedContacts.length} contatos calculados para o lote ${batch.id}`);
        
        setDynamicBatchContacts(prev => ({
          ...prev,
          [batch.id]: calculatedContacts
        }));
        
        return calculatedContacts;
      } else {
        console.error('Erro ao calcular contatos:', response.data?.error);
        return [];
      }
    } catch (error) {
      console.error('Erro ao calcular contatos do lote:', error);
      return [];
    } finally {
      setCalculatingBatchId(null);
    }
  }, []);

  const checkCampaignStatus = useCallback(async (scheduleId) => {
    try {
      console.log('[ScheduleDetailsModal] Verificando status da campanha no Cloudflare...');
      
      const response = await base44.functions.invoke('checkCampaignStatus', { schedule_id: scheduleId });
      
      if (response.data?.success && response.data?.cloudflare_available) {
        console.log('[ScheduleDetailsModal] Status do Cloudflare:', response.data);
        setCloudflareStatus(response.data);
        
        // Return the response so caller can handle reload if needed
        return response.data;
      }
      
      return null;
    } catch (error) {
      console.error('[ScheduleDetailsModal] Erro ao verificar status:', error);
      return null;
    }
  }, []); // Remove loadScheduleDetails dependency

  // 🔥 WebSocket para atualizações em tempo real - MOVIDO PARA ANTES DOS useEffects
  const handleWebSocketMessage = useCallback((wsData) => {
    console.log('[ScheduleDetailsModal] 📨 RAW mensagem recebida:', JSON.stringify(wsData, null, 2));
    
    if (wsData.type === 'message_updated') {
      // 🔥 EXTRAIR DADOS TANTO DO NÍVEL RAIZ QUANTO DE DENTRO DE data
      const scheduleId = wsData.schedule_id || wsData.data?.schedule_id;
      const messageId = wsData.message_id || wsData.data?.message_id;
      const schedulerJobId = wsData.scheduler_job_id || wsData.data?.scheduler_job_id;
      const status = wsData.status || wsData.data?.status;
      const typeError = wsData.type_error || wsData.data?.type_error;
      const attemptCount = wsData.attempt_count || wsData.data?.attempt_count;
      const errorDetails = wsData.error_details || wsData.data?.error_details;
      const updatedAt = wsData.data?.updated_at || Date.now();
      
      console.log(`[ScheduleDetailsModal] 📦 Dados extraídos:`, {
        scheduleId,
        messageId,
        schedulerJobId,
        status,
        typeError,
        'scheduleData?.id': scheduleData?.id,
        'scheduleData existe': !!scheduleData
      });
      
      if (!scheduleId) {
        console.warn('[ScheduleDetailsModal] ⚠️ schedule_id não encontrado');
        return;
      }
      
      if (!scheduleData) {
        console.warn('[ScheduleDetailsModal] ⚠️ scheduleData ainda não carregado, ignorando');
        return;
      }
      
      if (scheduleId !== scheduleData.id) {
        console.log(`[ScheduleDetailsModal] ⚠️ Não é desta campanha (esperado: ${scheduleData.id}, recebido: ${scheduleId})`);
        return;
      }
      
      console.log('[ScheduleDetailsModal] ✅ Mensagem é desta campanha! Atualizando...');
      
      // 🔥 Atualizar mensagens
      setMessages(prevMessages => {
        console.log(`[ScheduleDetailsModal] 📝 Mensagens antes da atualização:`, prevMessages.length);
        
        let messageFound = false;
        const updatedMessages = prevMessages.map(msg => {
          if (msg.id === messageId || msg.scheduler_job_id === schedulerJobId) {
            messageFound = true;
            console.log(`[ScheduleDetailsModal] 🎯 ENCONTROU! Atualizando:`, {
              'msg.id': msg.id,
              'msg.scheduler_job_id': msg.scheduler_job_id,
              'de': msg.status,
              'para': status
            });
            
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
        
        if (!messageFound) {
          console.warn(`[ScheduleDetailsModal] ❌ Mensagem não encontrada! Procurando:`, {
            messageId,
            schedulerJobId,
            'IDs disponíveis': prevMessages.map(m => ({ id: m.id, scheduler_job_id: m.scheduler_job_id }))
          });
        } else {
          console.log(`[ScheduleDetailsModal] ✅ Mensagem atualizada com sucesso!`);
        }
        
        // 🔥 RECALCULAR CONTADORES
        const sent_count = updatedMessages.filter(m => 
          m.status === 'success' || m.status === 'delivered'
        ).length;
        
        const failed_count = updatedMessages.filter(m => 
          m.status === 'failed' || m.status === 'error'
        ).length;
        
        const pending_count = updatedMessages.filter(m => 
          m.status === 'pending'
        ).length;
        
        const cancelled_count = updatedMessages.filter(m => 
          m.status === 'cancelled' || m.status === 'cancel'
        ).length;
        
        const effectiveTotal = updatedMessages.length - cancelled_count;
        const totalProcessed = sent_count + failed_count;

        console.log(`[ScheduleDetailsModal] 📊 Contadores recalculados:`, {
          sent_count,
          failed_count,
          pending_count,
          cancelled_count,
          effectiveTotal,
          totalProcessed
        });

        // 🔥 ATUALIZAR scheduleData
        setScheduleData(prev => {
          if (!prev) return prev;
          
          let newStatus = prev.status;
          
          if (effectiveTotal === 0) {
            newStatus = 'cancelled';
          } else if (prev.status !== 'cancelled' && prev.status !== 'cancelling') {
            if (totalProcessed >= effectiveTotal) {
              newStatus = 'completed';
            } else if (totalProcessed > 0) {
              newStatus = 'processing';
            }
          }
          
          console.log(`[ScheduleDetailsModal] 🔄 Atualizando scheduleData:`, {
            'status_antigo': prev.status,
            'status_novo': newStatus,
            'sent_count_antigo': prev.sent_count,
            'sent_count_novo': sent_count,
            'failed_count_novo': failed_count
          });
          
          return {
            ...prev,
            status: newStatus,
            sent_count: sent_count,
            failed_count: failed_count,
            total_recipients: effectiveTotal
          };
        });

        // Notificações em tempo real desabilitadas para evitar spam
        // Apenas atualiza a UI silenciosamente
        
        return updatedMessages;
      });
    }
  }, [scheduleData]);

  // 🔥 CONECTAR WEBSOCKET
  useWebSocket(
    scheduleData?.company_id,
    handleWebSocketMessage,
    ['message_updated']
  );

  const loadScheduleDetails = useCallback(async () => {
    if (!isOpen || !schedule?.id) {
      console.log('[ScheduleDetailsModal] Modal não está aberto ou sem schedule ID, abortando carregamento');
      return;
    }

    try {
      setIsLoading(true);
      console.log('[ScheduleDetailsModal] Carregando detalhes da campanha:', schedule.id);

      // NOVO: Verificar status no Cloudflare primeiro
      const cloudflareData = await checkCampaignStatus(schedule.id);
      
      // Se o status mudou, será necessário recarregar os dados
      const needsReload = cloudflareData?.status_changed;
      
      if (needsReload) {
        console.log(`[ScheduleDetailsModal] Status mudou de ${cloudflareData.previous_status} para ${cloudflareData.current_status}`);
      }

      // 1. Fetch the main schedule data
      const fetchedSchedule = await Schedule.get(schedule.id);
      if (!fetchedSchedule) {
        throw new Error("Schedule not found.");
      }
      setScheduleData(fetchedSchedule);

      const companyId = fetchedSchedule.company_id;

      // 2. Fetch batches if recurring
      let batchList = [];
      if (fetchedSchedule.type === 'recurring') {
        batchList = await BatchSchedule.filter({ schedule_id: fetchedSchedule.id }, '-created_at');
        setBatches(batchList);
        
        const dynamicPendingBatches = batchList.filter(b => b.is_dynamic && b.status === 'pending');
        if (dynamicPendingBatches.length > 0) {
          console.log(`📊 Encontrados ${dynamicPendingBatches.length} lotes dinâmicos pendentes. Calculando contatos...`);
          
          for (const batch of dynamicPendingBatches) {
            await calculateDynamicBatchContacts(batch);
          }
        }
      } else {
        setBatches([]);
        setDynamicBatchContacts({});
      }

      // 3. Fetch sessions
      const sessionsPromise = fetchedSchedule.selected_sessions?.length > 0
        ? getSessionsDetails({ session_names: fetchedSchedule.selected_sessions })
        : Promise.resolve({ data: { sessions: [] } });

      // 4. Fetch messages first to get unique template_ids
      const currentMessages = await Message.filter({ schedule_id: fetchedSchedule.id });
      
      // Extract unique template_ids from messages
      const uniqueTemplateIds = [...new Set(
        currentMessages
          .map(m => m.metadata?.template_id)
          .filter(Boolean)
      )];
      
      // 5. Fetch only the templates that were actually used
      const templatesPromise = uniqueTemplateIds.length > 0
        ? MessageTemplate.filter({ 
            company_id: companyId,
            id: { '$in': uniqueTemplateIds }
          })
        : Promise.resolve([]);

      // 6. Fetch all contacts for the company
      const allContactsPromise = Contact.filter({ company_id: companyId }).catch(() => []);

      const [sessionsResponse, templateList, allContacts] = await Promise.all([
        sessionsPromise,
        templatesPromise,
        allContactsPromise
      ]);
      
      // Set messages that were already fetched
      setMessages(currentMessages);

      // 7. Buscar mensagens recebidas (direção = received) dos contatos desta campanha nos últimos 7 dias
      const contactIds = currentMessages.map(m => m.contact_id).filter(Boolean);
      
      if (contactIds.length > 0) {
        // Data de início: primeiro envio ou data de criação
        const campaignStartDate = currentMessages.length > 0 
          ? new Date(Math.min(...currentMessages.map(m => m.run_at || m.created_at)))
          : new Date(fetchedSchedule.created_date);
        
        // Buscar respostas nos 7 dias após o início
        const sevenDaysAfter = new Date(campaignStartDate);
        sevenDaysAfter.setDate(sevenDaysAfter.getDate() + 7);
        
        try {
          const receivedMsgs = await Message.filter({
            company_id: companyId,
            contact_id: { '$in': contactIds },
            direction: 'received',
            created_at: {
              '$gte': campaignStartDate.getTime(),
              '$lte': sevenDaysAfter.getTime()
            }
          });
          
          setReceivedMessages(receivedMsgs || []);
          
          // Criar Set com IDs de contatos que responderam
          const repliedContactIds = new Set(
            receivedMsgs.map(m => m.contact_id).filter(Boolean)
          );
          setContactsWithReplies(repliedContactIds);
          
          console.log(`[ScheduleDetailsModal] 📊 Taxa de sucesso: ${repliedContactIds.size}/${contactIds.length} responderam`);
        } catch (error) {
          console.error('[ScheduleDetailsModal] Erro ao buscar mensagens recebidas:', error);
          setReceivedMessages([]);
          setContactsWithReplies(new Set());
        }
      }

      if (sessionsResponse?.data?.success) {
        setSessions(sessionsResponse.data.sessions);
      } else {
        setSessions([]);
      }
      
      // Use templates fetched based on actual message usage
      setTemplates(templateList || []);

      // Resolve contacts
      if (fetchedSchedule.recipients?.length > 0 || currentMessages?.length > 0) {
        const contactIdsFromRecipients = fetchedSchedule.recipients?.map(r => r.contact_id).filter(Boolean) || [];
        const contactIdsFromMessages = currentMessages?.map(m => m.contact_id).filter(Boolean) || [];
        const allContactIds = [...new Set([...contactIdsFromRecipients, ...contactIdsFromMessages])];

        if (allContactIds.length > 0) {
            const relatedContacts = allContacts.filter(c => allContactIds.includes(c.id));
            setContacts(relatedContacts);
        } else {
            setContacts([]);
        }
      } else {
          setContacts([]);
      }

      console.log('[ScheduleDetailsModal] Carregamento concluído com sucesso');

    } catch (error) {
      console.error("Erro ao carregar detalhes da campanha:", error);
      notify('error', 'Erro ao carregar detalhes da campanha.');
      setScheduleData(null);
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, schedule?.id, fetchMessages, notify, calculateDynamicBatchContacts, checkCampaignStatus]);

  useEffect(() => {
    if (isOpen && schedule?.id) {
      console.log('[ScheduleDetailsModal] Modal aberto, iniciando carregamento...');
      
      // Disparar evento para esconder o card flutuante
      window.dispatchEvent(new CustomEvent('openScheduleDetailsModal'));
      
      loadScheduleDetails();
    } else if (!isOpen) {
      console.log('[ScheduleDetailsModal] Modal fechado, limpando dados...');
      
      // Disparar evento para o Layout saber que o modal foi fechado
      window.dispatchEvent(new CustomEvent('scheduleDetailsModalClosed'));
      
      setScheduleData(null);
      setSessions([]);
      setTemplates([]);
      setMessages([]);
      setContacts([]);
      setBatches([]);
      setIsLoading(true);
      setExpandedBatches({});
      setDynamicBatchContacts({});
      setCloudflareStatus(null);
      setReceivedMessages([]);
      setContactsWithReplies(new Set());
    }
  }, [isOpen, schedule?.id, loadScheduleDetails]);

  const handleApproveBatch = async (batchId) => {
    if (processingBatchId) return;
    
    setProcessingBatchId(batchId);
    try {
      const response = await base44.functions.invoke('approveBatch', { batch_id: batchId });
      
      if (response.data?.success) {
        notify('success', 'Lote aprovado e mensagens agendadas com sucesso!');
        await loadScheduleDetails();
      } else if (response.data?.expired) {
        notify('warning', 'O prazo de aprovação deste lote já expirou.');
        await loadScheduleDetails();
      } else {
        notify('error', `Erro ao aprovar lote: ${response.data?.error || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Erro ao aprovar lote:', error);
      notify('error', `Erro ao aprovar lote: ${error.message}`);
    } finally {
      setProcessingBatchId(null);
    }
  };

  const handleDenyBatch = async (batchId) => {
    if (processingBatchId) return;
    
    if (!window.confirm('Tem certeza que deseja negar este lote?')) return;
    
    setProcessingBatchId(batchId);
    try {
      const response = await base44.functions.invoke('denyBatch', { batch_id: batchId });
      
      if (response.data?.success) {
        notify('success', 'Lote negado com sucesso!');
        await loadScheduleDetails();
      } else {
        notify('error', `Erro ao negar lote: ${response.data?.error || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Erro ao negar lote:', error);
      notify('error', `Erro ao negar lote: ${error.message}`);
    } finally {
      setProcessingBatchId(null);
    }
  };

  const handleManualSync = useCallback(async () => {
    setIsLoading(true);
    await handleUpdateMessages();
    await loadScheduleDetails();
    setIsLoading(false);
  }, [handleUpdateMessages, loadScheduleDetails]);

  const handleCancelSingleMessage = async (message) => {
    if (!message || !message.scheduler_job_id) {
      notify('error', 'Não foi possível cancelar: ID de agendamento ausente.');
      return;
    }
    if (window.confirm(`Tem certeza que deseja cancelar o envio para ${message.metadata?.recipient_name || 'este destinatário'}?`)) {
        setCancellingMessageId(message.id);
        try {
            const response = await base44.functions.invoke('cancelScheduledMessage', { scheduler_job_id: message.scheduler_job_id });
            if (response.data?.success) {
                notify('success', 'Envio cancelado com sucesso!');
                setMessages(prev => prev.map(m => m.id === message.id ? { ...m, status: 'cancelled' } : m));
            } else {
                throw new Error(response.data?.error || 'Erro desconhecido');
            }
        } catch (error) {
            notify('error', `Erro ao cancelar envio: ${error.message}`);
        } finally {
            setCancellingMessageId(null);
        }
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const toggleBatch = useCallback((batch) => {
    const batchId = batch.id;
    setExpandedBatches(prev => ({
      ...prev,
      [batchId]: !prev[batchId]
    }));
  }, []);

  const handleViewRecipientDetails = (recipientData) => {
    const { recipient, contact, message } = recipientData;
    const sessionForRecipient = sessions.find(s => s.session_name === message?.session_name);
    
    setViewingRecipient({
        recipient,
        contact,
        message,
        sessionDisplayName: getSessionDisplayName(sessionForRecipient)
    });
    setShowRecipientDetails(true);
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

  const getStatusInfo = (status, schedule, message) => {
    // MODIFICADO: Verificar se deve mostrar como "Cancelando..."
    if ((schedule?.status === 'cancelling' || schedule?.status === 'cancelled') && 
        status === 'pending' && 
        message?.run_at && 
        schedule?.cancelled_at) {
      
      const messageRunAt = new Date(message.run_at).getTime();
      const cancelledAt = new Date(schedule.cancelled_at).getTime();
      
      // Se a mensagem estava agendada para depois do cancelamento, mostrar como cancelado
      if (messageRunAt > cancelledAt) {
        // Se já passou 1 hora ou não há pending no Cloudflare, mostrar como cancelado
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        const hasPendingInCloudflare = cloudflareStatus?.has_pending;
        
        if (cancelledAt < oneHourAgo || (cloudflareStatus && !hasPendingInCloudflare)) {
          return { 
            text: 'Cancelado', 
            color: 'bg-gray-100 text-gray-800 border-gray-200', 
            icon: XCircle 
          };
        }
        
        return { 
          text: 'Cancelando...', 
          color: 'bg-orange-100 text-orange-800 border-orange-200', 
          icon: Loader2 
        };
      }
    }

    switch (status) {
      case 'sent':
      case 'delivered':
      case 'success':
        return { text: 'Enviado', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2 };
      case 'pending':
        return { text: 'Pendente', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock };
      case 'failed':
      case 'error':
        return { text: 'Falhou', color: 'bg-red-100 text-red-800 border-red-200', icon: AlertCircle };
      case 'cancelled':
      case 'cancel':
        return { text: 'Cancelado', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: XCircle };
      default:
        return { text: status || 'Desconhecido', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: Info };
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
      case 'cancelling': return { text: 'Cancelando', color: 'text-orange-600', icon: Loader2 };
      default: return { text: status, color: 'text-gray-600', icon: Info };
    }
  };
  
  const getSessionStatusText = (status) => {
    switch (status) {
      case 'WORKING': return 'Ativa';
      case 'SCAN_QR_CODE': return 'Aguardando QR';
      default: return status;
    }
  };
  
  const getDeliverySpeedText = (speed) => {
    switch (speed) {
        case 'aggressive': return 'Agressivo (3-8s)';
        case 'moderate': return 'Moderado (9-20s)';
        case 'conservative': return 'Conservador (20-60s)';
        default: return 'Não definido';
    }
  };
  
  const getStrategyInfo = (strategy) => {
      switch(strategy) {
          case 'sequential': return { text: 'Sequencial', icon: ChevronRight };
          case 'random': return { text: 'Aleatório', icon: Shuffle };
          case 'smart': return { text: 'Inteligente', icon: Brain };
          default: return { text: 'Não definida', icon: Info };
      }
  };

  const getBatchStatusInfo = (status) => {
    switch (status) {
      case 'pending': return { text: 'Pendente', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock };
      case 'approved': return { text: 'Aprovado', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2 };
      case 'denied': return { text: 'Negado', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle };
      case 'expired': return { text: 'Expirado', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: Clock };
      case 'processing': return { text: 'Processando', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Send };
      case 'completed': return { text: 'Concluído', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2 };
      default: return { text: status, color: 'bg-gray-100 text-gray-800 border-gray-200', icon: Info };
    }
  };

  const currentSchedule = scheduleData || schedule;
  
  if (!isOpen || !currentSchedule) return null;
  
  // Calcular contadores diretamente das mensagens
  const sentCount = messages.filter(m => m.status === 'success' || m.status === 'delivered').length;
  const failedCount = messages.filter(m => m.status === 'failed' || m.status === 'error').length;
  const processedCount = sentCount + failedCount;
  const totalMessages = messages.length;
  
  const CampaignStatusIcon = getCampaignStatusInfo(currentSchedule.status).icon;
  const progressPercentage = (totalMessages > 0) 
    ? ((processedCount / totalMessages) * 100) 
    : 0;

  const canEditSchedule = currentSchedule.status === 'pending' && (!currentSchedule.scheduled_date || new Date(currentSchedule.scheduled_date) > new Date());
  
  const getFirstScheduledDate = () => {
    if (!messages || messages.length === 0) return null;
    const firstMessage = messages.sort((a, b) => (a.run_at || 0) - (b.run_at || 0))[0];
    return firstMessage?.run_at ? new Date(firstMessage.run_at) : null;
  };

  return (
    <>
      {/* Notificação local quando showNotification não é passado */}
      {notification && (
        <div className={`fixed top-4 right-4 z-[9999] p-4 rounded-xl shadow-lg max-w-sm ${
          notification.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' :
          notification.type === 'error' ? 'bg-red-50 border border-red-200 text-red-800' :
          notification.type === 'warning' ? 'bg-yellow-50 border border-yellow-200 text-yellow-800' :
          'bg-blue-50 border border-blue-200 text-blue-800'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' && <CheckCircle2 className="w-5 h-5 text-green-600" />}
            {notification.type === 'error' && <AlertCircle className="w-5 h-5 text-red-600" />}
            {notification.type === 'warning' && <AlertCircle className="w-5 h-5 text-yellow-600" />}
            <span className="text-sm font-medium">{notification.message}</span>
          </div>
        </div>
      )}
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent 
          className="max-w-4xl w-[95vw] sm:w-[90vw] md:w-[85vw] lg:w-[80vw] xl:max-w-4xl max-h-[95vh] p-0 overflow-hidden flex flex-col rounded-[2.5rem] [&>button]:hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center">
                  <Eye className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {currentSchedule.status === 'pending' ? 'Detalhes do Agendamento' : 'Detalhes do Envio'}
                  </h2>
                  <p className="text-sm text-gray-600">
                    Informações completas da campanha
                    {currentSchedule.is_dynamic_campaign && (
                      <Badge className="ml-2 bg-blue-100 text-blue-700 text-xs border-blue-200">
                        <Zap className="w-3 h-3 mr-1" />
                        Dinâmica
                      </Badge>
                    )}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 rounded-lg"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Content - Scrollable */}
          <div 
            className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6 sm:space-y-8"
            style={{ 
              maxHeight: 'calc(95vh - 140px)',
              minHeight: '300px'
            }}
          >
            {isLoading ? (
              <div className="flex items-center justify-center h-full min-h-[400px]">
                  <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Campaign Info */}
                <Card className="rounded-2xl border-gray-200 overflow-hidden">
                  <CardHeader className="pb-3 sm:pb-4">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Info className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                      Informações da Campanha
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                              <Target className="w-5 h-5 text-gray-500" />
                          </div>
                          <div>
                              <p className="text-xs text-gray-500">Nome</p>
                              <p className="font-semibold text-gray-800">{currentSchedule.name}</p>
                          </div>
                      </div>
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                              <CampaignStatusIcon className={`w-5 h-5 ${getCampaignStatusInfo(currentSchedule.status).color}`} />
                          </div>
                          <div>
                              <p className="text-xs text-gray-500">Status</p>
                              <p className="font-semibold text-gray-800">{getCampaignStatusInfo(currentSchedule.status).text}</p>
                          </div>
                      </div>
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                              <MessageSquare className="w-5 h-5 text-gray-500" />
                          </div>
                          <div>
                              <p className="text-xs text-gray-500">Canal</p>
                              <p className="font-semibold text-gray-800 capitalize">{currentSchedule.message_type}</p>
                          </div>
                      </div>
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                              <CalendarIcon className="w-5 h-5 text-gray-500" />
                          </div>
                          <div>
                              <p className="text-xs text-gray-500">Data de Criação</p>
                              <p className="font-semibold text-gray-800">{currentSchedule.created_date ? format(subHours(new Date(currentSchedule.created_date), 3), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'N/A'}</p>
                          </div>
                      </div>
                      {getFirstScheduledDate() && (
                          <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                                  <Clock className="w-5 h-5 text-gray-500" />
                              </div>
                              <div>
                                  <p className="text-xs text-gray-500">Data Agendada</p>
                                  <p className="font-semibold text-gray-800">{format(getFirstScheduledDate(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                              </div>
                          </div>
                      )}
                      <div className="col-span-1 lg:col-span-3">
                          <p className="text-xs text-gray-500 mb-1">Progresso</p>
                          <div className="flex items-center gap-4">
                              <div className="w-full bg-gray-200 rounded-full h-2.5">
                                  <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${progressPercentage}%` }}></div>
                              </div>
                              <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                                {processedCount} / {totalMessages}
                                </span>
                                </div>
                                </div>
                                </div>
                                </CardContent>
                                </Card>

                {/* Taxa de Sucesso - Nova seção */}
                {messages.length > 0 && (
                  <Collapsible open={expandedSections.successRate} onOpenChange={() => toggleSection('successRate')}>
                    <Card className="rounded-2xl border-gray-200">
                      <CollapsibleTrigger className="w-full">
                        <CardHeader className="pb-3 sm:pb-4 flex flex-row items-center justify-between cursor-pointer hover:bg-gray-50/50 rounded-t-2xl">
                          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                            <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                            Taxa de Sucesso - Engajamento
                          </CardTitle>
                          {expandedSections.successRate ? <ChevronDown className="w-5 h-5 text-gray-500"/> : <ChevronRight className="w-5 h-5 text-gray-500"/>}
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="space-y-4">
                          {/* Métricas principais */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card className="rounded-2xl border-green-200 bg-green-50">
                              <CardContent className="p-4 text-center">
                                <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-green-600" />
                                <div className="text-3xl font-bold text-green-700">
                                  {contactsWithReplies.size}
                                </div>
                                <div className="text-xs text-green-600 mt-1">Contatos que responderam</div>
                              </CardContent>
                            </Card>

                            <Card className="rounded-2xl border-blue-200 bg-blue-50">
                              <CardContent className="p-4 text-center">
                                <Users className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                                <div className="text-3xl font-bold text-blue-700">
                                  {sentCount}
                                </div>
                                <div className="text-xs text-blue-600 mt-1">Mensagens enviadas</div>
                              </CardContent>
                            </Card>

                            <Card className="rounded-2xl border-purple-200 bg-purple-50">
                              <CardContent className="p-4 text-center">
                                <Activity className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                                <div className="text-3xl font-bold text-purple-700">
                                  {sentCount > 0 ? Math.round((contactsWithReplies.size / sentCount) * 100) : 0}%
                                </div>
                                <div className="text-xs text-purple-600 mt-1">Taxa de resposta</div>
                              </CardContent>
                            </Card>
                          </div>

                          {/* Barra de progresso */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium text-gray-700">Engajamento</span>
                              <span className="text-gray-500">
                                {sentCount > 0 ? Math.round((contactsWithReplies.size / sentCount) * 100) : 0}% responderam
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div 
                                className="h-3 rounded-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-300"
                                style={{ width: `${sentCount > 0 ? (contactsWithReplies.size / sentCount) * 100 : 0}%` }}
                              />
                            </div>
                          </div>

                          {/* Info */}
                          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                            <div className="flex items-start gap-2">
                              <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                              <p className="text-xs text-blue-700">
                                Contabilizamos como sucesso os contatos que enviaram pelo menos uma mensagem de resposta nos 7 dias após receberem a campanha.
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                )}

                {/* Batches (apenas para campanhas recorrentes) */}
                {currentSchedule.type === 'recurring' && batches.length > 0 && (
                  <Collapsible open={expandedSections.batches} onOpenChange={() => toggleSection('batches')}>
                    <Card className="rounded-2xl border-gray-200">
                      <CollapsibleTrigger className="w-full">
                        <CardHeader className="pb-3 sm:pb-4 flex flex-row items-center justify-between cursor-pointer hover:bg-gray-50/50 rounded-t-2xl">
                          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                            <Hash className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                            Lotes de Envio ({batches.length})
                            {currentSchedule.is_dynamic_campaign && (
                              <Badge className="bg-blue-100 text-blue-700 text-xs border-blue-200">
                                <Zap className="w-3 h-3 mr-1" />
                                Dinâmica
                              </Badge>
                            )}
                          </CardTitle>
                          {expandedSections.batches ? <ChevronDown className="w-5 h-5 text-gray-500"/> : <ChevronRight className="w-5 h-5 text-gray-500"/>}
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="p-0">
                          <ScrollArea className="h-96">
                            <div className="divide-y divide-gray-100">
                              {batches.map((batch, index) => {
                              const batchStatusInfo = getBatchStatusInfo(batch.status);
                              const BatchStatusIcon = batchStatusInfo.icon;
                              const isExpanded = expandedBatches[batch.id];

                              // Verificar se este lote será aprovado no modo de aprovação futura
                              const isSelectedForApproval = isFutureApprovalMode && 
                                batch.status === 'pending' && 
                                batch.run_at && 
                                batch.run_at <= (Date.now() + daysToApprove * 24 * 60 * 60 * 1000) &&
                                batch.run_at >= (Date.now() - 24 * 60 * 60 * 1000); // Inclui hoje/ontem se pendente

                              let recipientsToShow = [];
                              let isCalculatingContacts = false;

                              if (batch.is_dynamic && batch.status === 'pending') {
                                  recipientsToShow = (dynamicBatchContacts[batch.id] || []).map(contact => ({
                                    contact_id: contact.id,
                                    name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
                                    phone: contact.phone,
                                    email: contact.email
                                  }));
                                  isCalculatingContacts = calculatingBatchId === batch.id;
                                } else {
                                  recipientsToShow = batch.recipients || [];
                                }

                                return (
                                  <div key={batch.id} className={`border-b border-gray-100 last:border-0 transition-colors ${isSelectedForApproval ? 'bg-blue-50/50' : ''}`}>
                                    <div className="flex items-center justify-between p-4 hover:bg-gray-50">
                                      <div 
                                        className="flex items-center gap-3 flex-1 cursor-pointer"
                                        onClick={() => toggleBatch(batch)}
                                      >
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelectedForApproval ? 'bg-blue-100' : 'bg-purple-100'}`}>
                                          {isSelectedForApproval ? (
                                            <CheckCircle2 className="w-4 h-4 text-blue-600" />
                                          ) : (
                                            <Hash className="w-4 h-4 text-purple-600" />
                                          )}
                                        </div>
                                        <div>
                                          <p className={`font-medium flex items-center gap-2 ${isSelectedForApproval ? 'text-blue-700' : 'text-gray-800'}`}>
                                            Lote {index + 1}
                                            {isSelectedForApproval && (
                                              <Badge className="bg-blue-100 text-blue-700 text-[10px] border-blue-200 h-5">
                                                Será aprovado
                                              </Badge>
                                            )}
                                            {batch.is_dynamic && (
                                              <Badge className="bg-blue-50 text-blue-700 text-xs border-blue-200">
                                                <Zap className="w-3 h-3 mr-1" />
                                                {isCalculatingContacts ? (
                                                  <>
                                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                                    Calculando...
                                                  </>
                                                ) : (
                                                  `${recipientsToShow.length} contatos`
                                                )}
                                              </Badge>
                                            )}
                                          </p>
                                          <p className="text-xs text-gray-500">
                                            {batch.run_at ? format(new Date(batch.run_at), 'dd/MM/yy HH:mm:ss') : 'N/A'} • {recipientsToShow.length || batch.recipient_count || 0} destinatário(s)
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge className={`text-xs ${batchStatusInfo.color}`}>
                                          <BatchStatusIcon className="w-3 h-3 mr-1"/>
                                          {batchStatusInfo.text}
                                        </Badge>
                                        
                                        {batch.status === 'pending' && (
                                          <div className="flex items-center gap-1">
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => handleDenyBatch(batch.id)}
                                              disabled={processingBatchId === batch.id || isCalculatingContacts}
                                              className="h-8 px-3 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700"
                                            >
                                              {processingBatchId === batch.id ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                              ) : (
                                                <>
                                                  <ThumbsDown className="w-3.5 h-3.5 mr-1" />
                                                  Negar
                                                </>
                                              )}
                                            </Button>
                                            <Button
                                              size="sm"
                                              onClick={() => handleApproveBatch(batch.id)}
                                              disabled={processingBatchId === batch.id || recipientsToShow.length === 0 || isCalculatingContacts}
                                              className="h-8 px-3 rounded-lg bg-green-600 hover:bg-green-700 text-white"
                                            >
                                              {processingBatchId === batch.id ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                ) : (
                                                <>
                                                  <ThumbsUp className="w-3.5 h-3.5 mr-1" />
                                                  Aprovar{batch.is_dynamic && ` (${recipientsToShow.length})`}
                                                </>
                                              )}
                                            </Button>
                                          </div>
                                        )}
                                        
                                        {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-500"/> : <ChevronRight className="w-4 h-4 text-gray-500"/>}
                                      </div>
                                    </div>

                                    {isExpanded && (
                                      <div className="bg-gray-50/50 border-t border-gray-100">
                                        {isCalculatingContacts ? (
                                          <div className="flex flex-col items-center justify-center p-8 text-gray-500">
                                            <Loader2 className="w-8 h-8 mb-2 animate-spin text-blue-500" />
                                            <p className="text-sm font-medium">Calculando contatos baseado nos filtros...</p>
                                          </div>
                                        ) : recipientsToShow.length > 0 ? (
                                          <div className="divide-y divide-gray-100">
                                            {recipientsToShow.map((recipient, recipientIndex) => {
                                              const actualContact = contacts.find(c => c.id === recipient.contact_id);
                                              const displayContact = actualContact || recipient; 

                                              const message = messages.find(m => 
                                                m.contact_id === recipient.contact_id && 
                                                m.batch_id === batch.id
                                              );
                                              
                                              const statusInfo = getStatusInfo(message?.status || 'pending', currentSchedule, message);
                                              const StatusIcon = statusInfo.icon;
                                              const isCancellable = message?.status === 'pending' && message?.run_at && new Date(message.run_at) > new Date();
                                              const hasReply = contactsWithReplies.has(recipient.contact_id);

                                              return (
                                                <div key={`${batch.id}-${recipient.contact_id}-${recipientIndex}`} className="flex items-center p-3 gap-3">
                                                  <Avatar className={hasReply ? 'ring-2 ring-green-500' : ''}>
                                                    <AvatarFallback className={hasReply ? 'bg-green-100 text-green-700 text-xs' : 'bg-gray-200 text-gray-600 text-xs'}>
                                                      {displayContact.name?.[0] || displayContact.first_name?.[0] || 'C'}
                                                      {displayContact.name?.[1] || displayContact.last_name?.[0] || ''}
                                                    </AvatarFallback>
                                                  </Avatar>
                                                  <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-gray-800 truncate flex items-center gap-2">
                                                      <span className="truncate">
                                                        {displayContact.name || `${displayContact.first_name || 'Contato'} ${displayContact.last_name || ''}`}
                                                      </span>
                                                      {hasReply && (
                                                        <Badge className="bg-green-100 text-green-700 text-xs border-green-300 flex-shrink-0">
                                                          ✓ Respondeu
                                                        </Badge>
                                                      )}
                                                    </div>
                                                    <p className="text-xs text-gray-500">{formatPhoneNumber(displayContact.phone)}</p>
                                                  </div>
                                                  <div className="text-right flex-shrink-0 w-40">
                                                    <p className="text-xs text-gray-500">
                                                      {message?.run_at ? format(new Date(message.run_at), 'dd/MM/yy HH:mm:ss') : (batch.status === 'pending' ? 'Aguardando aprovação' : 'Pendente')}
                                                    </p>
                                                    <Badge className={`text-xs mt-1 ${statusInfo.color} ${statusInfo.text === 'Cancelando...' ? 'animate-pulse' : ''}`}>
                                                      <StatusIcon className={`w-3 h-3 mr-1 ${statusInfo.text === 'Cancelando...' ? 'animate-spin' : ''}`}/>
                                                      {statusInfo.text}
                                                    </Badge>
                                                  </div>
                                                  <div className="flex items-center gap-1">
                                                    {hasReply && (
                                                      <Button 
                                                        variant="outline" 
                                                        size="icon" 
                                                        className="h-8 w-8 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 border-green-300" 
                                                        onClick={() => {
                                                          const phone = (displayContact.phone || '').replace(/\D/g, '');
                                                          navigate(createPageUrl('WhatsAppChat') + `?phone=${phone}`);
                                                        }}
                                                        title="Abrir chat"
                                                      >
                                                        <MessageSquare className="w-3.5 h-3.5"/>
                                                      </Button>
                                                    )}
                                                    <Button 
                                                      variant="outline" 
                                                      size="icon" 
                                                      className="h-8 w-8 rounded-lg" 
                                                      onClick={() => handleViewRecipientDetails({
                                                        recipient: recipient,
                                                        contact: displayContact,
                                                        message
                                                      })}
                                                    >
                                                      <Eye className="w-3.5 h-3.5"/>
                                                    </Button>
                                                    {message && statusInfo.text !== 'Cancelando...' && (
                                                      <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600 disabled:text-gray-300"
                                                        disabled={!isCancellable || cancellingMessageId === message?.id}
                                                        onClick={() => handleCancelSingleMessage(message)}
                                                      >
                                                        {cancellingMessageId === message?.id ? (
                                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        ) : (
                                                          <XCircle className="w-3.5 h-3.5" />
                                                        )}
                                                      </Button>
                                                    )}
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        ) : (
                                          <div className="flex flex-col items-center justify-center p-8 text-gray-500">
                                            <Users className="w-12 h-12 mb-2 text-gray-400" />
                                            <p className="text-sm font-medium">
                                              {batch.is_dynamic 
                                                ? 'Nenhum contato encontrado com os filtros aplicados' 
                                                : 'Nenhum contato encontrado para este lote'}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </ScrollArea>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                )}

                {/* Recipients (apenas para campanhas não-recorrentes) */}
                {currentSchedule.type !== 'recurring' && (
                  <Collapsible open={expandedSections.recipients} onOpenChange={() => toggleSection('recipients')}>
                    <Card className="rounded-2xl border-gray-200">
                      <CollapsibleTrigger className="w-full">
                        <CardHeader className="pb-3 sm:pb-4 flex flex-row items-center justify-between cursor-pointer hover:bg-gray-50/50 rounded-t-2xl">
                          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                            Destinatários ({currentSchedule.total_recipients || 0})
                          </CardTitle>
                          {expandedSections.recipients ? <ChevronDown className="w-5 h-5 text-gray-500"/> : <ChevronRight className="w-5 h-5 text-gray-500"/>}
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="p-0">
                          <ScrollArea className="h-72">
                            <div className="divide-y divide-gray-100">
                              {currentSchedule.recipients?.map((recipient, index) => {
                                const contact = contacts.find(c => c.id === recipient.contact_id);
                                const message = messages.find(m => m.contact_id === recipient.contact_id);
                                const statusInfo = getStatusInfo(message?.status || recipient.status, currentSchedule, message);
                                const StatusIcon = statusInfo.icon;
                                const isCancellable = message?.status === 'pending' && message?.run_at && new Date(message.run_at) > new Date();
                                const hasReply = contactsWithReplies.has(recipient.contact_id);

                                return (
                                                  <div key={index} className="flex items-center p-4 gap-3">
                                    <Avatar className={hasReply ? 'ring-2 ring-green-500' : ''}>
                                      <AvatarFallback className={hasReply ? 'bg-green-100 text-green-700 text-xs' : 'bg-gray-200 text-gray-600 text-xs'}>
                                        {contact?.first_name?.[0]}{contact?.last_name?.[0]}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium text-gray-800 truncate flex items-center gap-2">
                                        <span className="truncate">
                                          {contact?.first_name || 'Contato'} {contact?.last_name || `ID ${recipient.contact_id.slice(0,4)}`}
                                        </span>
                                        {hasReply && (
                                          <Badge className="bg-green-100 text-green-700 text-xs border-green-300 flex-shrink-0">
                                            ✓ Respondeu
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-xs text-gray-500">{formatPhoneNumber(contact?.phone)}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0 w-40">
                                      <p className="text-xs text-gray-500">{message?.run_at ? format(new Date(message.run_at), 'dd/MM/yy HH:mm:ss') : 'Pendente'}</p>
                                      <Badge className={`text-xs mt-1 ${statusInfo.color} ${statusInfo.text === 'Cancelando...' ? 'animate-pulse' : ''}`}>
                                        <StatusIcon className={`w-3 h-3 mr-1 ${statusInfo.text === 'Cancelando...' ? 'animate-spin' : ''}`}/>
                                        {statusInfo.text}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {hasReply && (
                                          <Button 
                                            variant="outline" 
                                            size="icon" 
                                            className="h-8 w-8 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 border-green-300" 
                                            onClick={() => {
                                              const phone = (contact?.phone || '').replace(/\D/g, '');
                                              navigate(createPageUrl('WhatsAppChat') + `?phone=${phone}`);
                                            }}
                                            title="Abrir chat"
                                          >
                                            <MessageSquare className="w-3.5 h-3.5"/>
                                          </Button>
                                        )}
                                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => handleViewRecipientDetails({recipient, contact, message})}>
                                          <Eye className="w-3.5 h-3.5"/>
                                        </Button>
                                        {statusInfo.text !== 'Cancelando...' && (
                                          <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-8 w-8 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600 disabled:text-gray-300"
                                              disabled={!isCancellable || cancellingMessageId === message?.id}
                                              onClick={() => handleCancelSingleMessage(message)}
                                          >
                                              {cancellingMessageId === message?.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                                          </Button>
                                        )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </ScrollArea>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                )}
                
                {/* Other sections in Collapsible cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Sessions */}
                    <Collapsible open={expandedSections.sessions} onOpenChange={() => toggleSection('sessions')}>
                      <Card className="rounded-2xl border-gray-200 h-full">
                        <CollapsibleTrigger className="w-full">
                          <CardHeader className="pb-3 sm:pb-4 flex flex-row items-center justify-between cursor-pointer hover:bg-gray-50/50 rounded-t-2xl">
                            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                              <Smartphone className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                              Sessões ({sessions.length})
                            </CardTitle>
                            {expandedSections.sessions ? <ChevronDown className="w-5 h-5 text-gray-500"/> : <ChevronRight className="w-5 h-5 text-gray-500"/>}
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <CardContent className="p-4 space-y-3">
                                {sessions.length > 0 ? (
                                  sessions.map(session => (
                                      <div key={session.id} className="flex items-center gap-3">
                                          <Avatar className="w-10 h-10">
                                              <AvatarImage src={session.avatar_url} />
                                              <AvatarFallback className="bg-green-100 text-green-700">
                                                {getSessionDisplayName(session)?.[0] || 'S'}
                                              </AvatarFallback>
                                          </Avatar>
                                          <div className="flex-1">
                                              <p className="text-sm font-medium">{getSessionDisplayName(session)}</p>
                                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                                <Phone className="w-3 h-3" />
                                                {formatPhoneNumber(session.phone) || 'Sem número'}
                                              </p>
                                          </div>
                                      </div>
                                  ))
                                ) : (
                                  <div className="p-4 text-center text-gray-500 text-sm">
                                    Nenhuma sessão configurada
                                  </div>
                                )}
                            </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>

                    {/* Templates */}
                    <Collapsible open={expandedSections.templates} onOpenChange={() => toggleSection('templates')}>
                      <Card className="rounded-2xl border-gray-200 h-full">
                        <CollapsibleTrigger className="w-full">
                          <CardHeader className="pb-3 sm:pb-4 flex flex-row items-center justify-between cursor-pointer hover:bg-gray-50/50 rounded-t-2xl">
                            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                              Mensagens ({templates.length})
                            </CardTitle>
                            {expandedSections.templates ? <ChevronDown className="w-5 h-5 text-gray-500"/> : <ChevronRight className="w-5 h-5 text-gray-500"/>}
                          </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <CardContent className="p-4 space-y-3">
                                {templates.length > 0 ? (
                                  templates.map(template => (
                                      <div key={template.id} className="p-3 bg-gray-50 rounded-lg">
                                          <div className="flex items-center gap-2 mb-2">
                                            <Paperclip className="w-4 h-4 text-gray-500" />
                                            <p className="font-medium text-sm text-gray-800">{template.name}</p>
                                          </div>
                                          <p className="text-xs text-gray-600 line-clamp-2">{template.content}</p>
                                      </div>
                                  ))
                                ) : (
                                  <div className="p-4 text-center text-gray-500 text-sm">
                                    Nenhuma mensagem anexada
                                  </div>
                                )}
                            </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                </div>

                {/* Settings */}
                <Collapsible open={expandedSections.settings} onOpenChange={() => toggleSection('settings')}>
                  <Card className="rounded-2xl border-gray-200">
                    <CollapsibleTrigger className="w-full">
                      <CardHeader className="pb-3 sm:pb-4 flex flex-row items-center justify-between cursor-pointer hover:bg-gray-50/50 rounded-t-2xl">
                        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                          <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                          Configurações de Envio
                        </CardTitle>
                        {expandedSections.settings ? <ChevronDown className="w-5 h-5 text-gray-500"/> : <ChevronRight className="w-5 h-5 text-gray-500"/>}
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="p-6 grid grid-cols-2 gap-4">
                          <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                                  <Gauge className="w-4 h-4 text-gray-500"/>
                              </div>
                              <div>
                                  <p className="text-xs text-gray-500">Velocidade</p>
                                  <p className="font-medium text-sm">{getDeliverySpeedText(currentSchedule.delivery_settings?.speed_mode)}</p>
                              </div>
                          </div>
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                                  {React.createElement(getStrategyInfo(currentSchedule.session_sending_strategy).icon, { className: "w-4 h-4 text-gray-500" })}
                              </div>
                              <div>
                                  <p className="text-xs text-gray-500">Estratégia</p>
                                  <p className="font-medium text-sm">{getStrategyInfo(currentSchedule.session_sending_strategy).text}</p>
                              </div>
                          </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="flex justify-end items-center gap-3 p-6 bg-gray-50 border-t border-gray-200">
            <Button 
              variant="outline" 
              onClick={onClose} 
              className="rounded-xl"
            >
              Fechar
            </Button>

            {isFutureApprovalMode ? (
              <Button 
                onClick={async () => {
                  setIsApprovingFuture(true);
                  await onConfirmFutureApproval();
                  setIsApprovingFuture(false);
                }}
                disabled={isApprovingFuture}
                className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isApprovingFuture ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Aprovando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Confirmar Aprovação
                  </>
                )}
              </Button>
            ) : (
              <Button 
                onClick={handleManualSync}
                disabled={isUpdating || currentSchedule.status === 'completed'}
                variant="outline" 
                className="rounded-xl"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sincronizando...
                  </>
                ) : currentSchedule.status === 'completed' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                    Concluído
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Sincronizar
                  </>
                )}
              </Button>
            )}
            
            {canEditSchedule && (
              <Button 
                onClick={() => onEdit(currentSchedule)} 
                className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Edit className="w-4 h-4 mr-2" />
                Editar Campanha
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {showRecipientDetails && (
        <RecipientDetailsModal
          details={viewingRecipient}
          isOpen={showRecipientDetails}
          onClose={() => setShowRecipientDetails(false)}
        />
      )}
    </>
  );
}