
import React, { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  Tag,
  Activity,
  TrendingUp,
  DollarSign,
  MoreVertical,
  Edit,
  Trash2,
  Move,
  Maximize2,
  ArrowUpRight,
  Phone,
  Mail,
  Calendar,
  CheckCircle2,
  Clock,
  MessageSquare,
  BarChart3
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function DashboardCard({ card, data, isLayoutMode, onResize, onMove, onEdit, onDelete }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const cardRef = useRef(null);

  const handleMouseDown = (e, action) => {
    if (!isLayoutMode) return;
    
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = card.size.width;
    const startHeight = card.size.height;
    const startPosX = card.position.x;
    const startPosY = card.position.y;

    const handleMouseMove = (e) => {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      if (action === 'resize') {
        const newWidth = Math.max(1, startWidth + Math.round(deltaX / 100));
        const newHeight = Math.max(1, startHeight + Math.round(deltaY / 150));
        onResize(card.id, { width: newWidth, height: newHeight });
      } else if (action === 'move') {
        const newX = Math.max(0, startPosX + Math.round(deltaX / 100));
        const newY = Math.max(0, startPosY + Math.round(deltaY / 150));
        onMove(card.id, { x: newX, y: newY });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    if (action === 'move') setIsDragging(true);
    if (action === 'resize') setIsResizing(true);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const renderCardContent = () => {
    switch (card.type) {
      case 'stats':
        return <StatsCard card={card} data={data} />;
      case 'activity':
        return <ActivityCard card={card} data={data} />;
      case 'contacts':
        return <ContactsCard card={card} data={data} />;
      case 'campaigns':
        return <CampaignsCard card={card} data={data} />;
      case 'chart':
        return <ChartCard card={card} data={data} />;
      case 'quick-actions':
        return <QuickActionsCard card={card} data={data} />;
      default:
        return <div className="p-4 text-center text-gray-500">Tipo de card não reconhecido</div>;
    }
  };

  return (
    <div
      ref={cardRef}
      className={`relative ${isDragging ? 'z-50' : ''} ${isResizing ? 'z-40' : ''}`}
      style={{
        gridColumn: `span ${card.size.width}`,
        gridRow: `span ${card.size.height}`,
        transform: isDragging ? 'scale(1.02)' : 'scale(1)',
        transition: isDragging || isResizing ? 'none' : 'transform 0.2s'
      }}
    >
      <Card className={`h-full rounded-3xl border-gray-200 overflow-hidden ${
        isLayoutMode ? 'border-2 border-dashed border-blue-300 bg-blue-50 bg-opacity-30' : ''
      }`}>
        <CardHeader className={`pb-2 ${isLayoutMode ? 'bg-blue-100 bg-opacity-50' : ''}`}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              {isLayoutMode && (
                <div
                  className="cursor-move p-1 hover:bg-blue-200 rounded"
                  onMouseDown={(e) => handleMouseDown(e, 'move')}
                >
                  <Move className="w-4 h-4 text-blue-600" />
                </div>
              )}
              <span>{card.title}</span>
            </CardTitle>
            
            <div className="flex items-center gap-1">
              {!isLayoutMode && card.type !== 'quick-actions' && (
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <ArrowUpRight className="w-3 h-3" />
                </Button>
              )}
              
              {isLayoutMode && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <MoreVertical className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl">
                    <DropdownMenuItem onClick={() => onEdit()} className="rounded-lg">
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete(card.id)} className="rounded-lg text-red-600">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remover
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-4 pt-2 h-full overflow-hidden">
          {renderCardContent()}
        </CardContent>

        {/* Resize handle */}
        {isLayoutMode && (
          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-blue-600 opacity-50 hover:opacity-75"
            style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}
            onMouseDown={(e) => handleMouseDown(e, 'resize')}
          />
        )}
      </Card>
    </div>
  );
}

// Stats Card Component
function StatsCard({ card, data }) {
  const { stats } = data;
  const settings = card.settings || {};

  const statItems = [
    {
      id: 'totalContacts',
      show: settings.showTotalContacts,
      title: "Total de Contatos",
      value: stats.totalContacts,
      icon: Users,
      color: "text-blue-600 bg-blue-50"
    },
    {
      id: 'activeCampaigns',
      show: settings.showActiveCampaigns,
      title: "Campanhas Ativas",
      value: stats.activeCampaigns,
      icon: Tag,
      color: "text-purple-600 bg-purple-50"
    },
    {
      id: 'recentActivities',
      show: settings.showRecentActivities,
      title: "Atividades Recentes",
      value: stats.recentActivities,
      icon: Activity,
      color: "text-green-600 bg-green-50"
    },
    {
      id: 'conversionRate',
      show: settings.showConversionRate,
      title: "Taxa de Conversão",
      value: `${stats.conversionRate}%`,
      icon: TrendingUp,
      color: "text-orange-600 bg-orange-50"
    }
  ].filter(item => item.show !== false);

  return (
    <div className={`grid gap-4 h-full ${
      settings.layout === 'list' ? 'grid-cols-1' : 
      statItems.length <= 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-2'
    }`}>
      {statItems.map((stat) => (
        <div key={stat.id} className="flex items-center gap-3 p-3 rounded-2xl border border-gray-100">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${stat.color}`}>
            <stat.icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm text-gray-500">{stat.title}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// Activity Card Component
function ActivityCard({ card, data }) {
  const { activities } = data;
  const settings = card.settings || {};
  const maxItems = settings.maxItems || 5;

  const getActivityIcon = (type) => {
    switch (type) {
      case 'call': return Phone;
      case 'email': return Mail;
      case 'meeting': return Calendar;
      case 'note': return MessageSquare;
      case 'task': return CheckCircle2;
      case 'follow_up': return Clock;
      default: return Activity;
    }
  };

  return (
    <div className="space-y-3 h-full overflow-y-auto">
      {activities.slice(0, maxItems).map((activity) => {
        const Icon = getActivityIcon(activity.type);
        return (
          <div key={activity.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <Icon className="w-4 h-4 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-gray-900 truncate">{activity.subject}</p>
              <p className="text-xs text-gray-500">
                {format(new Date(activity.created_date), 'MMM d, h:mm a')}
              </p>
            </div>
            {settings.showStatus && (
              <Badge variant="outline" className="text-xs">
                {activity.status}
              </Badge>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Contacts Card Component
function ContactsCard({ card, data }) {
  const { contacts } = data;
  const settings = card.settings || {};
  const sortBy = settings.sortBy || 'value';
  const maxItems = settings.maxItems || 5;

  const sortedContacts = [...contacts]
    .sort((a, b) => {
      if (sortBy === 'value') return (b.value || 0) - (a.value || 0);
      if (sortBy === 'name') return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
      return new Date(b.created_date) - new Date(a.created_date);
    })
    .slice(0, maxItems);

  return (
    <div className="space-y-3 h-full overflow-y-auto">
      {sortedContacts.map((contact) => (
        <div key={contact.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-500 text-white text-xs">
              {contact.first_name?.[0]}{contact.last_name?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-gray-900 truncate">
              {contact.first_name} {contact.last_name}
            </p>
            <p className="text-xs text-gray-500 truncate">{contact.email}</p>
          </div>
          <div className="text-right">
            {settings.showValue && contact.value && (
              <p className="text-sm font-semibold text-green-600">${contact.value}</p>
            )}
            {settings.showStatus && (
              <Badge variant="outline" className="text-xs">
                {contact.status}
              </Badge>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Campaigns Card Component
function CampaignsCard({ card, data }) {
  const { campaigns } = data;
  const settings = card.settings || {};
  const maxCampaigns = settings.maxCampaigns || 3;

  const activeCampaigns = campaigns
    .filter(c => c.status === 'active' || c.status === 'running')
    .slice(0, maxCampaigns);

  return (
    <div className="space-y-4 h-full overflow-y-auto">
      {activeCampaigns.map((campaign) => (
        <div key={campaign.id} className="p-3 border border-gray-100 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-sm text-gray-900 truncate">{campaign.name}</h4>
            <Badge variant="outline" className="text-xs">
              {campaign.status}
            </Badge>
          </div>
          
          {settings.showMetrics && (
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-gray-500">Enviados</p>
                <p className="font-semibold">{campaign.metrics?.messages_sent || 0}</p>
              </div>
              <div>
                <p className="text-gray-500">Abertos</p>
                <p className="font-semibold">{campaign.metrics?.messages_opened || 0}</p>
              </div>
              <div>
                <p className="text-gray-500">Cliques</p>
                <p className="font-semibold">{campaign.metrics?.messages_clicked || 0}</p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Chart Card Component
function ChartCard({ card, data }) {
  return (
    <div className="flex items-center justify-center h-full text-gray-500">
      <div className="text-center">
        <BarChart3 className="w-12 h-12 mx-auto mb-2 text-gray-300" />
        <p className="text-sm">Visualização do Gráfico</p>
        <p className="text-xs">Em breve</p>
      </div>
    </div>
  );
}

// Quick Actions Card Component
function QuickActionsCard({ card, data }) {
  const { user } = data;
  
  const actions = [
    {
      title: "Adicionar Contato",
      icon: Users,
      url: createPageUrl("Contacts?action=create"),
      color: "bg-blue-500"
    },
    {
      title: "Criar Campanha",
      icon: Tag,
      url: createPageUrl("Campaigns?action=create"), // Changed to plural based on common pattern
      color: "bg-purple-500"
    },
    {
      title: "Ver Relatórios",
      icon: BarChart3,
      url: createPageUrl("Reports"),
      color: "bg-green-500"
    }
  ];

  return (
    <div className="grid grid-cols-1 gap-3 h-full">
      {actions.map((action, index) => (
        <Link key={index} to={action.url}>
          <div className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 transition-colors border border-gray-100">
            <div className={`w-10 h-10 ${action.color} rounded-2xl flex items-center justify-center`}>
              <action.icon className="w-5 h-5 text-white" />
            </div>
            <span className="font-medium text-gray-900">{action.title}</span>
            <ArrowUpRight className="w-4 h-4 text-gray-400 ml-auto" />
          </div>
        </Link>
      ))}
    </div>
  );
}
