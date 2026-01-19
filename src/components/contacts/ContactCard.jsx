import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import SafeAvatar from "./SafeAvatar";
import AnimatedContactName from "./AnimatedContactName";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Mail,
  Phone,
  Building2,
  MapPin,
  Calendar,
  DollarSign,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  MessageSquare,
  Tag,
  Users,
  History,
  XCircle,
  AlertCircle,
  WifiOff,
  AlertTriangle,
  Clock,
  HelpCircle,
  Check,
  Snowflake,
  CloudSun,
  Flame,
  UserCheck
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Checkbox } from "@/components/ui/checkbox";

// Mapa de ícones para os marcadores do sistema
const iconMap = {
  XCircle,
  AlertCircle,
  WifiOff,
  AlertTriangle,
  Clock,
  HelpCircle
};

export default function ContactCard({ 
  contact, 
  viewMode, 
  listCompactness = "normal",
  availableTags = [],
  systemTags = [],
  onEdit,
  onView,
  onChat,
  onDelete,
  onHistory,
  onAssignTag,
  selectionMode = false,
  isSelected = false,
  onToggleSelection
}) {
  const getStatusColor = (status) => {
    const statusColors = {
      'lead': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'prospect': 'bg-blue-100 text-blue-800 border-blue-200',
      'customer': 'bg-green-100 text-green-800 border-green-200',
      'inactive': 'bg-gray-100 text-gray-800 border-gray-200',
      'churned': 'bg-red-100 text-red-800 border-red-200'
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const formatPhone = (phone) => {
    if (!phone) return null;
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  const formatCurrency = (value) => {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Função para obter os nomes das tags a partir dos IDs ou nomes armazenados em contact.tags
  const getContactTagNames = (contactTags) => {
    if (!contactTags || !Array.isArray(contactTags) || contactTags.length === 0) {
      return [];
    }
    
    if (!availableTags || availableTags.length === 0) {
      return [];
    }

    const tagIdToNameMap = new Map(availableTags.map(tag => [tag.id, tag.name]));
    const tagNameToNameMap = new Map(availableTags.map(tag => [tag.name, tag.name]));

    return contactTags
      .map(tag => {
        if (typeof tag === 'string' && tag.length > 20) {
          return tagIdToNameMap.get(tag);
        }
        else if (typeof tag === 'string') {
          return tagNameToNameMap.get(tag);
        }
        else if (tag && typeof tag === 'object' && tag.id) {
          return tagIdToNameMap.get(tag.id);
        }
        return null;
      })
      .filter(Boolean);
  };

  // Obter os system_tags do contato
  const getContactSystemTags = (contactSystemTagIds) => {
    if (!contactSystemTagIds || !Array.isArray(contactSystemTagIds) || contactSystemTagIds.length === 0) {
      return [];
    }
    
    if (!systemTags || systemTags.length === 0) {
      return [];
    }

    return contactSystemTagIds
      .map(tagId => systemTags.find(st => st.id === tagId))
      .filter(Boolean);
  };

  // Renderizar badge de marcador do sistema
  const renderSystemTagBadge = (systemTag, size = "normal") => {
    const IconComponent = iconMap[systemTag.icon] || AlertCircle;
    
    return (
      <Badge
        key={systemTag.id}
        className={`font-medium border ${size === "compact" ? "text-xs px-2 py-0" : "text-xs px-2 py-1"}`}
        style={{
          backgroundColor: systemTag.color + '20',
          color: systemTag.color,
          borderColor: systemTag.color + '40'
        }}
      >
        <IconComponent className={size === "compact" ? "w-3 h-3 mr-1" : "w-3 h-3 mr-1"} />
        {systemTag.name}
      </Badge>
    );
  };

  // NOVA FUNÇÃO: Verificar se o contato tem tag de número incorreto
  const hasInvalidNumberTag = () => {
    const contactSystemTags = getContactSystemTags(contact.tags_system);
    return contactSystemTags.some(tag => 
      tag.trigger_event === 'number_not_exists' || 
      tag.slug === 'invalid_number' ||
      tag.trigger_event === 'invalid_number'
    );
  };

  // Obter system_tags e tags normais do contato
  const contactSystemTags = getContactSystemTags(contact.tags_system);
  const normalTags = getContactTagNames(contact.tags);
  const chatDisabled = hasInvalidNumberTag();

  if (viewMode === 'list') {
    return (
      <Card className={`rounded-2xl border-2 transition-all duration-200 overflow-hidden ${
        selectionMode && isSelected 
          ? 'border-blue-600 bg-blue-50' 
          : 'border-gray-200 hover:shadow-md hover:border-gray-300'
      }`}>
        <CardContent className={`${listCompactness === 'compact' ? 'p-4' : 'p-6'} relative`}>
          {selectionMode && (
            <div className="absolute top-0 left-0 w-12 h-full flex items-center justify-center">
              <Checkbox
                checked={isSelected}
                onCheckedChange={onToggleSelection}
                className={`rounded border-2 ${
                  isSelected 
                    ? 'border-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600' 
                    : 'border-gray-300'
                }`}
              />
            </div>
          )}
          <div className={`flex items-center justify-between ${selectionMode ? 'pl-10' : ''}`}>
            <div className="flex items-center gap-4 flex-1">
              <div className="relative">
                <SafeAvatar 
                  contact={contact}
                  className={listCompactness === 'compact' ? 'w-10 h-10' : 'w-12 h-12'}
                  fallbackClassName="bg-gradient-to-br from-blue-400 to-blue-600 text-white font-semibold"
                />
                {contact.temperature && (
                  <div className={`absolute -bottom-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white ${
                    contact.temperature === 'fria' 
                      ? 'bg-blue-500' 
                      : contact.temperature === 'morna'
                      ? 'bg-yellow-500'
                      : 'bg-orange-500'
                  }`}>
                    {contact.temperature === 'fria' ? (
                      <Snowflake className="w-3 h-3 text-white" />
                    ) : contact.temperature === 'morna' ? (
                      <CloudSun className="w-3 h-3 text-white" />
                    ) : (
                      <Flame className="w-3 h-3 text-white" />
                    )}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className={`font-semibold text-gray-900 truncate ${listCompactness === 'compact' ? 'text-sm' : 'text-base'}`}>
                    <AnimatedContactName 
                      name={`${contact.first_name} ${contact.last_name}`}
                      nickname={contact.nickname}
                    />
                  </h3>
                  
                  {contactSystemTags.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      {contactSystemTags.map(systemTag => renderSystemTagBadge(systemTag, listCompactness === 'compact' ? 'compact' : 'normal'))}
                    </div>
                  )}
                  
                  {contact.responsible_name && (
                    <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs px-2 py-0.5 font-medium">
                      <UserCheck className="w-3 h-3 mr-1" />
                      {contact.responsible_name}
                    </Badge>
                  )}
                </div>

                <div className={`flex items-center gap-4 text-gray-600 ${listCompactness === 'compact' ? 'text-xs' : 'text-sm'}`}>
                  {contact.email && (
                    <div className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      <span className="truncate max-w-[200px]">{contact.email}</span>
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      <span>{formatPhone(contact.phone)}</span>
                    </div>
                  )}
                  {contact.company_name && (
                    <div className="flex items-center gap-1">
                      <Building2 className="w-4 h-4" />
                      <span className="truncate max-w-[150px]">{contact.company_name}</span>
                    </div>
                  )}
                  {contact.temperature && (
                    <Badge className={`font-medium border text-xs flex items-center gap-1 ${
                      contact.temperature === 'fria' 
                        ? 'bg-blue-50 text-blue-700 border-blue-300' 
                        : contact.temperature === 'morna'
                        ? 'bg-yellow-50 text-yellow-700 border-yellow-300'
                        : 'bg-red-50 text-red-700 border-red-300'
                    }`}>
                      {contact.temperature === 'fria' ? (
                        <>
                          <Snowflake className="w-3 h-3" />
                          Fria
                        </>
                      ) : contact.temperature === 'morna' ? (
                        <>
                          <CloudSun className="w-3 h-3" />
                          Morna
                        </>
                      ) : (
                        <>
                          <Flame className="w-3 h-3" />
                          Quente
                        </>
                      )}
                    </Badge>
                  )}
                </div>

                {listCompactness !== 'compact' && normalTags.length > 0 && (
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {normalTags.slice(0, 2).map((tagName, index) => (
                      <Badge key={`tag-${index}`} variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                        <Tag className="w-3 h-3 mr-1" />
                        {tagName}
                      </Badge>
                    ))}

                    {normalTags.length > 2 && (
                      <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 text-xs">
                        +{normalTags.length - 2}
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {contact.value && listCompactness !== 'compact' && (
                <div className="text-right">
                  <div className="flex items-center gap-1 text-green-600 font-semibold">
                    <DollarSign className="w-4 h-4" />
                    <span>{formatCurrency(contact.value)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 ml-2">
              {contact.phone && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => !chatDisabled && onChat(contact)}
                  disabled={chatDisabled}
                  className={`rounded-xl ${
                    chatDisabled 
                      ? 'opacity-50 cursor-not-allowed bg-gray-100' 
                      : 'hover:bg-green-50 hover:border-green-300'
                  } ${listCompactness === 'compact' ? 'w-8 h-8' : 'w-9 h-9'}`}
                  title={chatDisabled ? "Número inválido ou não existe no WhatsApp" : "Chat"}
                >
                  <MessageSquare className={listCompactness === 'compact' ? 'w-3 h-3' : 'w-4 h-4'} />
                </Button>
              )}
              
              {onHistory && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onHistory(contact)}
                  className={`rounded-xl hover:bg-blue-50 hover:border-blue-300 ${listCompactness === 'compact' ? 'w-8 h-8' : 'w-9 h-9'}`}
                  title="Histórico"
                >
                  <History className={listCompactness === 'compact' ? 'w-3 h-3' : 'w-4 h-4'} />
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`rounded-xl ${listCompactness === 'compact' ? 'w-8 h-8' : 'w-9 h-9'}`}
                  >
                    <MoreVertical className={listCompactness === 'compact' ? 'w-3 h-3' : 'w-4 h-4'} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl">
                  <DropdownMenuItem onClick={() => onView(contact)} className="rounded-lg">
                    <Eye className="w-4 h-4 mr-2" />
                    Visualizar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit(contact)} className="rounded-lg">
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  {onAssignTag && (
                    <DropdownMenuItem onClick={() => onAssignTag(contact)} className="rounded-lg">
                      <Tag className="w-4 h-4 mr-2" />
                      Atribuir Marcador
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => onDelete(contact)} className="rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Grid view (card format)
  return (
    <Card className={`rounded-3xl border-2 transition-all duration-300 overflow-hidden ${
      selectionMode && isSelected 
        ? 'border-blue-600 bg-blue-50 hover:border-blue-700' 
        : 'border-gray-200 hover:shadow-lg hover:border-gray-300 hover:-translate-y-1'
    }`}>
      <CardHeader className="pb-3 relative">
        {selectionMode && (
          <div className="absolute top-0 left-0 w-14 h-14 flex items-center justify-center">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onToggleSelection}
              className={`rounded border-2 ${
                isSelected 
                  ? 'border-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600' 
                  : 'border-gray-300'
              }`}
            />
          </div>
        )}
        <div className={`flex items-start justify-between gap-2 ${selectionMode ? 'pl-12' : ''}`}>
          <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="relative">
            <SafeAvatar 
              contact={contact}
              className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0"
              fallbackClassName="bg-gradient-to-br from-blue-400 to-blue-600 text-white font-semibold text-sm sm:text-base"
            />
            {contact.temperature && (
              <div className={`absolute -bottom-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-white ${
                contact.temperature === 'fria' 
                  ? 'bg-blue-500' 
                  : contact.temperature === 'morna'
                  ? 'bg-yellow-500'
                  : 'bg-orange-500'
              }`}>
                {contact.temperature === 'fria' ? (
                  <Snowflake className="w-3 h-3 text-white" />
                ) : contact.temperature === 'morna' ? (
                  <CloudSun className="w-3 h-3 text-white" />
                ) : (
                  <Flame className="w-3 h-3 text-white" />
                )}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 leading-tight text-sm sm:text-base line-clamp-2">
                <AnimatedContactName 
                  name={`${contact.first_name} ${contact.last_name}`}
                  nickname={contact.nickname}
                />
              </h3>
              
              {contactSystemTags.length > 0 && (
                <div className="flex items-center gap-1 mt-1 flex-wrap">
                  {contactSystemTags.map(systemTag => renderSystemTagBadge(systemTag))}
                </div>
              )}
              
              {contact.responsible_name && (
                <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs px-2 py-0.5 font-medium mt-1">
                  <UserCheck className="w-3 h-3 mr-1" />
                  {contact.responsible_name}
                </Badge>
              )}
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full flex-shrink-0">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
              <DropdownMenuItem onClick={() => onView(contact)} className="rounded-lg">
                <Eye className="w-4 h-4 mr-2" />
                Visualizar
              </DropdownMenuItem>
              {onHistory && (
                <DropdownMenuItem onClick={() => onHistory(contact)} className="rounded-lg">
                  <History className="w-4 h-4 mr-2" />
                  Histórico
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onEdit(contact)} className="rounded-lg">
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </DropdownMenuItem>
              {onAssignTag && (
                <DropdownMenuItem onClick={() => onAssignTag(contact)} className="rounded-lg">
                  <Tag className="w-4 h-4 mr-2" />
                  Atribuir Marcador
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onDelete(contact)} className="rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50">
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="space-y-2">
            {contact.email && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{contact.email}</span>
              </div>
            )}

            {contact.phone && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="w-4 h-4 flex-shrink-0" />
                <span>{formatPhone(contact.phone)}</span>
              </div>
            )}

            {contact.company_name && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Building2 className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{contact.company_name}</span>
              </div>
            )}

            {contact.created_date && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="w-4 h-4 flex-shrink-0" />
                <span>
                  {format(new Date(contact.created_date), "d 'de' MMMM, yyyy", { locale: ptBR })}
                </span>
              </div>
            )}

          </div>

          {contact.value && (
            <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
              <span className="text-sm text-green-700 font-medium">Valor estimado</span>
              <div className="flex items-center gap-1 text-green-600 font-semibold">
                <DollarSign className="w-4 h-4" />
                <span>{formatCurrency(contact.value)}</span>
              </div>
            </div>
          )}
          
          {normalTags.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs text-gray-500 font-medium">Marcadores:</span>
              <div className="flex flex-wrap gap-1">
                {normalTags.slice(0, 3).map((tagName, index) => (
                  <Badge key={`tag-${index}`} variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                    <Tag className="w-3 h-3 mr-1" />
                    {tagName}
                  </Badge>
                ))}
                {normalTags.length > 3 && (
                  <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 text-xs">
                    +{normalTags.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2 border-t border-gray-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onView(contact)}
              className="rounded-xl flex-shrink-0 min-w-0"
            >
              <Eye className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Ver</span>
            </Button>
            {onHistory && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onHistory(contact)}
                className="rounded-xl flex-1 min-w-0"
              >
                <History className="w-4 h-4 sm:mr-2 flex-shrink-0" />
                <span className="hidden md:inline truncate">Histórico</span>
              </Button>
            )}
            {contact.phone && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => !chatDisabled && onChat(contact)}
                disabled={chatDisabled}
                className={`rounded-xl flex-shrink-0 ${
                  chatDisabled 
                    ? 'opacity-50 cursor-not-allowed bg-gray-100' 
                    : 'hover:bg-green-50 hover:border-green-300'
                }`}
                title={chatDisabled ? "Número inválido ou não existe no WhatsApp" : "Iniciar conversa"}
              >
                <MessageSquare className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}