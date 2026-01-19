
import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Plus,
  Search,
  Clock,
  AlertCircle,
  CheckCircle2,
  MessageSquare,
  User as UserIcon,
  Calendar,
  Timer,
  ArrowUp,
  ArrowDown,
  Minus,
  Eye,
  Filter,
  Send,
  Paperclip,
  X
} from "lucide-react";
import { format, formatDistanceToNow, addHours, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function SupportTickets() {
  const [user, setUser] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("open");

  // New ticket form
  const [newTicket, setNewTicket] = useState({
    subject: "",
    category: "",
    subcategory: "",
    priority: "medium",
    description: "",
    attachments: []
  });

  // Reply form
  const [replyMessage, setReplyMessage] = useState("");

  // Ticket categories and subcategories
  const ticketCategories = {
    technical: {
      name: "Problema Técnico",
      sla_hours: 24,
      subcategories: {
        connection: { name: "Problemas de Conexão", sla_hours: 4 },
        messages: { name: "Envio de Mensagens", sla_hours: 8 },
        import: { name: "Importação de Dados", sla_hours: 12 },
        performance: { name: "Performance do Sistema", sla_hours: 24 },
        integration: { name: "Integrações", sla_hours: 48 }
      }
    },
    billing: {
      name: "Faturamento",
      sla_hours: 48,
      subcategories: {
        payment: { name: "Problemas de Pagamento", sla_hours: 24 },
        plan_change: { name: "Alteração de Plano", sla_hours: 4 },
        invoice: { name: "Solicitação de Fatura", sla_hours: 8 },
        refund: { name: "Reembolso", sla_hours: 72 }
      }
    },
    account: {
      name: "Conta e Acesso",
      sla_hours: 12,
      subcategories: {
        login: { name: "Problemas de Login", sla_hours: 2 },
        password: { name: "Redefinição de Senha", sla_hours: 1 },
        permissions: { name: "Permissões e Roles", sla_hours: 8 },
        profile: { name: "Alterações no Perfil", sla_hours: 4 }
      }
    },
    feature: {
      name: "Solicitação de Funcionalidade",
      sla_hours: 120,
      subcategories: {
        new_feature: { name: "Nova Funcionalidade", sla_hours: 168 },
        improvement: { name: "Melhoria", sla_hours: 120 },
        customization: { name: "Personalização", sla_hours: 72 }
      }
    },
    general: {
      name: "Dúvida Geral",
      sla_hours: 8,
      subcategories: {
        usage: { name: "Como Usar", sla_hours: 4 },
        best_practices: { name: "Melhores Práticas", sla_hours: 8 },
        training: { name: "Treinamento", sla_hours: 24 }
      }
    }
  };

  const prioritySettings = {
    low: { name: "Baixa", color: "bg-gray-100 text-gray-800", multiplier: 2.0 },
    medium: { name: "Média", color: "bg-yellow-100 text-yellow-800", multiplier: 1.0 },
    high: { name: "Alta", color: "bg-orange-100 text-orange-800", multiplier: 0.5 },
    urgent: { name: "Urgente", color: "bg-red-100 text-red-800", multiplier: 0.25 }
  };

  const statusSettings = {
    open: { name: "Aberto", color: "bg-blue-100 text-blue-800", icon: AlertCircle },
    in_progress: { name: "Em Andamento", color: "bg-yellow-100 text-yellow-800", icon: Clock },
    waiting_customer: { name: "Aguardando Cliente", color: "bg-purple-100 text-purple-800", icon: UserIcon },
    resolved: { name: "Resolvido", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
    closed: { name: "Fechado", color: "bg-gray-100 text-gray-800", icon: X }
  };

  // Mock data
  const mockTickets = [
    {
      id: "TK-2024-001",
      subject: "Problema na conexão do WhatsApp",
      category: "technical",
      subcategory: "connection",
      priority: "high",
      status: "open",
      description: "Minha sessão do WhatsApp fica desconectando constantemente. Já tentei reconectar várias vezes mas o problema persiste.",
      created_date: "2024-01-20T14:30:00Z",
      updated_date: "2024-01-20T14:30:00Z",
      created_by: "user123",
      assigned_to: null,
      sla_deadline: "2024-01-20T16:30:00Z",
      messages: [
        {
          id: "msg1",
          author: "João Silva",
          author_type: "customer",
          message: "Minha sessão do WhatsApp fica desconectando constantemente. Já tentei reconectar várias vezes mas o problema persiste.",
          created_date: "2024-01-20T14:30:00Z",
          attachments: []
        }
      ]
    },
    {
      id: "TK-2024-002",
      subject: "Solicitação de upgrade de plano",
      category: "billing",
      subcategory: "plan_change",
      priority: "medium",
      status: "in_progress",
      description: "Gostaria de fazer upgrade do plano Basic para Plus. Como posso proceder?",
      created_date: "2024-01-19T10:15:00Z",
      updated_date: "2024-01-19T15:22:00Z",
      created_by: "user456",
      assigned_to: "admin_maria",
      sla_deadline: "2024-01-19T14:15:00Z",
      messages: [
        {
          id: "msg2",
          author: "Maria Santos",
          author_type: "customer",
          message: "Gostaria de fazer upgrade do plano Basic para Plus. Como posso proceder?",
          created_date: "2024-01-19T10:15:00Z",
          attachments: []
        },
        {
          id: "msg3",
          author: "Suporte Sparta",
          author_type: "support",
          message: "Olá Maria! Vou te ajudar com o upgrade. Para isso, preciso que você confirme alguns dados...",
          created_date: "2024-01-19T15:22:00Z",
          attachments: []
        }
      ]
    },
    {
      id: "TK-2024-003",
      subject: "Como importar contatos em massa?",
      category: "general",
      subcategory: "usage",
      priority: "low",
      status: "resolved",
      description: "Preciso importar uma lista com 2000 contatos. Qual o formato correto do arquivo?",
      created_date: "2024-01-18T09:00:00Z",
      updated_date: "2024-01-18T11:30:00Z",
      created_by: "user789",
      assigned_to: "admin_carlos",
      sla_deadline: "2024-01-18T13:00:00Z",
      messages: [
        {
          id: "msg4",
          author: "Carlos Oliveira",
          author_type: "customer", 
          message: "Preciso importar uma lista com 2000 contatos. Qual o formato correto do arquivo?",
          created_date: "2024-01-18T09:00:00Z",
          attachments: []
        },
        {
          id: "msg5",
          author: "Suporte Sparta",
          author_type: "support",
          message: "O arquivo deve estar em formato CSV com as colunas: nome, email, telefone, empresa. Segue template em anexo.",
          created_date: "2024-01-18T11:30:00Z",
          attachments: ["template_contatos.csv"]
        }
      ]
    }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);
      setTickets(mockTickets);
    } catch (error) {
      console.error("Error loading tickets:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateSLADeadline = (category, subcategory, priority, createdDate) => {
    const categoryData = ticketCategories[category];
    const subcategoryData = categoryData?.subcategories?.[subcategory];
    const baseSLAHours = subcategoryData?.sla_hours || categoryData?.sla_hours || 24;
    
    const priorityMultiplier = prioritySettings[priority]?.multiplier || 1.0;
    const finalSLAHours = baseSLAHours * priorityMultiplier;
    
    return addHours(new Date(createdDate), finalSLAHours);
  };

  const getSLAStatus = (deadline) => {
    const now = new Date();
    const timeLeft = deadline - now;
    const hoursLeft = timeLeft / (1000 * 60 * 60);
    
    if (isPast(deadline)) {
      return { status: 'overdue', color: 'text-red-600', text: 'SLA vencido' };
    } else if (hoursLeft <= 2) {
      return { status: 'critical', color: 'text-red-600', text: `${Math.ceil(hoursLeft)}h restantes` };
    } else if (hoursLeft <= 8) {
      return { status: 'warning', color: 'text-yellow-600', text: `${Math.ceil(hoursLeft)}h restantes` };
    } else {
      return { status: 'ok', color: 'text-green-600', text: `${Math.ceil(hoursLeft)}h restantes` };
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    
    const slaDeadline = calculateSLADeadline(
      newTicket.category,
      newTicket.subcategory,
      newTicket.priority,
      new Date()
    );

    const ticket = {
      id: `TK-2024-${String(tickets.length + 1).padStart(3, '0')}`,
      subject: newTicket.subject,
      category: newTicket.category,
      subcategory: newTicket.subcategory,
      priority: newTicket.priority,
      status: "open",
      description: newTicket.description,
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString(),
      created_by: user.id,
      assigned_to: null,
      sla_deadline: slaDeadline.toISOString(),
      messages: [
        {
          id: `msg_${Date.now()}`,
          author: user.full_name,
          author_type: "customer",
          message: newTicket.description,
          created_date: new Date().toISOString(),
          attachments: newTicket.attachments
        }
      ]
    };

    setTickets(prev => [ticket, ...prev]);
    setShowCreateModal(false);
    
    // Reset form
    setNewTicket({
      subject: "",
      category: "",
      subcategory: "",
      priority: "medium",
      description: "",
      attachments: []
    });
  };

  const handleSendReply = () => {
    if (!replyMessage.trim() || !selectedTicket) return;

    const newMessage = {
      id: `msg_${Date.now()}`,
      author: user.full_name,
      author_type: "customer",
      message: replyMessage,
      created_date: new Date().toISOString(),
      attachments: []
    };

    const updatedTicket = {
      ...selectedTicket,
      messages: [...selectedTicket.messages, newMessage],
      updated_date: new Date().toISOString(),
      status: selectedTicket.status === 'waiting_customer' ? 'open' : selectedTicket.status
    };

    setTickets(prev => prev.map(t => t.id === selectedTicket.id ? updatedTicket : t));
    setSelectedTicket(updatedTicket);
    setReplyMessage("");
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter;
    
    const matchesTab = activeTab === "all" || 
                      (activeTab === "open" && ["open", "in_progress", "waiting_customer"].includes(ticket.status)) ||
                      (activeTab === "resolved" && ["resolved", "closed"].includes(ticket.status));
    
    return matchesSearch && matchesStatus && matchesPriority && matchesTab;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-red-200 border-t-red-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
            <p className="text-gray-600">
              Gerencie seus tickets de suporte e acompanhe o progresso
            </p>
          </div>
        </div>
        
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button className="rounded-2xl bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Novo Ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl rounded-3xl">
            <DialogHeader>
              <DialogTitle>Criar Novo Ticket</DialogTitle>
              <DialogDescription>
                Descreva seu problema ou solicitação detalhadamente para que possamos ajudar.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleCreateTicket} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="subject">Assunto *</Label>
                <Input
                  id="subject"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Descreva resumidamente o problema"
                  className="rounded-2xl border-gray-200"
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria *</Label>
                  <Select 
                    value={newTicket.category} 
                    onValueChange={(value) => setNewTicket(prev => ({ 
                      ...prev, 
                      category: value, 
                      subcategory: "" // Reset subcategory when category changes
                    }))}
                  >
                    <SelectTrigger className="rounded-2xl border-gray-200">
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      {Object.entries(ticketCategories).map(([key, category]) => (
                        <SelectItem key={key} value={key}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subcategory">Subcategoria *</Label>
                  <Select 
                    value={newTicket.subcategory} 
                    onValueChange={(value) => setNewTicket(prev => ({ ...prev, subcategory: value }))}
                    disabled={!newTicket.category}
                  >
                    <SelectTrigger className="rounded-2xl border-gray-200">
                      <SelectValue placeholder="Selecione a subcategoria" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      {newTicket.category && Object.entries(ticketCategories[newTicket.category].subcategories).map(([key, subcategory]) => (
                        <SelectItem key={key} value={key}>
                          {subcategory.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Prioridade</Label>
                <Select value={newTicket.priority} onValueChange={(value) => setNewTicket(prev => ({ ...prev, priority: value }))}>
                  <SelectTrigger className="rounded-2xl border-gray-200">
                    <SelectValue placeholder="Selecione a prioridade" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {Object.entries(prioritySettings).map(([key, priority]) => (
                      <SelectItem key={key} value={key}>
                        {priority.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição *</Label>
                <Textarea
                  id="description"
                  value={newTicket.description}
                  onChange={(e) => setNewTicket(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva detalhadamente seu problema..."
                  className="rounded-2xl border-gray-200 min-h-[120px]"
                  required
                />
              </div>

              {/* Show SLA preview */}
              {newTicket.category && newTicket.subcategory && (
                <div className="p-4 bg-blue-50 rounded-2xl">
                  <div className="flex items-center gap-2 text-sm text-blue-800">
                    <Clock className="w-4 h-4" />
                    <span>
                      SLA de Resposta: {Math.ceil(
                        (ticketCategories[newTicket.category].subcategories[newTicket.subcategory].sla_hours || 
                         ticketCategories[newTicket.category].sla_hours) * 
                        prioritySettings[newTicket.priority].multiplier
                      )} horas
                    </span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} className="rounded-2xl">
                  Cancelar
                </Button>
                <Button type="submit" className="rounded-2xl bg-blue-600 hover:bg-blue-700">
                  <Send className="w-4 h-4 mr-2" />
                  Criar Ticket
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters and Search */}
      <Card className="rounded-3xl border-gray-200">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Buscar tickets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-2xl border-gray-200"
              />
            </div>
            <div className="flex gap-2">
              <div className="flex items-center gap-1">
                <Filter className="w-4 h-4 text-gray-500" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32 rounded-2xl border-gray-200">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="all">Todos</SelectItem>
                    {Object.entries(statusSettings).map(([key, status]) => (
                      <SelectItem key={key} value={key}>{status.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-32 rounded-2xl border-gray-200">
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="all">Todas</SelectItem>
                  {Object.entries(prioritySettings).map(([key, priority]) => (
                    <SelectItem key={key} value={key}>{priority.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 rounded-2xl">
          <TabsTrigger value="all" className="rounded-2xl">
            Todos ({tickets.length})
          </TabsTrigger>
          <TabsTrigger value="open" className="rounded-2xl">
            Abertos ({tickets.filter(t => ["open", "in_progress", "waiting_customer"].includes(t.status)).length})
          </TabsTrigger>
          <TabsTrigger value="resolved" className="rounded-2xl">
            Resolvidos ({tickets.filter(t => ["resolved", "closed"].includes(t.status)).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <div className="space-y-4">
            {filteredTickets.map(ticket => {
              const category = ticketCategories[ticket.category];
              const subcategory = category?.subcategories?.[ticket.subcategory];
              const priority = prioritySettings[ticket.priority];
              const status = statusSettings[ticket.status];
              const StatusIcon = status.icon;
              const slaDeadline = new Date(ticket.sla_deadline);
              const slaStatus = getSLAStatus(slaDeadline);

              return (
                <Card key={ticket.id} className="rounded-3xl border-gray-200 hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3">
                          <Badge variant="outline" className="rounded-full text-xs font-mono">
                            {ticket.id}
                          </Badge>
                          <Badge className={`rounded-full text-xs ${status.color}`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {status.name}
                          </Badge>
                          <Badge variant="outline" className={`rounded-full text-xs ${priority.color}`}>
                            {priority.name}
                          </Badge>
                        </div>
                        
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {ticket.subject}
                        </h3>
                        
                        <p className="text-gray-600 mb-3 line-clamp-2">
                          {ticket.description}
                        </p>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {formatDistanceToNow(new Date(ticket.created_date), { 
                                addSuffix: true, 
                                locale: ptBR 
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageSquare className="w-4 h-4" />
                            <span>{ticket.messages.length} mensagens</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Timer className={`w-4 h-4 ${slaStatus.color}`} />
                            <span className={slaStatus.color}>{slaStatus.text}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 flex-shrink-0">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            setSelectedTicket(ticket);
                            setShowDetailsModal(true);
                          }}
                          className="rounded-2xl"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Detalhes
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl p-0">
            <div className="flex flex-col h-full">
              <DialogHeader className="p-6 pb-0 border-b border-gray-100">
                <div className="flex items-start justify-between">
                  <div>
                    <DialogTitle className="text-xl mb-2">{selectedTicket.subject}</DialogTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="rounded-full text-xs font-mono">
                        {selectedTicket.id}
                      </Badge>
                      <Badge className={`rounded-full text-xs ${statusSettings[selectedTicket.status].color}`}>
                        {statusSettings[selectedTicket.status].name}
                      </Badge>
                      <Badge variant="outline" className={`rounded-full text-xs ${prioritySettings[selectedTicket.priority].color}`}>
                        {prioritySettings[selectedTicket.priority].name}
                      </Badge>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setShowDetailsModal(false)} className="rounded-full">
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </DialogHeader>

              {/* Messages */}
              <div className="flex-1 p-6 overflow-auto">
                <div className="space-y-4">
                  {selectedTicket.messages.map(message => (
                    <div key={message.id} className={`flex gap-3 ${
                      message.author_type === 'support' ? 'flex-row-reverse' : ''
                    }`}>
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarFallback className={
                          message.author_type === 'support' 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-gray-300 text-gray-700'
                        }>
                          {message.author.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className={`flex-1 max-w-md ${
                        message.author_type === 'support' ? 'text-right' : ''
                      }`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900">
                            {message.author}
                          </span>
                          <Badge variant="outline" className="text-xs rounded-full">
                            {message.author_type === 'support' ? 'Suporte' : 'Cliente'}
                          </Badge>
                        </div>
                        
                        <div className={`p-3 rounded-2xl ${
                          message.author_type === 'support' 
                            ? 'bg-blue-100 text-blue-900' 
                            : 'bg-gray-100 text-gray-900'
                        }`}>
                          <p className="whitespace-pre-wrap">{message.message}</p>
                          
                          {message.attachments.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {message.attachments.map((attachment, index) => (
                                <div key={index} className="flex items-center gap-2 text-xs">
                                  <Paperclip className="w-3 h-3" />
                                  <span>{attachment}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <p className="text-xs text-gray-500 mt-1">
                          {format(new Date(message.created_date), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reply Form */}
              {!["resolved", "closed"].includes(selectedTicket.status) && (
                <div className="p-6 border-t border-gray-100">
                  <div className="flex gap-3">
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarFallback className="bg-gray-300 text-gray-700">
                        {user?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 space-y-3">
                      <Textarea
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        placeholder="Digite sua resposta..."
                        className="rounded-2xl border-gray-200 min-h-[80px]"
                      />
                      
                      <div className="flex justify-between">
                        <Button variant="ghost" size="sm" className="rounded-2xl">
                          <Paperclip className="w-4 h-4 mr-2" />
                          Anexar Arquivo
                        </Button>
                        
                        <Button 
                          onClick={handleSendReply}
                          disabled={!replyMessage.trim()}
                          className="rounded-2xl bg-blue-600 hover:bg-blue-700"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Enviar Resposta
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Empty State */}
      {filteredTickets.length === 0 && (
        <Card className="rounded-3xl border-gray-200">
          <CardContent className="text-center py-12">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhum ticket encontrado</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || statusFilter !== "all" || priorityFilter !== "all"
                ? "Tente ajustar os filtros para encontrar seus tickets."
                : "Você ainda não possui tickets de suporte. Crie um novo ticket quando precisar de ajuda."
              }
            </p>
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="rounded-2xl bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Ticket
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
