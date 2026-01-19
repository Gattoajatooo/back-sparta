
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User } from "@/entities/User";
import {
  X,
  Tag as TagIcon,
  Users,
  TrendingUp,
  Calendar,
  Zap,
  Edit,
  Settings,
  Loader2
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

export default function TagDetails({ tag, contacts = [], onClose, onEdit, onConfigureRules }) {
  const [isLoading, setIsLoading] = useState(false);

  // Sidebar resizing states
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('tag_details_sidebar_width');
    return saved ? parseInt(saved) : 500; // Default 500px
  });
  const [isResizing, setIsResizing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(500);

  useEffect(() => {
    loadSidebarWidth();
    // Prevenir scroll do body quando sidebar está aberto
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    };
  }, []);

  const loadSidebarWidth = async () => {
    try {
      const user = await User.me();
      if (user?.settings?.sidebar_preferences?.tag_details_sidebar_width) {
        const width = user.settings.sidebar_preferences.tag_details_sidebar_width;
        setSidebarWidth(width);
        localStorage.setItem('tag_details_sidebar_width', width.toString());
      }
    } catch (error) {
      console.error("Erro ao carregar largura da sidebar:", error);
    }
  };

  const saveSidebarWidth = async (width) => {
    try {
      localStorage.setItem('tag_details_sidebar_width', width.toString());
      const user = await User.me();
      if (user) {
        const currentSettings = JSON.parse(JSON.stringify(user.settings || {}));
        const updatedSettings = {
          ...currentSettings,
          sidebar_preferences: {
            ...(currentSettings.sidebar_preferences || {}),
            tag_details_sidebar_width: width
          }
        };
        await User.updateMyUserData({ settings: updatedSettings });
      }
    } catch (e) {
      console.error('Erro ao salvar largura da sidebar de detalhes da tag:', e);
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

  const handleClose = () => {
    onClose();
  };

  const taggedContacts = contacts.filter(contact => 
    contact.tags && contact.tags.includes(tag.name)
  );

  const formatPhone = (phone) => {
    if (!phone) return '';
    
    // Remove all non-numeric characters
    const numbers = phone.replace(/\D/g, '');
    
    // If starts with 55 (Brazil code), format accordingly
    if (numbers.startsWith('55') && numbers.length >= 12) {
      const areaCode = numbers.substring(2, 4);
      const remaining = numbers.substring(4);
      
      // Mobile number (9 digits after area code)
      if (remaining.length === 9) {
        const mobile = remaining.substring(0, 1);
        const part1 = remaining.substring(1, 5);
        const part2 = remaining.substring(5);
        return `+55 ${areaCode} ${mobile}${part1}-${part2}`;
      }
      // Landline (8 digits after area code)
      else if (remaining.length === 8) {
        const part1 = remaining.substring(0, 4);
        const part2 = remaining.substring(4);
        return `+55 ${areaCode} ${part1}-${part2}`;
      }
    }
    
    // Fallback: return as is with + prefix if not already there
    return phone.startsWith('+') ? phone : `+${phone}`;
  };

  return (
    <AnimatePresence>
      <div className="fixed top-0 left-0 w-screen h-screen z-[100000]" style={{ margin: 0 }}>
        {/* Overlay de fundo */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute w-full h-full bg-black/50"
          style={{ top: 0, left: 0, width: '100vw', height: '100vh', margin: 0 }}
          onClick={handleClose}
        />
        
        {/* Sidebar */}
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
          {/* Resize Handle */}
          <div
            className="w-1 bg-transparent hover:bg-teal-400 hover:bg-opacity-50 cursor-ew-resize flex-shrink-0 relative group"
            onMouseDown={handleMouseDown}
            style={{ 
              cursor: isResizing ? 'ew-resize' : 'ew-resize',
              transition: 'background-color 0.2s'
            }}
          >
            <div className="absolute inset-y-0 -left-1 -right-1 bg-transparent group-hover:bg-teal-400 group-hover:bg-opacity-20"></div>
          </div>

          {/* Sidebar Content */}
          <div className="flex flex-col flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white flex-shrink-0">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: tag.color + '20', color: tag.color }}
                >
                  <TagIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Detalhes do Marcador</h2>
                  <p className="text-sm text-gray-600">Informações e estatísticas</p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="rounded-full"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-0" style={{ margin: 0 }}>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="ml-2">Carregando...</span>
                </div>
              ) : (
                <div className="p-6" style={{ margin: 0 }}>
                  <div className="space-y-6" style={{ margin: 0 }}>
                    {/* Informações do Marcador */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações do Marcador</h3>
                      
                      <Card className="rounded-2xl border-gray-200">
                        <CardHeader className="pb-3">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-10 h-10 rounded-2xl flex items-center justify-center"
                              style={{ backgroundColor: tag.color + '20', color: tag.color }}
                            >
                              <TagIcon className="w-5 h-5" />
                            </div>
                            <div>
                              <CardTitle className="text-lg flex items-center gap-2">
                                {tag.name}
                                {tag.is_smart && (
                                  <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                                    <Zap className="w-3 h-3 mr-1" />
                                    Inteligente
                                  </Badge>
                                )}
                              </CardTitle>
                              <Badge variant="outline" className="text-xs rounded-full mt-1">
                                {tag.is_smart ? 'Marcador Inteligente' : 'Marcador Manual'}
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {tag.description && (
                            <p className="text-sm text-gray-600 mb-4">{tag.description}</p>
                          )}
                          
                          <div className="grid grid-cols-1 gap-4 text-sm">
                            <div>
                              <div className="flex items-center gap-1 text-gray-500 mb-1">
                                <Users className="w-3 h-3" />
                                <span>Contatos</span>
                              </div>
                              <div className="font-semibold">{tag.contacts_count || 0}</div>
                            </div>
                            <div>
                              <div className="flex items-center gap-1 text-gray-500 mb-1">
                                <TrendingUp className="w-3 h-3" />
                                <span>Uso Total</span>
                              </div>
                              <div className="font-semibold">{tag.usage_stats?.total_applied || 0}</div>
                            </div>
                            {tag.is_smart && (
                              <div>
                                <div className="flex items-center gap-1 text-gray-500 mb-1">
                                  <Zap className="w-3 h-3" />
                                  <span>Aplicação Automática</span>
                                </div>
                                <div className="font-semibold">
                                  {tag.smart_rules?.auto_apply ? 'Ativada' : 'Desativada'}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                            <Badge 
                              variant={tag.is_active ? "default" : "secondary"}
                              className="rounded-full text-xs"
                            >
                              {tag.is_active ? "Ativo" : "Inativo"}
                            </Badge>
                            <div className="text-xs text-gray-500">
                              {tag.created_date ? format(parseISO(tag.created_date), 'PPP', { locale: ptBR }) : '-'}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Contatos com esta Tag */}
                    {taggedContacts.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Contatos com este Marcador</h3>
                        
                        <Card className="rounded-2xl border-gray-200">
                          <CardContent className="p-4">
                            <div className="space-y-3 max-h-60 overflow-y-auto">
                              {taggedContacts.slice(0, 10).map((contact) => (
                                <div key={contact.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                                  <Avatar className="w-8 h-8">
                                    <AvatarFallback className="bg-gradient-to-br from-teal-400 to-teal-500 text-white text-xs">
                                      {contact.first_name?.[0]}{contact.last_name?.[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm text-gray-900 truncate">
                                      {contact.first_name} {contact.last_name}
                                    </p>
                                    <p className="text-xs text-gray-500 truncate">{contact.email}</p>
                                    {contact.phone && (
                                      <p className="text-xs text-gray-500 truncate">{formatPhone(contact.phone)}</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                              
                              {taggedContacts.length > 10 && (
                                <div className="text-center py-2 text-sm text-gray-500">
                                  e mais {taggedContacts.length - 10} contatos...
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer - Fixed */}
            <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-white flex-shrink-0">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose}
                className="rounded-xl"
              >
                Fechar
              </Button>
              <div className="flex gap-2">
                <Button
                  onClick={onEdit}
                  variant="outline"
                  className="rounded-xl"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </Button>
                
                {tag.is_smart && (
                  <Button
                    onClick={onConfigureRules}
                    className="bg-blue-600 hover:bg-blue-700 rounded-xl"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Configurar Regras
                  </Button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
