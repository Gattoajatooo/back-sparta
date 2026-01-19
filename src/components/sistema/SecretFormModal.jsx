import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { X, Key, Loader2 } from "lucide-react";

export default function SecretFormModal({ open, onClose, secret, onSave, isSaving }) {
  const [formData, setFormData] = useState({
    key_name: '',
    value: '',
    category: 'Sistema',
    description: '',
    is_sensitive: true
  });

  useEffect(() => {
    if (secret) {
      setFormData({
        key_name: secret.key_name,
        value: '',
        category: secret.category,
        description: secret.description || '',
        is_sensitive: secret.is_sensitive
      });
    } else {
      setFormData({
        key_name: '',
        value: '',
        category: 'Sistema',
        description: '',
        is_sensitive: true
      });
    }
  }, [secret, open]);

  const categoryOptions = [
    'Notificações',
    'Sistema',
    'WebSocket',
    'Campanhas',
    'Integração',
    'Jobs',
    'Pagamentos',
    'WhatsApp'
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl p-0 [&>button]:hidden">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-gray-900">
              {secret ? 'Editar' : 'Novo'} Secret
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-lg"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Nome da Chave */}
          <div className="space-y-2">
            <Label htmlFor="key_name">Nome da Chave</Label>
            <Input
              id="key_name"
              value={formData.key_name}
              onChange={(e) => setFormData({ ...formData, key_name: e.target.value })}
              placeholder="Ex: STRIPE_API_KEY"
              className="rounded-xl font-mono"
              required
              disabled={!!secret}
            />
          </div>

          {/* Valor */}
          <div className="space-y-2">
            <Label htmlFor="value">Valor {secret && '(deixe em branco para não alterar)'}</Label>
            <Textarea
              id="value"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              placeholder="Cole o valor do secret aqui..."
              className="rounded-xl font-mono text-sm"
              required={!secret}
            />
          </div>

          {/* Categoria */}
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {categoryOptions.map((cat) => (
                  <SelectItem key={cat} value={cat} className="rounded-lg">
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Ex: Chave da API do Stripe para pagamentos"
              className="rounded-xl"
            />
          </div>

          {/* Is Sensitive */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <Label htmlFor="is_sensitive" className="font-medium">Chave Sensível</Label>
              <p className="text-sm text-gray-600">Mascarar valor por padrão</p>
            </div>
            <Switch
              id="is_sensitive"
              checked={formData.is_sensitive}
              onCheckedChange={(checked) => setFormData({ ...formData, is_sensitive: checked })}
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-purple-600 hover:bg-purple-700 rounded-xl"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                secret ? 'Salvar Alterações' : 'Criar Secret'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}