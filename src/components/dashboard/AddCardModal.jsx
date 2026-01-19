
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users,
  Tag,
  Activity,
  TrendingUp,
  BarChart3,
  Zap,
  Plus,
  X
} from "lucide-react";

export default function AddCardModal({ onClose, onAdd }) {
  const [selectedType, setSelectedType] = useState("");
  const [cardTitle, setCardTitle] = useState("");

  const cardTypes = [
    {
      id: 'stats',
      name: 'Estatísticas',
      description: 'Visão geral com métricas importantes',
      icon: TrendingUp,
      color: 'bg-blue-500'
    },
    {
      id: 'activity',
      name: 'Atividades Recentes',
      description: 'Lista das últimas atividades',
      icon: Activity,
      color: 'bg-green-500'
    },
    {
      id: 'contacts',
      name: 'Top Contatos',
      description: 'Lista dos contatos mais valiosos',
      icon: Users,
      color: 'bg-purple-500'
    },
    {
      id: 'campaigns',
      name: 'Performance de Campanhas',
      description: 'Métricas das campanhas ativas',
      icon: Tag,
      color: 'bg-orange-500'
    },
    {
      id: 'chart',
      name: 'Gráfico',
      description: 'Visualização de dados em gráfico',
      icon: BarChart3,
      color: 'bg-indigo-500'
    },
    {
      id: 'quick-actions',
      name: 'Ações Rápidas',
      description: 'Botões para ações frequentes',
      icon: Zap,
      color: 'bg-red-500'
    }
  ];

  const handleAdd = () => {
    if (!selectedType || !cardTitle.trim()) return;

    const cardConfig = {
      type: selectedType,
      title: cardTitle.trim(),
      settings: getDefaultSettings(selectedType)
    };

    onAdd(cardConfig);
  };

  const getDefaultSettings = (type) => {
    switch (type) {
      case 'stats':
        return {
          showTotalContacts: true,
          showActiveCampaigns: true,
          showRecentActivities: true,
          showConversionRate: true,
          layout: 'grid'
        };
      case 'activity':
        return {
          maxItems: 8,
          showStatus: true,
          showDuration: true
        };
      case 'contacts':
        return {
          sortBy: 'value',
          maxItems: 5,
          showValue: true,
          showStatus: true
        };
      case 'campaigns':
        return {
          maxCampaigns: 4,
          showMetrics: true,
          showROI: true
        };
      case 'chart':
        return {
          chartType: 'line',
          dataSource: 'contacts',
          timeRange: '30d'
        };
      case 'quick-actions':
        return {
          actions: ['add-contact', 'create-campaign', 'view-reports']
        };
      default:
        return {};
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-green-700 rounded-2xl flex items-center justify-center">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <span>Adicionar Novo Card</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Card Title */}
          <div>
            <Label htmlFor="cardTitle">Título do Card</Label>
            <Input
              id="cardTitle"
              value={cardTitle}
              onChange={(e) => setCardTitle(e.target.value)}
              placeholder="Digite o título do card"
              className="rounded-xl border-gray-200 mt-1"
            />
          </div>

          {/* Card Type Selection */}
          <div>
            <Label>Tipo de Card</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
              {cardTypes.map((type) => (
                <Card
                  key={type.id}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-md rounded-2xl ${
                    selectedType === type.id 
                      ? 'ring-2 ring-blue-500 bg-blue-50' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedType(type.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-12 h-12 ${type.color} rounded-2xl flex items-center justify-center flex-shrink-0`}>
                        <type.icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 mb-1">{type.name}</h3>
                        <p className="text-sm text-gray-600">{type.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-6 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button 
              onClick={handleAdd}
              disabled={!selectedType || !cardTitle.trim()}
              className="bg-green-600 hover:bg-green-700 rounded-xl"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Card
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
