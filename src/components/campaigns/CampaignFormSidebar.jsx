
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
  X,
  Save,
  Users,
  Search,
  Filter,
  FileText,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { MessageTemplate } from "@/entities/MessageTemplate";
import { User } from "@/entities/User";

export default function CampaignFormSidebar({ campaign, isOpen, onClose, onSubmit, contacts }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "promotional",
    template_id: "",
    target_contacts: [],
    color: "bg-blue-500"
  });

  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [previewMessage, setPreviewMessage] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [previewContact, setPreviewContact] = useState(null);

  // Contact selection states
  const [contactSearch, setContactSearch] = useState("");
  const [contactFilters, setContactFilters] = useState({
    status: "all",
    source: "all"
  });
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  // Sidebar width state
  const [sidebarWidth, setSidebarWidth] = useState(800);
  const [isResizing, setIsResizing] = useState(false);
  // Removed isCollapsed state

  const minWidth = 400;
  const maxWidth = 1200;

  useEffect(() => {
    // Load saved sidebar width
    const savedWidth = localStorage.getItem('campaign-sidebar-width');
    if (savedWidth) {
      setSidebarWidth(parseInt(savedWidth));
    }
  }, []);

  useEffect(() => {
    // Save sidebar width
    localStorage.setItem('campaign-sidebar-width', sidebarWidth.toString());
  }, [sidebarWidth]);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      if (campaign) {
        setFormData({
          name: campaign.name || "",
          description: campaign.description || "",
          type: campaign.type || "promotional",
          template_id: campaign.message_content?.template_id || "",
          target_contacts: campaign.target_audience?.customer_ids || [],
          color: campaign.color || "bg-blue-500"
        });
        setSelectedContacts(campaign.target_audience?.customer_ids || []);
      } else {
        resetForm();
      }
    }
  }, [isOpen, campaign]);

  useEffect(() => {
    if (selectedTemplate && contacts.length > 0) {
      setPreviewContact(contacts[0]);
      updatePreviewMessage(selectedTemplate, contacts[0]);
    }
  }, [selectedTemplate, contacts]);

  const loadTemplates = async () => {
    try {
      const templateList = await MessageTemplate.list();
      setTemplates(templateList.filter(t => t.is_active));
    } catch (error) {
      console.error("Erro ao carregar templates:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      type: "promotional",
      template_id: "",
      target_contacts: [],
      color: "bg-blue-500"
    });
    setSelectedContacts([]);
    setSelectedTemplate(null);
    setPreviewMessage("");
    setShowPreview(false);
    setSelectAll(false);
  };

  const updatePreviewMessage = (template, contact) => {
    if (!template || !contact) return;

    let message = template.content;
    
    // Replace variables with contact data
    message = message.replace(/\{nome\}/g, contact.first_name || "Cliente");
    message = message.replace(/\{sobrenome\}/g, contact.last_name || "");
    message = message.replace(/\{nome_completo\}/g, `${contact.first_name || ""} ${contact.last_name || ""}`.trim());
    message = message.replace(/\{email\}/g, contact.email || "");
    message = message.replace(/\{telefone\}/g, contact.phone || "");
    message = message.replace(/\{empresa\}/g, contact.company_name || "");
    
    setPreviewMessage(message);
  };

  const handleTemplateChange = (templateId) => {
    const template = templates.find(t => t.id === templateId);
    setSelectedTemplate(template);
    setFormData(prev => ({ ...prev, template_id: templateId }));
    
    if (template && previewContact) {
      updatePreviewMessage(template, previewContact);
    }
  };

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = !contactSearch || 
      `${contact.first_name} ${contact.last_name}`.toLowerCase().includes(contactSearch.toLowerCase()) ||
      contact.email?.toLowerCase().includes(contactSearch.toLowerCase()) ||
      contact.phone?.includes(contactSearch);

    const matchesStatus = contactFilters.status === "all" || contact.status === contactFilters.status;
    const matchesSource = contactFilters.source === "all" || contact.source === contactFilters.source;

    return matchesSearch && matchesStatus && matchesSource;
  });

  const handleContactSelect = (contactId) => {
    setSelectedContacts(prev => {
      const newSelection = prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId];
      
      setSelectAll(newSelection.length === filteredContacts.length);
      return newSelection;
    });
  };

  const handleSelectAllContacts = () => {
    if (selectAll) {
      setSelectedContacts([]);
      setSelectAll(false);
    } else {
      const allFilteredIds = filteredContacts.map(c => c.id);
      setSelectedContacts(prev => {
        const combined = [...new Set([...prev, ...allFilteredIds])];
        return combined;
      });
      setSelectAll(true);
    }
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleMouseMove = (e) => {
    if (!isResizing) return;
    
    const newWidth = window.innerWidth - e.clientX;
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      setSidebarWidth(newWidth);
    }
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const campaignData = {
      ...formData,
      target_audience: {
        customer_ids: selectedContacts
      },
      count_contacts: selectedContacts.length,
      message_content: {
        template_id: formData.template_id,
        body: selectedTemplate?.content || ""
      }
    };

    onSubmit(campaignData);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-40" 
        onClick={onClose}
        style={{ width: '100vw', height: '100vh', margin: '0px' }}
      />
      
      {/* Sidebar */}
      <div
        className="fixed top-0 right-0 h-full bg-white shadow-2xl z-50 flex"
        style={{ width: sidebarWidth }}
      >
        {/* Resize Handle */}
        <div
          className="w-1 bg-gray-300 hover:bg-purple-500 cursor-col-resize transition-colors"
          onMouseDown={handleMouseDown}
        />

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center" style={{ gap: '0.75rem' }}>
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                {campaign ? 'Editar Campanha' : 'Nova Campanha'}
              </h2>
            </div>
            <div className="flex items-center" style={{ gap: '0.5rem' }}>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <form onSubmit={handleSubmit} className="flex flex-col" style={{ gap: '2rem' }}>
              {/* Basic Information */}
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg">Informações Básicas</CardTitle>
                </CardHeader>
                <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <Label htmlFor="name">Nome da Campanha</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Digite o nome da campanha"
                      className="rounded-xl"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Descreva o objetivo da campanha"
                      className="rounded-xl h-20"
                    />
                  </div>

                  <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
                    <div>
                      <Label htmlFor="type">Tipo da Campanha</Label>
                      <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
                        <SelectTrigger className="rounded-xl">
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
                      <Label htmlFor="color">Cor</Label>
                      <Select value={formData.color} onValueChange={(value) => setFormData(prev => ({ ...prev, color: value }))}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Selecione a cor" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="bg-blue-500">Azul</SelectItem>
                          <SelectItem value="bg-green-500">Verde</SelectItem>
                          <SelectItem value="bg-purple-500">Roxo</SelectItem>
                          <SelectItem value="bg-red-500">Vermelho</SelectItem>
                          <SelectItem value="bg-yellow-500">Amarelo</SelectItem>
                          <SelectItem value="bg-pink-500">Rosa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Message Template */}
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center" style={{ gap: '0.5rem' }}>
                    <FileText className="w-5 h-5" />
                    Modelo de Mensagem
                  </CardTitle>
                </CardHeader>
                <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <Label htmlFor="template">Selecionar Modelo</Label>
                    <Select value={formData.template_id} onValueChange={handleTemplateChange}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Escolha um modelo de mensagem" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            <div className="flex items-center" style={{ gap: '0.5rem' }}>
                              <span>{template.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {template.category}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedTemplate && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div className="flex items-center" style={{ gap: '0.5rem' }}>
                        <Checkbox
                          id="showPreview"
                          checked={showPreview}
                          onCheckedChange={setShowPreview}
                          className="rounded-md border-2 border-purple-500 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
                        />
                        <Label htmlFor="showPreview" className="flex items-center" style={{ gap: '0.5rem' }}>
                          {showPreview ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          Visualizar como ficaria com o primeiro contato
                        </Label>
                      </div>

                      <div className="p-4 bg-gray-50 rounded-xl">
                        <h4 className="font-medium text-gray-900 mb-2">
                          {showPreview ? 'Prévia Personalizada' : 'Modelo Original'}
                        </h4>
                        <div className={`p-3 rounded-lg border ${
                          showPreview ? 'bg-purple-500 bg-opacity-30 border-purple-300' : 'bg-white'
                        }`}>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {showPreview ? previewMessage : selectedTemplate.content}
                          </p>
                        </div>
                        {showPreview && previewContact && (
                          <p className="text-xs text-gray-500 mt-2">
                            Prévia usando dados de: {previewContact.first_name} {previewContact.last_name}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Target Audience */}
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <div className="flex items-center" style={{ gap: '0.5rem' }}>
                      <Users className="w-5 h-5" />
                      Público Alvo
                    </div>
                    <Badge variant="outline">
                      {selectedContacts.length} contatos selecionados
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Contact Filters */}
                  <div className="flex flex-col sm:flex-row" style={{ gap: '1rem' }}>
                    <div className="relative flex-1">
                      <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <Input
                        placeholder="Buscar contatos..."
                        value={contactSearch}
                        onChange={(e) => setContactSearch(e.target.value)}
                        className="pl-10 rounded-xl"
                      />
                    </div>

                    <div className="flex" style={{ gap: '0.5rem' }}>
                      <Select value={contactFilters.status} onValueChange={(value) => setContactFilters(prev => ({ ...prev, status: value }))}>
                        <SelectTrigger className="w-32 rounded-xl">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="all">Todos Status</SelectItem>
                          <SelectItem value="lead">Lead</SelectItem>
                          <SelectItem value="prospect">Prospect</SelectItem>
                          <SelectItem value="customer">Cliente</SelectItem>
                          <SelectItem value="churned">Perdido</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={contactFilters.source} onValueChange={(value) => setContactFilters(prev => ({ ...prev, source: value }))}>
                        <SelectTrigger className="w-40 rounded-xl">
                          <SelectValue placeholder="Origem" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="all">Todas Origens</SelectItem>
                          <SelectItem value="website">Website</SelectItem>
                          <SelectItem value="referral">Indicação</SelectItem>
                          <SelectItem value="social_media">Redes Sociais</SelectItem>
                          <SelectItem value="email_campaign">Campanha Email</SelectItem>
                          <SelectItem value="cold_outreach">Prospecção</SelectItem>
                          <SelectItem value="event">Evento</SelectItem>
                          <SelectItem value="other">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Select All Checkbox */}
                  <div className="flex items-center p-3 bg-gray-50 rounded-xl" style={{ gap: '0.5rem' }}>
                    <Checkbox
                      id="selectAll"
                      checked={selectAll}
                      onCheckedChange={handleSelectAllContacts}
                      className="rounded-md border-2 border-purple-500 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
                    />
                    <Label htmlFor="selectAll" className="font-medium">
                      Selecionar todos ({filteredContacts.length} contatos filtrados)
                    </Label>
                  </div>

                  {/* Contact List */}
                  <div className="max-h-96 overflow-y-auto border rounded-xl">
                    {filteredContacts.length > 0 ? (
                      <div className="divide-y">
                        {filteredContacts.map((contact) => (
                          <div key={contact.id} className="p-3 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center" style={{ gap: '0.75rem' }}>
                              <Checkbox
                                checked={selectedContacts.includes(contact.id)}
                                onCheckedChange={() => handleContactSelect(contact.id)}
                                className="rounded-md border-2 border-purple-500 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
                              />
                              
                              <Avatar className="w-10 h-10">
                                <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-500 text-white text-sm">
                                  {contact.first_name?.[0]}{contact.last_name?.[0]}
                                </AvatarFallback>
                              </Avatar>

                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">
                                  {contact.first_name} {contact.last_name}
                                </p>
                                <div className="flex items-center mt-1" style={{ gap: '0.5rem' }}>
                                  <p className="text-sm text-gray-500 truncate">{contact.email}</p>
                                  <Badge variant="outline" className="text-xs">
                                    {contact.status}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-gray-500">
                        <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>Nenhum contato encontrado com os filtros aplicados</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-6 border-t">
                <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="bg-purple-600 hover:bg-purple-700 rounded-xl"
                  disabled={!formData.name || !formData.template_id || selectedContacts.length === 0}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {campaign ? 'Atualizar Campanha' : 'Criar Campanha'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
