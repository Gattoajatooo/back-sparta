import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { Label } from "@/components/ui/label";

export default function CreateableSelect({ 
  value, 
  onChange, 
  options = [], 
  onCreate, 
  placeholder = "Selecione...",
  createLabel = "Criar novo",
  createTitle = "Criar novo item",
  createPlaceholder = "Digite o nome...",
  disabled = false
}) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!newItemName.trim()) return;
    
    setIsCreating(true);
    try {
      await onCreate(newItemName.trim());
      setNewItemName("");
      setShowCreateDialog(false);
    } catch (error) {
      console.error("Erro ao criar:", error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <Select value={value} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setShowCreateDialog(true)}
          disabled={disabled}
          className="transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>{createTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nome</Label>
              <Input
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder={createPlaceholder}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreate();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                setNewItemName("");
              }}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newItemName.trim() || isCreating}
              className="rounded-xl transition-all active:scale-95"
            >
              {isCreating ? "Criando..." : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}