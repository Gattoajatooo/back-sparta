import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserCheck, Loader2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function QuickAssignResponsibleModal({ open, onClose, contact, onSuccess }) {
  const [responsibleName, setResponsibleName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    if (contact?.responsible_name) {
      setResponsibleName(contact.responsible_name);
    } else {
      setResponsibleName("");
    }
  }, [contact]);

  useEffect(() => {
    if (open) {
      loadSuggestions();
    }
  }, [open]);

  const loadSuggestions = async () => {
    try {
      const user = await base44.auth.me();
      const allContacts = await base44.entities.Contact.filter({
        company_id: user.company_id,
        deleted: { '$ne': true }
      });

      const uniqueResponsibles = [...new Set(
        allContacts
          .map(c => c.responsible_name)
          .filter(Boolean)
      )].sort();

      setSuggestions(uniqueResponsibles);
    } catch (error) {
      console.error("Erro ao carregar sugestões:", error);
    }
  };

  const handleSubmit = async () => {
    if (!contact) return;

    setIsSubmitting(true);
    try {
      await base44.entities.Contact.update(contact.id, {
        responsible_name: responsibleName.trim() || null
      });

      onSuccess(
        responsibleName.trim()
          ? `Responsável "${responsibleName}" atribuído com sucesso!`
          : "Responsável removido com sucesso!"
      );
      onClose();
    } catch (error) {
      console.error("Erro ao atribuir responsável:", error);
      onSuccess("Erro ao atribuir responsável", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = () => {
    setResponsibleName("");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="rounded-3xl max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <UserCheck className="w-5 h-5 text-indigo-600" />
            Atribuir Responsável
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {contact && (
            <div className="bg-gray-50 rounded-2xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold">
                {contact.first_name?.[0]?.toUpperCase() || 'C'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">
                  {contact.first_name} {contact.last_name}
                </p>
                <p className="text-xs text-gray-600 truncate">{contact.phone}</p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="responsible_name">Nome do Responsável</Label>
            <div className="relative">
              <Input
                id="responsible_name"
                value={responsibleName}
                onChange={(e) => setResponsibleName(e.target.value)}
                placeholder="Digite o nome do responsável"
                className="rounded-xl pr-10"
                list="responsible-suggestions"
              />
              {responsibleName && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClear}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
              <datalist id="responsible-suggestions">
                {suggestions.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>
            <p className="text-xs text-gray-500">
              Digite um nome ou selecione de responsáveis já cadastrados
            </p>
          </div>

          {suggestions.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-gray-600">Responsáveis recentes:</Label>
              <div className="flex flex-wrap gap-2">
                {suggestions.slice(0, 5).map((name) => (
                  <Badge
                    key={name}
                    variant="outline"
                    className="cursor-pointer hover:bg-indigo-50 rounded-full"
                    onClick={() => setResponsibleName(name)}
                  >
                    {name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-indigo-600 hover:bg-indigo-700 rounded-xl"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <UserCheck className="w-4 h-4 mr-2" />
                Salvar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}