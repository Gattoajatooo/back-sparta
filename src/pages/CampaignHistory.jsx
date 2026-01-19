import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Campaign } from "@/entities/Campaign";
import { Communication } from "@/entities/Communication";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  History,
  Search,
  Calendar,
  Send,
  CheckCircle2,
  XCircle,
  Eye,
  MousePointer,
  MessageCircle,
  MessageSquare,
  ArrowUpDown,
  Filter,
  Download
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function CampaignHistory() {
  const [communications, setCommunications] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [sortBy, setSortBy] = useState("sent_date");
  const [sortOrder, setSortOrder] = useState("desc");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);

      if (currentUser.company_id) {
        const [campaignList, communicationList] = await Promise.all([
          Campaign.filter({ company_id: currentUser.company_id }, 'name'),
          Communication.filter({ company_id: currentUser.company_id }, '-sent_date', 200)
        ]);
        
        setCampaigns(campaignList);
        setCommunications(communicationList);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCommunications = communications
    .filter(comm => {
      const matchesSearch = !searchTerm || 
        comm.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comm.content?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCampaign = selectedCampaign === "all" || comm.campaign_id === selectedCampaign;
      const matchesStatus = selectedStatus === "all" || comm.status === selectedStatus;
      const matchesType = selectedType === "all" || comm.type === selectedType;

      return matchesSearch && matchesCampaign && matchesStatus && matchesType;
    })
    .sort((a, b) => {
      let aValue, bValue;
      switch (sortBy) {
        case "sent_date":
          aValue = new Date(a.sent_date || a.created_date);
          bValue = new Date(b.sent_date || b.created_date);
          break;
        case "customer_name":
          aValue = a.customer_name?.toLowerCase() || '';
          bValue = b.customer_name?.toLowerCase() || '';
          break;
        case "status":
          aValue = a.status.toLowerCase();
          bValue = b.status.toLowerCase();
          break;
        default:
          return 0;
      }
      
      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const getStats = () => {
    return {
      total: communications.length,
      sent: communications.filter(c => c.status === 'sent').length,
      delivered: communications.filter(c => c.status === 'delivered').length,
      opened: communications.filter(c => c.opened_date).length,
      failed: communications.filter(c => c.status === 'failed').length
    };
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      sent: { color: 'bg-blue-100 text-blue-800', text: 'Enviado', icon: Send },
      delivered: { color: 'bg-green-100 text-green-800', text: 'Entregue', icon: CheckCircle2 },
      opened: { color: 'bg-purple-100 text-purple-800', text: 'Aberto', icon: Eye },
      clicked: { color: 'bg-orange-100 text-orange-800', text: 'Clicado', icon: MousePointer },
      replied: { color: 'bg-cyan-100 text-cyan-800', text: 'Respondeu', icon: MessageCircle },
      failed: { color: 'bg-red-100 text-red-800', text: 'Falhou', icon: XCircle },
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Pendente', icon: Send }
    };

    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', text: status, icon: Send };
    return (
      <Badge className={`${config.color} rounded-full text-xs flex items-center gap-1`}>
        <config.icon className="w-3 h-3" />
        {config.text}
      </Badge>
    );
  };

  const getCampaignName = (campaignId) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    return campaign?.name || 'Campanha não encontrada';
  };

  const formatPhone = (phone) => {
    if (!phone) return '';
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.length === 13 && cleanPhone.startsWith('55')) {
      const area = cleanPhone.substring(2, 4);
      const firstPart = cleanPhone.substring(4, 9);
      const secondPart = cleanPhone.substring(9);
      return `+55 ${area} ${firstPart}-${secondPart}`;
    } else if (cleanPhone.length === 12 && cleanPhone.startsWith('55')) {
      const area = cleanPhone.substring(2, 4);
      const firstPart = cleanPhone.substring(4, 8);
      const secondPart = cleanPhone.substring(8);
      return `+55 ${area} ${firstPart}-${secondPart}`;
    }
    
    return phone;
  };

  const stats = getStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl flex items-center justify-center">
          <History className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Histórico de Campanhas</h1>
          <p className="text-gray-600">
            Acompanhe todos os envios e engajamento das suas campanhas
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { 
            label: "Total Envios", 
            value: stats.total, 
            icon: Send, 
            color: "text-blue-600 bg-blue-50" 
          },
          { 
            label: "Enviados", 
            value: stats.sent, 
            icon: Send, 
            color: "text-indigo-600 bg-indigo-50" 
          },
          { 
            label: "Entregues", 
            value: stats.delivered, 
            icon: CheckCircle2, 
            color: "text-green-600 bg-green-50" 
          },
          { 
            label: "Abertos", 
            value: stats.opened, 
            icon: Eye, 
            color: "text-purple-600 bg-purple-50" 
          },
          { 
            label: "Falhas", 
            value: stats.failed, 
            icon: XCircle, 
            color: "text-red-600 bg-red-50" 
          }
        ].map((stat, index) => (
          <Card key={index} className="rounded-2xl border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className={`w-10 h-10 ${stat.color} rounded-2xl flex items-center justify-center`}>
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex-1 flex flex-col md:flex-row gap-4 w-full lg:w-auto">
          <div className="relative flex-1 md:max-w-md">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Buscar por contato ou conteúdo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-2xl border-gray-200"
            />
          </div>
          
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="w-48 rounded-2xl border-gray-200">
              <SelectValue placeholder="Campanha" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="all">Todas Campanhas</SelectItem>
              {campaigns.map(campaign => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-32 rounded-2xl border-gray-200">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="all">Todos Status</SelectItem>
              <SelectItem value="sent">Enviado</SelectItem>
              <SelectItem value="delivered">Entregue</SelectItem>
              <SelectItem value="opened">Aberto</SelectItem>
              <SelectItem value="failed">Falhou</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-32 rounded-2xl border-gray-200">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="all">Todos Tipos</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40 rounded-2xl border-gray-200">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="sent_date">Data de Envio</SelectItem>
              <SelectItem value="customer_name">Nome do Contato</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="rounded-2xl"
          >
            <ArrowUpDown className="w-4 h-4 mr-2" />
            {sortOrder === 'asc' ? 'Crescente' : 'Decrescente'}
          </Button>
        </div>

        <Button
          variant="outline"
          className="rounded-2xl"
        >
          <Download className="w-4 h-4 mr-2" />
          Exportar
        </Button>
      </div>

      {/* Communications List */}
      <div className="space-y-4">
        {filteredCommunications.length > 0 ? (
          filteredCommunications.map((communication) => (
            <Card key={communication.id} className="rounded-2xl border-gray-200 hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-500 text-white">
                        {communication.customer_name?.split(' ').map(n => n[0]).join('') || 'C'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {communication.customer_name || 'Cliente não identificado'}
                        </h3>
                        {getStatusBadge(communication.status)}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                        <div className="flex items-center gap-1">
                          {communication.type === 'whatsapp' && <MessageSquare className="w-4 h-4" />}
                          {communication.type === 'email' && <Send className="w-4 h-4" />}
                          <span className="capitalize">{communication.type}</span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {format(new Date(communication.sent_date || communication.created_date), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        
                        {communication.campaign_id && (
                          <Badge variant="outline" className="text-xs">
                            {getCampaignName(communication.campaign_id)}
                          </Badge>
                        )}
                      </div>

                      {communication.customer_phone && (
                        <p className="text-sm text-gray-500 mb-2">
                          📱 {formatPhone(communication.customer_phone)}
                        </p>
                      )}

                      {communication.content && (
                        <div className="bg-gray-50 rounded-xl p-3 mb-3">
                          <p className="text-sm text-gray-700 line-clamp-3">
                            {communication.content}
                          </p>
                        </div>
                      )}

                      {/* Additional status information */}
                      <div className="flex items-center gap-3 text-xs">
                        {communication.delivered_date && (
                          <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full">
                            Entregue em {format(new Date(communication.delivered_date), 'dd/MM HH:mm')}
                          </span>
                        )}
                        {communication.opened_date && (
                          <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                            Aberto em {format(new Date(communication.opened_date), 'dd/MM HH:mm')}
                          </span>
                        )}
                        {communication.status === 'failed' && communication.notes && (
                          <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full">
                            Erro: {communication.notes}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm text-gray-500">
                      {communication.cost && (
                        <p>Custo: R$ {communication.cost.toFixed(4)}</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="rounded-3xl border-gray-200">
            <CardContent className="text-center py-16">
              <History className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhum histórico encontrado</h3>
              <p className="text-gray-500 mb-6">
                {searchTerm || selectedCampaign !== 'all' || selectedStatus !== 'all' || selectedType !== 'all'
                  ? 'Ajuste os filtros para ver mais resultados'
                  : 'Nenhuma campanha foi executada ainda'
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}