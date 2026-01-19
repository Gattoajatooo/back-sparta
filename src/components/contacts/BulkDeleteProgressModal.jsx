import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  X,
  Trash2,
  RotateCcw,
  Minimize2,
  StopCircle
} from "lucide-react";
import { motion } from "framer-motion";

export default function BulkDeleteProgressModal({ 
  open, 
  onClose,
  onMinimize,
  onCancel,
  progress = { total: 0, processed: 0, successful: 0, failed: 0 },
  isProcessing = false,
  isCancelling = false,
  processType = null // 'delete' ou 'restore'
}) {
  // Calcular percentual real baseado no progresso
  const percentage = progress.total > 0 
    ? Math.round((progress.processed / progress.total) * 100) 
    : 0;

  const isComplete = progress.total > 0 && progress.processed >= progress.total && !isProcessing;

  if (!open) return null;

  const getHeaderColor = () => {
    if (isComplete) return 'from-green-600 to-green-700';
    if (isCancelling) return 'from-orange-600 to-orange-700';
    if (processType === 'delete') return 'from-red-600 to-red-700';
    if (processType === 'restore') return 'from-blue-600 to-blue-700';
    return 'from-gray-600 to-gray-700';
  };

  const getHeaderIcon = () => {
    if (isComplete) return <CheckCircle2 className="w-6 h-6 text-white" />;
    if (isCancelling) return <StopCircle className="w-6 h-6 text-white" />;
    if (processType === 'delete') return <Trash2 className="w-6 h-6 text-white" />;
    if (processType === 'restore') return <RotateCcw className="w-6 h-6 text-white" />;
    return <Loader2 className="w-6 h-6 text-white animate-spin" />;
  };

  const getHeaderTitle = () => {
    if (isComplete) return 'Operação Concluída';
    if (isCancelling) return 'Cancelando Processamento';
    if (processType === 'delete') return 'Deletando Contatos';
    if (processType === 'restore') return 'Restaurando Contatos';
    return 'Processando';
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[700px] max-w-[95vw] bg-white shadow-xl border-0 p-0 [&>button]:hidden overflow-hidden"
        style={{ 
          maxHeight: '90vh',
          borderRadius: '1.5rem'
        }}
      >
        <DialogTitle className="sr-only">{getHeaderTitle()}</DialogTitle>
        {/* Header */}
        <div 
          className={`relative bg-gradient-to-br ${getHeaderColor()}`}
          style={{ 
            height: '80px',
            borderTopLeftRadius: '1.5rem',
            borderTopRightRadius: '1.5rem'
          }}
        >
          <div className="absolute left-8 top-1/2 transform -translate-y-1/2 flex items-center gap-3">
            <div className="w-10 h-10 bg-white/30 rounded-2xl flex items-center justify-center">
              {getHeaderIcon()}
            </div>
            <div>
              <span className="text-xl font-semibold text-white">
                {getHeaderTitle()}
              </span>
              <div className="text-sm text-white/90">
                {progress.processed} de {progress.total} contatos processados
              </div>
            </div>
          </div>
          
          <div className="absolute right-8 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
            {isProcessing && onMinimize && !isCancelling && (
              <button
                onClick={onMinimize}
                className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors duration-200"
                title="Minimizar"
              >
                <Minimize2 className="w-4 h-4 text-white" />
              </button>
            )}
            {isComplete && (
              <button
                onClick={onClose}
                className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors duration-200"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">Progresso</span>
              <span className="text-gray-500">{percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <motion.div
                className={`h-3 rounded-full transition-all duration-300 ${
                  processType === 'delete' ? 'bg-red-500' : 'bg-blue-500'
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="rounded-2xl border-gray-200">
              <CardContent className="p-4 text-center">
                {processType === 'delete' ? (
                  <Trash2 className="w-5 h-5 mx-auto mb-2 text-gray-400" />
                ) : (
                  <RotateCcw className="w-5 h-5 mx-auto mb-2 text-gray-400" />
                )}
                <div className="text-2xl font-bold text-gray-900">
                  {progress.total}
                </div>
                <div className="text-xs text-gray-500">Total</div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-gray-200">
              <CardContent className="p-4 text-center">
                <Loader2 className={`w-5 h-5 mx-auto mb-2 text-blue-500 ${!isComplete ? 'animate-spin' : ''}`} />
                <div className="text-2xl font-bold text-blue-600">
                  {progress.processed}
                </div>
                <div className="text-xs text-gray-500">Processados</div>
              </CardContent>
            </Card>
          </div>

          {/* Status Message */}
          {!isComplete && !isCancelling && (
            <div className={`border-2 rounded-2xl p-4 flex items-start gap-3 ${
              processType === 'delete' 
                ? 'bg-red-50 border-red-200' 
                : 'bg-blue-50 border-blue-200'
            }`}>
              <Loader2 className={`w-5 h-5 flex-shrink-0 mt-0.5 animate-spin ${
                processType === 'delete' ? 'text-red-600' : 'text-blue-600'
              }`} />
              <div>
                <p className={`font-semibold ${
                  processType === 'delete' ? 'text-red-900' : 'text-blue-900'
                }`}>
                  {processType === 'delete' ? '🗑️ Deletando contatos' : '♻️ Restaurando contatos'}
                </p>
                <p className={`text-sm mt-1 ${
                  processType === 'delete' ? 'text-red-700' : 'text-blue-700'
                }`}>
                  Processando em lotes. Por favor, aguarde...
                </p>
              </div>
            </div>
          )}

          {isCancelling && (
            <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-4 flex items-start gap-3">
              <StopCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-orange-900">⚠️ Cancelando operação</p>
                <p className="text-sm text-orange-700 mt-1">
                  Finalizando lote atual...
                </p>
              </div>
            </div>
          )}

          {isComplete && progress.successful > 0 && (
            <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-green-900">✅ Operação concluída!</p>
                <p className="text-sm text-green-700 mt-1">
                  <strong>{progress.successful} contatos</strong> processados com sucesso.
                  {progress.failed > 0 && (
                    <span className="block mt-1">
                      <strong className="text-red-700">{progress.failed} falharam</strong> no processamento.
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}

          {isComplete && progress.successful === 0 && progress.failed > 0 && (
            <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">❌ Todos os contatos falharam!</p>
                <p className="text-sm text-red-700 mt-1">
                  <strong>{progress.failed} de {progress.total} contatos</strong> não puderam ser {processType === 'delete' ? 'deletados' : 'restaurados'}.
                </p>
                <p className="text-xs text-red-600 mt-2">
                  Possíveis causas: problemas de conexão, permissões insuficientes ou contatos já processados.
                </p>
              </div>
            </div>
          )}

          {/* Real-time Counters - SEMPRE VISÍVEL */}
          <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                  (progress.successful || 0) > 0 
                    ? 'bg-green-100 scale-110' 
                    : 'bg-gray-100'
                }`}>
                  <CheckCircle2 className={`w-5 h-5 transition-colors ${
                    (progress.successful || 0) > 0 ? 'text-green-600' : 'text-gray-400'
                  }`} />
                </div>
                <div>
                  <div className="text-xs text-gray-500">✅ Sucesso</div>
                  <div className={`text-2xl font-bold transition-colors ${
                    (progress.successful || 0) > 0 ? 'text-green-600' : 'text-gray-400'
                  }`}>
                    {progress.successful || 0}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                  (progress.failed || 0) > 0 
                    ? 'bg-red-100 scale-110' 
                    : 'bg-gray-100'
                }`}>
                  <XCircle className={`w-5 h-5 transition-colors ${
                    (progress.failed || 0) > 0 ? 'text-red-600' : 'text-gray-400'
                  }`} />
                </div>
                <div>
                  <div className="text-xs text-gray-500">❌ Falhas</div>
                  <div className={`text-2xl font-bold transition-colors ${
                    (progress.failed || 0) > 0 ? 'text-red-600' : 'text-gray-400'
                  }`}>
                    {progress.failed || 0}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div 
          className="flex justify-between items-center gap-3 p-6 bg-gray-50 border-t border-gray-200"
          style={{
            borderBottomLeftRadius: '1.5rem',
            borderBottomRightRadius: '1.5rem'
          }}
        >
          <div className="flex items-center gap-2">
            {!isComplete && !isCancelling && onCancel && (
              <Button
                onClick={onCancel}
                variant="outline"
                className="rounded-xl border-red-300 text-red-600 hover:bg-red-50"
              >
                <StopCircle className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
            )}
            
            {/* ✅ NOVO: Botão de Fechar Forçado */}
            {!isComplete && (
              <Button
                onClick={() => {
                  if (window.confirm('Tem certeza que deseja fechar? O processamento será cancelado e você precisará reiniciar.')) {
                    // Limpar localStorage
                    localStorage.removeItem('bulkContactsProgress');
                    window.dispatchEvent(new CustomEvent('bulkProgressUpdate', {
                      detail: {
                        isProcessing: false,
                        processType: null,
                        total: 0,
                        processed: 0,
                        successful: 0,
                        failed: 0
                      }
                    }));
                    onClose();
                  }
                }}
                variant="outline"
                className="rounded-xl border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                <X className="w-4 h-4 mr-2" />
                Fechar Forçado
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isComplete && (
              <Button
                onClick={onClose}
                className="rounded-xl bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Fechar
              </Button>
            )}

            {!isComplete && !isCancelling && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                Processando contatos...
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}