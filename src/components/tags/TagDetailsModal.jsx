import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  X,
  Tag as TagIcon,
  Users,
  TrendingUp,
  Calendar,
  Zap,
  Edit,
  Settings,
  Loader2
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function TagDetailsModal({ open, onClose, tag, contacts = [], onEdit, onConfigureRules }) {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setIsLoading(false);
    }
  }, [open]);

  const taggedContacts = contacts.filter(contact => 
    contact.tags && contact.tags.includes(tag?.name)
  );

  const formatPhone = (phone) => {
    if (!phone) return '';
    
    const numbers = phone.replace(/\D/g, '');
    
    if (numbers.startsWith('55') && numbers.length >= 12) {
      const areaCode = numbers.substring(2, 4);
      const remaining = numbers.substring(4);
      
      if (remaining.length === 9) {
        const mobile = remaining.substring(0, 1);
        const part1 = remaining.substring(1, 5);
        const part2 = remaining.substring(5);
        return `+55 ${areaCode} ${mobile}${part1}-${part2}`;
      }
      else if (remaining.length === 8) {
        const part1 = remaining.substring(0, 4);
        const part2 = remaining.substring(4);
        return `+55 ${areaCode} ${part1}-${part2}`;
      }
    }
    
    return phone.startsWith('+') ? phone : `+${phone}`;
  };

  if (!open || !tag) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-3xl w-[95vw] sm:w-[90vw] md:w-[85vw] lg:w-[80vw] xl:max-w-3xl max-h-[95vh] p-0 overflow-hidden flex flex-col rounded-[2.5rem] [&>button]:hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: tag?.color + '20', color: tag?.color }}
              >
                <TagIcon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {tag?.name}
                </h2>
                <p className="text-sm text-gray-600">
                  Detalhes e estatísticas do marcador
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-lg"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div 
          className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6"
          style={{ 
            maxHeight: 'calc(95vh - 140px)',
            minHeight: '300px'
          }}
        >
          {/* Informações do Marcador */}
          <Card className="rounded-2xl border-gray-200">
            <CardContent className="p-6">
              {tag.description && (
                <p className="text-sm text-gray-600 mb-4 bg-gray-50 p-3 rounded-xl">{tag.description}</p>
              )}
              
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center p-3 bg-teal-50 rounded-xl">
                  <div className="flex items-center justify-center gap-1 text-teal-600 mb-1">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="text-2xl font-bold text-teal-600">{tag.contacts_count || 0}</div>
                  <div className="text-xs text-teal-600 mt-1">Contatos</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-xl">
                  <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div className="text-2xl font-bold text-blue-600">{tag.usage_stats?.total_applied || 0}</div>
                  <div className="text-xs text-blue-600 mt-1">Uso Total</div>
                </div>
                {tag.is_smart && (
                  <div className="text-center p-3 bg-purple-50 rounded-xl">
                    <div className="flex items-center justify-center gap-1 text-purple-600 mb-1">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div className="text-xs font-medium text-purple-600">
                      {tag.smart_rules?.auto_apply ? 'Automático' : 'Manual'}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                <Badge 
                  variant={tag.is_active ? "default" : "secondary"}
                  className="rounded-full text-xs"
                >
                  {tag.is_active ? "Ativo" : "Inativo"}
                </Badge>
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {tag.created_date ? format(parseISO(tag.created_date), 'PPP', { locale: ptBR }) : '-'}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contatos com esta Tag */}
          {taggedContacts.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contatos ({taggedContacts.length})</h3>
              
              <Card className="rounded-2xl border-gray-200">
                <CardContent className="p-4">
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {taggedContacts.slice(0, 20).map((contact) => (
                      <div key={contact.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-gradient-to-br from-teal-400 to-teal-500 text-white text-sm">
                            {contact.first_name?.[0]}{contact.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 truncate">
                            {contact.first_name} {contact.last_name}
                          </p>
                          {contact.email && (
                            <p className="text-xs text-gray-500 truncate">{contact.email}</p>
                          )}
                          {contact.phone && (
                            <p className="text-xs text-gray-500 truncate">{formatPhone(contact.phone)}</p>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {taggedContacts.length > 20 && (
                      <div className="text-center py-3 text-sm text-gray-500 bg-gray-50 rounded-xl">
                        e mais {taggedContacts.length - 20} contatos...
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end items-center gap-3 p-6 bg-gray-50 border-t border-gray-200">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose}
            className="rounded-xl"
          >
            Fechar
          </Button>
          
          <Button
            onClick={() => onEdit(tag)}
            className="rounded-xl bg-blue-600 hover:bg-blue-700"
          >
            <Edit className="w-4 h-4 mr-2" />
            Editar Marcador
          </Button>
          
          {tag?.is_smart && (
            <Button
              onClick={() => onConfigureRules(tag)}
              variant="outline"
              className="rounded-xl"
            >
              <Settings className="w-4 h-4 mr-2" />
              Configurar Regras
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}