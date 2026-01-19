import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  X,
  Edit,
  Eye,
  MessageSquare,
  Send,
  Zap,
  Gift,
  DollarSign,
  Heart,
  Megaphone,
  Star,
  Clock,
  AlertTriangle,
  Target,
  Calendar,
  TrendingUp,
  CheckCircle2,
  XCircle,
  BarChart3,
  Users,
  Tag,
  Sparkles
} from "lucide-react";
import { format } from "date-fns";

export default function TemplateDetailsModal({ 
  open, 
  onClose, 
  template, 
  onEdit 
}) {
  const [showPreview, setShowPreview] = useState(false);

  const templateCategories = [
    { id: 'birthday', name: 'Aniversário', icon: Gift, color: 'bg-pink-100 text-pink-800' },
    { id: 'billing', name: 'Cobrança', icon: DollarSign, color: 'bg-red-100 text-red-800' },
    { id: 'congratulations', name: 'Felicitações', icon: Heart, color: 'bg-green-100 text-green-800' },
    { id: 'promotions', name: 'Promoções', icon: Megaphone, color: 'bg-blue-100 text-blue-800' },
    { id: 'welcome', name: 'Boas-vindas', icon: Star, color: 'bg-yellow-100 text-yellow-800' },
    { id: 'follow_up', name: 'Follow-up', icon: Clock, color: 'bg-purple-100 text-purple-800' },
    { id: 'reminders', name: 'Lembretes', icon: AlertTriangle, color: 'bg-orange-100 text-orange-800' },
    { id: 'surveys', name: 'Pesquisas', icon: Target, color: 'bg-indigo-100 text-indigo-800' },
    { id: 'seasonal', name: 'Sazonais', icon: Calendar, color: 'bg-teal-100 text-teal-800' },
    { id: 'retention', name: 'Retenção', icon: TrendingUp, color: 'bg-emerald-100 text-emerald-800' }
  ];

  const templateTypes = [
    { id: 'whatsapp', name: 'WhatsApp', icon: MessageSquare, color: 'bg-green-100 text-green-800' },
    { id: 'email', name: 'Email', icon: Send, color: 'bg-blue-100 text-blue-800' },
    { id: 'sms', name: 'SMS', icon: Zap, color: 'bg-purple-100 text-purple-800' }
  ];

  const handleClose = () => {
    onClose();
  };

  const getCategoryData = () => {
    return templateCategories.find(cat => cat.id === template?.category) || templateCategories[0];
  };

  const getTypeData = () => {
    return templateTypes.find(type => type.id === template?.type) || templateTypes[0];
  };

  const renderPreview = () => {
    if (!template) return "";
    
    let previewContent = template.content;
    const previewData = template.preview_data?.customer || {
      first_name: "João",
      last_name: "Silva",
      email: "joao@empresa.com",
      phone: "+55 11 99999-9999",
      birth_date: "1990-05-15",
      company_name: "Empresa Exemplo"
    };

    // Replace variables with preview data
    previewContent = previewContent
      .replace(/\{\{first_name\}\}/g, previewData.first_name || "[Nome]")
      .replace(/\{\{last_name\}\}/g, previewData.last_name || "[Sobrenome]")
      .replace(/\{\{full_name\}\}/g, `${previewData.first_name || "[Nome]"} ${previewData.last_name || "[Sobrenome]"}`)
      .replace(/\{\{email\}\}/g, previewData.email || "[email@exemplo.com]")
      .replace(/\{\{phone\}\}/g, previewData.phone || "[telefone]")
      .replace(/\{\{company_name\}\}/g, previewData.company_name || "[Empresa]")
      .replace(/\{\{birth_date\}\}/g, previewData.birth_date || "[Data de Nascimento]")
      .replace(/\{\{current_date\}\}/g, new Date().toLocaleDateString('pt-BR'))
      .replace(/\{\{current_time\}\}/g, new Date().toLocaleTimeString('pt-BR'));

    return previewContent;
  };

  if (!open || !template) return null;

  const categoryData = getCategoryData();
  const typeData = getTypeData();
  const CategoryIcon = categoryData.icon;
  const TypeIcon = typeData.icon;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent 
        className="w-[900px] max-w-[95vw] max-h-[90vh] p-0 bg-white rounded-[2.5rem] border-gray-200 [&>button]:hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Detalhes do Modelo</h2>
                <p className="text-sm text-gray-600">Visualização completa do template</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8 rounded-lg"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* Informações Básicas */}
              <Card className="rounded-3xl border-gray-200">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="w-5 h-5 text-blue-600" />
                    Informações Básicas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Nome do Modelo</label>
                      <p className="text-lg font-semibold text-gray-900 mt-1">{template.name}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">Status</label>
                      <div className="mt-1">
                        <Badge className={`rounded-full ${template.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {template.is_active ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Ativo
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 mr-1" />
                              Inativo
                            </>
                          )}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Categoria</label>
                      <div className="mt-1 flex items-center gap-2">
                        <div className={`w-8 h-8 ${categoryData.color} rounded-lg flex items-center justify-center`}>
                          <CategoryIcon className="w-4 h-4" />
                        </div>
                        <span className="font-medium">{categoryData.name}</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">Tipo de Mensagem</label>
                      <div className="mt-1 flex items-center gap-2">
                        <div className={`w-8 h-8 ${typeData.color} rounded-lg flex items-center justify-center`}>
                          <TypeIcon className="w-4 h-4" />
                        </div>
                        <span className="font-medium">{typeData.name}</span>
                      </div>
                    </div>
                  </div>

                  {template.subject && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Assunto</label>
                      <p className="text-gray-900 mt-1">{template.subject}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Conteúdo */}
              <Card className="rounded-3xl border-gray-200">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-blue-600" />
                      Conteúdo
                      {template.is_smart_template && (
                        <Badge className="bg-purple-100 text-purple-700 border-purple-300">
                          <Sparkles className="w-3 h-3 mr-1" />
                          Modelo Inteligente
                        </Badge>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPreview(!showPreview)}
                      className="rounded-xl"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      {showPreview ? 'Ocultar Pré-visualização' : 'Ver Pré-visualização'}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Mensagem Original</label>
                    <div className="mt-1 p-4 bg-gray-50 rounded-xl border">
                      <div className="whitespace-pre-wrap text-sm font-mono">
                        {template.content}
                      </div>
                    </div>
                  </div>

                  {template.is_smart_template && template.content_variations && template.content_variations.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Variações Geradas ({template.content_variations.length})
                      </label>
                      <div className="mt-2 space-y-2 max-h-96 overflow-y-auto">
                        {template.content_variations.map((variation, index) => (
                          <div key={index} className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className="bg-blue-100 text-blue-700 border-blue-300 text-xs">
                                <Sparkles className="w-3 h-3 mr-1" />
                                Variação {index + 1}
                              </Badge>
                            </div>
                            <div className="whitespace-pre-wrap text-sm font-mono text-gray-800">
                              {variation}
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Total de mensagens: {template.content_variations.length + 1} (original + {template.content_variations.length} variações)
                      </p>
                    </div>
                  )}

                  {showPreview && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Pré-visualização (Original)</label>
                      <div className="mt-1 p-4 bg-blue-50 rounded-xl border border-blue-200">
                        <div className="whitespace-pre-wrap text-sm">
                          {renderPreview()}
                        </div>
                      </div>
                    </div>
                  )}

                  {template.variables && template.variables.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Variáveis Utilizadas</label>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {template.variables.map((variable, index) => (
                          <Badge key={index} variant="outline" className="rounded-full font-mono text-xs">
                            {variable}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>



              {/* Tags e Metadados */}
              <Card className="rounded-3xl border-gray-200">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Tag className="w-5 h-5 text-blue-600" />
                    Tags e Metadados
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {template.tags && template.tags.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Tags</label>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {template.tags.map((tag, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="rounded-full px-3 py-1 bg-blue-100 text-blue-800 border-blue-200"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Data de Criação</label>
                      <p className="text-gray-900 mt-1">
                        {format(new Date(template.created_date), 'dd/MM/yyyy HH:mm')}
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">Última Atualização</label>
                      <p className="text-gray-900 mt-1">
                        {format(new Date(template.updated_date), 'dd/MM/yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center gap-3 p-6 bg-gray-50 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="rounded-xl"
          >
            Fechar
          </Button>
          
          <Button
            onClick={() => onEdit()}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Edit className="w-4 h-4 mr-2" />
            Editar Modelo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}