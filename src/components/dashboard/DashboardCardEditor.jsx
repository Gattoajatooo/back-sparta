
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Save,
  X,
  Settings
} from "lucide-react";

export default function DashboardCardEditor({ card, onClose, onSave }) {
  const [title, setTitle] = useState(card.title);
  const [settings, setSettings] = useState(card.settings || {});

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = () => {
    onSave({
      title,
      settings
    });
  };

  const renderSettings = () => {
    switch (card.type) {
      case 'stats':
        return (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Métricas para Exibir</h4>
            <div className="space-y-3">
              {[
                { key: 'showTotalContacts', label: 'Total de Contatos' },
                { key: 'showActiveCampaigns', label: 'Campanhas Ativas' },
                { key: 'showRecentActivities', label: 'Atividades Recentes' },
                { key: 'showConversionRate', label: 'Taxa de Conversão' }
              ].map((item) => (
                <div key={item.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={item.key}
                    checked={settings[item.key] !== false}
                    onCheckedChange={(checked) => handleSettingChange(item.key, checked)}
                  />
                  <Label htmlFor={item.key}>{item.label}</Label>
                </div>
              ))}
            </div>
            
            <div>
              <Label>Layout</Label>
              <Select 
                value={settings.layout || 'grid'} 
                onValueChange={(value) => handleSettingChange('layout', value)}
              >
                <SelectTrigger className="rounded-xl border-gray-200 mt-1">
                  <SelectValue placeholder="Selecione um layout" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="grid">Grade</SelectItem>
                  <SelectItem value="list">Lista</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'activity':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="maxItems">Máximo de Itens</Label>
              <Input
                id="maxItems"
                type="number"
                min="1"
                max="20"
                value={settings.maxItems || 8}
                onChange={(e) => handleSettingChange('maxItems', parseInt(e.target.value))}
                className="rounded-xl border-gray-200 mt-1"
              />
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showStatus"
                  checked={settings.showStatus !== false}
                  onCheckedChange={(checked) => handleSettingChange('showStatus', checked)}
                />
                <Label htmlFor="showStatus">Mostrar Status</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showDuration"
                  checked={settings.showDuration !== false}
                  onCheckedChange={(checked) => handleSettingChange('showDuration', checked)}
                />
                <Label htmlFor="showDuration">Mostrar Duração</Label>
              </div>
            </div>
          </div>
        );

      case 'contacts':
        return (
          <div className="space-y-4">
            <div>
              <Label>Ordenar Por</Label>
              <Select 
                value={settings.sortBy || 'value'} 
                onValueChange={(value) => handleSettingChange('sortBy', value)}
              >
                <SelectTrigger className="rounded-xl border-gray-200 mt-1">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="value">Valor</SelectItem>
                  <SelectItem value="name">Nome</SelectItem>
                  <SelectItem value="recent">Mais Recente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="maxItems">Máximo de Contatos</Label>
              <Input
                id="maxItems"
                type="number"
                min="1"
                max="20"
                value={settings.maxItems || 5}
                onChange={(e) => handleSettingChange('maxItems', parseInt(e.target.value))}
                className="rounded-xl border-gray-200 mt-1"
              />
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showValue"
                  checked={settings.showValue !== false}
                  onCheckedChange={(checked) => handleSettingChange('showValue', checked)}
                />
                <Label htmlFor="showValue">Mostrar Valor</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showStatus"
                  checked={settings.showStatus !== false}
                  onCheckedChange={(checked) => handleSettingChange('showStatus', checked)}
                />
                <Label htmlFor="showStatus">Mostrar Status</Label>
              </div>
            </div>
          </div>
        );

      case 'campaigns':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="maxCampaigns">Máximo de Campanhas</Label>
              <Input
                id="maxCampaigns"
                type="number"
                min="1"
                max="10"
                value={settings.maxCampaigns || 4}
                onChange={(e) => handleSettingChange('maxCampaigns', parseInt(e.target.value))}
                className="rounded-xl border-gray-200 mt-1"
              />
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showMetrics"
                  checked={settings.showMetrics !== false}
                  onCheckedChange={(checked) => handleSettingChange('showMetrics', checked)}
                />
                <Label htmlFor="showMetrics">Mostrar Métricas</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showROI"
                  checked={settings.showROI !== false}
                  onCheckedChange={(checked) => handleSettingChange('showROI', checked)}
                />
                <Label htmlFor="showROI">Mostrar ROI</Label>
              </div>
            </div>
          </div>
        );

      case 'chart':
        return (
          <div className="space-y-4">
            <div>
              <Label>Tipo de Gráfico</Label>
              <Select 
                value={settings.chartType || 'line'} 
                onValueChange={(value) => handleSettingChange('chartType', value)}
              >
                <SelectTrigger className="rounded-xl border-gray-200 mt-1">
                  <SelectValue placeholder="Selecione o tipo de gráfico" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="line">Linha</SelectItem>
                  <SelectItem value="bar">Barra</SelectItem>
                  <SelectItem value="pie">Pizza</SelectItem>
                  <SelectItem value="area">Área</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Fonte de Dados</Label>
              <Select 
                value={settings.dataSource || 'contacts'} 
                onValueChange={(value) => handleSettingChange('dataSource', value)}
              >
                <SelectTrigger className="rounded-xl border-gray-200 mt-1">
                  <SelectValue placeholder="Selecione a fonte de dados" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="contacts">Contatos</SelectItem>
                  <SelectItem value="campaigns">Campanhas</SelectItem>
                  <SelectItem value="activities">Atividades</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Período</Label>
              <Select 
                value={settings.timeRange || '30d'} 
                onValueChange={(value) => handleSettingChange('timeRange', value)}
              >
                <SelectTrigger className="rounded-xl border-gray-200 mt-1">
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="7d">7 dias</SelectItem>
                  <SelectItem value="30d">30 dias</SelectItem>
                  <SelectItem value="90d">90 dias</SelectItem>
                  <SelectItem value="1y">1 ano</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-8 text-gray-500">
            <Settings className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p>Nenhuma configuração disponível para este tipo de card</p>
          </div>
        );
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <span>Editar Card</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Card Title */}
          <div>
            <Label htmlFor="title">Título do Card</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-xl border-gray-200 mt-1"
            />
          </div>

          {/* Card Settings */}
          <Card className="rounded-2xl border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg">Configurações</CardTitle>
            </CardHeader>
            <CardContent>
              {renderSettings()}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-between items-center pt-6 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button 
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-700 rounded-xl"
            >
              <Save className="w-4 h-4 mr-2" />
              Salvar Alterações
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
