import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckCircle2, RefreshCw, X, AlertCircle } from "lucide-react";

export default function SyncProgressModal({ open, onClose, jobId, scheduleId, companyId }) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('processing'); // processing, completed, error
  const [updatedCount, setUpdatedCount] = useState(0);
  const [totalJobs, setTotalJobs] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [ws, setWs] = useState(null);

  useEffect(() => {
    if (!open || !jobId || !companyId) return;

    console.log('[SyncProgressModal] Conectando ao WebSocket...');
    
    // WebSocket endpoint - use variáveis de ambiente ou valores padrão
    const wsEndpoint = 'wss://sparta-sync-websocket.spartasync.workers.dev';
    const wsAuthToken = 'sua-chave-secreta-aqui';
    
    const websocket = new WebSocket(`${wsEndpoint}?company_id=${companyId}&auth_token=${wsAuthToken}`);
    
    websocket.onopen = () => {
      console.log('[SyncProgressModal] WebSocket conectado');
    };
    
    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[SyncProgressModal] Mensagem recebida:', data);
        
        // Filtrar apenas mensagens relacionadas a este job_id
        if (data.job_id !== jobId) return;
        
        if (data.event_type === 'sync_progress') {
          setProgress(data.progress || 0);
          setUpdatedCount(data.updated_count || 0);
          setTotalJobs(data.total_jobs || 0);
          setStatus('processing');
        } else if (data.event_type === 'sync_complete') {
          setProgress(100);
          setUpdatedCount(data.updated_count || 0);
          setTotalJobs(data.total_jobs || 0);
          setStatus('completed');
        } else if (data.event_type === 'sync_error') {
          setStatus('error');
          setErrorMessage(data.error || 'Erro desconhecido');
        }
      } catch (error) {
        console.error('[SyncProgressModal] Erro ao processar mensagem:', error);
      }
    };
    
    websocket.onerror = (error) => {
      console.error('[SyncProgressModal] Erro no WebSocket:', error);
      setStatus('error');
      setErrorMessage('Erro de conexão. Tente novamente.');
    };
    
    websocket.onclose = () => {
      console.log('[SyncProgressModal] WebSocket desconectado');
    };
    
    setWs(websocket);
    
    // Cleanup
    return () => {
      if (websocket.readyState === WebSocket.OPEN) {
        websocket.close();
      }
    };
  }, [open, jobId, companyId]);

  const handleClose = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
    onClose();
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {status === 'processing' && (
              <>
                <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                Sincronizando Mensagens
              </>
            )}
            {status === 'completed' && (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Sincronização Concluída
              </>
            )}
            {status === 'error' && (
              <>
                <AlertCircle className="w-5 h-5 text-red-600" />
                Erro na Sincronização
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {status === 'processing' && (
            <>
              <Progress value={progress} className="h-2" />
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{progress}%</p>
                <p className="text-sm text-gray-600 mt-1">
                  {updatedCount} de {totalJobs} mensagens atualizadas
                </p>
              </div>
            </>
          )}

          {status === 'completed' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-lg font-semibold text-gray-900 mb-2">
                Sincronização Concluída com Sucesso!
              </p>
              <p className="text-sm text-gray-600">
                {updatedCount} mensagens foram atualizadas
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <p className="text-lg font-semibold text-gray-900 mb-2">
                Erro na Sincronização
              </p>
              <p className="text-sm text-gray-600">
                {errorMessage}
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button
            onClick={handleClose}
            variant={status === 'completed' ? 'default' : 'outline'}
            className="rounded-xl"
            style={status === 'completed' ? { backgroundColor: '#2ECC71' } : {}}
          >
            {status === 'processing' ? 'Continuar em Segundo Plano' : 'Fechar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}