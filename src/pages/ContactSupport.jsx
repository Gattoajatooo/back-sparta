
import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  HeadphonesIcon,
  Mail,
  Phone,
  MessageSquare,
  Send,
  Clock,
  CheckCircle2,
  ExternalLink,
  Users,
  Zap,
  Star,
  MapPin
} from "lucide-react";
import { SendEmail } from "@/integrations/Core";

export default function ContactSupport() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Contact form
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    subject: "",
    category: "",
    priority: "medium",
    message: ""
  });

  const supportChannels = [
    {
      id: "whatsapp",
      name: "WhatsApp",
      description: "Resposta rápida via WhatsApp",
      icon: MessageSquare,
      color: "bg-green-100 text-green-800",
      contact: "+55 11 99999-9999",
      action: "Abrir WhatsApp",
      available: "24/7",
      responseTime: "< 5 min"
    },
    {
      id: "email",
      name: "E-mail",
      description: "Suporte técnico detalhado",
      icon: Mail,
      color: "bg-blue-100 text-blue-800",
      contact: "suporte@spartasync.com",
      action: "Enviar E-mail",
      available: "24/7",
      responseTime: "< 2 horas"
    },
    {
      id: "phone",
      name: "Telefone",
      description: "Atendimento telefônico",
      icon: Phone,
      color: "bg-purple-100 text-purple-800",
      contact: "+55 11 3333-4444",
      action: "Ligar Agora",
      available: "Seg-Sex 8h-18h",
      responseTime: "Imediato"
    }
  ];

  const categories = [
    { id: "technical", name: "Problema Técnico", icon: Zap },
    { id: "account", name: "Conta e Faturamento", icon: Users },
    { id: "feature", name: "Solicitação de Funcionalidade", icon: Star },
    { id: "general", name: "Dúvida Geral", icon: HeadphonesIcon }
  ];

  const priorities = [
    { id: "low", name: "Baixa", color: "text-gray-600" },
    { id: "medium", name: "Média", color: "text-yellow-600" },
    { id: "high", name: "Alta", color: "text-red-600" },
    { id: "urgent", name: "Urgente", color: "text-red-800" }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);
      
      // Pre-fill form with user data
      setContactForm(prev => ({
        ...prev,
        name: currentUser.full_name || "",
        email: currentUser.email || ""
      }));
    } catch (error) {
      console.error("Error loading user:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChannelAction = (channel) => {
    switch (channel.id) {
      case "whatsapp":
        const whatsappUrl = `https://wa.me/${channel.contact.replace(/\D/g, '')}?text=Olá, preciso de suporte com o Sparta Sync`;
        window.open(whatsappUrl, '_blank');
        break;
      case "email":
        const emailUrl = `mailto:${channel.contact}?subject=Suporte Sparta Sync`;
        window.open(emailUrl, '_blank');
        break;
      case "phone":
        window.open(`tel:${channel.contact}`, '_self');
        break;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSending(true);
    setError("");
    setSuccess("");

    try {
      const category = categories.find(cat => cat.id === contactForm.category);
      const priority = priorities.find(p => p.id === contactForm.priority);

      const emailBody = `
Novo contato de suporte:

Nome: ${contactForm.name}
E-mail: ${contactForm.email}
Categoria: ${category?.name || 'Não especificada'}
Prioridade: ${priority?.name || 'Média'}

Assunto: ${contactForm.subject}

Mensagem:
${contactForm.message}

---
Enviado através do sistema Sparta Sync
      `.trim();

      await SendEmail({
        to: "suporte@spartasync.com",
        subject: `[${priority?.name.toUpperCase()}] ${contactForm.subject}`,
        body: emailBody,
        from_name: contactForm.name
      });

      setSuccess("Mensagem enviada com sucesso! Nossa equipe entrará em contato em breve.");
      
      // Reset form
      setContactForm({
        name: user?.full_name || "",
        email: user?.email || "",
        subject: "",
        category: "",
        priority: "medium",
        message: ""
      });

      setTimeout(() => setSuccess(""), 5000);
    } catch (error) {
      console.error("Error sending message:", error);
      setError("Erro ao enviar mensagem. Tente novamente ou use outro canal de contato.");
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center">
          <HeadphonesIcon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contact Support</h1>
          <p className="text-gray-600">
            Entre em contato conosco através dos canais disponíveis ou envie uma mensagem
          </p>
        </div>
      </div>

      {/* Alerts */}
      {success && (
        <Alert className="rounded-2xl bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="rounded-2xl">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Support Channels */}
      <div className="grid md:grid-cols-3 gap-6">
        {supportChannels.map(channel => {
          const Icon = channel.icon;
          
          return (
            <Card key={channel.id} className="rounded-3xl border-gray-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className={`w-16 h-16 ${channel.color} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                    <Icon className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{channel.name}</h3>
                  <p className="text-gray-600 mb-3">{channel.description}</p>
                  <div className="space-y-2 text-sm text-gray-500 mb-4">
                    <div className="flex items-center justify-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{channel.available}</span>
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <Zap className="w-4 h-4" />
                      <span>Resposta {channel.responseTime}</span>
                    </div>
                  </div>
                  <Button 
                    onClick={() => handleChannelAction(channel)}
                    className="w-full rounded-2xl"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    {channel.action}
                  </Button>
                  <p className="text-xs text-gray-500 mt-2">{channel.contact}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Contact Form */}
      <Card className="rounded-3xl border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-6 h-6 text-blue-600" />
            Enviar Mensagem de Suporte
          </CardTitle>
          <p className="text-sm text-gray-600">
            Descreva detalhadamente seu problema ou dúvida para que possamos ajudar melhor.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  id="name"
                  value={contactForm.name}
                  onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Seu nome completo"
                  className="rounded-2xl border-gray-200"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="seu@email.com"
                  className="rounded-2xl border-gray-200"
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Select value={contactForm.category} onValueChange={(value) => setContactForm(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger className="rounded-2xl border-gray-200">
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Prioridade</Label>
                <Select value={contactForm.priority} onValueChange={(value) => setContactForm(prev => ({ ...prev, priority: value }))}>
                  <SelectTrigger className="rounded-2xl border-gray-200">
                    <SelectValue placeholder="Selecione a prioridade" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {priorities.map(priority => (
                      <SelectItem key={priority.id} value={priority.id}>
                        <span className={priority.color}>{priority.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Assunto *</Label>
              <Input
                id="subject"
                value={contactForm.subject}
                onChange={(e) => setContactForm(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Descreva resumidamente o problema"
                className="rounded-2xl border-gray-200"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Mensagem *</Label>
              <Textarea
                id="message"
                value={contactForm.message}
                onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Descreva detalhadamente seu problema ou dúvida..."
                className="rounded-2xl border-gray-200 min-h-[120px]"
                required
              />
            </div>

            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={isSending}
                className="bg-blue-600 hover:bg-blue-700 rounded-2xl px-8"
              >
                {isSending ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Enviando...
                  </div>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar Mensagem
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Office Info */}
      <Card className="rounded-3xl border-gray-200 bg-gradient-to-br from-gray-50 to-blue-50">
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                Escritório Principal
              </h3>
              <div className="space-y-2 text-gray-600">
                <p>Sparta Sync Tecnologia Ltda.</p>
                <p>Rua das Inovações, 123 - Sala 456</p>
                <p>Vila Madalena - São Paulo/SP</p>
                <p>CEP: 05432-000</p>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                Horários de Atendimento
              </h3>
              <div className="space-y-2 text-gray-600">
                <p><span className="font-medium">WhatsApp:</span> 24h por dia, 7 dias por semana</p>
                <p><span className="font-medium">E-mail:</span> 24h por dia, 7 dias por semana</p>
                <p><span className="font-medium">Telefone:</span> Segunda à Sexta, 8h às 18h</p>
                <p><span className="font-medium">Sábado:</span> 9h às 14h</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
