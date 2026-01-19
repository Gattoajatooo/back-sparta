import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Package,
  Save,
  X
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import CreateableSelect from '../CreateableSelect';
import { ImageInput, VideoInput } from '../MediaInput';

export default function ProductsModule() {
  const moduleId = 'products-catalog'; // ID único do módulo
  
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [productLines, setProductLines] = useState([]);
  const [segments, setSegments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState([]);
  
  // Carregar estado salvo do formulário
  const [showForm, setShowForm] = useState(() => {
    const saved = localStorage.getItem(`${moduleId}_showForm`);
    return saved === 'true';
  });
  const [editingProduct, setEditingProduct] = useState(() => {
    const saved = localStorage.getItem(`${moduleId}_editingProduct`);
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
      sku: "",
      ean: "",
      name: "",
      short_name: "",
      category: "",
      subcategory: "",
      brand: "",
      manufacturer_model: "",
      status: "active",
      main_image: "",
      gallery_images: [],
      video_url: "",
      manufacturer: "",
      country_origin: "",
      manufacturer_code: "",
      manufacturer_notes: "",
      controls_inventory: true,
      unit_measure: "UN",
      conversion_factor: 1,
      min_stock: 0,
      max_stock: null,
      default_location: "",
      gross_weight: null,
      net_weight: null,
      height: null,
      width: null,
      depth: null,
      is_perishable: false,
      shelf_life_days: null,
      cost_price: null,
      sale_price: null,
      margin_percent: null,
      commission_percent: 0,
      allows_discount: true,
      max_discount_percent: 0,
      is_on_promotion: false,
      promotion_price: null,
      promotion_start_date: "",
      promotion_end_date: "",
      ncm: "",
      cest: "",
      cfop_in: "",
      cfop_out: "",
      origin: "national",
      cst_csosn: "",
      icms_rate: 0,
      ipi_rate: 0,
      pis_rate: 0,
      cofins_rate: 0,
      suppliers: [],
      tags: [],
      product_line: "",
      segment: "",
      sales_channels: [],
      short_description: "",
      detailed_description: "",
      internal_notes: "",
      usage_instructions: "",
      warranty_info: ""
    };
  }

  useEffect(() => {
    loadData();
  }, []);

  // Salvar estado quando mudar
  useEffect(() => {
    localStorage.setItem(`${moduleId}_showForm`, showForm);
  }, [showForm]);

  useEffect(() => {
    localStorage.setItem(`${moduleId}_editingProduct`, JSON.stringify(editingProduct));
  }, [editingProduct]);

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

      const [allProducts, allCategories, allBrands, allLines, allSegments, allUsers] = await Promise.all([
        base44.entities.Product.filter({
          company_id: currentUser.company_id,
          is_deleted: { '$ne': true }
        }).catch(() => []),
        base44.entities.ProductCategory.filter({
          company_id: currentUser.company_id,
          is_active: true
        }).catch(() => []),
        base44.entities.ProductBrand.filter({
          company_id: currentUser.company_id,
          is_active: true
        }).catch(() => []),
        base44.entities.ProductLine.filter({
          company_id: currentUser.company_id,
          is_active: true
        }).catch(() => []),
        base44.entities.ProductSegment.filter({
          company_id: currentUser.company_id,
          is_active: true
        }).catch(() => []),
        base44.entities.User.filter({
          company_id: currentUser.company_id
        }).catch(() => [])
      ]);

      setProducts(allProducts || []);
      setCategories(allCategories || []);
      setBrands(allBrands || []);
      setProductLines(allLines || []);
      setSegments(allSegments || []);
      setUsers(allUsers || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      setProducts([]);
      setCategories([]);
      setBrands([]);
      setProductLines([]);
      setSegments([]);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };

      // Limpar subcategoria se categoria mudar
      if (field === 'category') {
        updated.subcategory = "";
      }

      // Calcular margem considerando custo, comissão e preço de venda
      if (field === 'cost_price' || field === 'sale_price' || field === 'commission_percent') {
        const cost = field === 'cost_price' ? value : prev.cost_price;
        const sale = field === 'sale_price' ? value : prev.sale_price;
        const commission = field === 'commission_percent' ? value : prev.commission_percent;
        
        // Se produto em promoção e promoção vigente, usar preço promocional
        let effectivePrice = sale;
        if (prev.is_on_promotion && prev.promotion_price) {
          const now = new Date();
          const start = prev.promotion_start_date ? new Date(prev.promotion_start_date) : null;
          const end = prev.promotion_end_date ? new Date(prev.promotion_end_date) : null;
          
          if ((!start || now >= start) && (!end || now <= end)) {
            effectivePrice = prev.promotion_price;
          }
        }
        
        if (cost && effectivePrice && cost > 0) {
          const commissionValue = cost * (commission / 100);
          const totalCost = cost + commissionValue;
          updated.margin_percent = parseFloat(((effectivePrice - totalCost) / totalCost * 100).toFixed(2));
        }
      }

      return updated;
    });
  };

  const handleCreateCategory = async (name) => {
    try {
      const newCategory = await base44.entities.ProductCategory.create({
        company_id: user.company_id,
        name,
        subcategories: [],
        is_active: true
      });
      setCategories(prev => [...prev, newCategory]);
    } catch (error) {
      console.error("Erro ao criar categoria:", error);
      throw error;
    }
  };

  const handleCreateSubcategory = async (name) => {
    try {
      const category = categories.find(c => c.name === formData.category);
      if (!category) return;

      const updatedSubcategories = [...(category.subcategories || []), name];
      await base44.entities.ProductCategory.update(category.id, {
        subcategories: updatedSubcategories
      });

      setCategories(prev => prev.map(c => 
        c.id === category.id ? { ...c, subcategories: updatedSubcategories } : c
      ));
    } catch (error) {
      console.error("Erro ao criar subcategoria:", error);
      throw error;
    }
  };

  const handleCreateBrand = async (name) => {
    try {
      const newBrand = await base44.entities.ProductBrand.create({
        company_id: user.company_id,
        name,
        is_active: true
      });
      setBrands(prev => [...prev, newBrand]);
      return newBrand.name;
    } catch (error) {
      console.error("Erro ao criar marca:", error);
      throw error;
    }
  };

  const handleCreateManufacturer = async (name) => {
    // Por enquanto apenas retorna o nome, sem entidade específica
    return name;
  };

  const handleCreateProductLine = async (name) => {
    try {
      const newLine = await base44.entities.ProductLine.create({
        company_id: user.company_id,
        name,
        is_active: true
      });
      setProductLines(prev => [...prev, newLine]);
    } catch (error) {
      console.error("Erro ao criar linha de produto:", error);
      throw error;
    }
  };

  const handleCreateSegment = async (name) => {
    try {
      const newSegment = await base44.entities.ProductSegment.create({
        company_id: user.company_id,
        name,
        is_active: true
      });
      setSegments(prev => [...prev, newSegment]);
    } catch (error) {
      console.error("Erro ao criar segmento:", error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    try {
      const productData = {
        ...formData,
        company_id: user.company_id,
        price_history: editingProduct?.price_history || [],
        change_log: editingProduct?.change_log || []
      };

      // Adicionar ao histórico de preços se mudou
      if (editingProduct && 
          (editingProduct.cost_price !== formData.cost_price || 
           editingProduct.sale_price !== formData.sale_price)) {
        productData.price_history = [
          ...(editingProduct.price_history || []),
          {
            date: new Date().toISOString(),
            cost_price: formData.cost_price,
            sale_price: formData.sale_price,
            changed_by: user.email
          }
        ];
      }

      if (editingProduct) {
        await base44.entities.Product.update(editingProduct.id, productData);
      } else {
        await base44.entities.Product.create(productData);
      }

      await loadData();
      
      // Limpar localStorage após salvar
      localStorage.removeItem(`${moduleId}_showForm`);
      localStorage.removeItem(`${moduleId}_editingProduct`);
      localStorage.removeItem(`${moduleId}_activeTab`);
      localStorage.removeItem(`${moduleId}_formData`);
      
      setShowForm(false);
      setEditingProduct(null);
      setFormData(getEmptyFormData());
    } catch (error) {
      console.error("Erro ao salvar produto:", error);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({ ...getEmptyFormData(), ...product });
    setShowForm(true);
  };

  const handleDelete = async (productId) => {
    if (window.confirm("Deseja realmente excluir este produto?")) {
      try {
        await base44.entities.Product.update(productId, { is_deleted: true });
        await loadData();
      } catch (error) {
        console.error("Erro ao excluir produto:", error);
      }
    }
  };

  const filteredProducts = products.filter(product =>
    product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.ean?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedCategory = categories.find(c => c.name === formData.category);
  const subcategoryOptions = selectedCategory?.subcategories?.map(sub => ({
    value: sub,
    label: sub
  })) || [];

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
          <p className="text-gray-500">Carregando...</p>
        </div>
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="h-full flex flex-col bg-white rounded-3xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-semibold text-lg">
            {editingProduct ? 'Editar Produto' : 'Novo Produto'}
          </h3>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                // Limpar localStorage ao cancelar
                localStorage.removeItem(`${moduleId}_showForm`);
                localStorage.removeItem(`${moduleId}_editingProduct`);
                localStorage.removeItem(`${moduleId}_activeTab`);
                localStorage.removeItem(`${moduleId}_formData`);
                
                setShowForm(false);
                setEditingProduct(null);
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
              <TabsList className="grid w-full grid-cols-4 rounded-2xl">
                <TabsTrigger value="basic" className="rounded-xl">Identificação</TabsTrigger>
                <TabsTrigger value="media" className="rounded-xl">Imagens</TabsTrigger>
                <TabsTrigger value="manufacturer" className="rounded-xl">Fabricante</TabsTrigger>
                <TabsTrigger value="fiscal" className="rounded-xl">Fiscal</TabsTrigger>
              </TabsList>

              <TabsList className="grid w-full grid-cols-4 mt-2 rounded-2xl">
                <TabsTrigger value="suppliers" className="rounded-xl">Fornecedores</TabsTrigger>
                <TabsTrigger value="tags" className="rounded-xl">Classificações</TabsTrigger>
                <TabsTrigger value="description" className="rounded-xl">Descrição</TabsTrigger>
                <TabsTrigger value="audit" className="rounded-xl">Auditoria</TabsTrigger>
              </TabsList>

              {/* Aba 1: Identificação Básica */}
              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>SKU</Label>
                    <Input
                      value={formData.sku}
                      onChange={(e) => handleInputChange('sku', e.target.value)}
                      placeholder="Código único do produto"
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>EAN / Código de Barras</Label>
                    <Input
                      value={formData.ean}
                      onChange={(e) => handleInputChange('ean', e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Nome do Produto *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Nome Curto (PDV/Etiquetas)</Label>
                    <Input
                      value={formData.short_name}
                      onChange={(e) => handleInputChange('short_name', e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Categoria</Label>
                    <CreateableSelect
                      value={formData.category}
                      onChange={(v) => handleInputChange('category', v)}
                      options={categories.map(c => ({ value: c.name, label: c.name }))}
                      onCreate={handleCreateCategory}
                      placeholder="Selecione ou crie uma categoria"
                      createTitle="Nova Categoria"
                      createPlaceholder="Nome da categoria"
                    />
                  </div>
                  <div>
                    <Label>Subcategoria</Label>
                    <CreateableSelect
                      value={formData.subcategory}
                      onChange={(v) => handleInputChange('subcategory', v)}
                      options={subcategoryOptions}
                      onCreate={handleCreateSubcategory}
                      placeholder="Selecione ou crie uma subcategoria"
                      createTitle="Nova Subcategoria"
                      createPlaceholder="Nome da subcategoria"
                      disabled={!formData.category}
                    />
                  </div>
                  <div>
                    <Label>Marca</Label>
                    <CreateableSelect
                      value={formData.brand}
                      onChange={(v) => handleInputChange('brand', v)}
                      options={brands.map(b => ({ value: b.name, label: b.name }))}
                      onCreate={handleCreateBrand}
                      placeholder="Selecione ou crie uma marca"
                      createTitle="Nova Marca"
                      createPlaceholder="Nome da marca"
                    />
                  </div>
                  <div>
                    <Label>Modelo / Referência</Label>
                    <Input
                      value={formData.manufacturer_model}
                      onChange={(e) => handleInputChange('manufacturer_model', e.target.value)}
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
                        <SelectItem value="discontinued" className="rounded-lg">Em Descontinuação</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              {/* Aba 2: Imagens & Mídia */}
              <TabsContent value="media" className="space-y-4 mt-4">
                <ImageInput
                  value={formData.main_image}
                  onChange={(v) => handleInputChange('main_image', v)}
                  label="Imagem Principal"
                />
                <VideoInput
                  value={formData.video_url}
                  onChange={(v) => handleInputChange('video_url', v)}
                  label="Vídeo Demonstrativo"
                />
              </TabsContent>

              {/* Aba 3: Fabricante & Origem */}
              <TabsContent value="manufacturer" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Fabricante</Label>
                    <CreateableSelect
                      value={formData.manufacturer}
                      onChange={(v) => handleInputChange('manufacturer', v)}
                      options={[...new Set(products.map(p => p.manufacturer).filter(Boolean))].map(m => ({ value: m, label: m }))}
                      onCreate={handleCreateManufacturer}
                      placeholder="Selecione ou digite um fabricante"
                      createTitle="Novo Fabricante"
                      createPlaceholder="Nome do fabricante"
                    />
                  </div>
                  <div>
                    <Label>País de Origem</Label>
                    <Input
                      value={formData.country_origin}
                      onChange={(e) => handleInputChange('country_origin', e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Código do Produto no Fabricante</Label>
                    <Input
                      value={formData.manufacturer_code}
                      onChange={(e) => handleInputChange('manufacturer_code', e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Observações do Fabricante</Label>
                    <Textarea
                      value={formData.manufacturer_notes}
                      onChange={(e) => handleInputChange('manufacturer_notes', e.target.value)}
                      rows={3}
                      className="rounded-xl"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Aba 4: Estoque & Logística */}
              <TabsContent value="inventory" className="space-y-4 mt-4">
                <div className="flex items-center justify-between p-4 border rounded-xl">
                  <Label>Controla Estoque?</Label>
                  <Switch
                    checked={formData.controls_inventory}
                    onCheckedChange={(v) => handleInputChange('controls_inventory', v)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Unidade de Medida</Label>
                    <Select value={formData.unit_measure} onValueChange={(v) => handleInputChange('unit_measure', v)}>
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
                    <Label>Fator de Conversão</Label>
                    <Input
                      type="number"
                      value={formData.conversion_factor}
                      onChange={(e) => handleInputChange('conversion_factor', parseFloat(e.target.value))}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Estoque Mínimo</Label>
                    <Input
                      type="number"
                      value={formData.min_stock}
                      onChange={(e) => handleInputChange('min_stock', parseFloat(e.target.value))}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Estoque Máximo</Label>
                    <Input
                      type="number"
                      value={formData.max_stock || ''}
                      onChange={(e) => handleInputChange('max_stock', e.target.value ? parseFloat(e.target.value) : null)}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Localização Padrão</Label>
                    <Input
                      value={formData.default_location}
                      onChange={(e) => handleInputChange('default_location', e.target.value)}
                      placeholder="Ex: Corredor A, Prateleira 3"
                      className="rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Peso Bruto (kg)</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={formData.gross_weight || ''}
                      onChange={(e) => handleInputChange('gross_weight', e.target.value ? parseFloat(e.target.value) : null)}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Peso Líquido (kg)</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={formData.net_weight || ''}
                      onChange={(e) => handleInputChange('net_weight', e.target.value ? parseFloat(e.target.value) : null)}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Altura (cm)</Label>
                    <Input
                      type="number"
                      value={formData.height || ''}
                      onChange={(e) => handleInputChange('height', e.target.value ? parseFloat(e.target.value) : null)}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Largura (cm)</Label>
                    <Input
                      type="number"
                      value={formData.width || ''}
                      onChange={(e) => handleInputChange('width', e.target.value ? parseFloat(e.target.value) : null)}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Profundidade (cm)</Label>
                    <Input
                      type="number"
                      value={formData.depth || ''}
                      onChange={(e) => handleInputChange('depth', e.target.value ? parseFloat(e.target.value) : null)}
                      className="rounded-xl"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-xl">
                  <Label>Produto Perecível?</Label>
                  <Switch
                    checked={formData.is_perishable}
                    onCheckedChange={(v) => handleInputChange('is_perishable', v)}
                  />
                </div>

                {formData.is_perishable && (
                  <div>
                    <Label>Validade (dias)</Label>
                    <Input
                      type="number"
                      value={formData.shelf_life_days || ''}
                      onChange={(e) => handleInputChange('shelf_life_days', e.target.value ? parseInt(e.target.value) : null)}
                      className="rounded-xl"
                    />
                  </div>
                )}
              </TabsContent>

              {/* Aba 5: Preços & Comercial */}
              <TabsContent value="pricing" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Preço de Custo (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.cost_price || ''}
                      onChange={(e) => handleInputChange('cost_price', e.target.value ? parseFloat(e.target.value) : null)}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Comissão (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.commission_percent}
                      onChange={(e) => handleInputChange('commission_percent', parseFloat(e.target.value) || 0)}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Preço de Venda (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.sale_price || ''}
                      onChange={(e) => handleInputChange('sale_price', e.target.value ? parseFloat(e.target.value) : null)}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Margem (%)</Label>
                    <Input
                      type="number"
                      value={formData.margin_percent || ''}
                      disabled
                      className="bg-gray-50 rounded-xl"
                    />
                  </div>
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
                    <Label>Desconto Máximo (%)</Label>
                    <Input
                      type="number"
                      value={formData.max_discount_percent}
                      onChange={(e) => handleInputChange('max_discount_percent', parseFloat(e.target.value) || 0)}
                      className="rounded-xl"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between p-4 border rounded-xl">
                  <Label>Produto em Promoção?</Label>
                  <Switch
                    checked={formData.is_on_promotion}
                    onCheckedChange={(v) => handleInputChange('is_on_promotion', v)}
                  />
                </div>

                {formData.is_on_promotion && (
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Preço Promocional (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.promotion_price || ''}
                        onChange={(e) => handleInputChange('promotion_price', e.target.value ? parseFloat(e.target.value) : null)}
                        className="rounded-xl"
                      />
                    </div>
                    <div>
                      <Label>Data Início</Label>
                      <Input
                        type="date"
                        value={formData.promotion_start_date ? formData.promotion_start_date.split('T')[0] : ''}
                        onChange={(e) => handleInputChange('promotion_start_date', e.target.value ? new Date(e.target.value).toISOString() : '')}
                        className="rounded-xl"
                      />
                    </div>
                    <div>
                      <Label>Data Fim</Label>
                      <Input
                        type="date"
                        value={formData.promotion_end_date ? formData.promotion_end_date.split('T')[0] : ''}
                        onChange={(e) => handleInputChange('promotion_end_date', e.target.value ? new Date(e.target.value).toISOString() : '')}
                        className="rounded-xl"
                      />
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Aba 6: Dados Fiscais */}
              <TabsContent value="fiscal" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>NCM</Label>
                    <Input
                      value={formData.ncm}
                      onChange={(e) => handleInputChange('ncm', e.target.value)}
                      placeholder="0000.00.00"
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>CEST</Label>
                    <Input
                      value={formData.cest}
                      onChange={(e) => handleInputChange('cest', e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>CFOP Entrada</Label>
                    <Input
                      value={formData.cfop_in}
                      onChange={(e) => handleInputChange('cfop_in', e.target.value)}
                      placeholder="0.000"
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>CFOP Saída</Label>
                    <Input
                      value={formData.cfop_out}
                      onChange={(e) => handleInputChange('cfop_out', e.target.value)}
                      placeholder="0.000"
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Origem da Mercadoria</Label>
                    <Select value={formData.origin} onValueChange={(v) => handleInputChange('origin', v)}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        <SelectItem value="national" className="rounded-lg">Nacional</SelectItem>
                        <SelectItem value="imported_direct" className="rounded-lg">Importada Direta</SelectItem>
                        <SelectItem value="imported_domestic" className="rounded-lg">Importada Mercado Interno</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>CST/CSOSN</Label>
                    <Input
                      value={formData.cst_csosn}
                      onChange={(e) => handleInputChange('cst_csosn', e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Alíquota ICMS (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.icms_rate}
                      onChange={(e) => handleInputChange('icms_rate', parseFloat(e.target.value) || 0)}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Alíquota IPI (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.ipi_rate}
                      onChange={(e) => handleInputChange('ipi_rate', parseFloat(e.target.value) || 0)}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Alíquota PIS (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.pis_rate}
                      onChange={(e) => handleInputChange('pis_rate', parseFloat(e.target.value) || 0)}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Alíquota COFINS (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.cofins_rate}
                      onChange={(e) => handleInputChange('cofins_rate', parseFloat(e.target.value) || 0)}
                      className="rounded-xl"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Aba 7: Fornecedores */}
              <TabsContent value="suppliers" className="space-y-4 mt-4">
                <div className="text-center py-8 text-gray-500">
                  <p>Gerenciamento de fornecedores disponível em breve</p>
                </div>
              </TabsContent>

              {/* Aba 8: Classificações & Tags */}
              <TabsContent value="tags" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Linha de Produto</Label>
                    <CreateableSelect
                      value={formData.product_line}
                      onChange={(v) => handleInputChange('product_line', v)}
                      options={productLines.map(l => ({ value: l.name, label: l.name }))}
                      onCreate={handleCreateProductLine}
                      placeholder="Selecione ou crie uma linha"
                      createTitle="Nova Linha de Produto"
                      createPlaceholder="Nome da linha"
                    />
                  </div>
                  <div>
                    <Label>Segmento</Label>
                    <CreateableSelect
                      value={formData.segment}
                      onChange={(v) => handleInputChange('segment', v)}
                      options={segments.map(s => ({ value: s.name, label: s.name }))}
                      onCreate={handleCreateSegment}
                      placeholder="Selecione ou crie um segmento"
                      createTitle="Novo Segmento"
                      createPlaceholder="Nome do segmento"
                    />
                  </div>
                </div>
                <div>
                  <Label>Canais de Venda Permitidos</Label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.sales_channels.includes('retail')}
                        onChange={(e) => {
                          const channels = e.target.checked
                            ? [...formData.sales_channels, 'retail']
                            : formData.sales_channels.filter(c => c !== 'retail');
                          handleInputChange('sales_channels', channels);
                        }}
                        className="rounded"
                      />
                      Loja Física
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.sales_channels.includes('online')}
                        onChange={(e) => {
                          const channels = e.target.checked
                            ? [...formData.sales_channels, 'online']
                            : formData.sales_channels.filter(c => c !== 'online');
                          handleInputChange('sales_channels', channels);
                        }}
                        className="rounded"
                      />
                      Online
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.sales_channels.includes('wholesale')}
                        onChange={(e) => {
                          const channels = e.target.checked
                            ? [...formData.sales_channels, 'wholesale']
                            : formData.sales_channels.filter(c => c !== 'wholesale');
                          handleInputChange('sales_channels', channels);
                        }}
                        className="rounded"
                      />
                      Atacado
                    </label>
                  </div>
                </div>
              </TabsContent>

              {/* Aba 9: Descrição */}
              <TabsContent value="description" className="space-y-4 mt-4">
                <div>
                  <Label>Descrição Curta</Label>
                  <Textarea
                    value={formData.short_description}
                    onChange={(e) => handleInputChange('short_description', e.target.value)}
                    rows={2}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <Label>Descrição Detalhada</Label>
                  <Textarea
                    value={formData.detailed_description}
                    onChange={(e) => handleInputChange('detailed_description', e.target.value)}
                    rows={4}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <Label>Observações Internas</Label>
                  <Textarea
                    value={formData.internal_notes}
                    onChange={(e) => handleInputChange('internal_notes', e.target.value)}
                    rows={3}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <Label>Instruções de Uso</Label>
                  <Textarea
                    value={formData.usage_instructions}
                    onChange={(e) => handleInputChange('usage_instructions', e.target.value)}
                    rows={3}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <Label>Garantia</Label>
                  <Textarea
                    value={formData.warranty_info}
                    onChange={(e) => handleInputChange('warranty_info', e.target.value)}
                    rows={2}
                    className="rounded-xl"
                  />
                </div>
              </TabsContent>

              {/* Aba 10: Auditoria */}
              <TabsContent value="audit" className="space-y-4 mt-4">
                {editingProduct ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Data de Criação</Label>
                        <Input
                          value={new Date(new Date(editingProduct.created_date).getTime() - 3 * 60 * 60 * 1000).toLocaleString('pt-BR')}
                          disabled
                          className="bg-gray-50 rounded-xl"
                        />
                      </div>
                      <div>
                        <Label>Criado Por</Label>
                        <div className="flex items-center gap-2 p-2 border rounded-xl bg-gray-50">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={getUserByEmail(editingProduct.created_by)?.avatar_url} />
                            <AvatarFallback className="text-xs">
                              {editingProduct.created_by?.split('@')[0]?.slice(0, 2).toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{editingProduct.created_by || '-'}</span>
                        </div>
                      </div>
                      <div>
                        <Label>Última Alteração</Label>
                        <Input
                          value={new Date(new Date(editingProduct.updated_date).getTime() - 3 * 60 * 60 * 1000).toLocaleString('pt-BR')}
                          disabled
                          className="bg-gray-50 rounded-xl"
                        />
                      </div>
                      <div>
                        <Label>Alterado Por</Label>
                        <div className="flex items-center gap-2 p-2 border rounded-xl bg-gray-50">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={getUserByEmail(editingProduct.created_by)?.avatar_url} />
                            <AvatarFallback className="text-xs">
                              {editingProduct.created_by?.split('@')[0]?.slice(0, 2).toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{editingProduct.created_by || '-'}</span>
                        </div>
                      </div>
                    </div>

                    {editingProduct.price_history && editingProduct.price_history.length > 0 && (
                      <div>
                        <Label>Histórico de Preços</Label>
                        <div className="mt-2 border rounded-2xl overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Custo</TableHead>
                                <TableHead>Venda</TableHead>
                                <TableHead>Alterado Por</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {editingProduct.price_history.slice().reverse().map((entry, idx) => {
                                const changedUser = getUserByEmail(entry.changed_by);
                                return (
                                  <TableRow key={idx}>
                                    <TableCell>{new Date(entry.date).toLocaleString('pt-BR')}</TableCell>
                                    <TableCell>R$ {entry.cost_price?.toFixed(2)}</TableCell>
                                    <TableCell>R$ {entry.sale_price?.toFixed(2)}</TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <Avatar className="w-6 h-6">
                                          <AvatarImage src={changedUser?.avatar_url} />
                                          <AvatarFallback className="text-xs">
                                            {entry.changed_by?.split('@')[0]?.slice(0, 2).toUpperCase() || 'U'}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm">{entry.changed_by}</span>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>Dados de auditoria disponíveis após salvar o produto</p>
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
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b bg-white">
        <div>
          <h2 className="text-xl font-semibold">Cadastro de Produtos</h2>
          <p className="text-sm text-gray-500 mt-1">
            {filteredProducts.length} produto{filteredProducts.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button 
          onClick={() => setShowForm(true)}
          className="transition-all active:scale-95 rounded-xl"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Produto
        </Button>
      </div>

      {/* Search */}
      <div className="px-6 py-4 border-b bg-white">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar por nome, SKU ou EAN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>
      </div>

      {/* Products List */}
      <ScrollArea className="flex-1 bg-gray-50">
        <div className="p-6">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500">Nenhum produto cadastrado</p>
              <Button 
                variant="link" 
                onClick={() => setShowForm(true)}
                className="transition-all active:scale-95"
              >
                Cadastrar primeiro produto
              </Button>
            </div>
          ) : (
            <div className="border rounded-2xl overflow-hidden bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {product.main_image ? (
                            <img
                              src={product.main_image}
                              alt={product.name}
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                              <Package className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium">{product.name}</div>
                            {product.brand && (
                              <div className="text-xs text-gray-500">{product.brand}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{product.category || '-'}</TableCell>
                      <TableCell>
                        {product.sale_price ? `R$ ${product.sale_price.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={product.status === 'active' ? 'default' : 'secondary'}
                          className="rounded-full"
                        >
                          {product.status === 'active' ? 'Ativo' : product.status === 'inactive' ? 'Inativo' : 'Descontinuado'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(product)}
                            className="transition-all active:scale-95 rounded-lg"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(product.id)}
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