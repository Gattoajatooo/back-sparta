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
  Save,
  X,
  FileText,
  Trash,
  CheckCircle2
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function InvoicesInModule() {
  const moduleId = 'invoices-in';
  
  const [user, setUser] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [showForm, setShowForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [activeTab, setActiveTab] = useState("header");
  const [formData, setFormData] = useState(getEmptyFormData());
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [validating, setValidating] = useState(null);

  function getEmptyFormData() {
    return {
      purchase_order_id: "",
      supplier_id: "",
      invoice_number: "",
      series: "",
      issue_date: new Date().toISOString(),
      entry_date: new Date().toISOString(),
      nfe_key: "",
      items: [],
      products_value: 0,
      freight_value: 0,
      insurance_value: 0,
      other_expenses: 0,
      total_discount: 0,
      total_value: 0,
      status: "pending",
      general_notes: ""
    };
  }

  useEffect(() => {
    loadData();
  }, []);

  // Recalcular totais quando valores mudam
  useEffect(() => {
    const productsValue = formData.items.reduce((sum, item) => {
      return sum + ((item.quantity || 0) * (item.unit_price || 0) - (item.discount || 0));
    }, 0);

    const totalValue = productsValue + 
                       (formData.freight_value || 0) + 
                       (formData.insurance_value || 0) + 
                       (formData.other_expenses || 0) - 
                       (formData.total_discount || 0);

    setFormData(prev => ({
      ...prev,
      products_value: productsValue,
      total_value: totalValue
    }));
  }, [formData.items, formData.freight_value, formData.insurance_value, formData.other_expenses, formData.total_discount]);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const [allInvoices, allOrders, allSuppliers, allProducts] = await Promise.all([
        base44.entities.InvoiceIn.filter({
          company_id: currentUser.company_id,
          is_deleted: { '$ne': true }
        }).catch(() => []),
        base44.entities.PurchaseOrder.filter({
          company_id: currentUser.company_id,
          status: { '$nin': ['draft', 'cancelled'] }
        }).catch(() => []),
        base44.entities.Supplier.filter({
          company_id: currentUser.company_id
        }).catch(() => []),
        base44.entities.Product.filter({
          company_id: currentUser.company_id,
          is_deleted: { '$ne': true }
        }).catch(() => [])
      ]);

      setInvoices(allInvoices || []);
      setPurchaseOrders(allOrders || []);
      setSuppliers(allSuppliers || []);
      setProducts(allProducts || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOrderSelect = (orderId) => {
    const order = purchaseOrders.find(o => o.id === orderId);
    setSelectedOrder(order);
    
    if (order) {
      setFormData(prev => ({
        ...prev,
        purchase_order_id: orderId,
        supplier_id: order.supplier_id,
        items: order.items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount: item.discount || 0,
          freight_allocation: 0,
          other_expenses_allocation: 0,
          taxes: {
            icms: 0,
            ipi: 0,
            pis: 0,
            cofins: 0
          },
          final_unit_cost: 0
        }))
      }));
    }
  };

  const handleUpdateItem = (index, field, value) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      
      if (field.startsWith('taxes.')) {
        const taxField = field.split('.')[1];
        newItems[index] = {
          ...newItems[index],
          taxes: {
            ...newItems[index].taxes,
            [taxField]: value
          }
        };
      } else {
        newItems[index] = { ...newItems[index], [field]: value };
      }
      
      // Calcular custo final unitário
      const item = newItems[index];
      const baseValue = (item.unit_price || 0) - (item.discount || 0);
      const allocations = (item.freight_allocation || 0) + (item.other_expenses_allocation || 0);
      const taxes = Object.values(item.taxes || {}).reduce((sum, tax) => sum + (tax || 0), 0);
      
      item.final_unit_cost = (baseValue + allocations + taxes) / (item.quantity || 1);
      
      return { ...prev, items: newItems };
    });
  };

  const handleValidate = async (invoiceId) => {
    if (!confirm('Deseja validar esta nota fiscal? Esta ação irá movimentar o estoque e gerar contas a pagar.')) {
      return;
    }

    setValidating(invoiceId);
    try {
      const response = await base44.functions.invoke('validateInvoiceIn', {
        invoice_id: invoiceId
      });

      if (response.data?.success) {
        alert('Nota fiscal validada com sucesso!');
        await loadData();
      } else {
        alert('Erro ao validar: ' + (response.data?.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error("Erro ao validar NF:", error);
      alert('Erro ao validar nota fiscal');
    } finally {
      setValidating(null);
    }
  };

  const handleEdit = (invoice) => {
    setEditingInvoice(invoice);
    setFormData({
      purchase_order_id: invoice.purchase_order_id || '',
      supplier_id: invoice.supplier_id || '',
      invoice_number: invoice.invoice_number || '',
      series: invoice.series || '',
      issue_date: invoice.issue_date || '',
      entry_date: invoice.entry_date || '',
      nfe_key: invoice.nfe_key || '',
      items: invoice.items || [],
      products_value: invoice.products_value || 0,
      freight_value: invoice.freight_value || 0,
      insurance_value: invoice.insurance_value || 0,
      other_expenses: invoice.other_expenses || 0,
      total_discount: invoice.total_discount || 0,
      total_value: invoice.total_value || 0,
      general_notes: invoice.general_notes || ''
    });
    
    const order = purchaseOrders.find(o => o.id === invoice.purchase_order_id);
    setSelectedOrder(order);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    try {
      const invoiceData = {
        ...formData,
        company_id: user.company_id
      };

      if (editingInvoice) {
        await base44.entities.InvoiceIn.update(editingInvoice.id, invoiceData);
      } else {
        await base44.entities.InvoiceIn.create(invoiceData);
      }
      
      await loadData();
      
      setShowForm(false);
      setEditingInvoice(null);
      setFormData(getEmptyFormData());
      setSelectedOrder(null);
    } catch (error) {
      console.error("Erro ao salvar NF:", error);
    }
  };

  const getProductById = (id) => products.find(p => p.id === id);
  const getSupplierById = (id) => suppliers.find(s => s.id === id);

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
          </div>
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
            {editingInvoice ? 'Editar Nota Fiscal' : 'Nova Nota Fiscal de Entrada'}
          </h3>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setShowForm(false);
                setEditingInvoice(null);
                setFormData(getEmptyFormData());
                setSelectedOrder(null);
              }}
              className="rounded-xl"
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button 
              size="sm" 
              onClick={handleSubmit}
              disabled={!selectedOrder}
              className="rounded-xl"
            >
              <Save className="w-4 h-4 mr-2" />
              {editingInvoice ? 'Atualizar' : 'Salvar'} NF
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 rounded-2xl">
                <TabsTrigger value="header" className="rounded-xl">Dados da NF</TabsTrigger>
                <TabsTrigger value="items" className="rounded-xl">Itens & Custos</TabsTrigger>
              </TabsList>

              {/* Aba 1: Dados da NF */}
              <TabsContent value="header" className="space-y-4 mt-4">
                <div>
                  <Label>Pedido de Compra *</Label>
                  <Select value={formData.purchase_order_id} onValueChange={handleOrderSelect}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Selecione um pedido..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      {purchaseOrders.map(order => {
                        const supplier = getSupplierById(order.supplier_id);
                        return (
                          <SelectItem key={order.id} value={order.id}>
                            {order.order_number} - {supplier?.trade_name || supplier?.corporate_name}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Número da NF *</Label>
                    <Input
                      value={formData.invoice_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, invoice_number: e.target.value }))}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Série</Label>
                    <Input
                      value={formData.series}
                      onChange={(e) => setFormData(prev => ({ ...prev, series: e.target.value }))}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Data de Emissão</Label>
                    <Input
                      type="date"
                      value={formData.issue_date ? formData.issue_date.split('T')[0] : ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, issue_date: e.target.value }))}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Data de Entrada</Label>
                    <Input
                      type="date"
                      value={formData.entry_date ? formData.entry_date.split('T')[0] : ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, entry_date: e.target.value }))}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Chave da NF-e</Label>
                    <Input
                      value={formData.nfe_key}
                      onChange={(e) => setFormData(prev => ({ ...prev, nfe_key: e.target.value }))}
                      className="rounded-xl font-mono"
                      maxLength={44}
                    />
                  </div>
                  <div>
                    <Label>Frete (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.freight_value}
                      onChange={(e) => setFormData(prev => ({ ...prev, freight_value: parseFloat(e.target.value) || 0 }))}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Seguro (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.insurance_value}
                      onChange={(e) => setFormData(prev => ({ ...prev, insurance_value: parseFloat(e.target.value) || 0 }))}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Outras Despesas (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.other_expenses}
                      onChange={(e) => setFormData(prev => ({ ...prev, other_expenses: parseFloat(e.target.value) || 0 }))}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <Label>Desconto Total (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.total_discount}
                      onChange={(e) => setFormData(prev => ({ ...prev, total_discount: parseFloat(e.target.value) || 0 }))}
                      className="rounded-xl"
                    />
                  </div>
                </div>

                {/* Resumo Financeiro */}
                <div className="mt-6 p-4 bg-gray-50 rounded-xl space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Valor dos Produtos:</span>
                    <span className="font-medium">R$ {(formData.products_value || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Frete:</span>
                    <span className="font-medium">R$ {(formData.freight_value || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Outras Despesas:</span>
                    <span className="font-medium">R$ {((formData.insurance_value || 0) + (formData.other_expenses || 0)).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Desconto:</span>
                    <span className="font-medium text-red-600">- R$ {(formData.total_discount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>Total da NF:</span>
                    <span>R$ {(formData.total_value || 0).toFixed(2)}</span>
                  </div>
                </div>
              </TabsContent>

              {/* Aba 2: Itens & Custos */}
              <TabsContent value="items" className="space-y-4 mt-4">
                {selectedOrder ? (
                  <div className="space-y-3">
                    {formData.items.map((item, index) => {
                      const product = getProductById(item.product_id);
                      return (
                        <div key={index} className="p-4 border rounded-2xl space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{product?.name}</div>
                              <div className="text-xs text-gray-500">SKU: {product?.sku}</div>
                            </div>
                            <Badge variant="outline">
                              Qtd: {item.quantity}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <Label className="text-xs">Valor Unitário</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={item.unit_price}
                                onChange={(e) => handleUpdateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                className="rounded-xl"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Desconto</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={item.discount}
                                onChange={(e) => handleUpdateItem(index, 'discount', parseFloat(e.target.value) || 0)}
                                className="rounded-xl"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Rateio Frete</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={item.freight_allocation}
                                onChange={(e) => handleUpdateItem(index, 'freight_allocation', parseFloat(e.target.value) || 0)}
                                className="rounded-xl"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">ICMS</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={item.taxes?.icms || 0}
                                onChange={(e) => handleUpdateItem(index, 'taxes.icms', parseFloat(e.target.value) || 0)}
                                className="rounded-xl"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">IPI</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={item.taxes?.ipi || 0}
                                onChange={(e) => handleUpdateItem(index, 'taxes.ipi', parseFloat(e.target.value) || 0)}
                                className="rounded-xl"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">PIS/COFINS</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={(item.taxes?.pis || 0) + (item.taxes?.cofins || 0)}
                                onChange={(e) => {
                                  const total = parseFloat(e.target.value) || 0;
                                  handleUpdateItem(index, 'taxes.pis', total / 2);
                                  handleUpdateItem(index, 'taxes.cofins', total / 2);
                                }}
                                className="rounded-xl"
                              />
                            </div>
                            <div className="col-span-3">
                              <div className="p-3 bg-blue-50 rounded-xl">
                                <div className="text-xs text-gray-600 mb-1">Custo Final Unitário</div>
                                <div className="text-lg font-bold text-blue-900">
                                  R$ {(item.final_unit_cost || 0).toFixed(4)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>Selecione um pedido de compra para continuar</p>
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
          <h2 className="text-xl font-semibold">Notas Fiscais de Entrada</h2>
          <p className="text-sm text-gray-500 mt-1">
            {invoices.length} nota{invoices.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button 
          onClick={() => setShowForm(true)}
          className="rounded-xl"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova NF Entrada
        </Button>
      </div>

      <ScrollArea className="flex-1 bg-gray-50">
        <div className="p-6">
          {invoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500">Nenhuma nota fiscal registrada</p>
            </div>
          ) : (
            <div className="border rounded-2xl overflow-hidden bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>NF</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Emissão</TableHead>
                    <TableHead>Entrada</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => {
                    const supplier = getSupplierById(invoice.supplier_id);
                    return (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-mono text-sm">{invoice.invoice_number}</TableCell>
                        <TableCell>{supplier?.trade_name || supplier?.corporate_name}</TableCell>
                        <TableCell>{new Date(invoice.issue_date).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell>{new Date(invoice.entry_date).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell className="font-medium">R$ {(invoice.total_value || 0).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge
                            className={`rounded-full ${
                              invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              invoice.status === 'validated' ? 'bg-green-100 text-green-800' :
                              'bg-red-100 text-red-800'
                            }`}
                          >
                            {invoice.status === 'pending' ? 'Pendente' :
                             invoice.status === 'validated' ? 'Validada' :
                             'Cancelada'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {invoice.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleValidate(invoice.id)}
                                  disabled={validating === invoice.id}
                                  className="rounded-lg bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle2 className="w-4 h-4 mr-1" />
                                  {validating === invoice.id ? 'Validando...' : 'Validar'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEdit(invoice)}
                                  className="rounded-lg"
                                >
                                  Editar
                                </Button>
                              </>
                            )}
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