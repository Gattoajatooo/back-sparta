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
  Tags,
  Save,
  X
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ImageInput } from '../MediaInput';

export default function BrandsModule() {
  const moduleId = 'brands';
  
  const [user, setUser] = useState(null);
  const [brands, setBrands] = useState([]);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [showForm, setShowForm] = useState(() => {
    const saved = localStorage.getItem(`${moduleId}_showForm`);
    return saved === 'true';
  });
  const [editingBrand, setEditingBrand] = useState(() => {
    const saved = localStorage.getItem(`${moduleId}_editingBrand`);
    return saved ? JSON.parse(saved) : null;
  });
  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem(`${moduleId}_activeTab`);
    return saved || "basic";
  });
  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem(`${moduleId}_formData`);
    return saved ? JSON.parse(saved) : getEmptyFormData();
  });

  function getEmptyFormData() {
    return {
      internal_code: "",
      name: "",
      short_name: "",
      status: "active",
      brand_type: "national",
      logo_url: "",
      institutional_image_url: "",
      brand_colors: [],
      slogan: "",
      usage_contexts: [],
      manufacturer: "",
      country_origin: "",
      foundation_year: null,
      website: "",
      segment: "",
      positioning: "intermediate",
      target_audience: "",
      tags: [],
      notes: "",
      contracts: "",
      certifications: "",
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
    localStorage.setItem(`${moduleId}_editingBrand`, JSON.stringify(editingBrand));
  }, [editingBrand]);

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

      const [allBrands, allUsers, allProducts] = await Promise.all([
        base44.entities.ProductBrand.filter({
          company_id: currentUser.company_id
        }).catch(() => []),
        base44.entities.User.filter({
          company_id: currentUser.company_id
        }).catch(() => []),
        base44.entities.Product.filter({
          company_id: currentUser.company_id,
          is_deleted: { '$ne': true }
        }).catch(() => [])
      ]);

      setBrands(allBrands || []);
      setUsers(allUsers || []);
      setProducts(allProducts || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      setBrands([]);
      setUsers([]);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    try {
      const brandData = {
        ...formData,
        company_id: user.company_id
      };

      if (editingBrand) {
        await base44.entities.ProductBrand.update(editingBrand.id, brandData);
      } else {
        await base44.entities.ProductBrand.create(brandData);
      }

      await loadData();
      
      localStorage.removeItem(`${moduleId}_showForm`);
      localStorage.removeItem(`${moduleId}_editingBrand`);
      localStorage.removeItem(`${moduleId}_activeTab`);
      localStorage.removeItem(`${moduleId}_formData`);
      
      setShowForm(false);
      setEditingBrand(null);
      setFormData(getEmptyFormData());
    } catch (error) {
      console.error("Erro ao salvar marca:", error);
    }
  };

  const handleEdit = (brand) => {
    setEditingBrand(brand);
    setFormData({ ...getEmptyFormData(), ...brand });
    setShowForm(true);
  };

  const handleDelete = async (brandId) => {
    if (window.confirm("Deseja realmente excluir esta marca?")) {
      try {
        await base44.entities.ProductBrand.update(brandId, { is_active: false, status: 'inactive' });
        await loadData();
      } catch (error) {
        console.error("Erro ao excluir marca:", error);
      }
    }
  };

  const filteredBrands = brands.filter(brand =>
    brand.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    brand.internal_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getUserByEmail = (email) => {
    return users.find(u => u.email === email);
  };

  const getBrandProducts = (brandName) => {
    return products.filter(p => p.brand === brandName);
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
    const brandProducts = editingBrand ? getBrandProducts(editingBrand.name) : [];
    const activeProducts = brandProducts.filter(p => p.status === 'active');
    const inactiveProducts = brandProducts.filter(p => p.status === 'inactive');
    const totalRevenue = brandProducts.reduce((sum, p) => sum + (p.sale_price || 0), 0);
    const avgMargin = brandProducts.length > 0 
      ? brandProducts.reduce((sum, p) => sum + (p.margin_percent || 0), 0) / brandProducts.length 
      : 0;

    return (
      <div className="h-full flex flex-col bg-white rounded-3xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-semibold text-lg">
            {editingBrand ? 'Editar Marca' : 'Nova Marca'}
          </h3>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                localStorage.removeItem(`${moduleId}_showForm`);
                localStorage.removeItem(`${moduleId}_editingBrand`);
                localStorage.removeItem(`${moduleId}_activeTab`);
                localStorage.removeItem(`${moduleId}_formData`);
                
                setShowForm(false);
                setEditingBrand(null);
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
              <TabsList className="grid w-full grid-cols-7 rounded-2xl">
                <TabsTrigger value="basic" className="rounded-xl">Identificação</TabsTrigger>
                <TabsTrigger value="visual" className="rounded-xl">Visual</TabsTrigger>
                <TabsTrigger value="manufacturer" className="rounded-xl">Fabricante</TabsTrigger>
                <TabsTrigger value="positioning" className="rounded-xl">Posicionamento</TabsTrigger>
                <TabsTrigger value="products" className="rounded-xl">Produtos</TabsTrigger>
                <TabsTrigger value="docs" className="rounded-xl">Documentos</TabsTrigger>
                <TabsTrigger value="audit" className="rounded-xl">Auditoria</TabsTrigger>
              </TabsList>

              {/* Aba 1: Identificação */}
              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Código Interno</Label>
                    <Input
                      value={formData.internal_code}
                      onChange={(e) => handleInputChange('internal_code', e.target.value)}
                      placeholder="Ex: MRC001"
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Tipo de Marca</Label>
                    <Select value={formData.brand_type} onValueChange={(v) => handleInputChange('brand_type', v)}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        <SelectItem value="own" className="rounded-lg">Própria</SelectItem>
                        <SelectItem value="national" className="rounded-lg">Nacional</SelectItem>
                        <SelectItem value="imported" className="rounded-lg">Importada</SelectItem>
                        <SelectItem value="white_label" className="rounded-lg">White Label</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label>Nome da Marca *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Ex: Nike, Apple, Samsung..."
                      className="rounded-xl"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Nome Curto</Label>
                    <Input
                      value={formData.short_name}
                      onChange={(e) => handleInputChange('short_name', e.target.value)}
                      placeholder="Nome abreviado"
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
                        <SelectItem value="active" className="rounded-lg">Ativa</SelectItem>
                        <SelectItem value="inactive" className="rounded-lg">Inativa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              {/* Aba 2: Identidade Visual */}
              <TabsContent value="visual" className="space-y-4 mt-4">
                <ImageInput
                  value={formData.logo_url}
                  onChange={(v) => handleInputChange('logo_url', v)}
                  label="Logotipo da Marca"
                />
                <ImageInput
                  value={formData.institutional_image_url}
                  onChange={(v) => handleInputChange('institutional_image_url', v)}
                  label="Imagem Institucional"
                />
                <div>
                  <Label>Slogan</Label>
                  <Input
                    value={formData.slogan}
                    onChange={(e) => handleInputChange('slogan', e.target.value)}
                    placeholder="Ex: Just Do It"
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <Label>Cores da Marca (separadas por vírgula)</Label>
                  <Input
                    value={formData.brand_colors?.join(', ') || ''}
                    onChange={(e) => handleInputChange('brand_colors', e.target.value.split(',').map(c => c.trim()).filter(Boolean))}
                    placeholder="Ex: #FF0000, #0000FF"
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <Label>Contextos de Uso</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {['pdv', 'reports', 'catalog', 'ecommerce'].map((context) => (
                      <label key={context} className="flex items-center gap-2 p-3 border rounded-xl hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.usage_contexts?.includes(context)}
                          onChange={(e) => {
                            const contexts = e.target.checked
                              ? [...(formData.usage_contexts || []), context]
                              : formData.usage_contexts?.filter(c => c !== context) || [];
                            handleInputChange('usage_contexts', contexts);
                          }}
                          className="rounded"
                        />
                        <span className="text-sm capitalize">{
                          context === 'pdv' ? 'PDV' :
                          context === 'reports' ? 'Relatórios' :
                          context === 'catalog' ? 'Catálogo' :
                          'E-commerce'
                        }</span>
                      </label>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Aba 3: Fabricante & Origem */}
              <TabsContent value="manufacturer" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Fabricante Responsável</Label>
                    <Input
                      value={formData.manufacturer}
                      onChange={(e) => handleInputChange('manufacturer', e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>País de Origem</Label>
                    <Input
                      value={formData.country_origin}
                      onChange={(e) => handleInputChange('country_origin', e.target.value)}
                      placeholder="Ex: Brasil, China, EUA"
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Ano de Fundação</Label>
                    <Input
                      type="number"
                      value={formData.foundation_year || ''}
                      onChange={(e) => handleInputChange('foundation_year', e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="Ex: 1995"
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Site Oficial</Label>
                    <Input
                      value={formData.website}
                      onChange={(e) => handleInputChange('website', e.target.value)}
                      placeholder="https://..."
                      className="rounded-xl"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Aba 4: Classificação & Posicionamento */}
              <TabsContent value="positioning" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Segmento</Label>
                    <Input
                      value={formData.segment}
                      onChange={(e) => handleInputChange('segment', e.target.value)}
                      placeholder="Ex: Eletrônicos, Moda, Alimentos"
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Posicionamento</Label>
                    <Select value={formData.positioning} onValueChange={(v) => handleInputChange('positioning', v)}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        <SelectItem value="premium" className="rounded-lg">Premium</SelectItem>
                        <SelectItem value="intermediate" className="rounded-lg">Intermediário</SelectItem>
                        <SelectItem value="popular" className="rounded-lg">Popular</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label>Público-Alvo</Label>
                    <Textarea
                      value={formData.target_audience}
                      onChange={(e) => handleInputChange('target_audience', e.target.value)}
                      rows={2}
                      placeholder="Ex: Jovens adultos, 18-35 anos, classe B e C"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Tags (separadas por vírgula)</Label>
                    <Input
                      value={formData.tags?.join(', ') || ''}
                      onChange={(e) => handleInputChange('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                      placeholder="Ex: luxo, profissional, entrada"
                      className="rounded-xl"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Aba 5: Produtos Associados */}
              <TabsContent value="products" className="space-y-4 mt-4">
                {editingBrand ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 border rounded-xl bg-blue-50">
                        <div className="text-sm text-gray-600 mb-1">Total de Produtos</div>
                        <div className="text-2xl font-bold text-blue-900">{brandProducts.length}</div>
                      </div>
                      <div className="p-4 border rounded-xl bg-green-50">
                        <div className="text-sm text-gray-600 mb-1">Produtos Ativos</div>
                        <div className="text-2xl font-bold text-green-900">{activeProducts.length}</div>
                      </div>
                      <div className="p-4 border rounded-xl bg-gray-50">
                        <div className="text-sm text-gray-600 mb-1">Produtos Inativos</div>
                        <div className="text-2xl font-bold text-gray-900">{inactiveProducts.length}</div>
                      </div>
                      <div className="p-4 border rounded-xl bg-purple-50">
                        <div className="text-sm text-gray-600 mb-1">Margem Média</div>
                        <div className="text-2xl font-bold text-purple-900">{avgMargin.toFixed(1)}%</div>
                      </div>
                    </div>
                    {brandProducts.length > 0 && (
                      <div className="border rounded-2xl overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>SKU</TableHead>
                              <TableHead>Produto</TableHead>
                              <TableHead>Preço</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {brandProducts.slice(0, 10).map((product) => (
                              <TableRow key={product.id}>
                                <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                                <TableCell>{product.name}</TableCell>
                                <TableCell>R$ {product.sale_price?.toFixed(2) || '0.00'}</TableCell>
                                <TableCell>
                                  <Badge variant={product.status === 'active' ? 'default' : 'secondary'} className="rounded-full">
                                    {product.status === 'active' ? 'Ativo' : 'Inativo'}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        {brandProducts.length > 10 && (
                          <div className="p-3 text-center text-sm text-gray-500 border-t">
                            E mais {brandProducts.length - 10} produto{brandProducts.length - 10 !== 1 ? 's' : ''}...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>Produtos associados disponíveis após salvar a marca</p>
                  </div>
                )}
              </TabsContent>

              {/* Aba 6: Observações & Documentos */}
              <TabsContent value="docs" className="space-y-4 mt-4">
                <div>
                  <Label>Observações Internas</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    rows={3}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <Label>Contratos & Autorizações de Uso</Label>
                  <Textarea
                    value={formData.contracts}
                    onChange={(e) => handleInputChange('contracts', e.target.value)}
                    rows={3}
                    placeholder="Informações sobre contratos, autorizações..."
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <Label>Certificações</Label>
                  <Textarea
                    value={formData.certifications}
                    onChange={(e) => handleInputChange('certifications', e.target.value)}
                    rows={3}
                    placeholder="ISO, certificações de qualidade..."
                    className="rounded-xl"
                  />
                </div>
              </TabsContent>

              {/* Aba 7: Controle & Auditoria */}
              <TabsContent value="audit" className="space-y-4 mt-4">
                {editingBrand ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Data de Criação</Label>
                      <Input
                        value={new Date(new Date(editingBrand.created_date).getTime() - 3 * 60 * 60 * 1000).toLocaleString('pt-BR')}
                        disabled
                        className="bg-gray-50 rounded-xl"
                      />
                    </div>
                    <div>
                      <Label>Criado Por</Label>
                      <div className="flex items-center gap-2 p-2 border rounded-xl bg-gray-50">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={getUserByEmail(editingBrand.created_by)?.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {editingBrand.created_by?.split('@')[0]?.slice(0, 2).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{editingBrand.created_by || '-'}</span>
                      </div>
                    </div>
                    <div>
                      <Label>Última Alteração</Label>
                      <Input
                        value={new Date(new Date(editingBrand.updated_date).getTime() - 3 * 60 * 60 * 1000).toLocaleString('pt-BR')}
                        disabled
                        className="bg-gray-50 rounded-xl"
                      />
                    </div>
                    <div>
                      <Label>Alterado Por</Label>
                      <div className="flex items-center gap-2 p-2 border rounded-xl bg-gray-50">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={getUserByEmail(editingBrand.created_by)?.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {editingBrand.created_by?.split('@')[0]?.slice(0, 2).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{editingBrand.created_by || '-'}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>Dados de auditoria disponíveis após salvar a marca</p>
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
          <h2 className="text-xl font-semibold">Cadastro de Marcas</h2>
          <p className="text-sm text-gray-500 mt-1">
            {filteredBrands.length} marca{filteredBrands.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button 
          onClick={() => setShowForm(true)}
          className="transition-all active:scale-95 rounded-xl"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Marca
        </Button>
      </div>

      <div className="px-6 py-4 border-b bg-white">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar por nome ou código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 bg-gray-50">
        <div className="p-6">
          {filteredBrands.length === 0 ? (
            <div className="text-center py-12">
              <Tags className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500">Nenhuma marca cadastrada</p>
              <Button 
                variant="link" 
                onClick={() => setShowForm(true)}
                className="transition-all active:scale-95"
              >
                Cadastrar primeira marca
              </Button>
            </div>
          ) : (
            <div className="border rounded-2xl overflow-hidden bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Logo</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Produtos</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBrands.map((brand) => {
                    const brandProducts = getBrandProducts(brand.name);
                    return (
                      <TableRow key={brand.id}>
                        <TableCell>
                          {brand.logo_url ? (
                            <img
                              src={brand.logo_url}
                              alt={brand.name}
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                              <Tags className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{brand.internal_code || '-'}</TableCell>
                        <TableCell className="font-medium">{brand.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="rounded-full">
                            {brand.brand_type === 'own' ? 'Própria' :
                             brand.brand_type === 'national' ? 'Nacional' :
                             brand.brand_type === 'imported' ? 'Importada' :
                             'White Label'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={brand.status === 'active' ? 'default' : 'secondary'}
                            className="rounded-full"
                          >
                            {brand.status === 'active' ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">{brandProducts.length}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(brand)}
                              className="transition-all active:scale-95 rounded-lg"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(brand.id)}
                              className="transition-all active:scale-95 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}