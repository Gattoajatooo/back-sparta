import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Company } from "@/entities/Company";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  User as UserIcon,
  Mail,
  Phone,
  Building2,
  Calendar,
  Shield,
  Save,
  Camera,
  CheckCircle2,
  AlertCircle,
  Lock,
  Eye,
  EyeOff,
  MapPin,
  Bell,
  MessageSquare,
  Loader2,
  Settings,
  Clock,
  Sparkles,
  Target,
  TrendingUp,
  Briefcase,
  ChevronDown,
  Database
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { base44 } from "@/api/base44Client";
import PushNotificationSetup from "@/components/notifications/PushNotificationSetup";

export default function ProfileSettings() {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("profile");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);

  // Detectar se usuário é SSO
  const isEmailPasswordUser = user?.app_metadata?.provider === 'email' || !user?.app_metadata?.provider;

  // Profile form data
  const [profileData, setProfileData] = useState({
    full_name: "",
    email: "",
    phone: "",
    department: "",
    avatar_url: "",
    cep: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    country: "Brasil"
  });

  // Company data (read-only)
  const [companyData, setCompanyData] = useState({
    name: "",
    website: "",
    phone: "",
    address: "",
    industry: ""
  });

  // Security settings
  const [securityData, setSecurityData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
    two_factor_enabled: false
  });

  // WhatsApp notification settings
  const [whatsappNotifications, setWhatsappNotifications] = useState({
    enabled: true,
    phone_verified: false,
    is_checking: false
  });

  // System settings
  const [systemSettings, setSystemSettings] = useState({
    approval_days_window: 7
  });

  // Message reception settings
  const [messageReceptionSettings, setMessageReceptionSettings] = useState({
    mode: 'contacts_only',
    proactive_days: 7
  });

  // Product settings
  const [productSettings, setProductSettings] = useState({
    mode: 'simplified'
  });

  // AI Configuration
  const [aiConfig, setAiConfig] = useState({
    enabled: false,
    name: "Atena",
    business_description: "",
    business_sector: "",
    target_audience: "",
    main_products_services: "",
    value_proposition: "",
    company_tone: "",
    business_goals: "",
    competitive_advantages: "",
    permissions: {
      contacts: "view",
      campaigns: "none",
      messages: "view",
      templates: "none",
      products: "view"
    }
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);

      // Set profile form data
      setProfileData({
        full_name: currentUser.full_name || "",
        email: currentUser.email || "",
        phone: currentUser.phone || "",
        department: currentUser.department || "",
        avatar_url: currentUser.avatar_url || "",
        cep: currentUser.cep || "",
        street: currentUser.street || "",
        number: currentUser.number || "",
        complement: currentUser.complement || "",
        neighborhood: currentUser.neighborhood || "",
        city: currentUser.city || "",
        state: currentUser.state || "",
        country: currentUser.country || "Brasil"
      });

      // Set WhatsApp notification data
      setWhatsappNotifications({
        enabled: currentUser.whatsapp_notifications_enabled !== false,
        phone_verified: currentUser.whatsapp_phone_verified || false,
        is_checking: false
      });

      // Set System settings
      setSystemSettings({
        approval_days_window: currentUser.approval_days_window || 7
      });

      if (currentUser.company_id) {
        const companies = await Company.list();
        const userCompany = companies.find(c => c.id === currentUser.company_id);
        if (userCompany) {
          setCompany(userCompany);
          setCompanyData({
            name: userCompany.name || "",
            website: userCompany.website || "",
            phone: userCompany.phone || "",
            address: userCompany.address || "",
            industry: userCompany.industry || ""
          });

          // Set message reception settings from company
          setMessageReceptionSettings({
            mode: userCompany.settings?.message_reception_mode || 'contacts_only',
            proactive_days: userCompany.settings?.proactive_days_window || 7
          });

          // Set product settings from company
          setProductSettings({
            mode: userCompany.settings?.product_mode || 'simplified'
          });

          // Set AI configuration from company
          setAiConfig({
            enabled: userCompany.settings?.ai_enabled || false,
            name: userCompany.settings?.ai_name || "Atena",
            business_description: userCompany.settings?.ai_business_description || "",
            business_sector: userCompany.settings?.ai_business_sector || "",
            target_audience: userCompany.settings?.ai_target_audience || "",
            main_products_services: userCompany.settings?.ai_main_products_services || "",
            value_proposition: userCompany.settings?.ai_value_proposition || "",
            company_tone: userCompany.settings?.ai_company_tone || "",
            business_goals: userCompany.settings?.ai_business_goals || "",
            competitive_advantages: userCompany.settings?.ai_competitive_advantages || "",
            permissions: userCompany.settings?.ai_permissions || {
              contacts: "view",
              campaigns: "none",
              messages: "view",
              templates: "none",
              products: "view"
            }
          });
        }
      }
    } catch (error) {
      console.error("Error loading user data:", error);
      setMessage("Erro ao carregar dados do usuário");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage("Por favor, selecione uma imagem válida");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage("A imagem deve ter menos de 5MB");
      return;
    }

    setIsUploadingAvatar(true);
    setMessage("");

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      setProfileData(prev => ({ ...prev, avatar_url: file_url }));
      
      await User.updateMyUserData({ avatar_url: file_url });
      
      setMessage("Foto de perfil atualizada com sucesso!");
      setTimeout(() => setMessage(""), 3000);
      loadUserData();
    } catch (error) {
      console.error("Error uploading avatar:", error);
      setMessage("Erro ao fazer upload da foto. Tente novamente.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleCepLookup = async (cep) => {
    const cleanCep = cep.replace(/\D/g, '');
    
    if (cleanCep.length !== 8) return;

    setIsLoadingCep(true);
    
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (data.erro) {
        setMessage("CEP não encontrado");
        return;
      }

      setProfileData(prev => ({
        ...prev,
        street: data.logradouro || "",
        neighborhood: data.bairro || "",
        city: data.localidade || "",
        state: data.uf || "",
        complement: data.complemento || prev.complement
      }));
    } catch (error) {
      console.error("Error fetching CEP:", error);
      setMessage("Erro ao buscar CEP");
    } finally {
      setIsLoadingCep(false);
    }
  };

  const handleProfileSave = async () => {
    setIsSaving(true);
    setMessage("");

    try {
      let phoneToSave = profileData.phone;
      let phoneVerified = false;

      // Verificar número no WhatsApp se houver telefone
      if (profileData.phone) {
        try {
          const response = await base44.functions.invoke('checkExistsContact', {
            phones: [profileData.phone]
          });

          if (response.data?.success && response.data.results?.length > 0) {
            const result = response.data.results[0];

            if (result.exists && result.verified_phone) {
              phoneToSave = result.verified_phone;
              phoneVerified = true;
              console.log(`Número ajustado de ${profileData.phone} para ${phoneToSave}`);
            }
          }
        } catch (phoneError) {
          console.warn("Erro ao verificar telefone, salvando mesmo assim:", phoneError);
        }
      }

      const dataToSave = {
        ...profileData,
        phone: phoneToSave,
        whatsapp_phone_verified: phoneVerified
      };

      await User.updateMyUserData(dataToSave);

      // Atualizar estado local
      setWhatsappNotifications(prev => ({
        ...prev,
        phone_verified: phoneVerified
      }));

      setMessage("Perfil atualizado com sucesso!");
      setTimeout(() => setMessage(""), 3000);
      loadUserData();
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage("Erro ao atualizar perfil. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleWhatsAppNotifications = async (enabled) => {
    if (enabled && !whatsappNotifications.phone_verified) {
      // Se está tentando habilitar mas o telefone não foi verificado, verificar agora
      setWhatsappNotifications(prev => ({ ...prev, is_checking: true }));

      try {
        const response = await base44.functions.invoke('checkExistsContact', {
          phones: [profileData.phone]
        });

        if (response.data?.success && response.data.results?.length > 0) {
          const result = response.data.results[0];

          if (result.exists && result.verified_phone) {
            // Número verificado com sucesso
            await User.updateMyUserData({
              phone: result.verified_phone,
              whatsapp_phone_verified: true,
              whatsapp_notifications_enabled: true
            });

            setWhatsappNotifications({
              enabled: true,
              phone_verified: true,
              is_checking: false
            });

            setMessage("Notificações WhatsApp ativadas com sucesso!");
            setTimeout(() => setMessage(""), 3000);
            loadUserData();
          } else {
            // Número não tem WhatsApp
            setWhatsappNotifications(prev => ({
              ...prev,
              is_checking: false,
              phone_verified: false,
              enabled: false
            }));

            setMessage("O número informado não possui WhatsApp ativo.");
          }
        }
      } catch (error) {
        console.error("Error checking WhatsApp:", error);
        setMessage("Erro ao verificar número. Tente novamente.");
        setWhatsappNotifications(prev => ({ ...prev, is_checking: false }));
      }
    } else {
      // Desabilitar notificações ou habilitar quando já verificado
      try {
        await User.updateMyUserData({
          whatsapp_notifications_enabled: enabled
        });

        setWhatsappNotifications(prev => ({
          ...prev,
          enabled: enabled
        }));

        setMessage(enabled ? "Notificações WhatsApp ativadas!" : "Notificações WhatsApp desativadas.");
        setTimeout(() => setMessage(""), 3000);
      } catch (error) {
        console.error("Error updating notifications:", error);
        setMessage("Erro ao atualizar preferências.");
      }
    }
  };

  const handleSecuritySave = async () => {
    if (!securityData.current_password) {
      setMessage("Senha atual é obrigatória");
      return;
    }

    if (securityData.new_password !== securityData.confirm_password) {
      setMessage("As senhas não coincidem");
      return;
    }

    if (securityData.new_password.length < 8) {
      setMessage("A nova senha deve ter pelo menos 8 caracteres");
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      console.log("Updating password...", { 
        current: securityData.current_password,
        new: securityData.new_password 
      });
      
      setMessage("Senha atualizada com sucesso!");
      setSecurityData({
        current_password: "",
        new_password: "",
        confirm_password: "",
        two_factor_enabled: securityData.two_factor_enabled
      });
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Error updating password:", error);
      setMessage("Erro ao atualizar senha. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const getUserRoleDisplay = () => {
    if (!user) return '';

    if (user.role === 'admin') {
      return 'Administrador';
    }

    const roleMap = {
      'owner': 'Proprietário',
      'admin': 'Administrador',
      'user': 'Usuário'
    };

    return roleMap[user.system_role] || 'Usuário';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto overflow-hidden">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690a8ae384e85f405dd1958f/8d6af0619_ChatGPTImage24denovde202519_02_27.png"
              alt="Sparta Sync"
              className="w-16 h-16 object-contain"
              onError={(e) => {
                console.error('Logo failed to load on ProfileSettings page');
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
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center">
          <UserIcon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configurações de Perfil</h1>
          <p className="text-gray-600">
            Gerencie suas informações pessoais e da empresa
          </p>
        </div>
      </div>

      {/* Message Alert */}
      {message && (
        <Alert className={`rounded-2xl ${message.includes('Erro') ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
          {message.includes('Erro') ? (
            <AlertCircle className="h-4 w-4 text-red-600" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          )}
          <AlertDescription className={message.includes('Erro') ? 'text-red-800' : 'text-green-800'}>
            {message}
          </AlertDescription>
        </Alert>
      )}

      {/* Profile Overview Card */}
      <Card className="rounded-3xl border-gray-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="w-20 h-20">
                <AvatarImage src={profileData.avatar_url} />
                <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-500 text-white text-xl font-medium">
                  {user?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                </AvatarFallback>
              </Avatar>
              <label htmlFor="avatar-upload">
                <Button
                  size="icon"
                  className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 cursor-pointer"
                  disabled={isUploadingAvatar}
                  asChild
                >
                  <div>
                    {isUploadingAvatar ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                  </div>
                </Button>
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={isUploadingAvatar}
              />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xl font-semibold text-gray-900">
                  {user?.full_name || 'Usuário'}
                </h2>
                <Badge className={`rounded-full text-xs px-3 py-1 ${
                  user?.role === 'admin' ?
                    'bg-purple-100 text-purple-700 border-purple-300' :
                    user?.system_role === 'owner' ?
                      'bg-blue-100 text-blue-700 border-blue-300' :
                      'bg-green-100 text-green-700 border-green-300'
                }`}>
                  <Shield className="w-3 h-3 mr-1" />
                  {getUserRoleDisplay()}
                </Badge>
              </div>
              
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span>{user?.email || 'Sem email'}</span>
                </div>
                {user?.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span>{user.phone}</span>
                  </div>
                )}
                {company && (
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    <span>{company.name}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Entrou em {format(new Date(user?.created_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 rounded-2xl bg-gray-100 p-1 h-auto">
          <TabsTrigger value="profile" className="rounded-xl flex items-center gap-1">
            <UserIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Informações Pessoais</span>
          </TabsTrigger>
          <TabsTrigger value="company" className="rounded-xl flex items-center gap-1">
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">Informações da Empresa</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-xl flex items-center gap-1">
            <Lock className="w-4 h-4" />
            <span className="hidden sm:inline">Segurança</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-xl flex items-center gap-1">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Notificações</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="rounded-xl flex items-center gap-1">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Sistema</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <Collapsible open={expandedSection === 'personal'} onOpenChange={() => setExpandedSection(expandedSection === 'personal' ? null : 'personal')}>
            <Card className="rounded-3xl border-gray-200">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserIcon className="w-5 h-5" />
                      Informações Pessoais
                    </div>
                    <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform ${expandedSection === 'personal' ? 'rotate-180' : ''}`} />
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="full_name">Nome Completo</Label>
                  <Input
                    id="full_name"
                    value={profileData.full_name}
                    onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
                    className="rounded-xl mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                    className="rounded-xl mt-1"
                    disabled
                  />
                  <p className="text-xs text-gray-500 mt-1">O email não pode ser alterado</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={profileData.phone}
                    onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                    className="rounded-xl mt-1"
                    placeholder="+55 11 99999-9999"
                  />
                  <p className="text-xs text-gray-500 mt-1">Será verificado automaticamente ao salvar</p>
                </div>
                <div>
                  <Label htmlFor="department">Departamento</Label>
                  <Input
                    id="department"
                    value={profileData.department}
                    onChange={(e) => setProfileData(prev => ({ ...prev, department: e.target.value }))}
                    className="rounded-xl mt-1"
                    placeholder="Ex: Vendas, Marketing"
                  />
                </div>
              </div>

              {/* Endereço */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Endereço
                </h3>

                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <Label htmlFor="cep">CEP</Label>
                    <Input
                      id="cep"
                      value={profileData.cep}
                      onChange={(e) => {
                        const value = e.target.value;
                        setProfileData(prev => ({ ...prev, cep: value }));
                        if (value.replace(/\D/g, '').length === 8) {
                          handleCepLookup(value);
                        }
                      }}
                      className="rounded-xl mt-1"
                      placeholder="00000-000"
                      maxLength={9}
                      disabled={isLoadingCep}
                    />
                    {isLoadingCep && <p className="text-xs text-blue-600 mt-1">Buscando...</p>}
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="street">Rua</Label>
                    <Input
                      id="street"
                      value={profileData.street}
                      onChange={(e) => setProfileData(prev => ({ ...prev, street: e.target.value }))}
                      className="rounded-xl mt-1"
                      placeholder="Nome da rua"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <Label htmlFor="number">Número</Label>
                    <Input
                      id="number"
                      value={profileData.number}
                      onChange={(e) => setProfileData(prev => ({ ...prev, number: e.target.value }))}
                      className="rounded-xl mt-1"
                      placeholder="123"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="complement">Complemento</Label>
                    <Input
                      id="complement"
                      value={profileData.complement}
                      onChange={(e) => setProfileData(prev => ({ ...prev, complement: e.target.value }))}
                      className="rounded-xl mt-1"
                      placeholder="Apto, Bloco, etc"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="neighborhood">Bairro</Label>
                    <Input
                      id="neighborhood"
                      value={profileData.neighborhood}
                      onChange={(e) => setProfileData(prev => ({ ...prev, neighborhood: e.target.value }))}
                      className="rounded-xl mt-1"
                      placeholder="Bairro"
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      value={profileData.city}
                      onChange={(e) => setProfileData(prev => ({ ...prev, city: e.target.value }))}
                      className="rounded-xl mt-1"
                      placeholder="Cidade"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">Estado</Label>
                    <Input
                      id="state"
                      value={profileData.state}
                      onChange={(e) => setProfileData(prev => ({ ...prev, state: e.target.value }))}
                      className="rounded-xl mt-1"
                      placeholder="UF"
                      maxLength={2}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleProfileSave}
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700 rounded-2xl"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Alterações
                    </>
                  )}
                </Button>
              </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          <Collapsible open={expandedSection === 'address'} onOpenChange={() => setExpandedSection(expandedSection === 'address' ? null : 'address')}>
            <Card className="rounded-3xl border-gray-200">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-5 h-5" />
                      Endereço
                    </div>
                    <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform ${expandedSection === 'address' ? 'rotate-180' : ''}`} />
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="cep">CEP</Label>
                      <Input
                        id="cep"
                        value={profileData.cep}
                        onChange={(e) => {
                          const value = e.target.value;
                          setProfileData(prev => ({ ...prev, cep: value }));
                          if (value.replace(/\D/g, '').length === 8) {
                            handleCepLookup(value);
                          }
                        }}
                        className="rounded-xl mt-1"
                        placeholder="00000-000"
                        maxLength={9}
                        disabled={isLoadingCep}
                      />
                      {isLoadingCep && <p className="text-xs text-blue-600 mt-1">Buscando...</p>}
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="street">Rua</Label>
                      <Input
                        id="street"
                        value={profileData.street}
                        onChange={(e) => setProfileData(prev => ({ ...prev, street: e.target.value }))}
                        className="rounded-xl mt-1"
                        placeholder="Nome da rua"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="number">Número</Label>
                      <Input
                        id="number"
                        value={profileData.number}
                        onChange={(e) => setProfileData(prev => ({ ...prev, number: e.target.value }))}
                        className="rounded-xl mt-1"
                        placeholder="123"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="complement">Complemento</Label>
                      <Input
                        id="complement"
                        value={profileData.complement}
                        onChange={(e) => setProfileData(prev => ({ ...prev, complement: e.target.value }))}
                        className="rounded-xl mt-1"
                        placeholder="Apto, Bloco, etc"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="neighborhood">Bairro</Label>
                      <Input
                        id="neighborhood"
                        value={profileData.neighborhood}
                        onChange={(e) => setProfileData(prev => ({ ...prev, neighborhood: e.target.value }))}
                        className="rounded-xl mt-1"
                        placeholder="Bairro"
                      />
                    </div>
                    <div>
                      <Label htmlFor="city">Cidade</Label>
                      <Input
                        id="city"
                        value={profileData.city}
                        onChange={(e) => setProfileData(prev => ({ ...prev, city: e.target.value }))}
                        className="rounded-xl mt-1"
                        placeholder="Cidade"
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">Estado</Label>
                      <Input
                        id="state"
                        value={profileData.state}
                        onChange={(e) => setProfileData(prev => ({ ...prev, state: e.target.value }))}
                        className="rounded-xl mt-1"
                        placeholder="UF"
                        maxLength={2}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button
                      onClick={handleProfileSave}
                      disabled={isSaving}
                      className="bg-blue-600 hover:bg-blue-700 rounded-2xl"
                    >
                      {isSaving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Salvar Alterações
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </TabsContent>

        {/* Company Tab */}
        <TabsContent value="company">
          <Card className="rounded-3xl border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Informações da Empresa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company_name">Nome da Empresa</Label>
                  <Input
                    id="company_name"
                    value={companyData.name}
                    className="rounded-xl mt-1"
                    disabled
                  />
                  <p className="text-xs text-gray-500 mt-1">Entre em contato com o administrador para alterar</p>
                </div>
                <div>
                  <Label htmlFor="industry">Setor</Label>
                  <Input
                    id="industry"
                    value={companyData.industry}
                    className="rounded-xl mt-1"
                    disabled
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company_website">Website</Label>
                  <Input
                    id="company_website"
                    value={companyData.website}
                    className="rounded-xl mt-1"
                    disabled
                  />
                </div>
                <div>
                  <Label htmlFor="company_phone">Telefone da Empresa</Label>
                  <Input
                    id="company_phone"
                    value={companyData.phone}
                    className="rounded-xl mt-1"
                    disabled
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="company_address">Endereço</Label>
                <Textarea
                  id="company_address"
                  value={companyData.address}
                  className="rounded-xl mt-1 h-20"
                  disabled
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card className="rounded-3xl border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Configurações de Segurança
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {isEmailPasswordUser ? (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">Alterar Senha</h3>
                  
                  <div>
                    <Label htmlFor="current_password">Senha Atual</Label>
                    <div className="relative">
                      <Input
                        id="current_password"
                        type={showCurrentPassword ? "text" : "password"}
                        value={securityData.current_password}
                        onChange={(e) => setSecurityData(prev => ({ ...prev, current_password: e.target.value }))}
                        className="rounded-xl mt-1 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="new_password">Nova Senha</Label>
                      <div className="relative">
                        <Input
                          id="new_password"
                          type={showNewPassword ? "text" : "password"}
                          value={securityData.new_password}
                          onChange={(e) => setSecurityData(prev => ({ ...prev, new_password: e.target.value }))}
                          className="rounded-xl mt-1 pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="confirm_password">Confirmar Nova Senha</Label>
                      <div className="relative">
                        <Input
                          id="confirm_password"
                          type={showConfirmPassword ? "text" : "password"}
                          value={securityData.confirm_password}
                          onChange={(e) => setSecurityData(prev => ({ ...prev, confirm_password: e.target.value }))}
                          className="rounded-xl mt-1 pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button
                      onClick={handleSecuritySave}
                      disabled={isSaving}
                      className="bg-blue-600 hover:bg-blue-700 rounded-2xl"
                    >
                      {isSaving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Atualizando...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Atualizar Senha
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-blue-900 mb-2">Login via SSO</h3>
                      <p className="text-sm text-blue-800">
                        Você fez login usando Google, Microsoft ou Facebook. 
                        A senha é gerenciada pelo provedor de autenticação e não pode ser alterada aqui.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          {/* Push Notifications */}
          <Collapsible open={expandedSection === 'push'} onOpenChange={() => setExpandedSection(expandedSection === 'push' ? null : 'push')}>
            <Card className="rounded-3xl">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="w-5 h-5" />
                      Notificações Push (Navegador)
                    </div>
                    <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform ${expandedSection === 'push' ? 'rotate-180' : ''}`} />
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Bell className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      Receber notificações push do sistema
                    </p>
                    <p className="text-sm text-gray-500">
                      {user?.push_notifications_enabled 
                        ? 'Você receberá alertas no navegador mesmo quando o site estiver fechado'
                        : 'Ative para receber alertas importantes no navegador'}
                    </p>
                  </div>
                </div>

                <Switch
                  checked={user?.push_notifications_enabled || false}
                  onCheckedChange={async (enabled) => {
                    if (enabled) {
                      // Solicitar permissão do navegador
                      if ('Notification' in window) {
                        const permission = await Notification.requestPermission();
                        if (permission === 'granted') {
                          await User.updateMyUserData({ push_notifications_enabled: true });
                          setMessage('Notificações push ativadas com sucesso!');
                          setTimeout(() => setMessage(""), 3000);
                          loadUserData();
                        } else {
                          setMessage('Permissão de notificação negada pelo navegador.');
                        }
                      } else {
                        setMessage('Seu navegador não suporta notificações push.');
                      }
                    } else {
                      await User.updateMyUserData({ push_notifications_enabled: false });
                      setMessage('Notificações push desativadas.');
                      setTimeout(() => setMessage(""), 3000);
                      loadUserData();
                    }
                  }}
                />
              </div>

              <Alert className="rounded-2xl bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  As notificações no sininho sempre estarão ativas. Esta opção é apenas para receber alertas adicionais no navegador/dispositivo.
                </AlertDescription>
              </Alert>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* WhatsApp Notifications */}
          <Collapsible open={expandedSection === 'whatsapp'} onOpenChange={() => setExpandedSection(expandedSection === 'whatsapp' ? null : 'whatsapp')}>
            <Card className="rounded-3xl">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      Notificações WhatsApp
                    </div>
                    <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform ${expandedSection === 'whatsapp' ? 'rotate-180' : ''}`} />
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      Receber notificações por WhatsApp
                    </p>
                    <p className="text-sm text-gray-500">
                      {whatsappNotifications.phone_verified 
                        ? 'Seu número foi verificado e está pronto para receber notificações'
                        : profileData.phone
                        ? 'Clique no botão para verificar se seu número possui WhatsApp'
                        : 'Adicione um número de telefone nas Informações Pessoais primeiro'}
                    </p>
                  </div>
                </div>

                {whatsappNotifications.is_checking ? (
                  <div className="w-12 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
                  </div>
                ) : (
                  <Switch
                    checked={whatsappNotifications.enabled && whatsappNotifications.phone_verified}
                    onCheckedChange={handleToggleWhatsAppNotifications}
                    disabled={!profileData.phone}
                  />
                )}
              </div>

              {!whatsappNotifications.phone_verified && profileData.phone && (
                <Alert className="rounded-2xl bg-amber-50 border-amber-200">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    Ative as notificações acima para verificar se seu número possui WhatsApp ativo.
                  </AlertDescription>
                </Alert>
              )}

              {whatsappNotifications.phone_verified && (
                <div className="space-y-3 p-4 bg-green-50 border border-green-200 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <p className="font-medium text-green-900">Número verificado com sucesso!</p>
                  </div>
                  <p className="text-sm text-green-800">
                    Você receberá notificações importantes sobre campanhas, aprovações e atividades da sua conta.
                  </p>
                </div>
              )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="space-y-6">
          {/* AI Configuration */}
          <Collapsible open={expandedSection === 'ai'} onOpenChange={() => setExpandedSection(expandedSection === 'ai' ? null : 'ai')}>
            <Card className="rounded-3xl border-gray-200">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                      Configuração da IA da Empresa
                    </div>
                    <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform ${expandedSection === 'ai' ? 'rotate-180' : ''}`} />
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-6">
              {/* Habilitar IA */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      Habilitar Assistente IA
                    </p>
                    <p className="text-sm text-gray-500">
                      {aiConfig.enabled 
                        ? 'A IA está disponível para ajudar você e sua equipe'
                        : 'Ative para ter acesso ao assistente inteligente'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={aiConfig.enabled}
                  onCheckedChange={(enabled) => setAiConfig(prev => ({ ...prev, enabled }))}
                />
              </div>

              {aiConfig.enabled && (
                <>
              <Alert className="rounded-2xl bg-blue-50 border-blue-200">
                <Sparkles className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>Configure sua IA personalizada!</strong> Quanto mais informações você fornecer, melhor a IA entenderá seu negócio e poderá ajudar seus clientes.
                </AlertDescription>
              </Alert>

              <div className="space-y-6">
                {/* Nome da Assistente */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Nome da Assistente</Label>
                  <Input
                    value={aiConfig.name}
                    onChange={(e) => setAiConfig(prev => ({ ...prev, name: e.target.value || "Atena" }))}
                    placeholder="Ex: Atena"
                    className="rounded-xl"
                  />
                  <p className="text-xs text-gray-500">
                    Se não definir, o nome padrão será "Atena"
                  </p>
                </div>
                {/* Descrição do Negócio */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-blue-600" />
                    <Label className="text-base font-semibold">Descrição do Negócio</Label>
                  </div>
                  <Textarea
                    value={aiConfig.business_description}
                    onChange={(e) => setAiConfig(prev => ({ ...prev, business_description: e.target.value }))}
                    placeholder="Descreva seu negócio: o que você faz, como funciona, história da empresa..."
                    className="rounded-xl min-h-[100px]"
                  />
                  <p className="text-xs text-gray-500">
                    Exemplo: "Somos uma loja de roupas femininas com foco em moda sustentável. Trabalhamos com marcas nacionais e peças exclusivas."
                  </p>
                </div>

                {/* Setor */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    <Label className="text-base font-semibold">Setor de Atuação</Label>
                  </div>
                  <Input
                    value={aiConfig.business_sector}
                    onChange={(e) => setAiConfig(prev => ({ ...prev, business_sector: e.target.value }))}
                    placeholder="Ex: Varejo de Moda, Tecnologia, Alimentação..."
                    className="rounded-xl"
                  />
                </div>

                {/* Público-Alvo */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    <Label className="text-base font-semibold">Público-Alvo</Label>
                  </div>
                  <Textarea
                    value={aiConfig.target_audience}
                    onChange={(e) => setAiConfig(prev => ({ ...prev, target_audience: e.target.value }))}
                    placeholder="Quem são seus clientes ideais? Idade, perfil, necessidades..."
                    className="rounded-xl min-h-[80px]"
                  />
                  <p className="text-xs text-gray-500">
                    Exemplo: "Mulheres de 25 a 45 anos, classe média-alta, preocupadas com sustentabilidade e qualidade."
                  </p>
                </div>

                {/* Produtos/Serviços */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    <Label className="text-base font-semibold">Principais Produtos/Serviços</Label>
                  </div>
                  <Textarea
                    value={aiConfig.main_products_services}
                    onChange={(e) => setAiConfig(prev => ({ ...prev, main_products_services: e.target.value }))}
                    placeholder="Liste seus principais produtos ou serviços..."
                    className="rounded-xl min-h-[80px]"
                  />
                  <p className="text-xs text-gray-500">
                    Exemplo: "Vestidos casuais e formais, blusas, calças, acessórios sustentáveis, consultoria de estilo."
                  </p>
                </div>

                {/* Proposta de Valor */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                    <Label className="text-base font-semibold">Proposta de Valor</Label>
                  </div>
                  <Textarea
                    value={aiConfig.value_proposition}
                    onChange={(e) => setAiConfig(prev => ({ ...prev, value_proposition: e.target.value }))}
                    placeholder="O que torna seu negócio único? Por que clientes deveriam escolher você?"
                    className="rounded-xl min-h-[80px]"
                  />
                  <p className="text-xs text-gray-500">
                    Exemplo: "Oferecemos moda de qualidade com impacto ambiental reduzido e preço justo."
                  </p>
                </div>

                {/* Tom da Empresa */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-blue-600" />
                    <Label className="text-base font-semibold">Tom de Comunicação</Label>
                  </div>
                  <Input
                    value={aiConfig.company_tone}
                    onChange={(e) => setAiConfig(prev => ({ ...prev, company_tone: e.target.value }))}
                    placeholder="Ex: Amigável e descontraído, Profissional e técnico, Sofisticado..."
                    className="rounded-xl"
                  />
                  <p className="text-xs text-gray-500">
                    Como a IA deve se comunicar com seus clientes? Defina o tom e personalidade.
                  </p>
                </div>

                {/* Objetivos */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    <Label className="text-base font-semibold">Objetivos do Negócio</Label>
                  </div>
                  <Textarea
                    value={aiConfig.business_goals}
                    onChange={(e) => setAiConfig(prev => ({ ...prev, business_goals: e.target.value }))}
                    placeholder="Quais são os principais objetivos? Crescimento, fidelização, expansão..."
                    className="rounded-xl min-h-[80px]"
                  />
                </div>

                {/* Diferenciais */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    <Label className="text-base font-semibold">Diferenciais Competitivos</Label>
                  </div>
                  <Textarea
                    value={aiConfig.competitive_advantages}
                    onChange={(e) => setAiConfig(prev => ({ ...prev, competitive_advantages: e.target.value }))}
                    placeholder="O que você faz melhor que a concorrência?"
                    className="rounded-xl min-h-[80px]"
                  />
                  <p className="text-xs text-gray-500">
                    Exemplo: "Entrega em 24h, atendimento personalizado, peças exclusivas, programa de fidelidade."
                  </p>
                </div>
              </div>

              {/* Permissões da IA */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-4">Permissões da IA</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Defina o que a IA pode fazer com os dados da sua empresa.
                </p>

                <div className="space-y-3">
                  {/* Contatos */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium">Contatos</span>
                    </div>
                    <select
                      value={aiConfig.permissions.contacts}
                      onChange={(e) => setAiConfig(prev => ({
                        ...prev,
                        permissions: { ...prev.permissions, contacts: e.target.value }
                      }))}
                      className="px-3 py-1.5 border rounded-lg text-sm bg-white"
                    >
                      <option value="none">Sem permissão</option>
                      <option value="view">Visualização</option>
                      <option value="edit">Edição</option>
                    </select>
                  </div>

                  {/* Campanhas */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium">Campanhas</span>
                    </div>
                    <select
                      value={aiConfig.permissions.campaigns}
                      onChange={(e) => setAiConfig(prev => ({
                        ...prev,
                        permissions: { ...prev.permissions, campaigns: e.target.value }
                      }))}
                      className="px-3 py-1.5 border rounded-lg text-sm bg-white"
                    >
                      <option value="none">Sem permissão</option>
                      <option value="view">Visualização</option>
                      <option value="edit">Edição</option>
                    </select>
                  </div>

                  {/* Mensagens */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium">Mensagens</span>
                    </div>
                    <select
                      value={aiConfig.permissions.messages}
                      onChange={(e) => setAiConfig(prev => ({
                        ...prev,
                        permissions: { ...prev.permissions, messages: e.target.value }
                      }))}
                      className="px-3 py-1.5 border rounded-lg text-sm bg-white"
                    >
                      <option value="none">Sem permissão</option>
                      <option value="view">Visualização</option>
                      <option value="edit">Edição</option>
                    </select>
                  </div>

                  {/* Modelos */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium">Modelos</span>
                    </div>
                    <select
                      value={aiConfig.permissions.templates}
                      onChange={(e) => setAiConfig(prev => ({
                        ...prev,
                        permissions: { ...prev.permissions, templates: e.target.value }
                      }))}
                      className="px-3 py-1.5 border rounded-lg text-sm bg-white"
                    >
                      <option value="none">Sem permissão</option>
                      <option value="view">Visualização</option>
                      <option value="edit">Edição</option>
                    </select>
                  </div>

                  {/* Produtos */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium">Produtos</span>
                    </div>
                    <select
                      value={aiConfig.permissions.products}
                      onChange={(e) => setAiConfig(prev => ({
                        ...prev,
                        permissions: { ...prev.permissions, products: e.target.value }
                      }))}
                      className="px-3 py-1.5 border rounded-lg text-sm bg-white"
                    >
                      <option value="none">Sem permissão</option>
                      <option value="view">Visualização</option>
                      <option value="edit">Edição</option>
                    </select>
                  </div>
                </div>
              </div>
              </>
              )}

              <div className="flex justify-end pt-4 border-t border-gray-200">
                <Button
                  onClick={async () => {
                    setIsSaving(true);
                    setMessage("");
                    try {
                      if (!company) {
                        setMessage("Erro: Empresa não encontrada.");
                        setIsSaving(false);
                        return;
                      }

                      console.log('[ProfileSettings] Salvando configuração da IA:', aiConfig);

                      const response = await base44.functions.invoke('updateAIConfig', {
                        aiConfig: aiConfig
                      });

                      if (!response.data?.success) {
                        throw new Error(response.data?.error || 'Erro ao salvar configurações');
                      }

                      console.log('[ProfileSettings] ✅ Configuração salva com sucesso');
                      
                      // Atualizar estado global da Atena no layout
                      window.dispatchEvent(new CustomEvent('aiConfigChanged', {
                        detail: { enabled: aiConfig.enabled }
                      }));
                      
                      setMessage("✨ Configurações da IA atualizadas com sucesso!");
                      setTimeout(() => setMessage(""), 3000);
                      
                      // Recarregar dados para garantir sincronização
                      await loadUserData();
                    } catch (error) {
                      console.error("Error updating AI configuration:", error);
                      setMessage(`Erro ao atualizar configurações da IA: ${error.message}`);
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700 rounded-2xl"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Configuração da IA
                    </>
                  )}
                </Button>
              </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

          {/* Approval Window Settings */}
          <Collapsible open={expandedSection === 'approval'} onOpenChange={() => setExpandedSection(expandedSection === 'approval' ? null : 'approval')}>
            <Card className="rounded-3xl border-gray-200">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Configurações de Sistema
                    </div>
                    <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform ${expandedSection === 'approval' ? 'rotate-180' : ''}`} />
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-base font-semibold">Janela de Aprovação em Lote</Label>
                        <p className="text-sm text-gray-500">
                          Defina quantos dias à frente você deseja aprovar lotes de uma vez.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-xl">
                        <Clock className="w-4 h-4 text-blue-600" />
                        <span className="font-bold text-blue-700">{systemSettings.approval_days_window} dias</span>
                      </div>
                    </div>
                    
                    <div className="pt-2 pb-6 px-2">
                      <Slider
                        defaultValue={[systemSettings.approval_days_window]}
                        max={14}
                        min={2}
                        step={1}
                        onValueChange={(value) => setSystemSettings(prev => ({ ...prev, approval_days_window: value[0] }))}
                        className="w-full"
                      />
                      <div className="flex justify-between mt-2 text-xs text-gray-400">
                        <span>2 dias</span>
                        <span>14 dias</span>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-gray-100">
                      <Button
                        onClick={async () => {
                          setIsSaving(true);
                          try {
                            await User.updateMyUserData({
                              approval_days_window: systemSettings.approval_days_window
                            });
                            setMessage("Configurações de sistema atualizadas!");
                            setTimeout(() => setMessage(""), 3000);
                          } catch (error) {
                            console.error("Error updating system settings:", error);
                            setMessage("Erro ao atualizar configurações.");
                          } finally {
                            setIsSaving(false);
                          }
                        }}
                        disabled={isSaving}
                        className="bg-blue-600 hover:bg-blue-700 rounded-2xl"
                      >
                        {isSaving ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                            Salvando...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Salvar Preferências
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Product Settings */}
          <Collapsible open={expandedSection === 'products'} onOpenChange={() => setExpandedSection(expandedSection === 'products' ? null : 'products')}>
            <Card className="rounded-3xl border-gray-200">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="w-5 h-5" />
                      Configurações de Produtos
                    </div>
                    <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform ${expandedSection === 'products' ? 'rotate-180' : ''}`} />
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    {/* Tempo de Reserva */}
                    <div className="pb-4 border-b border-gray-200">
                      <div className="flex items-center justify-between mb-4">
                        <div className="space-y-1">
                          <Label className="text-base font-semibold">Tempo de Reserva de Produtos</Label>
                          <p className="text-sm text-gray-500">
                            Quanto tempo um produto fica reservado durante uma venda no PDV (em minutos).
                          </p>
                        </div>
                        <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-xl">
                          <Clock className="w-4 h-4 text-blue-600" />
                          <span className="font-bold text-blue-700">
                            {(() => {
                              const minutes = company?.settings?.product_reservation_time || 1440;
                              if (minutes >= 1440) {
                                return `${Math.floor(minutes / 1440)} ${Math.floor(minutes / 1440) === 1 ? 'dia' : 'dias'}`;
                              }
                              if (minutes >= 60) {
                                return `${Math.floor(minutes / 60)} ${Math.floor(minutes / 60) === 1 ? 'hora' : 'horas'}`;
                              }
                              return `${minutes} min`;
                            })()}
                          </span>
                        </div>
                      </div>
                      
                      <div className="pt-2 pb-6 px-2">
                        <Slider
                          value={[company?.settings?.product_reservation_time || 1440]}
                          max={129600}
                          min={60}
                          step={60}
                          onValueChange={async (value) => {
                            if (!company) return;
                            try {
                              await base44.entities.Company.update(company.id, {
                                settings: {
                                  ...company.settings,
                                  product_reservation_time: value[0]
                                }
                              });
                              loadUserData();
                            } catch (error) {
                              console.error("Erro ao atualizar tempo de reserva:", error);
                            }
                          }}
                          className="w-full"
                        />
                        <div className="flex justify-between mt-2 text-xs text-gray-400">
                          <span>1 hora</span>
                          <span>90 dias</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label className="text-base font-semibold">Modo de Visualização</Label>
                      <p className="text-sm text-gray-500 mt-1 mb-4">
                        Escolha entre a versão completa ou simplificada dos módulos de produtos.
                      </p>

                      <div className="space-y-3">
                        {/* Versão Completa - BLOQUEADA */}
                        <div 
                          className="p-4 rounded-2xl border-2 border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full border-2 border-gray-300 mt-0.5"></div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">Produtos Completo</p>
                              <p className="text-sm text-gray-500 mt-1">
                                Todos os módulos disponíveis: PDV, Compras, Estoque, Logística e mais.
                              </p>
                              <Badge variant="secondary" className="mt-2 rounded-full text-xs">
                                Em breve
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* Versão Simplificada - PADRÃO */}
                        <div 
                          className="p-4 rounded-2xl border-2 border-blue-500 bg-blue-50"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full border-2 border-blue-500 bg-blue-500 mt-0.5 flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">Produtos Simplificado</p>
                              <p className="text-sm text-gray-500 mt-1">
                                Módulos essenciais: Catálogo, PDV, Entrada, Depósitos, Marcas, Categorias e Saldo de Estoque. <span className="font-semibold">(Padrão)</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Alert className="rounded-2xl bg-blue-50 border-blue-200">
                      <AlertCircle className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-800">
                        A versão completa estará disponível em breve. Por enquanto, todos os usuários utilizam a versão simplificada.
                      </AlertDescription>
                    </Alert>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Message Reception Settings */}
          <Collapsible open={expandedSection === 'messages'} onOpenChange={() => setExpandedSection(expandedSection === 'messages' ? null : 'messages')}>
            <Card className="rounded-3xl border-gray-200">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      Recepção de Mensagens
                    </div>
                    <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform ${expandedSection === 'messages' ? 'rotate-180' : ''}`} />
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-base font-semibold">De quem você deseja receber mensagens?</Label>
                      <p className="text-sm text-gray-500 mt-1 mb-4">
                        Configure quem pode enviar mensagens para sua empresa através do WhatsApp.
                      </p>

                      <div className="space-y-3">
                        {/* Todas as mensagens */}
                        <div 
                          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                            messageReceptionSettings.mode === 'all' 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setMessageReceptionSettings(prev => ({ ...prev, mode: 'all' }))}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                              messageReceptionSettings.mode === 'all' 
                                ? 'border-blue-500 bg-blue-500' 
                                : 'border-gray-300'
                            }`}>
                              {messageReceptionSettings.mode === 'all' && (
                                <div className="w-2 h-2 bg-white rounded-full" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">Todas as mensagens</p>
                              <p className="text-sm text-gray-500 mt-1">
                                Receber mensagens de qualquer número, inclusive números desconhecidos.
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Somente de contatos */}
                        <div 
                          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                            messageReceptionSettings.mode === 'contacts_only' 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setMessageReceptionSettings(prev => ({ ...prev, mode: 'contacts_only' }))}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                              messageReceptionSettings.mode === 'contacts_only' 
                                ? 'border-blue-500 bg-blue-500' 
                                : 'border-gray-300'
                            }`}>
                              {messageReceptionSettings.mode === 'contacts_only' && (
                                <div className="w-2 h-2 bg-white rounded-full" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">Somente de contatos salvos</p>
                              <p className="text-sm text-gray-500 mt-1">
                                Receber mensagens apenas de números que estão cadastrados como contatos. <span className="font-semibold">(Recomendado)</span>
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Somente propositivos */}
                        <div 
                          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                            messageReceptionSettings.mode === 'proactive_only' 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setMessageReceptionSettings(prev => ({ ...prev, mode: 'proactive_only' }))}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                              messageReceptionSettings.mode === 'proactive_only' 
                                ? 'border-blue-500 bg-blue-500' 
                                : 'border-gray-300'
                            }`}>
                              {messageReceptionSettings.mode === 'proactive_only' && (
                                <div className="w-2 h-2 bg-white rounded-full" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">Somente contatos propositivos</p>
                              <p className="text-sm text-gray-500 mt-1">
                                Receber mensagens apenas de contatos que receberam uma mensagem sua recentemente.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Configuração de dias para propositivos */}
                    {messageReceptionSettings.mode === 'proactive_only' && (
                      <div className="pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                          <div className="space-y-1">
                            <Label className="text-base font-semibold">Janela de Tempo para Respostas</Label>
                            <p className="text-sm text-gray-500">
                              Aceitar respostas de contatos que receberam mensagens nos últimos dias.
                            </p>
                          </div>
                          <div className="flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-xl">
                            <Clock className="w-4 h-4 text-green-600" />
                            <span className="font-bold text-green-700">{messageReceptionSettings.proactive_days} dias</span>
                          </div>
                        </div>
                        
                        <div className="pt-2 pb-6 px-2">
                          <Slider
                            value={[messageReceptionSettings.proactive_days]}
                            max={30}
                            min={1}
                            step={1}
                            onValueChange={(value) => setMessageReceptionSettings(prev => ({ ...prev, proactive_days: value[0] }))}
                            className="w-full"
                          />
                          <div className="flex justify-between mt-2 text-xs text-gray-400">
                            <span>1 dia</span>
                            <span>30 dias</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end pt-4 border-t border-gray-100">
                      <Button
                        onClick={async () => {
                          setIsSaving(true);
                          try {
                            if (!company) {
                              setMessage("Erro: Empresa não encontrada.");
                              setIsSaving(false);
                              return;
                            }

                            await Company.update(company.id, {
                              settings: {
                                ...company.settings,
                                message_reception_mode: messageReceptionSettings.mode,
                                proactive_days_window: messageReceptionSettings.proactive_days
                              }
                            });
                            
                            setMessage("Configurações de recepção de mensagens atualizadas!");
                            setTimeout(() => setMessage(""), 3000);
                            loadUserData();
                          } catch (error) {
                            console.error("Error updating message reception settings:", error);
                            setMessage("Erro ao atualizar configurações.");
                          } finally {
                            setIsSaving(false);
                          }
                        }}
                        disabled={isSaving}
                        className="bg-blue-600 hover:bg-blue-700 rounded-2xl"
                      >
                        {isSaving ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                            Salvando...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Salvar Preferências
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </TabsContent>
      </Tabs>
    </div>
  );
}