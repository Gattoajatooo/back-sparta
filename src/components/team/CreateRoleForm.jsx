import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Shield,
  X,
  Save,
  Loader2,
  Lock
} from "lucide-react";

export default function CreateRoleForm({ existingRole, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissions: {
      sessions: "none",
      conversations: "none",
      contacts: "none",
      campaigns: "none",
      templates: "none",
      tags: "none",
      tickets: "none",
      plans: "none",
      billing: "none",
      logs: "none",
      team: "none",
      roles: "none",
      reports: "none",
    },
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const defaultPermissions = {
      sessions: "none",
      conversations: "none",
      contacts: "none",
      campaigns: "none",
      templates: "none",
      tags: "none",
      tickets: "none",
      plans: "none",
      billing: "none",
      logs: "none",
      team: "none",
      roles: "none",
      reports: "none",
    };

    if (existingRole) {
      setFormData({
        name: existingRole.name || "",
        description: existingRole.description || "",
        permissions: {
          ...defaultPermissions, // Start with defaults
          ...existingRole.permissions, // Override with existing
        },
      });
    } else {
      // Reset form for new role
      setFormData({
        name: "",
        description: "",
        permissions: defaultPermissions,
      });
    }
    setErrors({});
    setIsSubmitting(false);
  }, [existingRole]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handlePermissionChange = (module, level) => {
    setFormData((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [module]: level,
      },
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = "Nome da função é obrigatório";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error("Error submitting role form:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onCancel();
    }
  };
  
  const permissionModules = [
      { id: "sessions", label: "Sessões" },
      { id: "conversations", label: "Conversas" },
      { id: "contacts", label: "Contatos" },
      { id: "campaigns", label: "Campanhas" },
      { id: "templates", label: "Modelos" },
      { id: "tags", label: "Marcadores" },
      { id: "tickets", label: "Tickets", disabled: true },
      { id: "plans", label: "Planos" },
      { id: "billing", label: "Faturamento" },
      { id: "logs", label: "Logs do Sistema" },
      { id: "team", label: "Equipe" },
      { id: "roles", label: "Funções e Permissões" },
      { id: "reports", label: "Relatórios", disabled: true },
  ];

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
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {existingRole ? "Editar Função" : "Criar Nova Função"}
                </h2>
                <p className="text-sm text-gray-600">
                  {existingRole ? 'Atualize as informações da função' : 'Preencha os dados da nova função'}
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
            {/* Role Info */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-sm">Nome da Função *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="rounded-xl border-gray-200 mt-1"
                  placeholder="Ex: Vendedor, Suporte Nível 1"
                />
                {errors.name && (
                  <p className="text-sm text-red-600 mt-1">{errors.name}</p>
                )}
              </div>
              <div>
                <Label htmlFor="description" className="text-sm">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  className="rounded-xl border-gray-200 mt-1 min-h-[80px]"
                  placeholder="Descreva as responsabilidades desta função..."
                />
              </div>
            </div>

            {/* Permissions */}
            <Card className="rounded-2xl border-gray-200">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base text-gray-900">
                  <Lock className="w-5 h-5 text-blue-600" />
                  Permissões por Módulo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-gray-100 -mx-6">
                  {permissionModules.map((module) => (
                    <div
                      key={module.id}
                      className={`flex items-center justify-between px-6 py-4 ${module.disabled ? "opacity-50" : ""}`}
                    >
                      <Label htmlFor={`perm-${module.id}`} className="text-sm font-medium cursor-pointer">
                        {module.label}
                      </Label>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center">
                          <Switch
                            id={`perm-view-${module.id}`}
                            checked={
                              formData.permissions[module.id] === "view" ||
                              formData.permissions[module.id] === "full"
                            }
                            onCheckedChange={(checked) => {
                              if (checked) {
                                const currentLevel = formData.permissions[module.id];
                                if (currentLevel === 'none') {
                                  handlePermissionChange(module.id, "view");
                                }
                              } else {
                                handlePermissionChange(module.id, "none");
                              }
                            }}
                            disabled={module.disabled}
                          />
                          <Label htmlFor={`perm-view-${module.id}`} className="ml-2 text-sm cursor-pointer">
                            Visualizar
                          </Label>
                        </div>
                        <div className="flex items-center">
                          <Switch
                            id={`perm-full-${module.id}`}
                            checked={formData.permissions[module.id] === "full"}
                            onCheckedChange={(checked) =>
                              handlePermissionChange(
                                module.id,
                                checked ? "full" : "view"
                              )
                            }
                            disabled={module.disabled}
                          />
                          <Label htmlFor={`perm-full-${module.id}`} className="ml-2 text-sm cursor-pointer">
                            Total
                          </Label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
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
            disabled={isSubmitting}
            className="rounded-xl text-white bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {existingRole ? "Atualizar" : "Criar Função"}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}