
import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Tag as TagIcon,
  Zap,
  Palette,
  Settings,
  Edit,
  Plus,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function TagForm({ tag, smartTagTypes = [], onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: tag?.name || '',
    type: tag?.type || 'manual',
    color: tag?.color || '#3b82f6',
    description: tag?.description || '',
    is_smart: tag?.is_smart || false,
    smart_rules: tag?.smart_rules || {
      auto_apply: false,
      conditions: [],
      actions: []
    }
  });

  const [isLoading, setIsLoading] = useState(false);

  // Regras de aniversário (UI simplificada)
  const [birthdayRuleType, setBirthdayRuleType] = useState('none');
  const [birthdayWeek, setBirthdayWeek] = useState('');
  const [birthdayMonth, setBirthdayMonth] = useState('');
  const [birthdayDay, setBirthdayDay] = useState('');

  // Sidebar resizing states
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('tag_form_sidebar_width');
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
      if (user?.settings?.sidebar_preferences?.tag_form_sidebar_width) {
        const width = user.settings.sidebar_preferences.tag_form_sidebar_width;
        setSidebarWidth(width);
        localStorage.setItem('tag_form_sidebar_width', width.toString());
      }
    } catch (error) {
      console.error("Erro ao carregar largura da sidebar:", error);
    }
  };

  const saveSidebarWidth = async (width) => {
    try {
      localStorage.setItem('tag_form_sidebar_width', width.toString());
      const user = await User.me();
      if (user) {
        const currentSettings = JSON.parse(JSON.stringify(user.settings || {}));
        const updatedSettings = {
          ...currentSettings,
          sidebar_preferences: {
            ...(currentSettings.sidebar_preferences || {}),
            tag_form_sidebar_width: width
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

  const buildBirthdayCondition = () => {
    switch (birthdayRuleType) {
      case 'current_week':
        return { field: 'birth_date', operator: 'birthday_in_current_week', value: null };
      case 'week':
        if (!birthdayWeek) return null;
        return { field: 'birth_date', operator: 'birthday_in_week', value: birthdayWeek };
      case 'current_month':
        return { field: 'birth_date', operator: 'birthday_in_current_month', value: null };
      case 'month':
        if (!birthdayMonth) return null;
        return { field: 'birth_date', operator: 'birthday_in_month', value: birthdayMonth };
      case 'day':
        if (!birthdayDay) return null;
        return { field: 'birth_date', operator: 'birthday_on_day', value: birthdayDay };
      default:
        return null;
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);

    let finalFormData = { ...formData };

    if (formData.is_smart && birthdayRuleType !== 'none') {
      const birthdayCondition = buildBirthdayCondition();
      if (birthdayCondition) {
        finalFormData.smart_rules = {
          ...formData.smart_rules,
          conditions: [birthdayCondition]
        };
      }
    }

    onSubmit(finalFormData);
    setIsLoading(false);
  };

  const handleClose = () => {
    onCancel();
  };

  const colorOptions = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
    '#8b5cf6', '#06b6d4', '#84cc16', '#f97316',
    '#ec4899', '#6366f1', '#14b8a6', '#eab308'
  ];

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
                <div className="w-10 h-10 bg-gradient-to-br from-teal-600 to-teal-700 rounded-2xl flex items-center justify-center">
                  {tag ? (
                    <Edit className="w-5 h-5 text-white" />
                  ) : (
                    <Plus className="w-5 h-5 text-white" />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {tag ? 'Editar Marcador' : 'Novo Marcador'}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {tag ? 'Modificar informações do marcador' : 'Adicionar novo marcador'}
                  </p>
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
                <form onSubmit={handleSubmit} className="p-6" style={{ margin: 0 }}>
                  <div className="space-y-6" style={{ margin: 0 }}>
                    {/* Informações Básicas */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações Básicas</h3>
                      
                      <div className="mb-4">
                        <Label htmlFor="name">Nome do Marcador *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          required
                          className="rounded-xl border-gray-200"
                          placeholder="Digite o nome do marcador"
                        />
                      </div>

                      <div className="mb-4">
                        <Label htmlFor="description">Descrição</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                          className="rounded-xl border-gray-200 h-20"
                          placeholder="Descrição opcional do marcador"
                        />
                      </div>

                      <div className="mb-4">
                        <Label>Cor do Marcador</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {colorOptions.map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, color }))}
                              className={`w-8 h-8 rounded-full border-2 transition-all ${
                                formData.color === color ? 'border-gray-800 scale-110' : 'border-gray-300'
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Tipo de Marcador */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Tipo de Marcador</h3>
                      
                      <div className="flex items-center space-x-2 mb-4">
                        <Checkbox
                          id="is_smart"
                          checked={formData.is_smart}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_smart: checked }))}
                          className="rounded-md"
                        />
                        <Label htmlFor="is_smart" className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-blue-600" />
                          Marcador Inteligente
                        </Label>
                      </div>

                      {formData.is_smart && (
                        <Card className="rounded-2xl border-blue-200 bg-blue-50">
                          <CardContent className="p-4">
                            <div className="space-y-4">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="auto_apply"
                                  checked={formData.smart_rules.auto_apply}
                                  onCheckedChange={(checked) => 
                                    setFormData(prev => ({
                                      ...prev,
                                      smart_rules: { ...prev.smart_rules, auto_apply: checked }
                                    }))
                                  }
                                />
                                <Label htmlFor="auto_apply" className="text-sm">
                                  Aplicar automaticamente
                                </Label>
                              </div>

                              <div>
                                <Label>Regra de Aniversário</Label>
                                <Select 
                                  value={birthdayRuleType} 
                                  onValueChange={(value) => {
                                    setBirthdayRuleType(value);
                                    setBirthdayWeek('');
                                    setBirthdayMonth('');
                                    setBirthdayDay('');
                                  }}
                                >
                                  <SelectTrigger className="rounded-xl border-gray-200 mt-1">
                                    <SelectValue placeholder="Selecionar regra de aniversário" />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-xl z-[100002]">
                                    <SelectItem value="none">Nenhuma regra</SelectItem>
                                    <SelectItem value="current_week">Aniversário na semana atual</SelectItem>
                                    <SelectItem value="week">Aniversário em semana específica</SelectItem>
                                    <SelectItem value="current_month">Aniversário no mês atual</SelectItem>
                                    <SelectItem value="month">Aniversário em mês específico</SelectItem>
                                    <SelectItem value="day">Aniversário em dia específico</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {birthdayRuleType === 'week' && (
                                <div>
                                  <Label htmlFor="birthdayWeek">Semana do Ano (1-53)</Label>
                                  <Input
                                    id="birthdayWeek"
                                    type="number"
                                    min="1"
                                    max="53"
                                    value={birthdayWeek}
                                    onChange={(e) => setBirthdayWeek(e.target.value)}
                                    className="rounded-xl border-gray-200 mt-1"
                                    placeholder="Ex: 25"
                                  />
                                </div>
                              )}

                              {birthdayRuleType === 'month' && (
                                <div>
                                  <Label htmlFor="birthdayMonth">Mês (1-12)</Label>
                                  <Input
                                    id="birthdayMonth"
                                    type="number"
                                    min="1"
                                    max="12"
                                    value={birthdayMonth}
                                    onChange={(e) => setBirthdayMonth(e.target.value)}
                                    className="rounded-xl border-gray-200 mt-1"
                                    placeholder="Ex: 12 (dezembro)"
                                  />
                                </div>
                              )}

                              {birthdayRuleType === 'day' && (
                                <div>
                                  <Label htmlFor="birthdayDay">Dia Específico (DD/MM)</Label>
                                  <Input
                                    id="birthdayDay"
                                    value={birthdayDay}
                                    onChange={(e) => setBirthdayDay(e.target.value)}
                                    className="rounded-xl border-gray-200 mt-1"
                                    placeholder="Ex: 15/12"
                                  />
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                </form>
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
                onClick={handleSubmit}
                disabled={!formData.name || isLoading}
                className="bg-teal-600 hover:bg-teal-700 rounded-xl"
              >
                <Save className="w-4 h-4 mr-2" />
                {tag ? 'Atualizar' : 'Salvar'} Marcador
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
