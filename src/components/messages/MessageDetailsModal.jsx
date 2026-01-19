import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  MessageSquare,
  Send,
  Zap,
  Phone,
  Video,
  Users,
  Calendar,
  User,
  Building2,
  Tag,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Target,
  Copy,
  ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function MessageDetailsModal({ message, onClose }) {
  const getTypeIcon = (type) => {
    switch (type) {
      case 'whatsapp': return MessageSquare;
      case 'email': return Send;
      case 'sms': return Zap;
      case 'voice_call': return Phone;
      case 'video_call': return Video;
      default: return MessageSquare;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'whatsapp': return 'text-green-600 bg-green-50';
      case 'email': return 'text-blue-600 bg-blue-50';
      case 'sms': return 'text-purple-600 bg-purple-50';
      case 'voice_call': return 'text-orange-600 bg-orange-50';
      case 'video_call': return 'text-indigo-600 bg-indigo-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Enviado</Badge>;
      case 'delivered':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Entregue</Badge>;
      case 'opened':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Aberto</Badge>;
      case 'clicked':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Clicado</Badge>;
      case 'replied':
        return <Badge className="bg-cyan-100 text-cyan-800 border-cyan-200">Respondido</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Falhou</Badge>;
      case 'completed':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Concluído</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Pendente</Badge>;
    }
  };

  const TypeIcon = getTypeIcon(message.type);
  const typeColor = getTypeColor(message.type);
  const isMassMessage = message.send_type === 'mass';

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] rounded-3xl p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <DialogHeader className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 ${typeColor} rounded-2xl flex items-center justify-center`}>
                <TypeIcon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <DialogTitle className="text-xl font-semibold text-gray-900">
                  {isMassMessage ? 'Detalhes do Envio em Massa' : 'Detalhes da Mensagem'}
                </DialogTitle>
                <DialogDescription className="text-gray-600 mt-1">
                  {isMassMessage ? 
                    `${message.recipients_count?.toLocaleString()} destinatários • ${format(new Date(message.sent_date), 'dd/MM/yyyy HH:mm')}` :
                    `Enviado para ${message.customer_name} • ${format(new Date(message.sent_date), 'dd/MM/yyyy HH:mm')}`
                  }
                </DialogDescription>
              </div>
              {getStatusBadge(message.status)}
            </div>
          </DialogHeader>

          {/* Content */}
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-6">
              {/* Message Content */}
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Conteúdo da Mensagem
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {message.subject && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Assunto:</label>
                      <div className="bg-gray-50 rounded-xl p-3 mt-1 flex items-center justify-between">
                        <span className="font-medium">{message.subject}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyToClipboard(message.subject)}
                          className="h-8 w-8"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Mensagem:</label>
                    <div className="bg-gray-50 rounded-xl p-4 mt-1 relative">
                      <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                        {message.content}
                      </pre>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyToClipboard(message.content)}
                        className="absolute top-2 right-2 h-8 w-8"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Message Info */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Info */}
                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Informações Básicas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tipo:</span>
                      <div className="flex items-center gap-2">
                        <TypeIcon className="w-4 h-4" />
                        <span className="capitalize">{message.type}</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-500">Enviado em:</span>
                      <span>{format(new Date(message.sent_date), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}</span>
                    </div>
                    
                    {message.delivered_date && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Entregue em:</span>
                        <span>{format(new Date(message.delivered_date), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}</span>
                      </div>
                    )}
                    
                    {message.opened_date && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Aberto em:</span>
                        <span>{format(new Date(message.opened_date), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between">
                      <span className="text-gray-500">Enviado por:</span>
                      <span className="font-medium">{message.user_name}</span>
                    </div>
                    
                    {message.campaign_name && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Campanha:</span>
                        <Badge variant="outline">{message.campaign_name}</Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Cost & Metrics */}
                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {isMassMessage ? <Target className="w-5 h-5" /> : <DollarSign className="w-5 h-5" />}
                      {isMassMessage ? 'Métricas de Envio' : 'Custo'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {isMassMessage ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Total Enviados:</span>
                          <span className="font-semibold">{message.recipients_count?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Entregues:</span>
                          <span className="font-semibold text-green-600">{message.delivered_count?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Abertos:</span>
                          <span className="font-semibold text-blue-600">{message.opened_count?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Cliques:</span>
                          <span className="font-semibold text-orange-600">{message.clicked_count?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Falhas:</span>
                          <span className="font-semibold text-red-600">{message.failed_count?.toLocaleString()}</span>
                        </div>
                        <hr className="my-3" />
                        <div className="flex justify-between">
                          <span className="text-gray-500">Custo Total:</span>
                          <span className="font-semibold text-lg">R$ {message.total_cost?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Taxa Entrega:</span>
                          <span className="font-semibold">
                            {((message.delivered_count / message.recipients_count) * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Taxa Abertura:</span>
                          <span className="font-semibold">
                            {((message.opened_count / message.recipients_count) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Custo:</span>
                        <span className="font-semibold text-lg">R$ {message.cost?.toFixed(3)}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Recipient Details */}
              {!isMassMessage ? (
                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Detalhes do Destinatário
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-500 text-white font-medium">
                          {message.customer_name?.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-gray-900">{message.customer_name}</p>
                        <p className="text-sm text-gray-500">{message.customer_phone}</p>
                        {message.customer_email && (
                          <p className="text-sm text-gray-500">{message.customer_email}</p>
                        )}
                      </div>
                    </div>
                    
                    {message.customer_tags && message.customer_tags.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 mb-2 block">Tags:</label>
                        <div className="flex flex-wrap gap-2">
                          {message.customer_tags.map((tag, index) => (
                            <Badge key={index} variant="outline" className="rounded-full">
                              <Tag className="w-3 h-3 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Destinatários ({message.recipients_count})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64">
                      <div className="space-y-3">
                        {message.recipients?.slice(0, 50).map((recipient, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-8 h-8">
                                <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-500 text-white text-xs">
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
                              {recipient.status === 'delivered' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                              {recipient.status === 'failed' && <XCircle className="w-4 h-4 text-red-500" />}
                              {recipient.status === 'opened' && <Eye className="w-4 h-4 text-blue-500" />}
                            </div>
                          </div>
                        ))}
                        {message.recipients_count > 50 && (
                          <div className="text-center py-4 text-gray-500">
                            <p className="text-sm">E mais {message.recipients_count - 50} destinatários...</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              {/* Error Details */}
              {message.status === 'failed' && message.error_reason && (
                <Card className="rounded-2xl border-red-200">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 text-red-700">
                      <XCircle className="w-5 h-5" />
                      Detalhes do Erro
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-red-50 rounded-xl p-4">
                      <p className="text-red-800">{message.error_reason}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="p-6 border-t border-gray-100">
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={onClose} className="rounded-2xl">
                Fechar
              </Button>
              <Button className="rounded-2xl bg-blue-600 hover:bg-blue-700">
                <ExternalLink className="w-4 h-4 mr-2" />
                Exportar Detalhes
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}