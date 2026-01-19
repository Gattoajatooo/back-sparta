import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle2,
  Star,
  AlertCircle,
  Settings,
  Zap
} from "lucide-react";

import { getCatalogPlans } from "@/functions/getCatalogPlans";
import CustomPlanModal from "../components/plans/CustomPlanModal";

export default function PlansCatalog() {
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCustomPlan, setShowCustomPlan] = useState(false);

  const loadPlans = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await getCatalogPlans();
      if (response.data?.success) {
        setPlans(response.data.plans);
      } else {
        throw new Error(response.data?.error || 'Erro ao carregar planos');
      }
    } catch (e) {
      setError("Falha ao carregar catálogo de planos.");
      setPlans([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const formatFeatureValue = (feature) => {
    if (feature.type === 'quota') {
      const value = parseInt(feature.value);
      if (value === -1) return 'Sob demanda';
      if (value === 0) return 'Nenhum';
      return `${value} ${feature.unit}`;
    }
    if (feature.type === 'toggle') {
      return feature.value === 'true' ? 'Incluído' : 'Não incluído';
    }
    return feature.value;
  };

  const formatPrice = (priceCents, billingPeriod = 'monthly') => {
    if (!priceCents || priceCents === 0) return 'Gratuito';
    const price = (priceCents / 100).toLocaleString('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    });
    const period = billingPeriod === 'monthly' ? 'mês' : 
                  billingPeriod === 'quarterly' ? 'trimestre' : 'ano';
    return `${price}/${period}`;
  };

  const handleSelectPlan = (plan) => {
    if (plan.is_custom_base) {
      setShowCustomPlan(true);
    } else {
      // Redirecionar para checkout ou criar assinatura
      console.log('Selecionado plano:', plan.name);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive" className="rounded-2xl">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Escolha seu Plano</h1>
            <p className="text-gray-600">Encontre o plano perfeito para sua empresa</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {plans.map(plan => (
          <Card 
            key={plan.id} 
            className={`rounded-3xl border-gray-200 hover:shadow-lg transition-all flex flex-col relative ${
              plan.is_popular ? 'border-purple-300 shadow-md' : ''
            }`}
          >
            {plan.is_popular && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white rounded-full px-4 py-1 z-10">
                <Star className="w-3 h-3 mr-1.5" />
                Popular
              </Badge>
            )}
            
            <CardHeader>
              <div className="text-center space-y-2">
                <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                <div className="text-3xl font-bold text-purple-600">
                  {formatPrice(plan.price_cents, plan.billing_period)}
                </div>
                {plan.description && (
                  <p className="text-sm text-gray-600">{plan.description}</p>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 space-y-4">
              <div className="space-y-3">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <span className="font-medium">{feature.name}:</span>
                      <span className="text-gray-600 ml-1">
                        {formatFeatureValue(feature)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="pt-4">
                <Button 
                  onClick={() => handleSelectPlan(plan)}
                  className={`w-full rounded-xl ${
                    plan.is_popular 
                      ? 'bg-purple-600 hover:bg-purple-700' 
                      : plan.is_custom_base
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                      : 'bg-gray-800 hover:bg-gray-900'
                  }`}
                >
                  {plan.is_custom_base ? (
                    <>
                      <Settings className="w-4 h-4 mr-2" />
                      Personalizar
                    </>
                  ) : (
                    'Selecionar Plano'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <CustomPlanModal 
        isOpen={showCustomPlan}
        onClose={() => setShowCustomPlan(false)}
      />
    </div>
  );
}