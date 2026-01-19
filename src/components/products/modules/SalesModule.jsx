import React, { useState, useEffect, useRef } from 'react';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  User,
  CreditCard,
  DollarSign,
  Percent,
  ShoppingCart,
  Receipt,
  X,
  Check,
  Scan,
  Clock,
  History,
  XCircle,
  RotateCcw,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function SalesModule() {
  const searchInputRef = useRef(null);
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [balances, setBalances] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [sales, setSales] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [activeView, setActiveView] = useState("pos"); // 'pos', 'history', or 'reservations'
  const [reservationsSearchTerm, setReservationsSearchTerm] = useState("");
  const [reservationsDateFilter, setReservationsDateFilter] = useState("all");
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [showCancelReservationDialog, setShowCancelReservationDialog] = useState(false);
  const [cancelReservationReason, setCancelReservationReason] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [discountType, setDiscountType] = useState("percent");
  const [discountValue, setDiscountValue] = useState(0);
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [isProcessingSale, setIsProcessingSale] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [returnItems, setReturnItems] = useState([]);
  const [paymentStep, setPaymentStep] = useState(1); // 1: depósitos, 2: pagamento
  const [itemWarehouses, setItemWarehouses] = useState({}); // { product_id: warehouse_id }
  const [reserveStep, setReserveStep] = useState(1); // 1: depósitos, 2: confirmação
  const [reserveItemWarehouses, setReserveItemWarehouses] = useState({});
  const [historySearchTerm, setHistorySearchTerm] = useState("");
  const [historyDateFilter, setHistoryDateFilter] = useState("all"); // all, today, week, month
  const [historyStatusFilter, setHistoryStatusFilter] = useState("all");

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Auto-focus no campo de busca
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }

    // Atalhos de teclado
    const handleKeyDown = (e) => {
      // F2 - Foco na busca
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      
      // F4 - Abrir pagamento
      if (e.key === 'F4' && cart.length > 0) {
        e.preventDefault();
        setShowPayment(true);
      }
      
      // ESC - Fechar modais
      if (e.key === 'Escape') {
        setShowPayment(false);
        setShowCustomerModal(false);
        setShowDiscountModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart.length]);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const [currentCompany, allProducts, allWarehouses, allBalances, allContacts, allReservations, allSales] = await Promise.all([
        base44.entities.Company.get(currentUser.company_id).catch(() => null),
        base44.entities.Product.filter({
          company_id: currentUser.company_id,
          is_deleted: { '$ne': true },
          status: 'active'
        }).catch(() => []),
        base44.entities.Warehouse.filter({
          company_id: currentUser.company_id,
          is_deleted: { '$ne': true },
          allows_sale: true
        }).catch(() => []),
        base44.entities.StockBalance.filter({
          company_id: currentUser.company_id
        }).catch(() => []),
        base44.entities.Contact.filter({
          company_id: currentUser.company_id,
          deleted: { '$ne': true }
        }).catch(() => []),
        base44.entities.StockReservation.filter({
          company_id: currentUser.company_id,
          status: 'active',
          expiry_date: { '$gte': new Date().toISOString() }
        }).catch(() => []),
        base44.entities.Sale.filter({
          company_id: currentUser.company_id,
          is_deleted: { '$ne': true }
        }, '-sale_date', 100).catch(() => [])
      ]);

      setCompany(currentCompany);
      setProducts(allProducts || []);
      setWarehouses(allWarehouses || []);
      setBalances(allBalances || []);
      setContacts(allContacts || []);
      setReservations(allReservations || []);
      setSales(allSales || []);
      
      if (allWarehouses.length > 0 && !selectedWarehouse) {
        setSelectedWarehouse(allWarehouses[0].id);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAvailableStock = (productId) => {
    // Somar apenas estoque de depósitos que permitem venda
    const allowedWarehouseIds = warehouses
      .filter(wh => wh.allows_sale === true)
      .map(wh => wh.id);
    
    const totalAvailable = balances
      .filter(b => b.product_id === productId && allowedWarehouseIds.includes(b.warehouse_id))
      .reduce((sum, b) => sum + (b.available_quantity || 0), 0);
    
    const totalReserved = reservations
      .filter(r => r.product_id === productId && r.status === 'active')
      .reduce((sum, r) => sum + (r.quantity || 0), 0);
    
    return Math.max(0, totalAvailable - totalReserved);
  };

  const handleAddToCart = (product) => {
    const existingItem = cart.find(item => item.product_id === product.id);
    const available = getAvailableStock(product.id);
    
    if (existingItem) {
      if (existingItem.quantity < available) {
        setCart(prev => prev.map(item =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ));
      }
    } else {
      if (available > 0) {
        setCart(prev => [...prev, {
          product_id: product.id,
          product_name: product.name,
          product_sku: product.sku,
          quantity: 1,
          unit_price: product.sale_price || 0,
          discount_value: 0,
          discount_percent: 0,
          total_price: product.sale_price || 0,
          cost_price: product.cost_price || 0,
          available_stock: available
        }]);
      }
    }
    
    setSearchTerm("");
    searchInputRef.current?.focus();
  };

  const updateCartItem = (productId, field, value) => {
    setCart(prev => prev.map(item => {
      if (item.product_id === productId) {
        const updated = { ...item, [field]: value };
        
        if (field === 'quantity' || field === 'unit_price' || field === 'discount_value') {
          const baseTotal = updated.quantity * updated.unit_price;
          updated.total_price = baseTotal - updated.discount_value;
          updated.margin_percent = updated.cost_price > 0
            ? ((updated.unit_price - updated.cost_price) / updated.unit_price * 100)
            : 0;
        }
        
        return updated;
      }
      return item;
    }));
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.product_id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setCustomer(null);
    setShowPayment(false);
    setDiscountValue(0);
    setSelectedPaymentMethod("");
    setPaymentStep(1);
    setItemWarehouses({});
  };

  const applyDiscount = () => {
    if (discountType === "percent") {
      const discountAmount = (cartSubtotal * discountValue) / 100;
      setCart(prev => prev.map(item => ({
        ...item,
        discount_value: (item.quantity * item.unit_price * discountValue) / 100,
        total_price: (item.quantity * item.unit_price) - (item.quantity * item.unit_price * discountValue) / 100
      })));
    } else {
      const totalItems = cart.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      setCart(prev => prev.map(item => {
        const itemProportion = (item.quantity * item.unit_price) / totalItems;
        const itemDiscount = discountValue * itemProportion;
        return {
          ...item,
          discount_value: itemDiscount,
          total_price: (item.quantity * item.unit_price) - itemDiscount
        };
      }));
    }
    setShowDiscountModal(false);
  };

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.ean?.includes(searchTerm)
  );

  const cartSubtotal = cart.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const cartDiscount = cart.reduce((sum, item) => sum + item.discount_value, 0);
  const cartTotal = cartSubtotal - cartDiscount;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto overflow-hidden">
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
        </div>
      </div>
    );
  }

  const handleCreateReservation = async () => {
    if (!customer) {
      alert("Selecione um cliente para a reserva");
      return;
    }

    // Validar se todos os itens têm depósito selecionado
    const missingWarehouses = cart.filter(item => !reserveItemWarehouses[item.product_id]);
    if (missingWarehouses.length > 0) {
      alert("Selecione o depósito para todos os produtos");
      return;
    }

    setIsProcessingSale(true);
    try {
      const reservationTime = company?.settings?.product_reservation_time || 1440;
      const expiryDate = new Date();
      expiryDate.setMinutes(expiryDate.getMinutes() + reservationTime);

      for (const item of cart) {
        await base44.entities.StockReservation.create({
          company_id: user.company_id,
          product_id: item.product_id,
          warehouse_id: reserveItemWarehouses[item.product_id],
          quantity: item.quantity,
          reference_type: 'sale_order',
          reference_id: customer.id,
          reservation_date: new Date().toISOString(),
          expiry_date: expiryDate.toISOString(),
          status: 'active',
          user_email: user.email
        });
      }

      setReserveItemWarehouses({});
      setReserveStep(1);
      clearCart();
      loadData();
      setShowReserveModal(false);
      alert("Produtos reservados com sucesso!");
    } catch (error) {
      console.error("Erro ao criar reserva:", error);
      alert("Erro ao criar reserva");
    } finally {
      setIsProcessingSale(false);
    }
  };

  const handleCompleteSale = async () => {
    if (!selectedPaymentMethod) {
      alert("Selecione uma forma de pagamento");
      return;
    }

    // Validar se todos os itens têm depósito selecionado
    const missingWarehouses = cart.filter(item => !itemWarehouses[item.product_id]);
    if (missingWarehouses.length > 0) {
      alert("Selecione o depósito para todos os produtos");
      return;
    }

    setIsProcessingSale(true);
    try {
      const saleNumber = `VENDA-${Date.now()}`;
      
      const sale = await base44.entities.Sale.create({
        company_id: user.company_id,
        sale_number: saleNumber,
        type: 'direct',
        status: 'paid',
        customer_id: customer?.id,
        seller_user_email: user.email,
        warehouse_id: itemWarehouses[cart[0].product_id], // Depósito do primeiro item (referência)
        sale_date: new Date().toISOString(),
        items: cart.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_value: item.discount_value || 0,
          discount_percent: item.discount_percent || 0,
          total_price: item.total_price,
          cost_price: item.cost_price || 0,
          margin_percent: item.margin_percent || 0,
          warehouse_id: itemWarehouses[item.product_id] // Adicionar depósito por item
        })),
        subtotal: cartSubtotal,
        total_discount: cartDiscount,
        total_value: cartTotal,
        payments: [{
          method: selectedPaymentMethod,
          value: cartTotal,
          installments: 1
        }],
        stock_moved: false
      });

      // Movimentar estoque (cada item do seu depósito específico)
      for (const item of cart) {
        const warehouseId = itemWarehouses[item.product_id];
        const balance = balances.find(b => 
          b.product_id === item.product_id && 
          b.warehouse_id === warehouseId
        );

        if (balance) {
          await base44.entities.StockBalance.update(balance.id, {
            available_quantity: (balance.available_quantity || 0) - item.quantity
          });
        }

        await base44.entities.StockMovement.create({
          company_id: user.company_id,
          product_id: item.product_id,
          warehouse_id: warehouseId,
          movement_type: 'sale',
          quantity: -item.quantity,
          reference_type: 'sale',
          reference_id: sale.id,
          unit_cost: item.cost_price || 0,
          total_cost: (item.cost_price || 0) * item.quantity,
          movement_date: new Date().toISOString(),
          user_email: user.email
        });
      }

      await base44.entities.Sale.update(sale.id, { stock_moved: true });

      clearCart();
      loadData();
      setShowPayment(false);
      setPaymentStep(1);
      setItemWarehouses({});
      alert("Venda concluída com sucesso!");
    } catch (error) {
      console.error("Erro ao finalizar venda:", error);
      alert("Erro ao finalizar venda");
    } finally {
      setIsProcessingSale(false);
    }
  };

  const handleCancelSale = async () => {
    if (!cancelReason.trim()) {
      alert("Informe o motivo do cancelamento");
      return;
    }

    try {
      await base44.entities.Sale.update(selectedSale.id, {
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: cancelReason
      });

      // Estornar estoque (cada item volta para seu depósito original)
      if (selectedSale.stock_moved) {
        for (const item of selectedSale.items) {
          // Usar warehouse_id do item se disponível, senão usar o da venda
          const warehouseId = item.warehouse_id || selectedSale.warehouse_id;
          
          // Buscar saldo existente
          let balance = balances.find(b => 
            b.product_id === item.product_id && 
            b.warehouse_id === warehouseId
          );

          // Se não encontrou no array local, buscar no banco
          if (!balance) {
            const existingBalances = await base44.entities.StockBalance.filter({
              company_id: user.company_id,
              product_id: item.product_id,
              warehouse_id: warehouseId
            });
            balance = existingBalances[0];
          }

          if (balance) {
            // Atualizar saldo existente
            await base44.entities.StockBalance.update(balance.id, {
              available_quantity: (balance.available_quantity || 0) + item.quantity
            });
          } else {
            // Criar novo saldo se não existir
            await base44.entities.StockBalance.create({
              company_id: user.company_id,
              product_id: item.product_id,
              warehouse_id: warehouseId,
              available_quantity: item.quantity,
              average_cost: item.cost_price || 0,
              reserved_quantity: 0,
              committed_quantity: 0,
              in_transit_quantity: 0,
              blocked_quantity: 0
            });
          }

          // Criar movimentação de estorno
          await base44.entities.StockMovement.create({
            company_id: user.company_id,
            product_id: item.product_id,
            warehouse_id: warehouseId,
            movement_type: 'return',
            quantity: item.quantity,
            reference_type: 'sale_cancellation',
            reference_id: selectedSale.id,
            unit_cost: item.cost_price || 0,
            total_cost: (item.cost_price || 0) * item.quantity,
            movement_date: new Date().toISOString(),
            user_email: user.email
          });
        }
      }

      loadData();
      setShowCancelDialog(false);
      setSelectedSale(null);
      setCancelReason("");
      alert("Venda cancelada com sucesso!");
    } catch (error) {
      console.error("Erro ao cancelar venda:", error);
      alert("Erro ao cancelar venda");
    }
  };

  const handleReturnProducts = async () => {
    const itemsToReturn = returnItems.filter(item => item.selected && item.return_quantity > 0);
    
    if (itemsToReturn.length === 0) {
      alert("Selecione ao menos um produto para devolução");
      return;
    }

    try {
      // Criar venda de devolução
      const returnSale = await base44.entities.Sale.create({
        company_id: user.company_id,
        sale_number: `DEV-${selectedSale.sale_number}`,
        type: 'return',
        status: 'returned',
        customer_id: selectedSale.customer_id,
        seller_user_email: user.email,
        warehouse_id: selectedSale.warehouse_id,
        sale_date: new Date().toISOString(),
        items: itemsToReturn.map(item => ({
          product_id: item.product_id,
          quantity: item.return_quantity,
          unit_price: item.unit_price,
          total_price: item.unit_price * item.return_quantity,
          cost_price: item.cost_price || 0
        })),
        subtotal: itemsToReturn.reduce((sum, item) => sum + (item.unit_price * item.return_quantity), 0),
        total_value: itemsToReturn.reduce((sum, item) => sum + (item.unit_price * item.return_quantity), 0),
        stock_moved: false
      });

      // Retornar estoque
      for (const item of itemsToReturn) {
        const balance = balances.find(b => 
          b.product_id === item.product_id && 
          b.warehouse_id === selectedSale.warehouse_id
        );

        if (balance) {
          await base44.entities.StockBalance.update(balance.id, {
            available_quantity: (balance.available_quantity || 0) + item.return_quantity
          });
        }

        await base44.entities.StockMovement.create({
          company_id: user.company_id,
          product_id: item.product_id,
          warehouse_id: selectedSale.warehouse_id,
          movement_type: 'return',
          quantity: item.return_quantity,
          reference_type: 'sale_return',
          reference_id: returnSale.id,
          unit_cost: item.cost_price || 0,
          total_cost: (item.cost_price || 0) * item.return_quantity,
          movement_date: new Date().toISOString(),
          user_email: user.email
        });
      }

      await base44.entities.Sale.update(returnSale.id, { stock_moved: true });

      loadData();
      setShowReturnDialog(false);
      setSelectedSale(null);
      setReturnItems([]);
      alert("Devolução processada com sucesso!");
    } catch (error) {
      console.error("Erro ao processar devolução:", error);
      alert("Erro ao processar devolução");
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header com Tabs */}
      <div className="bg-white border-b px-4 py-3">
        <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
          <TabsList className="grid grid-cols-3 w-full max-w-2xl rounded-xl">
            <TabsTrigger value="pos" className="rounded-lg flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              PDV
            </TabsTrigger>
            <TabsTrigger value="reservations" className="rounded-lg flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Reservas
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg flex items-center gap-2">
              <History className="w-4 h-4" />
              Histórico
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {activeView === "pos" ? (
        <div className="flex-1 flex gap-3 p-4 overflow-hidden">
      {/* Coluna 1: Catálogo */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl overflow-hidden">
        <div className="p-4 border-b space-y-3">
          <div className="relative">
            <Scan className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              ref={searchInputRef}
              placeholder="Buscar produto (F2) ou bipar código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-xl text-base"
            />
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-xl flex-1"
              onClick={() => setShowCustomerModal(true)}
            >
              <User className="w-4 h-4 mr-2" />
              {customer ? customer.first_name : 'Cliente'}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-xl flex-1"
              onClick={() => setShowDiscountModal(true)}
              disabled={cart.length === 0}
            >
              <Percent className="w-4 h-4 mr-2" />
              Desconto
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 grid grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredProducts.slice(0, 50).map((product) => {
              const stock = getAvailableStock(product.id);
              return (
                <motion.div
                  key={product.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card
                    className={`cursor-pointer rounded-2xl overflow-hidden transition-all ${
                      stock === 0 ? 'opacity-50' : 'hover:shadow-md'
                    }`}
                    onClick={() => stock > 0 && handleAddToCart(product)}
                  >
                    <CardContent className="p-4">
                      {product.main_image && (
                        <div className="w-full h-24 bg-gray-50 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                          <img
                            src={product.main_image}
                            alt={product.name}
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                      )}
                      <div className="text-sm font-medium mb-1 line-clamp-2">{product.name}</div>
                      <div className="text-xs text-gray-500 mb-2">{product.sku}</div>
                      <div className="flex items-center justify-between">
                        <div className="text-lg font-bold text-gray-900">
                          R$ {(product.sale_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <Badge variant="outline" className="rounded-full text-xs">
                          {stock}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Coluna 2: Carrinho */}
      <div className="w-96 flex flex-col bg-white rounded-2xl overflow-hidden">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Carrinho
            </h3>
            {cart.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCart}
                className="rounded-lg"
              >
                Limpar
              </Button>
            )}
          </div>
          <Badge className="bg-gray-100 text-gray-700 rounded-full">
            {cart.length} {cart.length === 1 ? 'item' : 'itens'}
          </Badge>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            <AnimatePresence>
              {cart.map((item) => (
                <motion.div
                  key={item.product_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="p-3 border rounded-xl"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{item.product_name}</div>
                      <div className="text-xs text-gray-500">{item.product_sku}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFromCart(item.product_id)}
                      className="h-6 w-6 rounded-lg"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => updateCartItem(item.product_id, 'quantity', Math.max(1, item.quantity - 1))}
                      className="h-8 w-8 rounded-lg"
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateCartItem(item.product_id, 'quantity', Math.max(1, Math.min(item.available_stock, parseInt(e.target.value) || 1)))}
                      className="text-center rounded-lg h-8 w-16"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => updateCartItem(item.product_id, 'quantity', Math.min(item.available_stock, item.quantity + 1))}
                      className="h-8 w-8 rounded-lg"
                      disabled={item.quantity >= item.available_stock}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                    <div className="flex-1 text-right">
                      <div className="text-sm font-medium">
                        R$ {item.unit_price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Total:</span>
                    <span className="font-bold text-gray-900">
                      R$ {item.total_price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {cart.length === 0 && (
              <div className="text-center py-12">
                <ShoppingCart className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                <p className="text-gray-400 text-sm">Carrinho vazio</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Resumo e Pagamento */}
        <div className="border-t p-4 space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">
                R$ {cartSubtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Desconto:</span>
              <span className="font-medium text-red-600">
                - R$ {cartDiscount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>Total:</span>
              <span className="text-gray-900">
                R$ {cartTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              className="w-full rounded-xl py-6 text-lg font-semibold bg-blue-600 hover:bg-blue-700"
              disabled={cart.length === 0}
              onClick={() => {
                setShowPayment(true);
                setPaymentStep(1);
                // Inicializar depósitos com o primeiro disponível para cada item
                const initialWarehouses = {};
                cart.forEach(item => {
                  const availableWarehouses = warehouses.filter(wh => {
                    const balance = balances.find(b => b.product_id === item.product_id && b.warehouse_id === wh.id);
                    return balance && balance.available_quantity >= item.quantity;
                  });
                  if (availableWarehouses.length > 0) {
                    initialWarehouses[item.product_id] = availableWarehouses[0].id;
                  }
                });
                setItemWarehouses(initialWarehouses);
              }}
            >
              <CreditCard className="w-5 h-5 mr-2" />
              Finalizar Venda (F4)
            </Button>
            <Button
              variant="outline"
              className="w-full rounded-xl py-3"
              disabled={cart.length === 0}
              onClick={() => {
                setShowReserveModal(true);
                setReserveStep(1);
                // Inicializar depósitos para reserva
                const initialWarehouses = {};
                cart.forEach(item => {
                  const availableWarehouses = warehouses.filter(wh => {
                    const balance = balances.find(b => b.product_id === item.product_id && b.warehouse_id === wh.id);
                    return balance && balance.available_quantity >= item.quantity;
                  });
                  if (availableWarehouses.length > 0) {
                    initialWarehouses[item.product_id] = availableWarehouses[0].id;
                  }
                });
                setReserveItemWarehouses(initialWarehouses);
              }}
            >
              <Clock className="w-4 h-4 mr-2" />
              Reservar Produtos
            </Button>
          </div>
        </div>
        </div>

        {/* Modal de Reserva */}
        <Dialog open={showReserveModal} onOpenChange={(open) => {
          setShowReserveModal(open);
          if (!open) {
            setReserveStep(1);
            setReserveItemWarehouses({});
          }
        }}>
          <DialogContent className="max-w-lg rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">
                Reservar Produtos {reserveStep === 1 ? '- Depósitos' : '- Confirmar'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {!customer ? (
                <Alert className="rounded-xl bg-red-50 border-red-200">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    Selecione um cliente antes de criar a reserva
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  {reserveStep === 1 ? (
                    /* Etapa 1: Selecionar Depósitos */
                    <div className="space-y-3">
                      <div className="text-sm text-gray-600">
                        Selecione o depósito de saída para cada produto:
                      </div>
                      <ScrollArea className="max-h-96">
                        <div className="space-y-3 pr-3">
                          {cart.map(item => {
                            const product = products.find(p => p.id === item.product_id);
                            const availableWarehouses = warehouses.filter(wh => {
                              const balance = balances.find(b => b.product_id === item.product_id && b.warehouse_id === wh.id);
                              return balance && balance.available_quantity >= item.quantity;
                            });

                            return (
                              <div key={item.product_id} className="p-3 border rounded-xl">
                                <div className="font-medium text-sm mb-2">{item.product_name}</div>
                                <div className="text-xs text-gray-500 mb-2">Quantidade: {item.quantity}</div>
                                <select
                                  value={reserveItemWarehouses[item.product_id] || ''}
                                  onChange={(e) => setReserveItemWarehouses(prev => ({
                                    ...prev,
                                    [item.product_id]: e.target.value
                                  }))}
                                  className="w-full p-2 border border-gray-200 rounded-lg text-sm bg-white"
                                >
                                  <option value="">Selecione o depósito</option>
                                  {availableWarehouses.map(wh => {
                                    const balance = balances.find(b => b.product_id === item.product_id && b.warehouse_id === wh.id);
                                    return (
                                      <option key={wh.id} value={wh.id}>
                                        {wh.name} (Disp: {balance?.available_quantity || 0})
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </div>
                  ) : (
                    /* Etapa 2: Confirmar */
                    <>
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <Avatar className="w-9 h-9">
                          <AvatarImage src={customer.avatar_url} />
                          <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                            {customer.first_name?.[0]}{customer.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm font-medium">{customer.first_name} {customer.last_name}</div>
                          <div className="text-xs text-gray-500">{customer.phone || '-'}</div>
                        </div>
                      </div>

                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                        <div className="text-xs text-gray-600 mb-1">Tempo de reserva</div>
                        <div className="font-medium text-sm">
                          {(() => {
                            const minutes = company?.settings?.product_reservation_time || 1440;
                            if (minutes >= 1440) return `${Math.floor(minutes / 1440)} ${Math.floor(minutes / 1440) === 1 ? 'dia' : 'dias'}`;
                            if (minutes >= 60) return `${Math.floor(minutes / 60)} ${Math.floor(minutes / 60) === 1 ? 'hora' : 'horas'}`;
                            return `${minutes} min`;
                          })()}
                        </div>
                      </div>

                      <ScrollArea className="max-h-60">
                        <div className="space-y-2 pr-3">
                          {cart.map(item => {
                            const warehouse = warehouses.find(w => w.id === reserveItemWarehouses[item.product_id]);
                            return (
                              <div key={item.product_id} className="p-3 bg-gray-50 rounded-xl text-sm">
                                <div className="font-medium">{item.product_name}</div>
                                <div className="flex justify-between text-xs text-gray-600 mt-1">
                                  <span>Qtd: {item.quantity}</span>
                                  <span>{warehouse?.name || 'N/A'}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </>
                  )}
                </>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button 
                variant="outline"
                onClick={() => {
                  if (reserveStep === 1) {
                    setShowReserveModal(false);
                    setReserveStep(1);
                    setReserveItemWarehouses({});
                  } else {
                    setReserveStep(1);
                  }
                }}
                className="flex-1 rounded-xl"
              >
                {reserveStep === 1 ? 'Cancelar' : 'Voltar'}
              </Button>
              <Button 
                onClick={() => {
                  if (reserveStep === 1) {
                    const missingWarehouses = cart.filter(item => !reserveItemWarehouses[item.product_id]);
                    if (missingWarehouses.length > 0) {
                      alert("Selecione o depósito para todos os produtos");
                      return;
                    }
                    setReserveStep(2);
                  } else {
                    handleCreateReservation();
                  }
                }}
                disabled={!customer || (reserveStep === 2 && isProcessingSale)}
                className="flex-1 rounded-xl bg-amber-600 hover:bg-amber-700"
              >
                {reserveStep === 2 && isProcessingSale ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Reservando...
                  </>
                ) : (
                  reserveStep === 1 ? 'Continuar' : 'Confirmar Reserva'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      ) : activeView === "reservations" ? (
        /* Vendas de Reservas */
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Filtros */}
          <div className="bg-white border-b p-4">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar por cliente, produto..."
                  value={reservationsSearchTerm}
                  onChange={(e) => setReservationsSearchTerm(e.target.value)}
                  className="pl-10 rounded-xl"
                />
              </div>
              <select
                value={reservationsDateFilter}
                onChange={(e) => setReservationsDateFilter(e.target.value)}
                className="p-2 border border-gray-200 rounded-xl text-sm bg-white"
              >
                <option value="all">Todas as datas</option>
                <option value="today">Hoje</option>
                <option value="week">Última semana</option>
                <option value="month">Último mês</option>
              </select>
            </div>
          </div>

          <div className="flex-1 p-4 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="space-y-3 pr-4">
                {(() => {
                  // Agrupar reservas por reference_id (cliente)
                  const groupedReservations = {};
                  reservations.forEach(res => {
                    const key = res.reference_id;
                    if (!groupedReservations[key]) {
                      groupedReservations[key] = [];
                    }
                    groupedReservations[key].push(res);
                  });

                  let filteredGroups = Object.entries(groupedReservations);

                  // Filtro de busca
                  if (reservationsSearchTerm) {
                    filteredGroups = filteredGroups.filter(([customerId, items]) => {
                      const customer = contacts.find(c => c.id === customerId);
                      const customerName = customer ? `${customer.first_name} ${customer.last_name}` : '';
                      const hasProductMatch = items.some(item => {
                        const product = products.find(p => p.id === item.product_id);
                        return product?.name?.toLowerCase().includes(reservationsSearchTerm.toLowerCase());
                      });
                      return customerName.toLowerCase().includes(reservationsSearchTerm.toLowerCase()) || hasProductMatch;
                    });
                  }

                  // Filtro de data
                  if (reservationsDateFilter !== 'all') {
                    const now = new Date();
                    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

                    filteredGroups = filteredGroups.filter(([_, items]) => {
                      const reservationDate = new Date(items[0].reservation_date);
                      if (reservationsDateFilter === 'today') return reservationDate >= startOfToday;
                      if (reservationsDateFilter === 'week') return reservationDate >= startOfWeek;
                      if (reservationsDateFilter === 'month') return reservationDate >= startOfMonth;
                      return true;
                    });
                  }

                  if (filteredGroups.length === 0) {
                    return (
                      <div className="text-center py-12">
                        <Clock className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                        <p className="text-gray-400">Nenhuma reserva encontrada</p>
                      </div>
                    );
                  }

                  return filteredGroups.map(([customerId, items]) => {
                    const customer = contacts.find(c => c.id === customerId);
                    const totalValue = items.reduce((sum, item) => {
                      const product = products.find(p => p.id === item.product_id);
                      return sum + (product?.sale_price || 0) * item.quantity;
                    }, 0);

                    return (
                      <Card key={customerId} className="rounded-2xl overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-10 h-10">
                                <AvatarImage src={customer?.avatar_url} />
                                <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                                  {customer?.first_name?.[0]}{customer?.last_name?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-semibold text-sm">
                                  {customer ? `${customer.first_name} ${customer.last_name}` : 'Cliente não identificado'}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Reservado em {new Date(items[0].reservation_date).toLocaleString('pt-BR')}
                                </div>
                              </div>
                            </div>
                            <Badge className="bg-amber-100 text-amber-700 rounded-full">
                              Expira em {new Date(items[0].expiry_date).toLocaleDateString('pt-BR')}
                            </Badge>
                          </div>

                          <div className="space-y-2 mb-3">
                            {items.map((item) => {
                              const product = products.find(p => p.id === item.product_id);
                              const warehouse = warehouses.find(w => w.id === item.warehouse_id);
                              return (
                                <div key={item.id} className="flex justify-between text-xs p-2 bg-gray-50 rounded-lg">
                                  <span className="text-gray-600">
                                    {item.quantity}x {product?.name || 'Produto'}
                                  </span>
                                  <span className="text-gray-500 text-[10px]">
                                    {warehouse?.name || 'Depósito'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t">
                            <div className="text-lg font-bold">
                              R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  // Carregar reserva no carrinho e processar venda
                                  const cartItems = items.map(item => {
                                    const product = products.find(p => p.id === item.product_id);
                                    return {
                                      product_id: item.product_id,
                                      product_name: product?.name || 'Produto',
                                      product_sku: product?.sku || '',
                                      quantity: item.quantity,
                                      unit_price: product?.sale_price || 0,
                                      discount_value: 0,
                                      discount_percent: 0,
                                      total_price: (product?.sale_price || 0) * item.quantity,
                                      cost_price: product?.cost_price || 0,
                                      available_stock: 9999
                                    };
                                  });
                                  
                                  setCart(cartItems);
                                  setCustomer(customer);
                                  
                                  // Pré-configurar depósitos baseado na reserva
                                  const warehouseMapping = {};
                                  items.forEach(item => {
                                    warehouseMapping[item.product_id] = item.warehouse_id;
                                  });
                                  setItemWarehouses(warehouseMapping);
                                  
                                  setActiveView("pos");
                                  setShowPayment(true);
                                  setPaymentStep(2);
                                }}
                                className="rounded-lg bg-green-600 hover:bg-green-700"
                              >
                                <Check className="w-3 h-3 mr-1" />
                                Efetuar Venda
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedReservation(items);
                                  setShowCancelReservationDialog(true);
                                }}
                                className="rounded-lg text-red-600 hover:text-red-700"
                              >
                                <XCircle className="w-3 h-3 mr-1" />
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  });
                })()}
              </div>
            </ScrollArea>
          </div>
        </div>
      ) : (
        /* Histórico de Vendas */
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Filtros */}
          <div className="bg-white border-b p-4">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar por número, cliente..."
                  value={historySearchTerm}
                  onChange={(e) => setHistorySearchTerm(e.target.value)}
                  className="pl-10 rounded-xl"
                />
              </div>
              <select
                value={historyDateFilter}
                onChange={(e) => setHistoryDateFilter(e.target.value)}
                className="p-2 border border-gray-200 rounded-xl text-sm bg-white"
              >
                <option value="all">Todas as datas</option>
                <option value="today">Hoje</option>
                <option value="week">Última semana</option>
                <option value="month">Último mês</option>
              </select>
              <select
                value={historyStatusFilter}
                onChange={(e) => setHistoryStatusFilter(e.target.value)}
                className="p-2 border border-gray-200 rounded-xl text-sm bg-white"
              >
                <option value="all">Todos os status</option>
                <option value="paid">Pago</option>
                <option value="cancelled">Cancelado</option>
                <option value="returned">Devolvido</option>
              </select>
            </div>
          </div>

          <div className="flex-1 p-4 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="space-y-3 pr-4">
                {(() => {
                  // Filtrar vendas
                  let filteredSales = sales;

                  // Filtro de busca
                  if (historySearchTerm) {
                    filteredSales = filteredSales.filter(sale => {
                      const customerName = sale.customer_id ? 
                        contacts.find(c => c.id === sale.customer_id)?.first_name + ' ' + contacts.find(c => c.id === sale.customer_id)?.last_name : '';
                      return (
                        sale.sale_number?.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
                        customerName.toLowerCase().includes(historySearchTerm.toLowerCase())
                      );
                    });
                  }

                  // Filtro de data
                  if (historyDateFilter !== 'all') {
                    const now = new Date();
                    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

                    filteredSales = filteredSales.filter(sale => {
                      const saleDate = new Date(sale.sale_date);
                      if (historyDateFilter === 'today') return saleDate >= startOfToday;
                      if (historyDateFilter === 'week') return saleDate >= startOfWeek;
                      if (historyDateFilter === 'month') return saleDate >= startOfMonth;
                      return true;
                    });
                  }

                  // Filtro de status
                  if (historyStatusFilter !== 'all') {
                    filteredSales = filteredSales.filter(sale => sale.status === historyStatusFilter);
                  }

                  if (filteredSales.length === 0) {
                    return (
                      <div className="text-center py-12">
                        <History className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                        <p className="text-gray-400">Nenhuma venda encontrada</p>
                      </div>
                    );
                  }

                  return filteredSales.map(sale => (
                  <Card key={sale.id} className="rounded-2xl overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="font-semibold text-sm">{sale.sale_number}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(sale.sale_date).toLocaleString('pt-BR')}
                          </div>
                        </div>
                        <Badge className={
                          sale.status === 'paid' ? 'bg-green-100 text-green-700' :
                          sale.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                          sale.status === 'returned' ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-100 text-gray-700'
                        }>
                          {sale.status === 'paid' ? 'Pago' :
                           sale.status === 'cancelled' ? 'Cancelado' :
                           sale.status === 'returned' ? 'Devolvido' :
                           sale.status}
                        </Badge>
                      </div>

                      <div className="space-y-2 mb-3">
                        {sale.items?.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-xs">
                            <span className="text-gray-600">
                              {item.quantity}x {products.find(p => p.id === item.product_id)?.name || 'Produto'}
                            </span>
                            <span className="font-medium">
                              R$ {item.total_price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t">
                        <div className="text-lg font-bold">
                          R$ {sale.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="flex gap-2">
                          {sale.status === 'paid' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedSale(sale);
                                  setReturnItems(sale.items.map(item => ({
                                    ...item,
                                    selected: false,
                                    return_quantity: 0,
                                    max_quantity: item.quantity
                                  })));
                                  setShowReturnDialog(true);
                                }}
                                className="rounded-lg"
                              >
                                <RotateCcw className="w-3 h-3 mr-1" />
                                Devolução
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedSale(sale);
                                  setShowCancelDialog(true);
                                }}
                                className="rounded-lg text-red-600 hover:text-red-700"
                              >
                                <XCircle className="w-3 h-3 mr-1" />
                                Cancelar
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  ));
                })()}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}

      {/* Dialog de Cancelamento */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              Cancelar Venda
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá estornar o estoque automaticamente. Informe o motivo do cancelamento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label>Motivo do Cancelamento *</Label>
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Ex: Erro no cadastro, Cliente desistiu..."
              className="rounded-xl mt-2 min-h-[100px]"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSale}
              className="rounded-xl bg-red-600 hover:bg-red-700"
            >
              Confirmar Cancelamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Cancelamento de Reserva */}
      <AlertDialog open={showCancelReservationDialog} onOpenChange={setShowCancelReservationDialog}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              Cancelar Reserva
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá liberar o estoque reservado. Informe o motivo do cancelamento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label>Motivo do Cancelamento *</Label>
            <Textarea
              value={cancelReservationReason}
              onChange={(e) => setCancelReservationReason(e.target.value)}
              placeholder="Ex: Cliente desistiu, Produto vendido..."
              className="rounded-xl mt-2 min-h-[100px]"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!cancelReservationReason.trim()) {
                  alert("Informe o motivo do cancelamento");
                  return;
                }

                try {
                  // Cancelar todas as reservas do grupo
                  for (const reservation of selectedReservation) {
                    await base44.entities.StockReservation.update(reservation.id, {
                      status: 'cancelled',
                      cancellation_reason: cancelReservationReason,
                      cancelled_at: new Date().toISOString()
                    });
                  }

                  loadData();
                  setShowCancelReservationDialog(false);
                  setSelectedReservation(null);
                  setCancelReservationReason("");
                  alert("Reserva cancelada com sucesso!");
                } catch (error) {
                  console.error("Erro ao cancelar reserva:", error);
                  alert("Erro ao cancelar reserva");
                }
              }}
              className="rounded-xl bg-red-600 hover:bg-red-700"
            >
              Confirmar Cancelamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Devolução */}
      <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <DialogContent className="max-w-2xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <RotateCcw className="w-5 h-5 text-orange-600" />
              </div>
              Devolução de Produtos
            </DialogTitle>
            <DialogDescription>
              Selecione os produtos e quantidades a serem devolvidos. O estoque será atualizado automaticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {returnItems.map((item, idx) => {
              const product = products.find(p => p.id === item.product_id);
              return (
                <div key={idx} className="p-4 border rounded-xl">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={item.selected}
                      onCheckedChange={(checked) => {
                        setReturnItems(prev => prev.map((ri, i) => 
                          i === idx ? { ...ri, selected: checked, return_quantity: checked ? ri.max_quantity : 0 } : ri
                        ));
                      }}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm mb-2">{product?.name || 'Produto'}</div>
                      <div className="flex items-center gap-3">
                        <div className="text-xs text-gray-500">
                          Qtd. vendida: {item.max_quantity}
                        </div>
                        {item.selected && (
                          <div className="flex items-center gap-2">
                            <Label className="text-xs">Devolver:</Label>
                            <Input
                              type="number"
                              min={1}
                              max={item.max_quantity}
                              value={item.return_quantity}
                              onChange={(e) => {
                                const val = Math.min(item.max_quantity, Math.max(1, parseInt(e.target.value) || 0));
                                setReturnItems(prev => prev.map((ri, i) => 
                                  i === idx ? { ...ri, return_quantity: val } : ri
                                ));
                              }}
                              className="w-20 h-8 rounded-lg text-center"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold">
                        R$ {(item.unit_price * (item.selected ? item.return_quantity : 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
            <div className="text-sm text-gray-600 mb-1">Total a Devolver</div>
            <div className="text-2xl font-bold text-orange-900">
              R$ {returnItems
                .filter(item => item.selected)
                .reduce((sum, item) => sum + (item.unit_price * item.return_quantity), 0)
                .toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReturnDialog(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button 
              onClick={handleReturnProducts}
              className="rounded-xl bg-orange-600 hover:bg-orange-700"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Processar Devolução
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Desconto */}
      <Dialog open={showDiscountModal} onOpenChange={setShowDiscountModal}>
        <DialogContent className="max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Percent className="w-5 h-5 text-blue-600" />
              </div>
              Aplicar Desconto
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Tipo de Desconto</Label>
              <div className="flex gap-2 mt-2">
                <Button
                  variant={discountType === "percent" ? "default" : "outline"}
                  onClick={() => setDiscountType("percent")}
                  className="flex-1 rounded-xl"
                >
                  Percentual (%)
                </Button>
                <Button
                  variant={discountType === "value" ? "default" : "outline"}
                  onClick={() => setDiscountType("value")}
                  className="flex-1 rounded-xl"
                >
                  Valor (R$)
                </Button>
              </div>
            </div>

            <div>
              <Label>{discountType === "percent" ? "Percentual de Desconto (%)" : "Valor do Desconto (R$)"}</Label>
              <Input
                type="number"
                step={discountType === "percent" ? "1" : "0.01"}
                value={discountValue}
                onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                placeholder={discountType === "percent" ? "Ex: 10" : "Ex: 50.00"}
                className="rounded-xl text-lg"
              />
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="text-sm text-gray-600 mb-1">Desconto Total</div>
              <div className="text-2xl font-bold text-gray-900">
                R$ {(discountType === "percent" 
                  ? (cartSubtotal * discountValue) / 100
                  : discountValue
                ).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Total final: R$ {(cartSubtotal - (discountType === "percent" 
                  ? (cartSubtotal * discountValue) / 100
                  : discountValue
                )).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline"
                onClick={() => setShowDiscountModal(false)}
                className="flex-1 rounded-xl"
              >
                Cancelar
              </Button>
              <Button 
                onClick={applyDiscount}
                className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700"
              >
                Aplicar Desconto
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Cliente */}
      <Dialog open={showCustomerModal} onOpenChange={setShowCustomerModal}>
        <DialogContent className="max-w-2xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Selecionar Cliente</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por nome, telefone ou CPF..."
                value={customerSearchTerm}
                onChange={(e) => setCustomerSearchTerm(e.target.value)}
                className="pl-10 rounded-xl"
              />
            </div>

            <ScrollArea className="h-[420px]">
              <div className="space-y-2 pr-3">
                {contacts
                  .filter(c => 
                    c.first_name?.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                    c.last_name?.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                    c.phone?.includes(customerSearchTerm) ||
                    c.document_number?.includes(customerSearchTerm)
                  )
                  .slice(0, 50)
                  .map((contact) => {
                    const fullName = `${contact.first_name || ''} ${contact.last_name || ''}`.trim();
                    return (
                      <button
                        key={contact.id}
                        type="button"
                        className="w-full p-3 border rounded-xl hover:bg-gray-50 transition-all text-left"
                        onClick={() => {
                          setCustomer(contact);
                          setShowCustomerModal(false);
                          setCustomerSearchTerm("");
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="w-9 h-9 flex-shrink-0">
                            <AvatarImage src={contact.avatar_url} />
                            <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                              {contact.first_name?.[0]}{contact.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate" title={fullName}>
                              {fullName}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {contact.phone || contact.document_number || '-'}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Pagamento */}
      <Dialog open={showPayment} onOpenChange={(open) => {
        setShowPayment(open);
        if (!open) {
          setPaymentStep(1);
          setSelectedPaymentMethod("");
        }
      }}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Finalizar Venda {paymentStep === 1 ? '- Depósitos' : '- Pagamento'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {paymentStep === 1 ? (
              /* Etapa 1: Selecionar Depósitos */
              <div className="space-y-3">
                <div className="text-sm text-gray-600">
                  Selecione o depósito de saída para cada produto:
                </div>
                <ScrollArea className="max-h-96">
                  <div className="space-y-3 pr-3">
                    {cart.map(item => {
                      const product = products.find(p => p.id === item.product_id);
                      const availableWarehouses = warehouses.filter(wh => {
                        const balance = balances.find(b => b.product_id === item.product_id && b.warehouse_id === wh.id);
                        return balance && balance.available_quantity >= item.quantity;
                      });

                      return (
                        <div key={item.product_id} className="p-3 border rounded-xl">
                          <div className="font-medium text-sm mb-2">{item.product_name}</div>
                          <div className="text-xs text-gray-500 mb-2">Quantidade: {item.quantity}</div>
                          <select
                            value={itemWarehouses[item.product_id] || ''}
                            onChange={(e) => setItemWarehouses(prev => ({
                              ...prev,
                              [item.product_id]: e.target.value
                            }))}
                            className="w-full p-2 border border-gray-200 rounded-lg text-sm bg-white"
                          >
                            <option value="">Selecione o depósito</option>
                            {availableWarehouses.map(wh => {
                              const balance = balances.find(b => b.product_id === item.product_id && b.warehouse_id === wh.id);
                              return (
                                <option key={wh.id} value={wh.id}>
                                  {wh.name} (Disp: {balance?.available_quantity || 0})
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              /* Etapa 2: Pagamento */
              <>
                {/* Cliente */}
                {customer && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <Avatar className="w-9 h-9">
                      <AvatarImage src={customer.avatar_url} />
                      <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                        {customer.first_name?.[0]}{customer.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium">{customer.first_name} {customer.last_name}</div>
                      <div className="text-xs text-gray-500">{customer.phone || customer.document_number || '-'}</div>
                    </div>
                  </div>
                )}

                {/* Resumo */}
                <div className="space-y-2 p-4 bg-gray-50 rounded-xl">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">
                      R$ {cartSubtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  {cartDiscount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Desconto</span>
                      <span className="font-medium text-red-600">
                        - R$ {cartDiscount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-200">
                    <span>Total</span>
                    <span className="text-green-600">
                      R$ {cartTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Forma de Pagamento */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Forma de Pagamento</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod('pix')}
                      className={`p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                        selectedPaymentMethod === 'pix'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <DollarSign className="w-5 h-5 mx-auto mb-1" />
                      PIX
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod('credit_card')}
                      className={`p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                        selectedPaymentMethod === 'credit_card'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <CreditCard className="w-5 h-5 mx-auto mb-1" />
                      Cartão
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod('cash')}
                      className={`p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                        selectedPaymentMethod === 'cash'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <DollarSign className="w-5 h-5 mx-auto mb-1" />
                      Dinheiro
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod('credit')}
                      className={`p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                        selectedPaymentMethod === 'credit'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <Receipt className="w-5 h-5 mx-auto mb-1" />
                      A Prazo
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button 
              variant="outline"
              onClick={() => {
                if (paymentStep === 1) {
                  setShowPayment(false);
                  setPaymentStep(1);
                  setSelectedPaymentMethod("");
                } else {
                  setPaymentStep(1);
                }
              }}
              className="flex-1 rounded-xl"
            >
              {paymentStep === 1 ? 'Cancelar' : 'Voltar'}
            </Button>
            <Button 
              onClick={() => {
                if (paymentStep === 1) {
                  const missingWarehouses = cart.filter(item => !itemWarehouses[item.product_id]);
                  if (missingWarehouses.length > 0) {
                    alert("Selecione o depósito para todos os produtos");
                    return;
                  }
                  setPaymentStep(2);
                } else {
                  handleCompleteSale();
                }
              }}
              disabled={(paymentStep === 2 && (!selectedPaymentMethod || isProcessingSale))}
              className="flex-1 rounded-xl bg-green-600 hover:bg-green-700"
            >
              {paymentStep === 2 && isProcessingSale ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                paymentStep === 1 ? 'Continuar' : 'Confirmar Venda'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}