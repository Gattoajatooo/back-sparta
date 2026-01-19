import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Company } from "@/entities/Company";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Bell, Send, CheckCircle2, AlertCircle, Loader2, Search, Building2, Users } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function NotificationsAdmin() {
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    category: "news",
    target_type: "all",
    target_company_id: "",
    target_user_id: ""
  });
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState(null); // success | error
  
  // Estados para dropdowns
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [companySearch, setCompanySearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [openCompanyPopover, setOpenCompanyPopover] = useState(false);
  const [openUserPopover, setOpenUserPopover] = useState(false);

  const categories = [
    { value: "news", label: "Novidades", color: "bg-blue-100 text-blue-800" },
    { value: "improvement", label: "Melhorias", color: "bg-green-100 text-green-800" },
    { value: "fix", label: "Correções", color: "bg-orange-100 text-orange-800" },
    { value: "warning", label: "Avisos Importantes", color: "bg-red-100 text-red-800" },
    { value: "suggestion", label: "Sugestões", color: "bg-purple-100 text-purple-800" }
  ];

  // Carregar empresas e usuários
  useEffect(() => {
    loadCompanies();
    loadUsers();
  }, []);

  const loadCompanies = async () => {
    setIsLoadingCompanies(true);
    try {
      const allCompanies = await Company.list();
      setCompanies(allCompanies);
    } catch (error) {
      console.error("Erro ao carregar empresas:", error);
    } finally {
      setIsLoadingCompanies(false);
    }
  };

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const allUsers = await User.list();
      setUsers(allUsers);
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const getSelectedCompanyName = () => {
    const company = companies.find(c => c.id === formData.target_company_id);
    return company?.name || "Selecione uma empresa";
  };

  const getSelectedUserName = () => {
    const user = users.find(u => u.id === formData.target_user_id);
    return user?.full_name || "Selecione um usuário";
  };

  const filteredCompanies = companies.filter(company => 
    company.name?.toLowerCase().includes(companySearch.toLowerCase())
  );

  const filteredUsers = users.filter(user => {
    const searchLower = userSearch.toLowerCase();
    const matchesName = user.full_name?.toLowerCase().includes(searchLower);
    const matchesCompany = companies.find(c => c.id === user.company_id)?.name?.toLowerCase().includes(searchLower);
    return matchesName || matchesCompany;
  });

  const handleSend = async () => {
    if (!formData.title || !formData.message) return;
    
    setIsSending(true);
    setStatus(null);

    try {
      const response = await base44.functions.invoke("sendSystemNotification", formData);
      if (response.data?.success) {
        setStatus({ type: "success", message: response.data.message });
        setFormData({ ...formData, title: "", message: "" });
      } else {
        throw new Error(response.data?.error || "Falha ao enviar");
      }
    } catch (error) {
      console.error(error);
      setStatus({ type: "error", message: error.message });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Bell className="w-8 h-8 text-blue-600" />
          Central de Notificações
        </h1>
        <p className="text-gray-600 mt-2">
          Envie alertas, novidades e avisos para os usuários da plataforma.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulário */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-2xl shadow-sm border-gray-200">
            <CardHeader>
              <CardTitle>Nova Notificação</CardTitle>
              <CardDescription>Preencha os dados para enviar um alerta.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {status && (
                <Alert className={`rounded-xl ${status.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  {status.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-green-600"/> : <AlertCircle className="h-4 w-4 text-red-600"/>}
                  <AlertDescription className={status.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                    {status.message}
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(v) => setFormData({...formData, category: v})}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {categories.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Destinatários</Label>
                  <Select 
                    value={formData.target_type} 
                    onValueChange={(v) => setFormData({...formData, target_type: v, target_company_id: "", target_user_id: ""})}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="all">Todos os Usuários</SelectItem>
                      <SelectItem value="company">Empresa Específica</SelectItem>
                      <SelectItem value="user">Usuário Específico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.target_type === 'company' && (
                <div className="space-y-2">
                  <Label>Selecionar Empresa</Label>
                  <Popover open={openCompanyPopover} onOpenChange={setOpenCompanyPopover}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openCompanyPopover}
                        className="w-full justify-between rounded-xl"
                      >
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-gray-500" />
                          <span className={formData.target_company_id ? "text-gray-900" : "text-gray-500"}>
                            {getSelectedCompanyName()}
                          </span>
                        </div>
                        <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 rounded-xl" align="start">
                      <Command>
                        <CommandInput 
                          placeholder="Pesquisar empresa..." 
                          value={companySearch}
                          onValueChange={setCompanySearch}
                        />
                        <CommandList>
                          <CommandEmpty>
                            {isLoadingCompanies ? "Carregando..." : "Nenhuma empresa encontrada."}
                          </CommandEmpty>
                          <CommandGroup>
                            {filteredCompanies.map((company) => (
                              <CommandItem
                                key={company.id}
                                value={company.id}
                                onSelect={() => {
                                  setFormData({...formData, target_company_id: company.id});
                                  setOpenCompanyPopover(false);
                                }}
                              >
                                <Building2 className="mr-2 h-4 w-4 text-gray-500" />
                                <span>{company.name}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {formData.target_type === 'user' && (
                <div className="space-y-2">
                  <Label>Selecionar Usuário</Label>
                  <Popover open={openUserPopover} onOpenChange={setOpenUserPopover}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openUserPopover}
                        className="w-full justify-between rounded-xl"
                      >
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-500" />
                          <span className={formData.target_user_id ? "text-gray-900" : "text-gray-500"}>
                            {getSelectedUserName()}
                          </span>
                        </div>
                        <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0 rounded-xl" align="start">
                      <Command>
                        <CommandInput 
                          placeholder="Pesquisar usuário ou empresa..." 
                          value={userSearch}
                          onValueChange={setUserSearch}
                        />
                        <CommandList>
                          <CommandEmpty>
                            {isLoadingUsers ? "Carregando..." : "Nenhum usuário encontrado."}
                          </CommandEmpty>
                          <CommandGroup>
                            {filteredUsers.map((user) => {
                              const userCompany = companies.find(c => c.id === user.company_id);
                              return (
                                <CommandItem
                                  key={user.id}
                                  value={user.id}
                                  onSelect={() => {
                                    setFormData({...formData, target_user_id: user.id});
                                    setOpenUserPopover(false);
                                  }}
                                >
                                  <Users className="mr-2 h-4 w-4 text-gray-500" />
                                  <div className="flex flex-col">
                                    <span>{user.full_name}</span>
                                    {userCompany && (
                                      <span className="text-xs text-gray-500">{userCompany.name}</span>
                                    )}
                                  </div>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              <div className="space-y-2">
                <Label>Título</Label>
                <Input 
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Ex: Nova funcionalidade de agendamento"
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label>Mensagem</Label>
                <Textarea 
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  placeholder="Detalhes da notificação..."
                  className="rounded-xl min-h-[120px]"
                />
              </div>

              <div className="pt-4 flex justify-end">
                <Button 
                  onClick={handleSend}
                  disabled={isSending || !formData.title || !formData.message}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6"
                >
                  {isSending ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Send className="w-4 h-4 mr-2"/>}
                  Enviar Notificação
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <div className="space-y-6">
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Preview</h3>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 border-l-4 border-l-blue-500">
              <div className="flex gap-3">
                <div className="flex-shrink-0 mt-1">
                  <Bell className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <p className="text-sm font-semibold text-gray-900">
                      {formData.title || "Título da notificação"}
                    </p>
                    <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                  </div>
                  
                  {formData.category && (
                    <Badge className={`mt-1 mb-2 text-[10px] ${categories.find(c => c.value === formData.category)?.color}`}>
                      {categories.find(c => c.value === formData.category)?.label}
                    </Badge>
                  )}

                  <p className="text-xs text-gray-600 line-clamp-3">
                    {formData.message || "O conteúdo da mensagem aparecerá aqui..."}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-2">
                    Agora
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}