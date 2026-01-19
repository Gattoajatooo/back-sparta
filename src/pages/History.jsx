
import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Contact } from "@/entities/Contact"; // Not used but part of original file, keeping it.
import { Campaign } from "@/entities/Campaign"; // Not used but part of original file, keeping it.
import { Communication } from "@/entities/Communication"; // Not used but part of original file, keeping it.
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"; // Added for modals
import {
  Archive,
  Search,
  Filter,
  ArrowUpDown,
  Grid3X3,
  List,
  Calendar as CalendarIcon,
  X,
  MoreVertical,
  MessageSquare,
  Send,
  Zap,
  Phone,
  Video,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Users,
  Target,
  Activity,
  TrendingUp
} from "lucide-react";
import { format, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import MessageDetailsModal from "../components/messages/MessageDetailsModal";
import ResendMessageModal from "../components/messages/ResendMessageModal";
import ScheduleMessageModal from "../components/messages/ScheduleMessageModal";

export default function History() {
  const [communications, setCommunications] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [users, setUsers] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Search and filters
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("sent_date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [viewMode, setViewMode] = useState("list");
  const [gridColumns, setGridColumns] = useState(3);
  const [listCompactness, setListCompactness] = useState("normal");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedSendType, setSelectedSendType] = useState("all"); // New filter for mass/individual
  const [selectedCampaigns, setSelectedCampaigns] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  
  // Date filter
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [dateFilterOpen, setDateFilterOpen] = useState(false);
  
  // Other filters
  const [campaignFilterOpen, setCampaignFilterOpen] = useState(false);
  const [tagFilterOpen, setTagFilterOpen] = useState(false);
  const [userFilterOpen, setUserFilterOpen] = useState(false);

  // Modals
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showResendModal, setShowResendModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);

  // Communication types
  const communicationTypes = [
    { id: 'whatsapp', name: 'WhatsApp', icon: MessageSquare, color: 'bg-green-100 text-green-800' },
    { id: 'email', name: 'Email', icon: Send, color: 'bg-blue-100 text-blue-800' },
    { id: 'sms', name: 'SMS', icon: Zap, color: 'bg-purple-100 text-purple-800' },
    { id: 'voice_call', name: 'Chamada Voz', icon: Phone, color: 'bg-orange-100 text-orange-800' },
    { id: 'video_call', name: 'Chamada Vídeo', icon: Video, color: 'bg-indigo-100 text-indigo-800' }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);

      if (currentUser.company_id) {
        // Enhanced mock data with mass and individual sends
        const mockCommunications = [
          {
            id: "mass_1",
            company_id: currentUser.company_id,
            type: "whatsapp",
            direction: "outbound",
            send_type: "mass", // New field
            subject: "Promoção Black Friday",
            content: "🔥 BLACK FRIDAY! 🔥\n\nDescontos de até 70% em todos os produtos!\n\nVálido apenas hoje! Corre que acaba rápido! 🏃‍♂️💨",
            status: "completed",
            sent_date: "2024-01-15T10:30:00Z",
            campaign_id: "camp_1",
            campaign_name: "Black Friday 2024",
            user_id: "user_1",
            user_name: "João Admin",
            recipients_count: 1250,
            delivered_count: 1180,
            opened_count: 890,
            clicked_count: 234,
            failed_count: 70,
            total_cost: 62.50,
            recipients: [ // Example recipients data for mass messages
              { name: "Maria Silva", phone: "+55 11 99999-1234", status: "delivered", tags: ["vip", "cliente"] },
              { name: "Carlos Oliveira", phone: "+55 11 88888-5678", status: "opened", tags: ["prospect"] },
              { name: "Ana Costa", phone: "+55 11 77777-9012", status: "failed", tags: ["inadimplente"] },
              { name: "João Pereira", phone: "+55 11 99999-5555", status: "delivered", tags: ["cliente", "promo"] },
              { name: "Beatriz Almeida", phone: "+55 11 99999-6666", status: "opened", tags: ["lead"] },
              { name: "Lucas Fernandes", phone: "+55 11 99999-7777", status: "clicked", tags: ["cliente", "vip"] },
            ]
          },
          {
            id: "individual_1",
            company_id: currentUser.company_id,
            customer_id: "cust_1",
            type: "whatsapp",
            direction: "outbound",
            send_type: "individual", // New field
            subject: "Feliz Aniversário!",
            content: "🎉 Olá Maria! Feliz Aniversário! 🎂\n\nHoje você está completando 34 anos! Desejamos um dia repleto de alegrias e realizações.\n\n🎁 Aproveite nosso desconto especial de aniversário de 15%!",
            status: "delivered",
            sent_date: "2024-01-15T08:30:00Z",
            delivered_date: "2024-01-15T08:31:00Z",
            opened_date: "2024-01-15T08:35:00Z",
            customer_name: "Maria Silva",
            customer_phone: "+55 11 99999-1234",
            customer_email: "maria@email.com",
            user_id: "user_1",
            user_name: "João Admin",
            campaign_id: null,
            campaign_name: null,
            customer_tags: ["vip", "birthday"],
            cost: 0.05,
            recipients_count: 1
          },
          {
            id: "mass_2",
            company_id: currentUser.company_id,
            type: "email",
            direction: "outbound",
            send_type: "mass",
            subject: "📧 Newsletter Semanal - Novidades Imperdíveis",
            content: "Olá!\n\nConfira as principais novidades desta semana:\n\n✨ Novos produtos\n📈 Tendências do mercado\n🎯 Dicas exclusivas\n\nLeia mais em nosso blog!",
            status: "completed",
            sent_date: "2024-01-14T16:00:00Z",
            campaign_id: "camp_2",
            campaign_name: "Newsletter Semanal",
            user_id: "user_2",
            user_name: "Maria Vendas",
            recipients_count: 3420,
            delivered_count: 3350,
            opened_count: 1205,
            clicked_count: 387,
            failed_count: 70,
            total_cost: 68.40
          },
          {
            id: "individual_2",
            company_id: currentUser.company_id,
            customer_id: "cust_2",
            type: "whatsapp",
            direction: "outbound",
            send_type: "individual",
            subject: "Proposta Comercial",
            content: "Boa tarde Carlos!\n\nConforme nossa conversa, segue nossa proposta comercial.\n\nEstou à disposição para esclarecimentos.\n\nAbraços!",
            status: "opened",
            sent_date: "2024-01-14T14:20:00Z",
            delivered_date: "2024-01-14T14:21:00Z",
            opened_date: "2024-01-14T14:45:00Z",
            customer_name: "Carlos Oliveira",
            customer_phone: "+55 11 88888-5678",
            customer_email: "carlos@empresa.com",
            user_id: "user_1",
            user_name: "João Admin",
            campaign_id: null,
            campaign_name: null,
            customer_tags: ["prospect", "comercial"],
            cost: 0.05,
            recipients_count: 1
          },
          { // Example individual message (similar to original id "3")
            id: "individual_3",
            company_id: currentUser.company_id,
            customer_id: "cust_3",
            user_id: "user_2",
            campaign_id: "camp_3", // Changed campaign_id for unique data
            type: "whatsapp",
            direction: "outbound",
            send_type: "individual",
            subject: "Cobrança Pendente",
            content: "Boa tarde Ana!\n\nSua fatura de Janeiro no valor de R$ 299,99 está pendente.\n\nVencimento: 30/01/2024\n\nPor favor, efetue o pagamento para evitar a suspensão dos serviços.",
            status: "failed",
            sent_date: "2024-01-13T14:20:00Z",
            delivered_date: null,
            opened_date: null,
            customer_name: "Ana Costa",
            customer_phone: "+55 11 77777-9012",
            customer_email: "ana@costa.com",
            user_name: "Maria Vendas",
            campaign_name: "Campanha Cobrança Janeiro",
            customer_tags: ["inadimplente", "billing"],
            cost: 0.05,
            error_reason: "Número inválido",
            recipients_count: 1
          },
          { // Example individual message (similar to original id "4")
            id: "individual_4",
            company_id: currentUser.company_id,
            customer_id: "cust_4",
            user_id: "user_1",
            campaign_id: null,
            type: "sms",
            direction: "outbound",
            send_type: "individual",
            subject: "Lembrete de Consulta",
            content: "Olá! Sua consulta está agendada para amanhã às 14h. Confirme sua presença respondendo SIM.",
            status: "delivered",
            sent_date: "2024-01-12T09:15:00Z",
            delivered_date: "2024-01-12T09:16:00Z",
            opened_date: null,
            customer_name: "Roberto Santos",
            customer_phone: "+55 11 66666-3456",
            customer_email: "roberto@santos.com",
            user_name: "João Admin",
            campaign_name: null,
            customer_tags: ["cliente", "consulta"],
            cost: 0.08,
            recipients_count: 1
          },
          { // Example individual message (similar to original id "5")
            id: "individual_5",
            company_id: currentUser.company_id,
            customer_id: "cust_5",
            user_id: "user_2",
            campaign_id: "camp_4", // Changed campaign_id for unique data
            type: "email",
            direction: "outbound",
            send_type: "individual",
            subject: "🚀 Oferta Especial - 50% OFF",
            content: "Olá Patricia!\n\nTemos uma oferta exclusiva para você!\n\n🔥 Curso Completo de Marketing Digital\n💰 Desconto de 50%\n⏰ Válido até 31/01/2024",
            status: "clicked",
            sent_date: "2024-01-11T11:00:00Z",
            delivered_date: "2024-01-11T11:01:00Z",
            opened_date: "2024-01-11T11:30:00Z",
            customer_name: "Patricia Lima",
            customer_phone: "+55 11 55555-7890",
            customer_email: "patricia@lima.com",
            user_name: "Maria Vendas",
            campaign_name: "Promoção Janeiro 2024",
            customer_tags: ["lead", "marketing"],
            cost: 0.02,
            recipients_count: 1
          }
        ];

        setCommunications(mockCommunications);

        // Mock campaigns data
        const mockCampaigns = [
          { id: "camp_1", name: "Black Friday 2024" },
          { id: "camp_2", name: "Newsletter Semanal" },
          { id: "camp_3", name: "Campanha Cobrança Janeiro" },
          { id: "camp_4", name: "Promoção Janeiro 2024" }
        ];
        setCampaigns(mockCampaigns);

        // Mock users data
        const mockUsers = [
          { id: "user_1", name: "João Admin" },
          { id: "user_2", name: "Maria Vendas" }
        ];
        setUsers(mockUsers);

        // Extract unique tags from communications
        const tagsSet = new Set();
        mockCommunications.forEach(comm => {
          if (comm.send_type === 'individual' && comm.customer_tags && Array.isArray(comm.customer_tags)) {
            comm.customer_tags.forEach(tag => tagsSet.add(tag));
          } else if (comm.send_type === 'mass' && comm.recipients && Array.isArray(comm.recipients)) {
            comm.recipients.forEach(recipient => {
              if (recipient.tags && Array.isArray(recipient.tags)) {
                recipient.tags.forEach(tag => tagsSet.add(tag));
              }
            });
          }
        });
        setAvailableTags(Array.from(tagsSet));
      }
    } catch (error) {
      console.error("Error loading communications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewModeToggle = () => {
    if (viewMode === "grid") {
      const nextColumns = gridColumns >= 5 ? 2 : gridColumns + 1;
      setGridColumns(nextColumns);
    } else {
      const compactLevels = ["normal", "compact", "extra-compact"];
      const currentIndex = compactLevels.indexOf(listCompactness);
      const nextIndex = (currentIndex + 1) % compactLevels.length;
      setListCompactness(compactLevels[nextIndex]);
    }
  };

  const toggleViewMode = () => {
    setViewMode(viewMode === "grid" ? "list" : "grid");
  };

  const getStats = () => {
    let totalSent = 0;
    let delivered = 0;
    let opened = 0;
    let clicked = 0;
    let failed = 0;
    let totalCost = 0;

    communications.forEach(c => {
      if (c.send_type === 'mass') {
        totalSent += c.recipients_count || 0;
        delivered += c.delivered_count || 0;
        opened += c.opened_count || 0;
        clicked += c.clicked_count || 0;
        failed += c.failed_count || 0;
        totalCost += c.total_cost || 0;
      } else { // individual
        totalSent += 1;
        if (c.status === 'delivered' || c.status === 'opened' || c.status === 'clicked') {
          delivered += 1;
        }
        if (c.status === 'opened' || c.status === 'clicked') {
          opened += 1;
        }
        if (c.status === 'clicked') {
          clicked += 1;
        }
        if (c.status === 'failed') {
          failed += 1;
        }
        totalCost += c.cost || 0;
      }
    });

    const deliveryRate = totalSent > 0 ? (delivered / totalSent * 100).toFixed(1) : 0;
    const openRate = totalSent > 0 ? (opened / totalSent * 100).toFixed(1) : 0;
    const clickRate = totalSent > 0 ? (clicked / totalSent * 100).toFixed(1) : 0;

    // Mock evolution data (in real app, this would come from previous period)
    return {
      totalSent,
      totalSentGrowth: "+15%",
      delivered,
      deliveredGrowth: "+12%",
      opened,
      openedGrowth: "+8%",
      clicked,
      clickedGrowth: "+25%",
      failed,
      failedGrowth: "-5%",
      totalCost: totalCost.toFixed(2),
      costGrowth: "+18%",
      deliveryRate: `${deliveryRate}%`,
      deliveryRateGrowth: "+2%",
      openRate: `${openRate}%`,
      openRateGrowth: "+3%"
    };
  };

  const filteredCommunications = communications
    .filter(comm => {
      // Search filter
      const matchesSearch = !searchTerm || 
        comm.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comm.customer_phone?.includes(searchTerm) ||
        comm.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comm.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comm.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (comm.recipients && comm.recipients.some(r => 
          r.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.phone?.includes(searchTerm)
        ));

      // Type filter
      const matchesType = selectedType === "all" || comm.type === selectedType;

      // Status filter
      const matchesStatus = selectedStatus === "all" || comm.status === selectedStatus;

      // Send type filter (mass/individual)
      const matchesSendType = selectedSendType === "all" || comm.send_type === selectedSendType;

      // Campaign filter
      const matchesCampaign = selectedCampaigns.length === 0 || 
        selectedCampaigns.includes(comm.campaign_id) ||
        (selectedCampaigns.includes("no_campaign") && !comm.campaign_id);

      // Tag filter
      const matchesTags = selectedTags.length === 0 ||
        (comm.customer_tags && comm.customer_tags.some(tag => selectedTags.includes(tag))) ||
        (comm.recipients && comm.recipients.some(r => 
          r.tags && r.tags.some(tag => selectedTags.includes(tag))
        ));

      // User filter
      const matchesUser = selectedUsers.length === 0 || selectedUsers.includes(comm.user_id);

      // Date filter
      const matchesDateRange = (!dateFrom || !dateTo) || 
        isWithinInterval(parseISO(comm.sent_date), {
          start: dateFrom,
          end: dateTo
        });

      return matchesSearch && matchesType && matchesStatus && matchesSendType && matchesCampaign && matchesTags && matchesUser && matchesDateRange;
    })
    .sort((a, b) => {
      let aValue, bValue;
      switch (sortBy) {
        case "sent_date":
          aValue = new Date(a.sent_date);
          bValue = new Date(b.sent_date);
          break;
        case "customer_name":
          aValue = a.customer_name?.toLowerCase() || "";
          bValue = b.customer_name?.toLowerCase() || "";
          break;
        case "campaign_name":
          aValue = a.campaign_name?.toLowerCase() || "";
          bValue = b.campaign_name?.toLowerCase() || "";
          break;
        case "user_name":
          aValue = a.user_name?.toLowerCase() || "";
          bValue = b.user_name?.toLowerCase() || "";
          break;
        case "status":
          aValue = a.status;
          bValue = b.status;
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

  const handleViewDetails = (message) => {
    setSelectedMessage(message);
    setShowDetailsModal(true);
  };

  const handleResend = (message) => {
    setSelectedMessage(message);
    setShowResendModal(true);
  };

  const handleSchedule = (message) => {
    setSelectedMessage(message);
    setShowScheduleModal(true);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200 rounded-full text-xs">Enviado</Badge>;
      case 'delivered':
        return <Badge className="bg-green-100 text-green-800 border-green-200 rounded-full text-xs">Entregue</Badge>;
      case 'opened':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200 rounded-full text-xs">Aberto</Badge>;
      case 'clicked':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200 rounded-full text-xs">Clicado</Badge>;
      case 'replied':
        return <Badge className="bg-cyan-100 text-cyan-800 border-cyan-200 rounded-full text-xs">Respondido</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 border-red-200 rounded-full text-xs">Falhou</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200 rounded-full text-xs">Pendente</Badge>;
    }
  };

  const getTypeIcon = (type) => {
    const typeData = communicationTypes.find(t => t.id === type);
    return typeData ? typeData.icon : MessageSquare;
  };

  const getTypeColor = (type) => {
    const typeData = communicationTypes.find(t => t.id === type);
    return typeData ? typeData.color : 'bg-gray-100 text-gray-800';
  };

  const stats = getStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-green-700 rounded-2xl flex items-center justify-center">
          <Archive className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Send History</h1>
          <p className="text-gray-600">
            Acompanhe o histórico completo de mensagens enviadas e suas métricas
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {[
          { 
            label: "Total Enviado", 
            value: stats.totalSent, 
            change: stats.totalSentGrowth, 
            changeType: "positive", 
            icon: Send, 
            color: "text-blue-600 bg-blue-50" 
          },
          { 
            label: "Entregues", 
            value: stats.delivered, 
            change: stats.deliveredGrowth, 
            changeType: "positive", 
            icon: CheckCircle2, 
            color: "text-green-600 bg-green-50" 
          },
          { 
            label: "Abertos", 
            value: stats.opened, 
            change: stats.openedGrowth, 
            changeType: "positive", 
            icon: Eye, 
            color: "text-purple-600 bg-purple-50" 
          },
          { 
            label: "Clicados", 
            value: stats.clicked, 
            change: stats.clickedGrowth, 
            changeType: "positive", 
            icon: Target, 
            color: "text-orange-600 bg-orange-50" 
          },
          { 
            label: "Falhas", 
            value: stats.failed, 
            change: stats.failedGrowth, 
            changeType: "negative", 
            icon: XCircle, 
            color: "text-red-600 bg-red-50" 
          },
          { 
            label: "Custo Total", 
            value: `R$ ${stats.totalCost}`, 
            change: stats.costGrowth, 
            changeType: "neutral", 
            icon: Activity, 
            color: "text-gray-600 bg-gray-50" 
          },
          { 
            label: "Taxa Entrega", 
            value: stats.deliveryRate, 
            change: stats.deliveryRateGrowth, 
            changeType: "positive", 
            icon: TrendingUp, 
            color: "text-emerald-600 bg-emerald-50" 
          },
          { 
            label: "Taxa Abertura", 
            value: stats.openRate, 
            change: stats.openRateGrowth, 
            changeType: "positive", 
            icon: Users, 
            color: "text-indigo-600 bg-indigo-50" 
          }
        ].map((stat, index) => (
          <Card key={index} className="rounded-2xl border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 ${stat.color} rounded-xl flex items-center justify-center`}>
                  <stat.icon className="w-4 h-4" />
                </div>
                <div className={`text-xs font-medium px-2 py-1 rounded-full ${
                  stat.changeType === 'positive' ? 'bg-green-100 text-green-700' : 
                  stat.changeType === 'negative' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {stat.change}
                </div>
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex-1 flex flex-col md:flex-row gap-4 w-full lg:w-auto">
          {/* Search */}
          <div className="relative flex-1 md:max-w-md">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Buscar por nome, telefone, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-2xl border-gray-200"
            />
          </div>
          
          {/* Date Range Filter */}
          <Popover open={dateFilterOpen} onOpenChange={setDateFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="rounded-2xl border-gray-200">
                <CalendarIcon className="w-4 h-4 mr-2" />
                {dateFrom && dateTo 
                  ? `${format(dateFrom, 'dd/MM')} - ${format(dateTo, 'dd/MM')}`
                  : 'Período'
                }
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-2xl" align="start">
              <div className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium mb-2">De:</p>
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      locale={ptBR}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Até:</p>
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      locale={ptBR}
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setDateFrom(null);
                      setDateTo(null);
                    }}
                    className="flex-1 rounded-2xl"
                  >
                    Limpar
                  </Button>
                  <Button 
                    onClick={() => setDateFilterOpen(false)}
                    className="flex-1 rounded-2xl bg-blue-600 hover:bg-blue-700"
                  >
                    Aplicar
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Send Type Filter */}
          <Select value={selectedSendType} onValueChange={setSelectedSendType}>
            <SelectTrigger className="w-44 rounded-2xl border-gray-200">
              <SelectValue placeholder="Tipo Envio" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="all">Todos os Envios</SelectItem>
              <SelectItem value="mass">Envio em Massa</SelectItem>
              <SelectItem value="individual">Envio Individual</SelectItem>
            </SelectContent>
          </Select>

          {/* Type Filter */}
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-40 rounded-2xl border-gray-200">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="all">Todos os Tipos</SelectItem>
              {communicationTypes.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  <div className="flex items-center gap-2">
                    <type.icon className="w-4 h-4" />
                    {type.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-40 rounded-2xl border-gray-200">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="all">Todos Status</SelectItem>
              <SelectItem value="sent">Enviado</SelectItem>
              <SelectItem value="delivered">Entregue</SelectItem>
              <SelectItem value="opened">Aberto</SelectItem>
              <SelectItem value="clicked">Clicado</SelectItem>
              <SelectItem value="replied">Respondido</SelectItem>
              <SelectItem value="failed">Falhou</SelectItem>
              <SelectItem value="completed">Concluído (Massa)</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-48 rounded-2xl border-gray-200">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="sent_date">Data de Envio</SelectItem>
              <SelectItem value="customer_name">Nome do Cliente</SelectItem>
              <SelectItem value="campaign_name">Campanha</SelectItem>
              <SelectItem value="user_name">Usuário</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="rounded-2xl"
          >
            <ArrowUpDown className="w-4 h-4 mr-2" />
            {sortOrder === 'asc' ? 'Crescente' : 'Decrescente'}
          </Button>
        </div>

        <div className="flex gap-3 w-full lg:w-auto">
          {/* View Mode Controls */}
          <Button
            variant="outline"
            onClick={toggleViewMode}
            className="rounded-2xl"
          >
            {viewMode === "grid" ? <List className="w-4 h-4 mr-2" /> : <Grid3X3 className="w-4 h-4 mr-2" />}
            {viewMode === "grid" ? "List View" : "Grid View"}
          </Button>
          
          <Button
            variant="outline"
            onClick={handleViewModeToggle}
            className="rounded-2xl"
          >
            {viewMode === "grid" 
              ? `${gridColumns} Colunas` 
              : `${listCompactness === 'extra-compact' ? 'Extra Compacto' : listCompactness === 'compact' ? 'Compacto' : 'Normal'}`
            }
          </Button>
        </div>
      </div>

      {/* Additional Filters */}
      <div className="flex flex-wrap gap-4">
        {/* Campaign Filter */}
        <DropdownMenu open={campaignFilterOpen} onOpenChange={setCampaignFilterOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="rounded-2xl border-gray-200">
              <Filter className="w-4 h-4 mr-2" />
              Campanhas ({selectedCampaigns.length})
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64 rounded-2xl p-4">
            <div className="space-y-2">
              <p className="font-medium text-sm text-gray-900 mb-3">Selecionar Campanhas</p>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="no_campaign"
                  checked={selectedCampaigns.includes("no_campaign")}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedCampaigns([...selectedCampaigns, "no_campaign"]);
                    } else {
                      setSelectedCampaigns(selectedCampaigns.filter(id => id !== "no_campaign"));
                    }
                  }}
                />
                <label htmlFor="no_campaign" className="text-sm font-medium">
                  Mensagens Individuais
                </label>
              </div>
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`campaign-${campaign.id}`}
                    checked={selectedCampaigns.includes(campaign.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedCampaigns([...selectedCampaigns, campaign.id]);
                      } else {
                        setSelectedCampaigns(selectedCampaigns.filter(id => id !== campaign.id));
                      }
                    }}
                  />
                  <label
                    htmlFor={`campaign-${campaign.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {campaign.name}
                  </label>
                </div>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Tag Filter */}
        <DropdownMenu open={tagFilterOpen} onOpenChange={setTagFilterOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="rounded-2xl border-gray-200">
              <Filter className="w-4 h-4 mr-2" />
              Tags ({selectedTags.length})
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64 rounded-2xl p-4 max-h-64 overflow-y-auto">
            <div className="space-y-2">
              <p className="font-medium text-sm text-gray-900 mb-3">Selecionar Tags</p>
              {availableTags.map((tag) => (
                <div key={tag} className="flex items-center space-x-2">
                  <Checkbox
                    id={`tag-${tag}`}
                    checked={selectedTags.includes(tag)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedTags([...selectedTags, tag]);
                      } else {
                        setSelectedTags(selectedTags.filter(t => t !== tag));
                      }
                    }}
                  />
                  <label
                    htmlFor={`tag-${tag}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {tag}
                  </label>
                </div>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Filter */}
        <DropdownMenu open={userFilterOpen} onOpenChange={setUserFilterOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="rounded-2xl border-gray-200">
              <Filter className="w-4 h-4 mr-2" />
              Usuários ({selectedUsers.length})
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64 rounded-2xl p-4">
            <div className="space-y-2">
              <p className="font-medium text-sm text-gray-900 mb-3">Selecionar Usuários</p>
              {users.map((user) => (
                <div key={user.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`user-${user.id}`}
                    checked={selectedUsers.includes(user.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedUsers([...selectedUsers, user.id]);
                      } else {
                        setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                      }
                    }}
                  />
                  <label
                    htmlFor={`user-${user.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {user.name}
                  </label>
                </div>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Active Filters Display */}
      {(selectedCampaigns.length > 0 || selectedTags.length > 0 || selectedUsers.length > 0 || dateFrom || dateTo || selectedSendType !== 'all') && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-gray-500 mr-2">Filtros ativos:</span>
          
          {/* Send Type */}
          {selectedSendType !== 'all' && (
            <Badge variant="secondary" className="rounded-full px-3 py-1 bg-yellow-100 text-yellow-800 border-yellow-200">
              Envio: {selectedSendType === 'mass' ? 'Em Massa' : 'Individual'}
              <button
                onClick={() => setSelectedSendType('all')}
                className="ml-2 hover:text-red-600"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}

          {/* Date Range */}
          {dateFrom && dateTo && (
            <Badge variant="secondary" className="rounded-full px-3 py-1 bg-blue-100 text-blue-800 border-blue-200">
              Período: {format(dateFrom, 'dd/MM')} - {format(dateTo, 'dd/MM')}
              <button
                onClick={() => {
                  setDateFrom(null);
                  setDateTo(null);
                }}
                className="ml-2 hover:text-red-600"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}

          {/* Campaign Badges */}
          {selectedCampaigns.map((campaignId) => {
            const campaignName = campaignId === "no_campaign" 
              ? "Mensagens Individuais" 
              : campaigns.find(c => c.id === campaignId)?.name || campaignId;
            return (
              <Badge
                key={campaignId}
                variant="secondary"
                className="rounded-full px-3 py-1 bg-purple-100 text-purple-800 border-purple-200"
              >
                Campanha: {campaignName}
                <button
                  onClick={() => setSelectedCampaigns(selectedCampaigns.filter(id => id !== campaignId))}
                  className="ml-2 hover:text-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            );
          })}

          {/* Tag Badges */}
          {selectedTags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="rounded-full px-3 py-1 bg-green-100 text-green-800 border-green-200"
            >
              Tag: {tag}
              <button
                onClick={() => setSelectedTags(selectedTags.filter(t => t !== tag))}
                className="ml-2 hover:text-red-600"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}

          {/* User Badges */}
          {selectedUsers.map((userId) => {
            const userName = users.find(u => u.id === userId)?.name || userId;
            return (
              <Badge
                key={userId}
                variant="secondary"
                className="rounded-full px-3 py-1 bg-orange-100 text-orange-800 border-orange-200"
              >
                Usuário: {userName}
                <button
                  onClick={() => setSelectedUsers(selectedUsers.filter(id => id !== userId))}
                  className="ml-2 hover:text-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}

      {/* Communications Display */}
      {filteredCommunications.length > 0 ? (
        <div className={viewMode === 'grid' 
          ? `grid gap-6 ${gridColumns === 2 ? 'grid-cols-1 md:grid-cols-2' : 
              gridColumns === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
              gridColumns === 4 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' :
              'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'}`
          : "space-y-4"
        }>
          {filteredCommunications.map((communication) => {
            const TypeIcon = getTypeIcon(communication.type);
            const typeColor = getTypeColor(communication.type);
            const isMassMessage = communication.send_type === 'mass';
            const recipientCount = communication.recipients_count || 1;

            if (viewMode === 'grid') {
              return (
                <div key={communication.id} className="relative">
                  {/* Depth effect for mass messages */}
                  {isMassMessage && (
                    <>
                      {/* Background cards for depth effect */}
                      {recipientCount > 100 && (
                        <div className="absolute inset-0 bg-gray-100 rounded-3xl transform rotate-1 translate-x-1 translate-y-1 opacity-30"></div>
                      )}
                      {recipientCount > 500 && (
                        <div className="absolute inset-0 bg-gray-200 rounded-3xl transform rotate-2 translate-x-2 translate-y-2 opacity-20"></div>
                      )}
                      {recipientCount > 1000 && (
                        <div className="absolute inset-0 bg-gray-300 rounded-3xl transform rotate-3 translate-x-3 translate-y-3 opacity-15"></div>
                      )}
                    </>
                  )}
                  
                  <Card className={`rounded-3xl border-gray-200 hover:shadow-lg transition-shadow relative z-10 ${
                    isMassMessage ? 'border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-50/50 to-white' : 'bg-white'
                  }`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 ${typeColor} rounded-2xl flex items-center justify-center relative`}>
                            <TypeIcon className="w-5 h-5" />
                            {isMassMessage && (
                              <div className="absolute -top-1 -right-1 w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center">
                                <Users className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {isMassMessage ? (
                                <div>
                                  <span className="text-purple-700">Envio em Massa</span>
                                  <div className="text-sm text-gray-600 font-normal">
                                    {recipientCount.toLocaleString()} destinatários
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <span>{communication.customer_name}</span>
                                  <div className="text-sm text-gray-500 font-normal">
                                    {communication.customer_phone}
                                  </div>
                                </div>
                              )}
                            </h3>
                          </div>
                        </div>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="rounded-2xl">
                            <DropdownMenuItem 
                              className="rounded-xl"
                              onClick={() => handleViewDetails(communication)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="rounded-xl"
                              onClick={() => handleResend(communication)}
                            >
                              <Send className="w-4 h-4 mr-2" />
                              Reenviar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="rounded-xl"
                              onClick={() => handleSchedule(communication)}
                            >
                              <Clock className="w-4 h-4 mr-2" />
                              Agendar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      {/* Message Subject/Title */}
                      {communication.subject && (
                        <div className="bg-gray-50 rounded-2xl p-3">
                          <p className="font-medium text-sm text-gray-900">{communication.subject}</p>
                        </div>
                      )}

                      {/* Content Preview */}
                      <div className="bg-gray-50 rounded-2xl p-3">
                        <p className="text-sm text-gray-700 line-clamp-3">
                          {communication.content}
                        </p>
                      </div>

                      {/* Mass Message Stats */}
                      {isMassMessage && (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-green-50 rounded-xl p-2 text-center">
                            <p className="text-green-800 font-semibold text-sm">{communication.delivered_count || 0}</p>
                            <p className="text-green-600 text-xs">Entregues</p>
                          </div>
                          <div className="bg-blue-50 rounded-xl p-2 text-center">
                            <p className="text-blue-800 font-semibold text-sm">{communication.opened_count || 0}</p>
                            <p className="text-blue-600 text-xs">Abertos</p>
                          </div>
                          <div className="bg-orange-50 rounded-xl p-2 text-center">
                            <p className="text-orange-800 font-semibold text-sm">{communication.clicked_count || 0}</p>
                            <p className="text-orange-600 text-xs">Clicados</p>
                          </div>
                          <div className="bg-red-50 rounded-xl p-2 text-center">
                            <p className="text-red-800 font-semibold text-sm">{communication.failed_count || 0}</p>
                            <p className="text-red-600 text-xs">Falharam</p>
                          </div>
                        </div>
                      )}

                      {/* Tags for individual messages */}
                      {!isMassMessage && communication.customer_tags && communication.customer_tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {communication.customer_tags.slice(0, 3).map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs rounded-full bg-gray-100 text-gray-600">
                              {tag}
                            </Badge>
                          ))}
                          {communication.customer_tags.length > 3 && (
                            <Badge variant="outline" className="text-xs rounded-full bg-gray-100 text-gray-600">
                              +{communication.customer_tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <p className="text-xs text-gray-500">Enviado</p>
                            <p className="text-xs font-medium text-gray-900">
                              {format(new Date(communication.sent_date), 'dd/MM HH:mm')}
                            </p>
                          </div>
                          {communication.campaign_name && (
                            <div className="text-center">
                              <p className="text-xs text-gray-500">Campanha</p>
                              <p className="text-xs font-medium text-gray-900 truncate max-w-20">
                                {communication.campaign_name}
                              </p>
                            </div>
                          )}
                          {isMassMessage && communication.total_cost && (
                            <div className="text-center">
                              <p className="text-xs text-gray-500">Custo</p>
                              <p className="text-xs font-medium text-gray-900">
                                R$ {communication.total_cost.toFixed(2)}
                              </p>
                            </div>
                          )}
                        </div>
                        
                        {!isMassMessage ? getStatusBadge(communication.status) : (
                          <Badge className="bg-purple-100 text-purple-800 border-purple-200 rounded-full text-xs">
                            {communication.status === 'completed' ? 'Concluído' : communication.status}
                          </Badge>
                        )}
                      </div>

                      {/* Error Message */}
                      {communication.status === 'failed' && communication.error_reason && (
                        <div className="bg-red-50 rounded-2xl p-3">
                          <p className="text-xs text-red-700">
                            <strong>Erro:</strong> {communication.error_reason}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            } else {
              // List view with similar depth effect for mass messages
              return (
                <div key={communication.id} className="relative">
                  {/* Depth effect for mass messages in list view */}
                  {isMassMessage && (
                    <>
                      {recipientCount > 100 && (
                        <div className="absolute inset-0 bg-gray-100 rounded-2xl transform translate-x-1 translate-y-1 opacity-30"></div>
                      )}
                      {recipientCount > 500 && (
                        <div className="absolute inset-0 bg-gray-200 rounded-2xl transform translate-x-2 translate-y-2 opacity-20"></div>
                      )}
                      {recipientCount > 1000 && (
                        <div className="absolute inset-0 bg-gray-300 rounded-2xl transform translate-x-3 translate-y-3 opacity-15"></div>
                      )}
                    </>
                  )}

                  <Card className={`rounded-2xl border-gray-200 hover:shadow-md transition-shadow relative z-10 ${
                    isMassMessage ? 'border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-50/30 to-white' : 'bg-white'
                  }`}>
                    <CardContent className={`${listCompactness === 'extra-compact' ? 'p-3' : listCompactness === 'compact' ? 'p-4' : 'p-6'}`}>
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <Avatar className={`${listCompactness === 'extra-compact' ? 'w-8 h-8' : listCompactness === 'compact' ? 'w-10 h-10' : 'w-12 h-12'}`}>
                            <AvatarFallback className={`${
                              isMassMessage ? 'bg-gradient-to-br from-purple-400 to-purple-500' : 'bg-gradient-to-br from-blue-400 to-blue-500'
                            } text-white font-medium`}>
                              {isMassMessage ? <Users className="w-6 h-6" /> : 
                                (communication.customer_name?.split(' ').map(n => n[0]).join('') || 'C')
                              }
                            </AvatarFallback>
                          </Avatar>
                          <div className={`absolute -bottom-1 -right-1 w-6 h-6 ${typeColor} rounded-full border-2 border-white flex items-center justify-center`}>
                            <TypeIcon className="w-3 h-3" />
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className={`font-semibold text-gray-900 truncate ${listCompactness === 'extra-compact' ? 'text-sm' : 'text-base'}`}>
                              {isMassMessage ? (
                                <span className="text-purple-700">Envio em Massa ({recipientCount.toLocaleString()} destinatários)</span>
                              ) : (
                                communication.customer_name
                              )}
                            </h3>
                            {!isMassMessage ? getStatusBadge(communication.status) : (
                              <Badge className="bg-purple-100 text-purple-800 border-purple-200 rounded-full text-xs">
                                {communication.status === 'completed' ? 'Concluído' : communication.status}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            {!isMassMessage && <span>{communication.customer_phone}</span>}
                            <span>{format(new Date(communication.sent_date), 'dd/MM/yyyy HH:mm')}</span>
                            <span>{communication.user_name}</span>
                            {communication.campaign_name && (
                              <Badge variant="outline" className="text-xs">
                                {communication.campaign_name}
                              </Badge>
                            )}
                          </div>

                          {listCompactness !== 'extra-compact' && (
                            <div className="mt-2">
                              {communication.subject && (
                                <p className="text-sm font-medium text-gray-900 truncate mb-1">
                                  {communication.subject}
                                </p>
                              )}
                              <p className="text-sm text-gray-600 line-clamp-2">
                                {communication.content}
                              </p>
                            </div>
                          )}

                          {/* Mass message metrics in list view */}
                          {isMassMessage && (
                            <div className="flex gap-4 mt-2 text-xs">
                              <span className="text-green-600">✓ {communication.delivered_count || 0} entregues</span>
                              <span className="text-blue-600">👁 {communication.opened_count || 0} abertos</span>
                              <span className="text-orange-600">🖱 {communication.clicked_count || 0} cliques</span>
                              {communication.failed_count > 0 && (
                                <span className="text-red-600">❌ {communication.failed_count || 0} falhas</span>
                              )}
                            </div>
                          )}

                          {!isMassMessage && communication.customer_tags && communication.customer_tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {communication.customer_tags.slice(0, 4).map((tag, index) => (
                                <Badge key={index} variant="outline" className="text-xs rounded-full">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {(isMassMessage ? communication.total_cost : communication.cost) !== undefined && (
                            <div className="text-right">
                              <p className={`font-semibold text-gray-900 ${listCompactness === 'compact' ? 'text-sm' : 'text-base'}`}>
                                R$ {(isMassMessage ? communication.total_cost || 0 : communication.cost || 0).toFixed(isMassMessage ? 2 : 3)}
                              </p>
                              <p className="text-xs text-gray-500">custo</p>
                            </div>
                          )}
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="rounded-2xl">
                              <DropdownMenuItem 
                                className="rounded-xl"
                                onClick={() => handleViewDetails(communication)}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Ver Detalhes
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="rounded-xl"
                                onClick={() => handleResend(communication)}
                              >
                                <Send className="w-4 h-4 mr-2" />
                                Reenviar
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="rounded-xl"
                                onClick={() => handleSchedule(communication)}
                              >
                                <Clock className="w-4 h-4 mr-2" />
                                Agendar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Error Message for List View */}
                      {communication.status === 'failed' && communication.error_reason && (
                        <div className="bg-red-50 rounded-2xl p-3 mt-3">
                          <p className="text-xs text-red-700">
                            <strong>Erro:</strong> {communication.error_reason}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            }
          })}
        </div>
      ) : (
        <Card className="rounded-3xl border-gray-200">
          <CardContent className="text-center py-16">
            <Archive className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchTerm || selectedCampaigns.length > 0 || selectedTags.length > 0 || selectedUsers.length > 0 || dateFrom || dateTo
                ? 'Nenhuma mensagem encontrada' 
                : 'Nenhuma mensagem enviada'
              }
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || selectedCampaigns.length > 0 || selectedTags.length > 0 || selectedUsers.length > 0 || dateFrom || dateTo
                ? 'Tente ajustar os filtros de busca'
                : 'Quando você enviar mensagens, elas aparecerão aqui'
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      {showDetailsModal && selectedMessage && (
        <MessageDetailsModal
          message={selectedMessage}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedMessage(null);
          }}
        />
      )}

      {showResendModal && selectedMessage && (
        <ResendMessageModal
          message={selectedMessage}
          onClose={() => {
            setShowResendModal(false);
            setSelectedMessage(null);
          }}
          onResend={() => {
            setShowResendModal(false);
            setSelectedMessage(null);
            // Handle resend logic
          }}
        />
      )}

      {showScheduleModal && selectedMessage && (
        <ScheduleMessageModal
          message={selectedMessage}
          onClose={() => {
            setShowScheduleModal(false);
            setSelectedMessage(null);
          }}
          onSchedule={() => {
            setShowScheduleModal(false);
            setSelectedMessage(null);
            // Handle schedule logic
          }}
        />
      )}
    </div>
  );
}
