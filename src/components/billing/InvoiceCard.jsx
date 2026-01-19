import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, Download, Eye, MoreVertical, Calendar } from "lucide-react";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const statusConfig = {
  paid: { label: "Pago", color: "bg-green-100 text-green-800 border-green-200" },
  pending: { label: "Pendente", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  overdue: { label: "Vencida", color: "bg-red-100 text-red-800 border-red-200" },
  cancelled: { label: "Cancelada", color: "bg-gray-100 text-gray-800 border-gray-200" },
};

export default function InvoiceCard({ invoice, onDownload, onViewDetails }) {
  const currentStatus = statusConfig[invoice.status] || statusConfig.pending;

  return (
    <Card className="rounded-3xl border-gray-200 hover:shadow-lg transition-shadow flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-2xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">{invoice.invoice_number}</CardTitle>
              <p className="text-sm text-gray-500">
                {format(new Date(invoice.issue_date), "dd/MM/yyyy")}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-2xl">
              <DropdownMenuItem onClick={() => onViewDetails(invoice)} className="rounded-xl">
                <Eye className="w-4 h-4 mr-2" />
                Ver Detalhes
              </DropdownMenuItem>
              {invoice.pdf_url && (
                <DropdownMenuItem onClick={() => onDownload(invoice)} className="rounded-xl">
                  <Download className="w-4 h-4 mr-2" />
                  Baixar PDF
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        <p className="text-gray-600">{invoice.description}</p>
        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
          <Badge className={`text-xs ${currentStatus.color}`}>{currentStatus.label}</Badge>
          <p className="text-2xl font-bold text-gray-900">
            R$ {invoice.amount.toFixed(2).replace('.', ',')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}