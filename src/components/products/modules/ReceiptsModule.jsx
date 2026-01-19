import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
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
  PackageCheck,
  Trash,
  AlertCircle
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function ReceiptsModule() {
  const moduleId = 'receipts';
  
  const [user, setUser] = useState(null);
  const [receipts, setReceipts] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(getEmptyFormData());
  const [selectedOrder, setSelectedOrder] = useState(null);

  function getEmptyFormData() {
    return {
      purchase_order_id: "",
      receipt_date: new Date().toISOString(),
      received_by: "",
      items: [],
      general_notes: ""
    };
  }

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const [allReceipts, allOrders, allProducts, allSuppliers] = await Promise.all([
        base44.entities.Receipt.filter({
          company_id: currentUser.company_id,
          is_deleted: { '$ne': true }
        }).catch(() => []),
        base44.entities.PurchaseOrder.filter({
          company_id: currentUser.company_id,
          status: { '$in': ['sent', 'partially_received'] }
        }).catch(() => []),
        base44.entities.Product.filter({
          company_id: currentUser.company_id,
          is_deleted: { '$ne': true }
        }).catch(() => []),
        base44.entities.Supplier.filter({
          company_id: currentUser.company_id
        }).catch(() => [])
      ]);

      setReceipts(allReceipts || []);
      setPurchaseOrders(allOrders || []);
      setProducts(allProducts || []);
      setSuppliers(allSuppliers || []);
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
        items: order.items.map(item => ({
          product_id: item.product_id,
          quantity_received: 0,
          quantity_pending: item.quantity_pending || item.quantity,
          has_divergence: false,
          divergence_reason: "",
          divergence_notes: "",
          accepted_in_stock: true
        }))
      }));
    }
  };

  const handleUpdateItem = (index, field, value) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, items: newItems };
    });
  };

  const handleSubmit = async () => {
    try {
      const receiptData = {
        ...formData,
        company_id: user.company_id,
        received_by: user.email
      };

      await base44.entities.Receipt.create(receiptData);

      // Atualizar status do pedido
      const totalReceived = formData.items.every(item => item.quantity_received >= item.quantity_pending);
      const partialReceived = formData.items.some(item => item.quantity_received > 0);

      if (totalReceived) {
        await base44.entities.PurchaseOrder.update(selectedOrder.id, { status: 'received' });
      } else if (partialReceived) {
        await base44.entities.PurchaseOrder.update(selectedOrder.id, { status: 'partially_received' });
      }

      await loadData();
      setShowForm(false);
      setFormData(getEmptyFormData());
      setSelectedOrder(null);
    } catch (error) {
      console.error("Erro ao salvar recebimento:", error);
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
          <h3 className="font-semibold text-lg">Novo Recebimento</h3>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setShowForm(false);
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
              Salvar Recebimento
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
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

            {selectedOrder && (
              <>
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <h4 className="font-medium mb-2">Dados do Pedido</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">Fornecedor:</span>
                      <span className="ml-2 font-medium">
                        {getSupplierById(selectedOrder.supplier_id)?.trade_name}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Valor Total:</span>
                      <span className="ml-2 font-medium">R$ {(selectedOrder.total_value || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Itens para Recebimento</Label>
                  <div className="mt-3 space-y-3">
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
                              Pendente: {item.quantity_pending}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">Quantidade Recebida</Label>
                              <Input
                                type="number"
                                value={item.quantity_received}
                                onChange={(e) => handleUpdateItem(index, 'quantity_received', parseFloat(e.target.value) || 0)}
                                className="rounded-xl"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Aceito em Estoque?</Label>
                              <Select 
                                value={item.accepted_in_stock ? 'yes' : 'no'} 
                                onValueChange={(v) => handleUpdateItem(index, 'accepted_in_stock', v === 'yes')}
                              >
                                <SelectTrigger className="rounded-xl">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl">
                                  <SelectItem value="yes">Sim</SelectItem>
                                  <SelectItem value="no">Não</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="col-span-2">
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={item.has_divergence}
                                  onChange={(e) => handleUpdateItem(index, 'has_divergence', e.target.checked)}
                                  className="rounded"
                                />
                                <span className="text-sm">Há divergência?</span>
                              </label>
                            </div>
                            {item.has_divergence && (
                              <>
                                <div>
                                  <Label className="text-xs">Motivo</Label>
                                  <Select 
                                    value={item.divergence_reason} 
                                    onValueChange={(v) => handleUpdateItem(index, 'divergence_reason', v)}
                                  >
                                    <SelectTrigger className="rounded-xl">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl">
                                      <SelectItem value="quantity_lower">Quantidade Menor</SelectItem>
                                      <SelectItem value="wrong_product">Produto Errado</SelectItem>
                                      <SelectItem value="damaged">Avaria</SelectItem>
                                      <SelectItem value="other">Outro</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="col-span-2">
                                  <Label className="text-xs">Observações da Divergência</Label>
                                  <Textarea
                                    value={item.divergence_notes}
                                    onChange={(e) => handleUpdateItem(index, 'divergence_notes', e.target.value)}
                                    rows={2}
                                    className="rounded-xl"
                                  />
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <Label>Observações do Recebimento</Label>
                  <Textarea
                    value={formData.general_notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, general_notes: e.target.value }))}
                    rows={3}
                    className="rounded-xl"
                  />
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col rounded-3xl overflow-hidden">
      <div className="flex items-center justify-between p-6 border-b bg-white">
        <div>
          <h2 className="text-xl font-semibold">Recebimentos</h2>
          <p className="text-sm text-gray-500 mt-1">
            {receipts.length} recebimento{receipts.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button 
          onClick={() => setShowForm(true)}
          className="rounded-xl"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Recebimento
        </Button>
      </div>

      <ScrollArea className="flex-1 bg-gray-50">
        <div className="p-6">
          {receipts.length === 0 ? (
            <div className="text-center py-12">
              <PackageCheck className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500">Nenhum recebimento registrado</p>
            </div>
          ) : (
            <div className="border rounded-2xl overflow-hidden bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Recebido Por</TableHead>
                    <TableHead>Itens</TableHead>
                    <TableHead>Divergências</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipts.map((receipt) => {
                    const hasDivergence = receipt.items?.some(i => i.has_divergence);
                    return (
                      <TableRow key={receipt.id}>
                        <TableCell>{new Date(receipt.receipt_date).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {purchaseOrders.find(o => o.id === receipt.purchase_order_id)?.order_number}
                        </TableCell>
                        <TableCell>{receipt.received_by}</TableCell>
                        <TableCell>{receipt.items?.length || 0}</TableCell>
                        <TableCell>
                          {hasDivergence ? (
                            <Badge variant="destructive" className="rounded-full">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Com Divergência
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="rounded-full">OK</Badge>
                          )}
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