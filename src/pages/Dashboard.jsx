import React, { useState, useEffect, useCallback } from "react";
import { User } from "@/entities/User";
import { Company } from "@/entities/Company";
import { Contact } from "@/entities/Contact";
import { Session } from "@/entities/Session";
import { Message } from "@/entities/Message";
import { Schedule } from "@/entities/Schedule";
import { BatchSchedule } from "@/entities/BatchSchedule";
import { MessageTemplate } from "@/entities/MessageTemplate";
import { Tag } from "@/entities/Tag";
import { SystemLog } from "@/entities/SystemLog";
import { Sale } from "@/entities/Sale";
import { Product } from "@/entities/Product";
import { StockBalance } from "@/entities/StockBalance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Users,
  MessageSquare,
  FileText,
  Tag as TagIcon,
  Smartphone,
  TrendingUp,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Home,
  AlertCircle,
  Loader2,
  Calendar,
  MoreVertical,
  Brain,
  RefreshCw,
  ChevronDown,
  CalendarDays,
  Check,
  LayoutGrid,
  List,
  Package,
  ShoppingCart,
  DollarSign,
  TrendingDown,
  Boxes
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import { base44 } from "@/api/base44Client";
// Removed: import { approveBatch } from "@/functions/approveBatch";
// Removed: import { denyBatch } from "@/functions/denyBatch";
import ScheduleDetailsModal from "../components/scheduler/ScheduleDetailsModal";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [metrics, setMetrics] = useState({
    activeSessions: 0,
    totalContacts: 0,
    messagesThisMonth: 0,
    activeTemplates: 0,
    smartTags: 0
  });

  const [messageChartData, setMessageChartData] = useState([]);
  const [chartPeriod, setChartPeriod] = useState("7days"); // "7days", "3months", "1year"
  
  // Product metrics
  const [productMetrics, setProductMetrics] = useState({
    todaySales: 0,
    todayRevenue: 0,
    lowStockProducts: 0,
    totalProducts: 0
  });
  
  // States for Approvals
  const [approvals, setApprovals] = useState({ pending: [], history: [] });
  const [isLoadingApprovals, setIsLoadingApprovals] = useState(true);
  const [processingBatchId, setProcessingBatchId] = useState(null);
  const [calculatingBatchIds, setCalculatingBatchIds] = useState(new Set()); // IDs dos lotes calculando
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [viewingSchedule, setViewingSchedule] = useState(null);
  const [message, setMessage] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeApprovalTab, setActiveApprovalTab] = useState("pending");
  const [notification, setNotification] = useState(null); // NOVO: Estado para notificações toast
  
  // UI State
  const [viewMode, setViewMode] = useState("grid"); // 'grid' or 'list'
  const [detailsModalConfig, setDetailsModalConfig] = useState({
    mode: 'view', // 'view' or 'future_approval'
    days: 7,
    batchId: null
  });

  // Helper para mostrar notificações toast
  const notify = useCallback((type, message) => {
    setNotification({ type, message });
    // Limpar notificação após 3 segundos
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // Carregar preferência de visualização
  useEffect(() => {
    const savedViewMode = localStorage.getItem("dashboardViewMode");
    if (savedViewMode) {
      setViewMode(savedViewMode);
    }
  }, []);

  const toggleViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem("dashboardViewMode", mode);
  };

  // Relógio em tempo real
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  
  const loadMetrics = useCallback(async (companyId) => {
    try {
      const [sessions, contacts, messages, templates, tags] = await Promise.all([
        Session.filter({ company_id: companyId }),
        Contact.filter({ company_id: companyId }),
        Message.filter({ company_id: companyId }),
        MessageTemplate.filter({ company_id: companyId }),
        Tag.filter({ company_id: companyId })
      ]);

      const activeSessions = sessions.filter(s => s.status === 'WORKING').length;
      
      const currentMonth = new Date();
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      
      const messagesThisMonth = messages.filter(msg => {
        const msgDate = new Date(msg.created_date);
        return isWithinInterval(msgDate, { start: monthStart, end: monthEnd });
      }).length;

      // Conversas ativas nos últimos 7 dias (contatos únicos com mensagens)
      const sevenDaysAgo = subDays(new Date(), 7);
      const recentMessages = messages.filter(msg => {
        const msgDate = new Date(msg.created_date);
        return msgDate >= sevenDaysAgo;
      });
      const uniqueContacts = new Set(recentMessages.map(msg => msg.contact_id).filter(Boolean));
      const activeConversations = uniqueContacts.size;

      setMetrics({
        activeSessions,
        totalContacts: contacts.length,
        messagesThisMonth,
        activeConversations
      });
    } catch (error) {
      console.error("Error loading metrics:", error);
    }
  }, []);

  const loadMessageChartData = useCallback(async (companyId, period = "7days") => {
    try {
      const messages = await Message.filter({ company_id: companyId });
      let chartData = [];
      
      if (period === "7days") {
        // Últimos 7 dias
        for (let i = 6; i >= 0; i--) {
          const date = subDays(new Date(), i);
          const dayMessages = messages.filter(msg => {
            const msgDate = new Date(msg.created_date);
            return msgDate.toDateString() === date.toDateString();
          });
          
          chartData.push({
            date: format(date, 'dd/MM'),
            messages: dayMessages.length,
            sent: dayMessages.filter(m => m.direction === 'sent').length,
            received: dayMessages.filter(m => m.direction === 'received').length
          });
        }
      } else if (period === "3months") {
        // Últimos 3 meses, agrupado por semana
        for (let i = 11; i >= 0; i--) {
          const weekStart = subDays(new Date(), i * 7);
          const weekEnd = subDays(new Date(), (i - 1) * 7);
          
          const weekMessages = messages.filter(msg => {
            const msgDate = new Date(msg.created_date);
            return msgDate >= weekStart && msgDate < weekEnd;
          });
          
          chartData.push({
            date: format(weekStart, 'dd/MM'),
            messages: weekMessages.length,
            sent: weekMessages.filter(m => m.direction === 'sent').length,
            received: weekMessages.filter(m => m.direction === 'received').length
          });
        }
      } else if (period === "1year") {
        // Último ano, agrupado por mês
        for (let i = 11; i >= 0; i--) {
          const monthDate = new Date();
          monthDate.setMonth(monthDate.getMonth() - i);
          const monthStart = startOfMonth(monthDate);
          const monthEnd = endOfMonth(monthDate);
          
          const monthMessages = messages.filter(msg => {
            const msgDate = new Date(msg.created_date);
            return msgDate >= monthStart && msgDate <= monthEnd;
          });
          
          chartData.push({
            date: format(monthStart, 'MMM/yy', { locale: ptBR }),
            messages: monthMessages.length,
            sent: monthMessages.filter(m => m.direction === 'sent').length,
            received: monthMessages.filter(m => m.direction === 'received').length
          });
        }
      }
      
      setMessageChartData(chartData);
    } catch (error) {
      console.error("Error loading message chart data:", error);
    }
  }, []);

  const loadApprovalsData = useCallback(async (companyId) => {
    setIsLoadingApprovals(true);
    try {
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();
      const now = Date.now();
      
      // Buscar lotes pendentes
      const pendingBatches = await BatchSchedule.filter({
        company_id: companyId,
        status: 'pending'
      }, '-created_at', 100);
      
      // Verificar e marcar lotes expirados
      const expiredBatchIds = [];
      for (const batch of pendingBatches) {
        if (batch.run_at && batch.run_at < now) {
          expiredBatchIds.push(batch.id);
          // Marcar como expirado
          await BatchSchedule.update(batch.id, {
            status: 'expired',
            updated_at: new Date().toISOString()
          });
        }
      }
      
      // Filtrar apenas os que ainda são válidos
      const validPendingBatches = pendingBatches.filter(b => !expiredBatchIds.includes(b.id));

      // Buscar lotes aprovados nos últimos 7 dias
      const approvedBatches = await BatchSchedule.filter({
        company_id: companyId,
        status: 'approved',
        approved_at: { '$gte': sevenDaysAgo }
      }, '-approved_at', 50);

      // Buscar lotes negados nos últimos 7 dias
      const deniedBatches = await BatchSchedule.filter({
        company_id: companyId,
        status: 'denied',
        denied_at: { '$gte': sevenDaysAgo }
      }, '-denied_at', 50);

      // Buscar lotes expirados nos últimos 7 dias
      const expiredBatches = await BatchSchedule.filter({
        company_id: companyId,
        status: 'expired',
        updated_at: { '$gte': sevenDaysAgo }
      }, '-updated_at', 50);

      const allBatches = [...validPendingBatches, ...approvedBatches, ...deniedBatches, ...expiredBatches];

      if (!allBatches || allBatches.length === 0) {
        setApprovals({ pending: [], history: [] });
        return;
      }
      
      // Buscar nomes das campanhas relacionadas
      const scheduleIds = [...new Set(allBatches.map(batch => batch.schedule_id).filter(Boolean))];
      
      let scheduleMap = new Map();
      if (scheduleIds.length > 0) {
        const schedules = await Schedule.filter({ id: { '$in': scheduleIds } });
        scheduleMap = new Map(schedules.map(s => [s.id, s.name]));
      }

      // Buscar dados completos das campanhas para obter recipients
      let schedulesData = new Map();
      if (scheduleIds.length > 0) {
        const schedulesFullData = await Schedule.filter({ id: { '$in': scheduleIds } });
        schedulesFullData.forEach(s => schedulesData.set(s.id, s));
      }

      // Transformar BatchSchedules para o formato esperado
      const allApprovals = allBatches.map(batch => {
        const scheduleData = schedulesData.get(batch.schedule_id);
        return {
          batch_id: batch.id,
          schedule_id: batch.schedule_id,
          campaign_name: scheduleMap.get(batch.schedule_id) || 'Campanha Desconhecida',
          status: batch.status,
          updated_at: batch.approved_at || batch.denied_at || batch.updated_at || batch.created_at,
          run_at: batch.run_at,
          instance_sequence: batch.batch_number || 1,
          recipient_count: batch.recipient_count || 0,
          recipients: batch.recipients || scheduleData?.recipients || [],
          is_dynamic: batch.is_dynamic,
          contact_filters: batch.contact_filters || [],
          filter_logic: batch.filter_logic || 'AND',
          // Para campanhas dinâmicas pendentes, precisará calcular
          calculated_recipients: null,
          calculated_count: null
        };
      }).sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));

      // Ordenar pendentes por run_at (mais próximo primeiro)
      const pending = allApprovals
        .filter(item => item.status === 'pending')
        .sort((a, b) => a.run_at - b.run_at);
      
      // Histórico ordenado por data de atualização (mais recente primeiro)
      const history = allApprovals
        .filter(item => item.status !== 'pending' && ['approved', 'denied', 'expired'].includes(item.status))
        .sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));

      setApprovals({ pending, history });
      
      // Calcular destinatários para campanhas dinâmicas pendentes
      const dynamicPending = pending.filter(item => item.is_dynamic && item.contact_filters?.length > 0);
      if (dynamicPending.length > 0) {
        calculateDynamicRecipients(dynamicPending, companyId);
      }
    } catch (error) {
      console.error("Error loading approvals data:", error);
      setApprovals({ pending: [], history: [] });
    } finally {
        setIsLoadingApprovals(false);
    }
  }, []);



  // ✅ Calcular destinatários para campanhas dinâmicas (otimizado)
  const calculateDynamicRecipients = useCallback(async (dynamicItems, companyId) => {
    // Marcar todos como calculando
    const batchIds = dynamicItems.map(item => item.batch_id);
    setCalculatingBatchIds(new Set(batchIds));

    try {
      // Buscar todos os contatos uma única vez
      const allContacts = await Contact.filter({
        company_id: companyId,
        deleted: { '$ne': true }
      });

      // Processar cada lote dinâmico
      const results = dynamicItems.map(item => {
        const filteredContacts = applyDynamicFiltersLocally(
          allContacts, 
          item.contact_filters, 
          item.filter_logic || 'AND',
          item.run_at
        );
        
        return {
          batch_id: item.batch_id,
          calculated_count: filteredContacts.length,
          calculated_recipients: filteredContacts.slice(0, 10).map(c => ({
            contact_id: c.id,
            name: `${c.first_name || ''} ${c.last_name || ''}`.trim(),
            first_name: c.first_name,
            phone: c.phone
          }))
        };
      });

      // Atualizar approvals com os resultados calculados
      setApprovals(prev => ({
        ...prev,
        pending: prev.pending.map(item => {
          const result = results.find(r => r.batch_id === item.batch_id);
          if (result) {
            return {
              ...item,
              calculated_count: result.calculated_count,
              calculated_recipients: result.calculated_recipients,
              recipient_count: result.calculated_count
            };
          }
          return item;
        })
      }));
    } catch (error) {
      console.error("Error calculating dynamic recipients:", error);
    } finally {
      setCalculatingBatchIds(new Set());
    }
  }, []);

  // ✅ Aplicar filtros dinâmicos localmente (mesma lógica do backend)
  const applyDynamicFiltersLocally = (contacts, filters, logic, runAtTimestamp) => {
    if (!filters || filters.length === 0) return contacts;
    
    const combinator = String(logic || 'AND').toUpperCase();
    const referenceDate = runAtTimestamp ? new Date(runAtTimestamp) : new Date();
    
    const norm = (s) => String(s ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
    
    return contacts.filter(contact => {
      const results = filters.map(filter => {
        const field = String(filter.field || '').trim();
        const operator = String(filter.operator || '').toLowerCase().trim();
        const value = filter.value;
        
        // Filtro de tag
        if (field === 'has_tag') {
          const contactTags = Array.isArray(contact.tags) ? contact.tags.map(t => norm(t)) : [];
          const filterValues = Array.isArray(value) ? value.map(v => norm(v)) : [norm(value)];
          
          if (operator === 'is_true') return contactTags.length > 0;
          if (operator === 'is_false') return contactTags.length === 0;
          if (operator === 'equals' || operator === 'in') {
            return filterValues.some(v => contactTags.includes(v));
          }
          if (operator === 'not_equals' || operator === 'not_in') {
            return !filterValues.some(v => contactTags.includes(v));
          }
        }
        
        // Filtro de status
        if (field === 'status') {
          const contactStatus = norm(contact.status);
          const filterValue = norm(value);
          if (operator === 'equals') return contactStatus === filterValue;
          if (operator === 'not_equals') return contactStatus !== filterValue;
        }
        
        // Filtro de source
        if (field === 'source') {
          const contactSource = norm(contact.source);
          const filterValue = norm(value);
          if (operator === 'equals') return contactSource === filterValue;
          if (operator === 'not_equals') return contactSource !== filterValue;
        }
        
        // Filtro de aniversário
        if (field === 'birth_date') {
          if (!contact.birth_date) return false;
          const birth = new Date(contact.birth_date);
          
          if (operator === 'is_today') {
            return birth.getDate() === referenceDate.getDate() && birth.getMonth() === referenceDate.getMonth();
          }
          if (operator === 'is_this_month') {
            return birth.getMonth() === referenceDate.getMonth();
          }
        }
        
        return true;
      });
      
      if (combinator === 'OR') {
        return results.some(r => r === true);
      }
      return results.every(r => r === true);
    });
  };

  const loadProductMetrics = useCallback(async (companyId) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const [sales, products, stockBalances] = await Promise.all([
        Sale.filter({ 
          company_id: companyId,
          sale_date: { '$gte': today.toISOString() }
        }),
        Product.filter({ company_id: companyId }),
        StockBalance.filter({ company_id: companyId })
      ]);

      const todaySales = sales.filter(s => s.status !== 'cancelled').length;
      const todayRevenue = sales
        .filter(s => s.status !== 'cancelled')
        .reduce((sum, s) => sum + (s.total_amount || 0), 0);

      // Produtos com estoque baixo (menos de 10 unidades disponíveis)
      const lowStock = stockBalances.filter(sb => 
        (sb.available_quantity || 0) < 10 && (sb.available_quantity || 0) > 0
      ).length;

      setProductMetrics({
        todaySales,
        todayRevenue,
        lowStockProducts: lowStock,
        totalProducts: products.length
      });
    } catch (error) {
      console.error("Error loading product metrics:", error);
      setProductMetrics({
        todaySales: 0,
        todayRevenue: 0,
        lowStockProducts: 0,
        totalProducts: 0
      });
    }
  }, []);

  const loadDashboardData = useCallback(async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);

      const companies = await Company.list();
      const userCompany = companies.find(c => c.id === currentUser.company_id);
      setCompany(userCompany);

      if (currentUser.company_id) {
        await Promise.all([
          loadMetrics(currentUser.company_id),
          loadApprovalsData(currentUser.company_id),
          loadMessageChartData(currentUser.company_id, chartPeriod),
          loadProductMetrics(currentUser.company_id)
        ]);
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [loadMetrics, loadApprovalsData, loadMessageChartData, loadProductMetrics, chartPeriod]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleApprove = async (batchId) => {
    setProcessingBatchId(batchId);
    try {
      const response = await base44.functions.invoke('approveBatch', { batch_id: batchId });
      if (response.data?.success) {
        notify("success", "Lote aprovado com sucesso!");
        if (user?.company_id) {
          await loadApprovalsData(user.company_id);
        }
      } else if (response.data?.expired) {
        notify("warning", "O prazo de aprovação deste lote já expirou.");
        if (user?.company_id) {
          await loadApprovalsData(user.company_id);
        }
      } else {
        notify("error", "Erro ao aprovar lote: " + (response.data?.error || "Erro desconhecido"));
        console.error("Approve batch function did not return success:", response.data?.message);
      }
    } catch (error) {
      console.error("Error approving batch:", error);
      notify("error", "Erro ao aprovar lote");
    } finally {
      setProcessingBatchId(null);
    }
  };

  const handleOpenFutureApproval = (batchId) => {
    const days = user?.approval_days_window || 7;
    const batch = approvals.pending.find(b => b.batch_id === batchId);
    
    if (!batch) {
      console.error("Batch not found for approval:", batchId);
      return;
    }

    setViewingSchedule({ id: batch.schedule_id });
    setShowDetailsModal(true);
    setDetailsModalConfig({
      mode: 'future_approval',
      days: days,
      batchId: batchId
    });
  };

  const handleConfirmFutureApproval = async () => {
    const { batchId, days } = detailsModalConfig;
    if (!batchId) return;

    try {
      const response = await base44.functions.invoke('approveFutureBatches', { 
        batch_id: batchId,
        days_to_approve: days
      });
      
      if (response.data?.success) {
        notify("success", `${response.data.approved_count} lotes aprovados com sucesso!`);
        if (user?.company_id) {
          await loadApprovalsData(user.company_id);
        }
        // Close modal after success
        setShowDetailsModal(false);
        setViewingSchedule(null);
      } else {
        notify("error", "Erro ao aprovar lotes futuros: " + (response.data?.error || "Erro desconhecido"));
      }
    } catch (error) {
      console.error("Error approving future batches:", error);
      notify("error", "Erro ao aprovar lotes futuros");
    }
  };

  const handleDeny = async (batchId) => {
    setProcessingBatchId(batchId);
    try {
      const response = await base44.functions.invoke('denyBatch', { batch_id: batchId });
      if (response.data?.success) {
        notify("success", "Lote negado com sucesso!");
        if (user?.company_id) {
          await loadApprovalsData(user.company_id);
        }
      } else {
        notify("error", "Erro ao negar lote: " + (response.data?.error || "Erro desconhecido"));
        console.error("Deny batch function did not return success:", response.data?.message);
      }
    } catch (error) {
      console.error("Error denying batch:", error);
      notify("error", "Erro ao negar lote");
    } finally {
      setProcessingBatchId(null);
    }
  };

  // ✅ Função para renderizar nomes dos destinatários responsivamente
  const renderRecipientNames = (item) => {
    const isCalculating = calculatingBatchIds.has(item.batch_id);
    
    // Para dinâmicos, usar calculated_recipients se disponível
    const recipients = item.is_dynamic 
      ? (item.calculated_recipients || [])
      : (item.recipients || []);
    const count = item.is_dynamic
      ? (item.calculated_count ?? item.recipient_count ?? 0)
      : (item.recipient_count || recipients.length || 0);
    
    // Se está calculando, mostrar indicador
    if (isCalculating) {
      return (
        <div className="flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
          <span className="text-xs text-blue-600 font-medium">Calculando destinatários...</span>
        </div>
      );
    }
    
    if (count === 0) return <span className="text-gray-500 text-xs">Nenhum destinatário</span>;
    
    // Extrair primeiros nomes
    const firstNames = recipients.slice(0, 4).map(r => {
      const name = r.name || r.first_name || '';
      return name.split(' ')[0];
    }).filter(Boolean);
    
    const hasMore = count > firstNames.length;
    
    return (
      <div className="flex flex-col gap-1.5 w-full">
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
          <span className="text-xs text-gray-600">Destinatários:</span>
          <span className="font-semibold text-gray-800 text-sm">{count}</span>
        </div>
        {firstNames.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap overflow-hidden max-h-6">
            {firstNames.map((name, idx) => (
              <span 
                key={idx} 
                className="bg-blue-50 text-blue-700 text-[10px] px-1.5 py-0.5 rounded-md font-medium"
              >
                {name}
              </span>
            ))}
            {hasMore && (
              <span className="text-gray-400 text-xs">...</span>
            )}
          </div>
        )}
      </div>
    );
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
        setDetailsModalConfig({ mode: 'view', days: 0, batchId: null });
    } catch (error) {
        console.error("Error fetching schedule details:", error);
    }
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
                console.error('Logo failed to load on Dashboard');
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
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-4 right-4 z-[9999] p-4 rounded-xl shadow-lg max-w-sm animate-in fade-in slide-in-from-top-5 duration-300 ${
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

      {/* Removed old Alert Message */}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center">
            <Home className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Início</h1>
            <p className="text-gray-600">
              Bem-vindo de volta, {user?.full_name?.split(' ')[0] || 'pessoal'}! 👋
            </p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-4 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2">
          <Calendar className="w-4 h-4 text-gray-600" />
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">
              {format(currentTime, "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </p>
            <p className="text-lg font-bold text-blue-600">
              {format(currentTime, "HH:mm:ss")}
            </p>
          </div>
        </div>
      </div>

      {/* Métricas Principais - CRM */}
      <div>
        <h2 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Métricas de CRM
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {[
            {
              title: "Sessões Ativas",
              value: metrics.activeSessions,
              icon: Smartphone,
              iconBg: "bg-blue-50",
              iconColor: "text-blue-600"
            },
            {
              title: "Total de Contatos", 
              value: metrics.totalContacts,
              icon: Users,
              iconBg: "bg-blue-50",
              iconColor: "text-blue-600"
            },
            {
              title: "Mensagens (Mês)",
              value: metrics.messagesThisMonth,
              icon: MessageSquare,
              iconBg: "bg-blue-50",
              iconColor: "text-blue-600"
            },
            {
              title: "Conversas (7d)",
              value: metrics.activeConversations || 0,
              icon: Activity,
              iconBg: "bg-blue-50",
              iconColor: "text-blue-600"
            }
          ].map((metric, index) => (
            <Card key={index} className="rounded-2xl border-gray-200 hover:shadow-md transition-shadow">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${metric.iconBg}`}>
                    <metric.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${metric.iconColor}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">{metric.value}</p>
                    <p className="text-[10px] sm:text-xs text-gray-500 truncate">{metric.title}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Métricas de Produtos */}
      <div>
        <h2 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
          <Package className="w-4 h-4" />
          Métricas de Produtos
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {[
            {
              title: "Vendas Hoje",
              value: productMetrics.todaySales,
              icon: ShoppingCart,
              iconBg: "bg-green-50",
              iconColor: "text-green-600"
            },
            {
              title: "Faturamento Hoje",
              value: new Intl.NumberFormat('pt-BR', { 
                style: 'currency', 
                currency: 'BRL',
                minimumFractionDigits: 2 
              }).format(productMetrics.todayRevenue),
              icon: DollarSign,
              iconBg: "bg-emerald-50",
              iconColor: "text-emerald-600",
              isMonetary: true
            },
            {
              title: "Estoque Baixo",
              value: productMetrics.lowStockProducts,
              icon: TrendingDown,
              iconBg: "bg-orange-50",
              iconColor: "text-orange-600"
            },
            {
              title: "Total de Produtos",
              value: productMetrics.totalProducts,
              icon: Boxes,
              iconBg: "bg-purple-50",
              iconColor: "text-purple-600"
            }
          ].map((metric, index) => (
            <Card key={index} className="rounded-2xl border-gray-200 hover:shadow-md transition-shadow">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${metric.iconBg}`}>
                    <metric.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${metric.iconColor}`} />
                  </div>
                  <div className="min-w-0">
                    <p className={`${metric.isMonetary ? 'text-base sm:text-xl' : 'text-xl sm:text-2xl'} font-bold text-gray-900 ${metric.isMonetary ? 'truncate' : ''}`}>
                      {metric.value}
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-500 truncate">{metric.title}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Central de Aprovações */}
      <Card className="rounded-3xl border-gray-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              Central de Aprovações
            </CardTitle>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleViewMode('grid')}
                  className={`h-7 w-7 rounded-md ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleViewMode('list')}
                  className={`h-7 w-7 rounded-md ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
              {approvals.pending.length > 0 && (
                <Badge className="bg-gray-100 text-gray-700 border border-gray-200 rounded-full px-3">
                  {approvals.pending.length} pendente{approvals.pending.length > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeApprovalTab} onValueChange={setActiveApprovalTab}>
            <TabsList className="rounded-xl bg-gray-100 p-1 mb-4">
              <TabsTrigger value="pending" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Pendentes
              </TabsTrigger>
              <TabsTrigger value="history" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Histórico (7d)
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="pending" className="mt-0">
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                <style>
                  {`
                    .custom-scrollbar::-webkit-scrollbar {
                      width: 6px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-track {
                      background: #f1f1f1;
                      border-radius: 10px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                      background: #cbd5e1;
                      border-radius: 10px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                      background: #94a3b8;
                    }
                  `}
                </style>
                {isLoadingApprovals ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  </div>
                ) : approvals.pending.length > 0 ? (
                  <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
                    {approvals.pending.map((item) => {
                      const isProcessingThis = processingBatchId === item.batch_id;
                      const isAnyProcessing = processingBatchId !== null;
                      
                      if (viewMode === 'list') {
                        // Compact List View
                        return (
                          <Card key={item.batch_id} className={`rounded-2xl border-gray-200 hover:shadow-sm transition-all ${isProcessingThis ? 'ring-2 ring-blue-200 bg-blue-50/30' : 'bg-white'}`}>
                            <CardContent className="p-3 flex items-center gap-4">
                              {/* Icon & Date */}
                              <div className="flex items-center gap-3 min-w-[180px]">
                                <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                  item.is_dynamic ? 'bg-teal-50' : 'bg-blue-50'
                                }`}>
                                  {item.is_dynamic ? (
                                    <Brain className="w-5 h-5 text-teal-600" />
                                  ) : (
                                    <RefreshCw className="w-5 h-5 text-blue-600" />
                                  )}
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-gray-900 truncate max-w-[120px]">{item.campaign_name}</p>
                                  <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                    <Clock className="w-3 h-3" />
                                    <span>{format(new Date(item.run_at), "dd/MM HH:mm", { locale: ptBR })}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Recipients (Inline) */}
                              <div className="flex-1 flex items-center gap-3 border-l border-gray-100 pl-4">
                                <div className="flex items-center gap-1.5">
                                  <Users className="w-4 h-4 text-gray-400" />
                                  <span className="text-sm font-bold text-gray-700">
                                    {item.is_dynamic ? (item.calculated_count ?? item.recipient_count ?? 0) : item.recipient_count}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 flex-wrap overflow-hidden h-6">
                                  {((item.is_dynamic ? item.calculated_recipients : item.recipients) || [])
                                    .slice(0, 3).map((r, idx) => (
                                    <span key={idx} className="text-[10px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                                      {(r.name || r.first_name || '').split(' ')[0]}
                                    </span>
                                  ))}
                                  {((item.is_dynamic ? item.calculated_count : item.recipient_count) > 3) && (
                                    <span className="text-[10px] text-gray-400">...</span>
                                  )}
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleDeny(item.batch_id)}
                                  disabled={isAnyProcessing}
                                  className="h-8 w-8 p-0 rounded-lg border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                                >
                                  {isProcessingThis ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4 text-red-500" />}
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button 
                                      variant="outline"
                                      size="sm" 
                                      disabled={isAnyProcessing}
                                      className="h-8 rounded-lg border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 px-3 text-xs"
                                    >
                                      {isProcessingThis ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <CheckCircle2 className="w-3 h-3 text-green-500 mr-1.5" />
                                      )}
                                      <span className="hidden lg:inline">Aprovar</span>
                                      <ChevronDown className="w-3 h-3 ml-1 opacity-50" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="rounded-xl">
                                    <DropdownMenuItem onClick={() => handleApprove(item.batch_id)}>
                                      Aprovar este lote
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleOpenFutureApproval(item.batch_id)}>
                                      Aprovar próximos {user?.approval_days_window || 7} dias
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      }

                      // Grid View (Original Card Style)
                      return (
                        <Card key={item.batch_id} className={`rounded-3xl border-gray-200 hover:shadow-md transition-all duration-300 group ${isProcessingThis ? 'ring-2 ring-blue-200 bg-blue-50/30' : 'bg-white'}`}>
                          <CardContent className="p-5">
                            <div className="flex flex-col gap-4">
                              {/* Header */}
                              <div className="flex items-start gap-4">
                                <div className={`relative w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                                  item.is_dynamic ? 'bg-gradient-to-br from-teal-500 to-teal-600' : 'bg-gradient-to-br from-blue-500 to-blue-600'
                                }`}>
                                  {item.is_dynamic ? (
                                    <Brain className="w-6 h-6 text-white" />
                                  ) : (
                                    <RefreshCw className="w-6 h-6 text-white" />
                                  )}
                                  <div className="absolute -bottom-1.5 -right-1.5 bg-white rounded-full p-0.5 shadow-sm">
                                    <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] px-1.5 py-0 font-bold shadow-sm">
                                      #{item.instance_sequence}
                                    </Badge>
                                  </div>
                                </div>
                                
                                <div className="flex-1 min-w-0 pt-0.5">
                                  <h3 className="font-bold text-gray-900 text-base truncate leading-tight mb-1" title={item.campaign_name}>
                                    {item.campaign_name}
                                  </h3>
                                  <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <div className="flex items-center gap-1.5 bg-blue-50 px-2 py-0.5 rounded-lg text-blue-700 border border-blue-100">
                                      <Clock className="w-3.5 h-3.5" />
                                      <span className="font-medium">
                                        {format(new Date(item.run_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Recipient List */}
                              <div className="bg-gray-50/80 border border-gray-100 rounded-2xl p-3">
                                {renderRecipientNames(item)}
                              </div>
                              
                              {/* Buttons */}
                              <div className="flex items-center gap-2 pt-2 w-full">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleViewDetails(item.schedule_id)} 
                                  disabled={isAnyProcessing}
                                  className="h-9 w-9 p-0 rounded-xl border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-50 shrink-0"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleDeny(item.batch_id)} 
                                  disabled={isAnyProcessing}
                                  className="flex-1 h-9 rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 min-w-0 px-2"
                                >
                                  {isProcessingThis ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                                  )}
                                  <span className="hidden xl:inline ml-1.5 truncate">Negar</span>
                                </Button>
                                
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      disabled={isAnyProcessing} 
                                      className="flex-1 h-9 rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 min-w-0 px-2"
                                    >
                                      {isProcessingThis ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                      )}
                                      <span className="hidden xl:inline ml-1.5 truncate">Aprovar</span>
                                      <ChevronDown className="w-3 h-3 ml-1 opacity-50 shrink-0" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="rounded-xl">
                                    <DropdownMenuItem 
                                      onClick={() => handleApprove(item.batch_id)}
                                      className="gap-2 rounded-lg cursor-pointer"
                                    >
                                      <Check className="w-4 h-4 text-green-600" />
                                      <span>Aprovar apenas este lote</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={() => handleOpenFutureApproval(item.batch_id)}
                                      className="gap-2 rounded-lg cursor-pointer bg-blue-50 text-blue-700 focus:bg-blue-100 focus:text-blue-800"
                                    >
                                      <CalendarDays className="w-4 h-4" />
                                      <span>Aprovar próximos {user?.approval_days_window || 7} dias</span>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                    <CheckCircle2 className="w-12 h-12 text-gray-300 mb-3" />
                    <p className="font-medium">Nenhuma aprovação pendente</p>
                    <p className="text-sm text-gray-400">Tudo em dia!</p>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="history" className="mt-0">
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {isLoadingApprovals ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  </div>
                ) : approvals.history.length > 0 ? (
                  approvals.history.map((item) => (
                    <Card key={item.batch_id} className="rounded-2xl border-gray-200 hover:shadow-sm transition-shadow">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-center justify-between gap-2 sm:gap-4">
                          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                            <div className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                              item.status === 'approved' ? 'bg-green-50' : 
                              item.status === 'expired' ? 'bg-gray-100' :
                              'bg-red-50'
                            }`}>
                              {item.status === 'approved' ? (
                                <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                              ) : item.status === 'expired' ? (
                                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500" />
                              ) : (
                                <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
                              )}
                              {/* Mini ícone de tipo de campanha */}
                              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow border">
                                {item.is_dynamic ? (
                                  <Brain className="w-2.5 h-2.5 text-teal-600" />
                                ) : (
                                  <RefreshCw className="w-2.5 h-2.5 text-blue-600" />
                                )}
                              </div>
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-gray-900 truncate text-sm sm:text-base">
                                  {item.campaign_name}
                                </p>
                                <Badge className="bg-gray-100 text-gray-600 border-gray-200 text-[10px] px-1.5 py-0">
                                  Lote {item.instance_sequence}
                                </Badge>
                              </div>
                              <p className="text-[10px] sm:text-xs text-gray-500">{item.recipient_count} destinatários</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                            <div className="text-right">
                              <Badge className={`rounded-full px-2 sm:px-3 text-[10px] sm:text-xs border ${
                                item.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' : 
                                item.status === 'expired' ? 'bg-gray-100 text-gray-600 border-gray-200' :
                                'bg-red-50 text-red-700 border-red-200'
                              }`}>
                                {item.status === 'approved' ? 'Aprovado' : item.status === 'expired' ? 'Expirado' : 'Negado'}
                              </Badge>
                              <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                                {format(new Date(item.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleViewDetails(item.schedule_id)}
                              className="h-8 w-8 sm:h-9 sm:w-9 p-0 rounded-lg"
                            >
                              <Eye className="w-4 h-4"/>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                    <Activity className="w-12 h-12 text-gray-300 mb-3" />
                    <p className="font-medium">Nenhum histórico recente</p>
                    <p className="text-sm text-gray-400">Últimos 7 dias</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>


      {/* Gráficos */}
      <div className="grid grid-cols-1 gap-6">
        {/* Mensagens por Período */}
        <Card className="rounded-3xl border-gray-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                </div>
                {chartPeriod === "7days" && "Mensagens nos Últimos 7 Dias"}
                {chartPeriod === "3months" && "Mensagens nos Últimos 3 Meses (Semanal)"}
                {chartPeriod === "1year" && "Mensagens no Último Ano (Mensal)"}
              </CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="rounded-xl">
                    <Calendar className="w-4 h-4 mr-2" />
                    {chartPeriod === "7days" && "7 Dias"}
                    {chartPeriod === "3months" && "3 Meses"}
                    {chartPeriod === "1year" && "1 Ano"}
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl">
                  <DropdownMenuItem 
                    onClick={() => {
                      setChartPeriod("7days");
                      if (user?.company_id) loadMessageChartData(user.company_id, "7days");
                    }}
                    className="rounded-lg cursor-pointer"
                  >
                    Últimos 7 Dias
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => {
                      setChartPeriod("3months");
                      if (user?.company_id) loadMessageChartData(user.company_id, "3months");
                    }}
                    className="rounded-lg cursor-pointer"
                  >
                    Últimos 3 Meses (Semanal)
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => {
                      setChartPeriod("1year");
                      if (user?.company_id) loadMessageChartData(user.company_id, "1year");
                    }}
                    className="rounded-lg cursor-pointer"
                  >
                    Último Ano (Mensal)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={messageChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="messages" 
                  stroke="#3B82F6" 
                  strokeWidth={3}
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#3B82F6' }}
                  name="Total"
                />
                <Line 
                  type="monotone" 
                  dataKey="sent" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  dot={{ fill: '#10B981', r: 3 }}
                  name="Enviadas"
                />
                <Line 
                  type="monotone" 
                  dataKey="received" 
                  stroke="#F59E0B" 
                  strokeWidth={2}
                  dot={{ fill: '#F59E0B', r: 3 }}
                  name="Recebidas"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {showDetailsModal && viewingSchedule && (
        <ScheduleDetailsModal
          schedule={viewingSchedule}
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setViewingSchedule(null);
          }}
          onEdit={() => {}} // A edição não é feita aqui
          isFutureApprovalMode={detailsModalConfig.mode === 'future_approval'}
          daysToApprove={detailsModalConfig.days}
          onConfirmFutureApproval={handleConfirmFutureApproval}
        />
      )}
    </div>
  );
}