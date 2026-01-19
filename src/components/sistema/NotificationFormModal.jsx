import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { X, Bell, Loader2, AlertCircle, MessageSquare, Mail, Smartphone, Clock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { base44 } from "@/api/base44Client";

export default function NotificationFormModal({ open, onClose, notification, onSave, isSaving }) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'whatsapp',
    trigger: 'campaign_completed',
    content: '',
    variables: [],
    recipients: 'all_admins',
    specific_user_ids: [],
    is_active: true,
    delay_value: 0,
    delay_unit: 'minutes',
    session_id: '',
    template_id: ''
  });

  const [systemSessions, setSystemSessions] = useState([]);
  const [systemTemplates, setSystemTemplates] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  useEffect(() => {
    if (open) {
      loadSystemData();
    }
  }, [open]);

  const loadSystemData = async () => {
    setIsLoadingData(true);
    try {
      // Buscar todas as sessões e templates do sistema (independente de company_id)
      const [sessions, templates] = await Promise.all([
        base44.asServiceRole.entities.Session.filter({
          is_system_session: true
        }),
        base44.asServiceRole.entities.MessageTemplate.filter({
          is_system_template: true
        })
      ]);
      
      // Filtrar apenas sessões ativas (WORKING)
      const workingSessions = sessions.filter(s => s.status === 'WORKING');
      
      setSystemSessions(workingSessions);
      setSystemTemplates(templates);
      
      console.log(`[NotificationFormModal] Carregadas ${workingSessions.length} sessões do sistema e ${templates.length} templates do sistema`);
    } catch (error) {
      console.error("Erro ao carregar dados do sistema:", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (notification) {
      setFormData(notification);
    } else {
      setFormData({
        name: '',
        type: 'whatsapp',
        trigger: 'campaign_completed',
        content: '',
        variables: [],
        recipients: 'all_admins',
        specific_user_ids: [],
        is_active: true,
        delay_value: 0,
        delay_unit: 'minutes',
        session_id: '',
        template_id: ''
      });
    }
  }, [notification, open]);





  const triggerOptions = [
    { 
      value: 'campaign_completed', 
      label: 'Campanha Concluída', 
      vars: ['campaign_name', 'sent_count', 'failed_count', 'total_count'],
      delayType: 'after',
      delayLabel: 'Notificar após'
    },
    { 
      value: 'campaign_failed', 
      label: 'Campanha Falhou', 
      vars: ['campaign_name', 'error_message', 'failed_count'],
      delayType: 'after',
      delayLabel: 'Notificar após'
    },
    { 
      value: 'batch_approval_needed', 
      label: 'Aprovação Necessária', 
      vars: ['campaign_name', 'recipient_count', 'scheduled_date'],
      delayType: 'before',
      delayLabel: 'Notificar antes'
    },
    { 
      value: 'session_disconnected', 
      label: 'Sessão Desconectada', 
      vars: ['session_name', 'phone', 'disconnect_time'],
      delayType: 'immediate',
      delayLabel: 'Notificação imediata'
    },
    { 
      value: 'message_received', 
      label: 'Mensagem Recebida', 
      vars: ['contact_name', 'message_preview', 'phone'],
      delayType: 'immediate',
      delayLabel: 'Notificação imediata'
    },
    { 
      value: 'low_credits', 
      label: 'Créditos Baixos', 
      vars: ['credits_remaining', 'plan_name', 'threshold'],
      delayType: 'immediate',
      delayLabel: 'Notificação imediata'
    },
    { 
      value: 'plan_expiring', 
      label: 'Plano Expirando', 
      vars: ['days_remaining', 'plan_name', 'expiry_date'],
      delayType: 'before',
      delayLabel: 'Notificar antes (dias)'
    },
    { 
      value: 'invoice_due', 
      label: 'Vencimento de Boleto', 
      vars: ['invoice_number', 'amount', 'due_date', 'days_until_due'],
      delayType: 'before',
      delayLabel: 'Notificar antes (dias)'
    }
  ];

  const selectedTrigger = triggerOptions.find(t => t.value === formData.trigger);
  const showDelayField = selectedTrigger?.delayType === 'before' || selectedTrigger?.delayType === 'after';

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Converter delay para minutos
    let delay_minutes = 0;
    if (formData.delay_unit === 'minutes') {
      delay_minutes = formData.delay_value;
    } else if (formData.delay_unit === 'hours') {
      delay_minutes = formData.delay_value * 60;
    } else if (formData.delay_unit === 'days') {
      delay_minutes = formData.delay_value * 1440;
    }
    
    // Buscar variáveis do template selecionado
    const selectedTemplate = systemTemplates.find(t => t.id === formData.template_id);
    const templateVariables = selectedTemplate?.variables || [];
    
    onSave({
      ...formData,
      variables: templateVariables,
      delay_minutes
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl p-0 [&>button]:hidden">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-gray-900">
                  {notification ? 'Editar' : 'Nova'} Notificação do Sistema
                </DialogTitle>
                <p className="text-sm text-gray-600">
                  {notification ? 'Atualize as configurações da notificação' : 'Configure uma nova notificação automática'}
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
        </DialogHeader>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Notificação</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Notificação de Campanha Concluída"
              className="rounded-xl"
              required
            />
          </div>

          {/* Tipo e Trigger */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Canal</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="whatsapp" className="rounded-lg">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-green-600" />
                      WhatsApp
                    </div>
                  </SelectItem>
                  <SelectItem value="email" disabled className="rounded-lg opacity-50">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      Email (em breve)
                    </div>
                  </SelectItem>
                  <SelectItem value="sms" disabled className="rounded-lg opacity-50">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-gray-400" />
                      SMS (em breve)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Evento Disparador</Label>
              <Select
                value={formData.trigger}
                onValueChange={(value) => setFormData({ ...formData, trigger: value })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {triggerOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="rounded-lg">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tempo de Delay */}
          {showDelayField && (
            <div className="space-y-3 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-2xl border border-blue-200">
              <Label htmlFor="delay_value" className="flex items-center gap-2 text-base font-semibold">
                <Clock className="w-5 h-5 text-blue-600" />
                {selectedTrigger?.delayLabel}
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  id="delay_value"
                  type="number"
                  min="0"
                  value={formData.delay_value}
                  onChange={(e) => setFormData({ ...formData, delay_value: parseInt(e.target.value) || 0 })}
                  className="rounded-xl w-24 text-center text-lg font-semibold"
                />
                <Select
                  value={formData.delay_unit}
                  onValueChange={(value) => setFormData({ ...formData, delay_unit: value })}
                >
                  <SelectTrigger className="rounded-xl w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="minutes" className="rounded-lg">Minutos</SelectItem>
                    <SelectItem value="hours" className="rounded-lg">Horas</SelectItem>
                    <SelectItem value="days" className="rounded-lg">Dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-blue-100">
                <p className="text-sm text-blue-800 font-medium">
                  {selectedTrigger?.delayType === 'before' ? (
                    <>
                      📅 Notificação será enviada <strong>{formData.delay_value || 0} {
                        formData.delay_unit === 'minutes' ? 'minutos' :
                        formData.delay_unit === 'hours' ? 'horas' : 'dias'
                      }</strong> ANTES do evento
                    </>
                  ) : (
                    <>
                      ⏰ Notificação será enviada <strong>{formData.delay_value || 0} {
                        formData.delay_unit === 'minutes' ? 'minutos' :
                        formData.delay_unit === 'hours' ? 'horas' : 'dias'
                      }</strong> DEPOIS do evento
                    </>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Sessão do Sistema (WhatsApp) */}
          {formData.type === 'whatsapp' && (
            <div className="space-y-2">
              <Label>Sessão do Sistema *</Label>
              <Select
                value={formData.session_id}
                onValueChange={(value) => setFormData({ ...formData, session_id: value })}
                required
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Selecione uma sessão" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {isLoadingData ? (
                    <SelectItem value="loading" disabled className="rounded-lg">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Carregando sessões...
                      </div>
                    </SelectItem>
                  ) : systemSessions.length > 0 ? (
                    systemSessions.map((session) => (
                      <SelectItem key={session.id} value={session.id} className="rounded-lg">
                        {session.custom_name || session.session_name} - {session.phone}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled className="rounded-lg">
                      Nenhuma sessão do sistema encontrada
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {systemSessions.length === 0 && !isLoadingData && (
                <p className="text-xs text-red-600">Configure uma sessão como "Sessão do Sistema" primeiro</p>
              )}
            </div>
          )}

          {/* Template do Sistema */}
          {formData.type === 'whatsapp' && (
            <div className="space-y-2">
              <Label>Modelo do Sistema *</Label>
              <Select
                value={formData.template_id}
                onValueChange={(value) => setFormData({ ...formData, template_id: value })}
                required
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Selecione um modelo" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {isLoadingData ? (
                    <SelectItem value="loading" disabled className="rounded-lg">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Carregando modelos...
                      </div>
                    </SelectItem>
                  ) : systemTemplates.length > 0 ? (
                    systemTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id} className="rounded-lg">
                        {template.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled className="rounded-lg">
                      Nenhum modelo do sistema encontrado
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {systemTemplates.length === 0 && !isLoadingData && (
                <p className="text-xs text-red-600">Crie um modelo marcado como "Modelo do Sistema" primeiro</p>
              )}
              
              {/* Preview do conteúdo do template selecionado */}
              {formData.template_id && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <p className="text-xs font-medium text-gray-600 mb-2">Prévia do Modelo:</p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">
                    {systemTemplates.find(t => t.id === formData.template_id)?.content || 'Carregando...'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Destinatários */}
          <div className="space-y-2">
            <Label>Destinatários</Label>
            <Select
              value={formData.recipients}
              onValueChange={(value) => setFormData({ ...formData, recipients: value })}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all_admins" className="rounded-lg">
                  Todos os Administradores
                </SelectItem>
                <SelectItem value="company_owner" className="rounded-lg">
                  Proprietário da Empresa
                </SelectItem>
                <SelectItem value="specific_users" className="rounded-lg">
                  Usuários Específicos
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <Label htmlFor="is_active" className="font-medium">Notificação Ativa</Label>
              <p className="text-sm text-gray-600">Enviar notificações automaticamente quando o evento ocorrer</p>
            </div>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSaving || (formData.type === 'whatsapp' && (!formData.session_id || !formData.template_id))}
              className="bg-blue-600 hover:bg-blue-700 rounded-xl"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                notification ? 'Salvar Alterações' : 'Criar Notificação'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}