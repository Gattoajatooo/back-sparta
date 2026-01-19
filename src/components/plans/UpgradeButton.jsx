import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard, CheckCircle } from "lucide-react";
import { createStripeCheckoutSession } from "@/functions/createStripeCheckoutSession";

export default function UpgradeButton({ plan, billingPeriod = 'monthly' }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUpgrade = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await createStripeCheckoutSession({
        plan_id: plan.id,
        billing_period: billingPeriod
      });

      if (response.data?.success) {
        // Redirecionar para o checkout do Stripe
        window.location.href = response.data.checkout_url;
      } else {
        setError(response.data?.error || 'Erro ao criar sessão de pagamento');
      }
    } catch (err) {
      console.error('Erro no upgrade:', err);
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button 
        onClick={handleUpgrade}
        disabled={isLoading}
        className="w-full bg-green-600 hover:bg-green-700 text-white"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processando...
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 mr-2" />
            Assinar {plan.name}
          </>
        )}
      </Button>
      
      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}
      
      <div className="flex items-center justify-center text-xs text-gray-500">
        <CheckCircle className="w-3 h-3 mr-1" />
        Processamento seguro via Stripe
      </div>
    </div>
  );
}