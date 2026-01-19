import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Users, Calendar, CheckCircle2, AlertTriangle } from "lucide-react";
import { format, addDays, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ConfirmFutureApprovalModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  batchId, 
  days, 
  allPendingBatches, 
  isLoading: isConfirming 
}) {
  const [previewData, setPreviewData] = useState({
    count: 0,
    batches: [],
    totalRecipients: 0,
    sampleRecipients: []
  });
  const [isCalculating, setIsCalculating] = useState(true);

  useEffect(() => {
    if (isOpen && batchId && allPendingBatches.length > 0) {
      calculatePreview();
    }
  }, [isOpen, batchId, allPendingBatches]);

  const calculatePreview = () => {
    setIsCalculating(true);
    
    // Encontrar o lote alvo para pegar o schedule_id
    const targetBatch = allPendingBatches.find(b => b.batch_id === batchId);
    
    if (!targetBatch) {
      setPreviewData({ count: 0, batches: [], totalRecipients: 0, sampleRecipients: [] });
      setIsCalculating(false);
      return;
    }

    const scheduleId = targetBatch.schedule_id;
    const now = new Date();
    const limitDate = addDays(now, days);

    // Filtrar lotes do mesmo agendamento dentro do período
    const batchesToApprove = allPendingBatches.filter(batch => {
      if (batch.schedule_id !== scheduleId) return false;
      
      const runDate = new Date(batch.run_at);
      return isBefore(runDate, limitDate) && runDate >= startOfDay(now); // Inclui hoje até X dias
    }).sort((a, b) => a.run_at - b.run_at);

    // Calcular totais
    let totalRecipients = 0;
    let allRecipients = [];

    batchesToApprove.forEach(batch => {
      const count = batch.is_dynamic 
        ? (batch.calculated_count ?? batch.recipient_count ?? 0) 
        : (batch.recipient_count || 0);
      
      totalRecipients += count;

      // Coletar amostra de destinatários (preferência para calculated_recipients se dinâmico)
      const batchRecipients = batch.is_dynamic 
        ? (batch.calculated_recipients || []) 
        : (batch.recipients || []);
        
      allRecipients = [...allRecipients, ...batchRecipients];
    });

    // Remover duplicatas de destinatários (por ID ou nome/telefone)
    const uniqueRecipients = Array.from(new Map(allRecipients.map(item => [item.contact_id || item.phone, item])).values());

    setPreviewData({
      count: batchesToApprove.length,
      batches: batchesToApprove,
      totalRecipients: totalRecipients,
      sampleRecipients: uniqueRecipients.slice(0, 20) // Mostrar primeiros 20
    });

    setIsCalculating(false);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Aprovar Próximos {days} Dias
          </DialogTitle>
          <DialogDescription>
            Confira os detalhes dos lotes que serão aprovados.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isCalculating ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
              <p className="text-sm text-gray-500">Calculando prévia...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Resumo */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 p-3 rounded-2xl border border-blue-100 text-center">
                  <p className="text-xs text-blue-600 font-medium uppercase tracking-wider">Lotes</p>
                  <p className="text-2xl font-bold text-blue-700">{previewData.count}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-2xl border border-green-100 text-center">
                  <p className="text-xs text-green-600 font-medium uppercase tracking-wider">Total Destinatários</p>
                  <p className="text-2xl font-bold text-green-700">{previewData.totalRecipients}</p>
                </div>
              </div>

              {/* Lista de Lotes */}
              <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                <p className="text-xs font-medium text-gray-500 mb-2 px-1">Datas de Envio:</p>
                <div className="flex flex-wrap gap-2">
                  {previewData.batches.slice(0, 6).map(batch => (
                    <Badge key={batch.batch_id} variant="secondary" className="bg-white border-gray-200 text-gray-600">
                      {format(new Date(batch.run_at), "dd/MM HH:mm", { locale: ptBR })}
                    </Badge>
                  ))}
                  {previewData.batches.length > 6 && (
                    <Badge variant="secondary" className="bg-white border-gray-200 text-gray-500">
                      +{previewData.batches.length - 6}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Aviso para Dinâmicos */}
              {previewData.batches.some(b => b.is_dynamic) && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 text-xs">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <p>
                    Alguns lotes são dinâmicos. O número de destinatários pode variar no momento do envio dependendo dos filtros.
                  </p>
                </div>
              )}

              {/* Amostra de Destinatários */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Amostra de Destinatários ({previewData.sampleRecipients.length})
                </p>
                <ScrollArea className="h-32 rounded-xl border border-gray-200 bg-white p-2">
                  <div className="space-y-1">
                    {previewData.sampleRecipients.map((recipient, idx) => (
                      <div key={idx} className="text-xs py-1 px-2 hover:bg-gray-50 rounded flex justify-between">
                        <span className="font-medium text-gray-700">{recipient.name || recipient.first_name || 'Sem nome'}</span>
                        <span className="text-gray-400">{recipient.phone}</span>
                      </div>
                    ))}
                    {previewData.sampleRecipients.length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-4">Nenhum destinatário na prévia</p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            Cancelar
          </Button>
          <Button 
            onClick={onConfirm} 
            disabled={isConfirming || isCalculating || previewData.count === 0}
            className="bg-blue-600 hover:bg-blue-700 rounded-xl"
          >
            {isConfirming ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Aprovando...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Confirmar Aprovação
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}