import React, { useState, useEffect } from "react";
import { Cost } from "@/entities/Cost";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingDown,
  Plus,
  Search,
  Edit,
  Trash2,
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Upload,
  Eye,
  FileText,
  Receipt,
  Loader2,
  RefreshCw,
  Filter,
  LayoutGrid,
  List,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { base44 } from "@/api/base44Client";

export default function Costs() {
  const [currentUser, setCurrentUser] = useState(null);
  const [costs, setCosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [showCostModal, setShowCostModal] = useState(false);
  const [editingCost, setEditingCost] = useState(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [uploadingInvoice, setUploadingInvoice] = useState(false);
  const [notification, setNotification] = useState({ show: false, type: 'success', message: '' });
  const [viewMode, setViewMode] = useState("list");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    amount: "",
    cost_type: "tool",
    billing_cycle: "monthly",
    reference_month: format(new Date(), "yyyy-MM"),
    payment_date: "",
    due_date: "",
    status: "pending",
    vendor: "",
    invoice_url: "",
    receipt_url: "",
    notes: "",
    is_recurring: false,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const user = await User.me();
      setCurrentUser(user);

      if (user?.role !== 'admin') {
        showNotification('error', 'Acesso negado. Apenas administradores podem acessar esta página.');
        return;
      }

      const costsList = await Cost.list('-payment_date');
      setCosts(costsList);
    } catch (error) {
      console.error("Erro ao carregar custos:", error);
      showNotification('error', 'Erro ao carregar custos.');
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (type, message) => {
    setNotification({ show: true, type, message });
    setTimeout(() => {
      setNotification({ show: false, type: 'success', message: '' });
    }, 5000);
  };

  const handleCreateCost = () => {
    setEditingCost(null);
    setFormData({
      name: "",
      description: "",
      amount: "",
      cost_type: "tool",
      billing_cycle: "monthly",
      reference_month: format(new Date(), "yyyy-MM"),
      payment_date: "",
      due_date: "",
      status: "pending",
      vendor: "",
      invoice_url: "",
      receipt_url: "",
      notes: "",
      is_recurring: false,
    });
    setShowCostModal(true);
  };

  const handleEditCost = (cost) => {
    setEditingCost(cost);
    setFormData({
      name: cost.name,
      description: cost.description || "",
      amount: cost.amount.toString(),
      cost_type: cost.cost_type,
      billing_cycle: cost.billing_cycle,
      reference_month: cost.reference_month,
      payment_date: cost.payment_date || "",
      due_date: cost.due_date || "",
      status: cost.status,
      vendor: cost.vendor || "",
      invoice_url: cost.invoice_url || "",
      receipt_url: cost.receipt_url || "",
      notes: cost.notes || "",
      is_recurring: cost.is_recurring || false,
    });
    setShowCostModal(true);
  };

  const handleSaveCost = async () => {
    try {
      const costData = {
        ...formData,
        amount: parseFloat(formData.amount),
        created_by: currentUser.id,
      };

      if (editingCost) {
        await Cost.update(editingCost.id, costData);
        showNotification('success', 'Custo atualizado com sucesso!');
      } else {
        await Cost.create(costData);
        showNotification('success', 'Custo criado com sucesso!');
      }

      setShowCostModal(false);
      await loadData();
    } catch (error) {
      console.error("Erro ao salvar custo:", error);
      showNotification('error', `Erro ao salvar custo: ${error.message}`);
    }
  };

  const handleDeleteCost = async (costId) => {
    if (!window.confirm('Tem certeza que deseja excluir este custo?')) {
      return;
    }

    try {
      await Cost.delete(costId);
      showNotification('success', 'Custo excluído com sucesso!');
      await loadData();
    } catch (error) {
      console.error("Erro ao excluir custo:", error);
      showNotification('error', 'Erro ao excluir custo');
    }
  };

  const handleFileUpload = async (event, fieldName) => {
    const file = event.target.files[0];
    if (!file) return;

    if (fieldName === 'receipt_url') {
      setUploadingReceipt(true);
    } else {
      setUploadingInvoice(true);
    }

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({
        ...prev,
        [fieldName]: file_url
      }));
      showNotification('success', 'Arquivo enviado com sucesso!');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      showNotification('error', 'Erro ao fazer upload do arquivo');
    } finally {
      if (fieldName === 'receipt_url') {
        setUploadingReceipt(false);
      } else {
        setUploadingInvoice(false);
      }
      event.target.value = '';
    }
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'paid':
        return { text: 'Pago', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 };
      case 'pending':
        return { text: 'Pendente', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock };
      case 'overdue':
        return { text: 'Atrasado', color: 'bg-red-100 text-red-700 border-red-200', icon: AlertCircle };
      case 'cancelled':
        return { text: 'Cancelado', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: XCircle };
      default:
        return { text: 'Pendente', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: Clock };
    }
  };

  const getCostTypeLabel = (type) => {
    const labels = {
      tool: 'Ferramenta',
      service: 'Serviço',
      infrastructure: 'Infraestrutura',
      license: 'Licença',
      other: 'Outro'
    };
    return labels[type] || type;
  };

  const getBillingCycleLabel = (cycle) => {
    const labels = {
      monthly: 'Mensal',
      quarterly: 'Trimestral',
      biannual: 'Semestral',
      annual: 'Anual',
      one_time: 'Pagamento Único'
    };
    return labels[cycle] || cycle;
  };

  const filteredCosts = costs.filter(cost => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      if (!cost.name.toLowerCase().includes(searchLower) && 
          !cost.vendor?.toLowerCase().includes(searchLower)) {
        return false;
      }
    }

    if (filterStatus !== "all" && cost.status !== filterStatus) {
      return false;
    }

    if (filterType !== "all" && cost.cost_type !== filterType) {
      return false;
    }

    return true;
  });

  const totalCosts = filteredCosts.reduce((sum, cost) => sum + (cost.amount || 0), 0);
  const paidCosts = filteredCosts.filter(c => c.status === 'paid').reduce((sum, cost) => sum + (cost.amount || 0), 0);
  const pendingCosts = filteredCosts.filter(c => c.status === 'pending').reduce((sum, cost) => sum + (cost.amount || 0), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto overflow-hidden">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690a8ae384e85f405dd1958f/8d6af0619_ChatGPTImage24denovde202519_02_27.png"
              alt="Sparta Sync"
              className="w-16 h-16 object-contain"
              onError={(e) => {
                console.error('Logo failed to load on Costs page');
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

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="rounded-3xl border-red-200 max-w-md">
          <CardContent className="text-center p-8">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Acesso Negado</h3>
            <p className="text-gray-500">
              Apenas administradores podem acessar esta página.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification.show && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white`}>
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <TrendingDown className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Custos do Sistema</h1>
            <p className="text-gray-600">Gerencie custos e despesas operacionais</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={loadData}
            variant="outline"
            size="sm"
            disabled={isLoading}
            className="rounded-2xl"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Message Alert */}
      {notification.show && (
        <Alert className={`rounded-2xl ${notification.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
          {notification.type === 'error' ? (
            <AlertCircle className="h-4 w-4 text-red-600" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          )}
          <AlertDescription className={notification.type === 'error' ? 'text-red-800' : 'text-green-800'}>
            {notification.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Toolbar */}
      <div className="flex flex-col gap-3">
        {/* Desktop: Tudo na mesma linha */}
        <div className="flex gap-2 items-center flex-wrap">
          {/* Barra de pesquisa */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar custos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px] rounded-xl">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="paid">Pago</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="overdue">Atrasado</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[140px] rounded-xl">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="tool">Ferramenta</SelectItem>
              <SelectItem value="service">Serviço</SelectItem>
              <SelectItem value="infrastructure">Infraestrutura</SelectItem>
              <SelectItem value="license">Licença</SelectItem>
              <SelectItem value="other">Outro</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-1 border rounded-xl p-1 bg-white">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
              className="h-8 w-8 rounded-lg"
            >
              <LayoutGrid className="w-4 h-4" />
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
            onClick={loadData}
            disabled={isLoading}
            className="rounded-xl h-10 w-10 p-0"
            size="icon"
            title="Atualizar"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>

          <Button
            onClick={handleCreateCost}
            className="bg-blue-600 hover:bg-blue-700 rounded-xl"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Custo
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-3xl border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Custos</p>
                <p className="text-2xl font-bold text-gray-900">
                  R$ {totalCosts.toFixed(2).replace('.', ',')}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pagos</p>
                <p className="text-2xl font-bold text-green-600">
                  R$ {paidCosts.toFixed(2).replace('.', ',')}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-600">
                  R$ {pendingCosts.toFixed(2).replace('.', ',')}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-2xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Costs List */}
      {filteredCosts.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCosts.map((cost) => {
              const statusInfo = getStatusInfo(cost.status);
              const StatusIcon = statusInfo.icon;

              return (
                <Card key={cost.id} className="rounded-3xl border-gray-200 hover:shadow-lg transition-all duration-300 group">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-lg mb-2">{cost.name}</h3>
                        <div className="flex items-center gap-2 flex-wrap mb-3">
                          <Badge className={`text-xs rounded-full px-3 py-1 border ${statusInfo.color}`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusInfo.text}
                          </Badge>
                          <Badge variant="outline" className="text-xs rounded-full px-3 py-1">
                            {getCostTypeLabel(cost.cost_type)}
                          </Badge>
                          {cost.is_recurring && (
                            <Badge className="text-xs rounded-full px-3 py-1 bg-blue-50 text-blue-700 border-blue-200">
                              Recorrente
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {cost.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{cost.description}</p>
                    )}

                    <div className="text-2xl font-bold text-red-600 mb-4">
                      R$ {cost.amount.toFixed(2).replace('.', ',')}
                      <span className="text-sm text-gray-500 font-normal ml-2">
                        {getBillingCycleLabel(cost.billing_cycle)}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>Ref: {cost.reference_month}</span>
                      </div>
                      {cost.vendor && (
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                          <span>{cost.vendor}</span>
                        </div>
                      )}
                      {cost.payment_date && (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                          <span>Pago: {format(new Date(cost.payment_date), "dd/MM/yyyy", { locale: ptBR })}</span>
                        </div>
                      )}
                      {cost.due_date && !cost.payment_date && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-yellow-400" />
                          <span>Vence: {format(new Date(cost.due_date), "dd/MM/yyyy", { locale: ptBR })}</span>
                        </div>
                      )}
                    </div>

                    {(cost.receipt_url || cost.invoice_url) && (
                      <div className="flex items-center gap-2 mb-4">
                        {cost.receipt_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(cost.receipt_url, '_blank')}
                            className="rounded-xl text-xs flex-1"
                          >
                            <Receipt className="w-3 h-3 mr-1" />
                            Comprovante
                          </Button>
                        )}
                        {cost.invoice_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(cost.invoice_url, '_blank')}
                            className="rounded-xl text-xs flex-1"
                          >
                            <FileText className="w-3 h-3 mr-1" />
                            NF
                          </Button>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-center gap-2 pt-4 border-t border-gray-100">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditCost(cost)}
                        className="flex-1 rounded-xl"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteCost(cost.id)}
                        className="rounded-xl hover:bg-red-50 text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCosts.map((cost) => {
              const statusInfo = getStatusInfo(cost.status);
              const StatusIcon = statusInfo.icon;

              return (
                <Card key={cost.id} className="rounded-3xl border-gray-200 hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                       <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                         <TrendingDown className="w-6 h-6 text-blue-600" />
                       </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1 flex-wrap">
                            <h3 className="font-semibold text-gray-900">{cost.name}</h3>
                            <Badge className={`text-xs rounded-full ${statusInfo.color}`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusInfo.text}
                            </Badge>
                            <Badge variant="outline" className="text-xs rounded-full">
                              {getCostTypeLabel(cost.cost_type)}
                            </Badge>
                            {cost.is_recurring && (
                              <Badge className="text-xs rounded-full bg-blue-50 text-blue-700 border-blue-200">
                                Recorrente
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                            <span className="flex items-center gap-1 font-semibold text-red-600">
                              <DollarSign className="w-3 h-3" />
                              R$ {cost.amount.toFixed(2).replace('.', ',')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {cost.reference_month}
                            </span>
                            {cost.vendor && (
                              <span className="text-gray-500">{cost.vendor}</span>
                            )}
                            {cost.payment_date && (
                              <span className="text-green-600">
                                Pago: {format(new Date(cost.payment_date), "dd/MM", { locale: ptBR })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {cost.receipt_url && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => window.open(cost.receipt_url, '_blank')}
                            className="rounded-xl h-8 w-8"
                          >
                            <Receipt className="w-4 h-4 text-gray-600" />
                          </Button>
                        )}
                        {cost.invoice_url && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => window.open(cost.invoice_url, '_blank')}
                            className="rounded-xl h-8 w-8"
                          >
                            <FileText className="w-4 h-4 text-gray-600" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleEditCost(cost)}
                          className="rounded-xl h-8 w-8"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteCost(cost.id)}
                          className="rounded-xl h-8 w-8 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      ) : (
        <Card className="rounded-3xl border-dashed border-2 border-gray-200">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TrendingDown className="w-16 h-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhum custo encontrado
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || filterStatus !== 'all' || filterType !== 'all'
                ? 'Tente ajustar os filtros de busca'
                : 'Comece adicionando seus primeiros custos'}
            </p>
            {!searchTerm && filterStatus === 'all' && filterType === 'all' && (
              <Button
                onClick={handleCreateCost}
                className="bg-blue-600 hover:bg-blue-700 rounded-xl"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Custo
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cost Modal */}
      <Dialog open={showCostModal} onOpenChange={setShowCostModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle>{editingCost ? "Editar Custo" : "Novo Custo"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome do Custo *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Base44 Platform"
                  className="rounded-xl mt-1"
                />
              </div>

              <div>
                <Label>Fornecedor</Label>
                <Input
                  value={formData.vendor}
                  onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                  placeholder="Ex: Base44 Inc."
                  className="rounded-xl mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição detalhada do custo..."
                className="rounded-xl mt-1 min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  className="rounded-xl mt-1"
                />
              </div>

              <div>
                <Label>Tipo de Custo *</Label>
                <Select
                  value={formData.cost_type}
                  onValueChange={(value) => setFormData({ ...formData, cost_type: value })}
                >
                  <SelectTrigger className="rounded-xl mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tool">Ferramenta</SelectItem>
                    <SelectItem value="service">Serviço</SelectItem>
                    <SelectItem value="infrastructure">Infraestrutura</SelectItem>
                    <SelectItem value="license">Licença</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ciclo de Cobrança</Label>
                <Select
                  value={formData.billing_cycle}
                  onValueChange={(value) => setFormData({ ...formData, billing_cycle: value })}
                >
                  <SelectTrigger className="rounded-xl mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="quarterly">Trimestral</SelectItem>
                    <SelectItem value="biannual">Semestral</SelectItem>
                    <SelectItem value="annual">Anual</SelectItem>
                    <SelectItem value="one_time">Pagamento Único</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger className="rounded-xl mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Pago</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="overdue">Atrasado</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Mês de Referência *</Label>
                <Input
                  type="month"
                  value={formData.reference_month}
                  onChange={(e) => setFormData({ ...formData, reference_month: e.target.value })}
                  className="rounded-xl mt-1"
                />
              </div>

              <div>
                <Label>Data de Pagamento</Label>
                <Input
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                  className="rounded-xl mt-1"
                />
              </div>

              <div>
                <Label>Data de Vencimento</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="rounded-xl mt-1"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_recurring"
                checked={formData.is_recurring}
                onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="is_recurring" className="cursor-pointer">
                Custo recorrente
              </Label>
            </div>

            {/* Upload Files */}
            <div className="space-y-4">
              <div>
                <Label>Comprovante de Pagamento</Label>
                <div className="mt-1">
                  {formData.receipt_url ? (
                    <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl border-2 border-green-200">
                      <Receipt className="w-5 h-5 text-green-600" />
                      <span className="flex-1 text-sm text-green-700">Comprovante anexado</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(formData.receipt_url, '_blank')}
                        className="rounded-xl"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setFormData({ ...formData, receipt_url: '' })}
                        className="rounded-xl hover:bg-red-100"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="file"
                        id="receipt-upload"
                        accept="image/*,application/pdf"
                        onChange={(e) => handleFileUpload(e, 'receipt_url')}
                        className="hidden"
                        disabled={uploadingReceipt}
                      />
                      <label htmlFor="receipt-upload">
                        <div className={`flex items-center gap-2 p-4 border-2 border-dashed rounded-xl transition-colors ${
                          uploadingReceipt 
                            ? 'opacity-50 cursor-not-allowed' 
                            : 'hover:bg-gray-50 cursor-pointer hover:border-blue-300'
                        }`}>
                          {uploadingReceipt ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                              <span className="text-sm text-gray-600">Enviando...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-5 h-5 text-blue-600" />
                              <span className="text-sm font-medium">Clique para anexar comprovante</span>
                            </>
                          )}
                        </div>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label>Nota Fiscal</Label>
                <div className="mt-1">
                  {formData.invoice_url ? (
                    <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border-2 border-blue-200">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <span className="flex-1 text-sm text-blue-700">Nota fiscal anexada</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(formData.invoice_url, '_blank')}
                        className="rounded-xl"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setFormData({ ...formData, invoice_url: '' })}
                        className="rounded-xl hover:bg-red-100"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="file"
                        id="invoice-upload"
                        accept="image/*,application/pdf"
                        onChange={(e) => handleFileUpload(e, 'invoice_url')}
                        className="hidden"
                        disabled={uploadingInvoice}
                      />
                      <label htmlFor="invoice-upload">
                        <div className={`flex items-center gap-2 p-4 border-2 border-dashed rounded-xl transition-colors ${
                          uploadingInvoice 
                            ? 'opacity-50 cursor-not-allowed' 
                            : 'hover:bg-gray-50 cursor-pointer hover:border-blue-300'
                        }`}>
                          {uploadingInvoice ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                              <span className="text-sm text-gray-600">Enviando...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-5 h-5 text-blue-600" />
                              <span className="text-sm font-medium">Clique para anexar nota fiscal</span>
                            </>
                          )}
                        </div>
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Observações sobre o custo..."
                className="rounded-xl mt-1 min-h-[80px]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setShowCostModal(false)}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveCost}
              disabled={!formData.name || !formData.amount}
              className="rounded-xl bg-blue-600 hover:bg-blue-700"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              {editingCost ? "Atualizar" : "Criar"} Custo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}