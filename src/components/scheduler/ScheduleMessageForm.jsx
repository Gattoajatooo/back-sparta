
import React, { useState, useEffect } from 'react';
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
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,  SelectItem,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Clock,
  Users,
  MessageSquare,
  AlertTriangle,
  User,
  CheckCircle2,
  Calendar as CalendarIcon,
  Timer,
  Shield,
  Shuffle,
  Target,
  Zap,
  Send
} from "lucide-react";
import { format, addMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ScheduleMessageForm({ schedule, templates, contacts, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    name: schedule?.name || '',
    template_id: schedule?.template_id || '',
    send_type: schedule?.send_type || 'individual',
    scheduled_date: schedule?.scheduled_date ? new Date(schedule.scheduled_date) : new Date(),
    scheduled_time: schedule?.scheduled_date ? format(new Date(schedule.scheduled_date), 'HH:mm') : '10:00',
    recipients: schedule?.recipients || [],
    selected_contacts: schedule?.selected_contacts || [],
    delay_type: schedule?.delay_type || 'none',
    delay_fixed: schedule?.delay_fixed || 10,
    delay_min: schedule?.delay_min || 5,
    delay_max: schedule?.delay_max || 30,
    session_selection: schedule?.session_selection || 'auto',
    session_criteria: schedule?.session_criteria || 'least_used'
  });

  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [riskAssessment, setRiskAssessment] = useState({ level: 'none', score: 0 });
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [totalCost, setTotalCost] = useState(0);

  // Mock sessions data
  const availableSessions = [
    { id: 'session_1', name: 'WhatsApp Principal', status: 'active', messages_sent: 245, last_used: '2024-01-15T10:30:00Z' },
    { id: 'session_2', name: 'WhatsApp Suporte', status: 'active', messages_sent: 123, last_used: '2024-01-15T09:15:00Z' },
    { id: 'session_3', name: 'WhatsApp Vendas', status: 'active', messages_sent: 67, last_used: '2024-01-15T14:20:00Z' }
  ];

  const sessionCriteriaOptions = [
    { value: 'least_used', label: 'Menos Utilizada', description: 'Sessão com menor número de mensagens enviadas' },
    { value: 'random', label: 'Aleatória', description: 'Escolha aleatória entre sessões ativas' },
    { value: 'round_robin', label: 'Rodízio', description: 'Alternância entre sessões de forma equilibrada' },
    { value: 'least_recent', label: 'Menos Recente', description: 'Sessão que foi usada há mais tempo' }
  ];

  useEffect(() => {
    if (formData.template_id) {
      const template = templates.find(t => t.id === formData.template_id);
      setSelectedTemplate(template);
    }
  }, [formData.template_id, templates]);

  useEffect(() => {
    calculateRiskAndDuration();
    calculateCost();
  }, [formData.selected_contacts, formData.delay_type, formData.delay_fixed, formData.delay_min, formData.delay_max, selectedTemplate]); // Added selectedTemplate to dependencies

  const calculateRiskAndDuration = () => {
    const recipientCount = formData.selected_contacts.length;
    if (recipientCount === 0) {
      setRiskAssessment({ level: 'none', score: 0 });
      setEstimatedDuration('');
      return;
    }

    let riskScore = 0;
    let avgDelay = 0;

    // Calculate risk based on recipient count
    if (recipientCount > 1000) riskScore += 60;
    else if (recipientCount > 500) riskScore += 40;
    else if (recipientCount > 100) riskScore += 20;
    else if (recipientCount > 50) riskScore += 10;

    // Calculate risk and duration based on delay type
    if (formData.delay_type === 'none') {
      riskScore += 50; // High risk for no delay
      avgDelay = 0;
    } else if (formData.delay_type === 'fixed') {
      if (formData.delay_fixed < 5) riskScore += 30;
      else if (formData.delay_fixed < 10) riskScore += 15;
      else if (formData.delay_fixed < 20) riskScore += 5;
      avgDelay = formData.delay_fixed;
    } else if (formData.delay_type === 'random') {
      const avgRandomDelay = (formData.delay_min + formData.delay_max) / 2;
      if (avgRandomDelay < 10) riskScore += 20;
      else if (avgRandomDelay < 20) riskScore += 10;
      else if (avgRandomDelay < 30) riskScore += 5;
      avgDelay = avgRandomDelay;
    }

    // Determine risk level
    let riskLevel = 'none';
    if (riskScore >= 70) riskLevel = 'high';
    else if (riskScore >= 40) riskLevel = 'medium';
    else if (riskScore >= 20) riskLevel = 'low';

    setRiskAssessment({ level: riskLevel, score: riskScore });

    // Calculate estimated duration
    if (recipientCount > 0 && avgDelay > 0) { // Changed condition to recipientCount > 0
      const totalSeconds = recipientCount * avgDelay;
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      
      if (hours > 0) {
        setEstimatedDuration(`${hours}h ${minutes}min`);
      } else if (minutes > 0) { // Added else if for minutes only
        setEstimatedDuration(`${minutes}min`);
      } else { // Handle cases where total duration is very small
        setEstimatedDuration(`${Math.ceil(totalSeconds)}s`);
      }
    } else {
      setEstimatedDuration('Instantâneo');
    }
  };

  const calculateCost = () => {
    const recipientCount = formData.selected_contacts.length;
    const costPerMessage = selectedTemplate?.type === 'whatsapp' ? 0.05 : 
                          selectedTemplate?.type === 'sms' ? 0.10 : 0.02;
    setTotalCost(recipientCount * costPerMessage);
  };

  const handleContactSelection = (contactId, checked) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        selected_contacts: [...prev.selected_contacts, contactId]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        selected_contacts: prev.selected_contacts.filter(id => id !== contactId)
      }));
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        selected_contacts: contacts.map(c => c.id)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        selected_contacts: []
      }));
    }
  };

  const handleSubmit = () => {
    const scheduleDateTime = new Date(formData.scheduled_date);
    const [hours, minutes] = formData.scheduled_time.split(':');
    scheduleDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    const scheduleData = {
      ...formData,
      scheduled_date: scheduleDateTime.toISOString(),
      risk_level: riskAssessment.level,
      estimated_duration: estimatedDuration,
      total_cost: totalCost,
      recipients_count: formData.selected_contacts.length
    };
    
    onSubmit(scheduleData);
  };

  const getRiskLevelColor = (level) => {
    switch (level) {
      case 'none': return 'text-gray-600 bg-gray-100';
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRiskMessage = () => {
    switch (riskAssessment.level) {
      case 'low':
        return 'Risco baixo de banimento. Configuração segura para envio.';
      case 'medium':
        return 'Risco moderado. Considere aumentar os intervalos entre mensagens.';
      case 'high':
        return 'Risco alto de banimento! Recomendamos reduzir a quantidade ou aumentar significativamente os intervalos.';
      default:
        return 'Sem risco identificado.';
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] rounded-3xl p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <DialogHeader className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="flex-1">
                <DialogTitle className="text-xl font-semibold text-gray-900">
                  {schedule ? 'Editar Agendamento' : 'Agendar Nova Mensagem'}
                </DialogTitle>
                <DialogDescription className="text-gray-600 mt-1">
                  Configure os detalhes do envio com controle inteligente de timing
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Content */}
          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Main Form */}
              <div className="lg:col-span-2 space-y-6">
                {/* Basic Information */}
                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-lg">Informações Básicas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Nome do Agendamento</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Ex: Campanha Black Friday"
                        className="rounded-xl mt-1"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Template</Label>
                        <Select 
                          value={formData.template_id} 
                          onValueChange={(value) => setFormData(prev => ({ ...prev, template_id: value }))}
                        >
                          <SelectTrigger className="rounded-xl mt-1">
                            <SelectValue placeholder="Selecionar template" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl">
                            {templates.map((template) => (
                              <SelectItem key={template.id} value={template.id} className="rounded-xl">
                                <div className="flex items-center gap-2">
                                  {template.type === 'whatsapp' && <MessageSquare className="w-4 h-4 text-green-600" />}
                                  {template.type === 'email' && <Send className="w-4 h-4 text-blue-600" />}
                                  {template.type === 'sms' && <Zap className="w-4 h-4 text-purple-600" />}
                                  <span>{template.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-sm font-medium">Tipo de Envio</Label>
                        <Select 
                          value={formData.send_type} 
                          onValueChange={(value) => setFormData(prev => ({ ...prev, send_type: value }))}
                        >
                          <SelectTrigger className="rounded-xl mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl">
                            <SelectItem value="individual" className="rounded-xl">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4" />
                                <span>Individual</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="mass" className="rounded-xl">
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                <span>Em Massa</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Date and Time */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Data</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal rounded-xl mt-1"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {format(formData.scheduled_date, 'PPP', { locale: ptBR })}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 rounded-2xl" align="start">
                            <Calendar
                              mode="single"
                              selected={formData.scheduled_date}
                              onSelect={(date) => setFormData(prev => ({ ...prev, scheduled_date: date }))}
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
                          value={formData.scheduled_time}
                          onChange={(e) => setFormData(prev => ({ ...prev, scheduled_time: e.target.value }))}
                          className="rounded-xl mt-1"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Recipients Selection */}
                <Card className="rounded-2xl">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Destinatários</CardTitle>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500">
                          {formData.selected_contacts.length} de {contacts.length} selecionados
                        </span>
                        <Checkbox
                          id="select-all"
                          checked={formData.selected_contacts.length === contacts.length}
                          onCheckedChange={handleSelectAll}
                        />
                        <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                          Selecionar Todos
                        </label>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-64 overflow-y-auto space-y-3">
                      {contacts.slice(0, 50).map((contact) => (
                        <div key={contact.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              id={`contact-${contact.id}`}
                              checked={formData.selected_contacts.includes(contact.id)}
                              onCheckedChange={(checked) => handleContactSelection(contact.id, checked)}
                            />
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-indigo-500 text-white text-xs">
                                {contact.first_name?.[0]}{contact.last_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{contact.first_name} {contact.last_name}</p>
                              <p className="text-xs text-gray-500">{contact.phone}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {contact.tags && contact.tags.length > 0 && (
                              <div className="flex gap-1">
                                {contact.tags.slice(0, 2).map((tag, tagIndex) => (
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
                  </CardContent>
                </Card>

                {/* Timing Configuration */}
                <Card className="rounded-2xl border-orange-200">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Timer className="w-5 h-5" />
                      Configuração de Timing
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Tipo de Intervalo</Label>
                      <Select 
                        value={formData.delay_type} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, delay_type: value }))}
                      >
                        <SelectTrigger className="rounded-xl mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
                          <SelectItem value="none" className="rounded-xl">
                            <div className="flex items-center gap-2">
                              <Zap className="w-4 h-4" />
                              <span>Sem Intervalo (Risco Alto)</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="fixed" className="rounded-xl">
                            <div className="flex items-center gap-2">
                              <Timer className="w-4 h-4" />
                              <span>Intervalo Fixo</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="random" className="rounded-xl">
                            <div className="flex items-center gap-2">
                              <Shuffle className="w-4 h-4" />
                              <span>Intervalo Aleatório (Recomendado)</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.delay_type === 'fixed' && (
                      <div>
                        <Label className="text-sm font-medium">Intervalo Fixo (segundos)</Label>
                        <div className="mt-2">
                          <Slider
                            value={[formData.delay_fixed]}
                            onValueChange={([value]) => setFormData(prev => ({ ...prev, delay_fixed: value }))}
                            max={120}
                            min={1}
                            step={1}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>1s</span>
                            <span className="font-medium">{formData.delay_fixed}s</span>
                            <span>120s</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {formData.delay_type === 'random' && (
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium">Intervalo Mínimo (segundos)</Label>
                          <div className="mt-2">
                            <Slider
                              value={[formData.delay_min]}
                              onValueChange={([value]) => setFormData(prev => ({ ...prev, delay_min: Math.min(value, prev.delay_max - 1) }))}
                              max={119}
                              min={1}
                              step={1}
                              className="w-full"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                              <span>1s</span>
                              <span className="font-medium">{formData.delay_min}s</span>
                              <span>119s</span>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium">Intervalo Máximo (segundos)</Label>
                          <div className="mt-2">
                            <Slider
                              value={[formData.delay_max]}
                              onValueChange={([value]) => setFormData(prev => ({ ...prev, delay_max: Math.max(value, prev.delay_min + 1) }))}
                              max={120}
                              min={2}
                              step={1}
                              className="w-full"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                              <span>2s</span>
                              <span className="font-medium">{formData.delay_max}s</span>
                              <span>120s</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Risk Assessment */}
                    <Alert className={`${
                      riskAssessment.level === 'high' ? 'border-red-200 bg-red-50' :
                      riskAssessment.level === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                      riskAssessment.level === 'low' ? 'border-green-200 bg-green-50' :
                      'border-gray-200 bg-gray-50'
                    }`}>
                      <div className="flex items-center gap-2">
                        <Shield className={`h-4 w-4 ${getRiskLevelColor(riskAssessment.level).split(' ')[0]}`} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">Avaliação de Risco</span>
                            <Badge className={`${getRiskLevelColor(riskAssessment.level)} border-0 rounded-full text-xs`}>
                              {riskAssessment.level === 'none' ? 'Sem Risco' :
                               riskAssessment.level === 'low' ? 'Risco Baixo' :
                               riskAssessment.level === 'medium' ? 'Risco Médio' :
                               'Risco Alto'}
                            </Badge>
                          </div>
                          <Progress 
                            value={Math.min(riskAssessment.score, 100)} 
                            className={`h-2 ${
                              riskAssessment.level === 'high' ? '[&_div]:bg-red-500' :
                              riskAssessment.level === 'medium' ? '[&_div]:bg-yellow-500' :
                              riskAssessment.level === 'low' ? '[&_div]:bg-green-500' :
                              '[&_div]:bg-gray-500'
                            }`}
                          />
                          <AlertDescription className="text-xs mt-2">
                            {getRiskMessage()}
                          </AlertDescription>
                        </div>
                      </div>
                    </Alert>
                  </CardContent>
                </Card>

                {/* Session Configuration */}
                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-lg">Configuração de Sessão</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Seleção de Sessão</Label>
                      <Select 
                        value={formData.session_selection} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, session_selection: value }))}
                      >
                        <SelectTrigger className="rounded-xl mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
                          <SelectItem value="auto" className="rounded-xl">
                            <div className="flex items-center gap-2">
                              <Target className="w-4 h-4 text-green-600" />
                              <span>Automática</span>
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

                    {formData.session_selection === 'auto' && (
                      <div>
                        <Label className="text-sm font-medium">Critério de Seleção</Label>
                        <Select 
                          value={formData.session_criteria} 
                          onValueChange={(value) => setFormData(prev => ({ ...prev, session_criteria: value }))}
                        >
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
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Summary Sidebar */}
              <div className="space-y-6">
                {/* Schedule Summary */}
                <Card className="rounded-2xl border-indigo-200">
                  <CardHeader>
                    <CardTitle className="text-lg">Resumo do Agendamento</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Destinatários:</span>
                        <span className="font-semibold">{formData.selected_contacts.length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Duração Est.:</span>
                        <span className="font-semibold">{estimatedDuration}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Custo Est.:</span>
                        <span className="font-semibold">R$ {totalCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tipo:</span>
                        <Badge variant="outline" className="text-xs">
                          {formData.send_type === 'mass' ? 'Em Massa' : 'Individual'}
                        </Badge>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-1">Agendado para:</p>
                      <p className="font-semibold text-indigo-600">
                        {format(formData.scheduled_date, 'dd/MM/yyyy', { locale: ptBR })} às {formData.scheduled_time}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Template Preview */}
                {selectedTemplate && (
                  <Card className="rounded-2xl">
                    <CardHeader>
                      <CardTitle className="text-lg">Preview do Template</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          {selectedTemplate.type === 'whatsapp' && <MessageSquare className="w-4 h-4 text-green-600" />}
                          {selectedTemplate.type === 'email' && <Send className="w-4 h-4 text-blue-600" />}
                          {selectedTemplate.type === 'sms' && <Zap className="w-4 h-4 text-purple-600" />}
                          <span className="text-sm font-medium">{selectedTemplate.name}</span>
                        </div>
                        <p className="text-sm text-gray-700 line-clamp-4">
                          {selectedTemplate.content || "Conteúdo do template será exibido aqui..."}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Safety Tips */}
                <Alert className="border-blue-200 bg-blue-50">
                  <AlertTriangle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-sm text-blue-800">
                    <strong>Dicas de Segurança:</strong>
                    <ul className="mt-2 space-y-1 text-xs">
                      <li>• Use intervalos aleatórios para envios em massa</li>
                      <li>• Evite mais de 100 mensagens por hora</li>
                      <li>• Intervalos de 10-60s reduzem riscos</li>
                      <li>• Monitore a taxa de entrega constantemente</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-100">
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={onClose} className="rounded-2xl">
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!formData.name || !formData.template_id || formData.selected_contacts.length === 0}
                className="rounded-2xl bg-indigo-600 hover:bg-indigo-700"
              >
                <Clock className="w-4 h-4 mr-2" />
                {schedule ? 'Atualizar Agendamento' : 'Agendar Envio'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
