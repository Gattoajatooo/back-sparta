import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  Building2,
  Package,
  ArrowRight,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export default function WarehouseDeleteModal({ 
  open, 
  onClose, 
  warehouse, 
  availableWarehouses,
  onSuccess 
}) {
  const [balances, setBalances] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [targetWarehouseId, setTargetWarehouseId] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferProgress, setTransferProgress] = useState({
    total: 0,
    processed: 0,
    successful: 0,
    failed: 0,
    failedItems: []
  });

  useEffect(() => {
    if (open && warehouse) {
      loadWarehouseStock();
    }
  }, [open, warehouse]);

  const loadWarehouseStock = async () => {
    setIsLoading(true);
    try {
      const [allBalances, allProducts] = await Promise.all([
        base44.entities.StockBalance.filter({
          warehouse_id: warehouse.id,
          available_quantity: { '$gt': 0 }
        }),
        base44.entities.Product.filter({
          company_id: warehouse.company_id,
          is_deleted: { '$ne': true }
        })
      ]);

      setBalances(allBalances || []);
      setProducts(allProducts || []);

      // Auto-selecionar primeiro depósito disponível se houver
      if (availableWarehouses.length > 0 && !targetWarehouseId) {
        setTargetWarehouseId(availableWarehouses[0].id);
      }
    } catch (error) {
      console.error("Erro ao carregar estoque:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getProductById = (id) => products.find(p => p.id === id);

  const handleTransferAll = async () => {
    if (!targetWarehouseId) return;

    setIsTransferring(true);
    setTransferProgress({
      total: balances.length,
      processed: 0,
      successful: 0,
      failed: 0,
      failedItems: []
    });

    const failedQueue = [];

    for (let i = 0; i < balances.length; i++) {
      const balance = balances[i];
      let success = false;
      let retries = 0;
      const maxRetries = 3;

      while (!success && retries < maxRetries) {
        try {
          // Criar movimento de transferência
          await base44.entities.StockMovement.create({
            company_id: warehouse.company_id,
            product_id: balance.product_id,
            source_warehouse_id: warehouse.id,
            destination_warehouse_id: targetWarehouseId,
            quantity: balance.available_quantity,
            movement_type: 'transfer',
            status: 'completed',
            notes: `Transferência automática devido exclusão do depósito ${warehouse.name}`
          });

          // Atualizar saldo de origem
          await base44.entities.StockBalance.update(balance.id, {
            available_quantity: 0,
            physical_quantity: balance.physical_quantity - balance.available_quantity
          });

          // Atualizar ou criar saldo de destino
          const targetBalances = await base44.entities.StockBalance.filter({
            warehouse_id: targetWarehouseId,
            product_id: balance.product_id
          });

          if (targetBalances.length > 0) {
            const targetBalance = targetBalances[0];
            await base44.entities.StockBalance.update(targetBalance.id, {
              available_quantity: targetBalance.available_quantity + balance.available_quantity,
              physical_quantity: targetBalance.physical_quantity + balance.available_quantity
            });
          } else {
            await base44.entities.StockBalance.create({
              company_id: warehouse.company_id,
              warehouse_id: targetWarehouseId,
              product_id: balance.product_id,
              available_quantity: balance.available_quantity,
              physical_quantity: balance.available_quantity,
              reserved_quantity: 0,
              in_transit_quantity: 0,
              average_cost: balance.average_cost
            });
          }

          success = true;
          setTransferProgress(prev => ({
            ...prev,
            processed: prev.processed + 1,
            successful: prev.successful + 1
          }));
        } catch (error) {
          console.error(`Erro ao transferir produto ${balance.product_id}:`, error);
          retries++;
          
          if (retries >= maxRetries) {
            failedQueue.push({
              balance,
              product: getProductById(balance.product_id)
            });
            setTransferProgress(prev => ({
              ...prev,
              processed: prev.processed + 1,
              failed: prev.failed + 1,
              failedItems: [...prev.failedItems, {
                name: getProductById(balance.product_id)?.name,
                quantity: balance.available_quantity
              }]
            }));
          } else {
            // Aguardar antes de tentar novamente
            await new Promise(resolve => setTimeout(resolve, 1000 * retries));
          }
        }
      }
    }

    // Se todas transferências foram bem-sucedidas, deletar o depósito
    if (failedQueue.length === 0) {
      try {
        await base44.entities.Warehouse.update(warehouse.id, {
          is_deleted: true,
          status: 'inactive'
        });
        onSuccess();
        onClose();
      } catch (error) {
        console.error("Erro ao deletar depósito:", error);
      }
    }

    setIsTransferring(false);
  };

  const handleDeleteEmpty = async () => {
    try {
      await base44.entities.Warehouse.update(warehouse.id, {
        is_deleted: true,
        status: 'inactive'
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Erro ao deletar depósito:", error);
    }
  };

  if (!warehouse) return null;

  const hasStock = balances.length > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl rounded-3xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-red-600" />
            </div>
            Excluir Depósito: {warehouse.name}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : hasStock ? (
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-amber-900">Atenção: Depósito com Estoque</h4>
                  <p className="text-sm text-amber-800 mt-1">
                    Este depósito possui {balances.length} {balances.length === 1 ? 'item' : 'itens'} em estoque.
                    Você precisa transferir todos os itens antes de excluir.
                  </p>
                </div>
              </div>
            </div>

            {!isTransferring ? (
              <>
                <div>
                  <Label>Depósito de Destino *</Label>
                  <Select value={targetWarehouseId} onValueChange={setTargetWarehouseId}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Selecione o depósito" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      {availableWarehouses.map(w => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name} ({w.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <ScrollArea className="h-[300px] border rounded-xl">
                  <div className="p-4 space-y-2">
                    {balances.map(balance => {
                      const product = getProductById(balance.product_id);
                      return (
                        <div key={balance.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3 flex-1">
                            {product?.main_image && (
                              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center overflow-hidden">
                                <img
                                  src={product.main_image}
                                  alt={product.name}
                                  className="max-w-full max-h-full object-contain"
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm">{product?.name}</div>
                              <div className="text-xs text-gray-500">{product?.sku}</div>
                            </div>
                          </div>
                          <Badge variant="outline" className="rounded-full">
                            {balance.available_quantity} un
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </>
            ) : (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
                  <p className="text-sm text-gray-600">Transferindo itens...</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {transferProgress.processed} de {transferProgress.total}
                  </p>
                </div>

                <Progress 
                  value={(transferProgress.processed / transferProgress.total) * 100} 
                  className="h-2"
                />

                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="w-4 h-4" />
                    {transferProgress.successful} sucesso
                  </span>
                  <span className="flex items-center gap-1 text-red-600">
                    <XCircle className="w-4 h-4" />
                    {transferProgress.failed} falhas
                  </span>
                </div>

                {transferProgress.failedItems.length > 0 && (
                  <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                    <h4 className="font-semibold text-red-900 text-sm mb-2">
                      Itens que falharam:
                    </h4>
                    <div className="space-y-1">
                      {transferProgress.failedItems.map((item, idx) => (
                        <div key={idx} className="text-xs text-red-800">
                          • {item.name} ({item.quantity} un)
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-red-700 mt-2">
                      Estes itens ainda permanecem no depósito e precisam ser transferidos manualmente.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-600">Este depósito está vazio e pode ser excluído.</p>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isTransferring}
            className="rounded-xl"
          >
            Cancelar
          </Button>
          {hasStock ? (
            <Button
              onClick={handleTransferAll}
              disabled={!targetWarehouseId || isTransferring}
              className="rounded-xl bg-blue-600 hover:bg-blue-700"
            >
              {isTransferring ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Transferindo...
                </>
              ) : (
                <>
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Transferir Todos e Excluir
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleDeleteEmpty}
              className="rounded-xl bg-red-600 hover:bg-red-700"
            >
              Excluir Depósito
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}