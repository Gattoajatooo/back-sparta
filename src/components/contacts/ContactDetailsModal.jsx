import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  User, // New icon for header
  Mail,
  Phone,
  Building2,
  Calendar,
  DollarSign, // Preserved from original
  Tag as TagIcon, // Aliased to avoid conflict with TagEntity
  MapPin,
  Edit,
  MessageSquare, // From outline imports
  MessageCircle, // Used for SMS button
  X,
  Globe, // New from outline imports
  CreditCard, // New from outline imports
  Heart, // New from outline imports
  Briefcase, // New from outline imports
} from "lucide-react";
import { format } from "date-fns";
import { Tag as TagEntity } from "@/entities/Tag"; // New entity import
import { User as UserEntity } from "@/entities/User"; // New entity import
import { Campaign } from "@/entities/Campaign"; // New entity import

export default function ContactDetailsModal({ open, onClose, contact, onEdit }) {
  const [tagNames, setTagNames] = useState({});
  const [campaignNames, setCampaignNames] = useState({});
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!open || !contact) return;

    const loadUser = async () => {
      try {
        const currentUser = await UserEntity.me();
        setUser(currentUser);
      } catch (error) {
        console.error('Error loading user:', error);
      }
    };

    const loadNamesData = async () => {
      try {
        const currentUser = await UserEntity.me();
        if (currentUser?.company_id) {
          // Carregar nomes das tags
          if (contact?.tags && contact.tags.length > 0) {
            const allTags = await TagEntity.filter({ company_id: currentUser.company_id });
            const tagMapping = {};
            allTags.forEach(tag => {
              tagMapping[tag.id] = tag.name;
            });
            setTagNames(tagMapping);
          }

          // Carregar nomes das campanhas
          if (contact?.campaign_ids && contact.campaign_ids.length > 0) {
            const allCampaigns = await Campaign.filter({ company_id: currentUser.company_id });
            const campaignMapping = {};
            allCampaigns.forEach(campaign => {
              campaignMapping[campaign.id] = campaign.name;
            });
            setCampaignNames(campaignMapping);
          }
        }
      } catch (error) {
        console.error('Error loading names data:', error);
      }
    };

    loadUser();
    loadNamesData();
  }, [open, contact]);

  const getStatusColor = (status) => {
    const colors = {
      'lead': 'bg-blue-100 text-blue-800 border-blue-200',
      'prospect': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'customer': 'bg-green-100 text-green-800 border-green-200',
      'churned': 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'lead': 'Lead',
      'prospect': 'Prospect',
      'customer': 'Cliente',
      'churned': 'Perdido'
    };
    return labels[status] || status;
  };

  const getSourceLabel = (source) => {
    const labels = {
      'website': 'Website',
      'referral': 'Indicação',
      'social_media': 'Redes Sociais',
      'email_campaign': 'Campanha de Email',
      'cold_outreach': 'Prospecção Ativa',
      'event': 'Evento',
      'import': 'Importação',
      'other': 'Outro'
    };
    return labels[source] || source;
  };

  const renderContactInfo = () => {
    if (!contact) return null;

    return (
      <div className="space-y-6">
        {/* Contact Header - Re-integrated from original code to preserve functionality and features */}
        <div className="flex items-start gap-4">
          <Avatar className="w-16 h-16">
            <AvatarImage src={contact.avatar_url} />
            <AvatarFallback
              className="text-white text-lg font-semibold"
              style={{ backgroundColor: '#2ECC71' }}
            >
              {contact.first_name?.[0]}{contact.last_name?.[0]}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              {contact.first_name} {contact.last_name}
            </h2>
            {contact.company_name && (
              <p className="text-gray-600 mb-2">{contact.company_name}</p>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={`rounded-full ${getStatusColor(contact.status)}`}>
                {getStatusLabel(contact.status)}
              </Badge>
              {contact.source && (
                <Badge variant="outline" className="rounded-full">
                  {getSourceLabel(contact.source)}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Actions - Preserve original disabled state and alerts */}
            <Button
              onClick={() => alert('Ligar - Funcionalidade em desenvolvimento')}
              variant="outline"
              size="sm"
              disabled
              className="rounded-xl opacity-50"
            >
              <Phone className="w-4 h-4" />
            </Button>

            <Button
              onClick={() => alert('Email - Funcionalidade em desenvolvimento')}
              variant="outline"
              size="sm"
              disabled
              className="rounded-xl opacity-50"
            >
              <Mail className="w-4 h-4" />
            </Button>

            <Button
              onClick={() => alert('SMS - Funcionalidade em desenvolvimento')}
              variant="outline"
              size="sm"
              disabled
              className="rounded-xl opacity-50"
            >
              <MessageCircle className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Informações Básicas */}
        <div>
          {/* Removed icon from header as per outline */}
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Informações Básicas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 rounded-2xl p-4">
            <div>
              <Label className="text-sm font-medium text-gray-600">Nome Completo</Label>
              <p className="text-gray-900">{contact.first_name} {contact.last_name}</p>
            </div>

            {contact.document_number && (
              <div>
                <Label className="text-sm font-medium text-gray-600">
                  {contact.document_type === 'cnpj' ? 'CNPJ' : 'CPF'}
                </Label>
                <p className="text-gray-900">{contact.document_number}</p>
              </div>
            )}

            {contact.gender && (
              <div>
                <Label className="text-sm font-medium text-gray-600">Gênero</Label>
                <p className="text-gray-900">
                  {contact.gender === 'male' ? 'Masculino' :
                   contact.gender === 'female' ? 'Feminino' :
                   contact.gender === 'other' ? 'Outro' : 'Não informado'}
                </p>
              </div>
            )}

            {contact.birth_date && (
              <div>
                <Label className="text-sm font-medium text-gray-600">Data de Nascimento</Label>
                <p className="text-gray-900">{format(new Date(contact.birth_date), 'dd/MM/yyyy')}</p>
              </div>
            )}

            {contact.responsible_name && (
              <div>
                <Label className="text-sm font-medium text-gray-600">Responsável</Label>
                <p className="text-gray-900">{contact.responsible_name}</p>
              </div>
            )}
          </div>
        </div>

        {/* Informações de Contato */}
        <div>
          {/* Removed icon from header as per outline */}
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Contato
          </h3>
          <div className="space-y-4 bg-gray-50 rounded-2xl p-4">

            {/* E-mails */}
            <div>
              <Label className="text-sm font-medium text-gray-600 mb-2 block">E-mails</Label>
              <div className="space-y-2">

                {/* Email principal */}
                {contact.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900">{contact.email}</span>
                    <Badge variant="outline" className="text-xs">Principal</Badge>
                  </div>
                )}

                {/* E-mails secundários - Corrected filtering */}
                {contact.emails && Array.isArray(contact.emails) &&
                  contact.emails
                    .filter(emailObj => emailObj && emailObj.email && emailObj.email !== contact.email)
                    .map((emailObj, index) => (
                      <div key={`email-${index}`} className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900">{emailObj.email}</span>
                        <Badge variant="outline" className="text-xs">
                          {emailObj.type === 'work' ? 'Trabalho' :
                           emailObj.type === 'personal' ? 'Pessoal' :
                           emailObj.type === 'secondary' ? 'Secundário' :
                           emailObj.type || 'Outro'}
                        </Badge>
                      </div>
                    ))
                }
              </div>
            </div>

            {/* Telefones */}
            <div>
              <Label className="text-sm font-medium text-gray-600 mb-2 block">Telefones</Label>
              <div className="space-y-2">

                {/* Telefone principal */}
                {contact.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900">{contact.phone}</span>
                    <Badge variant="outline" className="text-xs">Principal</Badge>
                  </div>
                )}

                {/* Telefones secundários - Corrected filtering */}
                {contact.phones && Array.isArray(contact.phones) &&
                  contact.phones
                    .filter(phoneObj => phoneObj && phoneObj.phone && phoneObj.phone !== contact.phone)
                    .map((phoneObj, index) => (
                      <div key={`phone-${index}`} className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900">{phoneObj.phone}</span>
                        <Badge variant="outline" className="text-xs">
                          {phoneObj.type === 'work' ? 'Trabalho' :
                           phoneObj.type === 'home' ? 'Casa' :
                           phoneObj.type === 'mobile' ? 'Celular' :
                           phoneObj.type === 'whatsapp' ? 'WhatsApp' :
                           phoneObj.type === 'secondary' ? 'Secundário' :
                           phoneObj.type || 'Outro'}
                        </Badge>
                      </div>
                    ))
                }
              </div>
            </div>
          </div>
        </div>

        {/* Tags e Campanhas */}
        {(contact.tags && contact.tags.length > 0) || (contact.campaign_ids && contact.campaign_ids.length > 0) ? (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Segmentação</h3>
            <div className="space-y-4 bg-gray-50 rounded-2xl p-4">
              
              {/* Marcadores */}
              {contact.tags && contact.tags.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-gray-600 mb-2 block">Marcadores</Label>
                  <div className="flex flex-wrap gap-2">
                    {contact.tags.map((tagId, index) => (
                      <Badge key={`tag-${index}`} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        <TagIcon className="w-3 h-3 mr-1" />
                        {tagNames[tagId] || tagId}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Campanhas */}
              {contact.campaign_ids && contact.campaign_ids.length > 0 && (
                <div>
                  <Label className="text-sm font-medium text-gray-600 mb-2 block">Campanhas</Label>
                  <div className="flex flex-wrap gap-2">
                    {contact.campaign_ids.map((campaignId, index) => (
                      <Badge key={`campaign-${index}`} variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        <Calendar className="w-3 h-3 mr-1" />
                        {campaignNames[campaignId] || campaignId}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        ) : null}

        {/* Professional Information - Moved inside renderContactInfo */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-green-600" />
            Informações Profissionais
          </h3>

          <div className="space-y-3 bg-gray-50 rounded-2xl p-4">
            {contact.company_name && (
              <div className="flex items-center gap-3">
                <Building2 className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Empresa</p>
                  <p className="font-medium">{contact.company_name}</p>
                </div>
              </div>
            )}

            {contact.position && (
              <div className="flex items-center gap-3">
                <TagIcon className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Posição</p>
                  <p className="font-medium">{contact.position}</p>
                </div>
              </div>
            )}

            {contact.value !== undefined && contact.value !== null && (
              <div className="flex items-center gap-3">
                <DollarSign className="w-4 h-4 text-green-500" />
                <div>
                  <p className="text-sm text-gray-500">Valor Estimado</p>
                  <p className="font-medium text-green-600">
                    R$ {contact.value.toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Notes - Moved inside renderContactInfo */}
        {contact.notes && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Observações</h3>
            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="text-gray-700 whitespace-pre-wrap">{contact.notes}</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!open || !contact) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] p-0 bg-white border-gray-200 [&>button]:hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Detalhes do Contato</h2>
                <p className="text-sm text-gray-600">Informações completas</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => onEdit(contact)} variant="outline" className="rounded-xl">
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
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
        </div>

        {/* Content area */}
        <div className="p-6">
          {renderContactInfo()}
        </div>

        {/* Footer (old custom footer removed as per outline, relying on onOpenChange for close) */}
      </DialogContent>
    </Dialog>
  );
}