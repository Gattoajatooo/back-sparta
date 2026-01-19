import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User } from "@/entities/User";
import {
  X,
  FileText,
  Eye,
  Edit,
  Calendar,
  Send,
  TrendingUp,
  MessageSquare,
  Zap,
  Activity,
  Users,
  CheckCircle2,
  Variable
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

// Mapeamento de variáveis para nomes amigáveis (mesmo do TemplateFormSidebar)
const VARIABLE_LABELS = {
  '{{customer.first_name}}': 'Nome',
  '{{customer.last_name}}': 'Sobrenome',
  '{{customer.full_name}}': 'Nome Completo',
  '{{customer.email}}': 'Email',
  '{{customer.phone}}': 'Telefone',
  '{{customer.company_name}}': 'Empresa',
  '{{customer.birth_date}}': 'Data de Nascimento',
  '{{greeting.time_based}}': 'Saudação',
  '{{promotion.title}}': 'Título da Promoção',
  '{{promotion.discount}}': 'Desconto',
  '{{promotion.expires}}': 'Vencimento',
  '{{billing.amount}}': 'Valor da Fatura',
  '{{billing.due_date}}': 'Vencimento da Fatura',
  '{{billing.month}}': 'Mês da Fatura',
  '{{payment.link}}': 'Link de Pagamento'
};

export default function TemplateDetailsSidebar({ template, isOpen, onClose, onEdit }) {
  // Sidebar resizing states
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('template_details_sidebar_width');
    return saved ? parseInt(saved) : 500; // Default 500px
  });
  const [isResizing, setIsResizing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(500);

  useEffect(() => {
    if (isOpen) {
      loadSidebarWidth();
      // Prevenir scroll do body quando sidebar está aberto
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      // Restaurar scroll do body quando sidebar está fechado
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    }
  }, [isOpen]);

  const loadSidebarWidth = async () => {
    try {
      const user = await User.me();
      if (user?.settings?.sidebar_preferences?.template_details_sidebar_width) {
        const width = user.settings.sidebar_preferences.template_details_sidebar_width;
        setSidebarWidth(width);
        localStorage.setItem('template_details_sidebar_width', width.toString());
      }
    } catch (error) {
      console.error("Erro ao carregar largura da sidebar:", error);
    }
  };

  const saveSidebarWidth = async (width) => {
    try {
      localStorage.setItem('template_details_sidebar_width', width.toString());
      const user = await User.me();
      if (user) {
        const currentSettings = JSON.parse(JSON.stringify(user.settings || {}));
        const updatedSettings = {
          ...currentSettings,
          sidebar_preferences: {
            ...(currentSettings.sidebar_preferences || {}),
            template_details_sidebar_width: width
          }
        };
        await User.updateMyUserData({ settings: updatedSettings });
      }
    } catch (e) {
      console.error('Erro ao salvar largura da sidebar:', e);
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

  // Renderizar conteúdo com variáveis estilizadas
  const renderContentWithVariables = (content) => {
    if (!content) return '';
    
    let result = content;
    Object.entries(VARIABLE_LABELS).forEach(([variable, label]) => {
      const regex = new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g');
      result = result.replace(regex, `<span class="variable-token">${label}</span>`);
    });
    
    return result;
  };

  if (!template) return null;

  const typeIcons = {
    whatsapp: MessageSquare,
    email: Send,
    sms: Zap
  };

  const TypeIcon = typeIcons[template.type] || MessageSquare;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={onClose}
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 right-0 bg-white border-l border-gray-200 flex flex-col z-50 shadow-2xl"
            style={{ width: `${sidebarWidth}px` }}
          >
            {/* Resize handle */}
            <div
              className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-blue-500 transition-colors bg-gray-200"
              onMouseDown={handleMouseDown}
            />

            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-purple-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Detalhes do Modelo</h2>
                  <p className="text-purple-100 text-sm">Visualizar informações do modelo</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onEdit}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-xl"
                >
                  <Edit className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Informações Básicas */}
              <Card className="rounded-2xl border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-purple-600" />
                    Informações Básicas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Nome</Label>
                    <p className="text-gray-900 font-medium">{template.name}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Categoria</Label>
                      <p className="text-gray-900 capitalize">{template.category}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Tipo</Label>
                      <div className="flex items-center gap-2">
                        <TypeIcon className="w-4 h-4 text-purple-600" />
                        <p className="text-gray-900 capitalize">{template.type}</p>
                      </div>
                    </div>
                  </div>

                  {template.subject && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Assunto</Label>
                      <p className="text-gray-900">{template.subject}</p>
                    </div>
                  )}

                  <div>
                    <Label className="text-sm font-medium text-gray-500">Status</Label>
                    <Badge 
                      variant="outline" 
                      className={`rounded-full text-xs ${
                        template.is_active 
                          ? 'bg-green-100 text-green-800 border-green-200' 
                          : 'bg-gray-100 text-gray-600 border-gray-200'
                      }`}
                    >
                      {template.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Conteúdo */}
              <Card className="rounded-2xl border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Variable className="w-5 h-5 text-purple-600" />
                    Conteúdo da Mensagem
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Conteúdo Original</Label>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                        {template.content}
                      </pre>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-500">Pré-visualização</Label>
                    <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-4 border border-purple-200">
                      <div 
                        className="text-sm text-gray-700 whitespace-pre-wrap preview-content"
                        dangerouslySetInnerHTML={{ 
                          __html: renderContentWithVariables(template.content)
                        }}
                      />
                    </div>
                  </div>

                  {template.variables && template.variables.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Variáveis Utilizadas</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {template.variables.map((variable, index) => (
                          <Badge key={index} variant="outline" className="rounded-lg bg-purple-50 text-purple-700 border-purple-200">
                            <Variable className="w-3 h-3 mr-1" />
                            {VARIABLE_LABELS[variable] || variable}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Estatísticas */}
              <Card className="rounded-2xl border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                    Estatísticas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-xl">
                      <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                        <Send className="w-4 h-4 text-blue-600" />
                      </div>
                      <p className="text-lg font-bold text-blue-600">{template.usage_count || 0}</p>
                      <p className="text-xs text-blue-600">Total Envios</p>
                    </div>

                    <div className="text-center p-3 bg-green-50 rounded-xl">
                      <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      </div>
                      <p className="text-lg font-bold text-green-600">{(template.success_rate || 0).toFixed(1)}%</p>
                      <p className="text-xs text-green-600">Taxa Sucesso</p>
                    </div>
                  </div>

                  <div className="text-center">
                    <Label className="text-sm font-medium text-gray-500">Último Uso</Label>
                    <p className="text-gray-900">
                      {template.last_used 
                        ? format(parseISO(template.last_used), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })
                        : 'Nunca usado'
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Informações de Sistema */}
              <Card className="rounded-2xl border-gray-200">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="w-5 h-5 text-purple-600" />
                    Informações do Sistema
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Criado em</Label>
                    <p className="text-gray-900">
                      {format(parseISO(template.created_date), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>

                  {template.updated_date && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Última atualização</Label>
                      <p className="text-gray-900">
                        {format(parseISO(template.updated_date), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  )}

                  {template.tags && template.tags.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Tags</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {template.tags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="rounded-lg">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="rounded-xl"
                >
                  Fechar
                </Button>
                <Button
                  onClick={onEdit}
                  className="bg-purple-600 hover:bg-purple-700 rounded-xl"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Editar Modelo
                </Button>
              </div>
            </div>
          </motion.div>

          {/* CSS para variáveis */}
          <style jsx>{`
            .preview-content .variable-token {
              background: rgba(139, 92, 246, 0.15);
              border: 1px solid rgba(139, 92, 246, 0.3);
              border-radius: 6px;
              padding: 2px 6px;
              font-size: 12px;
              font-weight: 500;
              color: rgb(139, 92, 246);
              margin: 0 1px;
              display: inline-block;
            }
          `}</style>
        </>
      )}
    </AnimatePresence>
  );
}