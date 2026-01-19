import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "@/entities/User";
import { Company } from "@/entities/Company";
import { Role } from "@/entities/Role";
import { RoleDefault } from "@/entities/RoleDefault";
import { PermissionDefault } from "@/entities/PermissionDefault";
import { SubscriptionsStripe } from "@/entities/SubscriptionsStripe";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  Globe,
  Phone,
  AlertCircle,
  Loader2,
  MapPin,
  LogOut,
  Search,
  MessageSquare,
  CheckCircle2,
  XCircle,
  FileText,
} from "lucide-react";
import { createPageUrl } from "@/utils";
import { lookupAddressByCep } from "@/functions/lookupAddressByCep";
import { checkExistsContact } from "@/functions/checkExistsContact";

export default function CompanySetup() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    industry: "",
    customIndustry: "",
    website: "",
    phone: "",
    whatsapp: "",
    cep: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    country: "Brasil",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [isVerifyingWhatsApp, setIsVerifyingWhatsApp] = useState(false);
  const [whatsappExists, setWhatsappExists] = useState(null);
  const [whatsappNotifications, setWhatsappNotifications] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser);
        // If user already has a company_id, redirect to dashboard
        if (currentUser.company_id) {
          navigate(createPageUrl("Dashboard"), { replace: true });
          return;
        }
        // User needs to set up company
        setIsLoading(false);
      } catch (err) {
        console.error("Error checking user status:", err);
        // If user is not authenticated or other error, redirect to login
        navigate(createPageUrl("Login"), { replace: true });
      }
    };
    fetchUser();
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Formatação automática de CEP
    if (name === 'cep') {
      const cleaned = value.replace(/\D/g, '');
      let formatted = cleaned;
      
      if (cleaned.length > 5) {
        formatted = `${cleaned.slice(0, 5)}-${cleaned.slice(5, 8)}`;
      }
      
      setFormData((prev) => ({ ...prev, [name]: formatted }));
      
      // Auto-buscar quando chegar a 8 dígitos
      if (cleaned.length === 8) {
        handleCepLookup(cleaned);
      }
      return;
    }
    
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const industries = [
    "Tecnologia",
    "Varejo",
    "Serviços",
    "Saúde",
    "Educação",
    "Alimentação",
    "Construção",
    "Transporte",
    "Imobiliário",
    "Financeiro",
    "Marketing",
    "Consultoria",
    "Indústria",
    "Agronegócio",
    "Turismo",
    "Entretenimento",
    "Outros"
  ];

  const handleCepLookup = async (cep) => {
    if (!cep || cep.length !== 8) return;
    
    setIsLoadingCep(true);
    try {
      const response = await lookupAddressByCep({ cep });
      if (response.data?.success && response.data?.data) {
        const addr = response.data.data;
        setFormData(prev => ({
          ...prev,
          street: addr.logradouro || prev.street,
          neighborhood: addr.bairro || prev.neighborhood,
          city: addr.localidade || prev.city,
          state: addr.uf || prev.state,
          country: 'Brasil'
        }));
      }
    } catch (err) {
      console.error('Erro ao buscar CEP:', err);
    } finally {
      setIsLoadingCep(false);
    }
  };

  const handleWhatsAppBlur = async () => {
    const whatsapp = formData.whatsapp?.replace(/\D/g, '');
    if (!whatsapp || whatsapp.length < 10) {
      setWhatsappExists(null);
      return;
    }

    setIsVerifyingWhatsApp(true);
    try {
      // Formato DDI + DDD + Telefone (55 + DDD + Número)
      let formattedWhatsapp = whatsapp;
      
      // Se não começar com 55 (DDI do Brasil), adicionar
      if (!whatsapp.startsWith('55')) {
        formattedWhatsapp = '55' + whatsapp;
      }
      
      const response = await checkExistsContact({ phones: [formattedWhatsapp] });
      if (response.data?.success && response.data?.results?.[0]) {
        const result = response.data.results[0];
        setWhatsappExists(result.exists);
        
        // Se verificado e existe, atualizar o campo com o número verificado
        if (result.exists && result.verified_phone) {
          setFormData(prev => ({ ...prev, whatsapp: result.verified_phone }));
        }
        
        // Se o WhatsApp não existe, desabilitar notificações
        if (!result.exists) {
          setWhatsappNotifications(false);
        }
      }
    } catch (err) {
      console.error('Erro ao verificar WhatsApp:', err);
      setWhatsappExists(null);
    } finally {
      setIsVerifyingWhatsApp(false);
    }
  };

  const handleLogout = async () => {
    await User.logout();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!user) {
      setError("Usuário não encontrado. Por favor, faça login novamente.");
      setIsLoading(false);
      return;
    }

    try {
      if (!formData.name.trim()) {
        setError('Company name is required');
        setIsLoading(false);
        return;
      }

      console.log('=== STARTING COMPANY CREATION PROCESS ===');
      console.log('Current user:', user);

      // Validar termos
      if (!acceptedTerms) {
        setError('Você precisa aceitar os termos de uso e política de privacidade');
        setIsLoading(false);
        return;
      }

      // 1. Montar endereço completo
      const fullAddress = [
        formData.street,
        formData.number,
        formData.complement,
        formData.neighborhood,
        formData.city,
        formData.state,
        formData.country
      ].filter(Boolean).join(', ');

      // Determinar o setor
      const finalIndustry = formData.industry === 'Outros' ? formData.customIndustry : formData.industry;

      // 2. Create the company first
      const newCompany = await Company.create({
        name: formData.name,
        industry: finalIndustry,
        website: formData.website,
        phone: formData.phone,
        address: fullAddress,
        owner_id: user.id,
        settings: {
          whatsapp_notifications_enabled: whatsappNotifications && whatsappExists === true,
          whatsapp_notification_number: whatsappNotifications && whatsappExists === true ? formData.whatsapp : null
        }
      });

      console.log('Company created successfully:', newCompany);

      if (!newCompany.id) {
        throw new Error('Company was created but no ID was returned');
      }

      // 2. Buscar ou criar a RoleDefault de Admin
      let adminRoleDefault = await RoleDefault.filter({ slug: 'admin' });
      
      if (adminRoleDefault.length === 0) {
        console.log("Admin RoleDefault not found, creating it and its permissions.");
        // Se não existir, criar a RoleDefault de Admin
        const createdRoleDefault = await RoleDefault.create({
          name: "Administrador",
          description: "Acesso total a todos os recursos do sistema",
          slug: "admin",
          is_system_admin: true,
          display_order: 1
        });
        adminRoleDefault = [createdRoleDefault]; // Ensure it's an array for consistency

        // Criar as permissões padrão para Admin
        const adminPermissions = [
          { module: "sessions", permission_level: "full", description: "Criar/Pausar/Desconectar/Excluir sessões" },
          { module: "conversations", permission_level: "full", description: "Enviar e Receber mensagens" },
          { module: "contacts", permission_level: "full", description: "Criar/Editar/Excluir contatos" },
          { module: "campaigns", permission_level: "full", description: "Criar/Editar/Excluir campanhas" },
          { module: "templates", permission_level: "full", description: "Criar/Editar/Excluir modelos" },
          { module: "tags", permission_level: "full", description: "Criar/Editar/Excluir marcadores" },
          { module: "tickets", permission_level: "full", description: "Criar/Editar/Excluir chamados" },
          { module: "plans", permission_level: "full", description: "Alterar planos" },
          { module: "billing", permission_level: "view", description: "Visualizar faturamento" },
          { module: "logs", permission_level: "view", description: "Visualizar logs do sistema" },
          { module: "team", permission_level: "full", description: "Criar/Editar/Excluir membros da equipe" },
          { module: "roles", permission_level: "full", description: "Criar/Editar/Excluir funções e permissões" },
          { module: "reports", permission_level: "full", description: "Criar/Editar/Excluir relatórios" }
        ];

        for (const permission of adminPermissions) {
          await PermissionDefault.create({
            role_default_id: adminRoleDefault[0].id,
            ...permission
          });
        }
        console.log("Admin RoleDefault and its permissions created.");
      } else {
        console.log("Admin RoleDefault found, skipping creation of role and permissions.");
      }

      if (!adminRoleDefault[0] || !adminRoleDefault[0].id) {
        throw new Error("Admin RoleDefault was not found or created successfully.");
      }

      // 3. NÃO criar assinatura automática aqui
      // O usuário deve escolher um plano depois
      console.log('Skipping automatic free plan subscription creation');

      // 4. Update the user with company_id and the new admin role_default_id
      const userUpdateData = {
        company_id: newCompany.id,
        role_default_id: adminRoleDefault[0].id, // Changed from role_id to role_default_id
        system_role: 'admin',
        first_login_completed: true,
      };

      await User.updateMyUserData(userUpdateData);

      console.log('=== COMPANY CREATION PROCESS COMPLETED ===');

      // Navigate to Plans page to choose a plan
      navigate(createPageUrl("Plans"), { replace: true });

    } catch (err) {
      console.error('=== ERROR IN COMPANY CREATION ===');
      console.error('Error details:', err);
      setError(
        err.response?.data?.error ||
        "Ocorreu um erro ao criar sua empresa. Tente novamente."
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="w-8 h-8 bg-blue-600 rounded-full animate-pulse opacity-50"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/1da99ed30_LOGO_SPARTA_SYNC.png"
            alt="Sparta Sync"
            className="w-16 h-16 mx-auto object-contain mb-4"
          />
          <h1 className="text-3xl font-bold text-gray-900">
            Configure sua Empresa
          </h1>
          <p className="text-gray-600 mt-2">
            Olá, {user?.full_name?.split(" ")[0]}! Faltam apenas alguns
            detalhes para começar.
          </p>
        </div>

        <Card className="rounded-3xl shadow-xl">
          <CardContent className="p-8">
            {error && (
              <Alert variant="destructive" className="mb-6 rounded-2xl">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label
                    htmlFor="name"
                    className="text-sm font-medium text-gray-700 flex items-center gap-2"
                  >
                    <Building2 className="w-4 h-4" />
                    Nome da Empresa *
                  </label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Sua Empresa LTDA"
                    className="rounded-2xl"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="industry"
                    className="text-sm font-medium text-gray-700"
                  >
                    Setor
                  </label>
                  <Select
                    value={formData.industry}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, industry: value }))}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="rounded-2xl">
                      <SelectValue placeholder="Selecione o setor" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl max-h-60">
                      {industries.map(ind => (
                        <SelectItem key={ind} value={ind} className="rounded-lg">
                          {ind}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.industry === 'Outros' && (
                <div className="space-y-2">
                  <label
                    htmlFor="customIndustry"
                    className="text-sm font-medium text-gray-700"
                  >
                    Especifique o Setor
                  </label>
                  <Input
                    id="customIndustry"
                    name="customIndustry"
                    value={formData.customIndustry}
                    onChange={handleChange}
                    placeholder="Digite o setor da sua empresa"
                    className="rounded-2xl"
                    disabled={isLoading}
                  />
                </div>
              )}

              <div className="space-y-2">
                <label
                  htmlFor="phone"
                  className="text-sm font-medium text-gray-700 flex items-center gap-2"
                >
                  <Phone className="w-4 h-4" />
                  Telefone
                </label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="(XX) XXXXX-XXXX"
                  className="rounded-2xl"
                  disabled={isLoading}
                />
              </div>

              {/* CEP e Endereço */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Endereço
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="cep" className="text-sm font-medium text-gray-700">
                      CEP
                    </label>
                    <div className="relative">
                      <Input
                        id="cep"
                        name="cep"
                        value={formData.cep}
                        onChange={handleChange}
                        placeholder="00000-000"
                        maxLength={9}
                        className="rounded-2xl pr-10"
                        disabled={isLoading}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {isLoadingCep && (
                          <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <label htmlFor="street" className="text-sm font-medium text-gray-700">
                      Rua/Logradouro
                    </label>
                    <Input
                      id="street"
                      name="street"
                      value={formData.street}
                      onChange={handleChange}
                      placeholder="Rua das Flores"
                      className="rounded-2xl bg-gray-50"
                      disabled={true}
                      readOnly
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="number" className="text-sm font-medium text-gray-700">
                      Número
                    </label>
                    <Input
                      id="number"
                      name="number"
                      value={formData.number}
                      onChange={handleChange}
                      placeholder="123"
                      className="rounded-2xl"
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="complement" className="text-sm font-medium text-gray-700">
                      Complemento
                    </label>
                    <Input
                      id="complement"
                      name="complement"
                      value={formData.complement}
                      onChange={handleChange}
                      placeholder="Sala 101"
                      className="rounded-2xl"
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <label htmlFor="neighborhood" className="text-sm font-medium text-gray-700">
                      Bairro
                    </label>
                    <Input
                      id="neighborhood"
                      name="neighborhood"
                      value={formData.neighborhood}
                      onChange={handleChange}
                      placeholder="Centro"
                      className="rounded-2xl bg-gray-50"
                      disabled={true}
                      readOnly
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="city" className="text-sm font-medium text-gray-700">
                      Cidade
                    </label>
                    <Input
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="São Paulo"
                      className="rounded-2xl bg-gray-50"
                      disabled={true}
                      readOnly
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="state" className="text-sm font-medium text-gray-700">
                      Estado
                    </label>
                    <Input
                      id="state"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      placeholder="SP"
                      className="rounded-2xl bg-gray-50"
                      disabled={true}
                      readOnly
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="country" className="text-sm font-medium text-gray-700">
                      País
                    </label>
                    <Input
                      id="country"
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      placeholder="Brasil"
                      className="rounded-2xl bg-gray-50"
                      disabled={true}
                      readOnly
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="website"
                  className="text-sm font-medium text-gray-700 flex items-center gap-2"
                >
                  <Globe className="w-4 h-4" />
                  Website
                </label>
                <Input
                  id="website"
                  name="website"
                  type="url"
                  value={formData.website}
                  onChange={handleChange}
                  placeholder="https://suaempresa.com"
                  className="rounded-2xl"
                  disabled={isLoading}
                />
              </div>



              {/* Termos e Privacidade */}
              <div className="space-y-3 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="terms"
                    checked={acceptedTerms}
                    onCheckedChange={setAcceptedTerms}
                    disabled={isLoading}
                    className="mt-1"
                  />
                  <label
                    htmlFor="terms"
                    className="text-sm font-medium text-gray-700 cursor-pointer flex-1"
                  >
                    Li e aceito os{' '}
                    <a
                      href={createPageUrl("TermsOfService")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Termos de Uso
                    </a>
                    {' '}e a{' '}
                    <a
                      href={createPageUrl("PrivacyPolicy")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Política de Privacidade
                    </a>
                  </label>
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-lg rounded-2xl"
                  disabled={isLoading || !acceptedTerms}
                >
                  {isLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    "Finalizar e Começar a Usar"
                  )}
                </Button>
                
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-2xl"
                  onClick={handleLogout}
                  disabled={isLoading}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair / Desistir
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}