import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User } from "@/entities/User";
import { Communication } from "@/entities/Communication";
import {
  X,
  History,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Users,
  MessageSquare,
  Calendar,
  Activity,
  Eye,
  MousePointer,
  MessageCircle
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

export default function CampaignHistorySidebar({ campaign, isOpen, onClose }) {
  const [sendHistory, setSendHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('campaign_history_sidebar_width');
    return saved ? parseInt(saved) : 500;
  });
  const [isResizing, setIsResizing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(500);

  useEffect(() => {
    if (isOpen && campaign) {
      loadSendHistory();
      loadSidebarWidth();
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    };
  }, [isOpen, campaign]);

  const loadSendHistory = async () => {
    try {
      if (campaign?.id) {
        const history = await Communication.filter(
          { campaign_id: campaign.id },
          '-sent_date',
          100
        );
        setSendHistory(history);
      }
    } catch (error) {
      console.error("Erro ao carregar histórico de envio:", error);
      setSendHistory([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSidebarWidth = async () => {
    try {
      const user = await User.me();
      if (user?.settings?.sidebar_preferences?.campaign_history_sidebar_width) {
        const width = user.settings.sidebar_preferences.campaign_history_sidebar_width;
        setSidebarWidth(width);
        localStorage.setItem('campaign_history_sidebar_width', width.toString());
      }
    } catch (error) {
      console.error("Erro ao carregar largura da sidebar:", error);
    }
  };

  const saveSidebarWidth = async (width) => {
    try {
      localStorage.setItem('campaign_history_sidebar_width', width.toString());
      const user = await User.me();
      if (user) {
        const currentSettings = JSON.parse(JSON.stringify(user.settings || {}));
        const updatedSettings = {
          ...currentSettings,
          sidebar_preferences: {
            ...(currentSettings.sidebar_preferences || {}),
            campaign_history_sidebar_width: width
          }
        };
        await User.updateMyUserData({ settings: updatedSettings });
      }
    } catch (error) {
      console.error("Erro ao salvar largura da sidebar:", error);
    }
  };

  const handleMouseDown = (e) => {
    setIsResizing(true);
    setStartX(e.clientX);
    setStartWidth(sidebarWidth);
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  };

  const handleMouseMove = (e) => {
    if (!isResizing) return;
    const deltaX = startX - e.clientX;
    const newWidth = Math.min(Math.max(startWidth + deltaX, 400), 600);
    setSidebarWidth(newWidth);
  };

  const handleMouseUp = () => {
    if (isResizing) {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      saveSidebarWidth(sidebarWidth);
    }
  };

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, startX, startWidth, sidebarWidth]);

  if (!campaign) return null;

  const getStatusBadge = (status) => {
    const statusConfig = {
      sent: { color: 'bg-blue-100 text-blue-800', text: 'Enviado', icon: Send },
      delivered: { color: 'bg-green-100 text-green-800', text: 'Entregue', icon: CheckCircle2 },
      opened: { color: 'bg-purple-100 text-purple-800', text: 'Aberto', icon: Eye },
      clicked: { color: 'bg-orange-100 text-orange-800', text: 'Clicado', icon: MousePointer },
      replied: { color: 'bg-cyan-100 text-cyan-800', text: 'Respondeu', icon: MessageCircle },
      failed: { color: 'bg-red-100 text-red-800', text: 'Falhou', icon: XCircle },
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Pendente', icon: Clock }
    };

    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', text: status, icon: Clock };
    return (
      <Badge className={`${config.color} rounded-full text-xs flex items-center gap-1`}>
        <config.icon className="w-3 h-3" />
        {config.text}
      </Badge>
    );
  };

  const getHistoryStats = () => {
    return {
      total: sendHistory.length,
      delivered: sendHistory.filter(h => h.status === 'delivered').length,
      opened: sendHistory.filter(h => h.opened_date).length,
      clicked: sendHistory.filter(h => h.status === 'clicked').length,
      replied: sendHistory.filter(h => h.status === 'replied').length,
      failed: sendHistory.filter(h => h.status === 'failed').length
    };
  };

  const stats = getHistoryStats();

  const formatPhone = (phone) => {
    if (!phone) return '';
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.length === 13 && cleanPhone.startsWith('55')) {
      const area = cleanPhone.substring(2, 4);
      const firstPart = cleanPhone.substring(4, 9);
      const secondPart = cleanPhone.substring(9);
      return `+55 ${area} ${firstPart}-${secondPart}`;
    } else if (cleanPhone.length === 12 && cleanPhone.startsWith('55')) {
      const area = cleanPhone.substring(2, 4);
      const firstPart = cleanPhone.substring(4, 8);
      const secondPart = cleanPhone.substring(8);
      return `+55 ${area} ${firstPart}-${secondPart}`;
    }
    
    return phone;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed top-0 left-0 w-screen h-screen z-[100000]" style={{ margin: 0 }}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute w-full h-full bg-black/50"
            style={{ top: 0, left: 0, width: '100vw', height: '100vh', margin: 0 }}
            onClick={onClose}
          />
          
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute top-0 right-0 h-full bg-white shadow-2xl flex"
            style={{ 
              height: '100vh', 
              margin: 0, 
              width: `${sidebarWidth}px`,
              minWidth: '400px',
              maxWidth: '600px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="w-1 bg-transparent hover:bg-blue-400 hover:bg-opacity-50 cursor-ew-resize flex-shrink-0 relative group"
              onMouseDown={handleMouseDown}
            >
              <div className="absolute inset-y-0 -left-1 -right-1 bg-transparent group-hover:bg-blue-400 group-hover:bg-opacity-20"></div>
            </div>

            <div className="flex flex-col flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl flex items-center justify-center">
                    <History className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Histórico da Campanha</h2>
                    <p className="text-sm text-gray-600">{campaign.name}</p>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="rounded-full"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Stats Overview */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="text-center p-3 bg-blue-50 rounded-xl">
                    <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                      <Send className="w-4 h-4 text-blue-600" />
                    </div>
                    <p className="text-lg font-bold text-blue-600">{stats.total}</p>
                    <p className="text-xs text-blue-600">Total</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-xl">
                    <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    </div>
                    <p className="text-lg font-bold text-green-600">{stats.delivered}</p>
                    <p className="text-xs text-green-600">Entregues</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-xl">
                    <div className="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                      <Eye className="w-4 h-4 text-purple-600" />
                    </div>
                    <p className="text-lg font-bold text-purple-600">{stats.opened}</p>
                    <p className="text-xs text-purple-600">Abertos</p>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-xl">
                    <div className="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                      <XCircle className="w-4 h-4 text-red-600" />
                    </div>
                    <p className="text-lg font-bold text-red-600">{stats.failed}</p>
                    <p className="text-xs text-red-600">Falhas</p>
                  </div>
                </div>

                {/* Send History List */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Histórico de Envios
                  </h3>
                  
                  {isLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                      <p className="text-gray-500 mt-2">Carregando histórico...</p>
                    </div>
                  ) : sendHistory.length > 0 ? (
                    <div className="space-y-3">
                      {sendHistory.map((communication) => (
                        <Card key={communication.id} className="rounded-2xl border-gray-200">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Avatar className="w-10 h-10">
                                  <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-500 text-white text-sm font-medium">
                                    {communication.customer_name?.split(' ').map(n => n[0]).join('') || 'C'}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-gray-900">{communication.customer_name || 'Cliente'}</p>
                                  <div className="flex items-center gap-2 text-sm text-gray-500">
                                    {communication.type === 'whatsapp' && <MessageSquare className="w-3 h-3" />}
                                    {communication.type === 'email' && <Send className="w-3 h-3" />}
                                    <span className="capitalize">{communication.type}</span>
                                    {communication.customer_phone && (
                                      <span>• {formatPhone(communication.customer_phone)}</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="text-right">
                                <div className="flex items-center gap-2 mb-2">
                                  {getStatusBadge(communication.status)}
                                </div>
                                <p className="text-sm text-gray-500">
                                  {format(new Date(communication.sent_date || communication.created_date), 'dd/MM/yyyy HH:mm')}
                                </p>
                                
                                {/* Additional status indicators */}
                                <div className="flex items-center gap-2 mt-1">
                                  {communication.delivered_date && (
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                      Entregue
                                    </span>
                                  )}
                                  {communication.opened_date && (
                                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                                      Aberto
                                    </span>
                                  )}
                                  {communication.status === 'replied' && (
                                    <span className="text-xs bg-cyan-100 text-cyan-700 px-2 py-1 rounded">
                                      Respondeu
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* Message preview */}
                            {communication.content && (
                              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-700 line-clamp-2">
                                  {communication.content}
                                </p>
                              </div>
                            )}

                            {/* Error details if failed */}
                            {communication.status === 'failed' && communication.notes && (
                              <div className="mt-3 p-3 bg-red-50 rounded-lg">
                                <p className="text-xs text-red-700">
                                  <strong>Erro:</strong> {communication.notes}
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum envio encontrado</h3>
                      <p className="text-gray-500">Esta campanha ainda não foi executada</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end items-center p-6 border-t border-gray-200 bg-white flex-shrink-0">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose}
                  className="rounded-xl"
                >
                  Fechar
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}