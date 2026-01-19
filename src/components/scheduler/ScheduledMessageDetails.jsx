import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Clock,
  Users,
  MessageSquare,
  Send,
  Zap,
  Calendar as CalendarIcon,
  Timer,
  Shield,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  Target,
  Shuffle
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ScheduledMessageDetails({ schedule, onClose }) {
  const getTypeIcon = (type) => {
    switch (type) {
      case 'whatsapp': return MessageSquare;
      case 'email': return Send;
      case 'sms': return Zap;
      default: return MessageSquare;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'sending': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRiskLevelColor = (level) => {
    switch (level) {
      case 'none': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const TypeIcon = getTypeIcon(schedule.type);
  const isIndividual = schedule.send_type === 'individual';

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] rounded-3xl p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <DialogHeader className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 ${isIndividual ? 'bg-indigo-100' : 'bg-gradient-to-br from-indigo-400 to-indigo-600'} rounded-2xl flex items-center justify-center relative`}>
                <TypeIcon className={`w-6 h-6 ${isIndividual ? 'text-indigo-600' : 'text-white'}`} />
                {!isIndividual && (
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                    <Users className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <DialogTitle className="text-xl font-semibold text-gray-900">
                  {schedule.name}
                </DialogTitle>
                <DialogDescription className="text-gray-600 mt-1">
                  {isIndividual ? `Mensagem individual para ${schedule.customer_name}` : `Envio em massa para ${schedule.recipients_count} contatos`}
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`rounded-full text-xs ${getStatusColor(schedule.status)}`}>
                  {schedule.status === 'scheduled' ? 'Agendado' : 
                   schedule.status === 'sending' ? 'Enviando' :
                   schedule.status === 'completed' ? 'Concluído' : 
                   schedule.status === 'failed' ? 'Falhou' : 
                   schedule.status}
                </Badge>
                {schedule.risk_level !== 'none' && (
                  <Badge variant="outline" className={`rounded-full text-xs ${getRiskLevelColor(schedule.risk_level)}`}>
                    <Shield className="w-3 h-3 mr-1" />
                    {schedule.risk_level === 'low' ? 'Baixo Risco' : 
                     schedule.risk_level === 'medium' ? 'Médio Risco' : 'Alto Risco'}
                  </Badge>
                )}
              </div>
            </div>
          </DialogHeader>

          {/* Content */}
          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Main Details */}
              <div className="lg:col-span-2 space-y-6">
                {/* Schedule Information */}
                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CalendarIcon className="w-5 h-5" />
                      Informações do Agendamento
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Data e Horário</p>
                        <p className="font-semibold text-gray-900">
                          {format(parseISO(schedule.scheduled_date), 'dd/MM/yyyy \'às\' HH:mm', { locale: ptBR })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Template</p>
                        <p className="font-semibold text-gray-900">{schedule.template_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Tipo de Envio</p>
                        <div className="flex items-center gap-2">
                          {isIndividual ? <User className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                          <span className="font-semibold text-gray-900">
                            {isIndividual ? 'Individual' : 'Em Massa'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Duração Estimada</p>
                        <p className="font-semibold text-gray-900">{schedule.estimated_duration}</p>
                      </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Criado por</p>
                        <p className="font-semibold text-gray-900">{schedule.created_by}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Criado em</p>
                        <p className="font-semibold text-gray-900">
                          {format(parseISO(schedule.created_date), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Timing Configuration */}
                {schedule.delay_type !== 'none' && (
                  <Card className="rounded-2xl">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Timer className="w-5 h-5" />
                        Configuração de Timing
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-2">
                        {schedule.delay_type === 'random' ? <Shuffle className="w-4 h-4" /> : <Timer className="w-4 h-4" />}
                        <span className="font-medium">
                          {schedule.delay_type === 'random' ? 'Intervalo Aleatório' :
                           schedule.delay_type === 'fixed' ? 'Intervalo Fixo' : 'Sem Intervalo'}
                        </span>
                      </div>
                      
                      {schedule.delay_type === 'fixed' && (
                        <p className="text-sm text-gray-600">
                          Intervalo fixo de <strong>{schedule.delay_min}s</strong> entre cada mensagem
                        </p>
                      )}
                      
                      {schedule.delay_type === 'random' && (
                        <p className="text-sm text-gray-600">
                          Intervalo aleatório entre <strong>{schedule.delay_min}s</strong> e <strong>{schedule.delay_max}s</strong> entre cada mensagem
                        </p>
                      )}

                      {schedule.risk_level !== 'none' && (
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <div className="flex items-center gap-2 mb-2">
                            <Shield className="w-4 h-4 text-gray-600" />
                            <span className="font-medium text-sm">Avaliação de Risco</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Progress value={
                              schedule.risk_level === 'low' ? 25 :
                              schedule.risk_level === 'medium' ? 50 :
                              schedule.risk_level === 'high' ? 80 : 0
                            } className="flex-1 h-2" />
                            <Badge className={`${getRiskLevelColor(schedule.risk_level)} border-0 text-xs`}>
                              {schedule.risk_level === 'low' ? 'Baixo' :
                               schedule.risk_level === 'medium' ? 'Médio' : 'Alto'}
                            </Badge>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Message Content */}
                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      Conteúdo da Mensagem
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                        {schedule.content_preview}
                      </pre>
                    </div>
                  </CardContent>
                </Card>

                {/* Recipients */}
                {!isIndividual && schedule.recipients && (
                  <Card className="rounded-2xl">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Destinatários ({schedule.recipients_count})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {schedule.recipients.slice(0, 20).map((recipient, index) => (
                          <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-indigo-500 text-white text-xs">
                                {recipient.name?.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{recipient.name}</p>
                              <p className="text-xs text-gray-500">{recipient.phone}</p>
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
                              {recipient.status && (
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                              )}
                            </div>
                          </div>
                        ))}
                        {schedule.recipients.length > 20 && (
                          <div className="text-center py-2 text-sm text-gray-500">
                            ... e mais {schedule.recipients.length - 20} destinatários
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Stats Sidebar */}
              <div className="space-y-6">
                {/* Quick Stats */}
                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-lg">Estatísticas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-blue-50 rounded-xl">
                        <p className="text-lg font-bold text-blue-600">{schedule.recipients_count}</p>
                        <p className="text-xs text-blue-600">Destinatários</p>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-xl">
                        <p className="text-lg font-bold text-purple-600">{schedule.estimated_duration}</p>
                        <p className="text-xs text-purple-600">Duração</p>
                      </div>
                    </div>

                    {schedule.status === 'completed' && (
                      <>
                        <Separator />
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Entregues:</span>
                            <span className="font-semibold text-green-600">{schedule.delivered_count || 0}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Abertos:</span>
                            <span className="font-semibold text-purple-600">{schedule.opened_count || 0}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Clicados:</span>
                            <span className="font-semibold text-orange-600">{schedule.clicked_count || 0}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Falharam:</span>
                            <span className="font-semibold text-red-600">{schedule.failed_count || 0}</span>
                          </div>
                        </div>
                      </>
                    )}

                    <Separator />

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Custo Total:</span>
                      <span className="font-semibold text-gray-900">R$ {schedule.total_cost?.toFixed(2) || '0.00'}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Individual Contact Info */}
                {isIndividual && (
                  <Card className="rounded-2xl">
                    <CardHeader>
                      <CardTitle className="text-lg">Destinatário</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-indigo-500 text-white font-medium">
                            {schedule.customer_name?.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-gray-900">{schedule.customer_name}</p>
                          <p className="text-sm text-gray-500">{schedule.customer_phone}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Actions */}
                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-lg">Ações</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {schedule.status === 'scheduled' && (
                      <>
                        <Button className="w-full rounded-2xl bg-indigo-600 hover:bg-indigo-700">
                          <Clock className="w-4 h-4 mr-2" />
                          Editar Agendamento
                        </Button>
                        <Button variant="outline" className="w-full rounded-2xl">
                          <XCircle className="w-4 h-4 mr-2" />
                          Cancelar Agendamento
                        </Button>
                      </>
                    )}
                    
                    <Button variant="outline" className="w-full rounded-2xl">
                      <Activity className="w-4 h-4 mr-2" />
                      Ver Histórico Completo
                    </Button>
                    
                    {schedule.status === 'completed' && (
                      <Button variant="outline" className="w-full rounded-2xl">
                        <Send className="w-4 h-4 mr-2" />
                        Reenviar Mensagem
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-100">
            <div className="flex justify-end">
              <Button variant="outline" onClick={onClose} className="rounded-2xl">
                Fechar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}