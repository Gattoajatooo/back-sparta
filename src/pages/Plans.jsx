import React, { useState, useEffect, useCallback } from "react";
import { Plan } from "@/entities/Plan";
import { User } from "@/entities/User";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue,
  SelectTrigger,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // Added Tooltip imports

import {
  CreditCard,
  Search,
  MoreVertical,
  Eye,
  AlertCircle,
  LayoutGrid as Grid,
  List,
  X,
  Star,
  CheckCircle2,
  Users,
  MessageSquare,
  FileText,
  Tag,
  Calendar,
  Clock,
  Shield,
  Zap,
  Smartphone,
  Mail,
  RefreshCw as Loader2,
  Check,
  Phone,
  PhoneCall,
  ArrowUpDown
} from "lucide-react";

import PlanDetailsModal from "../components/plans/PlanDetailsModal";
import { createStripeCheckoutSession } from "../functions/createStripeCheckoutSession";
import { getPendingSubscriptions } from "../functions/getPendingSubscriptions";
import { cancelPendingSubscription } from "../functions/cancelPendingSubscription";
import { getSubscriptionStatus } from "../functions/getSubscriptionStatus";
import { activateFreePlan } from "../functions/activateFreePlan"; // Nova importação
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Banner component
const Banner = ({ show, message, type, onClose }) => {
  if (!show) return null;
  const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
  return (
    <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center justify-between ${bgColor} text-white`}>
      <span>{message}</span>
      <button onClick={onClose} className="ml-4 p-1 rounded-full hover:bg-white/20">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default function Plans() {
  const [user, setUser] = useState(null);
  const [plans, setPlans] = useState([]);
  const [pendingSubscriptions, setPendingSubscriptions] = useState([]);
  const [activeSubscription, setActiveSubscription] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // NOVO: Adicionado viewMode
  const [billingPeriod, setBillingPeriod] = useState("monthly"); // Agora sempre mensal
  const [banner, setBanner] = useState({ show: false, message: '', type: 'success' });
  const [showPlanDetails, setShowPlanDetails] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [error, setError] = useState("");
  const [currentPlanSlug, setCurrentPlanSlug] = useState('free');
  const [processingPlanId, setProcessingPlanId] = useState(null);

  const showBanner = useCallback((message, type = 'success') => {
    setBanner({ show: true, message, type });
    setTimeout(() => setBanner(p => ({...p, show: false, message: '', type: 'success'})), 5000);
  }, []);

  const getPeriodLabel = useCallback((period) => {
    const labels = {
      'monthly': 'Mensal'
    };
    return labels[period] || 'Mensal';
  }, []);

  const getPlanPrice = useCallback((plan, period) => {
    // Agora sempre retorna preço mensal
    return plan.price;
  }, []);

  const calculateDiscount = useCallback((plan, period) => {
    // Sem desconto pois só temos mensal
    return 0;
  }, []);

  // Função para determinar se um plano é melhor que outro (baseado no preço)
  const comparePlans = useCallback((planA, planB) => {
    const priceA = planA.price || 0;
    const priceB = planB.price || 0;
    if (priceA > priceB) return 1; // planA é melhor (mais caro)
    if (priceA < priceB) return -1; // planA é pior (mais barato)
    return 0; // são iguais no preço
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const currentUser = await User.me();
      setUser(currentUser);
      
      const [planList, pendingResponse, subscriptionResponse] = await Promise.all([
        Plan.filter({ is_listed: true }, 'display_order'),
        getPendingSubscriptions(),
        getSubscriptionStatus()
      ]);
      
      setPlans(Array.isArray(planList) ? planList : []);
      
      if (pendingResponse.data?.success) {
        setPendingSubscriptions(pendingResponse.data.pending_subscriptions || []);
      } else {
        setPendingSubscriptions([]);
      }

      // Processar assinatura ativa
      if (subscriptionResponse.data?.success && subscriptionResponse.data?.has_active_subscription) {
        const subscription = subscriptionResponse.data.subscription;
        setActiveSubscription(subscription);
        
        // Sempre usar período mensal
        setBillingPeriod('monthly');

        // Determinar o plano atual pelo plan_id no metadata
        const currentPlanId = subscription.metadata?.plan_id;
        if (currentPlanId) {
          const currentPlan = planList.find(plan => plan.id === currentPlanId);
          if (currentPlan) {
            setCurrentPlanSlug(currentPlan.slug);
            console.log('Plano atual detectado:', currentPlan.slug, 'ID:', currentPlanId);
          } else {
            setCurrentPlanSlug('free');
            console.log('Plano não encontrado para ID:', currentPlanId);
          }
        } else {
          setCurrentPlanSlug('free');
          console.log('Sem plan_id no metadata da assinatura');
        }
      } else {
        setActiveSubscription(null);
        setCurrentPlanSlug('free');
      }
      
    } catch (e) {
      console.error("Error loading plan data:", e);
      setError("Falha ao carregar dados.");
      showBanner("Erro ao carregar dados", "error");
      setPlans([]);
      setPendingSubscriptions([]);
      setActiveSubscription(null);
      setCurrentPlanSlug('free');
    } finally {
      setIsLoading(false);
    }
  }, [showBanner]);

  useEffect(() => {
    loadData();

    // Adicionado para verificar o status do pagamento na URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment_success') === 'true') {
      showBanner('Pagamento processado com sucesso! Sua assinatura será ativada em breve.', 'success');
      // Limpa a URL para evitar que o banner apareça novamente no refresh
      window.history.replaceState(null, '', window.location.pathname);
    } else if (urlParams.get('canceled') === 'true') {
      showBanner('A assinatura foi cancelada.', 'error');
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [loadData, showBanner]);

  const handleViewPlan = (plan) => {
    setSelectedPlan(plan);
    setShowPlanDetails(true);
  };

  const handleUpgrade = async (plan, period = 'monthly') => {
    setProcessingPlanId(plan.id);
    setError('');
    
    try {
      const response = await createStripeCheckoutSession({
        plan_id: plan.id,
        billing_period: period
      });

      if (response.data?.success && response.data?.checkout_url) {
        const message = response.data.is_existing_attempt 
          ? 'Redirecionando para seu pagamento pendente...'
          : 'Redirecionando para o checkout...';
        
        showBanner(message, 'success');
        window.open(response.data.checkout_url, '_blank');
        setTimeout(() => {
          loadData();
        }, 1000);
      } else {
        setError(response.data?.error || 'Erro ao iniciar o processo de pagamento.');
        showBanner(response.data?.error || 'Erro ao iniciar o processo de pagamento.', 'error');
      }
    } catch (err) {
      console.error('Erro no upgrade:', err);
      setError('Erro inesperado. Tente novamente.');
      showBanner('Erro inesperado. Por favor, tente novamente.', 'error');
    } finally {
      setProcessingPlanId(null);
    }
  };

  const handleCancelPendingSubscription = async (subscriptionId) => {
    if (!window.confirm('Tem certeza que deseja cancelar esta solicitação de assinatura?')) {
      return;
    }

    setProcessingPlanId('canceling');
    try {
      const response = await cancelPendingSubscription({ subscription_id: subscriptionId });
      
      if (response.data?.success) {
        showBanner('Solicitação de assinatura cancelada com sucesso.', 'success');
        loadData();
      } else {
        showBanner(response.data?.error || 'Erro ao cancelar solicitação.', 'error');
      }
    } catch (err) {
      console.error('Erro ao cancelar:', err);
      showBanner('Erro inesperado ao cancelar.', 'error');
    } finally {
      setProcessingPlanId(null);
    }
  };

  const handleActivateFreePlan = async (plan) => {
    setProcessingPlanId(plan.id);
    try {
        const response = await activateFreePlan({ plan_id: plan.id });
        if (response.data?.success) {
            showBanner('Plano gratuito ativado com sucesso!', 'success');
            await loadData();
        } else {
            throw new Error(response.data?.error || 'Falha ao ativar o plano gratuito.');
        }
    } catch (err) {
        showBanner(err.message, 'error');
        console.error("Erro ao ativar plano gratuito:", err);
    } finally {
        setProcessingPlanId(null);
    }
  };

  const formatFeature = useCallback((value, singular, plural, demandText, noneText) => {
    if (value === -1) return demandText;
    if (value === 0) return noneText;
    return `${value} ${value === 1 ? singular : plural}`;
  }, []);
  
  const filteredPlans = plans.filter(plan =>
    !searchTerm || plan.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getAllFeatures = useCallback((plan) => {
    const features = [];

    const addFeature = (availableCondition, name, highlight = false, description = '') => {
      features.push({ name, available: availableCondition, highlight, description });
    };

    // Features principais com descrições para tooltip
    addFeature(plan.active_sessions !== 0, `Sessões Ativas: ${formatFeature(plan.active_sessions, "Sessão", "Sessões", "Ilimitadas", "Nenhuma")}`, plan.active_sessions === -1, "Número de sessões de WhatsApp simultâneas que você pode manter conectadas");
    addFeature(plan.active_contacts !== 0, `Contatos: ${formatFeature(plan.active_contacts, "Contato", "Contatos", "Ilimitados", "Nenhum")}`, plan.active_contacts === -1, "Quantidade total de contatos que podem ser armazenados na plataforma");
    addFeature(plan.messages_per_month !== 0, `Mensagens/Mês: ${formatFeature(plan.messages_per_month, "Mensagem", "Mensagens", "Ilimitadas", "Nenhuma")}`, plan.messages_per_month === -1, "Número de mensagens que podem ser enviadas por mês");
    addFeature(plan.template_models !== 0, `Modelos: ${formatFeature(plan.template_models, "Modelo", "Modelos", "Ilimitadas", "Nenhum")}`, plan.template_models === -1, "Quantidade de templates de mensagem que você pode criar e salvar");
    addFeature(plan.active_tags !== 0, `Marcadores: ${formatFeature(plan.active_tags, "Marcador", "Marcadores", "Ilimitadas", "Nenhum")}`, plan.active_tags === -1, "Tags para organizar e segmentar seus contatos");
    addFeature(plan.active_smart_tags !== 0, `Tags Inteligentes: ${formatFeature(plan.active_smart_tags, "Tag", "Tags", "Ilimitadas", "Nenhum")}`, plan.active_smart_tags === -1, "Tags automáticas baseadas em regras e comportamento dos contatos");
    addFeature(plan.recurring_campaigns !== 0, `Campanhas Recorrentes: ${formatFeature(plan.recurring_campaigns, "Campanha", "Campanhas", "Ilimitadas", "Nenhuma")}`, plan.recurring_campaigns === -1, "Campanhas que se repetem automaticamente em intervalos definidos");
    addFeature(plan.dynamic_campaigns !== 0, `Campanhas Dinâmicas: ${formatFeature(plan.dynamic_campaigns, "Campanha", "Campanhas", "Ilimitadas", "Nenhuma")}`, plan.dynamic_campaigns === -1, "Campanhas que se adaptam aos contatos em tempo real baseado em filtros");
    addFeature(plan.company_users !== 0, `Usuários: ${formatFeature(plan.company_users, "Usuário", "Usuários", "Ilimitadas", "Nenhum")}`, plan.company_users === -1, "Número de pessoas da sua equipe que podem acessar a plataforma");
    addFeature(plan.roles_permissions !== 0, `Funções Personalizadas: ${formatFeature(plan.roles_permissions, "Função", "Funções", "Ilimitadas", "Nenhuma")}`, plan.roles_permissions === -1, "Perfis de acesso customizados com permissões específicas");
    addFeature(plan.report_personalization !== 0, `Relatórios: ${formatFeature(plan.report_personalization, "Relatório", "Relatórios", "Ilimitados", "Nenhum")}`, plan.report_personalization === -1, "Relatórios personalizados para acompanhar métricas específicas");
    
    // Features especiais com destaque
    addFeature(plan.support_hours > 0, `Suporte: ${plan.support_hours}h para resposta`, plan.support_hours > 0 && plan.support_hours <= 24, `Tempo máximo de resposta do suporte técnico: ${plan.support_hours} horas`);
    addFeature(plan.message_reception, "Recepção de Mensagens", plan.message_reception, "Permite receber e visualizar respostas dos contatos na plataforma");
    addFeature(plan.implementation_help, "Ajuda na implementação", plan.implementation_help, "Suporte especializado para configurar e otimizar sua conta");
    addFeature(plan.daily_whatsapp_notifications, "Relatórios diários via WhatsApp", plan.daily_whatsapp_notifications, "Receba um resumo diário das atividades da sua conta via WhatsApp");

    return features;
  }, [formatFeature]);

  const getPendingSubscription = useCallback((planId, billingPeriod) => {
    return pendingSubscriptions.find(
      sub => sub.plan_id === planId && sub.billing_period === billingPeriod
    );
  }, [pendingSubscriptions]);

  const hasPendingSubscriptions = pendingSubscriptions.length > 0;

  const PlanCard = ({ plan }) => {
    const isFree = plan.price === 0;

    // Verificar se este plano está ativo - comparar por plan_id no metadata
    const isCurrent = Boolean(
      activeSubscription && 
      activeSubscription.metadata?.plan_id === plan.id
    );
    
    const currentPrice = getPlanPrice(plan, billingPeriod);
    const originalPrice = getPlanPrice(plan, "monthly"); // For discount calculation, though currently 0
    const discount = calculateDiscount(plan, billingPeriod); // Will always be 0 now
    const pendingSubscription = getPendingSubscription(plan.id, billingPeriod);
    const isProcessingThisPlan = processingPlanId === plan.id;
    
    let buttonText = 'Fazer Upgrade';
    let buttonClassName = 'w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white';
    let buttonAction = () => handleUpgrade(plan, billingPeriod);
    let isDisabled = false;
    
    // Se o plano já está ativo, desabilita o botão
    if (isCurrent) {
      buttonText = 'Plano Atual';
      buttonClassName = 'w-full rounded-xl bg-gray-400 text-white cursor-not-allowed';
      buttonAction = () => {};
      isDisabled = true;
    } else if (isFree) {
      // Plano gratuito não ativo
      buttonText = 'Ativar Grátis';
      buttonClassName = 'w-full rounded-xl bg-gray-600 hover:bg-gray-700 text-white';
      buttonAction = () => handleActivateFreePlan(plan);
    } else if (activeSubscription && activeSubscription.amount !== null) {
      // Plano pago não ativo - comparar preços
      const currentPlanPrice = activeSubscription.amount;
      const thisPlanPrice = plan.price * 100;
      
      if (thisPlanPrice > currentPlanPrice) {
        buttonText = 'Atualizar Plano';
        buttonClassName = 'w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white';
      } else if (thisPlanPrice < currentPlanPrice) {
        buttonText = 'Rebaixar Plano';
        buttonClassName = 'w-full rounded-xl bg-orange-600 hover:bg-orange-700 text-white';
      } else {
        buttonText = 'Fazer Upgrade';
        buttonClassName = 'w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white';
      }
    }
    
    // Se há assinatura pendente para este plano
    if (pendingSubscription && !isCurrent) {
      buttonText = isProcessingThisPlan ? 'Processando...' : 'Acessar Pagamento';
      buttonClassName = 'w-full rounded-xl bg-amber-600 hover:bg-amber-700 text-white';
      buttonAction = () => {
        if (!isProcessingThisPlan && pendingSubscription.payment_link_url) {
          window.open(pendingSubscription.payment_link_url, '_blank');
        } else if (!isProcessingThisPlan) {
          handleUpgrade(plan, billingPeriod);
        }
      };
      isDisabled = isProcessingThisPlan;
    }
    
    // Desabilitar se houver outra assinatura pendente (e não for o plano atual)
    const shouldDisableForOtherPending = hasPendingSubscriptions && !pendingSubscription && !isCurrent && processingPlanId !== 'canceling';
    if (shouldDisableForOtherPending) {
      buttonText = 'Aguarde conclusão do outro plano';
      buttonClassName = 'w-full rounded-xl bg-gray-400 cursor-not-allowed text-white';
      buttonAction = () => {};
      isDisabled = true;
    }
    
    // Se está processando este plano especificamente
    if (isProcessingThisPlan && !isCurrent) {
      buttonText = pendingSubscription ? 'Acessando...' : 'Processando...';
      buttonClassName = 'w-full rounded-xl bg-gray-400 cursor-not-allowed text-white';
      isDisabled = true;
    }

    const features = getAllFeatures(plan);

    // NOVO: Renderização diferente para list view
    if (viewMode === 'list') {
      return (
        <Card className={`rounded-2xl border-2 transition-all border-gray-200 hover:shadow-md hover:border-gray-300`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                    {plan.is_popular && (
                      <Badge className="bg-gradient-to-r from-orange-400 to-pink-500 text-white">
                        ⭐ Popular
                      </Badge>
                    )}
                    {isCurrent && (
                      <Badge className="bg-green-500 text-white">
                        ✓ Plano Atual
                      </Badge>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm mb-3">{plan.description}</p>
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-gray-900">
                      {isFree ? "Grátis" : `R$ ${currentPrice.toFixed(2).replace('.', ',')}`}
                    </span>
                    {!isFree && <span className="text-gray-500">/{getPeriodLabel(billingPeriod).toLowerCase()}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewPlan(plan)}
                  className="rounded-xl"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Ver Detalhes
                </Button>
                <Button
                  onClick={buttonAction}
                  disabled={isDisabled}
                  className={buttonClassName}
                  size="sm"
                >
                  {isProcessingThisPlan && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {buttonText}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    // Grid view card
    return (
      <div 
        className={`relative bg-white rounded-3xl p-6 transition-all duration-300 hover:shadow-xl border-2 flex flex-col border-gray-200 hover:border-gray-300`}
        style={{ minHeight: '600px', width: '320px' }} // Largura fixa de 320px
      >
        {/* Badge de Popular */}
        {plan.is_popular && (
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
            <div className="bg-gradient-to-r from-orange-400 to-pink-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
              ⭐ Popular
            </div>
          </div>
        )}

        {/* Badge de Plano Atual */}
        {isCurrent && (
          <div className="absolute -top-4 right-4 z-10">
            <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
              ✓ Ativo
            </div>
          </div>
        )}

        {/* Conteúdo principal do card - flex-1 para ocupar espaço disponível */}
        <div className="flex-1 flex flex-col">
          <div className="text-center mb-6 pt-4"> {/* Adjusted mb from 8 to 6 */}
            <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
            <div className="mb-4">
              <span className="text-4xl font-bold text-gray-900">
                {isFree ? "Grátis" : `R$ ${currentPrice.toFixed(2).replace('.', ',')}`}
              </span>
              {!isFree && <span className="text-gray-500 ml-2">/{getPeriodLabel(billingPeriod).toLowerCase()}</span>}
            </div>
            {discount > 0 && ( // Discount will always be 0 with current calculateDiscount logic
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="text-sm text-gray-500 line-through">
                  R$ {originalPrice.toFixed(2).replace('.', ',')}
                </span>
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-bold">
                  -{discount}% desconto
                </span>
              </div>
            )}
            <p className="text-gray-600 text-sm">{plan.description}</p>
          </div>

          {/* Features - flex-1 para ocupar espaço restante */}
          <div className="flex-1 space-y-3 mb-6"> {/* Adjusted space-y from 4 to 3, mb from 8 to 6 */}
            {features.map((feature, index) => (
              <TooltipProvider key={index}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-3 cursor-help">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                        feature.available 
                          ? feature.highlight ? 'bg-orange-100' : 'bg-green-100'
                          : 'bg-gray-100'
                      }`}>
                        {feature.available ? (
                          <Check className={`w-3 h-3 ${
                            feature.highlight ? 'text-orange-600' : 'text-green-600'
                          }`} />
                        ) : (
                          <X className="w-3 h-3 text-gray-400" />
                        )}
                      </div>
                      <span className={`text-sm flex-1 ${
                        feature.available ? 'text-gray-700' : 'text-gray-400'
                      }`}>
                        {feature.name}
                      </span>
                      {feature.highlight && feature.available && (
                        <Star className="w-4 h-4 text-orange-500 fill-orange-500 flex-shrink-0" />
                      )}
                    </div>
                  </TooltipTrigger>
                  {feature.description && (
                    <TooltipContent>
                      <p className="max-w-xs">{feature.description}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </div>

        {/* Botão fixo na parte inferior */}
        <div className="mt-auto">
          <Button
            onClick={buttonAction}
            disabled={isDisabled}
            className={buttonClassName}
          >
            {isProcessingThisPlan && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {buttonText}
          </Button>

          {pendingSubscription && !isProcessingThisPlan && (
            <p className="text-center text-amber-600 text-xs mt-2">
              Pagamento pendente - clique para acessar
            </p>
          )}
        </div>
      </div>
    );
  };
  
  if (isLoading && plans.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto overflow-hidden">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690a8ae384e85f405dd1958f/8d6af0619_ChatGPTImage24denovde202519_02_27.png"
              alt="Sparta Sync"
              className="w-16 h-16 object-contain"
              onError={(e) => {
                console.error('Logo failed to load on Plans page');
                e.target.onerror = null;
                e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"%3E%3Ctext x="50%25" y="50%25" font-size="24" text-anchor="middle" dominant-baseline="middle"%3ESS%3C/text%3E%3C/svg%3E';
              }}
            />
            <div className="shine-effect"></div>
          </div>
          <style>
            {`
              @keyframes shine {
                0% {
                  transform: translateX(-100%) translateY(100%) rotate(-45deg);
                  opacity: 0;
                }
                50% {
                  opacity: 1;
                }
                100% {
                  transform: translateX(100%) translateY(-100%) rotate(-45deg);
                  opacity: 0;
                }
              }
              .shine-effect {
                position: absolute;
                top: -50%;
                left: -50%;
                width: 250%;
                height: 250%;
                background: linear-gradient(
                  to right,
                  rgba(255, 255, 255, 0) 0%,
                  rgba(255, 255, 255, 0) 20%,
                  rgba(255, 255, 255, 0.8) 50%,
                  rgba(255, 255, 255, 0) 80%,
                  rgba(255, 255, 255, 0) 100%
                );
                animation: shine 2.5s ease-in-out infinite;
                pointer-events: none;
              }
            `}
          </style>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Banner show={banner.show} message={banner.message} type={banner.type} onClose={() => setBanner(p => ({...p, show: false}))} />
      
      {error && (
        <Alert variant="destructive" className="rounded-2xl mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center flex-shrink-0">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Nossos Planos</h1>
            <p className="text-sm sm:text-base text-gray-600 hidden sm:block">
              {activeSubscription ? 'Gerencie sua assinatura ou explore outros planos' : 'Escolha o plano ideal para sua empresa'}
            </p>
          </div>
        </div>
      </div>

      {/* Aviso sobre assinatura pendente */}
      {hasPendingSubscriptions && (
        <Alert className="rounded-2xl border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            Você tem uma solicitação de assinatura pendente. Complete ou cancele-a para solicitar outros planos.
          </AlertDescription>
        </Alert>
      )}

      {/* Toolbar */}
      <div className="flex flex-col gap-3">
        {/* Mobile: Botões primeiro */}
        <div className="flex gap-2 w-full sm:hidden">
          <div className="flex gap-1 border rounded-xl p-1 bg-white">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
              className="h-8 w-8 rounded-lg"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
              className="h-8 w-8 rounded-lg"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="rounded-xl flex-1">
                <PhoneCall className="w-4 h-4 mr-2" />
                Contato
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="rounded-xl">
              <DropdownMenuItem className="rounded-lg">
                <Phone className="w-4 h-4 mr-2" />
                Telefone
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-lg">
                <Mail className="w-4 h-4 mr-2" />
                E-mail
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-lg">
                <MessageSquare className="w-4 h-4 mr-2" />
                WhatsApp
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Mobile: Barra de pesquisa */}
        <div className="relative w-full sm:hidden">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar planos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>

        {/* Desktop: Tudo na mesma linha */}
        <div className="hidden sm:flex gap-2 items-center">
          {/* Barra de pesquisa */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar planos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>

          <div className="flex gap-1 border rounded-xl p-1">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
              className="h-8 w-8 rounded-lg"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
              className="h-8 w-8 rounded-lg"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="rounded-xl">
                <PhoneCall className="w-4 h-4 mr-2" />
                Entrar em Contato
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="rounded-xl">
              <DropdownMenuItem className="rounded-lg">
                <Phone className="w-4 h-4 mr-2" />
                Telefone
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-lg">
                <Mail className="w-4 h-4 mr-2" />
                E-mail
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-lg">
                <MessageSquare className="w-4 h-4 mr-2" />
                WhatsApp
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Plans Content */}
      {filteredPlans.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-6 pt-4" style={{ minWidth: 'min-content' }}>
              {filteredPlans.map(plan => <PlanCard key={plan.id} plan={plan} />)}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPlans.map(plan => <PlanCard key={plan.id} plan={plan} />)}
          </div>
        )
      ) : (
        <Card className="rounded-3xl border-blue-200 mt-4">
          <CardContent className="text-center py-16">
            <CreditCard className="w-16 h-16 mx-auto mb-4 text-blue-300" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchTerm ? 'Nenhum plano encontrado' : 'Nenhum plano disponível'}
            </h3>
            <p className="text-gray-500">
              {searchTerm ? 'Tente ajustar sua pesquisa' : 'Os planos estão sendo configurados'}
            </p>
          </CardContent>
        </Card>
      )}

      <PlanDetailsModal 
        plan={selectedPlan} 
        open={showPlanDetails} 
        onClose={() => { 
          setShowPlanDetails(false); 
          setSelectedPlan(null); 
        }}
        isCurrent={Boolean(
          selectedPlan && activeSubscription && 
          activeSubscription.metadata?.plan_id === selectedPlan.id
        )}
        onActivate={(plan) => {
          if (plan.price === 0) {
            handleActivateFreePlan(plan);
          } else {
            handleUpgrade(plan, billingPeriod);
          }
          setShowPlanDetails(false);
          setSelectedPlan(null);
        }}
        isProcessing={processingPlanId === selectedPlan?.id}
      />
    </div>
  );
}