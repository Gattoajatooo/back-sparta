import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  X,
  Save,
  Users,
  Search,
  Plus,
  Minus,
  Calendar,
  Clock,
  Target,
  MessageSquare,
  FileText,
  Palette
} from "lucide-react";

export default function CampaignForm({ campaign, campaignTypes, contacts, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "",
    color: "bg-blue-500",
    status: "draft",
    target_audience: {
      customer_ids: [],
      tags: [],
      filters: {}
    },
    start_date: "",
    end_date: ""
  });

  const [selectedContactIds, setSelectedContactIds] = useState(new Set());
  const [contactSearch, setContactSearch] = useState("");
  const [showContactSelector, setShowContactSelector] = useState(false);

  // Available colors for campaigns
  const campaignColors = [
    { id: 'bg-blue-500', name: 'Azul', class: 'bg-blue-500' },
    { id: 'bg-green-500', name: 'Verde', class: 'bg-green-500' },
    { id: 'bg-purple-500', name: 'Roxo', class: 'bg-purple-500' },
    { id: 'bg-red-500', name: 'Vermelho', class: 'bg-red-500' },
    { id: 'bg-yellow-500', name: 'Amarelo', class: 'bg-yellow-500' },
    { id: 'bg-pink-500', name: 'Rosa', class: 'bg-pink-500' },
    { id: 'bg-indigo-500', name: 'Índigo', class: 'bg-indigo-500' },
    { id: 'bg-orange-500', name: 'Laranja', class: 'bg-orange-500' },
    { id: 'bg-teal-500', name: 'Verde-água', class: 'bg-teal-500' },
    { id: 'bg-gray-500', name: 'Cinza', class: 'bg-gray-500' }
  ];

  useEffect(() => {
    if (campaign) {
      setFormData({
        name: campaign.name || "",
        description: campaign.description || "",
        type: campaign.type || "",
        color: campaign.color || "bg-blue-500",
        status: campaign.status || "draft",
        target_audience: campaign.target_audience || {
          customer_ids: [],
          tags: [],
          filters: {}
        },
        start_date: campaign.start_date || "",
        end_date: campaign.end_date || ""
      });

      if (campaign.target_audience?.customer_ids) {
        setSelectedContactIds(new Set(campaign.target_audience.customer_ids));
      }
    }
  }, [campaign]);

  const handleInputChange = (field, value, nested = null) => {
    if (nested) {
      setFormData(prev => ({
        ...prev,
        [nested]: {
          ...prev[nested],
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleContactToggle = (contactId) => {
    setSelectedContactIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contactId)) {
        newSet.delete(contactId);
      } else {
        newSet.add(contactId);
      }
      return newSet;
    });
  };

  const handleSelectAllContacts = () => {
    const filteredContacts = getFilteredContacts();
    const filteredIds = filteredContacts.map(contact => contact.id);
    
    const allSelected = filteredIds.every(id => selectedContactIds.has(id));
    
    setSelectedContactIds(prev => {
      const newSet = new Set(prev);
      
      if (allSelected) {
        filteredIds.forEach(id => newSet.delete(id));
      } else {
        filteredIds.forEach(id => newSet.add(id));
      }
      
      return newSet;
    });
  };

  const getFilteredContacts = () => {
    if (!Array.isArray(contacts)) return [];
    
    return contacts.filter(contact => {
      if (!contact || !contact.id) return false;
      
      if (!contactSearch.trim()) return true;
      
      const searchTerm = contactSearch.toLowerCase();
      const firstName = (contact.first_name || "").toLowerCase();
      const lastName = (contact.last_name || "").toLowerCase();
      const email = (contact.email || "").toLowerCase();
      const company = (contact.company_name || "").toLowerCase();
      
      return firstName.includes(searchTerm) || 
             lastName.includes(searchTerm) || 
             email.includes(searchTerm) || 
             company.includes(searchTerm);
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      selectedContactIds: selectedContactIds,
      target_audience: {
        ...formData.target_audience,
        customer_ids: Array.from(selectedContactIds)
      }
    };
    
    onSubmit(submitData);
  };

  const filteredContacts = getFilteredContacts();
  const filteredIds = filteredContacts.map(contact => contact.id);
  const allSelected = filteredIds.length > 0 && filteredIds.every(id => selectedContactIds.has(id));

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <span>{campaign ? 'Editar Campanha' : 'Nova Campanha'}</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card className="rounded-2xl border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg">Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Nome da Campanha</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Digite o nome da campanha"
                  className="rounded-xl border-gray-200 mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Descreva o objetivo da campanha"
                  className="rounded-xl border-gray-200 mt-1 h-24"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Tipo de Campanha</Label>
                  <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                    <SelectTrigger className="rounded-xl border-gray-200 mt-1">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="birthday">Aniversário</SelectItem>
                      <SelectItem value="billing">Cobrança</SelectItem>
                      <SelectItem value="welcome">Boas-vindas</SelectItem>
                      <SelectItem value="promotional">Promocional</SelectItem>
                      <SelectItem value="retention">Retenção</SelectItem>
                      <SelectItem value="follow_up">Follow-up</SelectItem>
                      <SelectItem value="other">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Cor da Campanha</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {campaignColors.map((color) => (
                      <button
                        key={color.id}
                        type="button"
                        onClick={() => handleInputChange('color', color.id)}
                        className={`w-8 h-8 rounded-full ${color.class} border-2 transition-all ${
                          formData.color === color.id ? 'border-gray-800 scale-110' : 'border-gray-300'
                        }`}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Selection */}
          <Card className="rounded-2xl border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5" />
                Seleção de Contatos ({selectedContactIds.size} selecionados)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Buscar contatos..."
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                    className="pl-10 rounded-xl border-gray-200"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSelectAllContacts}
                  className="rounded-xl"
                >
                  {allSelected ? 'Desmarcar Todos' : 'Selecionar Todos'}
                </Button>
              </div>

              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-xl p-2">
                {filteredContacts.length > 0 ? (
                  <div className="space-y-2">
                    {filteredContacts.map((contact) => {
                      const isSelected = selectedContactIds.has(contact.id);
                      return (
                        <div
                          key={contact.id}
                          className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                        >
                          <Checkbox
                            id={`contact-${contact.id}`}
                            checked={isSelected}
                            onCheckedChange={() => handleContactToggle(contact.id)}
                            className="rounded"
                          />
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                              {(contact.first_name?.[0] || '') + (contact.last_name?.[0] || '')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {contact.first_name} {contact.last_name}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {contact.email}
                            </p>
                            {contact.company_name && (
                              <p className="text-xs text-gray-400 truncate">
                                {contact.company_name}
                              </p>
                            )}
                          </div>
                          {contact.tags && contact.tags.length > 0 && (
                            <div className="flex gap-1">
                              {contact.tags.slice(0, 2).map((tag, index) => (
                                <Badge
                                  key={index}
                                  variant="secondary"
                                  className="text-xs px-1 py-0"
                                >
                                  {tag}
                                </Badge>
                              ))}
                              {contact.tags.length > 2 && (
                                <Badge variant="outline" className="text-xs px-1 py-0">
                                  +{contact.tags.length - 2}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>Nenhum contato encontrado</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-between items-center pt-6 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={onCancel} className="rounded-xl">
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button type="submit" className="bg-purple-600 hover:bg-purple-700 rounded-xl">
              <Save className="w-4 h-4 mr-2" />
              {campaign ? 'Atualizar Campanha' : 'Criar Campanha'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}