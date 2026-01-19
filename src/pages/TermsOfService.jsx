import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Shield, AlertCircle, CheckCircle2 } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function TermsOfService() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Termos de Uso</h1>
            <p className="text-gray-600">Última atualização: 08 de dezembro de 2025</p>
          </div>
        </div>

        <Card className="rounded-3xl">
          <CardContent className="p-8 space-y-6">
            {/* Introdução */}
            <section>
              <p className="text-gray-700 leading-relaxed">
                Bem-vindo ao Sparta Sync. Ao acessar e utilizar nossa plataforma de gestão de relacionamento com clientes (CRM) e comunicação via WhatsApp, você concorda em cumprir e estar vinculado aos seguintes termos e condições de uso.
              </p>
            </section>

            {/* 1. Aceitação dos Termos */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                1. Aceitação dos Termos
              </h2>
              <p className="text-gray-700 leading-relaxed">
                Ao criar uma conta e utilizar o Sparta Sync, você declara ter lido, compreendido e aceito integralmente estes Termos de Uso e nossa Política de Privacidade. Caso não concorde com qualquer parte destes termos, você não deve utilizar nossos serviços.
              </p>
            </section>

            {/* 2. Descrição do Serviço */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">2. Descrição do Serviço</h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                O Sparta Sync é uma plataforma SaaS (Software as a Service) que oferece:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>Gestão de contatos e clientes (CRM)</li>
                <li>Integração com WhatsApp para envio e recepção de mensagens</li>
                <li>Criação e gerenciamento de campanhas de marketing</li>
                <li>Modelos de mensagens personalizáveis</li>
                <li>Sistema de tags e segmentação inteligente</li>
                <li>Relatórios e análises de desempenho</li>
                <li>Gestão de equipe e permissões</li>
              </ul>
            </section>

            {/* 3. Cadastro e Conta */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">3. Cadastro e Conta</h2>
              <div className="space-y-3 text-gray-700 leading-relaxed">
                <p>
                  <strong>3.1.</strong> Para utilizar o Sparta Sync, você deve criar uma conta fornecendo informações verdadeiras, precisas e completas.
                </p>
                <p>
                  <strong>3.2.</strong> Você é responsável por manter a confidencialidade de sua senha e por todas as atividades realizadas em sua conta.
                </p>
                <p>
                  <strong>3.3.</strong> Você deve notificar-nos imediatamente sobre qualquer uso não autorizado de sua conta.
                </p>
                <p>
                  <strong>3.4.</strong> Reservamo-nos o direito de suspender ou encerrar contas que violem estes termos ou que permaneçam inativas por períodos prolongados.
                </p>
              </div>
            </section>

            {/* 4. Uso Aceitável */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                4. Uso Aceitável
              </h2>
              <p className="text-gray-700 leading-relaxed mb-3">
                Ao utilizar o Sparta Sync, você concorda em NÃO:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>Enviar mensagens não solicitadas (spam) ou conteúdo ilegal</li>
                <li>Violar leis de proteção de dados (LGPD, GDPR, etc.)</li>
                <li>Utilizar a plataforma para fraudes, phishing ou atividades maliciosas</li>
                <li>Tentar hackear, comprometer ou acessar sistemas não autorizados</li>
                <li>Compartilhar conteúdo ofensivo, discriminatório ou que incite violência</li>
                <li>Revender ou redistribuir o acesso ao serviço sem autorização</li>
                <li>Utilizar automação ou bots que violem os Termos de Serviço do WhatsApp</li>
              </ul>
            </section>

            {/* 5. Planos e Pagamentos */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">5. Planos e Pagamentos</h2>
              <div className="space-y-3 text-gray-700 leading-relaxed">
                <p>
                  <strong>5.1.</strong> O Sparta Sync oferece diferentes planos de assinatura, incluindo um plano gratuito com recursos limitados.
                </p>
                <p>
                  <strong>5.2.</strong> Os pagamentos são processados através do Stripe, um processador de pagamentos de terceiros.
                </p>
                <p>
                  <strong>5.3.</strong> As assinaturas são renovadas automaticamente ao final de cada período de cobrança.
                </p>
                <p>
                  <strong>5.4.</strong> Você pode cancelar sua assinatura a qualquer momento, mas não haverá reembolso proporcional do período já pago.
                </p>
                <p>
                  <strong>5.5.</strong> Reservamo-nos o direito de alterar os preços dos planos mediante aviso prévio de 30 dias.
                </p>
              </div>
            </section>

            {/* 6. Integração com WhatsApp */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">6. Integração com WhatsApp</h2>
              <div className="space-y-3 text-gray-700 leading-relaxed">
                <p>
                  <strong>6.1.</strong> O Sparta Sync utiliza a API WAHA para se conectar ao WhatsApp. Você é responsável por garantir que suas sessões do WhatsApp estejam devidamente autorizadas.
                </p>
                <p>
                  <strong>6.2.</strong> Você deve cumprir os Termos de Serviço do WhatsApp ao utilizar nossa plataforma.
                </p>
                <p>
                  <strong>6.3.</strong> Não nos responsabilizamos por banimentos ou suspensões de contas do WhatsApp decorrentes do uso inadequado da plataforma.
                </p>
                <p>
                  <strong>6.4.</strong> Recomendamos práticas de envio responsáveis, respeitando limites de envio e evitando spam.
                </p>
              </div>
            </section>

            {/* 7. Propriedade Intelectual */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">7. Propriedade Intelectual</h2>
              <div className="space-y-3 text-gray-700 leading-relaxed">
                <p>
                  <strong>7.1.</strong> Todo o conteúdo, design, código-fonte e funcionalidades do Sparta Sync são de propriedade exclusiva da empresa e são protegidos por leis de direitos autorais.
                </p>
                <p>
                  <strong>7.2.</strong> Você mantém a propriedade de todos os dados que inserir na plataforma (contatos, mensagens, etc.).
                </p>
                <p>
                  <strong>7.3.</strong> Concedemos a você uma licença limitada, não exclusiva e revogável para utilizar a plataforma conforme estes termos.
                </p>
              </div>
            </section>

            {/* 8. Proteção de Dados */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">8. Proteção de Dados (LGPD)</h2>
              <div className="space-y-3 text-gray-700 leading-relaxed">
                <p>
                  <strong>8.1.</strong> Cumprimos integralmente a Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018).
                </p>
                <p>
                  <strong>8.2.</strong> Você é o controlador dos dados de seus clientes, e nós atuamos como operador.
                </p>
                <p>
                  <strong>8.3.</strong> É sua responsabilidade obter consentimento adequado de seus contatos antes de enviar mensagens.
                </p>
                <p>
                  <strong>8.4.</strong> Consulte nossa Política de Privacidade para mais detalhes sobre como tratamos os dados.
                </p>
              </div>
            </section>

            {/* 9. Limitação de Responsabilidade */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                9. Limitação de Responsabilidade
              </h2>
              <div className="space-y-3 text-gray-700 leading-relaxed">
                <p>
                  <strong>9.1.</strong> O Sparta Sync é fornecido "como está", sem garantias de qualquer tipo, expressas ou implícitas.
                </p>
                <p>
                  <strong>9.2.</strong> Não nos responsabilizamos por perdas de dados, interrupções de serviço ou danos indiretos.
                </p>
                <p>
                  <strong>9.3.</strong> Nossa responsabilidade total está limitada ao valor pago por você nos últimos 12 meses.
                </p>
                <p>
                  <strong>9.4.</strong> Não garantimos 100% de disponibilidade do serviço, embora nos esforcemos para manter alta disponibilidade.
                </p>
              </div>
            </section>

            {/* 10. Modificações dos Termos */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">10. Modificações dos Termos</h2>
              <p className="text-gray-700 leading-relaxed">
                Reservamo-nos o direito de modificar estes Termos de Uso a qualquer momento. Notificaremos você sobre alterações significativas via e-mail ou através da plataforma. O uso continuado do serviço após as alterações constitui aceitação dos novos termos.
              </p>
            </section>

            {/* 11. Rescisão */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">11. Rescisão</h2>
              <div className="space-y-3 text-gray-700 leading-relaxed">
                <p>
                  <strong>11.1.</strong> Você pode cancelar sua conta a qualquer momento através das configurações da plataforma.
                </p>
                <p>
                  <strong>11.2.</strong> Podemos suspender ou encerrar sua conta imediatamente em caso de violação destes termos.
                </p>
                <p>
                  <strong>11.3.</strong> Após o cancelamento, seus dados serão mantidos por 30 dias para permitir recuperação, e depois serão permanentemente excluídos.
                </p>
              </div>
            </section>

            {/* 12. Lei Aplicável */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">12. Lei Aplicável e Foro</h2>
              <p className="text-gray-700 leading-relaxed">
                Estes termos são regidos pelas leis da República Federativa do Brasil. Qualquer disputa será resolvida no foro da comarca de Belo Horizonte, Minas Gerais.
              </p>
            </section>

            {/* 13. Contato */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">13. Contato</h2>
              <p className="text-gray-700 leading-relaxed">
                Para dúvidas sobre estes Termos de Uso, entre em contato conosco através do e-mail: <a href="mailto:suporte@spartasync.com" className="text-blue-600 hover:underline">suporte@spartasync.com</a>
              </p>
            </section>

            {/* Footer */}
            <div className="pt-6 border-t border-gray-200">
              <div className="flex items-center gap-2 text-green-700 bg-green-50 p-4 rounded-xl">
                <CheckCircle2 className="w-5 h-5" />
                <p className="text-sm font-medium">
                  Ao utilizar o Sparta Sync, você concorda com estes termos
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}