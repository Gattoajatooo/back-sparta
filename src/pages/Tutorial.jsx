
import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  GraduationCap,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  X,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Eye,
  Smartphone,
  QrCode,
  Users,
  MessageSquare,
  Zap,
  Clock,
  Shield,
  Target,
  Settings,
  Activity,
  Star,
  BookOpen,
  Video,
  FileText,
  Lightbulb,
  Coffee
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";

export default function Tutorial() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTour, setSelectedTour] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [completedTours, setCompletedTours] = useState([]);
  const [tourProgress, setTourProgress] = useState({});
  const navigate = useNavigate();

  // Available tours
  const tours = [
    {
      id: 'connect',
      title: 'WhatsApp Connection',
      description: 'Aprenda como conectar seu WhatsApp ao sistema e gerenciar sessões',
      icon: QrCode,
      color: 'bg-green-100 text-green-800 border-green-200',
      bgColor: 'bg-gradient-to-br from-green-600 to-green-700',
      difficulty: 'Iniciante',
      duration: '5-7 min',
      steps: [
        {
          id: 'connect_intro',
          title: 'Bem-vindo à Conexão WhatsApp',
          description: 'Vamos aprender como conectar seu WhatsApp ao Sparta Sync para começar a enviar mensagens.',
          content: 'A conexão com WhatsApp é fundamental para usar todas as funcionalidades do sistema. Através desta integração, você poderá enviar mensagens individuais e em massa, gerenciar conversas e automatizar campanhas.',
          image: '/api/placeholder/600/400',
          tips: [
            'Certifique-se de ter o WhatsApp instalado no seu celular',
            'Mantenha seu celular próximo durante o processo',
            'Use uma conexão de internet estável'
          ]
        },
        {
          id: 'connect_page',
          title: 'Navegando para Connect',
          description: 'Primeiro, vamos acessar a página de conexão do WhatsApp.',
          content: 'A página Connect é onde você gerencia todas as suas conexões do WhatsApp. Aqui você pode criar novas sessões, visualizar o status das conexões e gerenciar múltiplas contas.',
          highlight: '.sidebar a[href*="Connect"]',
          action: 'Clique no menu "Connect" na barra lateral esquerda.',
          tips: [
            'O menu Connect está na seção "Sessions"',
            'O ícone é um QR Code',
            'Você pode favoritar esta página para acesso rápido'
          ]
        },
        {
          id: 'create_session',
          title: 'Criando uma Sessão',
          description: 'Aprenda como criar uma nova sessão de WhatsApp.',
          content: 'Uma sessão representa uma conexão ativa entre o Sparta Sync e uma conta do WhatsApp. Você pode ter múltiplas sessões ativas simultaneamente.',
          highlight: 'button:contains("Create Session")',
          action: 'Clique no botão "Create Session" para iniciar uma nova conexão.',
          tips: [
            'Cada sessão tem um ID único',
            'Você pode gerenciar até 5 sessões simultaneamente',
            'Sessions são criadas instantaneamente'
          ]
        },
        {
          id: 'qr_code',
          title: 'Conectando com QR Code',
          description: 'Use o QR Code para conectar seu WhatsApp.',
          content: 'Após criar a sessão, um QR Code será gerado. Use seu celular para escanear este código e estabelecer a conexão.',
          highlight: 'button:contains("Connect WhatsApp")',
          action: 'Clique em "Connect WhatsApp" e escaneie o QR Code com seu celular.',
          tips: [
            'Abra WhatsApp > Menu > Dispositivos vinculados',
            'Toque em "Vincular um dispositivo"',
            'Aponte a câmera para o QR Code na tela',
            'A conexão é estabelecida em segundos'
          ]
        },
        {
          id: 'session_status',
          title: 'Verificando o Status',
          description: 'Entenda os diferentes status de uma sessão.',
          content: 'Após a conexão, você verá o status da sessão. Os status incluem: Conectado (verde), Conectando (azul), Erro (vermelho) e Desconectado (cinza).',
          tips: [
            'Verde = Conexão ativa e funcionando',
            'Azul = Tentando conectar',
            'Vermelho = Erro na conexão',
            'Cinza = Desconectado ou pausado'
          ]
        }
      ]
    },
    {
      id: 'sessions',
      title: 'Sessions Management',
      description: 'Gerencie todas as suas sessões ativas do WhatsApp em um só lugar',
      icon: Smartphone,
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      bgColor: 'bg-gradient-to-br from-blue-600 to-blue-700',
      difficulty: 'Iniciante',
      duration: '4-6 min',
      steps: [
        {
          id: 'sessions_intro',
          title: 'Gerenciamento de Sessões',
          description: 'Aprenda a gerenciar todas as suas sessões do WhatsApp de forma eficiente.',
          content: 'A página Sessions é o centro de controle para todas as suas conexões WhatsApp. Aqui você monitora, controla e gerencia múltiplas sessões simultaneamente.',
          image: '/api/placeholder/600/400',
          tips: [
            'Monitore múltiplas sessões simultaneamente',
            'Controle individual cada conexão',
            'Visualize métricas em tempo real'
          ]
        },
        {
          id: 'sessions_page',
          title: 'Acessando Sessions',
          description: 'Navegue até a página de gerenciamento de sessões.',
          content: 'A página Sessions mostra todas as suas conexões WhatsApp organizadas em abas por status: Ativas, Paradas e Fechadas.',
          highlight: '.sidebar a[href*="Sessions"]',
          action: 'Clique no menu "Sessions" na barra lateral.',
          tips: [
            'Sessions fica na seção "Sessions"',
            'O ícone é um smartphone',
            'Atualiza em tempo real'
          ]
        },
        {
          id: 'session_tabs',
          title: 'Abas de Status',
          description: 'Entenda as diferentes abas de status das sessões.',
          content: 'As sessões são organizadas em três categorias: Active (funcionando), Stopped (pausadas) e Closed (encerradas). Cada aba mostra informações específicas.',
          highlight: '.tabs-list',
          action: 'Clique nas abas para navegar entre os diferentes status.',
          tips: [
            'Active = Sessões funcionando normalmente',
            'Stopped = Sessões pausadas temporariamente',
            'Closed = Sessões encerradas permanentemente'
          ]
        },
        {
          id: 'session_actions',
          title: 'Ações da Sessão',
          description: 'Controle suas sessões com ações rápidas.',
          content: 'Cada sessão tem um menu de ações que permite pausar, parar, retomar ou ver detalhes. Use estas ações para controlar individualmente cada conexão.',
          highlight: 'button[aria-haspopup="menu"]',
          action: 'Clique no menu ⋮ em qualquer sessão para ver as opções.',
          tips: [
            'Pause = Para temporariamente',
            'Stop = Para permanentemente',
            'Resume = Reativa sessão pausada',
            'Details = Informações detalhadas'
          ]
        },
        {
          id: 'session_info',
          title: 'Informações da Sessão',
          description: 'Entenda as informações exibidas em cada sessão.',
          content: 'Cada card de sessão mostra: ID da sessão, telefone, nome do contato, status de conexão, quantidade de mensagens enviadas/recebidas e qualidade da conexão.',
          tips: [
            'ID único para identificação',
            'Status com código de cores',
            'Contadores de mensagens',
            'Indicador de qualidade da conexão',
            'Dispositivo usado na conexão'
          ]
        },
        {
          id: 'view_modes',
          title: 'Modos de Visualização',
          description: 'Escolha como visualizar suas sessões.',
          content: 'Você pode alternar entre visualização em grade (cards) e lista (compacta). Também pode ajustar o número de colunas ou compactação da lista.',
          highlight: 'button:contains("Grid View"), button:contains("List View")',
          action: 'Use os botões de visualização para alterar o layout.',
          tips: [
            'Grid = Visual com cards grandes',
            'List = Compacto, mais informações',
            'Ajuste colunas na grade',
            'Diferentes níveis de compactação'
          ]
        }
      ]
    },
    {
      id: 'contacts',
      title: 'Contact Management',
      description: 'Gerencie sua base de contatos e organize campanhas inteligentes',
      icon: Users,
      color: 'bg-purple-100 text-purple-800 border-purple-200',
      bgColor: 'bg-gradient-to-br from-purple-600 to-purple-700',
      difficulty: 'Intermediário',
      duration: '8-10 min',
      comingSoon: true
    },
    {
      id: 'campaigns',
      title: 'Campaign Creation',
      description: 'Crie campanhas automatizadas e personalizadas para seus clientes',
      icon: Target,
      color: 'bg-orange-100 text-orange-800 border-orange-200',
      bgColor: 'bg-gradient-to-br from-orange-600 to-orange-700',
      difficulty: 'Avançado',
      duration: '12-15 min',
      comingSoon: true
    }
  ];

  useEffect(() => {
    loadData();
    loadProgress();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);
    } catch (error) {
      console.error("Error loading user:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProgress = () => {
    const saved = localStorage.getItem('sparta_tutorial_progress');
    if (saved) {
      const progress = JSON.parse(saved);
      setTourProgress(progress.tours || {});
      setCompletedTours(progress.completed || []);
    }
  };

  const saveProgress = (tourId, stepIndex, completed = false) => {
    const newProgress = { ...tourProgress };
    if (!newProgress[tourId]) {
      newProgress[tourId] = { currentStep: 0, completed: false };
    }
    newProgress[tourId].currentStep = stepIndex;
    newProgress[tourId].completed = completed;

    let newCompleted = [...completedTours];
    if (completed && !newCompleted.includes(tourId)) {
      newCompleted.push(tourId);
    }

    setTourProgress(newProgress);
    setCompletedTours(newCompleted);

    localStorage.setItem('sparta_tutorial_progress', JSON.stringify({
      tours: newProgress,
      completed: newCompleted
    }));
  };

  const startTour = (tour) => {
    if (tour.comingSoon) return;
    
    const savedStep = tourProgress[tour.id]?.currentStep || 0;
    setSelectedTour(tour);
    setCurrentStep(savedStep);
    setIsPlaying(true);
  };

  const closeTour = () => {
    setSelectedTour(null);
    setCurrentStep(0);
    setIsPlaying(false);
    // Remove highlight overlay
    document.querySelector('.tutorial-overlay')?.remove();
  };

  const nextStep = () => {
    if (!selectedTour) return;
    
    const nextStepIndex = Math.min(currentStep + 1, selectedTour.steps.length - 1);
    setCurrentStep(nextStepIndex);
    saveProgress(selectedTour.id, nextStepIndex);

    // If last step, mark as completed
    if (nextStepIndex === selectedTour.steps.length - 1) {
      setTimeout(() => {
        saveProgress(selectedTour.id, nextStepIndex, true);
        closeTour();
      }, 2000);
    }

    highlightElement(selectedTour.steps[nextStepIndex]);
  };

  const prevStep = () => {
    if (!selectedTour) return;
    
    const prevStepIndex = Math.max(currentStep - 1, 0);
    setCurrentStep(prevStepIndex);
    saveProgress(selectedTour.id, prevStepIndex);
    highlightElement(selectedTour.steps[prevStepIndex]);
  };

  const goToStep = (stepIndex) => {
    setCurrentStep(stepIndex);
    saveProgress(selectedTour.id, stepIndex);
    highlightElement(selectedTour.steps[stepIndex]);
  };

  const highlightElement = (step) => {
    // Remove existing overlay
    document.querySelector('.tutorial-overlay')?.remove();

    if (!step.highlight) return;

    // If highlight requires navigation, go to page first
    if (step.highlight.includes('sidebar')) {
      // Don't navigate during tutorial, just show explanation
      return;
    }

    setTimeout(() => {
      const element = document.querySelector(step.highlight);
      if (element) {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'tutorial-overlay';
        overlay.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          z-index: 9998;
          pointer-events: none;
        `;

        // Get element position
        const rect = element.getBoundingClientRect();
        const highlight = document.createElement('div');
        highlight.style.cssText = `
          position: fixed;
          top: ${rect.top - 8}px;
          left: ${rect.left - 8}px;
          width: ${rect.width + 16}px;
          height: ${rect.height + 16}px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 0 9999px rgba(0, 0, 0, 0.7);
          z-index: 9999;
          pointer-events: none;
          animation: pulse 2s infinite;
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(highlight);

        // Add pulse animation
        const style = document.createElement('style');
        style.textContent = `
          @keyframes pulse {
            0%, 100% { box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 0 9999px rgba(0, 0, 0, 0.7); }
            50% { box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.8), 0 0 0 9999px rgba(0, 0, 0, 0.7); }
          }
        `;
        document.head.appendChild(style);

        // Scroll element into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 500);
  };

  const getTourIcon = (tour) => {
    const IconComponent = tour.icon;
    return <IconComponent className="w-6 h-6" />;
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Iniciante':
        return 'bg-green-100 text-green-800';
      case 'Intermediário':
        return 'bg-yellow-100 text-yellow-800';
      case 'Avançado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl flex items-center justify-center">
          <GraduationCap className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tutorial</h1>
          <p className="text-gray-600">
            Aprenda a usar o Sparta Sync com nossos tutoriais interativos
          </p>
        </div>
      </div>

      {/* Progress Overview */}
      <Card className="rounded-3xl border-gray-200 bg-gradient-to-br from-indigo-50 to-blue-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Seu Progresso</h3>
              <p className="text-gray-600">Complete todos os tutoriais para dominar o sistema</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-indigo-600">{completedTours.length}/{tours.length}</p>
              <p className="text-sm text-gray-500">Concluídos</p>
            </div>
          </div>
          <Progress value={(completedTours.length / tours.length) * 100} className="h-3 rounded-full" />
        </CardContent>
      </Card>

      {/* Getting Started */}
      <Card className="rounded-3xl border-gray-200">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-yellow-100 rounded-xl flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <CardTitle>Começando</CardTitle>
              <p className="text-sm text-gray-500">Dicas para aproveitar melhor os tutoriais</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-2xl">
            <Coffee className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-blue-900">Reserve um tempo</h4>
              <p className="text-sm text-blue-700">Cada tutorial leva alguns minutos. Reserve um tempo sem interrupções.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-green-50 rounded-2xl">
            <Eye className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-green-900">Siga o destaque</h4>
              <p className="text-sm text-green-700">Elementos destacados mostram onde focar sua atenção.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-2xl">
            <Star className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-purple-900">Pratique depois</h4>
              <p className="text-sm text-purple-700">Após o tutorial, pratique os passos aprendidos.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Tours */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tours.map((tour) => {
          const isCompleted = completedTours.includes(tour.id);
          const progress = tourProgress[tour.id];
          const progressPercent = progress ? ((progress.currentStep + 1) / tour.steps.length) * 100 : 0;

          return (
            <Card key={tour.id} className="rounded-3xl border-gray-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 ${tour.bgColor} rounded-2xl flex items-center justify-center text-white`}>
                    {getTourIcon(tour)}
                  </div>
                  
                  <div className="flex gap-2">
                    {isCompleted && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200 rounded-full text-xs">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Concluído
                      </Badge>
                    )}
                    {tour.comingSoon && (
                      <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200 rounded-full text-xs">
                        Em breve
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{tour.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2">{tour.description}</p>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{tour.duration}</span>
                    </div>
                    <Badge variant="outline" className={`rounded-full text-xs ${getDifficultyColor(tour.difficulty)}`}>
                      {tour.difficulty}
                    </Badge>
                  </div>

                  {progress && !isCompleted && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Progresso</span>
                        <span className="text-gray-900">{progress.currentStep + 1}/{tour.steps.length}</span>
                      </div>
                      <Progress value={progressPercent} className="h-2 rounded-full" />
                    </div>
                  )}

                  <Button
                    onClick={() => startTour(tour)}
                    disabled={tour.comingSoon}
                    className={`w-full rounded-2xl ${
                      tour.comingSoon 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : isCompleted
                          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          : tour.bgColor.replace('bg-gradient-to-br', 'bg-gradient-to-r') + ' text-white hover:opacity-90'
                    }`}
                  >
                    {tour.comingSoon ? (
                      <>
                        <Clock className="w-4 h-4 mr-2" />
                        Em Breve
                      </>
                    ) : isCompleted ? (
                      <>
                        <Eye className="w-4 h-4 mr-2" />
                        Revisar
                      </>
                    ) : progress ? (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Continuar
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Começar
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tutorial Modal */}
      <AnimatePresence>
        {selectedTour && (
          <Dialog open={true} onOpenChange={closeTour}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl p-0">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col h-full"
              >
                {/* Header */}
                <DialogHeader className="p-6 pb-0 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${selectedTour.bgColor} rounded-2xl flex items-center justify-center text-white`}>
                        {getTourIcon(selectedTour)}
                      </div>
                      <div>
                        <DialogTitle className="text-xl">{selectedTour.title}</DialogTitle>
                        <DialogDescription className="text-gray-500">
                          Passo {currentStep + 1} de {selectedTour.steps.length}
                        </DialogDescription>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={closeTour} className="rounded-full">
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                  
                  {/* Progress */}
                  <div className="mt-4">
                    <Progress 
                      value={((currentStep + 1) / selectedTour.steps.length) * 100} 
                      className="h-2 rounded-full" 
                    />
                  </div>
                </DialogHeader>

                {/* Content */}
                <div className="flex-1 p-6 overflow-auto">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentStep}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      {/* Step Content */}
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-3">
                          {selectedTour.steps[currentStep].title}
                        </h3>
                        <p className="text-lg text-gray-600 mb-4">
                          {selectedTour.steps[currentStep].description}
                        </p>
                        <div className="prose max-w-none">
                          <p className="text-gray-700 leading-relaxed">
                            {selectedTour.steps[currentStep].content}
                          </p>
                        </div>
                      </div>

                      {/* Action */}
                      {selectedTour.steps[currentStep].action && (
                        <div className="bg-blue-50 rounded-2xl p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
                              <Target className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-blue-900">Ação</h4>
                              <p className="text-blue-700">{selectedTour.steps[currentStep].action}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Tips */}
                      {selectedTour.steps[currentStep].tips && (
                        <div className="bg-yellow-50 rounded-2xl p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
                              <Lightbulb className="w-4 h-4 text-yellow-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-yellow-900 mb-2">Dicas</h4>
                              <ul className="space-y-1">
                                {selectedTour.steps[currentStep].tips.map((tip, index) => (
                                  <li key={index} className="text-yellow-800 text-sm flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 bg-yellow-600 rounded-full mt-2 flex-shrink-0"></span>
                                    <span>{tip}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="p-6 pt-0 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      onClick={prevStep}
                      disabled={currentStep === 0}
                      className="rounded-2xl"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Anterior
                    </Button>

                    <div className="flex items-center gap-2">
                      {selectedTour.steps.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => goToStep(index)}
                          className={`w-3 h-3 rounded-full transition-colors ${
                            index === currentStep 
                              ? selectedTour.bgColor.replace('bg-gradient-to-br', 'bg') 
                              : index < currentStep 
                                ? 'bg-green-500' 
                                : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>

                    <Button
                      onClick={nextStep}
                      disabled={currentStep === selectedTour.steps.length - 1}
                      className={`rounded-2xl ${selectedTour.bgColor} text-white`}
                    >
                      {currentStep === selectedTour.steps.length - 1 ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Concluir
                        </>
                      ) : (
                        <>
                          Próximo
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}
