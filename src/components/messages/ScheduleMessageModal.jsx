import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Clock,
  Users,
  MessageSquare,
  AlertTriangle,
  User,
  CheckCircle2,
  Edit,
  Calendar as CalendarIcon
} from "lucide-react";
import { format, addDays, startOfTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ScheduleMessageModal({ message, onClose, onSchedule }) {
  const [scheduledDate, setScheduledDate] = useState(startOfTomorrow());
  const [scheduledTime, setScheduledTime] = useState('10:00');
  const [editedContent, setEditedContent] = useState(message.content);
  const [selectedRecipients, setSelectedRecipients] = useState(
    message.send_type === 'mass' ? [] : [message.customer_id]
  );
  const [isEditing, setIsEditing] = useState(false);
  const [selectedSession, setSelectedSession] = useState('auto');
  const [sessionCriteria, setSessionCriteria] = useState('least_used');

  const isMassMessage = message.send_type === 'mass';

  // Mock session data
  const availableSessions = [
    { id: 'session_1', name: 'WhatsApp Principal', status: 'active', messages_sent: 45, last_used: '2024-01-15T10:30:00Z' },
    { id: 'session_2', name: 'WhatsApp Suporte', status: 'active', messages_sent: 23, last_used: '2024-01-15T09:15:00Z' },
    { id: 'session_3', name: 'WhatsApp Vendas', status: 'active', messages_sent: 67, last_used: '2024-01-15T14:20:00Z' }
  ];

  const sessionCriteriaOptions = [
    { value: 'least_used', label: 'Menos Utilizada', description: 'Sessão com menor número de mensagens enviadas' },
    { value: 'random', label: 'Aleatória', description: 'Escolha aleatória entre sessões ativas' },
    { value: 'round_robin', label: 'Rodízio', description: 'Alternância entre sessões de forma equilibrada' },
    { value: 'least_recent', label: 'Menos Recente', description: 'Sessão que foi usada há mais tempo' }
  ];

  const handleRecipientToggle = (recipientId, checked) => {
    if (checked) {
      setSelectedRecipients([...selectedRecipients, recipientId]);
    } else {
      setSelectedRecipients(selectedRecipients.filter(id => id !== recipientId));
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      if (isMassMessage) {
        setSelectedRecipients(message.recipients?.map((_, index) => `recipient_${index}`) || []);
      } else {
        setSelectedRecipients([message.customer_id]);
      }
    } else {
      setSelectedRecipients([]);
    }
  };

  const handleSchedule = () => {
    const scheduleDateTime = new Date(scheduledDate);
    const [hours, minutes] = scheduledTime.split(':');
    scheduleDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    const scheduleData = {
      originalMessageId: message.id,
      content: editedContent,
      recipients: selectedRecipients,
      scheduledDateTime: scheduleDateTime.toISOString(),
      session: selectedSession,
      sessionCriteria: selectedSession === 'auto' ? sessionCriteria : null,
      type: message.type
    };
    
    console.log('Scheduling message:', scheduleData);
    onSchedule(scheduleData);
  };

  const getRecommendedSession = () => {
    switch (sessionCriteria) {
      case 'least_used':
        return availableSessions.sort((a, b) => a.messages_sent - b.messages_sent)[0];
      case 'least_recent':
        return availableSessions.sort((a, b) => new Date(a.last_used) - new Date(b.last_used))[0];
      case 'random':
        return availableSessions[Math.floor(Math.random() * availableSessions.length)];
      default:
        return availableSessions[0];
    }
  };

  const isScheduleValid = () => {
    const scheduleDateTime = new Date(scheduledDate);
    const [hours, minutes] = scheduledTime.split(':');
    scheduleDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    return scheduleDateTime > new Date() && selectedRecipients.length > 0 && editedContent.trim();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] rounded-3xl p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <DialogHeader className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <div className="flex-1">
                <DialogTitle className="text-xl font-semibold text-gray-900">
                  Agendar Mensagem
                </DialogTitle>
                <DialogDescription className="text-gray-600 mt-1">
                  {isMassMessage ? 
                    `Agendar para ${message.recipients_count} destinatários` :
                    `Agendar para ${message.customer_name}`
                  }
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Content */}
          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            {/* Schedule Date & Time */}
            <Card className="rounded-2xl border-orange-200">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5" />
                  Data e Horário
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Data</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal rounded-xl mt-1"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(scheduledDate, 'PPP', { locale: ptBR })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 rounded-2xl" align="start">
                        <Calendar
                          mode="single"
                          selected={scheduledDate}
                          onSelect={setScheduledDate}
                          disabled={(date) => date <= new Date()}
                          initialFocus
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Horário</Label>
                    <Input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="rounded-xl mt-1"
                    />
                  </div>
                </div>

                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    <strong>Agendamento:</strong> {format(scheduledDate, 'dd/MM/yyyy', { locale: ptBR })} às {scheduledTime}
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Message Content */}
            <Card className="rounded-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Conteúdo da Mensagem
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                    className="rounded-xl"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    {isEditing ? 'Cancelar Edição' : 'Editar'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <Textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="min-h-32 rounded-xl"
                    placeholder="Digite o conteúdo da mensagem..."
                  />
                ) : (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                      {editedContent}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Session Selection */}
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Seleção de Sessão
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Escolher Sessão</Label>
                  <Select value={selectedSession} onValueChange={setSelectedSession}>
                    <SelectTrigger className="rounded-xl mt-1">
                      <SelectValue placeholder="Selecionar sessão" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="auto" className="rounded-xl">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>Automático</span>
                        </div>
                      </SelectItem>
                      {availableSessions.map((session) => (
                        <SelectItem key={session.id} value={session.id} className="rounded-xl">
                          <div className="flex items-center justify-between w-full">
                            <span>{session.name}</span>
                            <Badge variant="outline" className="ml-2 text-xs">
                              {session.messages_sent} enviadas
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedSession === 'auto' && (
                  <div>
                    <Label className="text-sm font-medium">Critério de Seleção</Label>
                    <Select value={sessionCriteria} onValueChange={setSessionCriteria}>
                      <SelectTrigger className="rounded-xl mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        {sessionCriteriaOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value} className="rounded-xl">
                            <div>
                              <div className="font-medium">{option.label}</div>
                              <div className="text-xs text-gray-500">{option.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Alert className="mt-3">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        <strong>Sessão Recomendada:</strong> {getRecommendedSession().name}
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recipients Selection */}
            <Card className="rounded-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="w-5 h-5" />
                    {isMassMessage ? 'Selecionar Destinatários' : 'Destinatário'}
                  </CardTitle>
                  {isMassMessage && (
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-500">
                        {selectedRecipients.length} de {message.recipients_count} selecionados
                      </span>
                      <Checkbox
                        id="select-all"
                        checked={selectedRecipients.length === (message.recipients?.length || 1)}
                        onCheckedChange={handleSelectAll}
                      />
                      <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                        Selecionar Todos
                      </label>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isMassMessage ? (
                  <div className="max-h-64 overflow-y-auto space-y-3">
                    {message.recipients?.slice(0, 100).map((recipient, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id={`recipient-${index}`}
                            checked={selectedRecipients.includes(`recipient_${index}`)}
                            onCheckedChange={(checked) => handleRecipientToggle(`recipient_${index}`, checked)}
                          />
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-500 text-white text-xs">
                              {recipient.name?.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{recipient.name}</p>
                            <p className="text-xs text-gray-500">{recipient.phone}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {recipient.tags && recipient.tags.length > 0 && (
                            <div className="flex gap-1">
                              {recipient.tags.slice(0, 2).map((tag, tagIndex) => (
                                <Badge key={tagIndex} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="bg-gradient-to-br from-orange-400 to-orange-500 text-white font-medium">
                        {message.customer_name?.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-gray-900">{message.customer_name}</p>
                      <p className="text-sm text-gray-500">{message.customer_phone}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cost Estimation */}
            <Card className="rounded-2xl border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Custo Estimado</p>
                    <p className="text-xs text-gray-500">
                      {selectedRecipients.length} {message.type === 'whatsapp' ? 'mensagens WhatsApp' : 
                       message.type === 'email' ? 'emails' : 'SMS'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-orange-600">
                      R$ {(selectedRecipients.length * (message.cost || 0.05)).toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-100">
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={onClose} className="rounded-2xl">
                Cancelar
              </Button>
              <Button
                onClick={handleSchedule}
                disabled={!isScheduleValid()}
                className="rounded-2xl bg-orange-600 hover:bg-orange-700"
              >
                <Clock className="w-4 h-4 mr-2" />
                Agendar {selectedRecipients.length > 0 && `(${selectedRecipients.length})`}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}