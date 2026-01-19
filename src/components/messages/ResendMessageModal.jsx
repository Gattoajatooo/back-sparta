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
import {
  Send,
  Users,
  MessageSquare,
  AlertTriangle,
  User,
  CheckCircle2,
  Edit
} from "lucide-react";

export default function ResendMessageModal({ message, onClose, onResend }) {
  const [editedContent, setEditedContent] = useState(message.content);
  const [selectedRecipients, setSelectedRecipients] = useState(
    message.send_type === 'mass' ? [] : [message.customer_id]
  );
  const [isEditing, setIsEditing] = useState(false);
  const [selectedSession, setSelectedSession] = useState('');

  const isMassMessage = message.send_type === 'mass';

  // Mock session data
  const availableSessions = [
    { id: 'session_1', name: 'WhatsApp Principal', status: 'active', messages_sent: 45 },
    { id: 'session_2', name: 'WhatsApp Suporte', status: 'active', messages_sent: 23 },
    { id: 'session_3', name: 'WhatsApp Vendas', status: 'active', messages_sent: 67 }
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

  const handleResend = () => {
    const resendData = {
      originalMessageId: message.id,
      content: editedContent,
      recipients: selectedRecipients,
      session: selectedSession,
      type: message.type
    };
    
    console.log('Resending message:', resendData);
    onResend(resendData);
  };

  const getRecommendedSession = () => {
    return availableSessions.sort((a, b) => a.messages_sent - b.messages_sent)[0];
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] rounded-3xl p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <DialogHeader className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                <Send className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <DialogTitle className="text-xl font-semibold text-gray-900">
                  Reenviar Mensagem
                </DialogTitle>
                <DialogDescription className="text-gray-600 mt-1">
                  {isMassMessage ? 
                    `Reenviar para ${message.recipients_count} destinatários` :
                    `Reenviar para ${message.customer_name}`
                  }
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Content */}
          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
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
                  Selecionar Sessão
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={selectedSession} onValueChange={setSelectedSession}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Escolher sessão para envio" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="auto" className="rounded-xl">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Automático (Recomendado)</span>
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

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    <strong>Recomendação:</strong> {getRecommendedSession().name} (menos utilizada)
                  </AlertDescription>
                </Alert>
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
                          {recipient.status === 'failed' && (
                            <Badge variant="outline" className="text-xs bg-red-50 text-red-600 border-red-200">
                              Falhou
                            </Badge>
                          )}
                          {recipient.status === 'delivered' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-500 text-white font-medium">
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
            <Card className="rounded-2xl border-blue-200">
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
                    <p className="text-lg font-semibold text-blue-600">
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
                onClick={handleResend}
                disabled={selectedRecipients.length === 0 || !editedContent.trim()}
                className="rounded-2xl bg-blue-600 hover:bg-blue-700"
              >
                <Send className="w-4 h-4 mr-2" />
                Reenviar {selectedRecipients.length > 0 && `(${selectedRecipients.length})`}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}