import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogClose,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Save, Loader2, User, Shield, Briefcase, Phone, Settings, Smartphone } from "lucide-react";
import { Session } from "@/entities/Session";
import { User as UserEntity } from "@/entities/User";

export default function EditUserForm({ user, roles, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    full_name: "",
    department: "",
    phone: "",
    role_id: "",
    is_active: true,
    allowed_sessions: [],
  });

  const [isLoading, setIsLoading] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [errors, setErrors] = useState({});
  const [activeSessions, setActiveSessions] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const me = await UserEntity.me();
      setCurrentUser(me);
      await loadActiveSessions(me.company_id);
    } catch (error) {
      console.error('Erro ao carregar usuário atual:', error);
    }
  };

  const loadActiveSessions = async (companyId) => {
    setLoadingSessions(true);
    try {
      const sessions = await Session.filter({
        company_id: companyId,
        is_deleted: { '$ne': true },
        status: { '$in': ['WORKING', 'SCAN_QR_CODE', 'STARTING'] }
      });
      setActiveSessions(sessions);
    } catch (error) {
      console.error('Erro ao carregar sessões:', error);
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || "",
        department: user.department || "",
        phone: user.phone || "",
        role_id: user.role_id || "",
        is_active: user.is_active !== false,
        allowed_sessions: user.allowed_sessions || [],
      });
    }
  }, [user]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.full_name) {
      newErrors.full_name = "O nome completo é obrigatório.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    
    setIsLoading(true);
    await onSubmit(formData);
    setIsLoading(false);
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent 
        className="max-w-lg rounded-2xl p-0 border-0"
        onInteractOutside={(e) => { e.preventDefault(); }}
      >
        <DialogHeader className="p-6">
          <DialogTitle className="flex items-center gap-3 text-lg">
            <User className="w-5 h-5"/>
            Editar Usuário
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-6">
            {/* General Info */}
            <div className="space-y-4">
               <h3 className="text-sm font-semibold text-gray-500 flex items-center gap-2"><User className="w-4 h-4"/> Informações Gerais</h3>
                <div>
                  <Label htmlFor="full_name">Nome Completo</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => handleInputChange("full_name", e.target.value)}
                    placeholder="Nome completo do usuário"
                    className="mt-1"
                  />
                   {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name}</p>}
                </div>
                <div>
                  <Label htmlFor="department">Departamento</Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) => handleInputChange("department", e.target.value)}
                    placeholder="Ex: Vendas, Marketing"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="+55 (00) 00000-0000"
                    className="mt-1"
                  />
                </div>
            </div>

            {/* Permissions */}
             <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-500 flex items-center gap-2"><Shield className="w-4 h-4"/> Permissões</h3>
                 <div>
                  <Label htmlFor="role_id">Função</Label>
                   <Select
                    value={formData.role_id}
                    onValueChange={(value) => handleInputChange("role_id", value)}
                  >
                    <SelectTrigger id="role_id" className="mt-1">
                      <SelectValue placeholder="Selecione uma função" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.filter(r => !r.is_system_role).map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                 </div>
            </div>

            {/* Sessions Access */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 flex items-center gap-2">
                <Smartphone className="w-4 h-4"/> Acesso às Sessões
              </h3>
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <p className="text-xs text-gray-600 mb-3">
                  Selecione quais sessões este usuário poderá acessar e utilizar
                </p>
                {loadingSessions ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                ) : activeSessions.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">Nenhuma sessão ativa encontrada</p>
                ) : (
                  <ScrollArea className="h-40">
                    <div className="space-y-2">
                      {activeSessions.map((session) => {
                        const sessionIdentifier = session.phone || session.session_name;
                        return (
                          <div 
                            key={session.id} 
                            className="flex items-center space-x-3 p-2 hover:bg-white rounded-lg transition-colors"
                          >
                            <Checkbox
                              id={`session-${session.id}`}
                              checked={formData.allowed_sessions.includes(sessionIdentifier)}
                              onCheckedChange={(checked) => {
                                setFormData(prev => ({
                                  ...prev,
                                  allowed_sessions: checked
                                    ? [...prev.allowed_sessions, sessionIdentifier]
                                    : prev.allowed_sessions.filter(s => s !== sessionIdentifier)
                                }));
                              }}
                            />
                            <Label 
                              htmlFor={`session-${session.id}`}
                              className="flex items-center gap-2 cursor-pointer flex-1"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">{session.custom_name || session.session_name}</span>
                                  {session.is_default && (
                                    <Badge variant="secondary" className="text-xs">Padrão</Badge>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500">{session.phone || 'Sem telefone'}</p>
                              </div>
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>

            {/* Account Status */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-500 flex items-center gap-2"><Settings className="w-4 h-4"/> Status da Conta</h3>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <Label htmlFor="is_active">Usuário Ativo</Label>
                  <p className="text-xs text-gray-500">Usuários inativos não podem acessar o sistema.</p>
                </div>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => handleInputChange("is_active", checked)}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="p-6 bg-gray-50 rounded-b-2xl">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-gray-800 hover:bg-gray-900">
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}