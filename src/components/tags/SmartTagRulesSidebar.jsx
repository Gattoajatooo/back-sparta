
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { User } from "@/entities/User";
import {
  X,
  Save,
  Plus,
  Trash2,
  Zap,
  Settings,
  AlertCircle,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function SmartTagRulesSidebar({ tag, onClose, onSave }) {
  const [isLoading, setIsLoading] = useState(false);

  // Sidebar resizing states
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('smart_rules_sidebar_width');
    return saved ? parseInt(saved) : 500; // Default 500px
  });
  const [isResizing, setIsResizing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(500);

  const [rules, setRules] = useState({
    auto_apply: tag?.smart_rules?.auto_apply || false,
    conditions: tag?.smart_rules?.conditions || [],
    actions: tag?.smart_rules?.actions || []
  });

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
      if (user?.settings?.sidebar_preferences?.smart_rules_sidebar_width) {
        const width = user.settings.sidebar_preferences.smart_rules_sidebar_width;
        setSidebarWidth(width);
        localStorage.setItem('smart_rules_sidebar_width', width.toString());
      }
    } catch (error) {
      console.error("Erro ao carregar largura da sidebar:", error);
    }
  };

  const saveSidebarWidth = async (width) => {
    try {
      localStorage.setItem('smart_rules_sidebar_width', width.toString());
      const user = await User.me();
      if (user) {
        const currentSettings = JSON.parse(JSON.stringify(user.settings || {}));
        const updatedSettings = {
          ...currentSettings,
          sidebar_preferences: {
            ...(currentSettings.sidebar_preferences || {}),
            smart_rules_sidebar_width: width
          }
        };
        await User.updateMyUserData({ settings: updatedSettings });
      }
    } catch (e) {
      console.error('Erro ao salvar largura da sidebar de regras inteligentes:', e);
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

  const fieldOptions = [
    { value: 'status', label: 'Status' },
    { value: 'source', label: 'Origem' },
    { value: 'tags', label: 'Marcadores' },
    { value: 'birth_date', label: 'Data de Aniversário' },
    { value: 'first_name', label: 'Primeiro Nome' },
    { value: 'last_name', label: 'Sobrenome' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Telefone' },
    { value: 'company_name', label: 'Empresa' },
    { value: 'position', label: 'Cargo' }
  ];

  const operatorOptions = {
    default: [
      { value: 'equals', label: 'Igual a' },
      { value: 'not_equals', label: 'Diferente de' },
      { value: 'contains', label: 'Contém' }
    ],
    birth_date: [
      { value: 'birthday_in_current_week', label: 'Aniversário na semana atual' },
      { value: 'birthday_in_week', label: 'Aniversário na semana específica' },
      { value: 'birthday_in_current_month', label: 'Aniversário no mês atual' },
      { value: 'birthday_in_month', label: 'Aniversário no mês específico' },
      { value: 'birthday_on_day', label: 'Aniversário em dia específico' }
    ]
  };

  const addCondition = () => {
    setRules(prev => ({
      ...prev,
      conditions: [
        ...prev.conditions,
        { field: '', operator: '', value: '' }
      ]
    }));
  };

  const updateCondition = (index, updates) => {
    setRules(prev => ({
      ...prev,
      conditions: prev.conditions.map((condition, i) => 
        i === index ? { ...condition, ...updates } : condition
      )
    }));
  };

  const removeCondition = (index) => {
    setRules(prev => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index)
    }));
  };

  const handleSave = () => {
    setIsLoading(true);
    const updatedTag = {
      ...tag,
      is_smart: true,
      smart_rules: rules
    };
    onSave(updatedTag);
    setIsLoading(false);
  };

  const handleClose = () => {
    onClose();
  };

  const getOperatorsForField = (field) => {
    return operatorOptions[field] || operatorOptions.default;
  };

  const needsValue = (operator) => {
    return !['birthday_in_current_week', 'birthday_in_current_month'].includes(operator);
  };

  const getValuePlaceholder = (operator) => {
    switch (operator) {
      case 'birthday_in_week':
        return 'Ex: 25 (semana do ano)';
      case 'birthday_in_month':
        return 'Ex: 12 (dezembro)';
      case 'birthday_on_day':
        return 'Ex: 15/12 (15 de dezembro)';
      default:
        return 'Valor';
    }
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
            className="w-1 bg-transparent hover:bg-blue-400 hover:bg-opacity-50 cursor-ew-resize flex-shrink-0 relative group"
            onMouseDown={handleMouseDown}
            style={{ 
              cursor: isResizing ? 'ew-resize' : 'ew-resize',
              transition: 'background-color 0.2s'
            }}
          >
            <div className="absolute inset-y-0 -left-1 -right-1 bg-transparent group-hover:bg-blue-400 group-hover:bg-opacity-20"></div>
          </div>

          {/* Sidebar Content */}
          <div className="flex flex-col flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Configurar Regras</h2>
                  <p className="text-sm text-gray-600">Regras inteligentes para {tag.name}</p>
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
                  <span className="ml-2">Salvando...</span>
                </div>
              ) : (
                <div className="p-6" style={{ margin: 0 }}>
                  <div className="space-y-6" style={{ margin: 0 }}>
                    {/* Configurações do Marcador */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Configurações do Marcador</h3>
                      
                      <Card className="rounded-2xl border-gray-200">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Zap className="w-4 h-4 text-blue-600" />
                            {tag.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="auto-apply"
                              checked={rules.auto_apply}
                              onCheckedChange={(checked) => 
                                setRules(prev => ({ ...prev, auto_apply: checked }))
                              }
                              className="rounded-md"
                            />
                            <Label htmlFor="auto-apply" className="text-sm">
                              Aplicar automaticamente
                            </Label>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            Quando ativado, esta tag será aplicada automaticamente aos contatos que atendem às condições.
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Condições */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Condições</h3>
                        <Button
                          onClick={addCondition}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 rounded-xl"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Adicionar
                        </Button>
                      </div>

                      <div className="space-y-3">
                        {rules.conditions.map((condition, index) => (
                          <Card key={index} className="rounded-2xl border-gray-200">
                            <CardContent className="p-4">
                              <div className="space-y-3">
                                <div>
                                  <Label className="text-xs">Campo</Label>
                                  <Select
                                    value={condition.field}
                                    onValueChange={(value) => updateCondition(index, { 
                                      field: value, 
                                      operator: '', 
                                      value: '' 
                                    })}
                                  >
                                    <SelectTrigger className="rounded-xl border-gray-200">
                                      <SelectValue placeholder="Selecionar campo" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl z-[100002]">
                                      {fieldOptions.map(option => (
                                        <SelectItem key={option.value} value={option.value}>
                                          {option.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                {condition.field && (
                                  <div>
                                    <Label className="text-xs">Operador</Label>
                                    <Select
                                      value={condition.operator}
                                      onValueChange={(value) => updateCondition(index, { 
                                        operator: value, 
                                        value: '' 
                                      })}
                                    >
                                      <SelectTrigger className="rounded-xl border-gray-200">
                                        <SelectValue placeholder="Selecionar operador" />
                                      </SelectTrigger>
                                      <SelectContent className="rounded-xl z-[100002]">
                                        {getOperatorsForField(condition.field).map(option => (
                                          <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}

                                {condition.operator && needsValue(condition.operator) && (
                                  <div>
                                    <Label className="text-xs">Valor</Label>
                                    <Input
                                      value={condition.value}
                                      onChange={(e) => updateCondition(index, { value: e.target.value })}
                                      placeholder={getValuePlaceholder(condition.operator)}
                                      className="rounded-xl border-gray-200"
                                    />
                                  </div>
                                )}
                              </div>

                              <div className="flex justify-end mt-3">
                                <Button
                                  onClick={() => removeCondition(index)}
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                                >
                                  <Trash2 className="w-3 h-3 mr-1" />
                                  Remover
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}

                        {rules.conditions.length === 0 && (
                          <div className="text-center py-8 text-gray-500">
                            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                            <p className="text-sm">Nenhuma condição definida</p>
                            <p className="text-xs">Adicione condições para automatizar a aplicação da tag</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Info Box */}
                    <div className="bg-blue-50 rounded-2xl p-4">
                      <h3 className="font-semibold text-blue-900 mb-2 text-sm">Como funcionam as regras?</h3>
                      <ul className="text-xs text-blue-800 space-y-1">
                        <li>• Todas as condições devem ser atendidas (operador AND)</li>
                        <li>• Marcadores são aplicados automaticamente quando ativado</li>
                        <li>• Ideal para segmentação baseada em datas de aniversário</li>
                        <li>• O sistema verifica periodicamente os contatos</li>
                      </ul>
                    </div>
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
                Cancelar
              </Button>
              <Button 
                onClick={handleSave}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 rounded-xl"
              >
                <Save className="w-4 h-4 mr-2" />
                Salvar Regras
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
