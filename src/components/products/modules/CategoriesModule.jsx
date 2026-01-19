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
  FolderTree,
  Save,
  X
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function CategoriesModule() {
  const moduleId = 'categories';
  
  const [user, setUser] = useState(null);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [showForm, setShowForm] = useState(() => {
    const saved = localStorage.getItem(`${moduleId}_showForm`);
    return saved === 'true';
  });
  const [editingCategory, setEditingCategory] = useState(() => {
    const saved = localStorage.getItem(`${moduleId}_editingCategory`);
    return saved ? JSON.parse(saved) : null;
  });
  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem(`${moduleId}_activeTab`);
    return saved || "structure";
  });
  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem(`${moduleId}_formData`);
    return saved ? JSON.parse(saved) : getEmptyFormData();
  });

  function getEmptyFormData() {
    return {
      code: "",
      name: "",
      parent_category_id: "",
      level: "category",
      display_order: 0,
      status: "active",
      product_type: "resale",
      controls_inventory_default: true,
      allows_sale_without_stock: false,
      allows_discount: true,
      max_discount_default: 0,
      commission_default: 0,
      ncm_default: "",
      cfop_in_default: "",
      cfop_out_default: "",
      cst_csosn_default: "",
      icms_rate_default: 0,
      ipi_rate_default: 0,
      pis_rate_default: 0,
      cofins_rate_default: 0,
      unit_measure_default: "UN",
      min_stock_default: 0,
      is_perishable_default: false,
      shelf_life_days_default: null,
      requires_batch: false,
      requires_serial: false,
      segment: "",
      product_line: "",
      tags: [],
      notes: "",
      special_rules: "",
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
    localStorage.setItem(`${moduleId}_editingCategory`, JSON.stringify(editingCategory));
  }, [editingCategory]);

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

      const [allCategories, allUsers, allProducts] = await Promise.all([
        base44.entities.ProductCategory.filter({
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

      setCategories(allCategories || []);
      setUsers(allUsers || []);
      setProducts(allProducts || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      setCategories([]);
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
      const categoryData = {
        ...formData,
        company_id: user.company_id
      };

      if (editingCategory) {
        await base44.entities.ProductCategory.update(editingCategory.id, categoryData);
      } else {
        await base44.entities.ProductCategory.create(categoryData);
      }

      await loadData();
      
      localStorage.removeItem(`${moduleId}_showForm`);
      localStorage.removeItem(`${moduleId}_editingCategory`);
      localStorage.removeItem(`${moduleId}_activeTab`);
      localStorage.removeItem(`${moduleId}_formData`);
      
      setShowForm(false);
      setEditingCategory(null);
      setFormData(getEmptyFormData());
    } catch (error) {
      console.error("Erro ao salvar categoria:", error);
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({ ...getEmptyFormData(), ...category });
    setShowForm(true);
  };

  const handleDelete = async (categoryId) => {
    if (window.confirm("Deseja realmente excluir esta categoria?")) {
      try {
        await base44.entities.ProductCategory.update(categoryId, { is_active: false, status: 'inactive' });
        await loadData();
      } catch (error) {
        console.error("Erro ao excluir categoria:", error);
      }
    }
  };

  const filteredCategories = categories.filter(cat =>
    cat.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cat.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getUserByEmail = (email) => {
    return users.find(u => u.email === email);
  };

  const getCategoryProducts = (categoryName) => {
    return products.filter(p => p.category === categoryName);
  };

  const parentCategories = categories.filter(c => c.level === 'category' || !c.level);

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
    const categoryProducts = editingCategory ? getCategoryProducts(editingCategory.name) : [];
    const activeProducts = categoryProducts.filter(p => p.status === 'active');
    const inactiveProducts = categoryProducts.filter(p => p.status === 'inactive');
    const avgMargin = categoryProducts.length > 0 
      ? categoryProducts.reduce((sum, p) => sum + (p.margin_percent || 0), 0) / categoryProducts.length 
      : 0;

    return (
      <div className="h-full flex flex-col bg-white rounded-3xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-semibold text-lg">
            {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
          </h3>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                localStorage.removeItem(`${moduleId}_showForm`);
                localStorage.removeItem(`${moduleId}_editingCategory`);
                localStorage.removeItem(`${moduleId}_activeTab`);
                localStorage.removeItem(`${moduleId}_formData`);
                
                setShowForm(false);
                setEditingCategory(null);
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
              <TabsList className="grid w-full grid-cols-4 rounded-2xl mb-2">
                <TabsTrigger value="structure" className="rounded-xl">Estrutura</TabsTrigger>
                <TabsTrigger value="business" className="rounded-xl">Negócio</TabsTrigger>
                <TabsTrigger value="fiscal" className="rounded-xl">Fiscal</TabsTrigger>
                <TabsTrigger value="logistics" className="rounded-xl">Logística</TabsTrigger>
              </TabsList>
              <TabsList className="grid w-full grid-cols-4 rounded-2xl">
                <TabsTrigger value="tags" className="rounded-xl">Classificação</TabsTrigger>
                <TabsTrigger value="products" className="rounded-xl">Produtos</TabsTrigger>
                <TabsTrigger value="notes" className="rounded-xl">Observações</TabsTrigger>
                <TabsTrigger value="audit" className="rounded-xl">Auditoria</TabsTrigger>
              </TabsList>

              {/* Aba 1: Estrutura */}
              <TabsContent value="structure" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Código da Categoria</Label>
                    <Input
                      value={formData.code}
                      onChange={(e) => handleInputChange('code', e.target.value)}
                      placeholder="Ex: CAT001"
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Ordem de Exibição</Label>
                    <Input
                      type="number"
                      value={formData.display_order}
                      onChange={(e) => handleInputChange('display_order', parseInt(e.target.value) || 0)}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Nome da Categoria *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Ex: Eletrônicos, Alimentos, Roupas"
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Categoria Pai</Label>
                    <Select value={formData.parent_category_id || 'none'} onValueChange={(v) => handleInputChange('parent_category_id', v === 'none' ? '' : v)}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Nenhuma (categoria raiz)" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        <SelectItem value="none" className="rounded-lg">Nenhuma (categoria raiz)</SelectItem>
                        {parentCategories.map(c => (
                          <SelectItem key={c.id} value={c.id} className="rounded-lg">{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Nível</Label>
                    <Select value={formData.level} onValueChange={(v) => handleInputChange('level', v)}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        <SelectItem value="category" className="rounded-lg">Categoria</SelectItem>
                        <SelectItem value="subcategory" className="rounded-lg">Subcategoria</SelectItem>
                        <SelectItem value="sublevel" className="rounded-lg">Subnível</SelectItem>
                      </SelectContent>
                    </Select>
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

              {/* Aba 2: Configurações de Negócio */}
              <TabsContent value="business" className="space-y-4 mt-4">
                <div>
                  <Label>Tipo de Produto</Label>
                  <Select value={formData.product_type} onValueChange={(v) => handleInputChange('product_type', v)}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="resale" className="rounded-lg">Revenda</SelectItem>
                      <SelectItem value="production" className="rounded-lg">Produção Própria</SelectItem>
                      <SelectItem value="service" className="rounded-lg">Serviço</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-xl">
                  <Label>Controla Estoque por Padrão?</Label>
                  <Switch
                    checked={formData.controls_inventory_default}
                    onCheckedChange={(v) => handleInputChange('controls_inventory_default', v)}
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-xl">
                  <Label>Permite Venda sem Estoque?</Label>
                  <Switch
                    checked={formData.allows_sale_without_stock}
                    onCheckedChange={(v) => handleInputChange('allows_sale_without_stock', v)}
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-xl">
                  <Label>Permite Desconto?</Label>
                  <Switch
                    checked={formData.allows_discount}
                    onCheckedChange={(v) => handleInputChange('allows_discount', v)}
                  />
                </div>
                {formData.allows_discount && (
                  <div>
                    <Label>Desconto Máximo Padrão (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.max_discount_default}
                      onChange={(e) => handleInputChange('max_discount_default', parseFloat(e.target.value) || 0)}
                      className="rounded-xl"
                    />
                  </div>
                )}
                <div>
                  <Label>Comissão Padrão (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.commission_default}
                    onChange={(e) => handleInputChange('commission_default', parseFloat(e.target.value) || 0)}
                    className="rounded-xl"
                  />
                </div>
              </TabsContent>

              {/* Aba 3: Fiscal & Tributário */}
              <TabsContent value="fiscal" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>NCM Padrão</Label>
                    <Input
                      value={formData.ncm_default}
                      onChange={(e) => handleInputChange('ncm_default', e.target.value)}
                      placeholder="0000.00.00"
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>CST/CSOSN Padrão</Label>
                    <Input
                      value={formData.cst_csosn_default}
                      onChange={(e) => handleInputChange('cst_csosn_default', e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>CFOP Entrada Padrão</Label>
                    <Input
                      value={formData.cfop_in_default}
                      onChange={(e) => handleInputChange('cfop_in_default', e.target.value)}
                      placeholder="0.000"
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>CFOP Saída Padrão</Label>
                    <Input
                      value={formData.cfop_out_default}
                      onChange={(e) => handleInputChange('cfop_out_default', e.target.value)}
                      placeholder="0.000"
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Alíquota ICMS Padrão (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.icms_rate_default}
                      onChange={(e) => handleInputChange('icms_rate_default', parseFloat(e.target.value) || 0)}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Alíquota IPI Padrão (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.ipi_rate_default}
                      onChange={(e) => handleInputChange('ipi_rate_default', parseFloat(e.target.value) || 0)}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Alíquota PIS Padrão (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.pis_rate_default}
                      onChange={(e) => handleInputChange('pis_rate_default', parseFloat(e.target.value) || 0)}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Alíquota COFINS Padrão (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.cofins_rate_default}
                      onChange={(e) => handleInputChange('cofins_rate_default', parseFloat(e.target.value) || 0)}
                      className="rounded-xl"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Aba 4: Logística & Estoque */}
              <TabsContent value="logistics" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Unidade de Medida Padrão</Label>
                    <Select value={formData.unit_measure_default} onValueChange={(v) => handleInputChange('unit_measure_default', v)}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        <SelectItem value="UN" className="rounded-lg">Unidade (UN)</SelectItem>
                        <SelectItem value="KG" className="rounded-lg">Quilograma (KG)</SelectItem>
                        <SelectItem value="LT" className="rounded-lg">Litro (LT)</SelectItem>
                        <SelectItem value="CX" className="rounded-lg">Caixa (CX)</SelectItem>
                        <SelectItem value="MT" className="rounded-lg">Metro (MT)</SelectItem>
                        <SelectItem value="M2" className="rounded-lg">Metro Quadrado (M²)</SelectItem>
                        <SelectItem value="M3" className="rounded-lg">Metro Cúbico (M³)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Estoque Mínimo Padrão</Label>
                    <Input
                      type="number"
                      value={formData.min_stock_default}
                      onChange={(e) => handleInputChange('min_stock_default', parseFloat(e.target.value) || 0)}
                      className="rounded-xl"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-xl">
                  <Label>Perecível por Padrão?</Label>
                  <Switch
                    checked={formData.is_perishable_default}
                    onCheckedChange={(v) => handleInputChange('is_perishable_default', v)}
                  />
                </div>
                {formData.is_perishable_default && (
                  <div>
                    <Label>Validade Padrão (dias)</Label>
                    <Input
                      type="number"
                      value={formData.shelf_life_days_default || ''}
                      onChange={(e) => handleInputChange('shelf_life_days_default', e.target.value ? parseInt(e.target.value) : null)}
                      className="rounded-xl"
                    />
                  </div>
                )}
                <div className="flex items-center justify-between p-4 border rounded-xl">
                  <Label>Exige Lote?</Label>
                  <Switch
                    checked={formData.requires_batch}
                    onCheckedChange={(v) => handleInputChange('requires_batch', v)}
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-xl">
                  <Label>Exige Série?</Label>
                  <Switch
                    checked={formData.requires_serial}
                    onCheckedChange={(v) => handleInputChange('requires_serial', v)}
                  />
                </div>
              </TabsContent>

              {/* Aba 5: Classificação & Tags */}
              <TabsContent value="tags" className="space-y-4 mt-4">
                <div>
                  <Label>Segmento</Label>
                  <Input
                    value={formData.segment}
                    onChange={(e) => handleInputChange('segment', e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <Label>Linha de Produto</Label>
                  <Input
                    value={formData.product_line}
                    onChange={(e) => handleInputChange('product_line', e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <Label>Tags (separadas por vírgula)</Label>
                  <Input
                    value={formData.tags?.join(', ') || ''}
                    onChange={(e) => handleInputChange('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                    placeholder="Ex: eletrônicos, smartphones, tecnologia"
                    className="rounded-xl"
                  />
                </div>
              </TabsContent>

              {/* Aba 6: Produtos Vinculados */}
              <TabsContent value="products" className="space-y-4 mt-4">
                {editingCategory ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 border rounded-xl bg-blue-50">
                        <div className="text-sm text-gray-600 mb-1">Total de Produtos</div>
                        <div className="text-2xl font-bold text-blue-900">{categoryProducts.length}</div>
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
                    {categoryProducts.length > 0 && (
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
                            {categoryProducts.slice(0, 10).map((product) => (
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
                        {categoryProducts.length > 10 && (
                          <div className="p-3 text-center text-sm text-gray-500 border-t">
                            E mais {categoryProducts.length - 10} produto{categoryProducts.length - 10 !== 1 ? 's' : ''}...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>Produtos associados disponíveis após salvar a categoria</p>
                  </div>
                )}
              </TabsContent>

              {/* Aba 7: Observações */}
              <TabsContent value="notes" className="space-y-4 mt-4">
                <div>
                  <Label>Observações Internas</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    rows={4}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <Label>Regras Especiais</Label>
                  <Textarea
                    value={formData.special_rules}
                    onChange={(e) => handleInputChange('special_rules', e.target.value)}
                    rows={4}
                    placeholder="Regras específicas para produtos desta categoria"
                    className="rounded-xl"
                  />
                </div>
              </TabsContent>

              {/* Aba 8: Auditoria */}
              <TabsContent value="audit" className="space-y-4 mt-4">
                {editingCategory ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Data de Criação</Label>
                      <Input
                        value={new Date(new Date(editingCategory.created_date).getTime() - 3 * 60 * 60 * 1000).toLocaleString('pt-BR')}
                        disabled
                        className="bg-gray-50 rounded-xl"
                      />
                    </div>
                    <div>
                      <Label>Criado Por</Label>
                      <div className="flex items-center gap-2 p-2 border rounded-xl bg-gray-50">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={getUserByEmail(editingCategory.created_by)?.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {editingCategory.created_by?.split('@')[0]?.slice(0, 2).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{editingCategory.created_by || '-'}</span>
                      </div>
                    </div>
                    <div>
                      <Label>Última Alteração</Label>
                      <Input
                        value={new Date(new Date(editingCategory.updated_date).getTime() - 3 * 60 * 60 * 1000).toLocaleString('pt-BR')}
                        disabled
                        className="bg-gray-50 rounded-xl"
                      />
                    </div>
                    <div>
                      <Label>Alterado Por</Label>
                      <div className="flex items-center gap-2 p-2 border rounded-xl bg-gray-50">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={getUserByEmail(editingCategory.created_by)?.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {editingCategory.created_by?.split('@')[0]?.slice(0, 2).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{editingCategory.created_by || '-'}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>Dados de auditoria disponíveis após salvar a categoria</p>
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
          <h2 className="text-xl font-semibold">Categorias & Subcategorias</h2>
          <p className="text-sm text-gray-500 mt-1">
            {filteredCategories.length} categoria{filteredCategories.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button 
          onClick={() => setShowForm(true)}
          className="transition-all active:scale-95 rounded-xl"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Categoria
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
          {filteredCategories.length === 0 ? (
            <div className="text-center py-12">
              <FolderTree className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500">Nenhuma categoria cadastrada</p>
              <Button 
                variant="link" 
                onClick={() => setShowForm(true)}
                className="transition-all active:scale-95"
              >
                Cadastrar primeira categoria
              </Button>
            </div>
          ) : (
            <div className="border rounded-2xl overflow-hidden bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Nível</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Produtos</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCategories.map((category) => {
                    const categoryProducts = getCategoryProducts(category.name);
                    return (
                      <TableRow key={category.id}>
                        <TableCell className="font-mono text-sm">{category.code || '-'}</TableCell>
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="rounded-full">
                            {category.level === 'category' ? 'Categoria' :
                             category.level === 'subcategory' ? 'Subcategoria' :
                             'Subnível'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="rounded-full">
                            {category.product_type === 'resale' ? 'Revenda' :
                             category.product_type === 'production' ? 'Produção' :
                             'Serviço'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={category.status === 'active' ? 'default' : 'secondary'}
                            className="rounded-full"
                          >
                            {category.status === 'active' ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">{categoryProducts.length}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(category)}
                              className="transition-all active:scale-95 rounded-lg"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(category.id)}
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