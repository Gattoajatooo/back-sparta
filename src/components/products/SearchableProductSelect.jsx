import React, { useState, useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, ShoppingBag } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function SearchableProductSelect({ products, value, onValueChange, placeholder = "Selecione o produto" }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = React.useRef(null);

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products;
    
    const search = searchTerm.toLowerCase();
    return products.filter(p => 
      p.name?.toLowerCase().includes(search) ||
      p.sku?.toLowerCase().includes(search) ||
      p.internal_code?.toLowerCase().includes(search)
    );
  }, [products, searchTerm]);

  // Manter foco no input quando filteredProducts mudar
  React.useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [filteredProducts, isOpen]);

  const selectedProduct = products.find(p => p.id === value);

  return (
    <Select 
      value={value} 
      onValueChange={(v) => {
        onValueChange(v);
        setSearchTerm("");
      }}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) setSearchTerm("");
      }}
    >
      <SelectTrigger className="rounded-xl">
        <SelectValue placeholder={placeholder}>
          {selectedProduct && (
            <div className="flex items-center gap-2">
              {selectedProduct.main_image ? (
                <img src={selectedProduct.main_image} alt={selectedProduct.name} className="w-5 h-5 rounded object-cover" />
              ) : (
                <div className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center">
                  <ShoppingBag className="w-3 h-3 text-gray-400" />
                </div>
              )}
              <span className="truncate">
                {selectedProduct.sku ? `[${selectedProduct.sku}] ` : ''}{selectedProduct.name}
              </span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="rounded-2xl">
        <div className="p-2 border-b sticky top-0 bg-white z-10">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              ref={inputRef}
              placeholder="Buscar produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 rounded-lg"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>
        </div>
        <ScrollArea className="max-h-[300px]">
          {filteredProducts.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">
              Nenhum produto encontrado
            </div>
          ) : (
            filteredProducts.map(p => (
              <SelectItem key={p.id} value={p.id} className="rounded-lg">
                <div className="flex items-center gap-2">
                  {p.main_image ? (
                    <img src={p.main_image} alt={p.name} className="w-6 h-6 rounded object-cover" />
                  ) : (
                    <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center">
                      <ShoppingBag className="w-3 h-3 text-gray-400" />
                    </div>
                  )}
                  <span>{p.sku ? `[${p.sku}] ` : ''}{p.name}</span>
                </div>
              </SelectItem>
            ))
          )}
        </ScrollArea>
      </SelectContent>
    </Select>
  );
}