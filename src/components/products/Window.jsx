import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Minus, Maximize2 } from "lucide-react";
import { motion } from "framer-motion";
import ProductsModule from './modules/ProductsModule';
import SalesModule from './modules/SalesModule';
import LogisticsModule from './modules/LogisticsModule';
import BrandsModule from './modules/BrandsModule';
import CategoriesModule from './modules/CategoriesModule';
import SuppliersModule from './modules/SuppliersModule';
import PurchaseOrdersModule from './modules/PurchaseOrdersModule';
import ReceiptsModule from './modules/ReceiptsModule';
import InvoicesInModule from './modules/InvoicesInModule';
import WarehousesModule from './modules/WarehousesModule';
import StockBalanceModule from './modules/StockBalanceModule';
import InventoryModule from './modules/InventoryModule';
import PlaceholderModule from './modules/PlaceholderModule';
import ProductEntryModule from './modules/ProductEntryModule';

const moduleComponents = {
  'products-catalog': ProductsModule,
  'sales': SalesModule,
  'product-entry': ProductEntryModule,
  'logistics': LogisticsModule,
  'brands': BrandsModule,
  'categories': CategoriesModule,
  'suppliers': SuppliersModule,
  'purchase-orders': PurchaseOrdersModule,
  'receipts': ReceiptsModule,
  'invoices-in': InvoicesInModule,
  'warehouses': WarehousesModule,
  'stock-balance': StockBalanceModule,
  'inventory': InventoryModule,
  'reports': PlaceholderModule
};

export default function Window({ window: windowData, module, isActive, zIndex, onClose, onMinimize, onFocus }) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [position, setPosition] = useState(() => windowData.position || { x: 32 + Math.random() * 100, y: 32 + Math.random() * 100 });
  const [size, setSize] = useState(() => windowData.size || { width: 900, height: 650 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const ModuleComponent = moduleComponents[windowData.moduleId] || PlaceholderModule;

  // Salvar estado da janela quando posição ou tamanho mudam
  useEffect(() => {
    const updateWindowState = () => {
      const event = new CustomEvent('updateWindowState', {
        detail: {
          id: windowData.id,
          position,
          size,
          isMaximized
        }
      });
      window.dispatchEvent(event);
    };

    const timeoutId = setTimeout(updateWindowState, 300);
    return () => clearTimeout(timeoutId);
  }, [position, size, isMaximized, windowData.id]);

  const handleMaximize = () => {
    setIsMaximized(!isMaximized);
  };

  const handleMouseDownDrag = (e) => {
    if (isMaximized) return;
    if (e.button !== 0) return; // Apenas botão esquerdo
    
    // Não prevenir se for um botão
    if (e.target.closest('button')) return;
    
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
    onFocus();
  };

  const handleMouseDownResize = (e) => {
    if (isMaximized) return;
    if (e.button !== 0) return; // Apenas botão esquerdo
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height
    });
    onFocus();
  };

  React.useEffect(() => {
    const handleMouseMove = (e) => {
      e.preventDefault();
      
      if (isDragging) {
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;
        
        // Limites mais permissivos para melhor usabilidade
        setPosition({
          x: Math.max(-50, Math.min(window.innerWidth - 250, newX)),
          y: Math.max(0, Math.min(window.innerHeight - 80, newY))
        });
      } else if (isResizing) {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;
        
        const newWidth = Math.max(400, resizeStart.width + deltaX);
        const newHeight = Math.max(300, resizeStart.height + deltaY);
        
        setSize({
          width: Math.min(newWidth, window.innerWidth - position.x - 20),
          height: Math.min(newHeight, window.innerHeight - position.y - 20)
        });
      }
    };

    const handleMouseUp = (e) => {
      e.preventDefault();
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove, { passive: false });
      window.addEventListener('mouseup', handleMouseUp, { passive: false });
      document.body.style.cursor = isDragging ? 'move' : 'se-resize';
      document.body.style.userSelect = 'none';
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isDragging, isResizing, dragStart, resizeStart, position, resizeStart.width, resizeStart.height]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ 
        opacity: 1, 
        scale: 1, 
        y: 0
      }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      transition={{ duration: 0.2 }}
      className="absolute"
      style={{ 
        zIndex,
        left: isMaximized ? 0 : `${position.x}px`,
        top: isMaximized ? 0 : `${position.y}px`,
        width: isMaximized ? '100%' : `${size.width}px`,
        height: isMaximized ? '100%' : `${size.height}px`,
        pointerEvents: 'auto',
        touchAction: 'none'
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        onFocus();
      }}
    >
      <Card className={`rounded-3xl shadow-2xl h-full flex flex-col overflow-hidden ${
        isActive ? 'ring-2 ring-blue-500' : ''
      }`}>
        {/* Header da Janela */}
        <div 
          className={`flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white rounded-t-3xl ${
            isMaximized ? '' : 'cursor-move active:cursor-grabbing hover:bg-gray-50'
          }`}
          onMouseDown={handleMouseDownDrag}
          style={{ 
            userSelect: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none'
          }}
        >
          <div className="flex items-center gap-3">
            {module && (
              <div className={`w-8 h-8 rounded-xl ${module.color} flex items-center justify-center`}>
                <module.icon className="w-4 h-4" />
              </div>
            )}
            <h2 className="font-semibold text-gray-900">{windowData.title}</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onMinimize();
              }}
              className="rounded-full hover:bg-gray-100"
            >
              <Minus className="w-4 h-4 text-gray-600" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                handleMaximize();
              }}
              className="rounded-full hover:bg-gray-100"
            >
              <Maximize2 className="w-4 h-4 text-gray-600" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="rounded-full hover:bg-red-50 hover:text-red-600"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Conteúdo do Módulo */}
        <div className="flex-1 overflow-auto bg-gray-50">
          <ModuleComponent module={module} />
        </div>

        {/* Resize Handle */}
        {!isMaximized && (
          <div
            className="absolute bottom-0 right-0 w-8 h-8 cursor-se-resize"
            onMouseDown={handleMouseDownResize}
            style={{ zIndex: 10 }}
          >
            <svg className="absolute bottom-2 right-2 w-4 h-4" viewBox="0 0 16 16">
              <line x1="10" y1="16" x2="16" y2="10" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="6" y1="16" x2="16" y2="6" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        )}
      </Card>
    </motion.div>
  );
}