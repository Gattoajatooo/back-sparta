import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  X,
  History,
  MessageSquare,
  Calendar,
  Loader2,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Image,
  Video,
  FileText,
  Mic,
  Zap,
  Download,
  Eye,
  Play,
  MessageCircleMore,
  Plus,
  Check,
  Edit2
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Message } from "@/entities/Message";
import { Schedule } from "@/entities/Schedule";
import { ContactEvent } from "@/entities/ContactEvent"; // New entity
import { useWebSocket } from "../hooks/useWebSocket";
import { User } from "@/entities/User";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Import tabs
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";

export default function ContactHistoryModal({ open, onClose, contact }) {
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [events, setEvents] = useState([]); // New state for events
  const [allUsers, setAllUsers] = useState({}); // Map of user_id -> user object
  const [schedules, setSchedules] = useState({});
  const [previewMedia, setPreviewMedia] = useState(null);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("messages");
  
  // Event creation state
  const [showEventForm, setShowEventForm] = useState(false);
  const [newEventDescription, setNewEventDescription] = useState("");
  const [newEventTitle, setNewEventTitle] = useState("");
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null); // ID of event being edited

  const navigate = useNavigate();
  const messagesScrollRef = React.useRef(null);
  const eventsScrollRef = React.useRef(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (activeTab === 'messages' && messagesScrollRef.current) {
        messagesScrollRef.current.scrollTop = messagesScrollRef.current.scrollHeight;
      }
      if (activeTab === 'events' && eventsScrollRef.current) {
        eventsScrollRef.current.scrollTop = eventsScrollRef.current.scrollHeight;
      }
    }, 150);
  }, [activeTab]);

  useEffect(() => {
    if (open) {
        scrollToBottom();
    }
  }, [open, activeTab, messages, events, scrollToBottom]);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser);
      } catch (error) {
        console.error('Erro ao carregar usuário:', error);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (open && contact?.id) {
      loadContactHistory();
      loadEvents();
      loadAllUsers();
    }
  }, [open, contact]);

  const loadAllUsers = async () => {
    try {
        const users = await base44.entities.User.list(); // Or User.filter({})
        const userMap = {};
        users.forEach(u => {
            userMap[u.id] = u;
        });
        setAllUsers(userMap);
    } catch (error) {
        console.error("Error loading users:", error);
    }
  };

  const loadEvents = async () => {
    if (!contact?.id) return;
    try {
        const contactEvents = await base44.entities.ContactEvent.filter({
            contact_id: contact.id
        }, '-event_date'); // Descending order
        setEvents(contactEvents);
    } catch (error) {
        console.error("Error loading events:", error);
    }
  };

  const handleCreateEvent = async () => {
    if (!newEventDescription.trim()) return;
    setIsCreatingEvent(true);
    try {
        if (editingEventId) {
            await base44.entities.ContactEvent.update(editingEventId, {
                title: newEventTitle || 'Nota',
                description: newEventDescription,
            });
        } else {
            await base44.entities.ContactEvent.create({
                contact_id: contact.id,
                contact_phone: contact.phone,
                user_id: user.id,
                title: newEventTitle || 'Nota',
                description: newEventDescription,
                event_date: new Date().toISOString()
            });
        }
        setNewEventDescription("");
        setNewEventTitle("");
        setEditingEventId(null);
        setShowEventForm(false);
        loadEvents(); // Refresh list
    } catch (error) {
        console.error("Error creating/updating event:", error);
    } finally {
        setIsCreatingEvent(false);
    }
  };

  const handleEditEvent = (event) => {
    setEditingEventId(event.id);
    setNewEventTitle(event.title);
    setNewEventDescription(event.description);
    setShowEventForm(true);
  };

  const canEditEvent = (event) => {
    if (!user) return false;
    if (event.user_id !== user.id) return false;
    const eventTime = new Date(event.event_date || event.created_date).getTime();
    const now = Date.now();
    const hoursDiff = (now - eventTime) / (1000 * 60 * 60);
    return hoursDiff <= 24;
  };

  // Combine messages and events for the General tab
  const getCombinedHistory = () => {
    const combined = [
        ...messages.map(m => ({ ...m, type: 'message', date: m.created_at })),
        ...events.map(e => ({ ...e, type: 'event', date: e.event_date || e.created_date }))
    ];
    // Sort by date ascending (oldest first) so newest are at the bottom
    return combined.sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const loadContactHistory = async () => {
    setIsLoading(true);
    try {
      // Buscar todas as mensagens do contato (ordem crescente - mais antigas primeiro, mais recentes no fim)
      const contactMessages = await Message.filter({
        contact_id: contact.id,
        deleted: false
      }, 'created_at');

      setMessages(contactMessages);

      // Buscar informações das campanhas associadas
      const scheduleIds = [...new Set(contactMessages.map(m => m.schedule_id).filter(Boolean))];
      const schedulesData = {};
      
      for (const scheduleId of scheduleIds) {
        try {
          const schedule = await Schedule.get(scheduleId);
          schedulesData[scheduleId] = schedule;
        } catch (error) {
          console.error(`Erro ao buscar campanha ${scheduleId}:`, error);
        }
      }
      
      setSchedules(schedulesData);

    } catch (error) {
      console.error("Erro ao carregar histórico do contato:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // WebSocket para atualizações em tempo real
  const handleWebSocketMessage = useCallback((data) => {
    console.log('[ContactHistoryModal] Recebida atualização WebSocket:', data);
    
    if (data.type === 'message_updated' && data.contact_id === contact?.id) {
      // Atualizar a mensagem específica no histórico
      setMessages(prevMessages => {
        const updatedMessages = prevMessages.map(msg => {
          // Identify message by id or scheduler_job_id
          if (msg.id === data.message_id || (data.scheduler_job_id && msg.scheduler_job_id === data.scheduler_job_id)) {
            console.log(`[ContactHistoryModal] Atualizando mensagem ${msg.id || msg.scheduler_job_id} de status ${msg.status} para ${data.status}`);
            return {
              ...msg,
              status: data.status,
              type_error: data.type_error,
              attempt_count: data.attempt_count,
              error_details: data.error_details,
              updated_at: data.data?.updated_at || new Date().toISOString()
            };
          }
          return msg;
        });
        return updatedMessages;
      });
    }
  }, [contact?.id]);

  useWebSocket(
    user?.company_id,
    handleWebSocketMessage,
    ['message_updated']
  );

  const getStatusBadge = (status, direction) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock, label: 'Pendente' },
      success: { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2, label: direction === 'received' ? 'Recebida' : 'Enviada' },
      failed: { color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle, label: 'Falhou' },
      retry: { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: AlertCircle, label: 'Tentando' },
      cancelled: { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: XCircle, label: 'Cancelada' },
      awaiting_approval: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Clock, label: 'Aguardando Aprovação' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} text-xs rounded-full`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getMessageTypeIcon = (metadata) => {
    const type = metadata?.message_type || 'text';
    
    const icons = {
      text: MessageSquare,
      image: Image,
      video: Video,
      voice: Mic,
      file: FileText
    };

    const Icon = icons[type] || MessageSquare;
    return <Icon className="w-4 h-4 text-gray-400" />;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return '-';
    }
  };

  const handleViewMedia = (message) => {
    const attachmentUrl = message.metadata?.attachment_url || message.metadata?.file_url;
    const messageType = message.metadata?.message_type || 'text';
    
    if (attachmentUrl) {
      setPreviewMedia({
        url: attachmentUrl,
        type: messageType,
        filename: message.metadata?.attachment_filename || message.metadata?.filename || 'Anexo'
      });
    }
  };

  const handleDownloadMedia = (message) => {
    const attachmentUrl = message.metadata?.attachment_url || message.metadata?.file_url;
    const filename = message.metadata?.attachment_filename || message.metadata?.filename || 'download';
    
    if (attachmentUrl) {
      const link = document.createElement('a');
      link.href = attachmentUrl;
      link.download = filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const renderMediaPreview = (message) => {
    const messageType = message.metadata?.message_type || 'text';
    const attachmentUrl = message.metadata?.attachment_url || message.metadata?.file_url;
    
    if (!attachmentUrl || messageType === 'text') return null;

    return (
      <div className="mt-2 flex items-center gap-2">
        {messageType === 'image' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewMedia(message)}
            className="rounded-lg text-xs"
          >
            <Eye className="w-3 h-3 mr-1" />
            Ver Imagem
          </Button>
        )}
        
        {messageType === 'video' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewMedia(message)}
            className="rounded-lg text-xs"
          >
            <Play className="w-3 h-3 mr-1" />
            Ver Vídeo
          </Button>
        )}
        
        {messageType === 'voice' && (
          <div className="flex items-center gap-2">
            <audio controls className="h-8 max-w-xs">
              <source src={attachmentUrl} type="audio/ogg" />
              Seu navegador não suporta áudio.
            </audio>
          </div>
        )}
        
        {messageType === 'file' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownloadMedia(message)}
            className="rounded-lg text-xs"
          >
            <Download className="w-3 h-3 mr-1" />
            Baixar Arquivo
          </Button>
        )}
      </div>
    );
  };

  if (!open || !contact) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent 
          className="w-[700px] max-w-[95vw] max-h-[85vh] p-0 bg-white rounded-[2.5rem] border-gray-200 [&>button]:hidden flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center">
                  <History className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Histórico de Mensagens</h2>
                  <p className="text-sm text-gray-600">{contact.first_name} {contact.last_name}</p>
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

          {/* Content with Tabs */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
              <div className="px-6 pt-4 pb-4 border-b border-gray-100 flex-shrink-0">
                <TabsList className="bg-gray-100 p-1 rounded-xl">
                  <TabsTrigger value="messages" className="rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">
                    Histórico Geral
                  </TabsTrigger>
                  <TabsTrigger value="events" className="rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">
                    Eventos e Notas
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="messages" className="flex-1 data-[state=active]:flex data-[state=active]:flex-col m-0 p-0 focus-visible:ring-0 focus-visible:outline-none overflow-hidden">
                <div ref={messagesScrollRef} className="flex-1 overflow-y-auto p-8">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                      <span className="ml-2 text-blue-600">Carregando histórico...</span>
                    </div>
                  ) : messages.length === 0 && events.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                      <History className="w-12 h-12 mb-3 text-gray-300" />
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">
                        Nenhuma atividade registrada
                      </h3>
                      <p className="text-sm text-center max-w-md">
                        Este contato ainda não possui histórico de mensagens ou eventos.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="space-y-3">
                        {getCombinedHistory().map((item) => {
                          if (item.type === 'message') {
                            const message = item;
                            const isSent = message.direction === 'sent';
                            
                            return (
                              <div key={`msg-${message.id || message.scheduler_job_id}`} className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}>
                                <Card className={`rounded-2xl hover:shadow-md transition-shadow max-w-[85%] ${
                                  isSent 
                                    ? 'bg-blue-50 border-blue-200' 
                                    : 'bg-gray-50 border-gray-200'
                                }`}>
                                  <CardContent className="p-4">
                                    <div className={`flex items-start gap-3 ${isSent ? 'flex-row-reverse' : 'flex-row'}`}>
                                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                        isSent ? 'bg-blue-200' : 'bg-gray-200'
                                      }`}>
                                        {getMessageTypeIcon(message.metadata)}
                                      </div>

                                      <div className="flex-1 min-w-0">
                                        <div className={`flex items-start justify-between gap-2 mb-2 ${isSent ? 'flex-row-reverse' : 'flex-row'}`}>
                                          <div className="flex-1">
                                            <div className={`flex items-center gap-2 mb-1 ${isSent ? 'flex-row-reverse justify-end' : 'flex-row'}`}>
                                              {getStatusBadge(message.status, message.direction)}
                                              {message.schedule_id && schedules[message.schedule_id] && (
                                                <Badge variant="outline" className="text-xs rounded-full bg-purple-50 text-purple-700 border-purple-200">
                                                  <Zap className="w-3 h-3 mr-1" />
                                                  {schedules[message.schedule_id].name}
                                                </Badge>
                                              )}
                                            </div>
                                            <div className={`flex items-center gap-2 text-xs text-gray-500 ${isSent ? 'justify-end' : 'justify-start'}`}>
                                              <Calendar className="w-3 h-3" />
                                              <span>{formatDate(message.created_at)}</span>
                                            </div>
                                          </div>
                                        </div>

                                        {message.content && (
                                          <div className={`rounded-lg p-3 mt-2 ${
                                            isSent ? 'bg-blue-100' : 'bg-gray-100'
                                          }`}>
                                            <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-3">
                                              {message.content}
                                            </p>
                                          </div>
                                        )}

                                        {renderMediaPreview(message)}

                                        {message.metadata && (
                                          <div className={`mt-2 flex flex-wrap gap-2 text-xs text-gray-500 ${isSent ? 'justify-end' : 'justify-start'}`}>
                                            {message.metadata.session_name && (
                                              <span className="flex items-center gap-1">
                                                <Send className="w-3 h-3" />
                                                Sessão: {message.metadata.session_name}
                                              </span>
                                            )}
                                            {message.attempt_count > 0 && (
                                              <span className="flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" />
                                                Tentativas: {message.attempt_count}
                                              </span>
                                            )}
                                          </div>
                                        )}

                                        {message.error_details && message.status === 'failed' && (
                                          <div className="mt-2 p-2 bg-red-50 rounded-lg border border-red-100">
                                            <p className="text-xs text-red-600">
                                              <strong>Erro:</strong> {message.error_details}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              </div>
                            );
                          } else {
                            const event = item;
                            const eventUser = allUsers[event.user_id];
                            return (
                                <div key={`evt-${event.id}`} className="flex justify-center my-4">
                                    <div className="relative group max-w-[85%] w-full">
                                        <Card className="rounded-xl border-orange-200 bg-orange-50 hover:shadow-md transition-shadow">
                                            <CardContent className="p-4">
                                                <div className="flex items-start gap-4">
                                                    <Avatar className="w-10 h-10 border border-orange-200">
                                                        <AvatarImage src={eventUser?.avatar_url} />
                                                        <AvatarFallback className="bg-orange-200 text-orange-700">{eventUser?.full_name?.substring(0,2).toUpperCase() || 'U'}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <h4 className="font-semibold text-gray-900">{event.title || 'Evento'}</h4>
                                                                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                                                    <Clock className="w-3 h-3" />
                                                                    {formatDate(event.event_date || event.created_date)}
                                                                    <span className="mx-1">•</span>
                                                                    {eventUser?.full_name || 'Usuário desconhecido'}
                                                                </p>
                                                            </div>
                                                            {canEditEvent(event) && (
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="icon" 
                                                                    className="h-6 w-6 text-gray-400 hover:text-blue-600"
                                                                    onClick={() => {
                                                                        handleEditEvent(event);
                                                                        setActiveTab('events'); // Switch to events tab to show form
                                                                    }}
                                                                >
                                                                    <Edit2 className="w-3 h-3" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap bg-white p-3 rounded-lg border border-orange-100">
                                                            {event.description}
                                                        </p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>
                            );
                          }
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="events" className="flex-1 data-[state=active]:flex data-[state=active]:flex-col m-0 p-0 focus-visible:ring-0 focus-visible:outline-none overflow-hidden">
                <div ref={eventsScrollRef} className="flex-1 overflow-y-auto p-8">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      Linha do Tempo
                    </h3>
                    <Button 
                      onClick={() => setShowEventForm(!showEventForm)} 
                      className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {showEventForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                      {showEventForm ? 'Cancelar' : 'Lançar Evento'}
                    </Button>
                  </div>

                  {showEventForm && (
                    <Card className="mb-6 border-blue-200 bg-blue-50 animate-in fade-in slide-in-from-top-4">
                        <CardContent className="p-4 space-y-4">
                            <div>
                                <Label htmlFor="event-title">Título / Tipo</Label>
                                <Input 
                                    id="event-title" 
                                    placeholder="Ex: Ligação, Reunião, Nota..." 
                                    className="mt-1 bg-white"
                                    value={newEventTitle}
                                    onChange={(e) => setNewEventTitle(e.target.value)}
                                />
                            </div>
                            <div>
                                <Label htmlFor="event-desc">Descrição</Label>
                                <Textarea 
                                    id="event-desc" 
                                    placeholder="Descreva o que aconteceu..." 
                                    className="mt-1 bg-white" 
                                    rows={3}
                                    value={newEventDescription}
                                    onChange={(e) => setNewEventDescription(e.target.value)}
                                />
                            </div>
                            <div className="flex justify-end">
                                <Button 
                                    onClick={handleCreateEvent} 
                                    disabled={isCreatingEvent || !newEventDescription.trim()}
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    {isCreatingEvent ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Check className="w-4 h-4 mr-2"/>}
                                    {editingEventId ? 'Atualizar Evento' : 'Salvar Evento'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                  )}

                  <div className="space-y-6 relative pl-4 border-l-2 border-gray-200 ml-4">
                    {events.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <p>Nenhum evento registrado.</p>
                        </div>
                    ) : (
                        events.map((event) => {
                            const eventUser = allUsers[event.user_id];
                            return (
                                <div key={event.id} className="relative mb-8 group">
                                    <div className="absolute -left-[25px] top-0 bg-white border-2 border-blue-500 rounded-full w-4 h-4 group-hover:scale-125 transition-transform"></div>
                                    <Card className="rounded-xl border-gray-200 hover:shadow-md transition-shadow">
                                        <CardContent className="p-4">
                                            <div className="flex items-start gap-4">
                                                <Avatar className="w-10 h-10 border border-gray-200">
                                                    <AvatarImage src={eventUser?.avatar_url} />
                                                    <AvatarFallback>{eventUser?.full_name?.substring(0,2).toUpperCase() || 'U'}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h4 className="font-semibold text-gray-900">{event.title || 'Evento'}</h4>
                                                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                                                <Clock className="w-3 h-3" />
                                                                {formatDate(event.event_date || event.created_date)}
                                                                <span className="mx-1">•</span>
                                                                {eventUser?.full_name || 'Usuário desconhecido'}
                                                            </p>
                                                        </div>
                                                        {canEditEvent(event) && (
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                className="h-6 w-6 text-gray-400 hover:text-blue-600"
                                                                onClick={() => handleEditEvent(event)}
                                                            >
                                                                <Edit2 className="w-3 h-3" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                                                        {event.description}
                                                    </p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            );
                        })
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center gap-3 p-6 bg-gray-50 border-t border-gray-200 flex-shrink-0">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="rounded-xl"
            >
              Fechar
            </Button>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  navigate(createPageUrl('WhatsAppChat'));
                  setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('openContactChat', {
                      detail: { contactId: contact.id }
                    }));
                  }, 300);
                  onClose();
                }}
                className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
              >
                <MessageCircleMore className="w-4 h-4 mr-2" />
                Abrir Chat
              </Button>
              <Button
                onClick={loadContactHistory}
                variant="outline"
                className="rounded-xl"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <History className="w-4 h-4 mr-2" />
                )}
                Atualizar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Preview de Mídia */}
      {previewMedia && (
        <Dialog open={!!previewMedia} onOpenChange={() => setPreviewMedia(null)}>
          <DialogContent 
            className="max-w-4xl p-0 border-0 bg-black/90"
            style={{ borderRadius: '1rem' }}
          >
            <div className="relative">
              <button
                onClick={() => setPreviewMedia(null)}
                className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
              
              {previewMedia.type === 'image' && (
                <img 
                  src={previewMedia.url} 
                  alt={previewMedia.filename}
                  className="w-full h-auto max-h-[80vh] object-contain"
                  style={{ borderRadius: '1rem' }}
                />
              )}
              
              {previewMedia.type === 'video' && (
                <video 
                  controls 
                  className="w-full h-auto max-h-[80vh]"
                  style={{ borderRadius: '1rem' }}
                >
                  <source src={previewMedia.url} type="video/mp4" />
                  Seu navegador não suporta vídeo.
                </video>
              )}
              
              <div className="p-4 bg-black/50 text-white text-center">
                <p className="text-sm">{previewMedia.filename}</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}