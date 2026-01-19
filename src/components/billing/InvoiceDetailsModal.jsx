import React from 'react';
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Download, X, Calendar } from "lucide-react";
import { format } from "date-fns";

const statusConfig = {
  paid: { label: "Pago", color: "bg-green-100 text-green-800 border-green-200" },
  pending: { label: "Pendente", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  overdue: { label: "Vencida", color: "bg-red-100 text-red-800 border-red-200" },
  cancelled: { label: "Cancelada", color: "bg-gray-100 text-gray-800 border-gray-200" },
};

export default function InvoiceDetailsModal({ invoice, open, onClose, onDownload }) {
  if (!invoice) return null;

  const currentStatus = statusConfig[invoice.status] || statusConfig.pending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] max-w-[95vw] bg-white shadow-xl border-0 overflow-hidden p-0 [&>button]:hidden"
        style={{ 
          maxHeight: '85vh',
          borderRadius: '2rem'
        }}
      >
        <div 
          className="relative flex-shrink-0 bg-gradient-to-br from-green-600 to-green-700"
          style={{ 
            height: '80px',
            borderTopLeftRadius: '2rem',
            borderTopRightRadius: '2rem'
          }}
        >
          <div className="absolute left-8 top-1/2 transform -translate-y-1/2 flex items-center gap-3">
            <div className="w-10 h-10 bg-white/30 rounded-2xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-semibold text-white">
              Detalhes da Fatura
            </span>
          </div>
          
          <button
            onClick={onClose}
            className="absolute right-8 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors duration-200"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div 
          className="flex-1 overflow-y-auto"
          style={{ 
            maxHeight: 'calc(85vh - 80px - 100px)',
            minHeight: '300px'
          }}
        >
          <div className="p-8 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{invoice.invoice_number}</h2>
                <p className="text-gray-600">{invoice.description}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-900">R$ {invoice.amount.toFixed(2).replace('.', ',')}</p>
                <Badge className={`mt-1 text-sm ${currentStatus.color}`}>{currentStatus.label}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-4 border-t border-gray-200">
              <div>
                <span className="text-sm text-gray-500">Data de Emissão</span>
                <p className="font-medium text-gray-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  {format(new Date(invoice.issue_date), "dd/MM/yyyy")}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Data de Vencimento</span>
                <p className="font-medium text-gray-900 flex items-center gap-2">
                   <Calendar className="w-4 h-4 text-gray-400" />
                   {format(new Date(invoice.due_date), "dd/MM/yyyy")}
                </p>
              </div>
              {invoice.status === 'paid' && invoice.paid_date && (
                 <div>
                   <span className="text-sm text-gray-500">Data de Pagamento</span>
                   <p className="font-medium text-green-700 flex items-center gap-2">
                     <Calendar className="w-4 h-4 text-green-500" />
                     {format(new Date(invoice.paid_date), "dd/MM/yyyy")}
                   </p>
                 </div>
              )}
            </div>
             <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Plano</h3>
                <p className="text-gray-600">{invoice.plan_name}</p>
             </div>
          </div>
        </div>

        <div 
          className="flex-shrink-0 flex justify-between items-center bg-gray-50 px-8 border-t border-gray-200"
          style={{ 
            height: '100px',
            borderBottomLeftRadius: '2rem',
            borderBottomRightRadius: '2rem'
          }}
        >
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose}
            className="rounded-xl"
          >
            <X className="w-4 h-4 mr-2" />
            Fechar
          </Button>
          {invoice.pdf_url && (
            <Button 
              onClick={() => onDownload(invoice)}
              className="bg-green-600 hover:bg-green-700 rounded-xl"
            >
              <Download className="w-4 h-4 mr-2" />
              Baixar Fatura (PDF)
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}