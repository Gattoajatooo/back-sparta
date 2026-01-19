import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ShoppingBag, 
  AlertTriangle, 
  CheckCircle2,
  X,
  Edit,
  Trash2,
  Package
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function EntryDetailsModal({ 
  open, 
  onClose, 
  entry, 
  products, 
  warehouses,
  users,
  onEdit,
  onDelete 
}) {
  const [itemsStatus, setItemsStatus] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [canDelete, setCanDelete] = useState(false);
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    if (open && entry) {
      checkItemsStatus();
    }
  }, [open, entry]);

  const checkItemsStatus = async () => {
    setIsLoading(true);
    try {
      // Verificar se passaram mais de 7 dias
      const entryDate = new Date(entry.date);
      const now = new Date();
      const daysDiff = Math.floor((now - entryDate) / (1000 * 60 * 60 * 24));
      const isWithin7Days = daysDiff <= 7;

      const statusChecks = await Promise.all(
        entry.items.map(async (item) => {
          // Verificar se o produto foi vendido
          const sales = await base44.entities.Sale.filter({
            company_id: item.company_id,
            'items.product_id': item.product_id,
            sale_date: { '$gte': item.movement_date },
            status: { '$nin': ['cancelled', 'returned'] }
          }).catch(() => []);

          const quantitySold = sales.reduce((acc, sale) => {
            const saleItem = sale.items?.find(si => si.product_id === item.product_id);
            return acc + (saleItem?.quantity || 0);
          }, 0);

          // Verificar se houve outras movimentações
          const otherMovements = await base44.entities.StockMovement.filter({
            company_id: item.company_id,
            product_id: item.product_id,
            movement_date: { '$gte': item.movement_date },
            movement_type: { '$ne': 'in' },
            is_deleted: { '$ne': true }
          }).catch(() => []);

          const quantityMoved = otherMovements.reduce((acc, mov) => acc + mov.quantity, 0);

          return {
            ...item,
            quantity_sold: quantitySold,
            quantity_moved: quantityMoved,
            can_edit: quantitySold === 0 && quantityMoved === 0 && isWithin7Days,
            can_delete: quantitySold === 0 && quantityMoved === 0 && isWithin7Days,
            editable_quantity: item.quantity - quantitySold
          };
        })
      );

      setItemsStatus(statusChecks);
      
      // Entrada pode ser deletada se TODOS os itens podem ser deletados
      const allCanDelete = statusChecks.every(item => item.can_delete);
      setCanDelete(allCanDelete && isWithin7Days);

      // Entrada pode ser editada se PELO MENOS UM item pode ser editado
      const anyCanEdit = statusChecks.some(item => item.can_edit || (item.editable_quantity > 0 && isWithin7Days));
      setCanEdit(anyCanEdit && isWithin7Days);

    } catch (error) {
      console.error("Erro ao verificar status dos itens:", error);
      setItemsStatus(entry.items.map(item => ({ ...item, can_edit: false, can_delete: false })));
      setCanDelete(false);
      setCanEdit(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (!entry) return null;

  const getProduct = (productId) => products.find(p => p.id === productId);
  const entryUser = users?.find(u => u.email === entry.items[0]?.user_email);
  const totalValue = entry.items.reduce((acc, item) => 
    acc + (item.quantity * (item.unit_cost || 0)), 0
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl rounded-3xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 py-5 border-b">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Package className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg font-semibold mb-2">
                Entrada - {format(new Date(entry.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </DialogTitle>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-600">
                  {entry.items.length} item{entry.items.length !== 1 ? 's' : ''}
                </span>
                <span className="font-semibold text-green-600">
                  R$ {totalValue.toFixed(2)}
                </span>
                {entryUser && (
                  <div className="flex items-center gap-2 ml-auto">
                    <img 
                      src={entryUser.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(entryUser.full_name)}&background=random`}
                      alt={entryUser.full_name}
                      className="w-6 h-6 rounded-full border"
                    />
                    <span className="text-gray-600">{entryUser.full_name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Barra de Ações */}
        {!isLoading && (canEdit || canDelete) && (
          <div className="px-6 py-3 border-b bg-gray-50 flex justify-end gap-3">
            {canEdit && (
              <Button
                variant="outline"
                onClick={() => {
                  onEdit(entry);
                  onClose();
                }}
                className="rounded-xl"
              >
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
            )}
            {canDelete && (
              <Button
                variant="destructive"
                onClick={() => {
                  onDelete(entry);
                  onClose();
                }}
                className="rounded-xl bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </Button>
            )}
          </div>
        )}

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <div className="p-6 space-y-6">
            {/* Observações */}
            {entry.notes && (
              <Alert className="rounded-2xl">
                <AlertDescription>{entry.notes}</AlertDescription>
              </Alert>
            )}

            {/* Avisos sobre movimentações */}
            {!isLoading && !canDelete && (
              <Alert className="rounded-2xl bg-amber-50 border-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  {(() => {
                    const entryDate = new Date(entry.date);
                    const now = new Date();
                    const daysDiff = Math.floor((now - entryDate) / (1000 * 60 * 60 * 24));
                    
                    if (daysDiff > 7) {
                      return 'Esta entrada foi registrada há mais de 7 dias e não pode mais ser editada ou excluída.';
                    }
                    
                    return canEdit 
                      ? 'Alguns itens desta entrada foram movimentados ou vendidos. Apenas itens não movimentados podem ser editados ou excluídos.'
                      : 'Todos os itens desta entrada foram movimentados ou vendidos. A entrada não pode ser editada ou excluída.';
                  })()}
                </AlertDescription>
              </Alert>
            )}

            {/* Itens */}
            <Card className="rounded-2xl">
              <CardContent className="p-0">
                <div className="border rounded-2xl overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead className="text-right">Qtd Entrada</TableHead>
                        <TableHead className="text-right">Qtd Movimentada</TableHead>
                        <TableHead className="text-right">Qtd Vendida</TableHead>
                        <TableHead className="text-right">Custo Unit.</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                              <span className="text-gray-500">Verificando status...</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        itemsStatus.map((item, idx) => {
                          const product = getProduct(item.product_id);
                          return (
                            <TableRow key={idx}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {product?.main_image ? (
                                    <img 
                                      src={product.main_image} 
                                      alt={product.name}
                                      className="w-10 h-10 rounded-lg object-cover"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                      <ShoppingBag className="w-5 h-5 text-gray-400" />
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
                              <TableCell className="text-right font-semibold text-green-600">
                                {item.quantity}
                              </TableCell>
                              <TableCell className="text-right">
                                {item.quantity_moved > 0 ? (
                                  <span className="text-orange-600">{item.quantity_moved}</span>
                                ) : (
                                  <span className="text-gray-400">0</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {item.quantity_sold > 0 ? (
                                  <span className="text-red-600">{item.quantity_sold}</span>
                                ) : (
                                  <span className="text-gray-400">0</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {item.unit_cost ? `R$ ${item.unit_cost.toFixed(2)}` : '-'}
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {item.unit_cost ? `R$ ${(item.quantity * item.unit_cost).toFixed(2)}` : '-'}
                              </TableCell>
                              <TableCell className="text-center">
                                {item.can_delete ? (
                                  <Badge className="bg-green-100 text-green-700 rounded-full">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Livre
                                  </Badge>
                                ) : item.editable_quantity > 0 ? (
                                  <Badge className="bg-amber-100 text-amber-700 rounded-full">
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    Parcial
                                  </Badge>
                                ) : (
                                  <Badge className="bg-red-100 text-red-700 rounded-full">
                                    <X className="w-3 h-3 mr-1" />
                                    Bloqueado
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Total */}
                <div className="p-4 bg-gray-50 border-t">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-700">Total Geral:</span>
                    <span className="text-xl font-bold text-green-600">
                      R$ {entry.items.reduce((acc, item) => 
                        acc + (item.quantity * (item.unit_cost || 0)), 0
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}