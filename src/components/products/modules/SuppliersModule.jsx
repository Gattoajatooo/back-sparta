import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Users,
  Save,
  X,
  MapPin,
  Phone,
  Trash,
  Star
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function SuppliersModule() {
  const moduleId = 'suppliers';
  
  const [user, setUser] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [showForm, setShowForm] = useState(() => {
    const saved = localStorage.getItem(`${moduleId}_showForm`);
    return saved === 'true';
  });
  const [editingSupplier, setEditingSupplier] = useState(() => {
    const saved = localStorage.getItem(`${moduleId}_editingSupplier`);
    return saved ? JSON.parse(saved) : null;
  });
  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem(`${moduleId}_activeTab`);
    return saved || "identification";
  });
  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem(`${moduleId}_formData`);
    return saved ? JSON.parse(saved) : getEmptyFormData();
  });

  function getEmptyFormData() {
    return {
      internal_code: "",
      person_type: "legal",
      corporate_name: "",
      trade_name: "",
      document_number: "",
      state_registration: "",
      municipal_registration: "",
      status: "active",
      relationship_start_date: "",
      addresses: [],
      contacts: [],
      category: "raw_material",
      segment: "",
      tags: [],
      priority: "medium",
      is_approved: false,
      supplied_products: [],
      payment_term_default: "",
      payment_method: "boleto",
      bank_name: "",
      bank_agency: "",
      bank_account: "",
      pix_key: "",
      credit_limit: 0,
      outstanding_balance: 0,
      late_fee_percent: 0,
      late_interest_percent: 0,
      tax_regime: "simples_nacional",
      withholdings: [],
      operation_nature_default: "",
      fiscal_notes: "",
      default_carrier: "",
      delivery_modal: "carrier",
      incoterm: "",
      avg_delivery_days: null,
      receiving_window: "",
      freight_responsibility: "supplier",
      quality_rating: null,
      delivery_rating: null,
      service_rating: null,
      on_time_delivery_percent: 0,
      divergence_percent: 0,
      performance_status: "regular",
      performance_notes: "",
      general_notes: "",
      contracts: "",
      certifications: "",
      fiscal_documents: "",
      documents_expiry_date: "",
      is_active: true
    };
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    localStorage.setItem(`${moduleId}_showForm`, showForm);
  }, [showForm]);

  useEffect(() => {
    localStorage.setItem(`${moduleId}_editingSupplier`, JSON.stringify(editingSupplier));
  }, [editingSupplier]);

  useEffect(() => {
    localStorage.setItem(`${moduleId}_activeTab`, activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem(`${moduleId}_formData`, JSON.stringify(formData));
  }, [formData]);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const [allSuppliers, allUsers] = await Promise.all([
        base44.entities.Supplier.filter({
          company_id: currentUser.company_id
        }).catch(() => []),
        base44.entities.User.filter({
          company_id: currentUser.company_id
        }).catch(() => [])
      ]);

      setSuppliers(allSuppliers || []);
      setUsers(allUsers || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      setSuppliers([]);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddAddress = () => {
    setFormData(prev => ({
      ...prev,
      addresses: [...prev.addresses, {
        type: 'commercial',
        is_default: prev.addresses.length === 0,
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
        zip_code: '',
        country: 'Brasil'
      }]
    }));
  };

  const handleRemoveAddress = (index) => {
    setFormData(prev => ({
      ...prev,
      addresses: prev.addresses.filter((_, i) => i !== index)
    }));
  };

  const handleUpdateAddress = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      addresses: prev.addresses.map((addr, i) => 
        i === index ? { ...addr, [field]: value } : addr
      )
    }));
  };

  const handleAddContact = () => {
    setFormData(prev => ({
      ...prev,
      contacts: [...prev.contacts, {
        name: '',
        position: '',
        phone: '',
        whatsapp: '',
        email: '',
        contact_type: 'commercial'
      }]
    }));
  };

  const handleRemoveContact = (index) => {
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts.filter((_, i) => i !== index)
    }));
  };

  const handleUpdateContact = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts.map((contact, i) => 
        i === index ? { ...contact, [field]: value } : contact
      )
    }));
  };

  const handleSubmit = async () => {
    try {
      const supplierData = {
        ...formData,
        company_id: user.company_id
      };

      if (editingSupplier) {
        await base44.entities.Supplier.update(editingSupplier.id, supplierData);
      } else {
        await base44.entities.Supplier.create(supplierData);
      }

      await loadData();
      
      localStorage.removeItem(`${moduleId}_showForm`);
      localStorage.removeItem(`${moduleId}_editingSupplier`);
      localStorage.removeItem(`${moduleId}_activeTab`);
      localStorage.removeItem(`${moduleId}_formData`);
      
      setShowForm(false);
      setEditingSupplier(null);
      setFormData(getEmptyFormData());
    } catch (error) {
      console.error("Erro ao salvar fornecedor:", error);
    }
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setFormData({ ...getEmptyFormData(), ...supplier });
    setShowForm(true);
  };

  const handleDelete = async (supplierId) => {
    if (window.confirm("Deseja realmente excluir este fornecedor?")) {
      try {
        await base44.entities.Supplier.update(supplierId, { is_active: false, status: 'inactive' });
        await loadData();
      } catch (error) {
        console.error("Erro ao excluir fornecedor:", error);
      }
    }
  };

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.corporate_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.trade_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.document_number?.includes(searchTerm) ||
    supplier.internal_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getUserByEmail = (email) => {
    return users.find(u => u.email === email);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto overflow-hidden mb-4">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690a8ae384e85f405dd1958f/8d6af0619_ChatGPTImage24denovde202519_02_27.png"
              alt="Sparta Sync"
              className="w-16 h-16 object-contain"
            />
            <div className="shine-effect"></div>
          </div>
          <style>
            {`
              @keyframes shine {
                0% { transform: translateX(-100%) translateY(100%) rotate(-45deg); opacity: 0; }
                50% { opacity: 1; }
                100% { transform: translateX(100%) translateY(-100%) rotate(-45deg); opacity: 0; }
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
          <p className="text-gray-500">Carregando...</p>
        </div>
      </div>
    );
  }

  if (showForm) {
    const avgRating = formData.quality_rating && formData.delivery_rating && formData.service_rating
      ? ((formData.quality_rating + formData.delivery_rating + formData.service_rating) / 3).toFixed(1)
      : 0;

    return (
      <div className="h-full flex flex-col bg-white rounded-3xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-semibold text-lg">
            {editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}
          </h3>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                localStorage.removeItem(`${moduleId}_showForm`);
                localStorage.removeItem(`${moduleId}_editingSupplier`);
                localStorage.removeItem(`${moduleId}_activeTab`);
                localStorage.removeItem(`${moduleId}_formData`);
                
                setShowForm(false);
                setEditingSupplier(null);
                setFormData(getEmptyFormData());
              }}
              className="transition-all active:scale-95 rounded-xl"
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button 
              size="sm" 
              onClick={handleSubmit}
              className="transition-all active:scale-95 rounded-xl"
            >
              <Save className="w-4 h-4 mr-2" />
              Salvar
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-6 rounded-2xl mb-2">
                <TabsTrigger value="identification" className="rounded-xl text-xs">Identificação</TabsTrigger>
                <TabsTrigger value="addresses" className="rounded-xl text-xs">Endereços</TabsTrigger>
                <TabsTrigger value="contacts" className="rounded-xl text-xs">Contatos</TabsTrigger>
                <TabsTrigger value="classification" className="rounded-xl text-xs">Classificação</TabsTrigger>
                <TabsTrigger value="products" className="rounded-xl text-xs">Produtos</TabsTrigger>
                <TabsTrigger value="financial" className="rounded-xl text-xs">Financeiro</TabsTrigger>
              </TabsList>
              <TabsList className="grid w-full grid-cols-5 rounded-2xl">
                <TabsTrigger value="fiscal" className="rounded-xl text-xs">Fiscal</TabsTrigger>
                <TabsTrigger value="logistics" className="rounded-xl text-xs">Logística</TabsTrigger>
                <TabsTrigger value="performance" className="rounded-xl text-xs">Performance</TabsTrigger>
                <TabsTrigger value="docs" className="rounded-xl text-xs">Documentos</TabsTrigger>
                <TabsTrigger value="audit" className="rounded-xl text-xs">Auditoria</TabsTrigger>
              </TabsList>

              {/* Aba 1: Identificação */}
              <TabsContent value="identification" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Código Interno</Label>
                    <Input
                      value={formData.internal_code}
                      onChange={(e) => handleInputChange('internal_code', e.target.value)}
                      placeholder="Ex: FORN001"
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Tipo de Pessoa *</Label>
                    <Select value={formData.person_type} onValueChange={(v) => handleInputChange('person_type', v)}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        <SelectItem value="legal" className="rounded-lg">Pessoa Jurídica</SelectItem>
                        <SelectItem value="individual" className="rounded-lg">Pessoa Física</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label>Razão Social / Nome Completo *</Label>
                    <Input
                      value={formData.corporate_name}
                      onChange={(e) => handleInputChange('corporate_name', e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Nome Fantasia</Label>
                    <Input
                      value={formData.trade_name}
                      onChange={(e) => handleInputChange('trade_name', e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>{formData.person_type === 'legal' ? 'CNPJ' : 'CPF'} *</Label>
                    <Input
                      value={formData.document_number}
                      onChange={(e) => handleInputChange('document_number', e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Inscrição Estadual</Label>
                    <Input
                      value={formData.state_registration}
                      onChange={(e) => handleInputChange('state_registration', e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Inscrição Municipal</Label>
                    <Input
                      value={formData.municipal_registration}
                      onChange={(e) => handleInputChange('municipal_registration', e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={(v) => handleInputChange('status', v)}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        <SelectItem value="active" className="rounded-lg">Ativo</SelectItem>
                        <SelectItem value="inactive" className="rounded-lg">Inativo</SelectItem>
                        <SelectItem value="blocked" className="rounded-lg">Bloqueado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label>Data de Início do Relacionamento</Label>
                    <Input
                      type="date"
                      value={formData.relationship_start_date ? formData.relationship_start_date.split('T')[0] : ''}
                      onChange={(e) => handleInputChange('relationship_start_date', e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Aba 2: Endereços */}
              <TabsContent value="addresses" className="space-y-4 mt-4">
                <div className="flex justify-between items-center">
                  <Label>Endereços Cadastrados</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddAddress}
                    className="rounded-xl"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Endereço
                  </Button>
                </div>
                {formData.addresses?.map((address, index) => (
                  <div key={index} className="p-4 border rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-600" />
                        <Label>Endereço {index + 1}</Label>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveAddress(index)}
                        className="h-8 w-8 rounded-lg"
                      >
                        <Trash className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Tipo</Label>
                        <Select value={address.type} onValueChange={(v) => handleUpdateAddress(index, 'type', v)}>
                          <SelectTrigger className="rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl">
                            <SelectItem value="commercial">Comercial</SelectItem>
                            <SelectItem value="fiscal">Fiscal</SelectItem>
                            <SelectItem value="delivery">Entrega</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">CEP</Label>
                        <Input
                          value={address.zip_code}
                          onChange={(e) => handleUpdateAddress(index, 'zip_code', e.target.value)}
                          className="rounded-xl"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Logradouro</Label>
                        <Input
                          value={address.street}
                          onChange={(e) => handleUpdateAddress(index, 'street', e.target.value)}
                          className="rounded-xl"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Número</Label>
                        <Input
                          value={address.number}
                          onChange={(e) => handleUpdateAddress(index, 'number', e.target.value)}
                          className="rounded-xl"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Complemento</Label>
                        <Input
                          value={address.complement}
                          onChange={(e) => handleUpdateAddress(index, 'complement', e.target.value)}
                          className="rounded-xl"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Bairro</Label>
                        <Input
                          value={address.neighborhood}
                          onChange={(e) => handleUpdateAddress(index, 'neighborhood', e.target.value)}
                          className="rounded-xl"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Cidade</Label>
                        <Input
                          value={address.city}
                          onChange={(e) => handleUpdateAddress(index, 'city', e.target.value)}
                          className="rounded-xl"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">UF</Label>
                        <Input
                          value={address.state}
                          onChange={(e) => handleUpdateAddress(index, 'state', e.target.value)}
                          maxLength={2}
                          className="rounded-xl"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">País</Label>
                        <Input
                          value={address.country}
                          onChange={(e) => handleUpdateAddress(index, 'country', e.target.value)}
                          className="rounded-xl"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={address.is_default}
                            onChange={(e) => handleUpdateAddress(index, 'is_default', e.target.checked)}
                            className="rounded"
                          />
                          <span className="text-sm">Endereço Padrão</span>
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
                {formData.addresses?.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p>Nenhum endereço cadastrado</p>
                  </div>
                )}
              </TabsContent>

              {/* Aba 3: Contatos */}
              <TabsContent value="contacts" className="space-y-4 mt-4">
                <div className="flex justify-between items-center">
                  <Label>Contatos Cadastrados</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddContact}
                    className="rounded-xl"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Contato
                  </Button>
                </div>
                {formData.contacts?.map((contact, index) => (
                  <div key={index} className="p-4 border rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-600" />
                        <Label>Contato {index + 1}</Label>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveContact(index)}
                        className="h-8 w-8 rounded-lg"
                      >
                        <Trash className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Nome</Label>
                        <Input
                          value={contact.name}
                          onChange={(e) => handleUpdateContact(index, 'name', e.target.value)}
                          className="rounded-xl"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Cargo / Departamento</Label>
                        <Input
                          value={contact.position}
                          onChange={(e) => handleUpdateContact(index, 'position', e.target.value)}
                          className="rounded-xl"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Telefone</Label>
                        <Input
                          value={contact.phone}
                          onChange={(e) => handleUpdateContact(index, 'phone', e.target.value)}
                          className="rounded-xl"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">WhatsApp</Label>
                        <Input
                          value={contact.whatsapp}
                          onChange={(e) => handleUpdateContact(index, 'whatsapp', e.target.value)}
                          className="rounded-xl"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">E-mail</Label>
                        <Input
                          type="email"
                          value={contact.email}
                          onChange={(e) => handleUpdateContact(index, 'email', e.target.value)}
                          className="rounded-xl"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Tipo</Label>
                        <Select value={contact.contact_type} onValueChange={(v) => handleUpdateContact(index, 'contact_type', v)}>
                          <SelectTrigger className="rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl">
                            <SelectItem value="commercial">Comercial</SelectItem>
                            <SelectItem value="financial">Financeiro</SelectItem>
                            <SelectItem value="logistics">Logística</SelectItem>
                            <SelectItem value="fiscal">Fiscal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
                {formData.contacts?.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Phone className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p>Nenhum contato cadastrado</p>
                  </div>
                )}
              </TabsContent>

              {/* Aba 4: Classificação */}
              <TabsContent value="classification" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Categoria</Label>
                    <Select value={formData.category} onValueChange={(v) => handleInputChange('category', v)}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        <SelectItem value="raw_material" className="rounded-lg">Matéria-Prima</SelectItem>
                        <SelectItem value="services" className="rounded-lg">Serviços</SelectItem>
                        <SelectItem value="resale" className="rounded-lg">Revenda</SelectItem>
                        <SelectItem value="transport" className="rounded-lg">Transporte</SelectItem>
                        <SelectItem value="technology" className="rounded-lg">Tecnologia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Prioridade</Label>
                    <Select value={formData.priority} onValueChange={(v) => handleInputChange('priority', v)}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        <SelectItem value="low" className="rounded-lg">Baixa</SelectItem>
                        <SelectItem value="medium" className="rounded-lg">Média</SelectItem>
                        <SelectItem value="high" className="rounded-lg">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label>Segmento</Label>
                    <Input
                      value={formData.segment}
                      onChange={(e) => handleInputChange('segment', e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Tags (separadas por vírgula)</Label>
                    <Input
                      value={formData.tags?.join(', ') || ''}
                      onChange={(e) => handleInputChange('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                      placeholder="Ex: importado, local, crítico"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center justify-between p-4 border rounded-xl">
                      <Label>Fornecedor Homologado?</Label>
                      <Switch
                        checked={formData.is_approved}
                        onCheckedChange={(v) => handleInputChange('is_approved', v)}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Aba 5: Produtos & Catálogo */}
              <TabsContent value="products" className="space-y-4 mt-4">
                <div className="text-center py-8 text-gray-500">
                  <p>Produtos fornecidos serão gerenciados no cadastro de produtos</p>
                </div>
              </TabsContent>

              {/* Aba 6: Financeiro */}
              <TabsContent value="financial" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Condição de Pagamento Padrão</Label>
                    <Input
                      value={formData.payment_term_default}
                      onChange={(e) => handleInputChange('payment_term_default', e.target.value)}
                      placeholder="Ex: 30 dias"
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Forma de Pagamento</Label>
                    <Select value={formData.payment_method} onValueChange={(v) => handleInputChange('payment_method', v)}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        <SelectItem value="boleto" className="rounded-lg">Boleto</SelectItem>
                        <SelectItem value="pix" className="rounded-lg">PIX</SelectItem>
                        <SelectItem value="transfer" className="rounded-lg">Transferência</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Banco</Label>
                    <Input
                      value={formData.bank_name}
                      onChange={(e) => handleInputChange('bank_name', e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Agência</Label>
                    <Input
                      value={formData.bank_agency}
                      onChange={(e) => handleInputChange('bank_agency', e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Conta</Label>
                    <Input
                      value={formData.bank_account}
                      onChange={(e) => handleInputChange('bank_account', e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Chave PIX</Label>
                    <Input
                      value={formData.pix_key}
                      onChange={(e) => handleInputChange('pix_key', e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Limite de Crédito (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.credit_limit}
                      onChange={(e) => handleInputChange('credit_limit', parseFloat(e.target.value) || 0)}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Saldo em Aberto (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.outstanding_balance}
                      onChange={(e) => handleInputChange('outstanding_balance', parseFloat(e.target.value) || 0)}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Multa por Atraso (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.late_fee_percent}
                      onChange={(e) => handleInputChange('late_fee_percent', parseFloat(e.target.value) || 0)}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Juros por Atraso (% a.m.)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.late_interest_percent}
                      onChange={(e) => handleInputChange('late_interest_percent', parseFloat(e.target.value) || 0)}
                      className="rounded-xl"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Aba 7: Fiscal */}
              <TabsContent value="fiscal" className="space-y-4 mt-4">
                <div>
                  <Label>Regime Tributário</Label>
                  <Select value={formData.tax_regime} onValueChange={(v) => handleInputChange('tax_regime', v)}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="simples_nacional" className="rounded-lg">Simples Nacional</SelectItem>
                      <SelectItem value="lucro_presumido" className="rounded-lg">Lucro Presumido</SelectItem>
                      <SelectItem value="lucro_real" className="rounded-lg">Lucro Real</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Retenções Aplicáveis</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {['ir', 'inss', 'iss', 'pis_cofins'].map((withholding) => (
                      <label key={withholding} className="flex items-center gap-2 p-3 border rounded-xl hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.withholdings?.includes(withholding)}
                          onChange={(e) => {
                            const items = e.target.checked
                              ? [...(formData.withholdings || []), withholding]
                              : formData.withholdings?.filter(w => w !== withholding) || [];
                            handleInputChange('withholdings', items);
                          }}
                          className="rounded"
                        />
                        <span className="text-sm uppercase">{withholding.replace('_', '/')}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Natureza de Operação Padrão</Label>
                  <Input
                    value={formData.operation_nature_default}
                    onChange={(e) => handleInputChange('operation_nature_default', e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <Label>Observações Fiscais</Label>
                  <Textarea
                    value={formData.fiscal_notes}
                    onChange={(e) => handleInputChange('fiscal_notes', e.target.value)}
                    rows={3}
                    className="rounded-xl"
                  />
                </div>
              </TabsContent>

              {/* Aba 8: Logística */}
              <TabsContent value="logistics" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Transportadora Padrão</Label>
                    <Input
                      value={formData.default_carrier}
                      onChange={(e) => handleInputChange('default_carrier', e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Modal de Entrega</Label>
                    <Select value={formData.delivery_modal} onValueChange={(v) => handleInputChange('delivery_modal', v)}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        <SelectItem value="courier" className="rounded-lg">Correios</SelectItem>
                        <SelectItem value="carrier" className="rounded-lg">Transportadora</SelectItem>
                        <SelectItem value="pickup" className="rounded-lg">Retirada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Incoterm</Label>
                    <Input
                      value={formData.incoterm}
                      onChange={(e) => handleInputChange('incoterm', e.target.value)}
                      placeholder="Ex: FOB, CIF"
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Prazo Médio de Entrega (dias)</Label>
                    <Input
                      type="number"
                      value={formData.avg_delivery_days || ''}
                      onChange={(e) => handleInputChange('avg_delivery_days', e.target.value ? parseInt(e.target.value) : null)}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Janela de Recebimento</Label>
                    <Input
                      value={formData.receiving_window}
                      onChange={(e) => handleInputChange('receiving_window', e.target.value)}
                      placeholder="Ex: 08:00 - 17:00"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Responsável pelo Frete</Label>
                    <Select value={formData.freight_responsibility} onValueChange={(v) => handleInputChange('freight_responsibility', v)}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        <SelectItem value="supplier" className="rounded-lg">Fornecedor</SelectItem>
                        <SelectItem value="company" className="rounded-lg">Empresa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              {/* Aba 9: Avaliação & Performance */}
              <TabsContent value="performance" className="space-y-4 mt-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Nota de Qualidade (0-10)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={formData.quality_rating || ''}
                      onChange={(e) => handleInputChange('quality_rating', e.target.value ? parseFloat(e.target.value) : null)}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Nota de Prazo (0-10)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={formData.delivery_rating || ''}
                      onChange={(e) => handleInputChange('delivery_rating', e.target.value ? parseFloat(e.target.value) : null)}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Nota de Atendimento (0-10)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={formData.service_rating || ''}
                      onChange={(e) => handleInputChange('service_rating', e.target.value ? parseFloat(e.target.value) : null)}
                      className="rounded-xl"
                    />
                  </div>
                </div>
                {avgRating > 0 && (
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Média Geral</span>
                      <div className="flex items-center gap-2">
                        <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                        <span className="text-2xl font-bold text-blue-900">{avgRating}</span>
                      </div>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>% Entregas no Prazo</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={formData.on_time_delivery_percent}
                      onChange={(e) => handleInputChange('on_time_delivery_percent', parseFloat(e.target.value) || 0)}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>% Divergência</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={formData.divergence_percent}
                      onChange={(e) => handleInputChange('divergence_percent', parseFloat(e.target.value) || 0)}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Status de Performance</Label>
                    <Select value={formData.performance_status} onValueChange={(v) => handleInputChange('performance_status', v)}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        <SelectItem value="excellent" className="rounded-lg">Excelente</SelectItem>
                        <SelectItem value="regular" className="rounded-lg">Regular</SelectItem>
                        <SelectItem value="critical" className="rounded-lg">Crítico</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label>Observações de Avaliação</Label>
                    <Textarea
                      value={formData.performance_notes}
                      onChange={(e) => handleInputChange('performance_notes', e.target.value)}
                      rows={3}
                      className="rounded-xl"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Aba 10: Documentos */}
              <TabsContent value="docs" className="space-y-4 mt-4">
                <div>
                  <Label>Observações Gerais</Label>
                  <Textarea
                    value={formData.general_notes}
                    onChange={(e) => handleInputChange('general_notes', e.target.value)}
                    rows={3}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <Label>Contratos</Label>
                  <Textarea
                    value={formData.contracts}
                    onChange={(e) => handleInputChange('contracts', e.target.value)}
                    rows={3}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <Label>Certidões</Label>
                  <Textarea
                    value={formData.certifications}
                    onChange={(e) => handleInputChange('certifications', e.target.value)}
                    rows={3}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <Label>Documentos Fiscais</Label>
                  <Textarea
                    value={formData.fiscal_documents}
                    onChange={(e) => handleInputChange('fiscal_documents', e.target.value)}
                    rows={3}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <Label>Validade dos Documentos</Label>
                  <Input
                    type="date"
                    value={formData.documents_expiry_date ? formData.documents_expiry_date.split('T')[0] : ''}
                    onChange={(e) => handleInputChange('documents_expiry_date', e.target.value)}
                    className="rounded-xl"
                  />
                </div>
              </TabsContent>

              {/* Aba 11: Auditoria */}
              <TabsContent value="audit" className="space-y-4 mt-4">
                {editingSupplier ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Data de Criação</Label>
                      <Input
                        value={new Date(new Date(editingSupplier.created_date).getTime() - 3 * 60 * 60 * 1000).toLocaleString('pt-BR')}
                        disabled
                        className="bg-gray-50 rounded-xl"
                      />
                    </div>
                    <div>
                      <Label>Criado Por</Label>
                      <div className="flex items-center gap-2 p-2 border rounded-xl bg-gray-50">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={getUserByEmail(editingSupplier.created_by)?.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {editingSupplier.created_by?.split('@')[0]?.slice(0, 2).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{editingSupplier.created_by || '-'}</span>
                      </div>
                    </div>
                    <div>
                      <Label>Última Alteração</Label>
                      <Input
                        value={new Date(new Date(editingSupplier.updated_date).getTime() - 3 * 60 * 60 * 1000).toLocaleString('pt-BR')}
                        disabled
                        className="bg-gray-50 rounded-xl"
                      />
                    </div>
                    <div>
                      <Label>Alterado Por</Label>
                      <div className="flex items-center gap-2 p-2 border rounded-xl bg-gray-50">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={getUserByEmail(editingSupplier.created_by)?.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {editingSupplier.created_by?.split('@')[0]?.slice(0, 2).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{editingSupplier.created_by || '-'}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>Dados de auditoria disponíveis após salvar o fornecedor</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col rounded-3xl overflow-hidden">
      <div className="flex items-center justify-between p-6 border-b bg-white">
        <div>
          <h2 className="text-xl font-semibold">Cadastro de Fornecedores</h2>
          <p className="text-sm text-gray-500 mt-1">
            {filteredSuppliers.length} fornecedor{filteredSuppliers.length !== 1 ? 'es' : ''}
          </p>
        </div>
        <Button 
          onClick={() => setShowForm(true)}
          className="transition-all active:scale-95 rounded-xl"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Fornecedor
        </Button>
      </div>

      <div className="px-6 py-4 border-b bg-white">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar por nome, código ou CNPJ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 bg-gray-50">
        <div className="p-6">
          {filteredSuppliers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500">Nenhum fornecedor cadastrado</p>
              <Button 
                variant="link" 
                onClick={() => setShowForm(true)}
                className="transition-all active:scale-95"
              >
                Cadastrar primeiro fornecedor
              </Button>
            </div>
          ) : (
            <div className="border rounded-2xl overflow-hidden bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Razão Social</TableHead>
                    <TableHead>Nome Fantasia</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-mono text-sm">{supplier.internal_code || '-'}</TableCell>
                      <TableCell className="font-medium">{supplier.corporate_name}</TableCell>
                      <TableCell>{supplier.trade_name || '-'}</TableCell>
                      <TableCell className="font-mono text-sm">{supplier.document_number}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="rounded-full">
                          {supplier.category === 'raw_material' ? 'Matéria-Prima' :
                           supplier.category === 'services' ? 'Serviços' :
                           supplier.category === 'resale' ? 'Revenda' :
                           supplier.category === 'transport' ? 'Transporte' :
                           'Tecnologia'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={supplier.status === 'active' ? 'default' : 'secondary'}
                          className="rounded-full"
                        >
                          {supplier.status === 'active' ? 'Ativo' : 
                           supplier.status === 'inactive' ? 'Inativo' : 'Bloqueado'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(supplier)}
                            className="transition-all active:scale-95 rounded-lg"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(supplier.id)}
                            className="transition-all active:scale-95 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}