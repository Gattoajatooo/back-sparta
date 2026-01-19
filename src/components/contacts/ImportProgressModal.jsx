import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  Upload,
  CheckCircle2,
  XCircle,
  X,
  Loader2,
  AlertTriangle,
  Minimize2,
  Users,
  UserX,
  MessageSquareOff,
  RefreshCw
} from "lucide-react";
import { motion } from "framer-motion";

export default function ImportProgressModal({ 
  open, 
  onClose,
  onMinimize,
  progress = { total: 0, processed: 0, successful: 0, failed: 0, duplicates: 0, noWhatsApp: 0, updated: 0, isProcessing: false, status: 'starting' }
}) {
  const progressPercentage = progress?.total > 0
    ? Math.round((progress.processed / progress.total) * 100)
    : 0;

  const isCompleted = progress?.status === 'completed' || (progress?.processed >= progress?.total && progress?.total > 0 && progress?.status !== 'starting');

  const getHeaderColor = () => {
    if (isCompleted) return 'from-green-600 to-green-700';
    return 'from-emerald-600 to-emerald-700';
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen && onMinimize && !isCompleted) {
        onMinimize();
      } else if (!isOpen && isCompleted) {
        onClose();
      }
    }}>
      <DialogContent className="w-[600px] max-w-[95vw] max-h-[90vh] p-0 bg-white rounded-[2.5rem] border-gray-200 overflow-hidden flex flex-col [&>button]:hidden">
        <VisuallyHidden>
          <DialogTitle>Importando Contatos</DialogTitle>
          <DialogDescription>Progresso da importação de contatos</DialogDescription>
        </VisuallyHidden>
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-700">
                {isCompleted ? (
                  <CheckCircle2 className="w-6 h-6 text-white" />
                ) : (
                  <Upload className="w-6 h-6 text-white animate-pulse" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {isCompleted ? 'Importação Concluída' : 'Importando Contatos'}
                </h2>
                <p className="text-sm text-gray-600">
                  {progress?.processed || 0} de {progress?.total || 0} processados
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isCompleted && onMinimize && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onMinimize}
                  className="h-8 w-8 rounded-lg"
                  title="Minimizar"
                >
                  <Minimize2 className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                disabled={!isCompleted}
                className="h-8 w-8 rounded-lg"
                title={isCompleted ? "Fechar" : "Aguarde a conclusão"}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">Progresso</span>
              <span className="text-gray-500">{progressPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <motion.div
                className="h-3 rounded-full bg-blue-600 transition-all duration-300"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Status Message */}
          {isCompleted ? (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-900">Importação concluída!</p>
                <div className="text-sm text-gray-700 mt-2 space-y-1">
                  {(progress?.successful > 0) && (
                    <p className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <strong className="text-green-700">{progress.successful} contatos novos</strong> importados com sucesso.
                    </p>
                  )}
                  {(progress?.updated > 0) && (
                    <p className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-blue-600" />
                      <strong className="text-blue-700">{progress.updated} contatos</strong> foram atualizados com novas informações.
                    </p>
                  )}
                  {(progress?.noWhatsApp > 0) && (
                    <p className="flex items-center gap-2">
                      <MessageSquareOff className="w-4 h-4 text-amber-600" />
                      <strong className="text-amber-700">{progress.noWhatsApp} números</strong> não possuem WhatsApp.
                    </p>
                  )}
                  {(progress?.duplicates > 0) && (
                    <p className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-500" />
                      <strong className="text-gray-600">{progress.duplicates} contatos</strong> já existiam e não tiveram alterações.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
                <Loader2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5 animate-spin" />
                <div className="flex-1">
                  <p className="font-semibold text-blue-900">
                    {progress?.status === 'starting' && 'Iniciando importação...'}
                    {progress?.status === 'validating' && 'Validando números no WhatsApp'}
                    {progress?.status === 'processing' && 'Processando e inserindo contatos'}
                    {!progress?.status && 'Aguarde...'}
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    {progress?.status === 'validating' && 'Verificando cada número no WhatsApp em tempo real.'}
                    {progress?.status === 'processing' && 'Salvando contatos no banco de dados.'}
                    {(progress?.status === 'starting' || !progress?.status) && 'Preparando para processar os contatos.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Stats Grid - 4 cards - ÚNICO */}
          <div className="grid grid-cols-4 gap-2">
            {/* Novos Importados */}
            <Card className="rounded-2xl border-green-200 bg-green-50">
              <CardContent className="p-3 text-center">
                <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-green-600" />
                <div className="text-xl font-bold text-green-700">
                  {progress?.successful || 0}
                </div>
                <div className="text-xs text-green-600">Novos</div>
              </CardContent>
            </Card>

            {/* Atualizados */}
            <Card className="rounded-2xl border-blue-200 bg-blue-50">
              <CardContent className="p-3 text-center">
                <RefreshCw className="w-4 h-4 mx-auto mb-1 text-blue-600" />
                <div className="text-xl font-bold text-blue-700">
                  {progress?.updated || 0}
                </div>
                <div className="text-xs text-blue-600">Atualizados</div>
              </CardContent>
            </Card>

            {/* Sem WhatsApp */}
            <Card className="rounded-2xl border-amber-200 bg-amber-50">
              <CardContent className="p-3 text-center">
                <MessageSquareOff className="w-4 h-4 mx-auto mb-1 text-amber-600" />
                <div className="text-xl font-bold text-amber-700">
                  {progress?.noWhatsApp || 0}
                </div>
                <div className="text-xs text-amber-600">Sem WhatsApp</div>
              </CardContent>
            </Card>

            {/* Duplicados (sem alteração) */}
            <Card className="rounded-2xl border-gray-200 bg-gray-50">
              <CardContent className="p-3 text-center">
                <Users className="w-4 h-4 mx-auto mb-1 text-gray-500" />
                <div className="text-xl font-bold text-gray-600">
                  {progress?.duplicates || 0}
                </div>
                <div className="text-xs text-gray-500">Sem Alteração</div>
              </CardContent>
            </Card>
          </div>

          {/* Validation Info */}
          {!isCompleted && (
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-purple-600" />
                <span className="font-semibold text-purple-900 text-sm">Validação Automática</span>
              </div>
              <p className="text-xs text-purple-700">
                Cada número está sendo verificado no WhatsApp. Números inválidos serão marcados automaticamente.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center gap-3 p-6 bg-gray-50 border-t border-gray-200">
          {isCompleted ? (
            <>
              <div />
              <Button
                onClick={onClose}
                className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Concluir
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => {
                  console.log('[ImportProgressModal] ❌ Cancelamento solicitado');
                  
                  // Limpar localStorage
                  localStorage.removeItem('importProgress');
                  
                  // Disparar evento de cancelamento
                  window.dispatchEvent(new CustomEvent('importProgressUpdate', {
                    detail: {
                      isProcessing: false,
                      total: 0,
                      processed: 0,
                      successful: 0,
                      failed: 0,
                      duplicates: 0,
                      noWhatsApp: 0,
                      updated: 0,
                      status: 'cancelled'
                    }
                  }));
                  
                  // Fechar modal
                  onClose();
                }}
                variant="outline"
                className="rounded-xl text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar Importação
              </Button>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                Importando e validando contatos...
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}