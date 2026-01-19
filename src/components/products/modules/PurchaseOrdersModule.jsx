import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2,
  Save,
  X,
  ShoppingCart,
  Trash,
  Send,
  CheckCircle
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function PurchaseOrdersModule() {
  const moduleId = 'purchase-orders';
  
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [showForm, setShowForm] = useState(() => {
    const saved = localStorage.getItem(`${moduleId}_showForm`);
    return saved === 'true';
  });
  const [editingOrder, setEditingOrder] = useState(() => {
    const saved = localStorage.getItem(`${moduleId}_editingOrder`);
    return saved ? JSON.parse(saved) : null;
  });
  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem(`${moduleId}_activeTab`);
    return saved || "header";
  });
  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem(`${moduleId}_formData`);
    return saved ? JSON.parse(saved) : getEmptyFormData();
  });

  function getEmptyFormData() {
    return {
      order_number: `PC-${Date.now()}`,
      supplier_id: "",
      buyer_user_id: "",
      status: "draft",
      order_date: new Date().toISOString(),
      expected_delivery_date: "",
      delivery_location: "",
      payment_term: "",
      items: [],
      general_notes: "",
      follow_ups: []
    };
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    localStorage.setItem(`${moduleId}_showForm`, showForm);
  }, [showForm]);

  useEffect(() => {
    localStorage.setItem(`${moduleId}_editingOrder`, JSON.stringify(editingOrder));
  }, [editingOrder]);

  useEffect(() => {
    localStorage.setItem(`${moduleId}_activeTab`, activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem(`${moduleId}_formData`, JSON.stringify(formData));
  }, [formData]);

  // Recalcular totais quando itens mudam
  useEffect(() => {
    const subtotal = formData.items.reduce((sum, item) => {
      const itemTotal = (item.quantity || 0) * (item.unit_price || 0) - (item.discount || 0);
      return sum + itemTotal;
    }, 0);

    const totalDiscount = formData.items.reduce((sum, item) => sum + (item.discount || 0), 0);

    setFormData(prev => ({
      ...prev,
      subtotal,
      total_discount: totalDiscount,
      total_value: subtotal
    }));
  }, [formData.items]);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const [allOrders, allSuppliers, allProducts, allUsers] = await Promise.all([
        base44.entities.PurchaseOrder.filter({
          company_id: currentUser.company_id,
          is_deleted: { '$ne': true }
        }).catch(() => []),
        base44.entities.Supplier.filter({
          company_id: currentUser.company_id,
          is_active: true
        }).catch(() => []),
        base44.entities.Product.filter({
          company_id: currentUser.company_id,
          is_deleted: { '$ne': true }
        }).catch(() => []),
        base44.entities.User.filter({
          company_id: currentUser.company_id
        }).catch(() => [])
      ]);

      setOrders(allOrders || []);
      setSuppliers(allSuppliers || []);
      setProducts(allProducts || []);
      setUsers(allUsers || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        product_id: "",
        supplier_product_code: "",
        quantity: 0,
        unit: "UN",
        unit_price: 0,
        discount: 0,
        total_price: 0,
        expected_delivery_date: prev.expected_delivery_date,
        status: "pending",
        quantity_received: 0,
        quantity_pending: 0
      }]
    }));
  };

  const handleRemoveItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleUpdateItem = (index, field, value) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      
      // Recalcular total do item
      const item = newItems[index];
      item.total_price = (item.quantity || 0) * (item.unit_price || 0) - (item.discount || 0);
      item.quantity_pending = (item.quantity || 0) - (item.quantity_received || 0);
      
      return { ...prev, items: newItems };
    });
  };

  const handleSubmit = async () => {
    try {
      const orderData = {
        ...formData,
        company_id: user.company_id,
        buyer_user_id: formData.buyer_user_id || user.id
      };

      if (editingOrder) {
        await base44.entities.PurchaseOrder.update(editingOrder.id, orderData);
      } else {
        await base44.entities.PurchaseOrder.create(orderData);
      }

      await loadData();
      
      localStorage.removeItem(`${moduleId}_showForm`);
      localStorage.removeItem(`${moduleId}_editingOrder`);
      localStorage.removeItem(`${moduleId}_activeTab`);
      localStorage.removeItem(`${moduleId}_formData`);
      
      setShowForm(false);
      setEditingOrder(null);
      setFormData(getEmptyFormData());
    } catch (error) {
      console.error("Erro ao salvar pedido:", error);
    }
  };

  const handleApprove = async (orderId) => {
    try {
      await base44.entities.PurchaseOrder.update(orderId, {
        status: 'approved',
        approved_by: user.email,
        approved_at: new Date().toISOString()
      });
      await loadData();
    } catch (error) {
      console.error("Erro ao aprovar pedido:", error);
    }
  };

  const handleSend = async (orderId) => {
    try {
      await base44.entities.PurchaseOrder.update(orderId, {
        status: 'sent',
        sent_at: new Date().toISOString()
      });
      await loadData();
    } catch (error) {
      console.error("Erro ao enviar pedido:", error);
    }
  };

  const handleEdit = (order) => {
    setEditingOrder(order);
    setFormData({ ...getEmptyFormData(), ...order });
    setShowForm(true);
  };

  const handleDelete = async (orderId) => {
    if (window.confirm("Deseja realmente cancelar este pedido?")) {
      try {
        await base44.entities.PurchaseOrder.update(orderId, {
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        });
        await loadData();
      } catch (error) {
        console.error("Erro ao cancelar pedido:", error);
      }
    }
  };

  const getSupplierById = (id) => suppliers.find(s => s.id === id);
  const getProductById = (id) => products.find(p => p.id === id);
  const getUserById = (id) => users.find(u => u.id === id);

  const filteredOrders = orders.filter(order => {
    const supplier = getSupplierById(order.supplier_id);
    return (
      order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier?.corporate_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier?.trade_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

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
    return (
      <div className="h-full flex flex-col bg-white rounded-3xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-semibold text-lg">
            {editingOrder ? 'Editar Pedido' : 'Novo Pedido de Compra'}
          </h3>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                localStorage.removeItem(`${moduleId}_showForm`);
                localStorage.removeItem(`${moduleId}_editingOrder`);
                localStorage.removeItem(`${moduleId}_activeTab`);
                localStorage.removeItem(`${moduleId}_formData`);
                
                setShowForm(false);
                setEditingOrder(null);
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
              <TabsList className="grid w-full grid-cols-3 rounded-2xl">
                <TabsTrigger value="header" className="rounded-xl">Cabeçalho</TabsTrigger>
                <TabsTrigger value="items" className="rounded-xl">Itens</TabsTrigger>
                <TabsTrigger value="tracking" className="rounded-xl">Acompanhamento</TabsTrigger>
              </TabsList>

              {/* Aba 1: Cabeçalho */}
              <TabsContent value="header" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Número do Pedido</Label>
                    <Input
                      value={formData.order_number}
                      onChange={(e) => handleInputChange('order_number', e.target.value)}
                      className="rounded-xl"
                      disabled={!!editingOrder}
                    />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={(v) => handleInputChange('status', v)}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        <SelectItem value="draft">Rascunho</SelectItem>
                        <SelectItem value="approved">Aprovado</SelectItem>
                        <SelectItem value="sent">Enviado</SelectItem>
                        <SelectItem value="partially_received">Parcialmente Recebido</SelectItem>
                        <SelectItem value="received">Recebido</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Fornecedor *</Label>
                    <Select value={formData.supplier_id} onValueChange={(v) => handleInputChange('supplier_id', v)}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        {suppliers.map(s => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.trade_name || s.corporate_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Comprador</Label>
                    <Select value={formData.buyer_user_id || user?.id} onValueChange={(v) => handleInputChange('buyer_user_id', v)}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        {users.map(u => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Data do Pedido</Label>
                    <Input
                      type="date"
                      value={formData.order_date ? formData.order_date.split('T')[0] : ''}
                      onChange={(e) => handleInputChange('order_date', e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Prazo de Entrega Previsto</Label>
                    <Input
                      type="date"
                      value={formData.expected_delivery_date ? formData.expected_delivery_date.split('T')[0] : ''}
                      onChange={(e) => handleInputChange('expected_delivery_date', e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Condição de Pagamento</Label>
                    <Input
                      value={formData.payment_term}
                      onChange={(e) => handleInputChange('payment_term', e.target.value)}
                      placeholder="Ex: 30 dias"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Local de Entrega</Label>
                    <Input
                      value={formData.delivery_location}
                      onChange={(e) => handleInputChange('delivery_location', e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Observações Gerais</Label>
                    <Textarea
                      value={formData.general_notes}
                      onChange={(e) => handleInputChange('general_notes', e.target.value)}
                      rows={3}
                      className="rounded-xl"
                    />
                  </div>
                </div>

                {/* Totais */}
                <div className="mt-6 p-4 bg-gray-50 rounded-xl space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span className="font-medium">R$ {(formData.subtotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Desconto:</span>
                    <span className="font-medium text-red-600">- R$ {(formData.total_discount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>Total:</span>
                    <span>R$ {(formData.total_value || 0).toFixed(2)}</span>
                  </div>
                </div>
              </TabsContent>

              {/* Aba 2: Itens */}
              <TabsContent value="items" className="space-y-4 mt-4">
                <div className="flex justify-between items-center">
                  <Label>Itens do Pedido</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddItem}
                    className="rounded-xl"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Item
                  </Button>
                </div>
                
                {formData.items?.map((item, index) => {
                  const product = getProductById(item.product_id);
                  return (
                    <div key={index} className="p-4 border rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Item {index + 1}</Label>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(index)}
                          className="h-8 w-8 rounded-lg"
                        >
                          <Trash className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <Label className="text-xs">Produto *</Label>
                          <Select 
                            value={item.product_id} 
                            onValueChange={(v) => handleUpdateItem(index, 'product_id', v)}
                          >
                            <SelectTrigger className="rounded-xl">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl">
                              {products.map(p => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.sku} - {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Código do Fornecedor</Label>
                          <Input
                            value={item.supplier_product_code}
                            onChange={(e) => handleUpdateItem(index, 'supplier_product_code', e.target.value)}
                            className="rounded-xl"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Unidade</Label>
                          <Select value={item.unit} onValueChange={(v) => handleUpdateItem(index, 'unit', v)}>
                            <SelectTrigger className="rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl">
                              <SelectItem value="UN">UN</SelectItem>
                              <SelectItem value="KG">KG</SelectItem>
                              <SelectItem value="LT">LT</SelectItem>
                              <SelectItem value="CX">CX</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Quantidade</Label>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                            className="rounded-xl"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Valor Unitário (R$)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => handleUpdateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                            className="rounded-xl"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Desconto (R$)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.discount}
                            onChange={(e) => handleUpdateItem(index, 'discount', parseFloat(e.target.value) || 0)}
                            className="rounded-xl"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Total do Item</Label>
                          <Input
                            value={`R$ ${(item.total_price || 0).toFixed(2)}`}
                            disabled
                            className="bg-gray-50 rounded-xl"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {formData.items?.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p>Nenhum item adicionado</p>
                  </div>
                )}
              </TabsContent>

              {/* Aba 3: Acompanhamento */}
              <TabsContent value="tracking" className="space-y-4 mt-4">
                {editingOrder ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 border rounded-xl">
                        <div className="text-xs text-gray-600 mb-1">Data de Aprovação</div>
                        <div className="text-sm font-medium">
                          {editingOrder.approved_at 
                            ? new Date(editingOrder.approved_at).toLocaleDateString('pt-BR')
                            : '-'}
                        </div>
                      </div>
                      <div className="p-4 border rounded-xl">
                        <div className="text-xs text-gray-600 mb-1">Data de Envio</div>
                        <div className="text-sm font-medium">
                          {editingOrder.sent_at 
                            ? new Date(editingOrder.sent_at).toLocaleDateString('pt-BR')
                            : '-'}
                        </div>
                      </div>
                      <div className="p-4 border rounded-xl">
                        <div className="text-xs text-gray-600 mb-1">Status de Prazo</div>
                        <Badge className={`
                          ${editingOrder.delivery_status === 'on_time' ? 'bg-green-100 text-green-800' :
                            editingOrder.delivery_status === 'attention' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'}
                        `}>
                          {editingOrder.delivery_status === 'on_time' ? 'No Prazo' :
                           editingOrder.delivery_status === 'attention' ? 'Atenção' :
                           'Atrasado'}
                        </Badge>
                      </div>
                    </div>
                    
                    <div>
                      <Label>Histórico de Follow-up</Label>
                      <div className="mt-2 space-y-2">
                        {editingOrder.follow_ups?.map((followUp, idx) => (
                          <div key={idx} className="p-3 border rounded-xl bg-gray-50">
                            <div className="flex justify-between text-xs text-gray-600 mb-1">
                              <span>{followUp.user_email}</span>
                              <span>{new Date(followUp.date).toLocaleDateString('pt-BR')}</span>
                            </div>
                            <p className="text-sm">{followUp.notes}</p>
                          </div>
                        ))}
                        {(!editingOrder.follow_ups || editingOrder.follow_ups.length === 0) && (
                          <p className="text-sm text-gray-500 text-center py-4">Nenhum follow-up registrado</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>Dados de acompanhamento disponíveis após criar o pedido</p>
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
          <h2 className="text-xl font-semibold">Pedidos de Compra</h2>
          <p className="text-sm text-gray-500 mt-1">
            {filteredOrders.length} pedido{filteredOrders.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button 
          onClick={() => setShowForm(true)}
          className="transition-all active:scale-95 rounded-xl"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Pedido
        </Button>
      </div>

      <div className="px-6 py-4 border-b bg-white">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar por número do pedido ou fornecedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 bg-gray-50">
        <div className="p-6">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500">Nenhum pedido de compra cadastrado</p>
              <Button 
                variant="link" 
                onClick={() => setShowForm(true)}
                className="transition-all active:scale-95"
              >
                Criar primeiro pedido
              </Button>
            </div>
          ) : (
            <div className="border rounded-2xl overflow-hidden bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Itens</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => {
                    const supplier = getSupplierById(order.supplier_id);
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-sm">{order.order_number}</TableCell>
                        <TableCell>{supplier?.trade_name || supplier?.corporate_name || '-'}</TableCell>
                        <TableCell>{new Date(order.order_date).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell>{order.items?.length || 0}</TableCell>
                        <TableCell className="font-medium">R$ {(order.total_value || 0).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`rounded-full ${
                              order.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                              order.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                              order.status === 'sent' ? 'bg-purple-100 text-purple-800' :
                              order.status === 'received' ? 'bg-green-100 text-green-800' :
                              order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {order.status === 'draft' ? 'Rascunho' :
                             order.status === 'approved' ? 'Aprovado' :
                             order.status === 'sent' ? 'Enviado' :
                             order.status === 'partially_received' ? 'Parcial' :
                             order.status === 'received' ? 'Recebido' :
                             'Cancelado'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {order.status === 'draft' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleApprove(order.id)}
                                title="Aprovar"
                                className="h-8 w-8 rounded-lg"
                              >
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              </Button>
                            )}
                            {order.status === 'approved' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleSend(order.id)}
                                title="Enviar ao Fornecedor"
                                className="h-8 w-8 rounded-lg"
                              >
                                <Send className="w-4 h-4 text-blue-600" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(order)}
                              className="h-8 w-8 rounded-lg"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(order.id)}
                              className="h-8 w-8 rounded-lg"
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