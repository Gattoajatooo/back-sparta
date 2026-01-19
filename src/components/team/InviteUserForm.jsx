import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPageUrl } from "@/utils";
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
} from "@/components/ui/dialog";
import {
  UserPlus,
  X,
  Save,
  Loader2,
  Mail,
  User as UserIcon,
  Shield,
  Send
} from "lucide-react";

export default function InviteUserForm({ roles, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    role_id: "",
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Reset form when opening or roles change
    setFormData({
      full_name: "",
      email: "",
      role_id: roles.length > 0 ? roles[0].id : "",
    });
    setErrors({});
    setIsSubmitting(false);
  }, [roles]); // Added roles to dependency array

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.full_name.trim()) newErrors.full_name = "O nome completo é obrigatório.";
    if (!formData.email.trim()) {
      newErrors.email = "O e-mail é obrigatório.";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Formato de e-mail inválido.";
    }
    if (!formData.role_id) newErrors.role_id = "A função é obrigatória.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    await onSubmit(formData);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onCancel();
    }
  };

  return (
    <Dialog open={true} onOpenChange={handleClose}>
      <DialogContent 
        className="max-w-2xl w-[95vw] sm:w-[90vw] md:w-[85vw] lg:w-[80vw] xl:max-w-2xl max-h-[95vh] p-0 overflow-hidden flex flex-col rounded-[2.5rem] [&>button]:hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center">
                <UserPlus className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Convidar Novo Membro
                </h2>
                <p className="text-sm text-gray-600">
                  Preencha os dados para enviar o convite
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              disabled={isSubmitting}
              className="h-8 w-8 rounded-lg"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div 
          className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6"
          style={{ 
            maxHeight: 'calc(95vh - 140px)',
            minHeight: '300px'
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="full_name" className="text-sm">Nome Completo *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                className="rounded-xl border-gray-200 mt-1"
                placeholder="Digite o nome completo"
              />
              {errors.full_name && (
                <p className="text-sm text-red-600 mt-1">{errors.full_name}</p>
              )}
            </div>

            <div>
              <Label htmlFor="email" className="text-sm">E-mail *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="rounded-xl border-gray-200 mt-1"
                placeholder="Digite o e-mail"
              />
              {errors.email && (
                <p className="text-sm text-red-600 mt-1">{errors.email}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="role_id" className="text-sm">Função *</Label>
              <Select
                value={formData.role_id}
                onValueChange={(value) => handleInputChange('role_id', value)}
              >
                <SelectTrigger className="rounded-xl border-gray-200 mt-1">
                  <SelectValue placeholder="Selecione uma função" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {roles.map(role => (
                    <SelectItem key={role.id} value={role.id} className="rounded-lg">
                      {role.name}
                    </SelectItem>
                  ))}
                  {roles.length === 0 && (
                    <SelectItem value="no-roles" disabled className="rounded-lg">
                      Nenhuma função personalizada criada
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {errors.role_id && (
                <p className="text-sm text-red-600 mt-1">{errors.role_id}</p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Funções personalizadas podem ser criadas na página de <a href={createPageUrl("RolePermissions")} className="text-blue-600 hover:underline">Funções & Permissões</a>.
              </p>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex justify-end items-center gap-3 p-6 bg-gray-50 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            className="rounded-xl"
          >
            Cancelar
          </Button>
          
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || roles.length === 0}
            className="rounded-xl text-white bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Enviar Convite
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}