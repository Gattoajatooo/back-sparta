import React, { useState, useEffect, useCallback } from "react";
import { Bell, Clock, AlertCircle, CheckCircle2, Info, X, Loader2, BellRing, UserPlus, Lightbulb, Wrench, Megaphone, AlertTriangle, MessageSquare, ExternalLink } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useWebSocket } from "@/components/hooks/useWebSocket";
import { User } from "@/entities/User";
import { Message } from "@/entities/Message";
import SafeAvatar from "@/components/contacts/SafeAvatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function NotificationItem({ notification, onMarkAsRead, onNotificationClick, onAcceptInvite, getNotificationIcon }) {
const [isHovered, setIsHovered] = useState(false);

return (
  <div
    onMouseEnter={() => setIsHovered(true)}
    onMouseLeave={() => setIsHovered(false)}
    onClick={async (e) => {
      if (!isHovered) {
        if (!notification.read) {
          await onMarkAsRead(notification.id);
        }
      }
    }}
    className={`relative p-3 cursor-pointer hover:bg-gray-50 transition-all rounded-2xl group ${
      !notification.read ? 'bg-blue-50/50 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'
    }`}
  >
    <div className="flex gap-3">
      <div className="flex-shrink-0 mt-0.5">
        {getNotificationIcon(notification.type, notification.priority, notification.category)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <p className={`text-sm truncate ${!notification.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
              {notification.title}
            </p>
            {notification.category && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 flex-shrink-0 rounded-full">
                {notification.category === 'news' && 'Novidade'}
                {notification.category === 'improvement' && 'Melhoria'}
                {notification.category === 'fix' && 'Correção'}
                {notification.category === 'warning' && 'Aviso'}
                {notification.category === 'suggestion' && 'Sugestão'}
                {notification.category === 'invite' && 'Convite'}
              </Badge>
            )}
          </div>
          {!notification.read && (
            <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
          )}
        </div>

        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
          {notification.message}
        </p>

        {notification.category === 'invite' && notification.data?.token && (
          <div className="flex gap-2 mt-3">
            <Button 
              size="sm" 
              className="h-7 text-xs bg-blue-600 hover:bg-blue-700 rounded-xl"
              onClick={(e) => onAcceptInvite(e, notification)}
            >
              Aceitar
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="h-7 text-xs rounded-xl"
              onClick={(e) => { e.stopPropagation(); onMarkAsRead(notification.id); }}
            >
              Ignorar
            </Button>
          </div>
        )}

        <p className="text-xs text-gray-400 mt-2">
          {notification.created_date 
            ? format(new Date(notification.created_date), "dd/MM 'às' HH:mm", { locale: ptBR })
            : 'Agora'
          }
        </p>
      </div>
    </div>

    {isHovered && (
      <Button
        size="icon"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation();
          onNotificationClick(notification, e);
        }}
        className="absolute top-2 right-2 h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 hover:bg-white border border-gray-200"
      >
        <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
      </Button>
    )}
  </div>
);
}

function MessageItem({ message, onMessageClick }) {
const [isHovered, setIsHovered] = useState(false);

return (
  <div
    onMouseEnter={() => setIsHovered(true)}
    onMouseLeave={() => setIsHovered(false)}
    onClick={async () => {
      if (!isHovered) {
        await onMessageClick(message);
      }
    }}
    className="relative p-3 cursor-pointer hover:bg-gray-50 transition-all rounded-2xl group border-l-4 border-l-green-500 bg-green-50/30"
  >
    <div className="flex gap-3">
      <div className="flex-shrink-0">
        {message.contact ? (
          <SafeAvatar 
            contact={message.contact}
            className="w-11 h-11"
          />
        ) : message.contact_id ? (
          <SafeAvatar 
            contact={{ id: message.contact_id, phone: message.chat_id }}
            className="w-11 h-11"
          />
        ) : (
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {message.contact?.first_name 
              ? `${message.contact.first_name} ${message.contact.last_name || ''}`.trim()
              : message.metadata?.notifyName || message.chat_id.split('@')[0]
            }
          </p>
          <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 mt-1.5" />
        </div>
        <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
          {message.content || (message.metadata?.content_type ? `[${message.metadata.content_type}]` : 'Mídia')}
        </p>
        <p className="text-xs text-gray-400 mt-2">
          {message.created_at 
            ? format(new Date(message.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })
            : 'Agora'
          }
        </p>
      </div>
    </div>

    {isHovered && (
      <Button
        size="icon"
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation();
          onMessageClick(message);
        }}
        className="absolute top-2 right-2 h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 hover:bg-white border border-gray-200"
      >
        <ExternalLink className="w-3.5 h-3.5 text-green-600" />
      </Button>
    )}
  </div>
);
}

export default function NotificationBellContent() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [messages, setMessages] = useState([]);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [pushPermission, setPushPermission] = useState('default');
  const [user, setUser] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('notifications');

  // Carregar usuário
  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser);
      } catch (error) {
        console.error('Erro ao carregar usuário:', error);
      }
    };
    loadUser();
  }, []);

  // Verificar permissão de notificações push
  useEffect(() => {
    if ('Notification' in window) {
      setPushPermission(Notification.permission);
    }
  }, []);

  const loadNotifications = useCallback(async (showSpinner = false) => {
    if (!user?.id) {
      return;
    }
    
    try {
      if (showSpinner) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      
      const response = await base44.functions.invoke('getNotifications', { 
        limit: 10,
        offset: 0 
      });
      
      if (response.data?.success) {
        const newNotifications = response.data.notifications || [];
        const newUnreadCount = response.data.unread_count || 0;
        
        setNotifications(newNotifications);
        setUnreadCount(newUnreadCount);
      }
    } catch (error) {
      console.error('[NotificationBellContent] Erro ao carregar notificações:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  const loadMessages = useCallback(async () => {
    if (!user?.company_id) return;
    
    try {
      // Carregar listas de ocultas e deletadas do localStorage
      let hiddenConversations = [];
      let deletedConversations = [];
      try {
        hiddenConversations = JSON.parse(localStorage.getItem('hiddenConversations') || '[]');
        deletedConversations = JSON.parse(localStorage.getItem('deletedConversations') || '[]');
      } catch {}

      // Carregar mapa de leitura do Chat
      let readMapObj = {};
      try {
        readMapObj = JSON.parse(localStorage.getItem('chatReadMap') || '{}');
      } catch {}

      const allMessages = await Message.filter({
        company_id: user.company_id,
        direction: 'received'
      });

      // Agrupar por chat_id e pegar a última mensagem de cada conversa
      const messagesByChat = {};
      allMessages.forEach(msg => {
        if (!messagesByChat[msg.chat_id] || new Date(msg.created_at) > new Date(messagesByChat[msg.chat_id].created_at)) {
          messagesByChat[msg.chat_id] = msg;
        }
      });

      // Filtrar usando a mesma lógica do Chat (hasUnread)
      const unreadChats = Object.entries(messagesByChat).filter(([chatId, msg]) => {
        // Excluir conversas ocultas ou deletadas
        if (hiddenConversations.includes(chatId) || deletedConversations.includes(chatId)) {
          return false;
        }

        // Verificar se tem mensagem não lida (mesma lógica do Chat)
        const lastReadAt = readMapObj[msg.contact_id];
        if (lastReadAt) {
          return new Date(msg.created_at) > new Date(lastReadAt);
        }
        return true; // Se nunca leu, considera não lida
      });

      const recentMessages = unreadChats
        .map(([chatId, msg]) => msg)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 10);

      // Buscar contatos associados
      const contactIds = recentMessages
        .map(msg => msg.contact_id)
        .filter(Boolean);

      let contactsMap = {};
      if (contactIds.length > 0) {
        try {
          const contacts = await base44.entities.Contact.filter({
            id: { '$in': contactIds }
          });
          contactsMap = Object.fromEntries(contacts.map(c => [c.id, c]));
        } catch (error) {
          console.error('[NotificationBellContent] Erro ao buscar contatos:', error);
        }
      }

      // Enriquecer mensagens com dados do contato
      const enrichedMessages = recentMessages.map(msg => ({
        ...msg,
        contact: contactsMap[msg.contact_id] || null
      }));

      setMessages(enrichedMessages);
      setUnreadMessagesCount(enrichedMessages.length);

      window.dispatchEvent(new CustomEvent('messagesCountChanged', {
        detail: { count: enrichedMessages.length }
      }));
    } catch (error) {
      console.error('[NotificationBellContent] Erro ao carregar mensagens:', error);
    }
  }, [user]);

  // WebSocket para notificações e mensagens em tempo real
  const handleWebSocketMessage = useCallback((data) => {
    if (data.type === 'notification_created') {
      loadNotifications();
    }
    if (data.type === 'message_updated') {
      loadMessages();
    }
  }, [loadNotifications, loadMessages]);

  useWebSocket(
    user?.company_id,
    handleWebSocketMessage,
    ['notification_created', 'message_updated']
  );

  // Carregar ao montar e periodicamente
  useEffect(() => {
    if (user?.id) {
      loadNotifications();
      loadMessages();
      
      const interval = setInterval(() => {
        loadNotifications();
        loadMessages();
      }, 60000);
      
      return () => clearInterval(interval);
    }
  }, [loadNotifications, loadMessages, user?.id]);

  const handleMarkAsRead = async (notificationId) => {
    try {
      const response = await base44.functions.invoke('markNotificationRead', { notification_id: notificationId });
      
      if (response.data?.success) {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
        
        // Atualizar contagem global
        window.dispatchEvent(new CustomEvent('notificationCountChanged', {
          detail: { count: Math.max(0, unreadCount - 1) }
        }));
      }
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await base44.functions.invoke('markNotificationRead', { mark_all: true });
      
      if (response.data?.success) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
        
        // Atualizar contagem global
        window.dispatchEvent(new CustomEvent('notificationCountChanged', {
          detail: { count: 0 }
        }));
      }
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  };

  const handleNotificationClick = async (notification, e) => {
    if (e) e.stopPropagation();
    
    // Marcar como lida e visualizada
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

    // Navegar para a página de notificações com a notificação em destaque
    navigate(createPageUrl('Notifications'), { state: { highlightId: notification.id } });
  };

  const getNotificationIcon = (type, priority, category) => {
    // Ícones baseados na categoria (Admin)
    if (category) {
      switch (category) {
        case 'news': return <Megaphone className="w-5 h-5 text-blue-500" />;
        case 'improvement': return <Wrench className="w-5 h-5 text-green-500" />;
        case 'fix': return <CheckCircle2 className="w-5 h-5 text-orange-500" />;
        case 'warning': return <AlertTriangle className="w-5 h-5 text-red-500" />;
        case 'suggestion': return <Lightbulb className="w-5 h-5 text-purple-500" />;
        case 'invite': return <UserPlus className="w-5 h-5 text-indigo-500" />;
      }
    }

    // Fallback para tipos antigos
    switch (type) {
      case 'batch_expiring': return <Clock className="w-5 h-5 text-orange-500" />;
      case 'batch_expired': return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'campaign_completed': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'campaign_failed': return <AlertCircle className="w-5 h-5 text-red-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const handleAcceptInvite = async (e, notification) => {
    e.stopPropagation();
    try {
      const response = await base44.functions.invoke("acceptInvitation", { token: notification.data.token });
      if (response.data?.success) {
        await handleMarkAsRead(notification.id);
        window.location.reload();
      } else {
        alert("Erro ao aceitar: " + (response.data?.error || "Desconhecido"));
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao aceitar convite.");
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-red-500';
      case 'high':
        return 'border-l-orange-500';
      case 'normal':
        return 'border-l-blue-500';
      default:
        return 'border-l-gray-300';
    }
  };

  const handlePopoverOpen = () => {
    loadNotifications(true);
  };

  const handleMessageClick = async (message) => {
    // Marcar como lida no chatReadMap (mesma lógica do Chat)
    try {
      const now = new Date().toISOString();
      const mapRaw = localStorage.getItem('chatReadMap') || '{}';
      let map = {};
      try { map = JSON.parse(mapRaw); } catch {}
      
      // Usar contact_id se existir, senão usar chat_id como fallback
      const readKey = message.contact_id || `virtual-${message.chat_id?.split('@')[0]}`;
      map[readKey] = now;
      localStorage.setItem('chatReadMap', JSON.stringify(map));

      // Atualizar lista local
      setMessages(prev => prev.filter(m => m.id !== message.id));
      setUnreadMessagesCount(prev => Math.max(0, prev - 1));

      window.dispatchEvent(new CustomEvent('messagesCountChanged', {
        detail: { count: Math.max(0, unreadMessagesCount - 1) }
      }));
    } catch (error) {
      console.error('[NotificationBellContent] Erro ao marcar mensagem como lida:', error);
    }

    // Buscar contato associado
    let contactData = null;

    if (message.contact_id) {
      try {
        contactData = await base44.entities.Contact.get(message.contact_id);
      } catch (error) {
        console.error('[NotificationBellContent] Erro ao buscar contato:', error);
      }
    }

    // Navegar para Chat e abrir conversa
    navigate(createPageUrl('Chat'), { 
      state: { 
        selectedChatId: message.chat_id,
        contact: contactData
      } 
    });
  };

  return (
    <TooltipProvider>
      <div className="w-full">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-2 h-12 rounded-t-2xl border-b border-gray-100 bg-gray-50">
            <TabsTrigger value="notifications" className="relative rounded-tl-2xl data-[state=active]:bg-white">
              <Bell className="w-4 h-4 mr-2" />
              Notificações
              {unreadCount > 0 && (
                <Badge className="ml-2 h-5 min-w-[20px] flex items-center justify-center p-0 px-1.5 text-[10px] bg-red-500">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="messages" className="relative rounded-tr-2xl data-[state=active]:bg-white">
              <MessageSquare className="w-4 h-4 mr-2" />
              Mensagens
              {unreadMessagesCount > 0 && (
                <Badge className="ml-2 h-5 min-w-[20px] flex items-center justify-center p-0 px-1.5 text-[10px] bg-green-500">
                  {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notifications" className="mt-0">
            {unreadCount > 0 && (
              <div className="flex justify-end px-4 py-2 border-b border-gray-100 bg-white">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs text-blue-600 hover:text-blue-700 h-7 rounded-xl"
                  onClick={handleMarkAllAsRead}
                >
                  Marcar todas como lidas
                </Button>
              </div>
            )}

            <ScrollArea className="h-96">
              <div className="px-2 py-1">
                {isRefreshing ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  </div>
                ) : isLoading && notifications.length === 0 ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-gray-500">
                    <Bell className="w-12 h-12 text-gray-300 mb-2" />
                    <p className="text-sm font-medium">Nenhuma notificação</p>
                    <p className="text-xs text-gray-400">Você será notificado aqui</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {notifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onMarkAsRead={handleMarkAsRead}
                        onNotificationClick={handleNotificationClick}
                        onAcceptInvite={handleAcceptInvite}
                        getNotificationIcon={getNotificationIcon}
                      />
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>

            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-100 bg-gray-50/50">
                <Button 
                  variant="ghost" 
                  className="w-full text-sm text-gray-600 hover:text-gray-900 h-9 rounded-xl hover:bg-gray-100"
                  onClick={() => navigate(createPageUrl('Notifications'))}
                >
                  Ver todas as notificações
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="messages" className="mt-0">
            <ScrollArea className="h-96">
              <div className="px-2 py-1">
                {isRefreshing ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="w-6 h-6 animate-spin text-green-600" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-gray-500">
                    <MessageSquare className="w-12 h-12 text-gray-300 mb-2" />
                    <p className="text-sm font-medium">Nenhuma mensagem não lida</p>
                    <p className="text-xs text-gray-400">Mensagens aparecem aqui até serem lidas</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {messages.map((message) => (
                      <MessageItem
                        key={message.id}
                        message={message}
                        onMessageClick={handleMessageClick}
                      />
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>

            {messages.length > 0 && (
              <div className="p-3 border-t border-gray-100 bg-gray-50/50">
                <Button 
                  variant="ghost" 
                  className="w-full text-sm text-gray-600 hover:text-gray-900 h-9 rounded-xl hover:bg-gray-100"
                  onClick={() => navigate(createPageUrl('Chat'))}
                >
                  Ver todas as conversas
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}