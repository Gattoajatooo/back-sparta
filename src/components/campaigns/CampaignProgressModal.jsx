import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  X,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Zap,
  Loader2,
  StopCircle,
  Calendar,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import { cancelBatchMessages } from "@/functions/cancelBatchMessages";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function CampaignProgressModal({ isOpen, onClose, campaignData }) {
  const navigate = useNavigate();
  const [isCancelling, setIsCancelling] = useState(false);

  const progress = campaignData.total > 0
    ? Math.round((campaignData.sent / campaignData.total) * 100)
    : 0;

  const successRate = (campaignData.sent + campaignData.failed) > 0
    ? Math.round((campaignData.sent / (campaignData.sent + campaignData.failed)) * 100)
    : 0;

  const isCompleted = (campaignData.sent + campaignData.failed) >= campaignData.total && campaignData.total > 0;

  const handleCancel = async () => {
    const confirmMessage = `⚠️ TEM CERTEZA QUE DESEJA CANCELAR?\n\nCampanha: "${campaignData.schedule_name}"\nPendentes: ${campaignData.pending} mensagens\n\n🚫 Esta ação NÃO pode ser desfeita!`;

    if (!window.confirm(confirmMessage)) return;

    setIsCancelling(true);

    try {
      console.log('[CampaignProgressModal] 🛑 Cancelando campanha:', campaignData.schedule_id);

      const response = await cancelBatchMessages({
        schedule_id: campaignData.schedule_id
      });

      if (response.data?.success) {
        console.log('[CampaignProgressModal] ✅ Campanha cancelada');

        localStorage.removeItem('campaignProgress');

        window.dispatchEvent(new CustomEvent('campaignProgressUpdate', {
          detail: {
            isProcessing: false,
            schedule_id: null,
            schedule_name: null,
            is_dynamic: false,
            total: 0,
            sent: 0,
            failed: 0,
            pending: 0,
            recent_messages: []
          }
        }));

        // ✅ NÃO FECHA MAIS AUTOMATICAMENTE - só limpa o estado
      } else {
        alert(`❌ Erro ao cancelar: ${response.data?.error || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('[CampaignProgressModal] Erro:', error);
      alert(`❌ Erro ao cancelar: ${error.message}`);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleViewDetails = () => {
    navigate(createPageUrl("Campaign"));
    setTimeout(() => {
      if (campaignData.schedule_id) {
        window.dispatchEvent(new CustomEvent('openScheduleDetailsModal', {
          detail: { scheduleId: campaignData.schedule_id }
        }));
      }
    }, 300);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] flex flex-col p-0 bg-white shadow-2xl [&>button]:hidden"
        style={{ 
          borderRadius: '1.5rem',
          border: '3px solid #F57C00'
        }}
      >
        {/* Header Clean */}
        <div className="relative p-6 border-b border-gray-100">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>

          <div className="flex items-start gap-4 pr-12">
            <div className="relative w-12 h-12 rounded-2xl bg-white border-2 border-gray-200 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-gray-700" />
              {campaignData.is_dynamic && (
                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-md border border-gray-200">
                  <Zap className="w-3 h-3 text-gray-600" />
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 text-lg mb-1 truncate">
                {campaignData.schedule_name}
              </h3>
              <div className="flex items-center gap-2">
                <Badge className={`text-xs rounded-full border ${
                  isCompleted 
                    ? 'bg-gray-100 text-gray-800 border-gray-200' 
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  {isCompleted ? 'Concluída' : 'Enviando'}
                </Badge>
                <span className="text-sm text-gray-500">
                  {campaignData.sent + campaignData.failed} de {campaignData.total}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-6">
            {/* Progress Bar Minimalista */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">Progresso Geral</span>
                <span className="text-3xl font-bold text-gray-900">{progress}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div
                  className="h-3 rounded-full bg-gray-900 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Stats Grid Clean */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-gray-600" />
                  <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Enviadas</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{campaignData.sent}</p>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-4 h-4 text-gray-600" />
                  <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Falhas</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{campaignData.failed}</p>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-gray-600" />
                  <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Pendentes</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{campaignData.pending}</p>
              </div>
            </div>

            {/* Taxa de Sucesso */}
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">Taxa de Sucesso</span>
                <span className="text-2xl font-bold text-gray-900">{successRate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-gray-900 transition-all duration-500"
                  style={{ width: `${successRate}%` }}
                />
              </div>
            </div>

            {/* Recent Messages Clean */}
            {campaignData.recent_messages && campaignData.recent_messages.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-600" />
                  Últimas Atualizações
                </h4>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {campaignData.recent_messages.slice(0, 15).map((msg, index) => {
                      const isSuccess = msg.status === 'success';

                      return (
                        <div
                          key={`${msg.message_id}-${index}`}
                          className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-200 hover:border-gray-300 transition-colors"
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isSuccess ? 'bg-gray-900' : 'bg-gray-200'
                          }`}>
                            {isSuccess ? (
                              <CheckCircle2 className="w-4 h-4 text-white" />
                            ) : (
                              <XCircle className="w-4 h-4 text-gray-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {msg.contact_name || 'Sem nome'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {msg.phone_number || 'Sem telefone'} • {msg.timestamp ? format(new Date(msg.timestamp), 'HH:mm:ss') : ''}
                            </p>
                          </div>
                          <div className={`text-xs font-bold ${
                            isSuccess ? 'text-gray-900' : 'text-gray-400'
                          }`}>
                            {isSuccess ? '✓' : '✗'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Completion Message */}
            {isCompleted && (
              <div className="bg-gray-50 rounded-2xl p-6 border-2 border-gray-200">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-900 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-lg">Campanha Finalizada</p>
                    <p className="text-sm text-gray-600">
                      {campaignData.sent} enviadas • {campaignData.failed} falharam
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer - Botões sempre visíveis */}
        <div className="flex-shrink-0 p-6 border-t border-gray-100 space-y-3">
          {!isCompleted && (
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isCancelling}
              className="w-full rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cancelando...
                </>
              ) : (
                <>
                  <StopCircle className="w-4 h-4 mr-2" />
                  Cancelar Campanha
                </>
              )}
            </Button>
          )}

          <Button
            onClick={handleViewDetails}
            className="w-full rounded-xl bg-gray-900 hover:bg-gray-800 text-white"
          >
            <Eye className="w-4 h-4 mr-2" />
            Ver Detalhes Completos
          </Button>

          <Button
            variant="outline"
            onClick={onClose}
            className="w-full rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            <X className="w-4 h-4 mr-2" />
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}