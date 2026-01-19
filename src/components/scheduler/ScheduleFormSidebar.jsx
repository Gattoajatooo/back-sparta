import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  X,
  Save,
  Users,
  Search,
  Filter,
  Calendar as CalendarIcon,
  Clock,
  Send,
  FileText,
  Eye,
  EyeOff,
  Megaphone,
  Info,
  Plus,
  Trash2
} from "lucide-react";
import { format, addDays, startOfTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { createSchedule } from "@/functions/createSchedule";
import { processScheduledMessage } from "@/functions/processScheduledMessage";
import { Campaign } from "@/entities/Campaign";
import { Tag } from "@/entities/Tag";
import { MessageTemplate } from "@/entities/MessageTemplate";
import { User } from "@/entities/User";
import { motion, AnimatePresence } from "framer-motion";

import TemplateFormSidebar from "../templates/TemplateFormSidebar";

export default function ScheduleFormSidebar({ schedule, contacts, templates, isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    name: "",
    message_type: "whatsapp",
    source_type: "campaigns", // "campaigns", "tags", "both"
    selected_campaigns: [],
    selected_tags: [],
    selected_contacts: [],
    selected_templates: [],
    message_sequence_type: "single", // "single", "sequential", "random"
    schedule_type: "single", // "single", "recurring", "trigger"
    trigger_type: "", // "birthday", "billing_due", "follow_up"
    scheduled_date: null,
    scheduled_time: "09:00",
    delivery_settings: {
      interval_type: "fixed",
      interval_fixed: 3000,
      interval_random_min: 1000,
      interval_random_max: 10000,
      respect_business_hours: true,
      start_hour: 8,
      end_hour: 18,
      active_days: {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: false,
        sunday: false
      }
    }
  });

  const [campaigns, setCampaigns] = useState([]);
  const [tags, setTags] = useState([]);
  const [messageTemplates, setMessageTemplates] = useState([]);
  const [availableContacts, setAvailableContacts] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Template creation states
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [newTemplate, setNewTemplate] = useState(null);

  // Sidebar resizing states
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('schedule_form_sidebar_width');
    return saved ? parseInt(saved) : 800;
  });
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
      
      if (schedule) {
        setFormData({
          name: schedule.name || "",
          message_type: schedule.message_type || "whatsapp",
          source_type: schedule.source_type || "campaigns",
          selected_campaigns: schedule.selected_campaigns || [],
          selected_tags: schedule.selected_tags || [],
          selected_contacts: schedule.selected_contacts || [],
          selected_templates: schedule.selected_templates || [],
          message_sequence_type: schedule.message_sequence_type || "single",
          schedule_type: schedule.schedule_type || "single",
          trigger_type: schedule.trigger_type || "",
          scheduled_date: schedule.scheduled_date ? new Date(schedule.scheduled_date) : null,
          scheduled_time: schedule.scheduled_time || "09:00",
          delivery_settings: {
            ...formData.delivery_settings,
            ...schedule.delivery_settings
          }
        });
      } else {
        resetForm();
      }
      
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    };
  }, [isOpen, schedule]);

  // Load campaigns and tags when source_type changes
  useEffect(() => {
    if (formData.source_type && (campaigns.length > 0 || tags.length > 0)) {
      updateAvailableContacts();
    }
  }, [formData.source_type, formData.selected_campaigns, formData.selected_tags, campaigns, tags]);

  const loadData = async () => {
    try {
      const user = await User.me();
      if (user?.company_id) {
        // Load campaigns
        const campaignList = await Campaign.filter({ company_id: user.company_id }, 'name');
        setCampaigns(campaignList);

        // Load tags
        const tagList = await Tag.filter({ company_id: user.company_id }, 'name');
        setTags(tagList);

        // Load templates
        const templateList = await MessageTemplate.filter({ company_id: user.company_id }, 'name');
        setMessageTemplates(templateList);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      message_type: "whatsapp",
      source_type: "campaigns",
      selected_campaigns: [],
      selected_tags: [],
      selected_contacts: [],
      selected_templates: [],
      message_sequence_type: "single",
      schedule_type: "single",
      trigger_type: "",
      scheduled_date: null,
      scheduled_time: "09:00",
      delivery_settings: {
        interval_type: "fixed",
        interval_fixed: 3000,
        interval_random_min: 1000,
        interval_random_max: 10000,
        respect_business_hours: true,
        start_hour: 8,
        end_hour: 18,
        active_days: {
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: false,
          sunday: false
        }
      }
    });
    setAvailableContacts([]);
  };

  const updateAvailableContacts = () => {
    let contactsFromSource = [];

    // Get contacts from selected campaigns
    if ((formData.source_type === "campaigns" || formData.source_type === "both") && formData.selected_campaigns.length > 0) {
      formData.selected_campaigns.forEach(campaignId => {
        const campaign = campaigns.find(c => c.id === campaignId);
        if (campaign?.target_audience?.customer_ids) {
          const campaignContacts = contacts.filter(contact => 
            campaign.target_audience.customer_ids.includes(contact.id)
          );
          contactsFromSource = [...contactsFromSource, ...campaignContacts];
        }
      });
    }

    // Get contacts from selected tags
    if ((formData.source_type === "tags" || formData.source_type === "both") && formData.selected_tags.length > 0) {
      formData.selected_tags.forEach(tagName => {
        const tagContacts = contacts.filter(contact => 
          contact.tags && contact.tags.includes(tagName)
        );
        contactsFromSource = [...contactsFromSource, ...tagContacts];
      });
    }

    // Remove duplicates
    const uniqueContacts = contactsFromSource.filter((contact, index, self) =>
      index === self.findIndex(c => c.id === contact.id)
    );

    setAvailableContacts(uniqueContacts);

    // Auto-select all contacts initially
    setFormData(prev => ({
      ...prev,
      selected_contacts: uniqueContacts.map(c => c.id)
    }));
  };

  const handleCampaignSelection = (campaignId, checked) => {
    setFormData(prev => ({
      ...prev,
      selected_campaigns: checked 
        ? [...prev.selected_campaigns, campaignId]
        : prev.selected_campaigns.filter(id => id !== campaignId)
    }));
  };

  const handleTagSelection = (tagName, checked) => {
    setFormData(prev => ({
      ...prev,
      selected_tags: checked 
        ? [...prev.selected_tags, tagName]
        : prev.selected_tags.filter(name => name !== tagName)
    }));
  };

  const handleContactSelection = (contactId, checked) => {
    setFormData(prev => ({
      ...prev,
      selected_contacts: checked 
        ? [...prev.selected_contacts, contactId]
        : prev.selected_contacts.filter(id => id !== contactId)
    }));
  };

  const handleTemplateSelection = (templateId, checked) => {
    setFormData(prev => ({
      ...prev,
      selected_templates: checked 
        ? [...prev.selected_templates, templateId]
        : prev.selected_templates.filter(id => id !== templateId)
    }));
  };

  const handleDayToggle = (day) => {
    setFormData(prev => ({
      ...prev,
      delivery_settings: {
        ...prev.delivery_settings,
        active_days: {
          ...prev.delivery_settings.active_days,
          [day]: !prev.delivery_settings.active_days[day]
        }
      }
    }));
  };

  const handleNewTemplateSubmit = async (templateData) => {
    try {
      const user = await User.me();
      const createdTemplate = await MessageTemplate.create({
        ...templateData,
        company_id: user.company_id
      });
      
      setNewTemplate(createdTemplate);
      setShowTemplateForm(false);
      
      // Ask if user wants to save to templates
      const shouldSave = window.confirm(
        "Mensagem criada com sucesso! Deseja salvá-la no módulo de Modelos para uso futuro?"
      );
      
      if (shouldSave) {
        setMessageTemplates(prev => [...prev, createdTemplate]);
      }
      
      // Add to selected templates for this schedule
      setFormData(prev => ({
        ...prev,
        selected_templates: [...prev.selected_templates, createdTemplate.id]
      }));
      
    } catch (error) {
      console.error("Erro ao criar template:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const scheduleData = {
        ...formData,
        scheduled_datetime: formData.scheduled_date && formData.scheduled_time 
          ? new Date(`${format(formData.scheduled_date, 'yyyy-MM-dd')}T${formData.scheduled_time}`)
          : null
      };

      await onSubmit(scheduleData);
    } catch (error) {
      console.error("Erro ao salvar agendamento:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMouseDown = (e) => {
    setIsResizing(true);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (isResizing) {
      const newWidth = Math.max(400, Math.min(1200, window.innerWidth - e.clientX));
      setSidebarWidth(newWidth);
      localStorage.setItem('schedule_form_sidebar_width', newWidth.toString());
    }
  };

  const handleMouseUp = () => {
    setIsResizing(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const getDayAbbreviation = (day) => {
    const days = {
      monday: 'Seg',
      tuesday: 'Ter',
      wednesday: 'Qua',
      thursday: 'Qui',
      friday: 'Sex',
      saturday: 'Sáb',
      sunday: 'Dom'
    };
    return days[day];
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <motion.div 
        className="fixed inset-0 bg-black/50 z-40" 
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ width: '100vw', height: '100vh', margin: '0px', opacity: 1 }}
      />
      
      {/* Sidebar */}
      <motion.div
        className="fixed top-0 right-0 h-full bg-white shadow-2xl z-50 flex"
        style={{ width: sidebarWidth }}
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'tween', duration: 0.3 }}
      >
        {/* Resize Handle */}
        <div
          className="w-1 bg-gray-300 hover:bg-blue-500 cursor-col-resize transition-colors flex-shrink-0"
          onMouseDown={handleMouseDown}
        />

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center" style={{ gap: '0.75rem' }}>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                {schedule ? 'Editar Agendamento' : 'Novo Agendamento'}
              </h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <form onSubmit={handleSubmit} className="flex flex-col" style={{ gap: '2rem' }}>
              
              {/* Informações Básicas */}
              <Card className="rounded-2xl border-gray-200">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">Informações Básicas</CardTitle>
                </CardHeader>
                <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <Label htmlFor="name">Nome do Agendamento</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Digite o nome do agendamento"
                      className="rounded-xl border-gray-200 mt-2 focus:ring-0 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="channel">Canal</Label>
                    <Select 
                      value={formData.message_type} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, message_type: value }))}
                    >
                      <SelectTrigger className="rounded-xl border-gray-200 mt-2">
                        <SelectValue placeholder="Selecione o canal" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="email" disabled>E-mail (Em breve)</SelectItem>
                        <SelectItem value="sms" disabled>SMS (Em breve)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Selecionar Campanha e/ou Marcadores */}
              <Card className="rounded-2xl border-gray-200">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center" style={{ gap: '0.5rem' }}>
                    <Users className="w-5 h-5" />
                    Selecionar Campanha e/ou Marcadores
                    <Info className="w-4 h-4 text-blue-500 cursor-help" title="Os contatos atrelados às campanhas e/ou marcadores selecionados serão importados para este agendamento" />
                  </CardTitle>
                </CardHeader>
                <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                    <Label htmlFor="source_type">Fonte dos Contatos</Label>
                    <Select 
                      value={formData.source_type} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, source_type: value }))}
                    >
                      <SelectTrigger className="rounded-xl border-gray-200 mt-2">
                        <SelectValue placeholder="Selecione a fonte" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="campaigns">Somente Campanhas</SelectItem>
                        <SelectItem value="tags">Somente Marcadores</SelectItem>
                        <SelectItem value="both">Campanhas e Marcadores</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Campanhas */}
                  {(formData.source_type === "campaigns" || formData.source_type === "both") && (
                    <div>
                      <Label>Campanhas</Label>
                      <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-xl p-3" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {campaigns.map((campaign) => (
                          <div key={campaign.id} className="flex items-center" style={{ gap: '0.5rem' }}>
                            <Checkbox
                              id={`campaign-${campaign.id}`}
                              checked={formData.selected_campaigns.includes(campaign.id)}
                              onCheckedChange={(checked) => handleCampaignSelection(campaign.id, checked)}
                            />
                            <label htmlFor={`campaign-${campaign.id}`} className="text-sm font-medium">
                              {campaign.name}
                            </label>
                            <Badge variant="outline" className="ml-auto text-xs">
                              {campaign.count_contacts || 0} contatos
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Marcadores */}
                  {(formData.source_type === "tags" || formData.source_type === "both") && (
                    <div>
                      <Label>Marcadores</Label>
                      <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-xl p-3" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {tags.map((tag) => (
                          <div key={tag.id} className="flex items-center" style={{ gap: '0.5rem' }}>
                            <Checkbox
                              id={`tag-${tag.id}`}
                              checked={formData.selected_tags.includes(tag.name)}
                              onCheckedChange={(checked) => handleTagSelection(tag.name, checked)}
                            />
                            <label htmlFor={`tag-${tag.id}`} className="text-sm font-medium">
                              {tag.name}
                            </label>
                            <Badge variant="outline" className="ml-auto text-xs">
                              {tag.contacts_count || 0} contatos
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Lista de Contatos Selecionados */}
                  {availableContacts.length > 0 && (
                    <div>
                      <Label>Contatos Selecionados ({formData.selected_contacts.length}/{availableContacts.length})</Label>
                      <div className="mt-2 max-h-60 overflow-y-auto border border-gray-200 rounded-xl p-3" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {availableContacts.map((contact) => (
                          <div key={contact.id} className="flex items-center" style={{ gap: '0.75rem' }}>
                            <Checkbox
                              id={`contact-${contact.id}`}
                              checked={formData.selected_contacts.includes(contact.id)}
                              onCheckedChange={(checked) => handleContactSelection(contact.id, checked)}
                            />
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                                {contact.first_name?.[0]}{contact.last_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {contact.first_name} {contact.last_name}
                              </p>
                              <p className="text-xs text-gray-500 truncate">{contact.email}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Mensagens para Envio */}
              <Card className="rounded-2xl border-gray-200">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <div className="flex items-center" style={{ gap: '0.5rem' }}>
                      <FileText className="w-5 h-5" />
                      Mensagens para Envio
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowTemplateForm(true)}
                      className="rounded-xl"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Nova Mensagem
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Template Selection */}
                  <div>
                    <Label>Selecionar Mensagens ({formData.selected_templates.length} selecionadas)</Label>
                    <div className="mt-2 max-h-60 overflow-y-auto border border-gray-200 rounded-xl p-3" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {messageTemplates.map((template) => (
                        <div key={template.id} className="flex items-start" style={{ gap: '0.75rem' }}>
                          <Checkbox
                            id={`template-${template.id}`}
                            checked={formData.selected_templates.includes(template.id)}
                            onCheckedChange={(checked) => handleTemplateSelection(template.id, checked)}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <label htmlFor={`template-${template.id}`} className="text-sm font-medium text-gray-900 block">
                              {template.name}
                            </label>
                            <p className="text-xs text-gray-500 mt-1">{template.category}</p>
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{template.content?.substring(0, 100)}...</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Message Sequence Type */}
                  {formData.selected_templates.length > 1 && (
                    <div>
                      <Label htmlFor="message_sequence">Tipo de Sequência</Label>
                      <Select 
                        value={formData.message_sequence_type} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, message_sequence_type: value }))}
                      >
                        <SelectTrigger className="rounded-xl border-gray-200 mt-2">
                          <SelectValue placeholder="Selecione o tipo de sequência" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="single">Envio Único (primeira mensagem)</SelectItem>
                          <SelectItem value="sequential">Envio Sequencial</SelectItem>
                          <SelectItem value="random">Envio Aleatório</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Configurações de Agendamento */}
              <Card className="rounded-2xl border-gray-200">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center" style={{ gap: '0.5rem' }}>
                    <Clock className="w-5 h-5" />
                    Configurações de Agendamento
                  </CardTitle>
                </CardHeader>
                <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                    <Label htmlFor="schedule_type">Tipo de Agendamento</Label>
                    <Select 
                      value={formData.schedule_type} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, schedule_type: value }))}
                    >
                      <SelectTrigger className="rounded-xl border-gray-200 mt-2">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="single">Envio Único</SelectItem>
                        <SelectItem value="recurring">Recorrente</SelectItem>
                        <SelectItem value="trigger">Por Gatilho</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.schedule_type === "trigger" && (
                    <div>
                      <Label htmlFor="trigger_type">Tipo de Gatilho</Label>
                      <Select 
                        value={formData.trigger_type} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, trigger_type: value }))}
                      >
                        <SelectTrigger className="rounded-xl border-gray-200 mt-2">
                          <SelectValue placeholder="Selecione o gatilho" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="birthday">Aniversário</SelectItem>
                          <SelectItem value="billing_due">Vencimento de Fatura</SelectItem>
                          <SelectItem value="follow_up">Follow-up</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {formData.schedule_type !== "trigger" && (
                    <>
                      <div>
                        <Label>Data e Hora do Envio</Label>
                        <div className="flex" style={{ gap: '0.75rem', marginTop: '0.5rem' }}>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="rounded-xl border-gray-200 flex-1 justify-start"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {formData.scheduled_date ? format(formData.scheduled_date, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione a data'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 rounded-2xl z-[60]" align="start">
                              <Calendar
                                mode="single"
                                selected={formData.scheduled_date}
                                onSelect={(date) => setFormData(prev => ({ ...prev, scheduled_date: date }))}
                                disabled={(date) => date < startOfTomorrow()}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>

                          <Input
                            type="time"
                            value={formData.scheduled_time}
                            onChange={(e) => setFormData(prev => ({ ...prev, scheduled_time: e.target.value }))}
                            className="rounded-xl border-gray-200 w-32 focus:ring-0 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <Label>Dias Ativos para Envio</Label>
                        <div className="flex flex-wrap mt-2" style={{ gap: '0.5rem' }}>
                          {Object.entries(formData.delivery_settings.active_days).map(([day, active]) => (
                            <Button
                              key={day}
                              type="button"
                              variant={active ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleDayToggle(day)}
                              className={`rounded-xl ${active ? 'bg-blue-600 hover:bg-blue-700' : 'border-gray-200'}`}
                            >
                              {getDayAbbreviation(day)}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Submit Button */}
              <div className="flex justify-end pt-4" style={{ gap: '0.75rem' }}>
                <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 rounded-xl"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {schedule ? 'Atualizar Agendamento' : 'Criar Agendamento'}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </motion.div>

      {/* Template Form Sidebar */}
      {showTemplateForm && (
        <TemplateFormSidebar
          template={null}
          categories={[]}
          types={[]}
          isOpen={showTemplateForm}
          onClose={() => setShowTemplateForm(false)}
          onSubmit={handleNewTemplateSubmit}
        />
      )}
    </>
  );
}