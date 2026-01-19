import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Users,
  AlertTriangle,
  RefreshCw,
  Plus,
  X,
  Mail,
  Phone,
  FileText,
  Calendar
} from "lucide-react";
import { format } from "date-fns";

export default function DuplicateContactModal({ 
  open, 
  onClose, 
  existingContact, 
  newContactData, 
  duplicateField,
  duplicateValue,
  onUpdate,
  onCreateNew,
  onCancel 
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getDuplicateMessage = () => {
    switch (duplicateField) {
      case 'document_number':
        return `CPF/CNPJ: ${duplicateValue}`;
      case 'email':
        return `E-mail: ${duplicateValue}`;
      case 'phone':
        return `Telefone: ${duplicateValue}`;
      default:
        return `${duplicateField}: ${duplicateValue}`;
    }
  };

  const handleUpdate = async () => {
    setIsSubmitting(true);
    try {
      await onUpdate();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateNew = async () => {
    setIsSubmitting(true);
    try {
      await onCreateNew();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open || !existingContact) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[95vh] p-0 overflow-hidden rounded-3xl">
        {/* Header */}
        <DialogHeader className="flex-shrink-0 px-6 py-6 bg-orange-500 text-white rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <DialogTitle className="text-xl font-bold">
              Contato Duplicado Encontrado
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Alert */}
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Duplicata detectada:</strong> Já existe um contato com {getDuplicateMessage()}
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Existing Contact */}
            <Card className="rounded-2xl border-gray-200">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg text-gray-900">
                  <Users className="w-5 h-5 text-blue-600" />
                  Contato Existente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {existingContact.first_name} {existingContact.last_name}
                  </h3>
                  {existingContact.company_name && (
                    <p className="text-sm text-gray-600">{existingContact.company_name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  {existingContact.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">{existingContact.email}</span>
                    </div>
                  )}
                  
                  {existingContact.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">{existingContact.phone}</span>
                    </div>
                  )}
                  
                  {existingContact.document_number && (
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">{existingContact.document_number}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">
                      Criado em: {format(new Date(existingContact.created_date), 'dd/MM/yyyy')}
                    </span>
                  </div>
                </div>

                {existingContact.status && (
                  <Badge variant="outline" className="rounded-full">
                    {existingContact.status}
                  </Badge>
                )}

                {existingContact.tags && existingContact.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {existingContact.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs rounded-full">
                        {tag}
                      </Badge>
                    ))}
                    {existingContact.tags.length > 3 && (
                      <Badge variant="secondary" className="text-xs rounded-full">
                        +{existingContact.tags.length - 3} mais
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* New Contact Data */}
            <Card className="rounded-2xl border-gray-200">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg text-gray-900">
                  <Plus className="w-5 h-5 text-green-600" />
                  Novos Dados
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {newContactData.first_name} {newContactData.last_name}
                  </h3>
                  {newContactData.company_name && (
                    <p className="text-sm text-gray-600">{newContactData.company_name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  {newContactData.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">{newContactData.email}</span>
                    </div>
                  )}
                  
                  {newContactData.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">{newContactData.phone}</span>
                    </div>
                  )}
                  
                  {newContactData.document_number && (
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">{newContactData.document_number}</span>
                    </div>
                  )}
                </div>

                {newContactData.status && (
                  <Badge variant="outline" className="rounded-full">
                    {newContactData.status}
                  </Badge>
                )}

                {newContactData.tags && newContactData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {newContactData.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs rounded-full">
                        {tag}
                      </Badge>
                    ))}
                    {newContactData.tags.length > 3 && (
                      <Badge variant="secondary" className="text-xs rounded-full">
                        +{newContactData.tags.length - 3} mais
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Action Options */}
          <div className="bg-gray-50 rounded-2xl p-6">
            <h3 className="font-semibold text-gray-900 mb-4">O que você gostaria de fazer?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                onClick={handleUpdate}
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl h-auto p-4 flex flex-col items-center gap-2"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <RefreshCw className="w-5 h-5" />
                )}
                <div className="text-center">
                  <div className="font-semibold">Atualizar Existente</div>
                  <div className="text-xs opacity-90">Substituir dados do contato existente</div>
                </div>
              </Button>

              <Button
                onClick={handleCreateNew}
                disabled={isSubmitting}
                variant="outline"
                className="border-2 border-orange-300 text-orange-600 hover:bg-orange-50 rounded-2xl h-auto p-4 flex flex-col items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                <div className="text-center">
                  <div className="font-semibold">Criar Mesmo Assim</div>
                  <div className="text-xs opacity-90">Ignorar duplicata e criar novo</div>
                </div>
              </Button>

              <Button
                onClick={onCancel}
                variant="outline"
                className="border-2 border-gray-300 text-gray-600 hover:bg-gray-50 rounded-2xl h-auto p-4 flex flex-col items-center gap-2"
              >
                <X className="w-5 h-5" />
                <div className="text-center">
                  <div className="font-semibold">Cancelar</div>
                  <div className="text-xs opacity-90">Não realizar nenhuma ação</div>
                </div>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}