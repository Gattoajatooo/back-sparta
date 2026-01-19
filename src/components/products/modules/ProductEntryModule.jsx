import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
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
  Trash2, 
  PackageCheck,
  Save,
  X,
  ShoppingBag,
  TrendingUp,
  Edit
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import SearchableProductSelect from "../SearchableProductSelect";
import EntryDetailsModal from "../EntryDetailsModal";

export default function ProductEntryModule() {
  const moduleId = 'product-entry';
  
  const [user, setUser] = useState(null);
  const [entries, setEntries] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [showForm, setShowForm] = useState(() => {
    const saved = localStorage.getItem(`${moduleId}_showForm`);
    return saved === 'true';
  });

  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem(`${moduleId}_formData`);
    return saved ? JSON.parse(saved) : getEmptyFormData();
  });

  function getEmptyFormData() {
    return {
      warehouse_id: "",
      items: [],
      notes: ""
    };
  }

  const [itemForm, setItemForm] = useState({
    product_id: "",
    quantity: "",
    cost_price: "",
    sale_price: "",
    warehouse_id: ""
  });

  const [balances, setBalances] = useState([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [viewingEntry, setViewingEntry] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    localStorage.setItem(`${moduleId}_showForm`, showForm);
  }, [showForm]);

  useEffect(() => {
    localStorage.setItem(`${moduleId}_formData`, JSON.stringify(formData));
  }, [formData]);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const [allProducts, allWarehouses, allMovements, allBalances, allUsers] = await Promise.all([
        base44.entities.Product.filter({
          company_id: currentUser.company_id,
          is_deleted: { '$ne': true },
          status: 'active'
        }).catch(() => []),
        base44.entities.Warehouse.filter({
          company_id: currentUser.company_id,
          is_deleted: { '$ne': true },
          status: 'active',
          allows_item_entry: true
        }).catch(() => []),
        base44.entities.StockMovement.filter({
          company_id: currentUser.company_id,
          movement_type: 'in',
          is_deleted: { '$ne': true }
        }).catch(() => []),
        base44.entities.StockBalance.filter({
          company_id: currentUser.company_id
        }).catch(() => []),
        base44.entities.User.filter({
          company_id: currentUser.company_id
        }).catch(() => [])
      ]);

      setProducts(allProducts || []);
      setWarehouses(allWarehouses || []);
      setBalances(allBalances || []);
      setUsers(allUsers || []);
      
      // Agrupar movimentos por data/documento para criar "entradas"
      const groupedEntries = [];
      const movementsByRef = {};
      
      allMovements.forEach(mov => {
        const key = `${mov.movement_date}_${mov.reference_id || 'manual'}`;
        if (!movementsByRef[key]) {
          movementsByRef[key] = {
            id: key,
            date: mov.movement_date,
            items: [],
            notes: mov.notes || ""
          };
        }
        movementsByRef[key].items.push(mov);
      });
      
      setEntries(Object.values(movementsByRef).sort((a, b) => 
        new Date(b.date) - new Date(a.date)
      ));

    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      setProducts([]);
      setWarehouses([]);
      setBalances([]);
      setEntries([]);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddItem = () => {
    if (!itemForm.product_id || !itemForm.quantity || itemForm.quantity <= 0) {
      alert("Selecione um produto e informe a quantidade");
      return;
    }

    const product = products.find(p => p.id === itemForm.product_id);
    if (!product) return;

    // Usar warehouse_id do item ou do formulário principal
    const warehouseId = itemForm.warehouse_id || formData.warehouse_id;

    // Calcular estoque total em todos os depósitos vendáveis
    const productBalances = balances.filter(b => b.product_id === itemForm.product_id);
    const totalCurrentQty = productBalances.reduce((acc, b) => acc + (b.available_quantity || 0), 0);
    const totalCurrentValue = productBalances.reduce((acc, b) => 
      acc + ((b.available_quantity || 0) * (b.average_cost || 0)), 0
    );
    const currentAvgCost = totalCurrentQty > 0 ? totalCurrentValue / totalCurrentQty : 0;

    const newQty = parseFloat(itemForm.quantity);
    const newCost = itemForm.cost_price ? parseFloat(itemForm.cost_price) : (product.cost_price || 0);

    // Calcular custo médio ponderado global
    const totalQtyAfter = totalCurrentQty + newQty;
    const newAvgCost = totalQtyAfter > 0 
      ? ((totalCurrentQty * currentAvgCost) + (newQty * newCost)) / totalQtyAfter
      : newCost;

    // Calcular margem
    const salePrice = itemForm.sale_price ? parseFloat(itemForm.sale_price) : product.sale_price;
    const margin = (salePrice && newCost) ? ((salePrice - newCost) / newCost * 100) : null;

    const newItem = {
      id: Date.now(),
      product_id: itemForm.product_id,
      product_name: product.name,
      product_sku: product.sku,
      product_image: product.main_image,
      quantity: newQty,
      cost_price: newCost,
      sale_price: salePrice || null,
      warehouse_id: warehouseId,
      current_qty: totalCurrentQty,
      current_avg_cost: currentAvgCost,
      new_avg_cost: newAvgCost,
      margin_percent: margin
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));

    // Limpar formulário de item
    setItemForm({
      product_id: "",
      quantity: "",
      cost_price: "",
      sale_price: "",
      warehouse_id: ""
    });
  };

  const handleRemoveItem = (itemId) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
  };

  const handleDeleteEntry = async (entry) => {
    setEntryToDelete(entry);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteEntry = async () => {
    if (!entryToDelete) return;
    
    try {
      // Deletar todos os movimentos desta entrada
      for (const item of entryToDelete.items) {
        await base44.entities.StockMovement.update(item.id, {
          is_deleted: true
        });

        // Reverter saldo de estoque
        const warehouseId = item.warehouse_id || formData.warehouse_id;
        const existingBalance = await base44.entities.StockBalance.filter({
          company_id: user.company_id,
          product_id: item.product_id,
          warehouse_id: warehouseId
        });

        if (existingBalance.length > 0) {
          const balance = existingBalance[0];
          await base44.entities.StockBalance.update(balance.id, {
            available_quantity: Math.max(0, (balance.available_quantity || 0) - item.quantity)
          });
        }
      }

      setShowDeleteConfirm(false);
      setEntryToDelete(null);
      setShowDetailsModal(false);
      await loadData();
    } catch (error) {
      console.error("Erro ao excluir entrada:", error);
      alert("Erro ao excluir entrada");
    }
  };

  const handleSubmit = async () => {
    try {
      if (!formData.warehouse_id) {
        alert("Selecione um depósito");
        return;
      }

      if (formData.items.length === 0) {
        alert("Adicione pelo menos um produto");
        return;
      }

      setIsProcessing(true);

      // Usar data e hora atual
      const entryDate = new Date();
      const referenceId = editingEntry ? editingEntry.id : `ENTRY_${Date.now()}`;

      // Criar ou atualizar movimentos de estoque para cada item
      for (const item of formData.items) {
        const warehouseId = item.warehouse_id || formData.warehouse_id;

        if (editingEntry && item.original_movement_id) {
          // Atualizar movimento existente
          await base44.entities.StockMovement.update(item.original_movement_id, {
            quantity: item.quantity,
            unit_cost: item.cost_price,
            notes: formData.notes
          });
        } else {
          // Criar novo movimento
          await base44.entities.StockMovement.create({
            company_id: user.company_id,
            product_id: item.product_id,
            movement_type: 'in',
            movement_date: entryDate.toISOString(),
            quantity: item.quantity,
            unit_cost: item.cost_price,
            reference_type: 'adjustment',
            reference_id: referenceId,
            user_email: user.email,
            notes: formData.notes
          });
        }

        // Atualizar saldo de estoque com custo médio ponderado
        const existingBalance = await base44.entities.StockBalance.filter({
          company_id: user.company_id,
          product_id: item.product_id,
          warehouse_id: warehouseId
        });

        if (existingBalance.length > 0) {
          const balance = existingBalance[0];
          await base44.entities.StockBalance.update(balance.id, {
            available_quantity: (balance.available_quantity || 0) + item.quantity,
            average_cost: item.new_avg_cost || balance.average_cost,
            last_movement_date: entryDate.toISOString(),
            last_cost_update: entryDate.toISOString()
          });
        } else {
          await base44.entities.StockBalance.create({
            company_id: user.company_id,
            product_id: item.product_id,
            warehouse_id: warehouseId,
            available_quantity: item.quantity,
            average_cost: item.cost_price || 0,
            last_movement_date: entryDate.toISOString(),
            last_cost_update: entryDate.toISOString()
          });
        }

        // Atualizar preços no produto se informados
        if (item.cost_price || item.sale_price) {
          const product = products.find(p => p.id === item.product_id);
          const updateData = {};
          
          if (item.cost_price) updateData.cost_price = item.cost_price;
          if (item.sale_price) updateData.sale_price = item.sale_price;
          
          // Adicionar ao histórico de preços
          if (product) {
            updateData.price_history = [
              ...(product.price_history || []),
              {
                date: entryDate.toISOString(),
                cost_price: item.cost_price,
                sale_price: item.sale_price,
                changed_by: user.email
              }
            ];
          }

          await base44.entities.Product.update(item.product_id, updateData);
        }
      }

      await loadData();
      
      // Limpar localStorage
      localStorage.removeItem(`${moduleId}_showForm`);
      localStorage.removeItem(`${moduleId}_formData`);
      
      setShowForm(false);
      setEditingEntry(null);
      setFormData(getEmptyFormData());
      setItemForm({
        product_id: "",
        quantity: "",
        cost_price: "",
        sale_price: "",
        warehouse_id: ""
      });
    } catch (error) {
      console.error("Erro ao salvar entrada:", error);
      alert("Erro ao processar entrada de produtos");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredEntries = entries.filter(entry =>
    entry.items.some(item => {
      const product = products.find(p => p.id === item.product_id);
      return product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
             product?.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    })
  );

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
          <h3 className="font-semibold text-lg">{editingEntry ? 'Editar' : 'Nova'} Entrada de Produtos</h3>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                localStorage.removeItem(`${moduleId}_showForm`);
                localStorage.removeItem(`${moduleId}_formData`);
                setShowForm(false);
                setEditingEntry(null);
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
              disabled={isProcessing}
              className="transition-all active:scale-95 rounded-xl relative overflow-hidden"
            >
              {isProcessing && (
                <div className="absolute inset-0 bg-blue-700 animate-pulse"></div>
              )}
              <Save className={`w-4 h-4 mr-2 relative z-10 ${isProcessing ? 'animate-bounce' : ''}`} />
              <span className="relative z-10">
                {isProcessing ? 'Processando...' : 'Processar Entrada'}
              </span>
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {/* Cabeçalho da Entrada */}
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base">Informações da Entrada</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Depósito de Destino *</Label>
                    <Select 
                      value={formData.warehouse_id} 
                      onValueChange={(v) => handleInputChange('warehouse_id', v)}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Selecione o depósito" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        {warehouses.map(w => (
                          <SelectItem key={w.id} value={w.id} className="rounded-lg">
                            {w.name} ({w.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Observações</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      placeholder="Observações sobre esta entrada..."
                      rows={2}
                      className="rounded-xl"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Adicionar Produto */}
            {!editingEntry && (
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-base">Adicionar Produto</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                    <div className="sm:col-span-2">
                      <Label>Produto *</Label>
                      <SearchableProductSelect
                        products={products}
                        value={itemForm.product_id}
                        onValueChange={(v) => {
                          setItemForm(prev => ({ ...prev, product_id: v }));
                          const product = products.find(p => p.id === v);
                          if (product) {
                            setItemForm(prev => ({
                              ...prev,
                              cost_price: product.cost_price || "",
                              sale_price: product.sale_price || ""
                            }));
                          }
                        }}
                        placeholder="Selecione o produto"
                      />
                    </div>
                    <div>
                      <Label>Depósito</Label>
                      <Select 
                        value={itemForm.warehouse_id || formData.warehouse_id} 
                        onValueChange={(v) => setItemForm(prev => ({ ...prev, warehouse_id: v }))}
                      >
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Padrão" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
                          {warehouses.map(w => (
                            <SelectItem key={w.id} value={w.id} className="rounded-lg">
                              {w.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Qtd *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={itemForm.quantity}
                        onChange={(e) => setItemForm(prev => ({ ...prev, quantity: e.target.value }))}
                        placeholder="0"
                        className="rounded-xl"
                      />
                    </div>
                    <div>
                      <Label>Custo (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={itemForm.cost_price}
                        onChange={(e) => setItemForm(prev => ({ ...prev, cost_price: e.target.value }))}
                        placeholder="0.00"
                        className="rounded-xl"
                      />
                    </div>
                    <div>
                      <Label>Venda (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={itemForm.sale_price}
                        onChange={(e) => setItemForm(prev => ({ ...prev, sale_price: e.target.value }))}
                        placeholder="0.00"
                        className="rounded-xl"
                      />
                    </div>
                  </div>

                  {/* Preview do Custo Médio */}
                  {itemForm.product_id && itemForm.quantity && itemForm.cost_price && (
                    <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center border">
                          <TrendingUp className="w-3 h-3 text-gray-600" />
                        </div>
                        <span className="text-sm font-semibold text-gray-700">Custo Médio Ponderado (Todos os Depósitos)</span>
                      </div>
                      {(() => {
                        const productBalances = balances.filter(b => b.product_id === itemForm.product_id);
                        const totalCurrentQty = productBalances.reduce((acc, b) => acc + (b.available_quantity || 0), 0);
                        const totalCurrentValue = productBalances.reduce((acc, b) => 
                          acc + ((b.available_quantity || 0) * (b.average_cost || 0)), 0
                        );
                        const currentAvgCost = totalCurrentQty > 0 ? totalCurrentValue / totalCurrentQty : 0;
                        const newQty = parseFloat(itemForm.quantity);
                        const newCost = parseFloat(itemForm.cost_price);
                        const totalQtyAfter = totalCurrentQty + newQty;
                        const newAvgCost = totalQtyAfter > 0 
                          ? ((totalCurrentQty * currentAvgCost) + (newQty * newCost)) / totalQtyAfter
                          : newCost;

                        return (
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="bg-white border rounded-lg p-2">
                              <div className="text-gray-500 mb-1">Estoque Atual</div>
                              <div className="font-mono font-semibold text-gray-900">
                                {totalCurrentQty.toFixed(2)} un
                              </div>
                              <div className="text-gray-500 mt-1">
                                R$ {currentAvgCost.toFixed(2)}
                              </div>
                            </div>
                            <div className="bg-white border rounded-lg p-2">
                              <div className="text-gray-500 mb-1">+ Entrada</div>
                              <div className="font-mono font-semibold text-gray-900">
                                {newQty.toFixed(2)} un
                              </div>
                              <div className="text-gray-500 mt-1">
                                R$ {newCost.toFixed(2)}
                              </div>
                            </div>
                            <div className="bg-gray-900 text-white rounded-lg p-2">
                              <div className="text-gray-300 mb-1">= Novo Médio</div>
                              <div className="font-mono font-bold">
                                {totalQtyAfter.toFixed(2)} un
                              </div>
                              <div className="text-gray-300 mt-1 font-semibold">
                                R$ {newAvgCost.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  <Button
                    onClick={handleAddItem}
                    className="w-full mt-4 rounded-xl"
                    variant="outline"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar à Lista
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Itens Adicionados */}
            {formData.items.length > 0 && (
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-base">Itens da Entrada ({formData.items.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {formData.items.map((item, index) => (
                    <Card key={item.id} className="rounded-2xl border-gray-200">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          {/* Imagem e Nome do Produto */}
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {item.product_image ? (
                              <img 
                                src={item.product_image} 
                                alt={item.product_name}
                                className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                <ShoppingBag className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-medium text-sm truncate">{item.product_name}</div>
                              {item.product_sku && (
                                <div className="text-xs text-gray-500 font-mono">{item.product_sku}</div>
                              )}
                            </div>
                          </div>

                          {/* Campos editáveis em modo de edição */}
                          {editingEntry ? (
                            <div className="flex items-center gap-3">
                              <div className="w-24">
                                <Label className="text-xs text-gray-600">Qtd</Label>
                                <Input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const newQty = parseFloat(e.target.value) || 0;
                                    const updatedItems = [...formData.items];
                                    updatedItems[index] = { ...item, quantity: newQty };
                                    setFormData({ ...formData, items: updatedItems });
                                  }}
                                  className="rounded-xl h-9"
                                />
                              </div>
                              <div className="w-28">
                                <Label className="text-xs text-gray-600">Custo</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={item.cost_price}
                                  onChange={(e) => {
                                    const newCost = parseFloat(e.target.value) || 0;
                                    const updatedItems = [...formData.items];
                                    updatedItems[index] = { ...item, cost_price: newCost };
                                    setFormData({ ...formData, items: updatedItems });
                                  }}
                                  className="rounded-xl h-9"
                                />
                              </div>
                              <div className="w-32">
                                <Label className="text-xs text-gray-600">Depósito</Label>
                                <Select
                                  value={item.warehouse_id || formData.warehouse_id}
                                  onValueChange={(value) => {
                                    const updatedItems = [...formData.items];
                                    updatedItems[index] = { ...item, warehouse_id: value };
                                    setFormData({ ...formData, items: updatedItems });
                                  }}
                                >
                                  <SelectTrigger className="rounded-xl h-9">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-2xl">
                                    {warehouses.map(w => (
                                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveItem(item.id)}
                                className="rounded-lg h-9 w-9 flex-shrink-0"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="text-xs text-gray-500">Qtd</div>
                                <div className="font-semibold">{item.quantity}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-gray-500">Custo</div>
                                <div className="font-semibold">R$ {item.cost_price?.toFixed(2)}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-gray-500">Total</div>
                                <div className="font-semibold text-green-600">
                                  R$ {(item.quantity * item.cost_price).toFixed(2)}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveItem(item.id)}
                                className="rounded-lg"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Total Geral:</span>
                      <span className="text-xl font-bold text-green-600">
                        R$ {formData.items.reduce((acc, item) => 
                          acc + (item.quantity * (item.cost_price || 0)), 0
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
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
          <h2 className="text-xl font-semibold">Entrada de Produtos</h2>
          <p className="text-sm text-gray-500 mt-1">
            {filteredEntries.length} entrada{filteredEntries.length !== 1 ? 's' : ''} registrada{filteredEntries.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button 
          onClick={() => setShowForm(true)}
          className="transition-all active:scale-95 rounded-xl"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Entrada
        </Button>
      </div>

      {/* Search */}
      <div className="px-6 py-4 border-b bg-white">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar por produto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>
      </div>

      {/* Entries List */}
      <ScrollArea className="flex-1 bg-gray-50">
        <div className="p-6">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-12">
              <PackageCheck className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500">Nenhuma entrada registrada</p>
              <Button 
                variant="link" 
                onClick={() => setShowForm(true)}
                className="transition-all active:scale-95"
              >
                Registrar primeira entrada
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEntries.map((entry) => {
                const entryUser = users.find(u => u.email === entry.items[0]?.user_email);
                const totalValue = entry.items.reduce((acc, item) => 
                  acc + (item.quantity * (item.unit_cost || 0)), 0
                );
                
                return (
                  <Card 
                    key={entry.id} 
                    className="rounded-2xl hover:shadow-lg transition-shadow"
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between gap-4">
                        <div 
                          className="flex-1 cursor-pointer"
                          onClick={() => {
                            setViewingEntry(entry);
                            setShowDetailsModal(true);
                          }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <CardTitle className="text-base">
                              Entrada - {format(new Date(entry.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </CardTitle>
                            <Badge variant="secondary" className="rounded-full">
                              {entry.items.length} item{entry.items.length !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {entryUser && (
                                <>
                                  <img 
                                    src={entryUser.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(entryUser.full_name)}&background=random`}
                                    alt={entryUser.full_name}
                                    className="w-5 h-5 rounded-full border"
                                  />
                                  <span className="text-xs text-gray-500">{entryUser.full_name}</span>
                                </>
                              )}
                            </div>
                            <div className="font-semibold text-green-600">
                              R$ {totalValue.toFixed(2)}
                            </div>
                          </div>
                          {entry.notes && (
                            <p className="text-sm text-gray-500 mt-2">{entry.notes}</p>
                          )}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingEntry(entry);
                              setShowDetailsModal(true);
                            }}
                            className="rounded-lg h-8 w-8"
                          >
                            <PackageCheck className="w-4 h-4 text-gray-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              
                              // Verificar se pode editar
                              const entryDate = new Date(entry.date);
                              const now = new Date();
                              const daysDiff = Math.floor((now - entryDate) / (1000 * 60 * 60 * 24));
                              
                              if (daysDiff > 7) {
                                alert('Esta entrada foi registrada há mais de 7 dias e não pode mais ser editada.');
                                return;
                              }
                              
                              setEditingEntry(entry);
                              setFormData({
                                warehouse_id: entry.items[0]?.warehouse_id || "",
                                items: entry.items.map(item => {
                                  const product = products.find(p => p.id === item.product_id);
                                  const productBalances = balances.filter(b => b.product_id === item.product_id);
                                  const totalCurrentQty = productBalances.reduce((acc, b) => acc + (b.available_quantity || 0), 0);
                                  const totalCurrentValue = productBalances.reduce((acc, b) => 
                                    acc + ((b.available_quantity || 0) * (b.average_cost || 0)), 0
                                  );
                                  const currentAvgCost = totalCurrentQty > 0 ? totalCurrentValue / totalCurrentQty : 0;
                                  
                                  return {
                                    id: item.id,
                                    product_id: item.product_id,
                                    product_name: product?.name || 'Produto não encontrado',
                                    product_sku: product?.sku,
                                    product_image: product?.main_image,
                                    quantity: item.quantity,
                                    cost_price: item.unit_cost,
                                    sale_price: product?.sale_price,
                                    warehouse_id: item.warehouse_id,
                                    current_qty: totalCurrentQty - item.quantity,
                                    current_avg_cost: currentAvgCost,
                                    new_avg_cost: currentAvgCost,
                                    margin_percent: product?.sale_price && item.unit_cost 
                                      ? ((product.sale_price - item.unit_cost) / item.unit_cost * 100) 
                                      : null,
                                    original_movement_id: item.id
                                  };
                                }),
                                notes: entry.notes || ""
                              });
                              
                              setShowForm(true);
                            }}
                            className="rounded-lg h-8 w-8"
                          >
                            <Edit className="w-4 h-4 text-gray-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteEntry(entry);
                            }}
                            className="rounded-lg h-8 w-8 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="border rounded-xl overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Produto</TableHead>
                              <TableHead className="text-right">Qtd</TableHead>
                              <TableHead className="text-right">Custo Unit.</TableHead>
                              <TableHead className="text-right">Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {entry.items.slice(0, 3).map((item, idx) => {
                              const product = products.find(p => p.id === item.product_id);
                              return (
                                <TableRow key={idx}>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      {product?.main_image ? (
                                        <img 
                                          src={product.main_image} 
                                          alt={product.name}
                                          className="w-8 h-8 rounded-lg object-cover"
                                        />
                                      ) : (
                                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                                          <ShoppingBag className="w-4 h-4 text-gray-400" />
                                        </div>
                                      )}
                                      <div>
                                        <div className="font-medium">{product?.name || 'Produto não encontrado'}</div>
                                        {product?.sku && (
                                          <div className="text-xs text-gray-500 font-mono">{product.sku}</div>
                                        )}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">{item.quantity}</TableCell>
                                  <TableCell className="text-right">
                                    {item.unit_cost ? `R$ ${item.unit_cost.toFixed(2)}` : '-'}
                                  </TableCell>
                                  <TableCell className="text-right font-semibold">
                                    {item.unit_cost ? `R$ ${(item.quantity * item.unit_cost).toFixed(2)}` : '-'}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                            {entry.items.length > 3 && (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center text-sm text-gray-500">
                                  + {entry.items.length - 3} item{entry.items.length - 3 !== 1 ? 's' : ''} adiciona{entry.items.length - 3 !== 1 ? 'is' : 'l'}
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Modal de Detalhes */}
      <EntryDetailsModal
        open={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setViewingEntry(null);
        }}
        entry={viewingEntry}
        products={products}
        warehouses={warehouses}
        users={users}
        onEdit={(entry) => {
          setShowDetailsModal(false);
          setEditingEntry(entry);
          
          // Preencher formulário com dados da entrada
          setFormData({
            warehouse_id: entry.items[0]?.warehouse_id || "",
            items: entry.items.map(item => {
              const product = products.find(p => p.id === item.product_id);
              const productBalances = balances.filter(b => b.product_id === item.product_id);
              const totalCurrentQty = productBalances.reduce((acc, b) => acc + (b.available_quantity || 0), 0);
              const totalCurrentValue = productBalances.reduce((acc, b) => 
                acc + ((b.available_quantity || 0) * (b.average_cost || 0)), 0
              );
              const currentAvgCost = totalCurrentQty > 0 ? totalCurrentValue / totalCurrentQty : 0;
              
              return {
                id: item.id,
                product_id: item.product_id,
                product_name: product?.name || 'Produto não encontrado',
                product_sku: product?.sku,
                product_image: product?.main_image,
                quantity: item.quantity,
                cost_price: item.unit_cost,
                sale_price: product?.sale_price,
                warehouse_id: item.warehouse_id,
                current_qty: totalCurrentQty - item.quantity,
                current_avg_cost: currentAvgCost,
                new_avg_cost: currentAvgCost,
                margin_percent: product?.sale_price && item.unit_cost 
                  ? ((product.sale_price - item.unit_cost) / item.unit_cost * 100) 
                  : null,
                original_movement_id: item.id
              };
            }),
            notes: entry.notes || ""
          });
          
          setShowForm(true);
        }}
        onDelete={handleDeleteEntry}
      />

      {/* Confirmação de Exclusão */}
      {showDeleteConfirm && entryToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-3xl p-6 max-w-md mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Excluir Entrada</h3>
                <p className="text-sm text-gray-500">
                  {format(new Date(entryToDelete.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja excluir esta entrada? Esta ação não pode ser desfeita e reverterá os estoques.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setEntryToDelete(null);
                }}
                className="flex-1 rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmDeleteEntry}
                className="flex-1 bg-red-600 hover:bg-red-700 rounded-xl"
              >
                Excluir
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}