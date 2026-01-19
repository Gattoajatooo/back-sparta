import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User } from "@/entities/User";
import {
  X,
  Save,
  FileText,
  Plus,
  Loader2,
  Eye,
  Variable,
  Palette
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Mapeamento de variáveis para nomes amigáveis
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

const PREDEFINED_VARIABLES = [
  { 
    category: 'Cliente', 
    variables: [
      { key: '{{customer.first_name}}', label: 'Nome' },
      { key: '{{customer.last_name}}', label: 'Sobrenome' },
      { key: '{{customer.full_name}}', label: 'Nome Completo' },
      { key: '{{customer.email}}', label: 'Email' },
      { key: '{{customer.phone}}', label: 'Telefone' },
      { key: '{{customer.company_name}}', label: 'Empresa' },
      { key: '{{customer.birth_date}}', label: 'Data de Nascimento' }
    ]
  },
  { 
    category: 'Saudações', 
    variables: [
      { key: '{{greeting.time_based}}', label: 'Saudação (Bom dia/Boa tarde/Boa noite)' }
    ]
  },
  { 
    category: 'Promoções', 
    variables: [
      { key: '{{promotion.title}}', label: 'Título da Promoção' },
      { key: '{{promotion.discount}}', label: 'Desconto' },
      { key: '{{promotion.expires}}', label: 'Data de Vencimento' }
    ]
  },
  { 
    category: 'Cobrança', 
    variables: [
      { key: '{{billing.amount}}', label: 'Valor da Fatura' },
      { key: '{{billing.due_date}}', label: 'Vencimento da Fatura' },
      { key: '{{billing.month}}', label: 'Mês da Fatura' }
    ]
  },
  { 
    category: 'Pagamento', 
    variables: [
      { key: '{{payment.link}}', label: 'Link de Pagamento' }
    ]
  }
];

export default function TemplateFormSidebar({ template, categories, types, isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    name: '',
    category: 'promotional',
    type: 'whatsapp',
    subject: '',
    content: '',
    variables: [],
    is_active: true,
    tags: [],
    preview_data: {
      customer: {
        first_name: 'João',
        last_name: 'Silva',
        email: 'joao.silva@email.com',
        phone: '+55 11 99999-1234',
        company_name: 'Empresa XYZ',
        birth_date: '1990-05-15'
      }
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showVariableHelper, setShowVariableHelper] = useState(false);

  // Sidebar resizing states
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('template_form_sidebar_width');
    return saved ? parseInt(saved) : 500; // Default 500px
  });
  const [isResizing, setIsResizing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(500);

  useEffect(() => {
    if (isOpen) {
      if (template) {
        // Editing existing template
        setFormData({
          name: template.name || '',
          category: template.category || 'promotional',
          type: template.type || 'whatsapp',
          subject: template.subject || '',
          content: template.content || '',
          variables: template.variables || [],
          is_active: template.is_active !== undefined ? template.is_active : true,
          tags: template.tags || [],
          preview_data: template.preview_data || {
            customer: {
              first_name: 'João',
              last_name: 'Silva',
              email: 'joao.silva@email.com',
              phone: '+55 11 99999-1234',
              company_name: 'Empresa XYZ',
              birth_date: '1990-05-15'
            }
          }
        });
      } else {
        // Adding new template - reset to defaults
        setFormData({
          name: '',
          category: 'promotional',
          type: 'whatsapp',
          subject: '',
          content: '',
          variables: [],
          is_active: true,
          tags: [],
          preview_data: {
            customer: {
              first_name: 'João',
              last_name: 'Silva',
              email: 'joao.silva@email.com',
              phone: '+55 11 99999-1234',
              company_name: 'Empresa XYZ',
              birth_date: '1990-05-15'
            }
          }
        });
      }
      
      loadSidebarWidth();
      // Prevenir scroll do body quando sidebar está aberto
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      // Restaurar scroll do body quando sidebar está fechado
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    }
  }, [isOpen, template]);

  const loadSidebarWidth = async () => {
    try {
      const user = await User.me();
      if (user?.settings?.sidebar_preferences?.template_form_sidebar_width) {
        const width = user.settings.sidebar_preferences.template_form_sidebar_width;
        setSidebarWidth(width);
        localStorage.setItem('template_form_sidebar_width', width.toString());
      }
    } catch (error) {
      console.error("Erro ao carregar largura da sidebar:", error);
    }
  };

  const saveSidebarWidth = async (width) => {
    try {
      localStorage.setItem('template_form_sidebar_width', width.toString());
      const user = await User.me();
      if (user) {
        const currentSettings = JSON.parse(JSON.stringify(user.settings || {}));
        const updatedSettings = {
          ...currentSettings,
          sidebar_preferences: {
            ...(currentSettings.sidebar_preferences || {}),
            template_form_sidebar_width: width
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.content.trim()) return;

    setIsLoading(true);
    try {
      // Extract variables from content
      const variables = extractVariablesFromContent(formData.content);
      await onSubmit({
        ...formData,
        variables
      });
    } catch (error) {
      console.error("Erro ao salvar modelo:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const extractVariablesFromContent = (content) => {
    const regex = /\{\{[^}]+\}\}/g;
    const matches = content.match(regex) || [];
    return [...new Set(matches)]; // Remove duplicates
  };

  const insertVariable = (variable) => {
    const textarea = document.getElementById('template-content');
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = formData.content.substring(0, start) + variable + formData.content.substring(end);
      setFormData(prev => ({ ...prev, content: newContent }));
      
      // Restore cursor position after the inserted variable
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    }
  };

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
                  <h2 className="text-xl font-bold text-white">
                    {template ? 'Editar Modelo' : 'Novo Modelo'}
                  </h2>
                  <p className="text-purple-100 text-sm">
                    {template ? 'Atualize as informações do modelo' : 'Crie um novo modelo de mensagem'}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-xl"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
                      <Label htmlFor="name">Nome do Modelo</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Ex: Feliz Aniversário"
                        className="rounded-xl border-gray-200"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Categoria</Label>
                        <Select
                          value={formData.category}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                        >
                          <SelectTrigger className="rounded-xl border-gray-200">
                            <SelectValue placeholder="Selecionar categoria" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Tipo</Label>
                        <Select
                          value={formData.type}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                        >
                          <SelectTrigger className="rounded-xl border-gray-200">
                            <SelectValue placeholder="Selecionar tipo" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {types.map((type) => (
                              <SelectItem key={type.id} value={type.id}>
                                {type.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {formData.type === 'email' && (
                      <div>
                        <Label htmlFor="subject">Assunto (Email)</Label>
                        <Input
                          id="subject"
                          value={formData.subject}
                          onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                          placeholder="Assunto do email"
                          className="rounded-xl border-gray-200"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Conteúdo */}
                <Card className="rounded-2xl border-gray-200">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Variable className="w-5 h-5 text-purple-600" />
                        Conteúdo da Mensagem
                      </CardTitle>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowVariableHelper(!showVariableHelper)}
                        className="rounded-xl"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Variáveis
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="template-content">Mensagem</Label>
                      <Textarea
                        id="template-content"
                        value={formData.content}
                        onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                        placeholder="Digite o conteúdo da mensagem..."
                        className="rounded-xl border-gray-200 min-h-32"
                        required
                      />
                    </div>

                    {/* Preview da mensagem */}
                    {formData.content && (
                      <div>
                        <Label>Pré-visualização</Label>
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                          <div 
                            className="text-sm text-gray-700 whitespace-pre-wrap preview-content"
                            dangerouslySetInnerHTML={{ 
                              __html: renderContentWithVariables(formData.content)
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Helper de Variáveis */}
                    {showVariableHelper && (
                      <Card className="rounded-xl border-purple-200 bg-purple-50">
                        <CardContent className="p-4">
                          <div className="space-y-4">
                            <h4 className="font-medium text-purple-900">Variáveis Disponíveis</h4>
                            <div className="space-y-3">
                              {PREDEFINED_VARIABLES.map((group) => (
                                <div key={group.category}>
                                  <p className="text-sm font-medium text-purple-800 mb-2">{group.category}</p>
                                  <div className="grid grid-cols-1 gap-2">
                                    {group.variables.map((variable) => (
                                      <Button
                                        key={variable.key}
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => insertVariable(variable.key)}
                                        className="text-left justify-start rounded-lg border-purple-200 hover:bg-purple-100 text-purple-700"
                                      >
                                        <Variable className="w-3 h-3 mr-2" />
                                        {variable.label}
                                      </Button>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </CardContent>
                </Card>

                {/* Configurações */}
                <Card className="rounded-2xl border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Palette className="w-5 h-5 text-purple-600" />
                      Configurações
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="is_active"
                        checked={formData.is_active}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                        className="rounded-md"
                      />
                      <Label htmlFor="is_active">Modelo ativo</Label>
                    </div>
                  </CardContent>
                </Card>
              </form>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="rounded-xl"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isLoading || !formData.name.trim() || !formData.content.trim()}
                  className="bg-purple-600 hover:bg-purple-700 rounded-xl"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {template ? 'Atualizar' : 'Criar'} Modelo
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>

          {/* CSS para variáveis */}
          <style jsx>{`
            .preview-content .variable-token {
              background: rgba(139, 92, 246, 0.1);
              border: 1px solid rgba(139, 92, 246, 0.3);
              border-radius: 6px;
              padding: 2px 6px;
              font-size: 12px;
              font-weight: 500;
              color: rgb(139, 92, 246);
              margin: 0 1px;
            }
          `}</style>
        </>
      )}
    </AnimatePresence>
  );
}