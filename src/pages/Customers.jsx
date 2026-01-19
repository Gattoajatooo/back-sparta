import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Company } from "@/entities/Company";
import { Contact } from "@/entities/Contact";
import { Session } from "@/entities/Session";
import { Message } from "@/entities/Message";
import { Payment } from "@/entities/Payment";
import { Role } from "@/entities/Role";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, Search, Edit, CheckCircle2, XCircle, Clock, AlertCircle, DollarSign,
  Calendar, Building, Phone, LayoutGrid, List, RefreshCw, UserPlus, Plus, Eye,
  MessageSquare, Smartphone, FileUser, Activity, BarChart3, ChevronRight, Loader2,
  Send, X, Receipt, Trash2, Upload, Shield, CreditCard,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { base44 } from "@/api/base44Client";

export default function Customers() {
  const [currentUser, setCurrentUser] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [notification, setNotification] = useState({ show: false, type: 'success', message: '' });
  
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [activeDashboardTab, setActiveDashboardTab] = useState("overview");
  
  const [showInviteUserModal, setShowInviteUserModal] = useState(false);
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  
  const [newRole, setNewRole] = useState({
    name: "",
    description: "",
    permissions: {
      sessions: "none", conversations: "none", contacts: "none", campaigns: "none",
      templates: "none", tags: "none", tickets: "none", plans: "none",
      billing: "none", logs: "none", team: "none", roles: "none", reports: "none"
    }
  });
  
  const [paymentForm, setPaymentForm] = useState({
    amount: "", payment_date: format(new Date(), "yyyy-MM-dd"), due_date: "",
    payment_method: "pix", status: "paid", reference_month: format(new Date(), "yyyy-MM"),
    invoice_number: "", receipt_url: "", invoice_url: "", notes: "",
    subscription_type: "monthly", plan_name: "", discount: 0
  });
  
  const [uploadingFile, setUploadingFile] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const user = await User.me();
      setCurrentUser(user);

      if (user?.role !== 'admin') {
        showNotification('error', 'Acesso negado.');
        return;
      }

      const companiesList = await Company.list('-created_date');
      setCompanies(companiesList);
    } catch (error) {
      console.error("Erro:", error);
      showNotification('error', 'Erro ao carregar dados.');
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (type, message) => {
    setNotification({ show: true, type, message });
    setTimeout(() => setNotification({ show: false, type: 'success', message: '' }), 5000);
  };

  const loadCompanyDashboard = async (company) => {
    setSelectedCompany(company);
    setShowDashboard(true);
    setLoadingDashboard(true);
    
    try {
      const response = await base44.functions.invoke('getCompanyDashboard', { company_id: company.id });
      
      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Erro ao carregar dados');
      }

      const { contacts, sessions, messages, teamMembers, payments, roles } = response.data.data;

      const activeSessions = sessions.filter(s => s.status === 'WORKING');
      const sentMessages = messages.filter(m => m.direction === 'sent' && m.status === 'success');
      const receivedMessages = messages.filter(m => m.direction === 'received');
      
      const allMessagesSorted = [...messages].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const lastActivity = allMessagesSorted[0]?.created_at || company.created_date;

      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        
        const dayMessages = messages.filter(m => {
          const msgDate = new Date(m.created_at);
          return msgDate >= date && msgDate < nextDay && m.direction === 'sent' && m.status === 'success';
        });
        
        last7Days.push({
          date: format(date, 'dd/MM', { locale: ptBR }),
          count: dayMessages.length
        });
      }

      setDashboardData({
        contacts, sessions, activeSessions, sentMessages, receivedMessages,
        lastActivity, chartData: last7Days, teamMembers, payments, roles
      });
    } catch (error) {
      console.error("Erro:", error);
      showNotification('error', 'Erro ao carregar dashboard');
    } finally {
      setLoadingDashboard(false);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteEmail || !selectedCompany) return;
    
    setIsSendingInvite(true);
    try {
      const response = await base44.functions.invoke('inviteTeamMember', {
        email: inviteEmail,
        role_id: null,
        system_role: inviteRole === 'admin' ? 'admin' : null,
        target_company_id: selectedCompany.id
      });

      if (response.data?.success) {
        showNotification('success', `Convite enviado para ${inviteEmail}!`);
        setShowInviteUserModal(false);
        setInviteEmail("");
        setInviteRole("user");
        if (showDashboard) loadCompanyDashboard(selectedCompany);
      } else {
        throw new Error(response.data?.error || 'Erro ao enviar convite');
      }
    } catch (error) {
      showNotification('error', error.message || 'Erro ao enviar convite');
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleCreateRole = async () => {
    if (!newRole.name || !selectedCompany) return;
    
    try {
      await Role.create({
        ...newRole,
        company_id: selectedCompany.id,
        is_active: true
      });
      
      showNotification('success', `Função ${newRole.name} criada!`);
      setShowCreateRoleModal(false);
      setNewRole({
        name: "", description: "",
        permissions: {
          sessions: "none", conversations: "none", contacts: "none", campaigns: "none",
          templates: "none", tags: "none", tickets: "none", plans: "none",
          billing: "none", logs: "none", team: "none", roles: "none", reports: "none"
        }
      });
      
      if (showDashboard) loadCompanyDashboard(selectedCompany);
    } catch (error) {
      showNotification('error', 'Erro ao criar função');
    }
  };

  const handleAddPayment = () => {
    setEditingPayment(null);
    setPaymentForm({
      amount: "", payment_date: format(new Date(), "yyyy-MM-dd"), due_date: "",
      payment_method: "pix", status: "paid", reference_month: format(new Date(), "yyyy-MM"),
      invoice_number: "", receipt_url: "", invoice_url: "", notes: "",
      subscription_type: "monthly", plan_name: "", discount: 0
    });
    setShowPaymentModal(true);
  };

  const handleEditPayment = (payment) => {
    setEditingPayment(payment);
    setPaymentForm({
      amount: payment.amount.toString(),
      payment_date: payment.payment_date ? format(new Date(payment.payment_date), "yyyy-MM-dd") : "",
      due_date: payment.due_date ? format(new Date(payment.due_date), "yyyy-MM-dd") : "",
      payment_method: payment.payment_method,
      status: payment.status,
      reference_month: payment.reference_month,
      invoice_number: payment.invoice_number || "",
      receipt_url: payment.receipt_url || "",
      invoice_url: payment.invoice_url || "",
      notes: payment.notes || "",
      subscription_type: payment.subscription_type,
      plan_name: payment.plan_name || "",
      discount: payment.discount || 0
    });
    setShowPaymentModal(true);
  };

  const handleSavePayment = async () => {
    if (!selectedCompany) return;
    
    try {
      const paymentData = {
        company_id: selectedCompany.id,
        amount: parseFloat(paymentForm.amount),
        payment_date: paymentForm.status === 'pending' || !paymentForm.payment_date ? null : new Date(paymentForm.payment_date).toISOString(),
        due_date: paymentForm.due_date ? new Date(paymentForm.due_date).toISOString() : null,
        payment_method: paymentForm.payment_method,
        status: paymentForm.status,
        reference_month: paymentForm.reference_month,
        invoice_number: paymentForm.invoice_number || null,
        receipt_url: paymentForm.receipt_url || null,
        invoice_url: paymentForm.invoice_url || null,
        notes: paymentForm.notes || null,
        subscription_type: paymentForm.subscription_type,
        plan_name: paymentForm.plan_name || null,
        discount: parseFloat(paymentForm.discount) || 0,
        created_by: currentUser.id
      };

      if (editingPayment) {
        await Payment.update(editingPayment.id, paymentData);
        showNotification('success', 'Pagamento atualizado!');
      } else {
        await Payment.create(paymentData);
        showNotification('success', 'Pagamento registrado!');
      }

      setShowPaymentModal(false);
      setEditingPayment(null);
      if (showDashboard) loadCompanyDashboard(selectedCompany);
    } catch (error) {
      showNotification('error', 'Erro ao salvar pagamento');
    }
  };

  const handleDeletePayment = async (paymentId) => {
    if (!confirm('Excluir este pagamento?')) return;
    
    try {
      await Payment.delete(paymentId);
      showNotification('success', 'Pagamento excluído!');
      if (showDashboard && selectedCompany) loadCompanyDashboard(selectedCompany);
    } catch (error) {
      showNotification('error', 'Erro ao excluir');
    }
  };

  const handleFileUpload = async (fieldName, file) => {
    if (!file) return;
    setUploadingFile(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setPaymentForm(prev => ({ ...prev, [fieldName]: file_url }));
      showNotification('success', 'Arquivo enviado!');
    } catch (error) {
      showNotification('error', 'Erro no upload');
    } finally {
      setUploadingFile(false);
    }
  };

  const getSubscriptionStatusInfo = (status) => {
    const map = {
      active: { text: 'Ativa', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 },
      suspended: { text: 'Suspensa', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock },
      cancelled: { text: 'Cancelada', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle }
    };
    return map[status] || map.active;
  };

  const getPlanLabel = (slug) => {
    const labels = { free: 'Gratuito', essential: 'Essencial', advanced: 'Avançado', premium: 'Premium', elite: 'Elite', custom: 'Customizado' };
    return labels[slug] || slug;
  };

  const filteredCompanies = companies.filter(company => {
    if (searchTerm && !company.name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (activeTab === 'all') return true;
    return company.subscription_status === activeTab;
  });

  const renderCompanyCard = (company) => {
    const statusInfo = getSubscriptionStatusInfo(company.subscription_status);
    const StatusIcon = statusInfo.icon;

    return (
      <Card 
        key={company.id} 
        className="rounded-3xl border-2 border-gray-200 hover:shadow-xl transition-all group cursor-pointer overflow-hidden"
        onClick={() => loadCompanyDashboard(company)}
      >
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                <Building className="w-7 h-7 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-gray-900 text-lg mb-1 truncate">
                  {company.name || 'Sem nome'}
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={`text-xs rounded-full px-3 py-1 border ${statusInfo.color}`}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {statusInfo.text}
                  </Badge>
                  <Badge variant="outline" className="text-xs rounded-full px-2 py-1">
                    {getPlanLabel(company.subscription_plan)}
                  </Badge>
                </div>
              </div>
            </div>
            
            <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex-shrink-0">
              <Eye className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-3">
            {company.website && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Building className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{company.website}</span>
              </div>
            )}
            {company.phone && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="w-4 h-4 flex-shrink-0" />
                <span>{company.phone}</span>
              </div>
            )}
            {company.created_date && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Calendar className="w-3 h-3 flex-shrink-0" />
                Cliente desde {format(new Date(company.created_date), "dd/MM/yyyy", { locale: ptBR })}
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <Button className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 gap-2">
              <Eye className="w-4 h-4" />
              Ver Dashboard
              <ChevronRight className="w-4 h-4 ml-auto" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderCompanyListItem = (company) => {
    const statusInfo = getSubscriptionStatusInfo(company.subscription_status);
    const StatusIcon = statusInfo.icon;

    return (
      <Card 
        key={company.id} 
        className="rounded-3xl border-2 border-gray-200 hover:shadow-lg transition-all cursor-pointer overflow-hidden"
        onClick={() => loadCompanyDashboard(company)}
      >
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                <Building className="w-6 h-6 text-white" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <h3 className="font-semibold text-gray-900 truncate text-sm sm:text-base">
                    {company.name || 'Sem nome'}
                  </h3>
                  <Badge className={`text-xs rounded-full ${statusInfo.color}`}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {statusInfo.text}
                  </Badge>
                  <Badge variant="outline" className="text-xs rounded-full">
                    {getPlanLabel(company.subscription_plan)}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-4 text-xs sm:text-sm text-gray-600 flex-wrap">
                  {company.website && (
                    <span className="flex items-center gap-1 truncate">
                      <Building className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{company.website}</span>
                    </span>
                  )}
                  {company.created_date && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3 flex-shrink-0" />
                      {format(new Date(company.created_date), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <Button className="rounded-xl bg-blue-600 hover:bg-blue-700 gap-2 flex-shrink-0">
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="rounded-3xl border-red-200 max-w-md">
          <CardContent className="text-center p-8">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Acesso Negado</h3>
            <p className="text-gray-500">Apenas administradores podem acessar esta página.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {notification.show && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-2xl shadow-lg ${
          notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white`}>
          {notification.message}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
            <Users className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
            <p className="text-sm text-gray-600">Gerencie empresas clientes do sistema</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className={`rounded-xl ${viewMode === 'grid' ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className={`rounded-xl ${viewMode === 'list' ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}`}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          <Button onClick={loadData} variant="outline" size="sm" disabled={isLoading} className="rounded-2xl">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Buscar clientes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 rounded-2xl border-gray-200"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 bg-gray-100 rounded-2xl p-1">
          <TabsTrigger value="all" className="rounded-xl text-xs sm:text-sm">Todos ({companies.length})</TabsTrigger>
          <TabsTrigger value="active" className="rounded-xl text-xs sm:text-sm">Ativos ({companies.filter(c => c.subscription_status === 'active').length})</TabsTrigger>
          <TabsTrigger value="suspended" className="rounded-xl text-xs sm:text-sm">Suspensos ({companies.filter(c => c.subscription_status === 'suspended').length})</TabsTrigger>
          <TabsTrigger value="cancelled" className="rounded-xl text-xs sm:text-sm">Cancelados ({companies.filter(c => c.subscription_status === 'cancelled').length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {filteredCompanies.length > 0 ? (
        <div className={viewMode === 'grid' ? 'grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'space-y-4'}>
          {filteredCompanies.map(company => viewMode === 'grid' ? renderCompanyCard(company) : renderCompanyListItem(company))}
        </div>
      ) : (
        <Card className="rounded-3xl border-dashed border-2 border-gray-200">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building className="w-16 h-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma empresa encontrada</h3>
            <p className="text-gray-600">{searchTerm ? 'Tente ajustar sua busca' : 'Não há empresas nesta categoria'}</p>
          </CardContent>
        </Card>
      )}

      {/* Dashboard Modal */}
      <Dialog open={showDashboard} onOpenChange={setShowDashboard}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden rounded-3xl p-0">
          <DialogHeader className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                  <Building className="w-7 h-7 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-2xl">{selectedCompany?.name}</DialogTitle>
                  <div className="flex items-center gap-2 mt-1">
                    {selectedCompany && (
                      <>
                        <Badge className={`text-xs ${getSubscriptionStatusInfo(selectedCompany.subscription_status).color}`}>
                          {getSubscriptionStatusInfo(selectedCompany.subscription_status).text}
                        </Badge>
                        <Badge variant="outline" className="text-xs">{getPlanLabel(selectedCompany.subscription_plan)}</Badge>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowInviteUserModal(true)} className="rounded-xl gap-2">
                  <UserPlus className="w-4 h-4" />
                  <span className="hidden sm:inline">Convidar</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowCreateRoleModal(true)} className="rounded-xl gap-2">
                  <Shield className="w-4 h-4" />
                  <span className="hidden sm:inline">Criar Função</span>
                </Button>
                <Button variant="outline" size="sm" onClick={handleAddPayment} className="rounded-xl gap-2">
                  <DollarSign className="w-4 h-4" />
                  <span className="hidden sm:inline">Pagamento</span>
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(95vh - 120px)' }}>
            {loadingDashboard ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
              </div>
            ) : dashboardData ? (
              <Tabs value={activeDashboardTab} onValueChange={setActiveDashboardTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4 bg-gray-100 rounded-2xl p-1 mb-6">
                  <TabsTrigger value="overview" className="rounded-xl">Visão Geral</TabsTrigger>
                  <TabsTrigger value="team" className="rounded-xl">Equipe</TabsTrigger>
                  <TabsTrigger value="roles" className="rounded-xl">Funções</TabsTrigger>
                  <TabsTrigger value="payments" className="rounded-xl">Pagamentos</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="rounded-2xl border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-white">
                      <CardContent className="p-4 sm:p-6">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center mb-2">
                          <FileUser className="w-5 h-5 text-white" />
                        </div>
                        <div className="text-2xl sm:text-3xl font-bold text-gray-900">{dashboardData.contacts.length}</div>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">Contatos</p>
                      </CardContent>
                    </Card>

                    <Card className="rounded-2xl border-2 border-green-100 bg-gradient-to-br from-green-50 to-white">
                      <CardContent className="p-4 sm:p-6">
                        <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center mb-2">
                          <Smartphone className="w-5 h-5 text-white" />
                        </div>
                        <div className="text-2xl sm:text-3xl font-bold text-gray-900">{dashboardData.activeSessions.length}</div>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">Sessões Ativas</p>
                      </CardContent>
                    </Card>

                    <Card className="rounded-2xl border-2 border-purple-100 bg-gradient-to-br from-purple-50 to-white">
                      <CardContent className="p-4 sm:p-6">
                        <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center mb-2">
                          <Send className="w-5 h-5 text-white" />
                        </div>
                        <div className="text-2xl sm:text-3xl font-bold text-gray-900">{dashboardData.sentMessages.length}</div>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">Msgs Enviadas</p>
                      </CardContent>
                    </Card>

                    <Card className="rounded-2xl border-2 border-amber-100 bg-gradient-to-br from-amber-50 to-white">
                      <CardContent className="p-4 sm:p-6">
                        <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center mb-2">
                          <MessageSquare className="w-5 h-5 text-white" />
                        </div>
                        <div className="text-2xl sm:text-3xl font-bold text-gray-900">{dashboardData.receivedMessages.length}</div>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">Msgs Recebidas</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="rounded-3xl border-2 border-gray-200">
                    <CardHeader className="border-b border-gray-100">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <BarChart3 className="w-5 h-5 text-blue-600" />
                        Atividade (Últimos 7 dias)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="flex items-end justify-between gap-2 h-48">
                        {dashboardData.chartData.map((day, i) => {
                          const max = Math.max(...dashboardData.chartData.map(d => d.count), 1);
                          const height = (day.count / max) * 100;
                          return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2">
                              <div 
                                className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg transition-all hover:from-blue-700 hover:to-blue-500 cursor-pointer relative group"
                                style={{ height: `${Math.max(height, 5)}%` }}
                              >
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                                  {day.count} msg
                                </div>
                              </div>
                              <span className="text-xs text-gray-600">{day.date}</span>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="rounded-3xl border-2 border-gray-200">
                      <CardHeader className="border-b border-gray-100">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Smartphone className="w-5 h-5 text-green-600" />
                          Sessões ({dashboardData.sessions.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        {dashboardData.sessions.length > 0 ? (
                          <div className="space-y-3 max-h-80 overflow-y-auto">
                            {dashboardData.sessions.map(session => (
                              <div key={session.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl">
                                <Avatar className="w-10 h-10 border-2 border-white">
                                  <AvatarImage src={session.avatar_url} />
                                  <AvatarFallback className="bg-gradient-to-br from-green-400 to-green-600 text-white">
                                    <Smartphone className="w-5 h-5" />
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-gray-900 text-sm truncate">
                                    {session.custom_name || session.phone || session.session_name}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge className={`text-xs ${session.status === 'WORKING' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                      {session.status}
                                    </Badge>
                                    {session.phone && <span className="text-xs text-gray-500">{session.phone}</span>}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <Smartphone className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p className="text-sm text-gray-500">Nenhuma sessão conectada</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="rounded-3xl border-2 border-gray-200">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                            <Activity className="w-6 h-6 text-gray-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Última Atividade</p>
                            <p className="font-semibold text-gray-900">
                              {format(new Date(dashboardData.lastActivity), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                        
                        <div className="space-y-2 pt-4 border-t border-gray-100">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Cadastro:</span>
                            <span className="font-medium text-gray-900">
                              {format(new Date(selectedCompany.created_date), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          </div>
                          {selectedCompany.website && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Website:</span>
                              <a href={selectedCompany.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate max-w-[200px]">
                                {selectedCompany.website}
                              </a>
                            </div>
                          )}
                          {selectedCompany.phone && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Telefone:</span>
                              <span className="font-medium text-gray-900">{selectedCompany.phone}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Team Tab */}
                <TabsContent value="team" className="space-y-6">
                  <Card className="rounded-3xl border-2 border-gray-200">
                    <CardHeader className="border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Users className="w-5 h-5 text-blue-600" />
                          Membros ({dashboardData.teamMembers.length})
                        </CardTitle>
                        <Button size="sm" onClick={() => setShowInviteUserModal(true)} className="rounded-xl gap-2 bg-blue-600 hover:bg-blue-700">
                          <UserPlus className="w-4 h-4" />
                          Convidar
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      {dashboardData.teamMembers.length > 0 ? (
                        <div className="space-y-3">
                          {dashboardData.teamMembers.map(member => (
                            <div key={member.id} className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
                              <Avatar className="w-12 h-12 border-2 border-white">
                                <AvatarImage src={member.avatar_url} />
                                <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-600 text-white">
                                  {member.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 truncate">{member.full_name}</p>
                                <p className="text-sm text-gray-500 truncate">{member.email}</p>
                              </div>
                              <Badge className={`text-xs ${
                                member.role === 'admin' ? 'bg-red-100 text-red-700' : 
                                member.system_role === 'admin' ? 'bg-blue-100 text-blue-700' : 
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {member.role === 'admin' ? 'Admin Global' : member.system_role === 'admin' ? 'Admin' : 'Usuário'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <Users className="w-16 h-16 mx-auto mb-3 text-gray-300" />
                          <p className="text-sm text-gray-500 mb-4">Nenhum membro</p>
                          <Button size="sm" onClick={() => setShowInviteUserModal(true)} className="rounded-xl bg-blue-600 hover:bg-blue-700 gap-2">
                            <UserPlus className="w-4 h-4" />
                            Convidar
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Roles Tab */}
                <TabsContent value="roles" className="space-y-6">
                  <Card className="rounded-3xl border-2 border-gray-200">
                    <CardHeader className="border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Shield className="w-5 h-5 text-blue-600" />
                          Funções ({dashboardData.roles.length})
                        </CardTitle>
                        <Button size="sm" onClick={() => setShowCreateRoleModal(true)} className="rounded-xl gap-2 bg-blue-600 hover:bg-blue-700">
                          <Plus className="w-4 h-4" />
                          Nova
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      {dashboardData.roles.length > 0 ? (
                        <div className="space-y-3">
                          {dashboardData.roles.map(role => (
                            <div key={role.id} className="p-4 bg-gray-50 rounded-2xl">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold text-gray-900">{role.name}</h4>
                                <Badge className={role.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                                  {role.is_active ? 'Ativa' : 'Inativa'}
                                </Badge>
                              </div>
                              {role.description && <p className="text-sm text-gray-600 mb-3">{role.description}</p>}
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(role.permissions || {}).filter(([_, v]) => v !== 'none').map(([k, v]) => (
                                  <Badge key={k} variant="outline" className="text-xs">{k}: {v}</Badge>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <Shield className="w-16 h-16 mx-auto mb-3 text-gray-300" />
                          <p className="text-sm text-gray-500 mb-4">Nenhuma função</p>
                          <Button size="sm" onClick={() => setShowCreateRoleModal(true)} className="rounded-xl bg-blue-600 hover:bg-blue-700 gap-2">
                            <Plus className="w-4 h-4" />
                            Criar
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Payments Tab */}
                <TabsContent value="payments" className="space-y-6">
                  <Card className="rounded-3xl border-2 border-gray-200">
                    <CardHeader className="border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <CreditCard className="w-5 h-5 text-blue-600" />
                          Pagamentos ({dashboardData.payments.length})
                        </CardTitle>
                        <Button size="sm" onClick={handleAddPayment} className="rounded-xl gap-2 bg-blue-600 hover:bg-blue-700">
                          <Plus className="w-4 h-4" />
                          Novo
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      {dashboardData.payments.length > 0 ? (
                        <div className="space-y-3">
                          {dashboardData.payments.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).map(payment => {
                            const statusInfo = {
                              paid: { text: 'Pago', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
                              pending: { text: 'Pendente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
                              overdue: { text: 'Atrasado', color: 'bg-red-100 text-red-700', icon: AlertCircle },
                              cancelled: { text: 'Cancelado', color: 'bg-gray-100 text-gray-700', icon: XCircle }
                            }[payment.status];
                            const StatusIcon = statusInfo.icon;

                            return (
                              <div key={payment.id} className="p-4 bg-gray-50 rounded-2xl">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Badge className={`text-xs ${statusInfo.color}`}>
                                        <StatusIcon className="w-3 h-3 mr-1" />
                                        {statusInfo.text}
                                      </Badge>
                                      {payment.reference_month && (
                                        <span className="text-xs text-gray-500">Ref: {payment.reference_month}</span>
                                      )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                      <div>
                                        <span className="text-gray-600">Valor:</span>
                                        <span className="ml-2 font-semibold text-gray-900">
                                          R$ {payment.amount.toFixed(2).replace('.', ',')}
                                        </span>
                                      </div>
                                      {payment.payment_date && (
                                        <div>
                                          <span className="text-gray-600">Data:</span>
                                          <span className="ml-2 text-gray-700">
                                            {format(new Date(payment.payment_date), "dd/MM/yyyy", { locale: ptBR })}
                                          </span>
                                        </div>
                                      )}
                                      {payment.plan_name && (
                                        <div>
                                          <span className="text-gray-600">Plano:</span>
                                          <span className="ml-2 text-gray-700">{payment.plan_name}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-1">
                                    <Button size="icon" variant="ghost" onClick={() => handleEditPayment(payment)} className="h-8 w-8 rounded-lg">
                                      <Edit className="w-4 h-4 text-blue-600" />
                                    </Button>
                                    <Button size="icon" variant="ghost" onClick={() => handleDeletePayment(payment.id)} className="h-8 w-8 rounded-lg hover:bg-red-50">
                                      <Trash2 className="w-4 h-4 text-red-600" />
                                    </Button>
                                  </div>
                                </div>

                                {(payment.receipt_url || payment.invoice_url) && (
                                  <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
                                    {payment.receipt_url && (
                                      <Button size="sm" variant="outline" onClick={() => window.open(payment.receipt_url, '_blank')} className="rounded-xl text-xs">
                                        <Receipt className="w-3 h-3 mr-1" />
                                        Comprovante
                                      </Button>
                                    )}
                                    {payment.invoice_url && (
                                      <Button size="sm" variant="outline" onClick={() => window.open(payment.invoice_url, '_blank')} className="rounded-xl text-xs">
                                        <Receipt className="w-3 h-3 mr-1" />
                                        Nota
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <CreditCard className="w-16 h-16 mx-auto mb-3 text-gray-300" />
                          <p className="text-sm text-gray-500 mb-4">Nenhum pagamento</p>
                          <Button size="sm" onClick={handleAddPayment} className="rounded-xl bg-blue-600 hover:bg-blue-700 gap-2">
                            <Plus className="w-4 h-4" />
                            Registrar
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite Modal */}
      <Dialog open={showInviteUserModal} onOpenChange={setShowInviteUserModal}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-600" />
              Convidar Usuário
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedCompany && (
              <div className="p-3 bg-blue-50 rounded-2xl border-2 border-blue-200">
                <p className="text-sm text-gray-600">Para: <span className="font-semibold text-gray-900">{selectedCompany.name}</span></p>
              </div>
            )}

            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email@exemplo.com"
                className="rounded-xl mt-1"
              />
            </div>

            <div>
              <Label>Função *</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="rounded-xl mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuário</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => { setShowInviteUserModal(false); setInviteEmail(""); setInviteRole("user"); }} className="rounded-xl">
              Cancelar
            </Button>
            <Button onClick={handleInviteUser} disabled={!inviteEmail || isSendingInvite} className="rounded-xl bg-blue-600 hover:bg-blue-700 gap-2">
              {isSendingInvite ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {isSendingInvite ? 'Enviando...' : 'Enviar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Role Modal */}
      <Dialog open={showCreateRoleModal} onOpenChange={setShowCreateRoleModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              Criar Função
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedCompany && (
              <div className="p-3 bg-blue-50 rounded-2xl border-2 border-blue-200">
                <p className="text-sm text-gray-600">Para: <span className="font-semibold text-gray-900">{selectedCompany.name}</span></p>
              </div>
            )}

            <div>
              <Label>Nome *</Label>
              <Input value={newRole.name} onChange={(e) => setNewRole({ ...newRole, name: e.target.value })} placeholder="Ex: Gerente" className="rounded-xl mt-1" />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea value={newRole.description} onChange={(e) => setNewRole({ ...newRole, description: e.target.value })} className="rounded-xl mt-1" rows={3} />
            </div>

            <div className="space-y-3">
              <Label>Permissões</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.keys(newRole.permissions).map(key => (
                  <div key={key} className="p-3 bg-gray-50 rounded-xl">
                    <Label className="text-xs text-gray-700 mb-2 block capitalize">
                      {key === 'sessions' ? 'Sessões' : key === 'conversations' ? 'Conversas' : key === 'contacts' ? 'Contatos' : 
                       key === 'campaigns' ? 'Campanhas' : key === 'templates' ? 'Modelos' : key === 'tags' ? 'Marcadores' :
                       key === 'tickets' ? 'Chamados' : key === 'plans' ? 'Planos' : key === 'billing' ? 'Faturamento' :
                       key === 'logs' ? 'Logs' : key === 'team' ? 'Equipe' : key === 'roles' ? 'Funções' : 
                       key === 'reports' ? 'Relatórios' : key}
                    </Label>
                    <Select value={newRole.permissions[key]} onValueChange={(v) => setNewRole({ ...newRole, permissions: { ...newRole.permissions, [key]: v } })}>
                      <SelectTrigger className="rounded-lg h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem Acesso</SelectItem>
                        <SelectItem value="view">Visualizar</SelectItem>
                        <SelectItem value="full">Total</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowCreateRoleModal(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleCreateRole} disabled={!newRole.name} className="rounded-xl bg-blue-600 hover:bg-blue-700 gap-2">
              <Shield className="w-4 h-4" />
              Criar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              {editingPayment ? 'Editar' : 'Lançar'} Pagamento
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedCompany && (
              <div className="p-3 bg-blue-50 rounded-2xl border-2 border-blue-200">
                <p className="text-sm text-gray-600">Para: <span className="font-semibold text-gray-900">{selectedCompany.name}</span></p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor *</Label>
                <Input type="number" step="0.01" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} className="rounded-xl mt-1" />
              </div>
              <div>
                <Label>Status *</Label>
                <Select value={paymentForm.status} onValueChange={(v) => setPaymentForm({ ...paymentForm, status: v })}>
                  <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Pago</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="overdue">Atrasado</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Método *</Label>
                <Select value={paymentForm.payment_method} onValueChange={(v) => setPaymentForm({ ...paymentForm, payment_method: v })}>
                  <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="credit_card">Cartão</SelectItem>
                    <SelectItem value="bank_transfer">Transferência</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={paymentForm.subscription_type} onValueChange={(v) => setPaymentForm({ ...paymentForm, subscription_type: v })}>
                  <SelectTrigger className="rounded-xl mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="quarterly">Trimestral</SelectItem>
                    <SelectItem value="annual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data Pagamento</Label>
                <Input type="date" value={paymentForm.payment_date} onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })} className="rounded-xl mt-1" disabled={paymentForm.status === 'pending'} />
              </div>
              <div>
                <Label>Referência</Label>
                <Input type="month" value={paymentForm.reference_month} onChange={(e) => setPaymentForm({ ...paymentForm, reference_month: e.target.value })} className="rounded-xl mt-1" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Plano</Label>
                <Input value={paymentForm.plan_name} onChange={(e) => setPaymentForm({ ...paymentForm, plan_name: e.target.value })} className="rounded-xl mt-1" />
              </div>
              <div>
                <Label>Desconto</Label>
                <Input type="number" step="0.01" value={paymentForm.discount} onChange={(e) => setPaymentForm({ ...paymentForm, discount: e.target.value })} className="rounded-xl mt-1" />
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label>Comprovante</Label>
                {paymentForm.receipt_url ? (
                  <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl border-2 border-green-200 mt-1">
                    <Receipt className="w-5 h-5 text-green-600" />
                    <span className="flex-1 text-sm text-green-700">Anexado</span>
                    <Button size="sm" variant="ghost" onClick={() => window.open(paymentForm.receipt_url, '_blank')} className="rounded-lg">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setPaymentForm({ ...paymentForm, receipt_url: '' })} className="rounded-lg hover:bg-red-100">
                      <X className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                ) : (
                  <label className="block mt-1">
                    <input type="file" accept="image/*,application/pdf" onChange={(e) => e.target.files[0] && handleFileUpload('receipt_url', e.target.files[0])} className="hidden" />
                    <div className="flex items-center gap-2 p-4 border-2 border-dashed rounded-xl hover:bg-gray-50 cursor-pointer">
                      <Upload className="w-5 h-5 text-blue-600" />
                      <span className="text-sm">Anexar</span>
                    </div>
                  </label>
                )}
              </div>

              <div>
                <Label>Nota Fiscal</Label>
                {paymentForm.invoice_url ? (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border-2 border-blue-200 mt-1">
                    <Receipt className="w-5 h-5 text-blue-600" />
                    <span className="flex-1 text-sm text-blue-700">Anexado</span>
                    <Button size="sm" variant="ghost" onClick={() => window.open(paymentForm.invoice_url, '_blank')} className="rounded-lg">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setPaymentForm({ ...paymentForm, invoice_url: '' })} className="rounded-lg hover:bg-red-100">
                      <X className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                ) : (
                  <label className="block mt-1">
                    <input type="file" accept="image/*,application/pdf" onChange={(e) => e.target.files[0] && handleFileUpload('invoice_url', e.target.files[0])} className="hidden" />
                    <div className="flex items-center gap-2 p-4 border-2 border-dashed rounded-xl hover:bg-gray-50 cursor-pointer">
                      <Upload className="w-5 h-5 text-blue-600" />
                      <span className="text-sm">Anexar</span>
                    </div>
                  </label>
                )}
              </div>
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} className="rounded-xl mt-1" rows={3} />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => { setShowPaymentModal(false); setEditingPayment(null); }} className="rounded-xl">
              Cancelar
            </Button>
            <Button onClick={handleSavePayment} disabled={!paymentForm.amount || uploadingFile} className="rounded-xl bg-blue-600 hover:bg-blue-700 gap-2">
              {uploadingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
              {uploadingFile ? 'Enviando...' : editingPayment ? 'Atualizar' : 'Registrar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}