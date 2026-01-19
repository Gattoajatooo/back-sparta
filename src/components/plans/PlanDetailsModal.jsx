import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Package,
  X,
  Edit,
  Users,
  MessageCircle,
  Calendar,
  Target,
  Tag,
  BarChart3,
  HelpCircle,
  Settings,
  Shield,
  Bell,
  Star,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  CreditCard,
  Loader2
} from "lucide-react";

export default function PlanDetailsModal({ open, onClose, plan, onEdit, isCurrent, onActivate, isProcessing }) {
  const formatPrice = (price) => {
    if (!price || price === 0) return 'Gratuito';
    return `R$ ${price.toFixed(2).replace('.', ',')}`;
  };

  const formatLimit = (value, unit = '') => {
    if (value === -1) return 'Ilimitado';
    if (value === 0) return 'Nenhum';
    return `${value} ${unit}`;
  };

  const formatSupportHours = (hours) => {
    if (hours <= 1) return `${hours}h (Premium)`;
    if (hours <= 4) return `${hours}h (Prioritário)`;
    if (hours <= 12) return `${hours}h (Padrão)`;
    if (hours <= 24) return `${hours}h (Básico)`;
    return `${hours}h`;
  };

  const getSupportPriorityColor = (hours) => {
    if (hours <= 1) return 'bg-green-100 text-green-800';
    if (hours <= 4) return 'bg-purple-100 text-purple-800';
    if (hours <= 12) return 'bg-yellow-100 text-yellow-800';
    if (hours <= 24) return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (!open || !plan) return null;

  const isCustomPlan = plan.is_custom_base;
  const isFree = plan.price === 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-4xl w-[95vw] sm:w-[90vw] md:w-[85vw] lg:w-[80vw] xl:max-w-4xl max-h-[95vh] p-0 overflow-hidden flex flex-col rounded-[2.5rem] [&>button]:hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {plan.name}
                </h2>
                <p className="text-sm text-gray-600">
                  Detalhes do plano e recursos inclusos
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-lg"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div 
          className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6 sm:space-y-8"
          style={{ 
            maxHeight: 'calc(95vh - 140px)',
            minHeight: '300px'
          }}
        >
          {/* Informações Gerais */}
          <Card className="rounded-2xl border-gray-200">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  Informações Gerais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-500">Slug</span>
                    <p className="font-medium">{plan.slug}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Tipo</span>
                    <p className="font-medium text-blue-600">
                      {isCustomPlan ? 'Personalizado' : 'Fixo'}
                    </p>
                  </div>
                  {!isCustomPlan && (
                    <div>
                      <span className="text-sm text-gray-500">Preço</span>
                      <p className="font-medium text-blue-600 text-lg">{formatPrice(plan.price)}</p>
                    </div>
                  )}
                </div>
                {plan.description && (
                  <div>
                    <span className="text-sm text-gray-500">Descrição</span>
                    <p className="text-gray-700">{plan.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recursos do Sistema */}
            <Card className="rounded-2xl border-gray-200">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  Recursos do Sistema
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {isCustomPlan ? (
                    <>
                      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                        <Users className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="text-sm text-gray-600">Sessões</p>
                          <p className="font-semibold">{formatPrice(plan.price_sessions || 0)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                        <Users className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="text-sm text-gray-600">Contatos</p>
                          <p className="font-semibold">{formatPrice(plan.price_contacts || 0)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                        <MessageCircle className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="text-sm text-gray-600">Mensagens</p>
                          <p className="font-semibold">{formatPrice(plan.price_messages || 0)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="text-sm text-gray-600">Templates</p>
                          <p className="font-semibold">{formatPrice(plan.price_templates || 0)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                        <Users className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="text-sm text-gray-600">Usuários</p>
                          <p className="font-semibold">{formatPrice(plan.price_users || 0)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                        <Shield className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="text-sm text-gray-600">Funções</p>
                          <p className="font-semibold">{formatPrice(plan.price_roles || 0)}</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                        <Users className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="text-sm text-gray-600">Sessões Ativas</p>
                          <p className="font-semibold">{formatLimit(plan.active_sessions, 'sessões')}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                        <Users className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="text-sm text-gray-600">Contatos Ativos</p>
                          <p className="font-semibold">{formatLimit(plan.active_contacts, 'contatos')}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                        <MessageCircle className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="text-sm text-gray-600">Mensagens/Mês</p>
                          <p className="font-semibold">{formatLimit(plan.messages_per_month, 'mensagens')}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="text-sm text-gray-600">Templates</p>
                          <p className="font-semibold">{formatLimit(plan.template_models, 'modelos')}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                        <Users className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="text-sm text-gray-600">Usuários</p>
                          <p className="font-semibold">{formatLimit(plan.company_users, 'usuários')}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                        <Shield className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="text-sm text-gray-600">Funções</p>
                          <p className="font-semibold">{formatLimit(plan.roles_permissions, 'funções')}</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Campanhas e Automação */}
            <Card className="rounded-2xl border-gray-200">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  Campanhas e Automação
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {isCustomPlan ? (
                    <>
                      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="text-sm text-gray-600">Campanhas</p>
                          <p className="font-semibold">{formatPrice(plan.price_campaigns || 0)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                        <Target className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="text-sm text-gray-600">Campanhas Dinâmicas</p>
                          <p className="font-semibold">{formatPrice(plan.price_dynamic_campaigns || 0)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                        <Tag className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="text-sm text-gray-600">Marcadores</p>
                          <p className="font-semibold">{formatPrice(plan.price_tags || 0)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                        <Star className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="text-sm text-gray-600">Marcadores Inteligentes</p>
                          <p className="font-semibold">{formatPrice(plan.price_smart_tags || 0)}</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="text-sm text-gray-600">Campanhas Recorrentes</p>
                          <p className="font-semibold">{formatLimit(plan.recurring_campaigns, 'campanhas')}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                        <Target className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="text-sm text-gray-600">Campanhas Dinâmicas</p>
                          <p className="font-semibold">{formatLimit(plan.dynamic_campaigns, 'campanhas')}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                        <Tag className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="text-sm text-gray-600">Marcadores</p>
                          <p className="font-semibold">{formatLimit(plan.active_tags, 'marcadores')}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                        <Star className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="text-sm text-gray-600">Marcadores Inteligentes</p>
                          <p className="font-semibold">{formatLimit(plan.active_smart_tags, 'marcadores')}</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="mt-4">
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                    {plan.message_reception ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <span className="font-medium text-green-700">Recepção de Mensagens Ativa</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 text-red-600" />
                        <span className="font-medium text-red-700">Recepção de Mensagens Inativa</span>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Relatórios */}
            <Card className="rounded-2xl border-gray-200">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  Relatórios e Análise
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Relatórios Personalizados</p>
                    <p className="font-semibold">
                      {isCustomPlan 
                        ? formatPrice(plan.price_reports || 0) 
                        : formatLimit(plan.report_personalization, 'relatórios')
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Suporte */}
            <Card className="rounded-2xl border-gray-200 mb-6">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  Suporte e Notificações
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Tempo de Resposta do Suporte</p>
                    <Badge className={getSupportPriorityColor(plan.support_hours || 24)}>
                      {formatSupportHours(plan.support_hours || 24)}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                    {plan.implementation_help ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <span className="font-medium text-green-700">Ajuda de Implantação</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 text-red-600" />
                        <span className="font-medium text-red-700">Sem Ajuda de Implantação</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                    {plan.daily_whatsapp_notifications ? (
                      <>
                        <Bell className="w-5 h-5 text-green-600" />
                        <span className="font-medium text-green-700">Resumo Diário via WhatsApp</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 text-red-600" />
                        <span className="font-medium text-red-700">Sem Resumo Diário</span>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
        </div>

        {/* Footer */}
        <div className="flex justify-end items-center gap-3 p-6 bg-gray-50 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="rounded-xl"
          >
            Fechar
          </Button>
          
          {onActivate && (
            <Button
              onClick={() => !isCurrent && !isProcessing && onActivate(plan)}
              disabled={isCurrent || isProcessing}
              className={`rounded-xl ${
                isCurrent 
                  ? 'bg-blue-600 text-white cursor-not-allowed opacity-50' 
                  : isProcessing
                  ? 'bg-blue-400 text-white cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : isCurrent ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Plano Atual
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {isFree ? 'Ativar Grátis' : 'Ativar Plano'}
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}