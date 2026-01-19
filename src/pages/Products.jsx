import React, { useState, useEffect } from 'react';
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Package,
  ShoppingCart,
  ShoppingBag,
  Truck,
  FileText,
  Boxes,
  Users,
  Tags,
  BarChart3,
  FolderTree,
  PackageCheck,
  Building2,
  ClipboardCheck,
  ArrowRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import WindowManager from "@/components/products/WindowManager";

export default function Products() {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [windows, setWindows] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const navigate = useNavigate();

  useEffect(() => {
    loadUser();
    
    // Carregar estado das janelas salvo
    const savedState = localStorage.getItem('windowsState');
    if (savedState) {
      try {
        const savedWindows = JSON.parse(savedState);
        setWindows(savedWindows);
      } catch (error) {
        console.error('Erro ao carregar estado das janelas:', error);
      }
    }

    // Escutar atualizações de estado das janelas
    const handleUpdateWindowState = (e) => {
      setWindows(prev => prev.map(w => 
        w.id === e.detail.id 
          ? { ...w, position: e.detail.position, size: e.detail.size, isMaximized: e.detail.isMaximized }
          : w
      ));
    };

    window.addEventListener('updateWindowState', handleUpdateWindowState);
    return () => window.removeEventListener('updateWindowState', handleUpdateWindowState);
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);

      // Carregar empresa para pegar configurações
      if (currentUser.company_id) {
        const Company = await import("@/entities/Company").then(m => m.Company);
        const companies = await Company.list();
        const userCompany = companies.find(c => c.id === currentUser.company_id);
        if (userCompany) {
          setCompany(userCompany);
        }
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Erro ao carregar usuário:", error);
      setIsLoading(false);
    }
  };

  const allModules = [
    // VERSÃO SIMPLIFICADA
    {
      id: 'products-catalog',
      title: 'Catálogo de Produtos',
      description: 'Gerencie seu catálogo de produtos',
      icon: Package,
      color: 'text-blue-600 bg-blue-50',
      available: true,
      category: 'Cadastros',
      simplified: true
    },
    {
      id: 'brands',
      title: 'Marcas',
      description: 'Cadastro de marcas',
      icon: Tags,
      color: 'text-pink-600 bg-pink-50',
      available: true,
      category: 'Cadastros',
      simplified: true
    },
    {
      id: 'categories',
      title: 'Categorias',
      description: 'Estrutura de categorias e subcategorias',
      icon: FolderTree,
      color: 'text-teal-600 bg-teal-50',
      available: true,
      category: 'Cadastros',
      simplified: true
    },
    {
      id: 'sales',
      title: 'PDV - Vendas',
      description: 'Ponto de venda completo',
      icon: ShoppingCart,
      color: 'text-green-600 bg-green-50',
      available: true,
      category: 'Vendas',
      simplified: true
    },
    {
      id: 'product-entry',
      title: 'Entrada de Produtos',
      description: 'Entrada simplificada de produtos no estoque',
      icon: PackageCheck,
      color: 'text-emerald-600 bg-emerald-50',
      available: true,
      category: 'Estoque',
      simplified: true
    },
    {
      id: 'warehouses',
      title: 'Depósitos',
      description: 'Cadastro de locais de estoque',
      icon: Building2,
      color: 'text-slate-600 bg-slate-50',
      available: true,
      category: 'Estoque',
      simplified: true
    },
    {
      id: 'stock-balance',
      title: 'Saldo de Estoque',
      description: 'Visão consolidada do estoque',
      icon: Boxes,
      color: 'text-indigo-600 bg-indigo-50',
      available: true,
      category: 'Estoque',
      simplified: true
    },
    // VERSÃO COMPLETA (bloqueada)
    {
      id: 'purchase-orders',
      title: 'Pedidos de Compra',
      description: 'Gestão de pedidos aos fornecedores',
      icon: ShoppingBag,
      color: 'text-violet-600 bg-violet-50',
      available: true,
      category: 'Compras',
      simplified: false
    },
    {
      id: 'receipts',
      title: 'Recebimentos',
      description: 'Registro de mercadorias recebidas',
      icon: PackageCheck,
      color: 'text-emerald-600 bg-emerald-50',
      available: true,
      category: 'Compras',
      simplified: false
    },
    {
      id: 'inventory',
      title: 'Inventários',
      description: 'Conferência física de estoque',
      icon: ClipboardCheck,
      color: 'text-amber-600 bg-amber-50',
      available: true,
      category: 'Estoque',
      simplified: false
    },
    {
      id: 'suppliers',
      title: 'Fornecedores',
      description: 'Cadastro e gestão de fornecedores',
      icon: Users,
      color: 'text-cyan-600 bg-cyan-50',
      available: true,
      category: 'Compras',
      simplified: false
    },
    {
      id: 'logistics',
      title: 'Logística',
      description: 'Gestão de entregas e transporte',
      icon: Truck,
      color: 'text-orange-600 bg-orange-50',
      available: true,
      category: 'Vendas',
      simplified: false
    },
    {
      id: 'reports',
      title: 'Relatórios',
      description: 'Relatórios e análises gerenciais',
      icon: BarChart3,
      color: 'text-amber-600 bg-amber-50',
      available: false,
      category: 'Relatórios',
      simplified: false
    }
  ];

  // Filtrar módulos baseado na configuração (sempre simplificada por enquanto)
  const productMode = company?.settings?.product_mode || 'simplified';
  const modules = allModules.filter(m => m.simplified);

  const handleOpenModule = (module) => {
    // Verificar se já existe uma janela aberta para este módulo
    const existingWindow = windows.find(w => w.id === module.id);
    
    if (existingWindow) {
      // Se já existe, apenas trazer para foco
      setWindows(prev => prev.map(w => ({
        ...w,
        isActive: w.id === module.id,
        isMinimized: w.id === module.id ? false : w.isMinimized
      })));
    } else {
      // Criar nova janela com estado padrão
      const newWindow = {
        id: module.id,
        title: module.title,
        moduleId: module.id,
        isActive: true,
        isMinimized: false,
        position: { x: 32 + Math.random() * 100, y: 32 + Math.random() * 100 },
        size: { width: 900, height: 650 },
        formData: null // Armazenará dados do formulário
      };

      setWindows(prev => [
        ...prev.map(w => ({ ...w, isActive: false })),
        newWindow
      ]);
    }
  };

  const handleMinimizeAll = () => {
    setWindows(prev => prev.map(w => ({ ...w, isMinimized: true, isActive: false })));
  };

  const handleCloseWindow = (windowId) => {
    setWindows(prev => prev.filter(w => w.id !== windowId));
  };

  const handleMinimizeWindow = (windowId) => {
    setWindows(prev => prev.map(w => 
      w.id === windowId 
        ? { ...w, isMinimized: true, isActive: false }
        : w
    ));
  };

  const handleRestoreWindow = (windowId) => {
    setWindows(prev => prev.map(w => ({
      ...w,
      isMinimized: w.id === windowId ? false : w.isMinimized,
      isActive: w.id === windowId
    })));
  };

  const handleFocusWindow = (windowId) => {
    setWindows(prev => prev.map(w => ({
      ...w,
      isActive: w.id === windowId
    })));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
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

  const hasActiveWindows = windows.some(w => !w.isMinimized);

  // Agrupar módulos por categoria
  const modulesByCategory = {
    'Cadastros': modules.filter(m => m.category === 'Cadastros'),
    'Vendas': modules.filter(m => m.category === 'Vendas'),
    'Compras': modules.filter(m => m.category === 'Compras'),
    'Estoque': modules.filter(m => m.category === 'Estoque'),
    'Relatórios': modules.filter(m => m.category === 'Relatórios')
  };

  return (
    <div className="relative h-full">
      {/* Cards de Módulos */}
      <div className={`transition-all duration-300 ${hasActiveWindows ? 'opacity-0 pointer-events-none absolute' : 'opacity-100'}`}>
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-3xl p-6 text-white">
            <h1 className="text-2xl font-bold mb-2">Produtos</h1>
            <p className="text-blue-100">
              Gerencie todos os aspectos da sua loja em um só lugar
            </p>
          </div>

          {/* Módulos por Categoria */}
          {Object.entries(modulesByCategory).map(([categoryName, categoryModules]) => {
            if (categoryModules.length === 0) return null;

            return (
              <div key={categoryName}>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">{categoryName}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categoryModules.map((module) => (
                    <Card
                      key={module.id}
                      className={`rounded-3xl border-gray-100 hover:shadow-lg transition-all ${!module.available ? 'opacity-60' : 'cursor-pointer'}`}
                      onClick={() => module.available && handleOpenModule(module)}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className={`w-12 h-12 rounded-2xl ${module.color} flex items-center justify-center`}>
                            <module.icon className="w-6 h-6" />
                          </div>
                          {!module.available && (
                            <Badge variant="secondary" className="rounded-full text-xs">
                              Em breve
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-lg mt-4">{module.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600 mb-4">{module.description}</p>
                        <Button
                          variant="ghost"
                          className="w-full justify-between rounded-xl"
                          disabled={!module.available}
                          onClick={(e) => {
                            if (module.available) {
                              e.stopPropagation();
                              handleOpenModule(module);
                            }
                          }}
                        >
                          Acessar
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Window Manager */}
      <WindowManager
        windows={windows}
        onClose={handleCloseWindow}
        onMinimize={handleMinimizeWindow}
        onRestore={handleRestoreWindow}
        onFocus={handleFocusWindow}
        onMinimizeAll={handleMinimizeAll}
        modules={modules}
      />
    </div>
  );
}