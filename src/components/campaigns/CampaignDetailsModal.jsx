import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Megaphone,
  X,
  Edit,
  History,
  Users,
  Calendar,
  Tag,
  Send,
  Eye,
  Target
} from "lucide-react";
import { format } from "date-fns";

export default function CampaignDetailsModal({ open, onClose, campaign, onEdit, onViewHistory, contacts }) {
  if (!open || !campaign) return null;

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { color: 'bg-gray-100 text-gray-800', text: 'Rascunho' },
      pending_approval: { color: 'bg-yellow-100 text-yellow-800', text: 'Pendente' },
      approved: { color: 'bg-blue-100 text-blue-800', text: 'Aprovado' },
      scheduled: { color: 'bg-purple-100 text-purple-800', text: 'Agendado' },
      running: { color: 'bg-green-100 text-green-800', text: 'Executando' },
      paused: { color: 'bg-orange-100 text-orange-800', text: 'Pausado' },
      completed: { color: 'bg-green-100 text-green-800', text: 'Concluído' },
      cancelled: { color: 'bg-red-100 text-red-800', text: 'Cancelado' }
    };

    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', text: status };
    return (
      <Badge className={`${config.color} rounded-full text-xs`}>
        {config.text}
      </Badge>
    );
  };

  const getTypeColor = (type) => {
    const typeColors = {
      birthday: '#ec4899',
      billing: '#ef4444',
      welcome: '#10b981',
      promotional: '#3b82f6',
      retention: '#8b5cf6',
      follow_up: '#f59e0b',
      other: '#6b7280'
    };
    return typeColors[type] || '#6b7280';
  };

  const getCampaignColor = (campaign) => {
    const colorMap = {
      'bg-blue-500': '#3b82f6',
      'bg-green-500': '#10b981',
      'bg-purple-500': '#8b5cf6',
      'bg-red-500': '#ef4444',
      'bg-yellow-500': '#eab308',
      'bg-pink-500': '#ec4899'
    };
    
    if (campaign.color && colorMap[campaign.color]) {
      return colorMap[campaign.color];
    }
    return getTypeColor(campaign.type);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[900px] max-w-[95vw] bg-white shadow-xl border-0 overflow-hidden p-0 [&>button]:hidden"
        style={{ 
          maxHeight: '90vh',
          borderRadius: '2rem'
        }}
      >
        {/* Header */}
        <div 
          className="relative flex-shrink-0 bg-gradient-to-br from-purple-600 to-purple-700"
          style={{ 
            height: '80px',
            borderTopLeftRadius: '2rem',
            borderTopRightRadius: '2rem'
          }}
        >
          {/* Título e ícone - posição absoluta à esquerda */}
          <div className="absolute left-8 top-1/2 transform -translate-y-1/2 flex items-center gap-3">
            <div className="w-10 h-10 bg-white/30 rounded-2xl flex items-center justify-center">
              <Eye className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-semibold text-white">
              Detalhes do Público-alvo
            </span>
          </div>
          
          {/* Botão de fechar - posição absoluta à direita */}
          <button
            onClick={onClose}
            className="absolute right-8 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors duration-200"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Content - Com scroll vertical */}
        <div 
          className="overflow-y-auto"
          style={{ 
            maxHeight: 'calc(90vh - 160px)' // 90vh - header(80px) - footer(80px)
          }}
        >
          <div className="p-6 space-y-6">
            {/* Header da Campanha */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div 
                  className="w-16 h-16 rounded-3xl flex items-center justify-center"
                  style={{ 
                    backgroundColor: `${getCampaignColor(campaign)}20`, 
                    color: getCampaignColor(campaign) 
                  }}
                >
                  <Megaphone className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">{campaign.name}</h2>
                  <div className="flex items-center gap-3">
                    <Badge 
                      className="text-xs px-3 py-1 rounded-full"
                      style={{ 
                        backgroundColor: `${getCampaignColor(campaign)}20`,
                        color: getCampaignColor(campaign)
                      }}
                    >
                      {campaign.type}
                    </Badge>
                    {getStatusBadge(campaign.status)}
                  </div>
                </div>
              </div>
            </div>

            {/* Descrição */}
            {campaign.description && (
              <Card className="rounded-3xl border-gray-200">
                <CardContent className="p-6">
                  <p className="text-gray-700">{campaign.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Estatísticas */}
            <Card className="rounded-3xl border-gray-200">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="w-5 h-5 text-purple-600" />
                  Estatísticas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-2xl">
                    <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-2">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{campaign.count_contacts || 0}</p>
                    <p className="text-sm text-blue-600">Contatos</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-2xl">
                    <div className="w-10 h-10 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-2">
                      <Send className="w-5 h-5 text-green-600" />
                    </div>
                    <p className="text-2xl font-bold text-green-600">{campaign.metrics?.messages_sent || 0}</p>
                    <p className="text-sm text-green-600">Enviadas</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-2xl">
                    <div className="w-10 h-10 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-2">
                      <Eye className="w-5 h-5 text-purple-600" />
                    </div>
                    <p className="text-2xl font-bold text-purple-600">{campaign.metrics?.messages_opened || 0}</p>
                    <p className="text-sm text-purple-600">Abertas</p>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-2xl">
                    <div className="w-10 h-10 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-2">
                      <Target className="w-5 h-5 text-orange-600" />
                    </div>
                    <p className="text-2xl font-bold text-orange-600">{campaign.metrics?.messages_clicked || 0}</p>
                    <p className="text-sm text-orange-600">Cliques</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Público-alvo */}
            {campaign.target_audience && (
              <Card className="rounded-3xl border-gray-200">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="w-5 h-5 text-purple-600" />
                    Público-alvo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {campaign.target_audience.tags && campaign.target_audience.tags.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Marcadores:</p>
                      <div className="flex flex-wrap gap-2">
                        {campaign.target_audience.tags.map((tag, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="rounded-full px-3 py-1 bg-purple-100 text-purple-800 border-purple-200"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {campaign.target_audience.customer_ids && campaign.target_audience.customer_ids.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Contatos Selecionados: {campaign.target_audience.customer_ids.length}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Conteúdo da Mensagem */}
            {campaign.message_content && (
              <Card className="rounded-3xl border-gray-200">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Tag className="w-5 h-5 text-purple-600" />
                    Conteúdo da Mensagem
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {campaign.message_content.subject && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Assunto:</p>
                      <p className="text-gray-900 bg-gray-50 p-3 rounded-2xl">{campaign.message_content.subject}</p>
                    </div>
                  )}
                  
                  {campaign.message_content.body && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Mensagem:</p>
                      <div className="text-gray-900 bg-gray-50 p-4 rounded-2xl whitespace-pre-wrap">
                        {campaign.message_content.body}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Informações de Data */}
            <Card className="rounded-3xl border-gray-200">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  Datas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Data de Criação:</p>
                    <p className="text-gray-900">{format(new Date(campaign.created_date), 'dd/MM/yyyy HH:mm')}</p>
                  </div>
                  
                  {campaign.start_date && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Data de Início:</p>
                      <p className="text-gray-900">{format(new Date(campaign.start_date), 'dd/MM/yyyy HH:mm')}</p>
                    </div>
                  )}
                  
                  {campaign.end_date && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Data de Fim:</p>
                      <p className="text-gray-900">{format(new Date(campaign.end_date), 'dd/MM/yyyy HH:mm')}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div 
          className="relative flex-shrink-0 bg-white border-t border-gray-200"
          style={{ height: '80px' }}
        >
          <div className="h-full flex justify-between items-center px-8">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl"
            >
              <X className="w-4 h-4 mr-2" />
              Fechar
            </Button>
            
            <div className="flex gap-3">
              <Button
                onClick={() => onViewHistory(campaign)}
                variant="outline"
                className="rounded-xl"
              >
                <History className="w-4 h-4 mr-2" />
                Ver Histórico
              </Button>
              
              <Button
                onClick={() => onEdit(campaign)}
                className="rounded-xl text-white bg-purple-600 hover:bg-purple-700"
              >
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}