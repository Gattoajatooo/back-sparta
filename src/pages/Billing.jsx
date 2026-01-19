import React, { useState, useEffect, useCallback } from 'react';
import { User } from '@/entities/User';
import { Invoice } from '@/entities/Invoice';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
  Search,
  AlertCircle,
  LayoutGrid,
  List,
  X
} from "lucide-react";

import InvoiceCard from '../components/billing/InvoiceCard';
import InvoiceDetailsModal from '../components/billing/InvoiceDetailsModal';

const Banner = ({ show, message, type, onClose }) => {
  if (!show) return null;
  const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
  return (
    <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center justify-between ${bgColor} text-white`}>
      <span>{message}</span>
      <button onClick={onClose} className="ml-4 p-1 rounded-full hover:bg-white/20">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default function Billing() {
  const [user, setUser] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [banner, setBanner] = useState({ show: false, message: '', type: 'success' });
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [error, setError] = useState("");

  const showBanner = useCallback((message, type = 'success') => {
    setBanner({ show: true, message, type });
    setTimeout(() => setBanner({ show: false, message: '', type: 'success' }), 5000);
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const currentUser = await User.me();
      setUser(currentUser);
      
      const invoiceList = await Invoice.filter({ company_id: currentUser.company_id }, '-issue_date');
      setInvoices(Array.isArray(invoiceList) ? invoiceList : []);
      setFilteredInvoices(Array.isArray(invoiceList) ? invoiceList : []);

    } catch (e) {
      setError("Falha ao carregar faturas.");
      showBanner("Erro ao carregar faturas", "error");
      setInvoices([]);
      setFilteredInvoices([]);
    } finally {
      setIsLoading(false);
    }
  }, [showBanner]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    let result = invoices;
    if (statusFilter !== "all") {
      result = result.filter(invoice => invoice.status === statusFilter);
    }
    if (searchTerm) {
      result = result.filter(invoice =>
        invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    setFilteredInvoices(result);
  }, [searchTerm, statusFilter, invoices]);

  const handleViewDetails = (invoice) => {
    setSelectedInvoice(invoice);
    setShowDetailsModal(true);
  };

  const handleDownload = (invoice) => {
    if (invoice.pdf_url) {
      window.open(invoice.pdf_url, '_blank');
    } else {
      showBanner("PDF não disponível para esta fatura.", "error");
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto overflow-hidden">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690a8ae384e85f405dd1958f/8d6af0619_ChatGPTImage24denovde202519_02_27.png"
              alt="Sparta Sync"
              className="w-16 h-16 object-contain"
              onError={(e) => {
                console.error('Logo failed to load on Billing page');
                e.target.onerror = null;
                e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"%3E%3Ctext x="50%25" y="50%25" font-size="24" text-anchor="middle" dominant-baseline="middle"%3ESS%3C/text%3E%3C/svg%3E';
              }}
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

  return (
    <div className="space-y-6">
      <Banner show={banner.show} message={banner.message} type={banner.type} onClose={() => setBanner(p => ({...p, show: false}))} />
      
      {error && (
        <Alert variant="destructive" className="rounded-2xl">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-green-700 rounded-2xl flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Faturamento</h1>
            <p className="text-gray-600">Gerencie suas faturas e histórico de pagamentos.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className={`rounded-xl ${viewMode === 'grid' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className={`rounded-xl ${viewMode === 'list' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 md:max-w-md">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input 
            placeholder="Buscar por nº ou descrição..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="pl-10 rounded-2xl border-gray-200" 
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-48 rounded-2xl border-gray-200">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent className="rounded-2xl">
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="paid">Pago</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="overdue">Vencida</SelectItem>
            <SelectItem value="cancelled">Cancelada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredInvoices.length > 0 ? (
        <div className={viewMode === 'grid' ? 'grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : "space-y-4"}>
          {filteredInvoices.map(invoice => (
            <InvoiceCard 
              key={invoice.id} 
              invoice={invoice} 
              onDownload={handleDownload} 
              onViewDetails={handleViewDetails} 
            />
          ))}
        </div>
      ) : (
        <Card className="rounded-3xl border-gray-200">
          <CardContent className="text-center py-16">
            <DollarSign className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhuma fatura encontrada</h3>
            <p className="text-gray-500">
              {searchTerm || statusFilter !== 'all'
                ? 'Tente ajustar seus filtros de busca.'
                : 'Seu histórico de faturamento aparecerá aqui.'
              }
            </p>
          </CardContent>
        </Card>
      )}

      <InvoiceDetailsModal 
        invoice={selectedInvoice} 
        open={showDetailsModal} 
        onClose={() => setShowDetailsModal(false)} 
        onDownload={handleDownload}
      />
    </div>
  );
}