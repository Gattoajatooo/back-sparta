
import React, { useState } from "react";
import { User } from "@/entities/User";
import { Company } from "@/entities/Company";
import { Role } from "@/entities/Role";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Building2,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function CompanyRegistration() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [companyData, setCompanyData] = useState({
    name: '',
    industry: '',
    website: '',
    phone: '',
    address: ''
  });

  const [ownerData, setOwnerData] = useState({
    full_name: '',
    email: '',
    phone: '',
    department: ''
  });

  const handleCompanySubmit = (e) => {
    e.preventDefault();
    if (!companyData.name.trim()) {
      setError('Company name is required');
      return;
    }
    if (!companyData.industry.trim()) { // Added validation for industry
      setError('Industry is required');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleOwnerSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // 1. Create the company first
      const newCompany = await Company.create({
        name: companyData.name,
        industry: companyData.industry,
        website: companyData.website,
        phone: companyData.phone,
        address: companyData.address,
        owner_id: 'temp' // Will be updated after user creation
      });

      // 2. Create the owner user using the invite-user endpoint
      const ownerInviteData = {
        email: ownerData.email,
        full_name: ownerData.full_name,
        role: 'owner',
        department: ownerData.department,
        phone: ownerData.phone,
        company_id: newCompany.id,
        is_owner_setup: true // Special flag for owner setup
      };

      // Get the app ID from the current URL
      const getAppId = () => {
        const hostname = window.location.hostname;
        if (hostname.includes('base44.app')) {
          // Extract app ID from preview URL like preview--momentum-crm-028f9623.base44.app
          const parts = hostname.split('.');
          if (parts[0].includes('preview--')) {
            return parts[0].split('preview--')[1];
          }
        }
        // Fallback app ID
        return '688bbafe9910e3f2028f9623';
      };

      const appId = getAppId();

      const response = await fetch(`https://base44.app/api/apps/${appId}/users/invite-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(ownerInviteData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create owner account');
      }

      const newOwner = await response.json();

      // 3. Update company with correct owner_id
      await Company.update(newCompany.id, {
        owner_id: newOwner.id
      });

      // 4. Create default system roles for the company
      await createDefaultRoles(newCompany.id);

      // 5. Navigate to first login setup
      navigate(createPageUrl(`FirstLogin?token=${newOwner.invitation_token || `owner_setup_${newOwner.id}`}`));

    } catch (error) {
      console.error('Error creating company and owner:', error);
      setError(`Failed to create company: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const createDefaultRoles = async (companyId) => {
    const defaultRoles = [
      {
        company_id: companyId,
        name: "Owner",
        description: "Full system access and control",
        is_system_role: true,
        permissions: {
          dashboard: "edit",
          contacts: "full",
          campaigns: "full",
          activities: "full",
          team: "full",
          settings: "full",
          reports: "edit"
        },
        restrictions: {
          can_export_data: true,
          can_delete_records: true,
          can_view_all_contacts: true
        }
      },
      {
        company_id: companyId,
        name: "Administrator",
        description: "Administrative access to most features",
        is_system_role: true,
        permissions: {
          dashboard: "edit",
          contacts: "full",
          campaigns: "full",
          activities: "full",
          team: "edit",
          settings: "view",
          reports: "edit"
        },
        restrictions: {
          can_export_data: true,
          can_delete_records: true,
          can_view_all_contacts: true
        }
      },
      {
        company_id: companyId,
        name: "Viewer",
        description: "Read-only access to basic features",
        is_system_role: true,
        permissions: {
          dashboard: "view",
          contacts: "view",
          campaigns: "view",
          activities: "view",
          team: "none",
          settings: "none",
          reports: "view"
        },
        restrictions: {
          can_export_data: false,
          can_delete_records: false,
          can_view_all_contacts: true
        }
      }
    ];

    for (const role of defaultRoles) {
      try {
        await Role.create(role);
      } catch (error) {
        console.log(`Failed to create default role ${role.name}:`, error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl rounded-3xl shadow-xl">
        <CardHeader className="text-center pb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Create Your Company Account
          </CardTitle>
          <p className="text-gray-600 mt-2">
            Set up your CRM workspace and start managing your customer relationships
          </p>

          {/* Progress Indicator */}
          <div className="flex items-center justify-center gap-2 mt-6">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              1
            </div>
            <div className={`w-16 h-1 rounded-full ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              2
            </div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-2 px-4">
            <span>Company Info</span>
            <span>Owner Details</span>
          </div>
        </CardHeader>

        <CardContent className="p-8">
          {error && (
            <Alert variant="destructive" className="mb-6 rounded-2xl">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === 1 ? (
            <form onSubmit={handleCompanySubmit} className="space-y-6">
              <div className="text-center mb-6">
                <Building2 className="w-12 h-12 mx-auto mb-3 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Company Information</h3>
                <p className="text-sm text-gray-600">Tell us about your company</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name *</Label>
                <Input
                  id="company_name"
                  value={companyData.name}
                  onChange={(e) => setCompanyData(prev => ({...prev, name: e.target.value}))}
                  placeholder="Acme Corporation"
                  className="rounded-2xl border-gray-200"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry">Setor *</Label>
                <Select
                  value={companyData.industry}
                  onValueChange={(value) => setCompanyData(prev => ({ ...prev, industry: value }))}
                  required
                >
                  <SelectTrigger className="rounded-2xl border-gray-200 focus:border-blue-300 focus:ring-blue-200">
                    <SelectValue placeholder="Selecione o setor da empresa" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl max-h-60">
                    <SelectItem value="tecnologia">Tecnologia</SelectItem>
                    <SelectItem value="saude">Saúde</SelectItem>
                    <SelectItem value="financas">Finanças</SelectItem>
                    <SelectItem value="educacao">Educação</SelectItem>
                    <SelectItem value="varejo">Varejo</SelectItem>
                    <SelectItem value="industria">Indústria</SelectItem>
                    <SelectItem value="construcao">Construção</SelectItem>
                    <SelectItem value="imobiliario">Imobiliário</SelectItem>
                    <SelectItem value="alimentacao">Alimentação</SelectItem>
                    <SelectItem value="turismo">Turismo</SelectItem>
                    <SelectItem value="transporte">Transporte</SelectItem>
                    <SelectItem value="energia">Energia</SelectItem>
                    <SelectItem value="telecomunicacoes">Telecomunicações</SelectItem>
                    <SelectItem value="consultoria">Consultoria</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="juridico">Jurídico</SelectItem>
                    <SelectItem value="contabilidade">Contabilidade</SelectItem>
                    <SelectItem value="design">Design</SelectItem>
                    <SelectItem value="arquitetura">Arquitetura</SelectItem>
                    <SelectItem value="engenharia">Engenharia</SelectItem>
                    <SelectItem value="agricultura">Agricultura</SelectItem>
                    <SelectItem value="pecuaria">Pecuária</SelectItem>
                    <SelectItem value="mineracao">Mineração</SelectItem>
                    <SelectItem value="petroleo">Petróleo e Gás</SelectItem>
                    <SelectItem value="farmaceutico">Farmacêutico</SelectItem>
                    <SelectItem value="cosmeticos">Cosméticos</SelectItem>
                    <SelectItem value="textil">Têxtil</SelectItem>
                    <SelectItem value="calcados">Calçados</SelectItem>
                    <SelectItem value="moveis">Móveis</SelectItem>
                    <SelectItem value="eletronicos">Eletrônicos</SelectItem>
                    <SelectItem value="automotivo">Automotivo</SelectItem>
                    <SelectItem value="logistica">Logística</SelectItem>
                    <SelectItem value="seguranca">Segurança</SelectItem>
                    <SelectItem value="limpeza">Limpeza</SelectItem>
                    <SelectItem value="esportes">Esportes</SelectItem>
                    <SelectItem value="entretenimento">Entretenimento</SelectItem>
                    <SelectItem value="comunicacao">Comunicação</SelectItem>
                    <SelectItem value="publicidade">Publicidade</SelectItem>
                    <SelectItem value="eventos">Eventos</SelectItem>
                    <SelectItem value="fotografia">Fotografia</SelectItem>
                    <SelectItem value="musica">Música</SelectItem>
                    <SelectItem value="arte">Arte</SelectItem>
                    <SelectItem value="cultura">Cultura</SelectItem>
                    <SelectItem value="ong">ONGs</SelectItem>
                    <SelectItem value="governo">Governo</SelectItem>
                    <SelectItem value="religioso">Religioso</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={companyData.website}
                    onChange={(e) => setCompanyData(prev => ({...prev, website: e.target.value}))}
                    placeholder="https://acme.com"
                    className="rounded-2xl border-gray-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company_phone">Phone</Label>
                  <Input
                    id="company_phone"
                    value={companyData.phone}
                    onChange={(e) => setCompanyData(prev => ({...prev, phone: e.target.value}))}
                    placeholder="+1 (555) 123-4567"
                    className="rounded-2xl border-gray-200"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={companyData.address}
                  onChange={(e) => setCompanyData(prev => ({...prev, address: e.target.value}))}
                  placeholder="123 Main St, City, State"
                  className="rounded-2xl border-gray-200"
                />
              </div>

              <Button
                type="submit"
                className="w-full rounded-2xl bg-blue-600 hover:bg-blue-700 h-12 text-base font-medium"
              >
                Continue to Owner Details
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </form>
          ) : (
            <form onSubmit={handleOwnerSubmit} className="space-y-6">
              <div className="text-center mb-6">
                <UserIcon className="w-12 h-12 mx-auto mb-3 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Owner Details</h3>
                <p className="text-sm text-gray-600">Set up the company owner account</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    value={ownerData.full_name}
                    onChange={(e) => setOwnerData(prev => ({...prev, full_name: e.target.value}))}
                    placeholder="John Doe"
                    className="rounded-2xl border-gray-200"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={ownerData.email}
                    onChange={(e) => setOwnerData(prev => ({...prev, email: e.target.value}))}
                    placeholder="john@acme.com"
                    className="rounded-2xl border-gray-200"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="owner_phone">Phone</Label>
                  <Input
                    id="owner_phone"
                    value={ownerData.phone}
                    onChange={(e) => setOwnerData(prev => ({...prev, phone: e.target.value}))}
                    placeholder="+1 (555) 123-4567"
                    className="rounded-2xl border-gray-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={ownerData.department}
                    onChange={(e) => setOwnerData(prev => ({...prev, department: e.target.value}))}
                    placeholder="Executive"
                    className="rounded-2xl border-gray-200"
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-blue-800 text-sm font-medium mb-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Ready to Create
                </div>
                <p className="text-sm text-blue-700">
                  We'll create your company workspace and set up your owner account. You'll be prompted to create a secure password next.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1 rounded-2xl"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 rounded-2xl bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  ) : (
                    <>
                      Create Company
                      <CheckCircle2 className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
