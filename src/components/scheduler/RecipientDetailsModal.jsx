import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  User,
  Phone,
  Mail,
  Calendar,
  Clock,
  Info,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  MessageSquare,
  Hash,
  X,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';

export default function RecipientDetailsModal({ details, isOpen, onClose }) {
  if (!details) return null;

  const { recipient, contact, message, sessionDisplayName } = details;

  const getStatusInfo = (status) => {
    switch (status) {
      case 'sent':
      case 'delivered':
      case 'success':
        return { text: 'Enviado', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2 };
      case 'pending':
        return { text: 'Pendente', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock };
      case 'failed':
      case 'error':
        return { text: 'Falhou', color: 'bg-red-100 text-red-800 border-red-200', icon: AlertCircle };
      default:
        return { text: status || 'Desconhecido', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: Info };
    }
  };

  const statusInfo = getStatusInfo(message?.status || recipient?.status);
  const StatusIcon = statusInfo.icon;
  
  const formatPhoneNumber = (phone) => {
    if (!phone) return 'N/A';
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 13 && cleanPhone.startsWith('55')) {
      return `+${cleanPhone.slice(0, 2)} (${cleanPhone.slice(2, 4)}) ${cleanPhone.slice(4, 9)}-${cleanPhone.slice(9)}`;
    }
    return `+${cleanPhone}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-2xl max-h-[95vh] flex flex-col p-0 overflow-hidden rounded-[2.5rem] [&>button]:hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Detalhes do Destinatário</h2>
                <p className="text-sm text-gray-600">Informações de envio e contato</p>
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
        
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6"
          style={{ 
            maxHeight: 'calc(95vh - 200px)',
            minHeight: '300px'
          }}
        >
            <Card className="rounded-2xl border-gray-200">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Info className="w-5 h-5 text-blue-600" />
                        Informações do Contato
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                            <User className="w-5 h-5 text-gray-500" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Nome</p>
                            <p className="font-semibold text-gray-800">{contact?.first_name} {contact?.last_name}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                            <Phone className="w-5 h-5 text-gray-500" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Telefone</p>
                            <p className="font-semibold text-gray-800">{formatPhoneNumber(contact?.phone)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                            <Mail className="w-5 h-5 text-gray-500" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Email</p>
                            <p className="font-semibold text-gray-800">{contact?.email || 'N/A'}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="rounded-2xl border-gray-200">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <MessageSquare className="w-5 h-5 text-green-600" />
                        Detalhes do Envio
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-gray-500" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Data de Envio</p>
                            <p className="font-semibold text-gray-800">{message?.run_at ? format(new Date(message.run_at), 'dd/MM/yyyy HH:mm:ss') : 'Pendente'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                            <StatusIcon className="w-5 h-5 text-gray-500" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Status</p>
                            <Badge className={`text-xs ${statusInfo.color}`}>{statusInfo.text}</Badge>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                            <Smartphone className="w-5 h-5 text-gray-500" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">Sessão Utilizada</p>
                            <p className="font-semibold text-gray-800">{sessionDisplayName || message?.session_name || 'N/A'}</p>
                        </div>
                    </div>
                    {message?.content && (
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                                <FileText className="w-5 h-5 text-gray-500" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-gray-500 mb-2">Conteúdo da Mensagem</p>
                                <div className="p-3 bg-gray-50 rounded-xl text-gray-700 text-sm border border-gray-200">
                                    <p className="whitespace-pre-wrap">{message.content}</p>
                                </div>
                            </div>
                        </div>
                    )}
                    {message?.error_details && (
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                                <AlertCircle className="w-5 h-5 text-red-500" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-gray-500 mb-1">Detalhes do Erro</p>
                                <p className="text-red-700 text-sm">{message.error_details}</p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
        
        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 bg-gray-50 border-t border-gray-200">
          <Button variant="outline" onClick={onClose} className="rounded-xl">Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}