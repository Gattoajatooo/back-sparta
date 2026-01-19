import React, { useState, useEffect } from "react";
import { Company } from "@/entities/Company";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Building2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function TransferSessionModal({ open, onClose, session, onTransferSuccess }) {
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      loadCompanies();
      setSelectedCompanyId("");
      setError("");
    }
  }, [open]);

  const loadCompanies = async () => {
    setIsLoading(true);
    try {
      const allCompanies = await Company.list();
      let filteredCompanies = allCompanies.filter(c => c.id !== session?.company_id);

      // Se for sessão de sistema, filtrar apenas empresas de admins
      if (session?.is_system_session) {
        try {
          const adminUsers = await base44.entities.User.filter({ role: 'admin' });
          const adminIds = new Set(adminUsers.map(u => u.id));
          filteredCompanies = filteredCompanies.filter(c => adminIds.has(c.owner_id));
        } catch (err) {
          console.error("Erro ao filtrar admins:", err);
        }
      }

      setCompanies(filteredCompanies);
    } catch (error) {
      console.error("Erro ao carregar empresas:", error);
      setError("Não foi possível carregar a lista de empresas.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedCompanyId || !session) return;

    setIsTransferring(true);
    setError("");

    try {
      const response = await base44.functions.invoke("transferSession", {
        sessionId: session.id,
        targetCompanyId: selectedCompanyId
      });

      if (response.data?.success) {
        if (onTransferSuccess) onTransferSuccess();
        onClose();
      } else {
        throw new Error(response.data?.error || "Falha na transferência");
      }
    } catch (error) {
      console.error("Erro ao transferir sessão:", error);
      setError(error.message || "Erro ao transferir sessão.");
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] rounded-2xl">
        <DialogHeader>
          <DialogTitle>Transferir Sessão</DialogTitle>
          <DialogDescription>
            Selecione a empresa para a qual deseja transferir a sessão <strong>{session?.custom_name || session?.session_name}</strong>.
            {session?.is_system_session && (
              <span className="block mt-2 text-amber-600 text-sm">
                ⚠️ Esta é uma sessão de sistema e só pode ser transferida para outro administrador.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Nova Empresa Responsável
              </label>
              <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Selecione uma empresa" />
                </SelectTrigger>
                <SelectContent className="rounded-xl max-h-[300px]">
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-500" />
                        {company.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            Cancelar
          </Button>
          <Button 
            onClick={handleTransfer} 
            disabled={!selectedCompanyId || isTransferring || isLoading}
            className="bg-blue-600 hover:bg-blue-700 rounded-xl"
          >
            {isTransferring ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Transferindo...
              </>
            ) : (
              "Confirmar Transferência"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}