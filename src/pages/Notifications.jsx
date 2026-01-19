import React, { useState, useEffect } from "react";
import { Bell, Clock, AlertCircle, CheckCircle2, Info, Trash2, Eye, EyeOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";

export default function NotificationsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'unread'
  const [highlightId, setHighlightId] = useState(location.state?.highlightId || null);

  useEffect(() => {
    loadNotifications();
  }, [filter]);

  useEffect(() => {
    if (highlightId) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`notification-${highlightId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [highlightId, notifications]);

  const loadNotifications = async () => {
    try {
      setIsLoading(true);
      const response = await base44.functions.invoke('getNotifications', { 
        unread_only: filter === 'unread',
        limit: 50 
      });
      
      if (response.data?.success) {
        setNotifications(response.data.notifications || []);
      }
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      const response = await base44.functions.invoke('markNotificationRead', { 
        notification_id: notificationId 
      });
      
      if (response.data?.success) {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        );
      }
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await base44.functions.invoke('markNotificationRead', { 
        mark_all: true 
      });
      
      if (response.data?.success) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      }
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  };

  const handleNotificationClick = async (notification) => {
    // Marcar como lida
    if (!notification.read) {
      await handleMarkAsRead(notification.id);
    }
    
    // Marcar como visualizada pela primeira vez
    if (!notification.first_viewed) {
      try {
        await base44.entities.Notification.update(notification.id, { first_viewed: true });
      } catch (error) {
        console.error('Erro ao marcar como visualizada:', error);
      }
    }

    // Navegar para a ação se existir
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  const getNotificationIcon = (type, priority) => {
    switch (type) {
      case 'batch_expiring':
        return <Clock className="w-6 h-6 text-orange-500" />;
      case 'batch_expired':
        return <AlertCircle className="w-6 h-6 text-red-500" />;
      case 'campaign_completed':
        return <CheckCircle2 className="w-6 h-6 text-green-500" />;
      case 'campaign_failed':
        return <AlertCircle className="w-6 h-6 text-red-500" />;
      default:
        return <Info className="w-6 h-6 text-blue-500" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-red-500 bg-red-50';
      case 'high':
        return 'border-l-orange-500 bg-orange-50';
      case 'normal':
        return 'border-l-blue-500';
      default:
        return 'border-l-gray-300';
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center">
              <Bell className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Notificações</h1>
              <p className="text-sm text-gray-600">
                Acompanhe suas notificações e alertas
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <Button 
              onClick={handleMarkAllAsRead}
              variant="outline"
              className="rounded-xl"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Marcar todas como lidas
            </Button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
            className="rounded-xl"
          >
            Todas
            {notifications.length > 0 && (
              <Badge className="ml-2 bg-white text-gray-700">
                {notifications.length}
              </Badge>
            )}
          </Button>
          <Button
            variant={filter === 'unread' ? 'default' : 'outline'}
            onClick={() => setFilter('unread')}
            className="rounded-xl"
          >
            Não lidas
            {unreadCount > 0 && (
              <Badge className="ml-2 bg-white text-gray-700">
                {unreadCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Carregando notificações...</p>
          </div>
        </div>
      ) : notifications.length === 0 ? (
        <Card className="rounded-3xl border-gray-200">
          <CardContent className="p-12 text-center">
            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhuma notificação
            </h3>
            <p className="text-gray-600">
              {filter === 'unread' 
                ? 'Você não tem notificações não lidas' 
                : 'Você será notificado aqui quando houver novidades'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              id={`notification-${notification.id}`}
              onClick={() => handleNotificationClick(notification)}
              className={`rounded-2xl cursor-pointer hover:shadow-lg transition-all border-l-4 ${getPriorityColor(notification.priority)} ${
                !notification.read ? 'bg-blue-50/30 border-2 border-blue-100' : 'border-gray-200'
              } ${highlightId === notification.id ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
            >
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type, notification.priority)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className={`text-sm ${!notification.read ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                        {notification.title}
                      </h3>
                      {!notification.read && (
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      {notification.message}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {notification.created_date 
                          ? format(new Date(notification.created_date), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })
                          : 'Agora'
                        }
                      </span>
                      {notification.priority === 'urgent' && (
                        <Badge className="bg-red-100 text-red-700 text-xs border-red-200">
                          Urgente
                        </Badge>
                      )}
                      {notification.priority === 'high' && (
                        <Badge className="bg-orange-100 text-orange-700 text-xs border-orange-200">
                          Alta
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}