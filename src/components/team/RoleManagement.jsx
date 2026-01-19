import React, { useState } from 'react';
import { Role } from "@/entities/Role";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Plus,
  Edit,
  Eye,
  EyeOff,
  Lock,
  Users,
  CheckCircle2,
  XCircle
} from "lucide-react";

import CreateRoleForm from "./CreateRoleForm";

export default function RoleManagement({ roles, companyId, onReloadData }) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRole, setEditingRole] = useState(null);

  const handleCreateRole = async (roleData) => {
    try {
      const completeRoleData = {
        ...roleData,
        company_id: companyId,
        is_system_role: false
      };
      
      await Role.create(completeRoleData);
      setShowCreateForm(false);
      onReloadData();
    } catch (error) {
      console.error("Error creating role:", error);
    }
  };

  const handleEditRole = async (roleData) => {
    if (!editingRole) return;
    
    try {
      const completeRoleData = {
        ...roleData,
        company_id: companyId
      };
      
      await Role.update(editingRole.id, completeRoleData);
      setEditingRole(null);
      onReloadData();
    } catch (error) {
      console.error("Error updating role:", error);
    }
  };

  const getPermissionIcon = (permission) => {
    switch (permission) {
      case 'full': return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'view': return <Eye className="w-4 h-4 text-blue-600" />;
      case 'none': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <EyeOff className="w-4 h-4 text-gray-400" />;
    }
  };

  const getPermissionBadge = (permission) => {
    const colors = {
      full: 'bg-green-100 text-green-800 border-green-200',
      view: 'bg-blue-100 text-blue-800 border-blue-200',
      none: 'bg-red-100 text-red-800 border-red-200'
    };
    
    const labels = {
      full: 'Total',
      view: 'Visualizar',
      none: 'Bloqueado'
    };
    
    return (
      <Badge variant="outline" className={`rounded-full text-xs px-2 py-1 ${colors[permission]}`}>
        {getPermissionIcon(permission)}
        <span className="ml-1">{labels[permission]}</span>
      </Badge>
    );
  };

  const customRoles = roles.filter(role => !role.is_system_role);
  const systemRoles = roles.filter(role => role.is_system_role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Gerenciamento de Funções</h3>
          <p className="text-sm text-gray-500 mt-1">
            Crie funções personalizadas e defina permissões específicas para diferentes membros da equipe
          </p>
        </div>
        <Button
          onClick={() => setShowCreateForm(true)}
          className="bg-purple-600 hover:bg-purple-700 rounded-2xl"
        >
          <Plus className="w-4 h-4 mr-2" />
          Criar Função
        </Button>
      </div>

      {/* System Role (Admin) */}
      <div>
        <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5 text-gray-600" />
          Função do Sistema
        </h4>
        <div className="grid grid-cols-1 gap-4">
          {systemRoles.map((role) => (
            <Card key={role.id} className="rounded-2xl border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="w-6 h-6 text-purple-600" />
                  <div>
                    <h5 className="font-semibold text-gray-900 text-lg">Administrador</h5>
                    <p className="text-sm text-gray-600">Acesso total ao sistema - todas as permissões</p>
                  </div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
                  <p className="text-purple-800 text-sm font-medium">
                    ✓ Acesso completo a todos os módulos e funcionalidades
                  </p>
                  <p className="text-purple-600 text-xs mt-1">
                    Esta é a função padrão para proprietários de empresa
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Custom Roles */}
      <div>
        <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-600" />
          Funções Personalizadas ({customRoles.length})
        </h4>
        
        {customRoles.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {customRoles.map((role) => (
              <Card key={role.id} className="rounded-2xl border-gray-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-2xl flex items-center justify-center">
                        <Shield className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{role.name}</CardTitle>
                        <p className="text-sm text-gray-500">{role.description}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingRole(role)}
                      className="h-8 w-8 rounded-full"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Permissões dos Módulos</div>
                      <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                        {Object.entries(role.permissions || {}).map(([module, permission]) => (
                          <div key={module} className="flex items-center justify-between text-sm">
                            <span className="capitalize text-gray-700">
                              {module === 'conversations' ? 'Conversas' :
                               module === 'sessions' ? 'Sessões' :
                               module === 'contacts' ? 'Contatos' :
                               module === 'campaigns' ? 'Campanhas' :
                               module === 'templates' ? 'Modelos' :
                               module === 'tags' ? 'Marcadores' :
                               module === 'tickets' ? 'Chamados' :
                               module === 'plans' ? 'Planos' :
                               module === 'billing' ? 'Faturamento' :
                               module === 'logs' ? 'Logs' :
                               module === 'team' ? 'Equipe' :
                               module === 'roles' ? 'Funções' :
                               module === 'reports' ? 'Relatórios' :
                               module.replace('_', ' ')
                              }
                            </span>
                            {getPermissionBadge(permission)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="rounded-2xl border-gray-200 border-dashed">
            <CardContent className="text-center py-12">
              <Shield className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma função personalizada</h3>
              <p className="text-gray-500 mb-4">
                Crie funções personalizadas para definir permissões específicas para os membros da sua equipe
              </p>
              <Button
                onClick={() => setShowCreateForm(true)}
                className="bg-purple-600 hover:bg-purple-700 rounded-2xl"
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar Sua Primeira Função
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Forms */}
      {showCreateForm && (
        <CreateRoleForm
          companyId={companyId}
          onSubmit={handleCreateRole}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {editingRole && (
        <CreateRoleForm
          role={editingRole}
          companyId={companyId}
          onSubmit={handleEditRole}
          onCancel={() => setEditingRole(null)}
          isEditing={true}
        />
      )}
    </div>
  );
}