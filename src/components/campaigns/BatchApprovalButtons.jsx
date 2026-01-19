import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, Users, Clock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function BatchApprovalButtons({ 
  schedule, 
  companyId, 
  onApproved, 
  onDenied,
  showNotification,
  // ✅ NOVO: Receber lotes pendentes pré-carregados da página pai
  allPendingBatches = []
}) {
  const [pendingBatch, setPendingBatch] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [recipientCount, setRecipientCount] = useState(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isDenying, setIsDenying] = useState(false);

  // ✅ OTIMIZADO: Usar lotes pré-carregados ao invés de fazer requisição individual
  useEffect(() => {
    const findPendingBatch = async () => {
      if (!schedule?.id || !companyId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        const now = Date.now();
        const in24Hours = now + (24 * 60 * 60 * 1000);

        // ✅ Filtrar lotes da lista pré-carregada ao invés de fazer nova requisição
        const batchesForSchedule = allPendingBatches.filter(
          batch => batch.schedule_id === schedule.id
        );

        // Filtrar apenas lotes que expiram nas próximas 24 horas
        const upcomingBatch = batchesForSchedule.find(batch => 
          batch.run_at && batch.run_at > now && batch.run_at <= in24Hours
        );

        if (upcomingBatch) {
          setPendingBatch(upcomingBatch);
          
          // Se for dinâmico, calcular destinatários
          if (upcomingBatch.is_dynamic && upcomingBatch.contact_filters?.length > 0) {
            setIsCalculating(true);
            try {
              const response = await base44.functions.invoke('getFilteredContactsByRules', {
                filters: upcomingBatch.contact_filters,
                logic: upcomingBatch.filter_logic || 'AND',
                simulation_date: new Date(upcomingBatch.run_at).toISOString()
              });
              
              if (response.data?.success) {
                setRecipientCount(response.data.count);
              } else {
                setRecipientCount(upcomingBatch.recipient_count || 0);
              }
            } catch (error) {
              console.error('Erro ao calcular destinatários:', error);
              setRecipientCount(upcomingBatch.recipient_count || 0);
            } finally {
              setIsCalculating(false);
            }
          } else {
            setRecipientCount(upcomingBatch.recipient_count || upcomingBatch.recipients?.length || 0);
          }
        } else {
          setPendingBatch(null);
        }
      } catch (error) {
        console.error('Erro ao processar lote pendente:', error);
        setPendingBatch(null);
      } finally {
        setIsLoading(false);
      }
    };

    findPendingBatch();
  }, [schedule?.id, companyId, allPendingBatches]);

  const handleApprove = async (e) => {
    e.stopPropagation();
    if (!pendingBatch) return;

    setIsApproving(true);
    try {
      const response = await base44.functions.invoke('approveBatch', {
        batch_id: pendingBatch.id
      });

      if (response.data?.success) {
        showNotification?.('success', 'Lote aprovado com sucesso!');
        setPendingBatch(null);
        onApproved?.();
      } else {
        const errorMsg = response.data?.error || 'Erro ao aprovar lote';
        showNotification?.('error', errorMsg);
      }
    } catch (error) {
      console.error('Erro ao aprovar lote:', error);
      // Extrair mensagem de erro da resposta se disponível
      let errorMsg = error.response?.data?.error || error.message || 'Erro desconhecido';
      
      // Traduzir mensagens comuns
      if (errorMsg.includes('No recipients found')) {
        errorMsg = 'Nenhum destinatário encontrado para este lote. Verifique os filtros da campanha.';
      } else if (errorMsg.includes('No valid templates')) {
        errorMsg = 'Nenhum modelo válido encontrado. Verifique se o modelo existe.';
      } else if (errorMsg.includes('expired')) {
        errorMsg = 'O prazo de aprovação deste lote já expirou.';
      }
      
      showNotification?.('error', errorMsg);
    } finally {
      setIsApproving(false);
    }
  };

  const handleDeny = async (e) => {
    e.stopPropagation();
    if (!pendingBatch) return;

    setIsDenying(true);
    try {
      const response = await base44.functions.invoke('denyBatch', {
        batch_id: pendingBatch.id
      });

      if (response.data?.success) {
        showNotification?.('info', 'Lote negado.');
        setPendingBatch(null);
        onDenied?.();
      } else {
        const errorMsg = response.data?.error || 'Erro ao negar lote';
        showNotification?.('error', errorMsg);
      }
    } catch (error) {
      console.error('Erro ao negar lote:', error);
      showNotification?.('error', `Erro ao negar: ${error.message}`);
    } finally {
      setIsDenying(false);
    }
  };

  // Calcular tempo restante
  const getTimeRemaining = () => {
    if (!pendingBatch?.run_at) return '';
    
    const now = Date.now();
    const diff = pendingBatch.run_at - now;
    const hours = Math.floor(diff / (60 * 60 * 1000));
    const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
    
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes}min`;
  };

  // Não mostrar nada se estiver carregando ou não tiver lote pendente
  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 mb-2">
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        <span className="text-xs text-gray-500">Verificando lotes...</span>
      </div>
    );
  }

  if (!pendingBatch) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs text-gray-600">
              Lote pendente - {getTimeRemaining()}
            </span>
          </div>
          <Badge variant="outline" className="text-[10px] rounded-full">
            {isCalculating ? (
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
            ) : (
              <Users className="w-3 h-3 mr-1" />
            )}
            {isCalculating ? 'Calculando...' : `${recipientCount} dest.`}
          </Badge>
        </div>
        
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={handleApprove}
                disabled={isApproving || isDenying || isCalculating}
                className="flex-1 h-8 sm:h-9 rounded-xl text-xs sm:text-sm"
              >
                {isApproving ? (
                  <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin mr-1 text-gray-500" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 text-green-600" />
                )}
                <span className="truncate">Aprovar</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="rounded-lg">
              <p>Aprovar envio do lote</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeny}
                disabled={isApproving || isDenying}
                className="flex-1 h-8 sm:h-9 rounded-xl text-xs sm:text-sm"
              >
                {isDenying ? (
                  <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin mr-1 text-gray-500" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 text-red-500" />
                )}
                <span className="truncate">Negar</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="rounded-lg">
              <p>Negar envio do lote</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}