import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  X,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Users,
  MessageSquare,
  Calendar,
  Activity
} from "lucide-react";
import { format } from "date-fns";

export default function TemplateHistoryModal({ template, onClose }) {
  const [sendHistory, setSendHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("30d");

  useEffect(() => {
    loadSendHistory();
  }, [template, selectedPeriod]);

  const loadSendHistory = async () => {
    try {
      // Mock send history data - in real implementation, this would come from API
      const mockHistory = [
        {
          id: "1",
          contact_name: "João Silva",
          contact_phone: "+55 11 99999-1234",
          sent_date: "2024-01-15T10:30:00Z",
          status: "delivered",
          opened: true,
          clicked: false,
          replied: true,
          campaign_name: "Campanha Aniversário Janeiro"
        },
        {
          id: "2",
          contact_name: "Maria Santos",
          contact_phone: "+55 11 88888-5678",
          sent_date: "2024-01-14T15:45:00Z",
          status: "delivered",
          opened: true,
          clicked: true,
          replied: false,
          campaign_name: null
        },
        {
          id: "3",
          contact_name: "Carlos Oliveira",
          contact_phone: "+55 11 77777-9012",
          sent_date: "2024-01-13T09:20:00Z",
          status: "failed",
          opened: false,
          clicked: false,
          replied: false,
          campaign_name: "Campanha Aniversário Janeiro",
          error: "Número inválido"
        },
        {
          id: "4",
          contact_name: "Ana Costa",
          contact_phone: "+55 11 66666-3456",
          sent_date: "2024-01-12T14:15:00Z",
          status: "delivered",
          opened: true,
          clicked: false,
          replied: false,
          campaign_name: null
        }
      ];

      setSendHistory(mockHistory);
    } catch (error) {
      console.error("Error loading send history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'delivered':
        return <Badge className="bg-green-100 text-green-800 border-green-200 rounded-full text-xs">Entregue</Badge>;
      case 'sent':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200 rounded-full text-xs">Enviado</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 border-red-200 rounded-full text-xs">Falhou</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 rounded-full text-xs">Pendente</Badge>;
      default:
        return null;
    }
  };

  const getHistoryStats = () => {
    return {
      total: sendHistory.length,
      delivered: sendHistory.filter(h => h.status === 'delivered').length,
      opened: sendHistory.filter(h => h.opened).length,
      clicked: sendHistory.filter(h => h.clicked).length,
      replied: sendHistory.filter(h => h.replied).length,
      failed: sendHistory.filter(h => h.status === 'failed').length
    };
  };

  const stats = getHistoryStats();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl">
        <CardHeader className="border-b border-gray-200 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-semibold flex items-center gap-3">
                <Activity className="w-6 h-6 text-purple-600" />
                Histórico de Envios - {template.name}
              </CardTitle>
              <p className="text-gray-600 mt-1">
                Acompanhe o desempenho e engajamento do template
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
            <div className="text-center p-3 bg-blue-50 rounded-2xl">
              <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Send className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-lg font-bold text-blue-600">{stats.total}</p>
              <p className="text-xs text-blue-600">Total</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-2xl">
              <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              </div>
              <p className="text-lg font-bold text-green-600">{stats.delivered}</p>
              <p className="text-xs text-green-600">Entregues</p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-2xl">
              <div className="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Users className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-lg font-bold text-purple-600">{stats.opened}</p>
              <p className="text-xs text-purple-600">Abertos</p>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-2xl">
              <div className="w-8 h-8 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <TrendingUp className="w-4 h-4 text-orange-600" />
              </div>
              <p className="text-lg font-bold text-orange-600">{stats.clicked}</p>
              <p className="text-xs text-orange-600">Cliques</p>
            </div>
            <div className="text-center p-3 bg-cyan-50 rounded-2xl">
              <div className="w-8 h-8 bg-cyan-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <MessageSquare className="w-4 h-4 text-cyan-600" />
              </div>
              <p className="text-lg font-bold text-cyan-600">{stats.replied}</p>
              <p className="text-xs text-cyan-600">Respostas</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-2xl">
              <div className="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <XCircle className="w-4 h-4 text-red-600" />
              </div>
              <p className="text-lg font-bold text-red-600">{stats.failed}</p>
              <p className="text-xs text-red-600">Falhas</p>
            </div>
          </div>

          {/* Send History List */}
          <div className="space-y-4 max-h-96 overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Histórico de Envios
            </h3>
            
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading history...</p>
              </div>
            ) : sendHistory.length > 0 ? (
              <div className="space-y-3">
                {sendHistory.map((send) => (
                  <Card key={send.id} className="rounded-2xl border-gray-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-500 text-white text-sm font-medium">
                              {send.contact_name?.split(' ').map(n => n[0]).join('') || 'C'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-gray-900">{send.contact_name}</p>
                            <p className="text-sm text-gray-500">{send.contact_phone}</p>
                            {send.campaign_name && (
                              <p className="text-xs text-blue-600 bg-blue-50 rounded px-2 py-1 inline-block mt-1">
                                {send.campaign_name}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="flex items-center gap-2 mb-2">
                            {getStatusBadge(send.status)}
                            <p className="text-sm text-gray-500">
                              {format(new Date(send.sent_date), 'dd/MM/yyyy HH:mm')}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-3 text-xs">
                            {send.opened && (
                              <span className="text-purple-600 bg-purple-50 px-2 py-1 rounded">
                                Aberto
                              </span>
                            )}
                            {send.clicked && (
                              <span className="text-orange-600 bg-orange-50 px-2 py-1 rounded">
                                Clicou
                              </span>
                            )}
                            {send.replied && (
                              <span className="text-cyan-600 bg-cyan-50 px-2 py-1 rounded">
                                Respondeu
                              </span>
                            )}
                            {send.error && (
                              <span className="text-red-600 bg-red-50 px-2 py-1 rounded" title={send.error}>
                                Erro
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum envio encontrado</h3>
                <p className="text-gray-500">Este template ainda não foi usado em nenhuma campanha</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}