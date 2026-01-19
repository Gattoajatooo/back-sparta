import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
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
import { Button } from "@/components/ui/button";
import { Search, Package, AlertTriangle, TrendingUp, DollarSign, ArrowRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import TransferStockModal from '../TransferStockModal';

export default function StockBalanceModule() {
  const [user, setUser] = useState(null);
  const [balances, setBalances] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("all");
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferringBalance, setTransferringBalance] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const [allBalances, allWarehouses, allProducts] = await Promise.all([
        base44.entities.StockBalance.filter({
          company_id: currentUser.company_id
        }).catch(() => []),
        base44.entities.Warehouse.filter({
          company_id: currentUser.company_id,
          is_deleted: { '$ne': true }
        }).catch(() => []),
        base44.entities.Product.filter({
          company_id: currentUser.company_id,
          is_deleted: { '$ne': true }
        }).catch(() => [])
      ]);

      setBalances(allBalances || []);
      setWarehouses(allWarehouses || []);
      setProducts(allProducts || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getProductById = (id) => products.find(p => p.id === id);
  const getWarehouseById = (id) => warehouses.find(w => w.id === id);

  const filteredBalances = balances.filter(balance => {
    const product = getProductById(balance.product_id);
    const warehouseMatch = selectedWarehouse === 'all' || balance.warehouse_id === selectedWarehouse;
    const searchMatch = product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       product?.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return warehouseMatch && searchMatch;
  });

  const totalValue = filteredBalances.reduce((sum, b) => 
    sum + (b.available_quantity * b.average_cost), 0
  );

  const lowStockCount = filteredBalances.filter(b => {
    const product = getProductById(b.product_id);
    return b.available_quantity < (product?.min_stock || 0);
  }).length;

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

  return (
    <div className="h-full flex flex-col rounded-3xl overflow-hidden">
      <div className="p-6 border-b bg-white space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Saldo de Estoque</h2>
          <p className="text-sm text-gray-500 mt-1">Visão consolidada em tempo real</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <Package className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-gray-600">Produtos</span>
            </div>
            <div className="text-2xl font-bold text-blue-900">{filteredBalances.length}</div>
          </div>
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span className="text-xs text-gray-600">Estoque Baixo</span>
            </div>
            <div className="text-2xl font-bold text-amber-900">{lowStockCount}</div>
          </div>
          <div className="p-4 bg-green-50 rounded-xl border border-green-200">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="text-xs text-gray-600">Valor Total</span>
            </div>
            <div className="text-2xl font-bold text-green-900">
              R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>
          <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Todos os depósitos" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="all">Todos os Depósitos</SelectItem>
              {warehouses.map(w => (
                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <ScrollArea className="flex-1 bg-gray-50">
        <div className="p-6">
          {filteredBalances.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500">Nenhum saldo de estoque encontrado</p>
            </div>
          ) : (
            <div className="border rounded-2xl overflow-hidden bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Depósito</TableHead>
                    <TableHead className="text-right">Disponível</TableHead>
                    <TableHead className="text-right">Reservado</TableHead>
                    <TableHead className="text-right">Trânsito</TableHead>
                    <TableHead className="text-right">Custo Médio</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBalances.map((balance) => {
                    const product = getProductById(balance.product_id);
                    const warehouse = getWarehouseById(balance.warehouse_id);
                    const totalValue = balance.available_quantity * balance.average_cost;
                    const isLowStock = balance.available_quantity < (product?.min_stock || 0);

                    return (
                      <TableRow key={balance.id} className={isLowStock ? 'bg-amber-50' : ''}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {product?.main_image && (
                              <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                                <img
                                  src={product.main_image}
                                  alt={product.name}
                                  className="max-w-full max-h-full object-contain"
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium">{product?.name}</div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {product?.sku && <span className="font-mono">{product.sku}</span>}
                                {product?.sku && product?.ean && <span className="mx-1">•</span>}
                                {product?.ean && <span>{product.ean}</span>}
                              </div>
                              {isLowStock && (
                                <div className="flex items-center gap-1 mt-1">
                                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                                  <span className="text-xs text-amber-600">Estoque baixo</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{warehouse?.name}</TableCell>
                        <TableCell className="text-right font-medium">{balance.available_quantity}</TableCell>
                        <TableCell className="text-right text-gray-600">{balance.reserved_quantity}</TableCell>
                        <TableCell className="text-right text-blue-600">{balance.in_transit_quantity}</TableCell>
                        <TableCell className="text-right">
                          R$ {balance.average_cost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setTransferringBalance(balance);
                              setShowTransferModal(true);
                            }}
                            disabled={balance.available_quantity === 0}
                            className="rounded-lg"
                          >
                            <ArrowRight className="w-4 h-4 mr-1" />
                            Transferir
                          </Button>
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

      {/* Modal de Transferência */}
      {showTransferModal && transferringBalance && (
        <TransferStockModal
          open={showTransferModal}
          onClose={() => {
            setShowTransferModal(false);
            setTransferringBalance(null);
          }}
          balance={transferringBalance}
          product={getProductById(transferringBalance.product_id)}
          warehouses={warehouses}
          onSuccess={() => {
            loadData();
          }}
        />
      )}
    </div>
  );
}