
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label"; // Corrected import
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User } from "@/entities/User";
import {
  X,
  Megaphone,
  Users,
  Calendar,
  Send,
  TrendingUp,
  Edit,
  History,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  MessageSquare,
  Target
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

export default function CampaignDetailsSidebar({ campaign, isOpen, onClose, onEdit, onViewHistory, contacts = [] }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('campaign_details_sidebar_width');
    return saved ? parseInt(saved) : 500;
  });
  const [isResizing, setIsResizing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(500);

  useEffect(() => {
    if (isOpen) {
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
  }, [isOpen]);

  const loadSidebarWidth = async () => {
    try {
      const user = await User.me();
      if (user?.settings?.sidebar_preferences?.campaign_details_sidebar_width) {
        const width = user.settings.sidebar_preferences.campaign_details_sidebar_width;
        setSidebarWidth(width);
        localStorage.setItem('campaign_details_sidebar_width', width.toString());
      }
    } catch (error) {
      console.error("Erro ao carregar largura da sidebar:", error);
    }
  };

  const saveSidebarWidth = async (width) => {
    try {
      localStorage.setItem('campaign_details_sidebar_width', width.toString());
      const user = await User.me();
      if (user) {
        const currentSettings = JSON.parse(JSON.stringify(user.settings || {}));
        const updatedSettings = {
          ...currentSettings,
          sidebar_preferences: {
            ...(currentSettings.sidebar_preferences || {}),
            campaign_details_sidebar_width: width
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
      draft: { color: 'bg-gray-100 text-gray-800', text: 'Rascunho' },
      pending_approval: { color: 'bg-yellow-100 text-yellow-800', text: 'Pendente' },
      approved: { color: 'bg-blue-100 text-blue-800', text: 'Aprovada' },
      scheduled: { color: 'bg-purple-100 text-purple-800', text: 'Agendada' },
      running: { color: 'bg-green-100 text-green-800', text: 'Executando' },
      paused: { color: 'bg-orange-100 text-orange-800', text: 'Pausada' },
      completed: { color: 'bg-green-100 text-green-800', text: 'Concluída' },
      cancelled: { color: 'bg-red-100 text-red-800', text: 'Cancelada' }
    };

    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', text: status };
    return (
      <Badge className={`${config.color} rounded-full text-xs`}>
        {config.text}
      </Badge>
    );
  };

  const getTypeColor = (type) => {
    const typeColors = {
      birthday: '#ec4899',
      billing: '#ef4444',
      welcome: '#10b981',
      promotional: '#3b82f6',
      retention: '#8b5cf6',
      follow_up: '#f59e0b',
      other: '#6b7280'
    };
    return typeColors[type] || '#6b7280';
  };

  const getTypeLabel = (type) => {
    const typeLabels = {
      birthday: 'Aniversário',
      billing: 'Cobrança',
      welcome: 'Boas-vindas',
      promotional: 'Promocional',
      retention: 'Retenção',
      follow_up: 'Follow-up',
      other: 'Outros'
    };
    return typeLabels[type] || type;
  };

  const targetContacts = contacts.filter(contact => 
    campaign.target_audience?.customer_ids?.includes(contact.id)
  );

  const formatPhone = (phone) => {
    if (!phone) return '';
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.length === 13 && cleanPhone.startsWith('55')) {
      // +55 11 99999-9999
      const area = cleanPhone.substring(2, 4);
      const firstPart = cleanPhone.substring(4, 9);
      const secondPart = cleanPhone.substring(9);
      return `+55 ${area} ${firstPart}-${secondPart}`;
    } else if (cleanPhone.length === 12 && cleanPhone.startsWith('55')) {
      // +55 11 9999-9999
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
                  <div 
                    className="w-10 h-10 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: `${getTypeColor(campaign.type)}20`, color: getTypeColor(campaign.type) }}
                  >
                    <Eye className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Detalhes da Campanha</h2>
                    <p className="text-sm text-gray-600">Informações completas e métricas</p>
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
                <div className="space-y-6">
                  {/* Informações da Campanha */}
                  <Card className="rounded-2xl border-gray-200">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-12 h-12 rounded-2xl flex items-center justify-center"
                          style={{ backgroundColor: `${getTypeColor(campaign.type)}20`, color: getTypeColor(campaign.type) }}
                        >
                          <Megaphone className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900">{campaign.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge 
                              className="text-white rounded-full text-xs"
                              style={{ backgroundColor: getTypeColor(campaign.type) }}
                            >
                              {getTypeLabel(campaign.type)}
                            </Badge>
                            {getStatusBadge(campaign.status)}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    
                    {campaign.description && (
                      <CardContent>
                        <p className="text-gray-600">{campaign.description}</p>
                      </CardContent>
                    )}
                  </Card>

                  {/* Métricas */}
                  <Card className="rounded-2xl border-gray-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Métricas da Campanha
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-blue-50 rounded-xl">
                          <p className="text-2xl font-bold text-blue-600">{campaign.count_contacts || 0}</p>
                          <p className="text-xs text-blue-600">Contatos</p>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-xl">
                          <p className="text-2xl font-bold text-green-600">{campaign.metrics?.messages_sent || 0}</p>
                          <p className="text-xs text-green-600">Enviadas</p>
                        </div>
                        <div className="text-center p-3 bg-purple-50 rounded-xl">
                          <p className="text-2xl font-bold text-purple-600">{campaign.metrics?.messages_delivered || 0}</p>
                          <p className="text-xs text-purple-600">Entregues</p>
                        </div>
                        <div className="text-center p-3 bg-orange-50 rounded-xl">
                          <p className="text-2xl font-bold text-orange-600">{campaign.metrics?.messages_opened || 0}</p>
                          <p className="text-xs text-orange-600">Abertas</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Público-Alvo */}
                  <Card className="rounded-2xl border-gray-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="w-5 h-5" />
                        Público-Alvo ({targetContacts.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {targetContacts.map((contact) => (
                          <div key={contact.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-500 text-white text-xs">
                                {contact.first_name?.[0]}{contact.last_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-gray-900 truncate">
                                {contact.first_name} {contact.last_name}
                              </p>
                              <p className="text-xs text-gray-500 truncate">{contact.email}</p>
                              {contact.phone && (
                                <p className="text-xs text-gray-500">{formatPhone(contact.phone)}</p>
                              )}
                            </div>
                          </div>
                        ))}
                        
                        {targetContacts.length === 0 && (
                          <div className="text-center py-8">
                            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p className="text-sm text-gray-500">Nenhum contato selecionado</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Marcadores */}
                  {campaign.target_audience?.tags && campaign.target_audience.tags.length > 0 && (
                    <Card className="rounded-2xl border-gray-200">
                      <CardHeader>
                        <CardTitle className="text-base">Marcadores</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {campaign.target_audience.tags.map((tag, index) => (
                            <Badge key={index} className="bg-gray-100 text-gray-800 rounded-full">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Conteúdo da Mensagem */}
                  {campaign.message_content && (
                    <Card className="rounded-2xl border-gray-200">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <MessageSquare className="w-5 h-5" />
                          Conteúdo da Mensagem
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {campaign.message_content.subject && (
                          <div className="mb-3">
                            <Label className="text-xs font-medium text-gray-500">ASSUNTO</Label>
                            <p className="text-sm font-medium text-gray-900">{campaign.message_content.subject}</p>
                          </div>
                        )}
                        {campaign.message_content.body && (
                          <div className="bg-gray-50 rounded-xl p-4">
                            <Label className="text-xs font-medium text-gray-500">MENSAGEM</Label>
                            <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{campaign.message_content.body}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Informações de Data */}
                  <Card className="rounded-2xl border-gray-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Datas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs font-medium text-gray-500">CRIADA EM</Label>
                          <p className="text-sm text-gray-900">
                            {format(parseISO(campaign.created_date), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                        
                        {campaign.schedule?.scheduled_date && (
                          <div>
                            <Label className="text-xs font-medium text-gray-500">AGENDADA PARA</Label>
                            <p className="text-sm text-gray-900">
                              {format(parseISO(campaign.schedule.scheduled_date), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        )}

                        {campaign.start_date && (
                          <div>
                            <Label className="text-xs font-medium text-gray-500">INICIADA EM</Label>
                            <p className="text-sm text-gray-900">
                              {format(parseISO(campaign.start_date), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        )}

                        {campaign.end_date && (
                          <div>
                            <Label className="text-xs font-medium text-gray-500">FINALIZADA EM</Label>
                            <p className="text-sm text-gray-900">
                              {format(parseISO(campaign.end_date), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-white flex-shrink-0">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => onViewHistory(campaign)}
                  className="rounded-xl"
                >
                  <History className="w-4 h-4 mr-2" />
                  Ver Histórico
                </Button>
                <Button 
                  onClick={() => onEdit(campaign)}
                  className="bg-purple-600 hover:bg-purple-700 rounded-xl"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Editar Campanha
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
