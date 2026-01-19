
import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Contact } from "@/entities/Contact";
import { MessageTemplate } from "@/entities/MessageTemplate";
import { Schedule } from "@/entities/Schedule";
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
  AlertCircle, // Added for notifications
  Loader2, // Added for background processing spinner
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import ScheduleFormModal from "../components/scheduler/ScheduleFormModal";
import ScheduleDetailsModal from "../components/scheduler/ScheduleDetailsModal";
import { Alert, AlertDescription } from "@/components/ui/alert"; // Added for notifications

export default function Scheduler() {
  const [user, setUser] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // Modal states
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [viewingSchedule, setViewingSchedule] = useState(null);

  // Adicionar estado para notificação geral (popup)
  const [notification, setNotification] = useState({
    show: false,
    type: 'success',
    message: ''
  });

  // Adicionar estados para o banner de criação em segundo plano
  const [creatingCampaign, setCreatingCampaign] = useState(false);
  const [campaignCreationMessage, setCampaignCreationMessage] = useState('');

  useEffect(() => {
    loadData();
    checkForCreateAction();
  }, []);

  const checkForCreateAction = () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'create') {
      setShowScheduleForm(true);
    }
  };

  const loadData = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);

      if (currentUser?.company_id) {
        const scheduleList = await Schedule.filter({ company_id: currentUser.company_id }, '-created_date');
        setSchedules(Array.isArray(scheduleList) ? scheduleList : []);

        const contactList = await Contact.filter({ company_id: currentUser.company_id }, 'first_name', 100);
        setContacts(Array.isArray(contactList) ? contactList : []);

        const templateList = await MessageTemplate.filter({ company_id: currentUser.company_id }, 'name', 50);
        setTemplates(Array.isArray(templateList) ? templateList : []);
      }
    } catch (error) {
      console.error("Erro ao carregar agendamentos:", error);
      setSchedules([]);
      setContacts([]);
      setTemplates([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Função para mostrar notificação geral (popup)
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

  const handleCreateSchedule = async (scheduleData) => {
    try {
      console.log('[Scheduler.js] Iniciando criação de campanha com dados:', scheduleData);
      setCreatingCampaign(true);
      setCampaignCreationMessage('Processando campanha...');
      
      // Dynamic import of createSchedule function
      const { createSchedule } = await import("@/functions/createSchedule");
      const response = await createSchedule(scheduleData);
      
      console.log('[Scheduler.js] Resposta da criação:', response);
      
      if (response.data?.success) {
        setCampaignCreationMessage(
          scheduleData.schedule_type === 'immediate' 
            ? 'Mensagens enviadas com sucesso!' 
            : 'Agendamento criado com sucesso!'
        );
        
        // Recarregar dados após 2 segundos para dar tempo de ler a mensagem de sucesso
        setTimeout(() => {
          loadData(); // Recarregar lista (using loadData for consistency)
          setCreatingCampaign(false);
          setCampaignCreationMessage('');
        }, 2000);

        return { success: true };
      } else {
        const errorMsg = response.data?.error || 'Erro desconhecido ao criar campanha';
        setCampaignCreationMessage(`Erro: ${errorMsg}`);
        
        // Manter mensagem de erro por 5 segundos
        setTimeout(() => {
          setCreatingCampaign(false);
          setCampaignCreationMessage('');
        }, 5000);

        return { success: false, error: errorMsg };
      }
    } catch (error) {
      console.error('[Scheduler.js] Erro ao criar agendamento:', error);
      setCampaignCreationMessage(`Erro: ${error.message}`);
      
      // Manter mensagem de erro por 5 segundos
      setTimeout(() => {
        setCreatingCampaign(false);
        setCampaignCreationMessage('');
      }, 5000);

      return { success: false, error: error.message };
    }
  };

  const handleViewDetails = (schedule) => {
    console.log('Abrindo detalhes do agendamento:', schedule);
    setViewingSchedule(schedule);
    setShowDetailsModal(true);
  };

  const handleEditSchedule = (schedule) => {
    setEditingSchedule(schedule);
    setShowScheduleForm(true);
  };

  const handleDeleteSchedule = async (schedule) => {
    if (window.confirm(`Tem certeza que deseja excluir o agendamento "${schedule.name}"?`)) {
      try {
        await Schedule.delete(schedule.id);
        loadData();
        showNotification('success', 'Agendamento excluído com sucesso!');
      } catch (error) {
        console.error("Erro ao excluir agendamento:", error);
        showNotification('error', 'Erro ao excluir agendamento');
      }
    }
  };

  const getStats = () => {
    return {
      total: schedules.length,
      scheduled: schedules.filter(m => m.status === 'pending').length,
      processing: schedules.filter(m => m.status === 'processing').length,
      completed: schedules.filter(m => m.status === 'completed').length,
      failed: schedules.filter(m => m.status === 'failed').length,
      today: schedules.filter(m => {
        if (!m.scheduled_date && !m.recurring_settings?.start_date) return false;
        const scheduleDate = new Date(m.scheduled_date || m.recurring_settings.start_date);
        const today = new Date();
        return scheduleDate.toDateString() === today.toDateString();
      }).length,
      totalRecipients: schedules.reduce((sum, m) => sum + (m.total_recipients || 0), 0)
    };
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Agendado';
      case 'processing': return 'Enviando';
      case 'completed': return 'Concluído';
      case 'failed': return 'Falhou';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  const filteredSchedules = schedules
    .filter(schedule => {
      if (searchTerm && !schedule.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      switch (activeTab) {
        case 'all': return true;
        case 'scheduled': return schedule.status === 'pending';
        case 'sending': return schedule.status === 'processing';
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

  const stats = getStats();

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Banner de criação de campanha em segundo plano */}
      {creatingCampaign && (
        <div className="fixed top-4 right-4 z-50 max-w-md">
          <Alert className={`shadow-lg border-2 rounded-xl ${
            campaignCreationMessage.includes('sucesso') 
              ? 'bg-green-50 border-green-200' 
              : campaignCreationMessage.includes('Erro') 
              ? 'bg-red-50 border-red-200' 
              : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-center gap-3">
              {campaignCreationMessage.includes('Processando') && (
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
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

      {/* Notificação Banner Geral (pop-up) */}
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
      <div className="flex items-center gap-3 mb-6 p-6"> {/* Added padding for main content */}
        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center">
          <Calendar className="w-6 h-6 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Campanhas</h1>
          <p className="text-gray-600">
            Gerencie e agende envios de mensagens para campanhas e marcadores
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 pt-0"> {/* Added overflow for scrollable content */}
        {/* Stats Cards (now also act as tabs) */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {[
            {
              label: "Total",
              value: schedules.length,
              icon: FileText,
              color: "text-gray-600 bg-gray-50",
              tab: "all"
            },
            {
              label: "Agendados",
              value: schedules.filter(s => s.status === 'pending').length,
              icon: Clock,
              color: "text-yellow-600 bg-yellow-50",
              tab: "scheduled"
            },
            {
              label: "Enviando",
              value: schedules.filter(s => s.status === 'processing').length,
              icon: Send,
              color: "text-blue-600 bg-blue-50",
              tab: "sending"
            },
            {
              label: "Concluídos",
              value: schedules.filter(s => s.status === 'completed').length,
              icon: CheckCircle2,
              color: "text-green-600 bg-green-50",
              tab: "completed"
            },
            {
              label: "Falharam",
              value: schedules.filter(s => s.status === 'failed').length,
              icon: XCircle,
              color: "text-red-600 bg-red-50",
              tab: "failed"
            }
          ].map((stat, index) => (
            <Card
              key={index}
              className={`rounded-2xl border-gray-200 cursor-pointer transition-all duration-200 ${
                activeTab === stat.tab ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'
              }`}
              onClick={() => setActiveTab(stat.tab)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${stat.color}`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Buscar agendamentos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 rounded-2xl border-gray-200 w-64"
            />
          </div>

          <Button
            onClick={() => {
              setEditingSchedule(null);
              setShowScheduleForm(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 rounded-2xl"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Agendamento
          </Button>
        </div>

        {/* Schedule List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
        ) : filteredSchedules.length > 0 ? (
          <div className="grid gap-4">
            {filteredSchedules.map((schedule) => (
              <Card key={schedule.id} className="rounded-2xl border-gray-200 hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{schedule.name}</h3>
                        <Badge className={`rounded-full text-xs px-3 py-1 border ${getStatusColor(schedule.status)}`}>
                          {getStatusText(schedule.status)}
                        </Badge>
                        <Badge variant="outline" className="text-xs rounded-full">
                          {schedule.message_type === 'whatsapp' ? 'WhatsApp' : schedule.message_type}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-4">
                        <div>
                          <span className="font-medium">Destinatários:</span>
                          <p>{schedule.total_recipients || 0}</p>
                        </div>
                        <div>
                          <span className="font-medium">Tipo:</span>
                          <p>{schedule.schedule_type === 'immediate' ? 'Imediato' :
                              schedule.schedule_type === 'single' ? 'Único' : 'Recorrente'}</p>
                        </div>
                        <div>
                          <span className="font-medium">Criado em:</span>
                          <p>{format(new Date(schedule.created_date), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
                        </div>
                        <div>
                          <span className="font-medium">Sessões:</span>
                          <p>{schedule.selected_sessions?.length || 0} selecionadas</p>
                        </div>
                      </div>

                      {schedule.scheduled_date && (schedule.schedule_type === 'single' || schedule.schedule_type === 'recurring') && (
                        <div className="flex items-center gap-2 text-sm text-blue-600 mb-2">
                          <Calendar className="w-4 h-4" />
                          <span>
                            Agendado para: {format(new Date(schedule.scheduled_date), 'dd/MM/yyyy', { locale: ptBR })} às {schedule.scheduled_time || '00:00'}
                          </span>
                        </div>
                      )}

                      {schedule.status === 'processing' && (
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{
                                width: `${((schedule.sent_count || 0) / (schedule.total_recipients || 1)) * 100}%`
                              }}
                            ></div>
                          </div>
                          <span className="text-gray-600">
                            {schedule.sent_count || 0} de {schedule.total_recipients || 0} enviados
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewDetails(schedule)}
                        className="h-8 w-8 rounded-full"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="rounded-2xl">
                          <DropdownMenuItem onClick={() => handleViewDetails(schedule)} className="rounded-xl">
                            <Eye className="w-4 h-4 mr-2" />
                            Ver Detalhes
                          </DropdownMenuItem>
                          {schedule.status === 'pending' && (
                            <DropdownMenuItem onClick={() => handleEditSchedule(schedule)} className="rounded-xl">
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleDeleteSchedule(schedule)}
                            className="rounded-xl text-red-600 focus:text-red-600"
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
            ))}
          </div>
        ) : (
          <Card className="rounded-3xl border-gray-200">
            <CardContent className="text-center py-16">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {activeTab === 'all' ? 'Nenhuma campanha encontrada' :
                activeTab === 'scheduled' ? 'Nenhuma campanha pendente' :
                activeTab === 'sending' ? 'Nenhum envio em andamento' :
                activeTab === 'completed' ? 'Nenhuma campanha concluída' :
                'Nenhuma campanha com falha'}
              </h3>
              <p className="text-gray-500 mb-6">
                {activeTab === 'all' ? 'Comece criando sua primeira campanha de mensagens' :
                'Nenhuma campanha nesta categoria no momento'}
              </p>
              {activeTab === 'all' && (
                <Button
                  onClick={() => {
                    setEditingSchedule(null);
                    setShowScheduleForm(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 rounded-2xl"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeira Campanha
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Schedule Form Modal */}
      {showScheduleForm && ( // Using showScheduleForm
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
            if (editingSchedule) {
              // Handle update - uses general notification
              try {
                await Schedule.update(editingSchedule.id, scheduleData);
                showNotification('success', 'Campanha atualizada com sucesso!');
                loadData(); // Reload data after update
                result = { success: true };
              } catch (error) {
                console.error("Erro ao atualizar campanha:", error);
                showNotification('error', `Erro ao atualizar campanha: ${error.message}`);
                result = { success: false, error: error.message };
              }
            } else {
              // Handle creation - uses background processing banner
              result = await handleCreateSchedule(scheduleData);
            }

            // Close modal only if successful
            if (result && result.success) {
              setShowScheduleForm(false);
              setEditingSchedule(null);
            }
            return result; // Return result for the modal (e.g., for loading states)
          }}
        />
      )}

      {/* Schedule Details Modal */}
      {showDetailsModal && viewingSchedule && (
        <ScheduleDetailsModal
          schedule={viewingSchedule}
          onClose={() => {
            setShowDetailsModal(false);
            setViewingSchedule(null);
          }}
          onEdit={(schedule) => {
            setShowDetailsModal(false);
            setViewingSchedule(null);
            handleEditSchedule(schedule);
          }}
        />
      )}
    </div>
  );
}
