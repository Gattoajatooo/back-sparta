import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Database, Lock, Eye, UserCheck, Globe, AlertTriangle } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function PrivacyPolicy() {
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
            <h1 className="text-3xl font-bold text-gray-900">Política de Privacidade</h1>
            <p className="text-gray-600">Última atualização: 08 de dezembro de 2025</p>
          </div>
        </div>

        <Card className="rounded-3xl">
          <CardContent className="p-8 space-y-6">
            {/* Introdução */}
            <section>
              <p className="text-gray-700 leading-relaxed">
                A Sparta Sync está comprometida em proteger sua privacidade e a dos dados que você processa através de nossa plataforma. Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos suas informações pessoais em conformidade com a Lei Geral de Proteção de Dados (LGPD).
              </p>
            </section>

            {/* 1. Dados Coletados */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-600" />
                1. Dados que Coletamos
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">1.1. Dados da Sua Conta</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                    <li>Nome completo e e-mail</li>
                    <li>Informações da empresa (nome, CNPJ, endereço, telefone)</li>
                    <li>Dados de autenticação (senha criptografada ou OAuth)</li>
                    <li>Informações de pagamento (processadas pelo Stripe)</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">1.2. Dados dos Seus Contatos</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                    <li>Nome, telefone, e-mail dos contatos que você importar</li>
                    <li>Histórico de mensagens enviadas e recebidas</li>
                    <li>Tags, anotações e segmentações criadas por você</li>
                    <li>Métricas de engajamento (aberturas, cliques, respostas)</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">1.3. Dados de Uso</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                    <li>Logs de acesso e atividades na plataforma</li>
                    <li>Endereço IP, navegador e dispositivo utilizado</li>
                    <li>Estatísticas de uso e desempenho</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 2. Como Usamos os Dados */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-600" />
                2. Como Usamos os Dados
              </h2>
              <p className="text-gray-700 leading-relaxed mb-3">Utilizamos seus dados para:</p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>Fornecer e operar os serviços da plataforma</li>
                <li>Processar pagamentos e gerenciar assinaturas</li>
                <li>Enviar notificações importantes sobre sua conta</li>
                <li>Melhorar nossos serviços e desenvolver novos recursos</li>
                <li>Garantir a segurança e prevenir fraudes</li>
                <li>Cumprir obrigações legais e regulatórias</li>
                <li>Prestar suporte técnico e atendimento ao cliente</li>
              </ul>
            </section>

            {/* 3. Papel como Operador */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-600" />
                3. Nosso Papel como Operador de Dados
              </h2>
              <p className="text-gray-700 leading-relaxed">
                Em relação aos dados dos seus contatos e clientes, você é o <strong>Controlador</strong> e nós somos o <strong>Operador</strong>, conforme definido pela LGPD. Isso significa que você é responsável por obter consentimento dos seus contatos e garantir que o uso da plataforma está em conformidade com as leis de proteção de dados.
              </p>
            </section>

            {/* 4. Compartilhamento de Dados */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-600" />
                4. Compartilhamento de Dados
              </h2>
              <p className="text-gray-700 leading-relaxed mb-3">Podemos compartilhar seus dados com:</p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li><strong>Stripe:</strong> Para processamento de pagamentos</li>
                <li><strong>WAHA API:</strong> Para integração com WhatsApp</li>
                <li><strong>Provedores de infraestrutura:</strong> Para hospedagem e armazenamento (AWS, Google Cloud, etc.)</li>
                <li><strong>Autoridades governamentais:</strong> Quando exigido por lei</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-3">
                <strong>Importante:</strong> Nunca vendemos ou alugamos seus dados para terceiros.
              </p>
            </section>

            {/* 5. Segurança */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Lock className="w-5 h-5 text-blue-600" />
                5. Segurança dos Dados
              </h2>
              <p className="text-gray-700 leading-relaxed mb-3">Implementamos medidas técnicas e organizacionais para proteger seus dados:</p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>Criptografia de dados em trânsito (SSL/TLS) e em repouso</li>
                <li>Controle de acesso baseado em funções e permissões</li>
                <li>Monitoramento contínuo de segurança</li>
                <li>Backups regulares e plano de recuperação de desastres</li>
                <li>Autenticação de dois fatores (2FA) para administradores</li>
              </ul>
            </section>

            {/* 6. Retenção de Dados */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">6. Retenção de Dados</h2>
              <div className="space-y-3 text-gray-700 leading-relaxed">
                <p>
                  <strong>6.1.</strong> Mantemos seus dados enquanto sua conta estiver ativa.
                </p>
                <p>
                  <strong>6.2.</strong> Após o cancelamento, seus dados são mantidos por 30 dias para recuperação e depois permanentemente excluídos.
                </p>
                <p>
                  <strong>6.3.</strong> Alguns dados podem ser mantidos por períodos mais longos para cumprimento de obrigações legais.
                </p>
              </div>
            </section>

            {/* 7. Seus Direitos */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">7. Seus Direitos (LGPD)</h2>
              <p className="text-gray-700 leading-relaxed mb-3">Você tem o direito de:</p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li><strong>Acesso:</strong> Solicitar cópia dos seus dados pessoais</li>
                <li><strong>Correção:</strong> Atualizar ou corrigir dados incorretos</li>
                <li><strong>Exclusão:</strong> Solicitar a exclusão dos seus dados</li>
                <li><strong>Portabilidade:</strong> Exportar seus dados em formato estruturado</li>
                <li><strong>Revogação de consentimento:</strong> Retirar consentimento a qualquer momento</li>
                <li><strong>Oposição:</strong> Opor-se ao processamento de dados em determinadas situações</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-3">
                Para exercer esses direitos, entre em contato através de <a href="mailto:privacidade@spartasync.com" className="text-blue-600 hover:underline">privacidade@spartasync.com</a>
              </p>
            </section>

            {/* 8. Cookies */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">8. Cookies e Tecnologias Similares</h2>
              <p className="text-gray-700 leading-relaxed">
                Utilizamos cookies essenciais para o funcionamento da plataforma, como sessões de autenticação e preferências de usuário. Não utilizamos cookies de rastreamento ou publicidade.
              </p>
            </section>

            {/* 9. Transferência Internacional */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">9. Transferência Internacional de Dados</h2>
              <p className="text-gray-700 leading-relaxed">
                Seus dados podem ser armazenados em servidores localizados fora do Brasil, mas sempre garantimos que os provedores de infraestrutura cumpram padrões adequados de proteção de dados.
              </p>
            </section>

            {/* 10. Alterações */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">10. Alterações na Política de Privacidade</h2>
              <p className="text-gray-700 leading-relaxed">
                Podemos atualizar esta política periodicamente. Você será notificado sobre alterações significativas via e-mail ou através da plataforma.
              </p>
            </section>

            {/* Footer */}
            <div className="pt-6 border-t border-gray-200">
              <div className="flex items-center gap-2 text-blue-700 bg-blue-50 p-4 rounded-xl">
                <Shield className="w-5 h-5" />
                <p className="text-sm font-medium">
                  Sua privacidade é nossa prioridade. Cumprimos integralmente a LGPD.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}