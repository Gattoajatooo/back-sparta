import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2,
  Save,
  X,
  Building2
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import WarehouseDeleteModal from '../WarehouseDeleteModal';

export default function WarehousesModule() {
  const moduleId = 'warehouses';
  
  const [user, setUser] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [showForm, setShowForm] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [formData, setFormData] = useState(getEmptyFormData());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingWarehouse, setDeletingWarehouse] = useState(null);

  function getEmptyFormData() {
    return {
      code: "",
      name: "",
      type: "main",
      allows_sale: true,
      allows_item_entry: true,
      status: "active",
      address: {
        street: "",
        number: "",
        complement: "",
        neighborhood: "",
        city: "",
        state: "",
        zip_code: ""
      },
      is_active: true
    };
  }

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const allWarehouses = await base44.entities.Warehouse.filter({
        company_id: currentUser.company_id,
        is_deleted: { '$ne': true }
      }).catch(() => []);

      setWarehouses(allWarehouses || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const warehouseData = {
        ...formData,
        company_id: user.company_id
      };

      if (editingWarehouse) {
        await base44.entities.Warehouse.update(editingWarehouse.id, warehouseData);
      } else {
        await base44.entities.Warehouse.create(warehouseData);
      }

      await loadData();
      setShowForm(false);
      setEditingWarehouse(null);
      setFormData(getEmptyFormData());
    } catch (error) {
      console.error("Erro ao salvar depósito:", error);
    }
  };

  const handleEdit = (warehouse) => {
    setEditingWarehouse(warehouse);
    setFormData({ ...getEmptyFormData(), ...warehouse });
    setShowForm(true);
  };

  const handleDelete = (warehouse) => {
    setDeletingWarehouse(warehouse);
    setShowDeleteModal(true);
  };

  const filteredWarehouses = warehouses.filter(w =>
    w.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.code?.toLowerCase().includes(searchTerm.toLowerCase())
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
            {editingWarehouse ? 'Editar Depósito' : 'Novo Depósito'}
          </h3>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setShowForm(false);
                setEditingWarehouse(null);
                setFormData(getEmptyFormData());
              }}
              className="rounded-xl"
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button 
              size="sm" 
              onClick={handleSubmit}
              className="rounded-xl"
            >
              <Save className="w-4 h-4 mr-2" />
              Salvar
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Código *</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="Ex: DEP01"
                  className="rounded-xl"
                />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData(prev => ({ ...prev, type: v }))}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="main">Principal</SelectItem>
                    <SelectItem value="branch">Filial</SelectItem>
                    <SelectItem value="consignment">Consignado</SelectItem>
                    <SelectItem value="third_party">Terceiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Nome *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Depósito Central"
                  className="rounded-xl"
                />
              </div>
              <div className="col-span-2 flex items-center justify-between p-4 border rounded-xl">
                <Label>Permite Venda?</Label>
                <Switch
                  checked={formData.allows_sale}
                  onCheckedChange={(v) => setFormData(prev => ({ ...prev, allows_sale: v }))}
                />
              </div>
              <div className="col-span-2 flex items-center justify-between p-4 border rounded-xl">
                <Label>Permite Entrada de Itens?</Label>
                <Switch
                  checked={formData.allows_item_entry !== false}
                  onCheckedChange={(v) => setFormData(prev => ({ ...prev, allows_item_entry: v }))}
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="pt-4 border-t">
              <Label className="text-base font-semibold mb-3 block">Endereço</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">CEP</Label>
                  <Input
                    value={formData.address?.zip_code || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      address: { ...prev.address, zip_code: e.target.value } 
                    }))}
                    className="rounded-xl"
                  />
                </div>
                <div></div>
                <div className="col-span-2">
                  <Label className="text-xs">Logradouro</Label>
                  <Input
                    value={formData.address?.street || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      address: { ...prev.address, street: e.target.value } 
                    }))}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-xs">Número</Label>
                  <Input
                    value={formData.address?.number || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      address: { ...prev.address, number: e.target.value } 
                    }))}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-xs">Complemento</Label>
                  <Input
                    value={formData.address?.complement || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      address: { ...prev.address, complement: e.target.value } 
                    }))}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-xs">Bairro</Label>
                  <Input
                    value={formData.address?.neighborhood || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      address: { ...prev.address, neighborhood: e.target.value } 
                    }))}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-xs">Cidade</Label>
                  <Input
                    value={formData.address?.city || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      address: { ...prev.address, city: e.target.value } 
                    }))}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-xs">UF</Label>
                  <Input
                    value={formData.address?.state || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      address: { ...prev.address, state: e.target.value } 
                    }))}
                    maxLength={2}
                    className="rounded-xl"
                  />
                </div>
              </div>
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
          <h2 className="text-xl font-semibold">Depósitos</h2>
          <p className="text-sm text-gray-500 mt-1">
            {filteredWarehouses.length} depósito{filteredWarehouses.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button 
          onClick={() => setShowForm(true)}
          className="rounded-xl"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Depósito
        </Button>
      </div>

      <div className="px-6 py-4 border-b bg-white">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar depósito..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 bg-gray-50">
        <div className="p-6">
          {filteredWarehouses.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500">Nenhum depósito cadastrado</p>
              <Button 
                variant="link" 
                onClick={() => setShowForm(true)}
              >
                Cadastrar primeiro depósito
              </Button>
            </div>
          ) : (
            <div className="border rounded-2xl overflow-hidden bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Permite Venda</TableHead>
                    <TableHead>Permite Entrada</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWarehouses.map((warehouse) => (
                    <TableRow key={warehouse.id}>
                      <TableCell className="font-mono text-sm">{warehouse.code}</TableCell>
                      <TableCell className="font-medium">{warehouse.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="rounded-full">
                          {warehouse.type === 'main' ? 'Principal' :
                           warehouse.type === 'branch' ? 'Filial' :
                           warehouse.type === 'consignment' ? 'Consignado' :
                           'Terceiro'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {warehouse.allows_sale ? (
                          <Badge className="bg-green-100 text-green-800 rounded-full">Sim</Badge>
                        ) : (
                          <Badge variant="secondary" className="rounded-full">Não</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {warehouse.allows_item_entry !== false ? (
                          <Badge className="bg-blue-100 text-blue-800 rounded-full">Sim</Badge>
                        ) : (
                          <Badge variant="secondary" className="rounded-full">Não</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={warehouse.status === 'active' ? 'default' : 'secondary'}
                          className="rounded-full"
                        >
                          {warehouse.status === 'active' ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(warehouse)}
                            className="rounded-lg"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(warehouse)}
                            className="rounded-lg"
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

      {/* Modal de Exclusão com Transferência */}
      {showDeleteModal && deletingWarehouse && (
        <WarehouseDeleteModal
          open={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setDeletingWarehouse(null);
          }}
          warehouse={deletingWarehouse}
          availableWarehouses={warehouses.filter(w => w.id !== deletingWarehouse.id)}
          onSuccess={() => {
            loadData();
          }}
        />
      )}
    </div>
  );
}