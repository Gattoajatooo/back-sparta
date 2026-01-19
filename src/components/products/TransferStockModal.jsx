import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ArrowRight,
  AlertTriangle,
  Package,
  Building2
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function TransferStockModal({ 
  open, 
  onClose, 
  balance,
  product,
  warehouses,
  onSuccess
}) {
  const [quantity, setQuantity] = useState(1);
  const [destinationWarehouseId, setDestinationWarehouseId] = useState("");
  const [notes, setNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  if (!balance || !product) return null;

  const sourceWarehouse = warehouses.find(w => w.id === balance.warehouse_id);
  const maxQuantity = balance.available_quantity;

  const handleTransfer = async () => {
    if (!destinationWarehouseId) {
      toast.error("Selecione o depósito de destino");
      return;
    }

    if (quantity <= 0 || quantity > maxQuantity) {
      toast.error(`Quantidade inválida. Máximo disponível: ${maxQuantity}`);
      return;
    }

    if (destinationWarehouseId === balance.warehouse_id) {
      toast.error("O depósito de destino deve ser diferente do depósito de origem");
      return;
    }

    setIsProcessing(true);

    try {
      const user = await base44.auth.me();
      const transferDate = new Date();
      const referenceId = `TRANSFER_${Date.now()}`;

      // Criar movimentação de saída do depósito origem
      await base44.entities.StockMovement.create({
        company_id: user.company_id,
        product_id: product.id,
        movement_type: 'transfer',
        movement_date: transferDate.toISOString(),
        quantity: -quantity, // Negativo para indicar saída
        unit_cost: balance.average_cost,
        reference_type: 'transfer',
        reference_id: referenceId,
        user_email: user.email,
        notes: notes || `Transferência para ${warehouses.find(w => w.id === destinationWarehouseId)?.name}`
      });

      // Criar movimentação de entrada no depósito destino
      await base44.entities.StockMovement.create({
        company_id: user.company_id,
        product_id: product.id,
        movement_type: 'transfer',
        movement_date: transferDate.toISOString(),
        quantity: quantity, // Positivo para indicar entrada
        unit_cost: balance.average_cost,
        reference_type: 'transfer',
        reference_id: referenceId,
        user_email: user.email,
        notes: notes || `Transferência de ${sourceWarehouse?.name}`
      });

      // Atualizar saldo do depósito origem
      await base44.entities.StockBalance.update(balance.id, {
        available_quantity: balance.available_quantity - quantity
      });

      // Buscar ou criar saldo no depósito destino
      const destinationBalances = await base44.entities.StockBalance.filter({
        company_id: user.company_id,
        product_id: product.id,
        warehouse_id: destinationWarehouseId
      });

      if (destinationBalances.length > 0) {
        // Atualizar saldo existente
        await base44.entities.StockBalance.update(destinationBalances[0].id, {
          available_quantity: (destinationBalances[0].available_quantity || 0) + quantity,
          average_cost: balance.average_cost
        });
      } else {
        // Criar novo saldo
        await base44.entities.StockBalance.create({
          company_id: user.company_id,
          product_id: product.id,
          warehouse_id: destinationWarehouseId,
          available_quantity: quantity,
          average_cost: balance.average_cost,
          reserved_quantity: 0,
          committed_quantity: 0,
          in_transit_quantity: 0,
          blocked_quantity: 0
        });
      }

      toast.success("Transferência realizada com sucesso!");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Erro ao transferir estoque:", error);
      toast.error("Erro ao realizar transferência");
    } finally {
      setIsProcessing(false);
    }
  };

  const destinationWarehouses = warehouses.filter(w => 
    w.id !== balance.warehouse_id && w.status === 'active'
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <ArrowRight className="w-5 h-5 text-blue-600" />
            </div>
            Transferir Estoque
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Produto */}
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3">
              {product.main_image ? (
                <img 
                  src={product.main_image} 
                  alt={product.name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center">
                  <Package className="w-6 h-6 text-gray-400" />
                </div>
              )}
              <div>
                <div className="font-medium">{product.name}</div>
                {product.sku && (
                  <div className="text-xs text-gray-500 font-mono">{product.sku}</div>
                )}
              </div>
            </div>
          </div>

          {/* Depósito Origem */}
          <div>
            <Label className="text-xs text-gray-600 mb-2">Depósito Origem</Label>
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
              <Building2 className="w-4 h-4 text-gray-500" />
              <span className="font-medium">{sourceWarehouse?.name}</span>
              <Badge variant="secondary" className="ml-auto rounded-full">
                Disponível: {maxQuantity}
              </Badge>
            </div>
          </div>

          {/* Depósito Destino */}
          <div>
            <Label>Depósito Destino *</Label>
            <Select value={destinationWarehouseId} onValueChange={setDestinationWarehouseId}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Selecione o depósito de destino" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                {destinationWarehouses.map(w => (
                  <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantidade */}
          <div>
            <Label>Quantidade a Transferir *</Label>
            <Input
              type="number"
              min="1"
              max={maxQuantity}
              value={quantity}
              onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
              className="rounded-xl"
            />
            <p className="text-xs text-gray-500 mt-1">
              Máximo disponível: {maxQuantity}
            </p>
          </div>

          {/* Observações */}
          <div>
            <Label>Observações</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Motivo da transferência (opcional)"
              className="rounded-xl"
            />
          </div>

          {/* Aviso */}
          {quantity > maxQuantity && (
            <Alert className="rounded-2xl bg-red-50 border-red-200">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-800">
                Quantidade informada excede o disponível no estoque
              </AlertDescription>
            </Alert>
          )}

          {/* Ações */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isProcessing}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleTransfer}
              disabled={isProcessing || !destinationWarehouseId || quantity <= 0 || quantity > maxQuantity}
              className="rounded-xl bg-blue-600 hover:bg-blue-700"
            >
              {isProcessing ? "Processando..." : "Transferir"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}