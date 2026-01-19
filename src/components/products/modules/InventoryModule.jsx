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
  ClipboardCheck,
  Lock,
  Unlock,
  CheckCircle2
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function InventoryModule() {
  const moduleId = 'inventory';
  
  const [user, setUser] = useState(null);
  const [inventories, setInventories] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [balances, setBalances] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showForm, setShowForm] = useState(false);
  const [editingInventory, setEditingInventory] = useState(null);
  const [formData, setFormData] = useState(getEmptyFormData());

  function getEmptyFormData() {
    return {
      inventory_number: `INV-${Date.now()}`,
      type: "general",
      warehouse_id: "",
      status: "open",
      start_date: new Date().toISOString(),
      responsible_user_email: "",
      movements_frozen: false,
      counts: [],
      notes: ""
    };
  }

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const [allInventories, allWarehouses, allProducts, allBalances] = await Promise.all([
        base44.entities.Inventory.filter({
          company_id: currentUser.company_id,
          is_deleted: { '$ne': true }
        }).catch(() => []),
        base44.entities.Warehouse.filter({
          company_id: currentUser.company_id,
          is_deleted: { '$ne': true }
        }).catch(() => []),
        base44.entities.Product.filter({
          company_id: currentUser.company_id,
          is_deleted: { '$ne': true }
        }).catch(() => []),
        base44.entities.StockBalance.filter({
          company_id: currentUser.company_id
        }).catch(() => [])
      ]);

      setInventories(allInventories || []);
      setWarehouses(allWarehouses || []);
      setProducts(allProducts || []);
      setBalances(allBalances || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartInventory = async () => {
    try {
      const inventoryData = {
        ...formData,
        company_id: user.company_id,
        responsible_user_email: user.email,
        status: 'in_progress',
        movements_frozen: true
      };

      // Buscar produtos do depósito
      const warehouseBalances = balances.filter(b => 
        !formData.warehouse_id || b.warehouse_id === formData.warehouse_id
      );

      inventoryData.counts = warehouseBalances.map(b => ({
        product_id: b.product_id,
        system_quantity: b.available_quantity,
        physical_quantity: 0,
        difference: 0,
        counted_by: "",
        count_date: null,
        adjusted: false
      }));

      await base44.entities.Inventory.create(inventoryData);
      await loadData();
      
      setShowForm(false);
      setFormData(getEmptyFormData());
    } catch (error) {
      console.error("Erro ao iniciar inventário:", error);
    }
  };

  const handleUpdateCount = async (inventoryId, counts) => {
    try {
      const divergences = counts.filter(c => c.difference !== 0).length;
      
      await base44.entities.Inventory.update(inventoryId, {
        counts,
        total_divergences: divergences
      });
      
      await loadData();
    } catch (error) {
      console.error("Erro ao atualizar contagem:", error);
    }
  };

  const handleCompleteInventory = async (inventoryId) => {
    if (window.confirm("Deseja finalizar este inventário e aplicar os ajustes?")) {
      try {
        await base44.entities.Inventory.update(inventoryId, {
          status: 'completed',
          end_date: new Date().toISOString(),
          adjustments_applied: true,
          movements_frozen: false
        });
        
        await loadData();
      } catch (error) {
        console.error("Erro ao finalizar inventário:", error);
      }
    }
  };

  const getWarehouseById = (id) => warehouses.find(w => w.id === id);
  const getProductById = (id) => products.find(p => p.id === id);

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
          <h3 className="font-semibold text-lg">Novo Inventário</h3>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setShowForm(false);
                setFormData(getEmptyFormData());
              }}
              className="rounded-xl"
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button 
              size="sm" 
              onClick={handleStartInventory}
              className="rounded-xl"
            >
              <Lock className="w-4 h-4 mr-2" />
              Iniciar Inventário
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Número</Label>
                <Input
                  value={formData.inventory_number}
                  disabled
                  className="rounded-xl bg-gray-50"
                />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData(prev => ({ ...prev, type: v }))}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="general">Geral</SelectItem>
                    <SelectItem value="partial">Parcial</SelectItem>
                    <SelectItem value="cyclic">Cíclico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Depósito</Label>
                <Select value={formData.warehouse_id || 'all'} onValueChange={(v) => setFormData(prev => ({ ...prev, warehouse_id: v === 'all' ? '' : v }))}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="all">Todos os Depósitos</SelectItem>
                    {warehouses.map(w => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Observações</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
              <p className="text-sm text-blue-900">
                <Lock className="w-4 h-4 inline mr-2" />
                Ao iniciar, as movimentações serão congeladas para contagem precisa
              </p>
            </div>
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col rounded-3xl overflow-hidden">
      <div className="flex items-center justify-between p-6 border-b bg-white">
        <div>
          <h2 className="text-xl font-semibold">Inventários</h2>
          <p className="text-sm text-gray-500 mt-1">
            {inventories.length} inventário{inventories.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button 
          onClick={() => setShowForm(true)}
          className="rounded-xl"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Inventário
        </Button>
      </div>

      <ScrollArea className="flex-1 bg-gray-50">
        <div className="p-6">
          {inventories.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardCheck className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500">Nenhum inventário cadastrado</p>
            </div>
          ) : (
            <div className="border rounded-2xl overflow-hidden bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Depósito</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Divergências</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventories.map((inventory) => {
                    const warehouse = getWarehouseById(inventory.warehouse_id);
                    return (
                      <TableRow key={inventory.id}>
                        <TableCell className="font-mono text-sm">{inventory.inventory_number}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="rounded-full">
                            {inventory.type === 'general' ? 'Geral' :
                             inventory.type === 'partial' ? 'Parcial' :
                             'Cíclico'}
                          </Badge>
                        </TableCell>
                        <TableCell>{warehouse?.name || 'Todos'}</TableCell>
                        <TableCell>{new Date(inventory.start_date).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell>
                          {inventory.total_divergences > 0 ? (
                            <Badge variant="destructive" className="rounded-full">
                              {inventory.total_divergences}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="rounded-full">0</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`rounded-full ${
                              inventory.status === 'open' ? 'bg-gray-100 text-gray-800' :
                              inventory.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                              inventory.status === 'completed' ? 'bg-green-100 text-green-800' :
                              'bg-red-100 text-red-800'
                            }`}
                          >
                            {inventory.status === 'open' ? 'Aberto' :
                             inventory.status === 'in_progress' ? 'Em Andamento' :
                             inventory.status === 'completed' ? 'Concluído' :
                             'Cancelado'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {inventory.status === 'in_progress' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCompleteInventory(inventory.id)}
                              title="Finalizar"
                              className="h-8 w-8 rounded-lg"
                            >
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            </Button>
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