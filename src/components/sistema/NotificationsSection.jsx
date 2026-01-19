import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  Plus,
  MessageSquare,
  Mail,
  Smartphone,
  Edit,
  Trash2,
  Eye,
  Loader2,
  RefreshCw
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import NotificationFormModal from "./NotificationFormModal";

export default function NotificationsSection() {
  const [notificationTemplates, setNotificationTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingNotification, setEditingNotification] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const notifications = await base44.asServiceRole.entities.SystemNotification.filter({});
      setNotificationTemplates(notifications);
    } catch (error) {
      console.error("Erro ao carregar notificações:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleSave = async (data) => {
    setIsSaving(true);
    try {
      if (editingNotification) {
        await base44.asServiceRole.entities.SystemNotification.update(editingNotification.id, data);
      } else {
        await base44.asServiceRole.entities.SystemNotification.create(data);
      }
      await loadNotifications();
      setShowForm(false);
      setEditingNotification(null);
    } catch (error) {
      console.error("Erro ao salvar notificação:", error);
      alert("Erro ao salvar notificação");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (notification) => {
    if (window.confirm(`Tem certeza que deseja excluir "${notification.name}"?`)) {
      try {
        await base44.asServiceRole.entities.SystemNotification.delete(notification.id);
        await loadNotifications();
      } catch (error) {
        console.error("Erro ao excluir notificação:", error);
        alert("Erro ao excluir notificação");
      }
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'whatsapp':
        return <MessageSquare className="w-4 h-4" />;
      case 'email':
        return <Mail className="w-4 h-4" />;
      case 'sms':
        return <Smartphone className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'whatsapp':
        return 'bg-green-100 text-green-800';
      case 'email':
        return 'bg-blue-100 text-blue-800';
      case 'sms':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="rounded-3xl border-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-orange-600" />
              Notificações Personalizadas
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={loadNotifications}
                className="rounded-xl"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button 
                onClick={() => {
                  setEditingNotification(null);
                  setShowForm(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 rounded-xl"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Modelo
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            Configure modelos de notificações personalizadas para diferentes eventos do sistema
          </p>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-2xl border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Modelos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {notificationTemplates.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center">
                <Bell className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Modelos Ativos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {notificationTemplates.filter(t => t.is_active).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">WhatsApp</p>
                <p className="text-2xl font-bold text-gray-900">
                  {notificationTemplates.filter(t => t.type === 'whatsapp').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Templates List */}
      <Card className="rounded-3xl border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg">Modelos de Notificação</CardTitle>
        </CardHeader>
        <CardContent>
          {notificationTemplates.length > 0 ? (
            <div className="space-y-3">
              {notificationTemplates.map((template) => (
                <div
                  key={template.id}
                  className="p-4 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-10 h-10 ${getTypeColor(template.type)} rounded-xl flex items-center justify-center`}>
                        {getTypeIcon(template.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{template.name}</h3>
                          <Badge
                            className={`rounded-full text-xs ${
                              template.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {template.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{template.content}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="rounded-full text-xs">
                            {template.trigger}
                          </Badge>
                          <Badge className={`rounded-full text-xs ${getTypeColor(template.type)}`}>
                            {template.type}
                          </Badge>
                          <Badge variant="outline" className="rounded-full text-xs">
                            {template.recipients === 'all_admins' ? 'Todos Admins' : 
                             template.recipients === 'company_owner' ? 'Proprietário' : 
                             'Específicos'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-lg"
                        onClick={() => {
                          setEditingNotification(template);
                          setShowForm(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-lg text-red-600 hover:text-red-700"
                        onClick={() => handleDelete(template)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Bell className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma notificação configurada</h3>
              <p className="text-gray-500 mb-6">Crie seu primeiro modelo de notificação</p>
              <Button 
                onClick={() => {
                  setEditingNotification(null);
                  setShowForm(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 rounded-2xl"
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeira Notificação
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="rounded-3xl border-gray-200 bg-gradient-to-br from-orange-50 to-white">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Bell className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Como funciona?</h3>
              <p className="text-sm text-gray-600">
                Configure modelos de notificações personalizadas que serão enviadas automaticamente
                quando eventos específicos acontecerem no sistema. Você pode escolher o canal
                (WhatsApp, Email, SMS) e personalizar a mensagem para cada tipo de evento.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal */}
      <NotificationFormModal
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingNotification(null);
        }}
        notification={editingNotification}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </div>
  );
}