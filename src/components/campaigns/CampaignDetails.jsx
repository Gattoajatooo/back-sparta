import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Megaphone,
  Users,
  Calendar,
  Activity,
  Edit,
  Trash2,
  X,
  Target,
  Clock,
  Gift,
  DollarSign,
  Star,
  Heart
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function CampaignDetails({ campaign, onClose, onEdit, onDelete }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'pending_approval':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'running':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'draft': return 'Rascunho';
      case 'pending_approval': return 'Aguardando Aprovação';
      case 'approved': return 'Aprovada';
      case 'scheduled': return 'Agendada';
      case 'running': return 'Ativa';
      case 'paused': return 'Pausada';
      case 'completed': return 'Concluída';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'birthday': return Gift;
      case 'billing': return DollarSign;
      case 'welcome': return Star;
      case 'promotional': return Megaphone;
      case 'retention': return Heart;
      case 'follow_up': return Clock;
      default: return Target;
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'birthday': return 'Aniversário';
      case 'billing': return 'Cobrança';
      case 'welcome': return 'Boas-vindas';
      case 'promotional': return 'Promocional';
      case 'retention': return 'Retenção';
      case 'follow_up': return 'Follow-up';
      case 'other': return 'Outros';
      default: return type;
    }
  };

  const TypeIcon = getTypeIcon(campaign.type);
  const totalContacts = campaign.target_audience?.customer_ids?.length || 0;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className={`w-12 h-12 ${campaign.color || 'bg-blue-500'} rounded-2xl flex items-center justify-center`}>
                <TypeIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{campaign.name}</h2>
                <p className="text-sm text-gray-500">{getTypeLabel(campaign.type)}</p>
              </div>
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`rounded-full ${getStatusColor(campaign.status)}`}>
                {getStatusLabel(campaign.status)}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Campaign Overview */}
          <Card className="rounded-2xl border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg">Visão Geral</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-xl">
                  <Users className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-blue-600">{totalContacts}</p>
                  <p className="text-sm text-blue-600">Contatos</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-xl">
                  <Target className="w-6 h-6 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-600">{campaign.metrics?.delivered || 0}</p>
                  <p className="text-sm text-green-600">Entregues</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-xl">
                  <Activity className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-purple-600">{campaign.metrics?.conversions || 0}</p>
                  <p className="text-sm text-purple-600">Conversões</p>
                </div>
              </div>

              {campaign.description && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-700">{campaign.description}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Data de Início</p>
                  <p className="text-base">
                    {campaign.start_date 
                      ? format(parseISO(campaign.start_date), 'PPp', { locale: ptBR }) 
                      : 'Não definida'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Data de Término</p>
                  <p className="text-base">
                    {campaign.end_date 
                      ? format(parseISO(campaign.end_date), 'PPp', { locale: ptBR }) 
                      : 'Não definida'
                    }
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Criada em</p>
                <p className="text-base">
                  {format(parseISO(campaign.created_date), 'PPp', { locale: ptBR })}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Target Contacts */}
          {totalContacts > 0 && (
            <Card className="rounded-2xl border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="w-5 h-5" />
                  Contatos da Campanha ({totalContacts})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-lg font-medium mb-1">{totalContacts} contatos selecionados</p>
                  <p className="text-sm">Esta campanha será enviada para {totalContacts} contatos</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-between items-center pt-6 border-t border-gray-200">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onEdit(campaign)} className="rounded-xl">
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onDelete(campaign)} 
              className="rounded-xl text-red-600 border-red-200 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </Button>
          </div>
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            <X className="w-4 h-4 mr-2" />
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}