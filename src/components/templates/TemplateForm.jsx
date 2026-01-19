import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  X, 
  Save, 
  XCircle, 
  Zap, 
  Eye, 
  Plus,
  FileText,
  Calendar,
  User,
  DollarSign,
  Building2,
  Phone,
  Mail,
  Gift,
  Clock,
  Calculator,
  MessageSquare
} from "lucide-react";
import { motion } from "framer-motion";

export default function TemplateForm({ 
  template, 
  templateCategories = [], 
  templateTypes = [], 
  onSubmit, 
  onCancel 
}) {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    category: template?.category || 'birthday',
    type: template?.type || 'whatsapp',
    subject: template?.subject || '',
    content: template?.content || '',
    variables: template?.variables || [],
    is_active: template?.is_active ?? true,
    tags: template?.tags || [],
    scheduling: template?.scheduling || {
      auto_send: false,
      trigger_event: 'birthday',
      trigger_days_before: 1,
      trigger_time: '10:00'
    }
  });

  const [preview, setPreview] = useState('');
  const [newTag, setNewTag] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);

  // Sample data for preview
  const sampleData = {
    customer: {
      first_name: 'Maria',
      last_name: 'Silva',
      email: 'maria@email.com',
      phone: '+55 11 99999-1234',
      company_name: 'Tech Solutions',
      birth_date: '1990-05-15',
      age: new Date().getFullYear() - 1990
    },
    greeting: {
      formal: 'Prezado(a)',
      friendly: 'Olá',
      time_based: new Date().getHours() < 12 ? 'Bom dia' : new Date().getHours() < 18 ? 'Boa tarde' : 'Boa noite'
    },
    billing: {
      amount: 'R$ 299,99',
      due_date: '30/01/2024',
      month: 'Janeiro'
    },
    promotion: {
      discount: '20',
      birthday_discount: '15'
    },
    date: {
      today: new Date().toLocaleDateString('pt-BR'),
      birth_date: '15/05/1990'
    },
    company: {
      name: 'Sparta Sync',
      signature: 'Equipe Sparta Sync\nAtendimento: (11) 99999-9999'
    }
  };

  // Available variables organized by category
  const availableVariables = {
    'Customer Info': [
      { key: 'customer.first_name', description: 'Nome do cliente', example: 'Maria' },
      { key: 'customer.last_name', description: 'Sobrenome do cliente', example: 'Silva' },
      { key: 'customer.email', description: 'Email do cliente', example: 'maria@email.com' },
      { key: 'customer.phone', description: 'Telefone do cliente', example: '+55 11 99999-1234' },
      { key: 'customer.company_name', description: 'Empresa do cliente', example: 'Tech Solutions' },
      { key: 'customer.birth_date', description: 'Data de nascimento', example: '15/05/1990' },
      { key: 'customer.age', description: 'Idade do cliente', example: '34' }
    ],
    'Greetings': [
      { key: 'greeting.formal', description: 'Saudação formal', example: 'Prezado(a)' },
      { key: 'greeting.friendly', description: 'Saudação amigável', example: 'Olá' },
      { key: 'greeting.time_based', description: 'Saudação baseada no horário', example: 'Bom dia' }
    ],
    'Billing': [
      { key: 'billing.amount', description: 'Valor da fatura', example: 'R$ 299,99' },
      { key: 'billing.due_date', description: 'Data de vencimento', example: '30/01/2024' },
      { key: 'billing.month', description: 'Mês da fatura', example: 'Janeiro' }
    ],
    'Promotions': [
      { key: 'promotion.discount', description: 'Percentual de desconto', example: '20' },
      { key: 'promotion.birthday_discount', description: 'Desconto de aniversário', example: '15' }
    ],
    'Dates': [
      { key: 'date.today', description: 'Data atual', example: '15/01/2024' },
      { key: 'date.birth_date', description: 'Data de nascimento', example: '15/05/1990' }
    ],
    'Company': [
      { key: 'company.name', description: 'Nome da empresa', example: 'Sparta Sync' },
      { key: 'company.signature', description: 'Assinatura da empresa', example: 'Equipe Sparta Sync' }
    ]
  };

  // Default categories if not provided
  const defaultCategories = [
    { id: 'birthday', name: 'Aniversário', icon: Gift },
    { id: 'billing', name: 'Cobrança', icon: DollarSign },
    { id: 'promotions', name: 'Promoções', icon: MessageSquare },
    { id: 'welcome', name: 'Boas-vindas', icon: Gift }
  ];

  // Default types if not provided
  const defaultTypes = [
    { id: 'whatsapp', name: 'WhatsApp', icon: MessageSquare },
    { id: 'email', name: 'Email', icon: Mail },
    { id: 'sms', name: 'SMS', icon: Phone }
  ];

  const categories = templateCategories.length > 0 ? templateCategories : defaultCategories;
  const types = templateTypes.length > 0 ? templateTypes : defaultTypes;

  useEffect(() => {
    generatePreview();
  }, [formData.content]);

  const generatePreview = () => {
    let previewText = formData.content;
    
    // Replace variables with sample data
    Object.entries(sampleData).forEach(([category, data]) => {
      if (typeof data === 'object') {
        Object.entries(data).forEach(([key, value]) => {
          const pattern = new RegExp(`{{${category}\\.${key}}}`, 'g');
          previewText = previewText.replace(pattern, value);
        });
      } else {
        const pattern = new RegExp(`{{${category}}}`, 'g');
        previewText = previewText.replace(pattern, data);
      }
    });
    
    setPreview(previewText);
  };

  const insertVariable = (variable) => {
    const textarea = document.getElementById('content-textarea');
    if (textarea) {
      const start = textarea.selectionStart || cursorPosition;
      const end = textarea.selectionEnd || cursorPosition;
      const text = formData.content;
      const before = text.substring(0, start);
      const after = text.substring(end, text.length);
      const newText = before + `{{${variable}}}` + after;
      
      setFormData(prev => ({ ...prev, content: newText }));
      
      // Update variables list
      if (!formData.variables.includes(variable)) {
        setFormData(prev => ({ 
          ...prev, 
          variables: [...prev.variables, variable] 
        }));
      }
      
      // Set focus back to textarea
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length + 4, start + variable.length + 4);
      }, 10);
    }
  };

  const handleTextareaChange = (e) => {
    setFormData(prev => ({ ...prev, content: e.target.value }));
    setCursorPosition(e.target.selectionStart);
  };

  const handleTextareaClick = (e) => {
    setCursorPosition(e.target.selectionStart);
  };

  const removeVariable = (variable) => {
    setFormData(prev => ({
      ...prev,
      variables: prev.variables.filter(v => v !== variable)
    }));
  };

  const addTag = () => {
    if (newTag && !formData.tags.includes(newTag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
    >
      <div className="w-full max-w-6xl max-h-[95vh] overflow-y-auto">
        <Card className="rounded-3xl border-gray-200 shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <FileText className="w-6 h-6 text-purple-600" />
                {template ? 'Editar Template' : 'Criar Novo Template'}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={onCancel} className="rounded-full">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit}>
              <Tabs defaultValue="basic" className="space-y-6">
                <TabsList className="grid grid-cols-3 rounded-2xl bg-gray-100 p-1 w-80">
                  <TabsTrigger value="basic" className="rounded-xl">Informações</TabsTrigger>
                  <TabsTrigger value="content" className="rounded-xl">Conteúdo</TabsTrigger>
                  <TabsTrigger value="settings" className="rounded-xl">Configurações</TabsTrigger>
                </TabsList>

                {/* Basic Information Tab */}
                <TabsContent value="basic" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome do Template *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="ex: Feliz Aniversário"
                        className="rounded-2xl border-gray-200"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Categoria *</Label>
                      <Select 
                        value={formData.category} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger className="rounded-2xl border-gray-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              <div className="flex items-center gap-2">
                                <cat.icon className="w-4 h-4" />
                                {cat.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Tipo de Mensagem *</Label>
                      <Select 
                        value={formData.type} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                      >
                        <SelectTrigger className="rounded-2xl border-gray-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
                          {types.map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                              <div className="flex items-center gap-2">
                                <type.icon className="w-4 h-4" />
                                {type.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Status</Label>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={formData.is_active}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                        />
                        <Label className="text-sm">
                          {formData.is_active ? 'Ativo' : 'Inativo'}
                        </Label>
                      </div>
                    </div>
                  </div>

                  {/* Subject for Email Templates */}
                  {formData.type === 'email' && (
                    <div className="space-y-2">
                      <Label htmlFor="subject">Assunto do Email *</Label>
                      <Input
                        id="subject"
                        value={formData.subject}
                        onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                        placeholder="ex: 🎉 Feliz Aniversário {{customer.first_name}}!"
                        className="rounded-2xl border-gray-200"
                        required={formData.type === 'email'}
                      />
                    </div>
                  )}

                  {/* Tags */}
                  <div className="space-y-2">
                    <Label>Tags</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {formData.tags.map((tag, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="rounded-full px-3 py-1 bg-blue-100 text-blue-800 border-blue-200"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="ml-2 hover:text-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                        placeholder="Adicionar tag"
                        className="flex-1 rounded-2xl border-gray-200"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addTag}
                        className="rounded-2xl"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                {/* Content & Variables Tab */}
                <TabsContent value="content" className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Content Editor */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="content-textarea">Conteúdo da Mensagem *</Label>
                        <div className="relative">
                          <Textarea
                            id="content-textarea"
                            value={formData.content}
                            onChange={handleTextareaChange}
                            onClick={handleTextareaClick}
                            placeholder="Digite seu template aqui..."
                            className="h-64 rounded-2xl border-gray-200 resize-none font-mono text-sm"
                            required
                            onDrop={(e) => {
                              e.preventDefault();
                              const variable = e.dataTransfer.getData('text/plain');
                              if (variable.startsWith('{{') && variable.endsWith('}}')) {
                                const textarea = e.target;
                                const start = textarea.selectionStart;
                                const end = textarea.selectionEnd;
                                const text = formData.content;
                                const before = text.substring(0, start);
                                const after = text.substring(end, text.length);
                                const newText = before + variable + after;
                                
                                setFormData(prev => ({ ...prev, content: newText }));
                                
                                // Update variables list
                                const variableKey = variable.slice(2, -2);
                                if (!formData.variables.includes(variableKey)) {
                                  setFormData(prev => ({ 
                                    ...prev, 
                                    variables: [...prev.variables, variableKey] 
                                  }));
                                }
                              }
                            }}
                            onDragOver={(e) => e.preventDefault()}
                          />
                          <div className="absolute top-2 right-2 text-xs text-gray-400 bg-white px-2 py-1 rounded">
                            Arraste variáveis aqui
                          </div>
                        </div>
                      </div>

                      {/* Used Variables */}
                      {formData.variables.length > 0 && (
                        <div className="space-y-2">
                          <Label>Variáveis Utilizadas</Label>
                          <div className="flex flex-wrap gap-2">
                            {formData.variables.map((variable, index) => (
                              <Badge
                                key={index}
                                variant="outline"
                                className="rounded-full px-3 py-1 bg-green-100 text-green-800 border-green-200"
                              >
                                <code className="text-xs">{'{{'}{variable}{'}}'}</code>
                                <button
                                  type="button"
                                  onClick={() => removeVariable(variable)}
                                  className="ml-2 hover:text-red-600"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Variable Library */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Zap className="w-5 h-5 text-green-600" />
                        <Label className="text-lg font-medium">Biblioteca de Variáveis</Label>
                      </div>
                      
                      <div className="space-y-4 max-h-80 overflow-y-auto border border-gray-200 rounded-2xl p-4">
                        {Object.entries(availableVariables).map(([category, variables]) => (
                          <div key={category} className="space-y-2">
                            <h4 className="font-medium text-sm text-gray-700 flex items-center gap-2">
                              {category === 'Customer Info' && <User className="w-4 h-4" />}
                              {category === 'Greetings' && <MessageSquare className="w-4 h-4" />}
                              {category === 'Billing' && <DollarSign className="w-4 h-4" />}
                              {category === 'Promotions' && <Gift className="w-4 h-4" />}
                              {category === 'Dates' && <Calendar className="w-4 h-4" />}
                              {category === 'Company' && <Building2 className="w-4 h-4" />}
                              {category}
                            </h4>
                            <div className="space-y-1">
                              {variables.map((variable) => (
                                <div
                                  key={variable.key}
                                  className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-xl cursor-pointer border border-transparent hover:border-blue-200 transition-all duration-200"
                                  draggable
                                  onDragStart={(e) => {
                                    e.dataTransfer.setData('text/plain', `{{${variable.key}}}`);
                                    e.dataTransfer.effectAllowed = 'copy';
                                  }}
                                  onClick={() => insertVariable(variable.key)}
                                  title="Arraste para o editor ou clique para inserir"
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <code className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                        {variable.key}
                                      </code>
                                      <span className="text-xs text-gray-400">📱</span>
                                    </div>
                                    <p className="text-xs text-gray-500 truncate mt-1">
                                      {variable.description}
                                    </p>
                                    <p className="text-xs text-gray-400 truncate">
                                      Ex: {variable.example}
                                    </p>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 rounded-full flex-shrink-0 opacity-50 hover:opacity-100"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Eye className="w-5 h-5 text-gray-600" />
                      <Label className="text-lg font-medium">Pré-visualização</Label>
                    </div>
                    <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50 min-h-32">
                      {formData.type === 'email' && formData.subject && (
                        <div className="mb-3 pb-3 border-b border-gray-200">
                          <p className="text-sm font-medium text-gray-700">Assunto:</p>
                          <div className="text-sm text-gray-900 font-mono">
                            {formData.subject.split(/({{[^}]+}})/g).map((part, index) => (
                              part.startsWith('{{') && part.endsWith('}}') ? (
                                <span 
                                  key={index} 
                                  className="bg-blue-100 text-blue-800 px-1 py-0.5 rounded border border-blue-200"
                                  title={`Variável: ${part.slice(2, -2)}`}
                                >
                                  {part}
                                </span>
                              ) : (
                                <span key={index}>{part}</span>
                              )
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="text-sm text-gray-800 font-mono whitespace-pre-wrap">
                        {preview ? (
                          formData.content.split(/({{[^}]+}})/g).map((part, index) => (
                            part.startsWith('{{') && part.endsWith('}}') ? (
                              <span 
                                key={index} 
                                className="bg-green-100 text-green-800 px-1 py-0.5 rounded border border-green-200"
                                title={`Variável: ${part.slice(2, -2)}`}
                              >
                                {/* Show the replaced value from preview */}
                                {preview.split(/({{[^}]+}})/g)[index] || part}
                              </span>
                            ) : (
                              <span key={index}>{part}</span>
                            )
                          ))
                        ) : (
                          'Comece a digitar para ver a pré-visualização...'
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Settings Tab */}
                <TabsContent value="settings" className="space-y-6">
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-600" />
                        Envio Automático
                      </h3>
                      
                      <div className="space-y-4 border border-gray-200 rounded-2xl p-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={formData.scheduling.auto_send}
                            onCheckedChange={(checked) => 
                              setFormData(prev => ({ 
                                ...prev, 
                                scheduling: { ...prev.scheduling, auto_send: checked }
                              }))
                            }
                          />
                          <Label className="text-sm font-medium">
                            Habilitar envio automático
                          </Label>
                        </div>

                        {formData.scheduling.auto_send && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                            <div className="space-y-2">
                              <Label>Evento Gatilho</Label>
                              <Select
                                value={formData.scheduling.trigger_event}
                                onValueChange={(value) => 
                                  setFormData(prev => ({ 
                                    ...prev, 
                                    scheduling: { ...prev.scheduling, trigger_event: value }
                                  }))
                                }
                              >
                                <SelectTrigger className="rounded-2xl border-gray-200">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl">
                                  <SelectItem value="birthday">Aniversário</SelectItem>
                                  <SelectItem value="anniversary">Aniversário de Cadastro</SelectItem>
                                  <SelectItem value="bill_due">Vencimento de Fatura</SelectItem>
                                  <SelectItem value="follow_up_days">Dias Após Último Contato</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label>Dias Antes</Label>
                              <Input
                                type="number"
                                min="0"
                                max="30"
                                value={formData.scheduling.trigger_days_before}
                                onChange={(e) => 
                                  setFormData(prev => ({ 
                                    ...prev, 
                                    scheduling: { 
                                      ...prev.scheduling, 
                                      trigger_days_before: parseInt(e.target.value) 
                                    }
                                  }))
                                }
                                className="rounded-2xl border-gray-200"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Horário de Envio</Label>
                              <Input
                                type="time"
                                value={formData.scheduling.trigger_time}
                                onChange={(e) => 
                                  setFormData(prev => ({ 
                                    ...prev, 
                                    scheduling: { ...prev.scheduling, trigger_time: e.target.value }
                                  }))
                                }
                                className="rounded-2xl border-gray-200"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Form Actions */}
              <div className="flex gap-3 pt-6 mt-6 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  className="flex-1 rounded-2xl"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-purple-600 hover:bg-purple-700 rounded-2xl"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {template ? 'Atualizar Template' : 'Criar Template'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}