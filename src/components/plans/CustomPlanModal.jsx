import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  X,
  Settings,
  Calculator,
  Check
} from "lucide-react";

import { getCatalogFeatures } from "@/functions/getCatalogFeatures";
import { createOffer } from "@/functions/createOffer";

export default function CustomPlanModal({ isOpen, onClose }) {
  const [features, setFeatures] = useState([]);
  const [selectedFeatures, setSelectedFeatures] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [totalPrice, setTotalPrice] = useState(0);

  useEffect(() => {
    if (isOpen) {
      loadFeatures();
    }
  }, [isOpen]);

  const loadFeatures = async () => {
    try {
      const response = await getCatalogFeatures();
      if (response.data?.success) {
        setFeatures(response.data.features);
        // Inicializar com valores padrão
        const initialValues = {};
        response.data.features.forEach(feature => {
          if (feature.type === 'quota') {
            initialValues[feature.id] = parseInt(feature.metadata?.default || '0');
          } else if (feature.type === 'toggle') {
            initialValues[feature.id] = feature.metadata?.default === 'true';
          }
        });
        setSelectedFeatures(initialValues);
      }
    } catch (error) {
      console.error('Erro ao carregar features:', error);
    }
  };

  const updateFeatureValue = (featureId, value) => {
    setSelectedFeatures(prev => ({
      ...prev,
      [featureId]: value
    }));
    calculatePrice();
  };

  const calculatePrice = () => {
    // Lógica simplificada de cálculo
    let price = 0;
    features.forEach(feature => {
      const value = selectedFeatures[feature.id];
      if (feature.type === 'quota' && value > 0) {
        // Preço base por unidade (simulado)
        const unitPrice = feature.key === 'sessions_quota' ? 1000 : // R$ 10 por sessão
                          feature.key === 'contacts_quota' ? 10 : // R$ 0,10 por contato  
                          feature.key === 'messages_quota' ? 1 : // R$ 0,01 por mensagem
                          100; // R$ 1 padrão
        price += value * unitPrice;
      }
    });
    setTotalPrice(price);
  };

  const handleCreateOffer = async () => {
    setIsLoading(true);
    try {
      const overrides = features.map(feature => ({
        feature_id: feature.id,
        value_override: String(selectedFeatures[feature.id] || '0'),
        price_override_cents: 0 // Simplificado
      }));

      const response = await createOffer({
        company_id: 'current', // Será substituído no backend
        plan_version_id: 'custom_base', // ID do plano base personalizado
        name: 'Plano Personalizado',
        description: 'Plano criado sob medida',
        overrides
      });

      if (response.data?.success) {
        onClose();
        // Redirecionar para confirmação
      }
    } catch (error) {
      console.error('Erro ao criar oferta:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderFeatureControl = (feature) => {
    const value = selectedFeatures[feature.id];
    
    if (feature.type === 'quota') {
      const min = feature.metadata?.min || 0;
      const max = feature.metadata?.max || 1000;
      const step = feature.metadata?.step || 1;
      
      return (
        <div key={feature.id} className="space-y-3">
          <div className="flex justify-between items-center">
            <Label className="font-medium">{feature.name}</Label>
            <Badge variant="outline">
              {value} {feature.unit}
            </Badge>
          </div>
          <Slider
            value={[value]}
            onValueChange={([newValue]) => updateFeatureValue(feature.id, newValue)}
            max={max}
            min={min}
            step={step}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>{min}</span>
            <span>{max}</span>
          </div>
        </div>
      );
    }
    
    if (feature.type === 'toggle') {
      return (
        <div key={feature.id} className="flex items-center justify-between">
          <Label className="font-medium">{feature.name}</Label>
          <Button
            variant={value ? 'default' : 'outline'}
            size="sm"
            onClick={() => updateFeatureValue(feature.id, !value)}
            className="h-8"
          >
            {value ? <Check className="w-4 h-4" /> : 'Ativar'}
          </Button>
        </div>
      );
    }
    
    return (
      <div key={feature.id} className="space-y-2">
        <Label className="font-medium">{feature.name}</Label>
        <Input
          value={value || ''}
          onChange={(e) => updateFeatureValue(feature.id, e.target.value)}
          placeholder={`Digite ${feature.name.toLowerCase()}`}
        />
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">Plano Personalizado</DialogTitle>
                <p className="text-sm text-gray-600">Configure suas necessidades</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6">
          <div className="space-y-6">
            {features.map(feature => (
              <Card key={feature.id}>
                <CardContent className="p-4">
                  {renderFeatureControl(feature)}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="border-t p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-gray-500" />
              <span className="text-lg font-semibold">Total Estimado:</span>
            </div>
            <div className="text-2xl font-bold text-purple-600">
              {(totalPrice / 100).toLocaleString('pt-BR', { 
                style: 'currency', 
                currency: 'BRL' 
              })}/mês
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateOffer}
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600"
            >
              {isLoading ? 'Criando...' : 'Solicitar Orçamento'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}