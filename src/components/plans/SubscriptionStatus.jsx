import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, Calendar, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getSubscriptionStatus } from "@/functions/getSubscriptionStatus";

export default function SubscriptionStatus() {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    try {
      const response = await getSubscriptionStatus();
      if (response.data?.success) {
        setSubscription(response.data.has_active_subscription ? response.data.subscription : null);
      }
    } catch (error) {
      console.error('Erro ao carregar assinatura:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="rounded-3xl">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!subscription) {
    return (
      <Card className="rounded-3xl border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-600">
            <AlertCircle className="w-5 h-5" />
            Nenhuma Assinatura Ativa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 mb-4">
            Você ainda não possui uma assinatura ativa. Escolha um plano para começar.
          </p>
          <Button className="bg-green-600 hover:bg-green-700">
            Ver Planos
          </Button>
        </CardContent>
      </Card>
    );
  }

  const statusColor = subscription.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
  const periodText = subscription.interval === 'month' ? 
    (subscription.interval_count === 1 ? 'Mensal' : `${subscription.interval_count} meses`) :
    'Anual';

  return (
    <Card className="rounded-3xl border-gray-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-600">
          <CheckCircle className="w-5 h-5" />
          Assinatura Ativa
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="font-semibold text-lg">{subscription.plan_name}</p>
            <p className="text-gray-600">{periodText}</p>
          </div>
          <Badge className={statusColor}>
            {subscription.status === 'active' ? 'Ativo' : 'Pendente'}
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <p className="text-sm text-gray-500">Valor</p>
            <p className="font-semibold">
              R$ {subscription.amount.toFixed(2).replace('.', ',')}
              <span className="text-sm text-gray-500 ml-1">
                /{subscription.interval === 'month' ? 'mês' : 'ano'}
              </span>
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Próxima Cobrança</p>
            <p className="font-semibold flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(new Date(subscription.current_period_end), 'dd/MM/yyyy', { locale: ptBR })}
            </p>
          </div>
        </div>

        {subscription.cancel_at_period_end && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              Sua assinatura será cancelada em {format(new Date(subscription.current_period_end), 'dd/MM/yyyy', { locale: ptBR })}.
            </p>
          </div>
        )}
        
        <div className="pt-4">
          <Button variant="outline" className="w-full" onClick={() => window.open('https://billing.stripe.com/p/login/test_5kA17YcFV8pY1jy000', '_blank')}>
            <CreditCard className="w-4 h-4 mr-2" />
            Gerenciar Assinatura
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}