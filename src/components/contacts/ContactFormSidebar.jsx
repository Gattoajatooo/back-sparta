import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User } from "@/entities/User";
import { Campaign } from "@/entities/Campaign";
import { Tag } from "@/entities/Tag";
import {
  CalendarIcon,
  Plus,
  X,
  Loader2,
  Save,
  Edit
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

export default function ContactFormSidebar({ contact, isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    birth_date: '',
    company_name: '',
    position: '',
    custom_position: '',
    status: 'lead',
    source: '',
    value: '',
    notes: '',
    campaign_ids: [],
    tags: [],
    social_profiles: {
      linkedin: '',
      twitter: '',
      website: ''
    },
    banking_data: {
      bank_name: '',
      bank_code: '',
      agency: '',
      account: '',
      account_digit: '',
      pix_key_type: 'cpf',
      pix_key: ''
    }
  });

  const [birthDate, setBirthDate] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [storedLid, setStoredLid] = useState(null); // Armazenar LID em memória
  const [isVerifying, setIsVerifying] = useState(false);

  // New state variables for dropdown visibility
  const [showCampaignSelect, setShowCampaignSelect] = useState(false);
  const [showTagSelect, setShowTagSelect] = useState(false);

  // Sidebar resizing states
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('contact_sidebar_width');
    return saved ? parseInt(saved) : 384; // Default 384px (w-96)
  });
  const [isResizing, setIsResizing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);

  // Reset form data when contact changes or sidebar opens/closes
  useEffect(() => {
    if (isOpen) {
      if (contact) {
        // Editing existing contact
        setFormData({
          first_name: contact.first_name || '',
          last_name: contact.last_name || '',
          email: contact.email || '',
          phone: contact.phone || '',
          birth_date: contact.birth_date || '',
          company_name: contact.company_name || '',
          position: contact.position || '',
          custom_position: contact.custom_position || '',
          status: contact.status || 'lead',
          source: contact.source || '',
          value: contact.value || '',
          notes: contact.notes || '',
          campaign_ids: contact.campaign_ids || [],
          tags: contact.tags || [],
          social_profiles: {
            linkedin: contact.social_profiles?.linkedin || '',
            twitter: contact.social_profiles?.twitter || '',
            website: contact.social_profiles?.website || ''
          },
          banking_data: {
            bank_name: contact.banking_data?.bank_name || '',
            bank_code: contact.banking_data?.bank_code || '',
            agency: contact.banking_data?.agency || '',
            account: contact.banking_data?.account || '',
            account_digit: contact.banking_data?.account_digit || '',
            pix_key_type: contact.banking_data?.pix_key_type || 'cpf',
            pix_key: contact.banking_data?.pix_key || ''
          }
        });
        setBirthDate(contact.birth_date ? new Date(contact.birth_date) : null);
      } else {
        // Adding new contact - reset to defaults
        setFormData({
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          birth_date: '',
          company_name: '',
          position: '',
          custom_position: '',
          status: 'lead',
          source: '',
          value: '',
          notes: '',
          campaign_ids: [],
          tags: [],
          social_profiles: {
            linkedin: '',
            twitter: '',
            website: ''
          },
          banking_data: {
            bank_name: '',
            bank_code: '',
            agency: '',
            account: '',
            account_digit: '',
            pix_key_type: 'cpf',
            pix_key: ''
          }
        });
        setBirthDate(null);
      }
      
      loadData();
      // Prevenir scroll do body e html quando sidebar está aberto
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      // Restaurar scroll do body e html quando sidebar está fechado
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
      // Hide dropdowns when sidebar closes
      setShowCampaignSelect(false);
      setShowTagSelect(false);
    }

    // Cleanup ao desmontar
    return () => {
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    };
  }, [isOpen, contact]);

  const loadData = async () => {
    try {
      const user = await User.me();
      
      if (user.company_id) {
        // Carregar campanhas
        const campaignList = await Campaign.filter(
          { company_id: user.company_id },
          'name'
        );
        setCampaigns(campaignList);

        // Carregar tags manuais (não inteligentes)
        const tagList = await Tag.filter(
          { 
            company_id: user.company_id,
          },
          'name'
        );
        setAvailableTags(tagList);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Save sidebar width to localStorage and user preferences
  const saveSidebarWidth = async (width) => {
    try {
      localStorage.setItem('contact_sidebar_width', width.toString());
      
      const user = await User.me();
      if (user) {
        const currentSettings = JSON.parse(JSON.stringify(user.settings || {}));
        const updatedSettings = {
          ...currentSettings,
          sidebar_preferences: {
            ...(currentSettings.sidebar_preferences || {}),
            contact_form_width: width
          }
        };
        await User.updateMyUserData({ settings: updatedSettings });
      }
    } catch (error) {
      console.error("Error saving sidebar width:", error);
    }
  };

  // Load user sidebar width preferences
  const loadSidebarWidth = async () => {
    try {
      const user = await User.me();
      if (user?.settings?.sidebar_preferences?.contact_form_width) {
        const width = user.settings.sidebar_preferences.contact_form_width;
        setSidebarWidth(width);
        localStorage.setItem('contact_sidebar_width', width.toString());
      }
    } catch (error) {
      console.error("Error loading sidebar width:", error);
    }
  };

  // Load sidebar width when component mounts
  useEffect(() => {
    if (isOpen) {
      loadSidebarWidth();
    }
  }, [isOpen]);

  const handleMouseDown = (e) => {
    setIsResizing(true);
    setStartX(e.clientX);
    setStartWidth(sidebarWidth);
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  };

  const handleMouseMove = (e) => {
    if (!isResizing) return;
    
    const deltaX = startX - e.clientX; // Reverse delta since we're resizing from left edge
    const newWidth = Math.min(Math.max(startWidth + deltaX, 400), 600); // Min 400px, Max 600px
    setSidebarWidth(newWidth);
  };

  const handleMouseUp = () => {
    if (isResizing) {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      saveSidebarWidth(sidebarWidth);
    }
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
  }, [isResizing, startX, startWidth, sidebarWidth]);


  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSocialProfileChange = (platform, value) => {
    setFormData(prev => ({
      ...prev,
      social_profiles: {
        ...prev.social_profiles,
        [platform]: value
      }
    }));
  };

  const addCampaign = (campaignId) => {
    if (!formData.campaign_ids.includes(campaignId)) {
      setFormData(prev => ({
        ...prev,
        campaign_ids: [...prev.campaign_ids, campaignId]
      }));
    }
    setShowCampaignSelect(false);
  };

  const removeCampaign = (campaignId) => {
    setFormData(prev => ({
      ...prev,
      campaign_ids: prev.campaign_ids.filter(id => id !== campaignId)
    }));
  };

  const addTag = (tagName) => {
    if (!formData.tags.includes(tagName)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagName]
      }));
    }
    setShowTagSelect(false);
  };

  const removeTag = (tagName) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagName)
    }));
  };

  const getCampaignById = (id) => {
    return campaigns.find(c => c.id === id);
  };

  const getTagByName = (name) => {
    return availableTags.find(t => t.name === name);
  };

  const getAvailableCampaigns = () => {
    return campaigns.filter(c => !formData.campaign_ids.includes(c.id));
  };

  const getAvailableTags = () => {
    // Only show manual tags (not smart tags) that aren't already selected
    return availableTags.filter(t => 
      !t.is_smart && 
      !formData.tags.includes(t.name)
    );
  };

  // Bank validation function
  const validateBankData = (bankCode, agency, account) => {
    // Basic validation - can be expanded
    const bankCodeValid = /^\d{3}$/.test(bankCode);
    const agencyValid = /^\d{4}$/.test(agency);
    const accountValid = /^\d{1,8}$/.test(account);
    
    return {
      bankCodeValid,
      agencyValid,
      accountValid,
      isValid: bankCodeValid && agencyValid && accountValid
    };
  };

  // PIX key formatting functions
  const formatCPF = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return value;
  };

  const formatCNPJ = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 14) {
      return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return value;
  };

  const formatPhone = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.startsWith('55')) {
      // Brazilian format with country code
      if (numbers.length <= 13) {
        return numbers.replace(/(\d{2})(\d{2})(\d{5})(\d{4})/, '+$1 ($2) $3-$4');
      }
    } else if (numbers.length <= 11) {
      // Brazilian format without country code
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return value;
  };

  const formatPixKey = (type, value) => {
    switch (type) {
      case 'cpf':
        return formatCPF(value);
      case 'cnpj':
        return formatCNPJ(value);
      case 'phone':
        return formatPhone(value);
      case 'email':
      case 'random':
      default:
        return value;
    }
  };

  // PIX key validation
  const validatePixKey = (type, key) => {
    if (!key) return true; // Allow empty
    
    const cleanKey = key.replace(/\D/g, '');
    
    switch (type) {
      case 'cpf':
        return cleanKey.length === 11;
      case 'cnpj':
        return cleanKey.length === 14;
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key);
      case 'phone':
        const phoneNumbers = key.replace(/\D/g, '');
        // Allow 11 digits (with DDD, e.g., 11987654321) or 13 digits (with country code and DDD, e.g., 5511987654321)
        return phoneNumbers.length === 11 || phoneNumbers.length === 13;
      case 'random':
        return key.length >= 32;
      default:
        return true;
    }
  };

  const pixKeyTypes = [
    { value: 'cpf', label: 'CPF' },
    { value: 'cnpj', label: 'CNPJ' },
    { value: 'email', label: 'E-mail' },
    { value: 'phone', label: 'Telefone' },
    { value: 'random', label: 'Chave Aleatória' }
  ];

  const handleVerifyPhone = async () => {
    if (!formData.phone) return;
    
    setIsVerifying(true);
    try {
      const { base44 } = await import('@/api/base44Client');
      const response = await base44.functions.invoke('checkExistsContact', {
        phones: [formData.phone]
      });
      
      if (response.data?.success && response.data.results?.[0]) {
        const result = response.data.results[0];
        
        // Se for LID, armazenar e atualizar número principal
        if (result.is_lid && result.verified_phone && result.original_number) {
          console.log('🏢 LID detectado:', {
            lid: result.original_number,
            pn: result.verified_phone
          });
          
          // Armazenar LID em memória
          setStoredLid(result.original_number);
          
          // Atualizar número principal com o número real
          setFormData(prev => ({
            ...prev,
            phone: result.verified_phone
          }));
          
          alert(`✅ Conta comercial detectada!\n\nNúmero principal atualizado para: ${result.verified_phone}\nLID armazenado: ${result.original_number}\n\nO LID será adicionado automaticamente ao salvar.`);
        } else if (result.verified && result.verified_phone) {
          // Número normal verificado
          setFormData(prev => ({
            ...prev,
            phone: result.verified_phone
          }));
          alert(`✅ Número verificado: ${result.verified_phone}`);
        }
      }
    } catch (error) {
      console.error('Erro ao verificar número:', error);
      alert('Erro ao verificar número no WhatsApp');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Preparar phones array
    let phonesArray = [];
    
    // Adicionar telefone principal
    if (formData.phone) {
      phonesArray.push({ phone: formData.phone, type: 'primary' });
    }
    
    // Se houver LID armazenado, adicionar automaticamente
    if (storedLid) {
      phonesArray.push({ phone: storedLid, type: 'lid' });
    }
    
    const submissionData = {
      ...formData,
      phones: phonesArray, // Enviar array de telefones
      birth_date: birthDate ? birthDate.toISOString().split('T')[0] : null,
      value: formData.value ? parseFloat(formData.value) : null
    };
    onSubmit(submissionData);
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed top-0 left-0 w-screen h-screen z-[100000]" style={{ margin: 0 }}>
          {/* Overlay de fundo */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute w-full h-full bg-black/50"
            style={{ top: 0, left: 0, width: '100vw', height: '100vh', margin: 0 }}
            onClick={handleClose}
          />
          
          {/* Sidebar */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute top-0 right-0 h-full bg-white shadow-2xl flex"
            style={{ 
              height: '100vh', 
              margin: 0, 
              width: `${sidebarWidth}px`,
              minWidth: '400px',
              maxWidth: '600px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Resize Handle */}
            <div
              className="w-1 bg-transparent hover:bg-blue-400 hover:bg-opacity-50 cursor-ew-resize flex-shrink-0 relative group"
              onMouseDown={handleMouseDown}
              style={{ 
                cursor: isResizing ? 'ew-resize' : 'ew-resize',
                transition: 'background-color 0.2s'
              }}
            >
              <div className="absolute inset-y-0 -left-1 -right-1 bg-transparent group-hover:bg-blue-400 group-hover:bg-opacity-20"></div>
            </div>

            {/* Sidebar Content */}
            <div className="flex flex-col flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center">
                    {contact ? (
                      <Edit className="w-5 h-5 text-white" />
                    ) : (
                      <Plus className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {contact ? 'Editar Contato' : 'Novo Contato'}
                    </h2>
                    <p className="text-sm text-gray-600">
                      {contact ? 'Modificar informações do contato' : 'Adicionar novo contato'}
                    </p>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  className="rounded-full"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Content - Scrollable */}
              <div className="flex-1 overflow-y-auto p-0" style={{ margin: 0 }}>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="ml-2">Carregando...</span>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="p-6" style={{ margin: 0 }}>
                    <div className="space-y-6" style={{ margin: 0 }}>
                      {/* Informações Básicas */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações Básicas</h3>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <Label htmlFor="first_name">Nome *</Label>
                            <Input
                              id="first_name"
                              value={formData.first_name}
                              onChange={(e) => handleInputChange('first_name', e.target.value)}
                              required
                              className="rounded-xl border-gray-200"
                            />
                          </div>
                          <div>
                            <Label htmlFor="last_name">Sobrenome</Label>
                            <Input
                              id="last_name"
                              value={formData.last_name}
                              onChange={(e) => handleInputChange('last_name', e.target.value)}
                              className="rounded-xl border-gray-200"
                            />
                          </div>
                        </div>

                        <div className="mb-4">
                          <Label htmlFor="email">Email *</Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            required
                            className="rounded-xl border-gray-200"
                          />
                        </div>

                        <div className="mb-4">
                          <Label htmlFor="phone">Telefone</Label>
                          <div className="flex gap-2">
                            <Input
                              id="phone"
                              value={formData.phone}
                              onChange={(e) => handleInputChange('phone', e.target.value)}
                              placeholder="+5511999999999"
                              className="rounded-xl border-gray-200 flex-1"
                            />
                            <Button
                              type="button"
                              onClick={handleVerifyPhone}
                              disabled={!formData.phone || isVerifying}
                              variant="outline"
                              className="rounded-xl"
                            >
                              {isVerifying ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                'Verificar'
                              )}
                            </Button>
                          </div>
                          {storedLid && (
                            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-xl">
                              <p className="text-xs text-blue-700">
                                🏢 LID: {storedLid} será adicionado ao salvar
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="mb-4">
                          <Label>Data de Nascimento</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left rounded-xl border-gray-200"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {birthDate ? format(birthDate, 'dd/MM/yyyy') : 'Selecione uma data'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 z-[100001]">
                              <Calendar
                                mode="single"
                                selected={birthDate}
                                onSelect={setBirthDate}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>

                      {/* Informações da Empresa */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações da Empresa</h3>
                        
                        <div className="mb-4">
                          <Label htmlFor="company_name">Empresa</Label>
                          <Input
                            id="company_name"
                            value={formData.company_name}
                            onChange={(e) => handleInputChange('company_name', e.target.value)}
                            className="rounded-xl border-gray-200"
                          />
                        </div>

                        <div className="mb-4">
                          <Label htmlFor="position">Cargo</Label>
                          <Select 
                            value={formData.position} 
                            onValueChange={(value) => handleInputChange('position', value)}
                          >
                            <SelectTrigger className="rounded-xl border-gray-200">
                              <SelectValue placeholder="Selecione um cargo" />
                            </SelectTrigger>
                            <SelectContent className="z-[100001]">
                              <SelectItem value="ceo">CEO</SelectItem>
                              <SelectItem value="cto">CTO</SelectItem>
                              <SelectItem value="cfo">CFO</SelectItem>
                              <SelectItem value="manager">Gerente</SelectItem>
                              <SelectItem value="developer">Desenvolvedor</SelectItem>
                              <SelectItem value="designer">Designer</SelectItem>
                              <SelectItem value="sales">Vendas</SelectItem>
                              <SelectItem value="marketing">Marketing</SelectItem>
                              <SelectItem value="support">Suporte</SelectItem>
                              <SelectItem value="other">Outros</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          {formData.position === 'other' && (
                            <Input
                              placeholder="Especificar cargo"
                              value={formData.custom_position}
                              onChange={(e) => handleInputChange('custom_position', e.target.value)}
                              className="rounded-xl border-gray-200 mt-2"
                            />
                          )}
                        </div>
                      </div>

                      {/* Status e Origem */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Status e Origem</h3>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <Label>Status</Label>
                            <Select 
                              value={formData.status} 
                              onValueChange={(value) => handleInputChange('status', value)}
                            >
                              <SelectTrigger className="rounded-xl border-gray-200">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="z-[100001]">
                                <SelectItem value="lead">Lead</SelectItem>
                                <SelectItem value="prospect">Prospect</SelectItem>
                                <SelectItem value="customer">Cliente</SelectItem>
                                <SelectItem value="churned">Churn</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label>Origem</Label>
                            <Select 
                              value={formData.source} 
                              onValueChange={(value) => handleInputChange('source', value)}
                            >
                              <SelectTrigger className="rounded-xl border-gray-200">
                                <SelectValue placeholder="Selecione origem" />
                              </SelectTrigger>
                              <SelectContent className="z-[100001]">
                                <SelectItem value="website">Website</SelectItem>
                                <SelectItem value="referral">Indicação</SelectItem>
                                <SelectItem value="social_media">Redes Sociais</SelectItem>
                                <SelectItem value="email_campaign">Campanha Email</SelectItem>
                                <SelectItem value="cold_outreach">Prospecção Fria</SelectItem>
                                <SelectItem value="event">Evento</SelectItem>
                                <SelectItem value="other">Outros</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="mb-4">
                          <Label htmlFor="value">Valor Estimado</Label>
                          <Input
                            id="value"
                            type="number"
                            step="0.01"
                            value={formData.value}
                            onChange={(e) => handleInputChange('value', e.target.value)}
                            placeholder="0.00"
                            className="rounded-xl border-gray-200"
                          />
                        </div>
                      </div>

                      {/* Campanhas */}
                      <div>
                        <Label htmlFor="campaigns">Campanhas</Label>
                        <div className="relative">
                          <div className="min-h-[42px] border border-gray-200 rounded-xl p-3 bg-white">
                            {formData.campaign_ids.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {formData.campaign_ids.map((campaignId) => {
                                  const campaign = getCampaignById(campaignId);
                                  if (!campaign) return null;
                                  
                                  return (
                                    <Badge
                                      key={campaignId}
                                      className="flex items-center gap-1 px-3 py-1 text-white rounded-full"
                                      style={{ backgroundColor: campaign.color || '#3b82f6' }}
                                    >
                                      {campaign.name}
                                      <button
                                        type="button"
                                        onClick={() => removeCampaign(campaignId)}
                                        className="ml-1 hover:bg-black hover:bg-opacity-20 rounded-full p-0.5"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </Badge>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-gray-500 text-sm">Nenhuma campanha selecionada</span>
                            )}
                          </div>
                          
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => setShowCampaignSelect(!showCampaignSelect)}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 rounded-full"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>

                          {/* Campaign Dropdown */}
                          {showCampaignSelect && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-[100001] max-h-48 overflow-y-auto">
                              {getAvailableCampaigns().length > 0 ? (
                                getAvailableCampaigns().map((campaign) => (
                                  <button
                                    key={campaign.id}
                                    type="button"
                                    onClick={() => addCampaign(campaign.id)}
                                    className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100 last:border-b-0"
                                  >
                                    <div 
                                      className="w-4 h-4 rounded-full"
                                      style={{ backgroundColor: campaign.color || '#3b82f6' }}
                                    />
                                    <span className="text-sm">{campaign.name}</span>
                                  </button>
                                ))
                              ) : (
                                <div className="px-4 py-3 text-sm text-gray-500">
                                  Nenhuma campanha disponível
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Marcadores */}
                      <div>
                        <Label htmlFor="tags">Marcadores</Label>
                        <div className="relative">
                          <div className="min-h-[42px] border border-gray-200 rounded-xl p-3 bg-white">
                            {formData.tags.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {formData.tags.map((tagName) => {
                                  const tag = getTagByName(tagName);
                                  const isSmartTag = tag?.is_smart;
                                  
                                  return (
                                    <Badge
                                      key={tagName}
                                      className="flex items-center gap-1 px-3 py-1 text-white rounded-full"
                                      style={{ backgroundColor: tag?.color || '#6b7280' }}
                                    >
                                      {tagName}
                                      {!isSmartTag && (
                                        <button
                                          type="button"
                                          onClick={() => removeTag(tagName)}
                                          className="ml-1 hover:bg-black hover:bg-opacity-20 rounded-full p-0.5"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      )}
                                    </Badge>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-gray-500 text-sm">Nenhum marcador selecionado</span>
                            )}
                          </div>
                          
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => setShowTagSelect(!showTagSelect)}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 rounded-full"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>

                          {/* Tag Dropdown */}
                          {showTagSelect && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-[100001] max-h-48 overflow-y-auto">
                              {getAvailableTags().length > 0 ? (
                                getAvailableTags().map((tag) => (
                                  <button
                                    key={tag.id}
                                    type="button"
                                    onClick={() => addTag(tag.name)}
                                    className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100 last:border-b-0"
                                  >
                                    <div 
                                      className="w-4 h-4 rounded-full"
                                      style={{ backgroundColor: tag.color || '#6b7280' }}
                                    />
                                    <span className="text-sm">{tag.name}</span>
                                  </button>
                                ))
                              ) : (
                                <div className="px-4 py-3 text-sm text-gray-500">
                                  Nenhum marcador disponível
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Redes Sociais */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Redes Sociais</h3>
                        
                        <div className="space-y-4" style={{ margin: 0 }}>
                          <div>
                            <Label htmlFor="linkedin">LinkedIn</Label>
                            <Input
                              id="linkedin"
                              value={formData.social_profiles.linkedin}
                              onChange={(e) => handleSocialProfileChange('linkedin', e.target.value)}
                              placeholder="https://linkedin.com/in/username"
                              className="rounded-xl border-gray-200"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="twitter">Twitter</Label>
                            <Input
                              id="twitter"
                              value={formData.social_profiles.twitter}
                              onChange={(e) => handleSocialProfileChange('twitter', e.target.value)}
                              placeholder="https://twitter.com/username"
                              className="rounded-xl border-gray-200"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="website">Website</Label>
                            <Input
                              id="website"
                              value={formData.social_profiles.website}
                              onChange={(e) => handleSocialProfileChange('website', e.target.value)}
                              placeholder="https://website.com"
                              className="rounded-xl border-gray-200"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Banking Data Section */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Dados Bancários</h3>
                        
                        <div className="space-y-4">
                          {/* Bank Name and Code */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="bank_name">Nome do Banco</Label>
                              <Input
                                id="bank_name"
                                value={formData.banking_data.bank_name}
                                onChange={(e) => setFormData(prev => ({
                                  ...prev,
                                  banking_data: { ...prev.banking_data, bank_name: e.target.value }
                                }))}
                                placeholder="Ex: Banco do Brasil"
                                className="rounded-xl border-gray-200"
                              />
                            </div>
                            <div>
                              <Label htmlFor="bank_code">Código do Banco</Label>
                              <Input
                                id="bank_code"
                                value={formData.banking_data.bank_code}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/\D/g, '').slice(0, 3);
                                  setFormData(prev => ({
                                    ...prev,
                                    banking_data: { ...prev.banking_data, bank_code: value }
                                  }));
                                }}
                                placeholder="001"
                                maxLength={3}
                                className={`rounded-xl ${validateBankData(formData.banking_data.bank_code, '', '').bankCodeValid || !formData.banking_data.bank_code ? 'border-gray-200' : 'border-red-300'}`}
                              />
                            </div>
                          </div>

                          {/* Agency and Account */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="agency">Agência</Label>
                              <Input
                                id="agency"
                                value={formData.banking_data.agency}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                                  setFormData(prev => ({
                                    ...prev,
                                    banking_data: { ...prev.banking_data, agency: value }
                                  }));
                                }}
                                placeholder="1234"
                                maxLength={4}
                                className={`rounded-xl ${validateBankData('', formData.banking_data.agency, '').agencyValid || !formData.banking_data.agency ? 'border-gray-200' : 'border-red-300'}`}
                              />
                            </div>
                            <div>
                              <Label htmlFor="account">Conta com Dígito</Label>
                              <div className="flex gap-2">
                                <Input
                                  id="account"
                                  value={formData.banking_data.account}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, '').slice(0, 8);
                                    setFormData(prev => ({
                                      ...prev,
                                      banking_data: { ...prev.banking_data, account: value }
                                    }));
                                  }}
                                  placeholder="12345678"
                                  maxLength={8}
                                  className={`flex-1 rounded-xl ${validateBankData('', '', formData.banking_data.account).accountValid || !formData.banking_data.account ? 'border-gray-200' : 'border-red-300'}`}
                                />
                                <Input
                                  value={formData.banking_data.account_digit}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, '').slice(0, 1);
                                    setFormData(prev => ({
                                      ...prev,
                                      banking_data: { ...prev.banking_data, account_digit: value }
                                    }));
                                  }}
                                  placeholder="0"
                                  maxLength={1}
                                  className="w-12 rounded-xl border-gray-200 text-center"
                                />
                              </div>
                            </div>
                          </div>

                          {/* PIX Key */}
                          <div>
                            <Label htmlFor="pix_key">Chave PIX</Label>
                            <div className="flex gap-2">
                              <div className="w-32">
                                <Select
                                  value={formData.banking_data?.pix_key_type || 'cpf'}
                                  onValueChange={(value) => {
                                    setFormData(prev => ({
                                      ...prev,
                                      banking_data: { 
                                        ...prev.banking_data, 
                                        pix_key_type: value, 
                                        pix_key: '' // Clear PIX key when type changes
                                      }
                                    }));
                                  }}
                                >
                                  <SelectTrigger className="rounded-xl border-gray-200">
                                    <SelectValue>
                                      {pixKeyTypes.find(type => type.value === (formData.banking_data?.pix_key_type || 'cpf'))?.label || 'CPF'}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent className="rounded-xl z-[100001]">
                                    {pixKeyTypes.map(type => (
                                      <SelectItem key={type.value} value={type.value}>
                                        {type.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <Input
                                id="pix_key"
                                value={formData.banking_data?.pix_key || ''}
                                onChange={(e) => {
                                  const pixType = formData.banking_data?.pix_key_type || 'cpf';
                                  const formatted = formatPixKey(pixType, e.target.value);
                                  setFormData(prev => ({
                                    ...prev,
                                    banking_data: { 
                                      ...prev.banking_data, 
                                      pix_key: formatted 
                                    }
                                  }));
                                }}
                                placeholder={
                                  (formData.banking_data?.pix_key_type === 'cpf' || !formData.banking_data?.pix_key_type) ? '000.000.000-00' :
                                  formData.banking_data?.pix_key_type === 'cnpj' ? '00.000.000/0000-00' :
                                  formData.banking_data?.pix_key_type === 'email' ? 'email@exemplo.com' :
                                  formData.banking_data?.pix_key_type === 'phone' ? '(11) 99999-9999' :
                                  'Chave aleatória de 32 caracteres'
                                }
                                className={`flex-1 rounded-xl ${
                                  validatePixKey(
                                    formData.banking_data?.pix_key_type || 'cpf', 
                                    formData.banking_data?.pix_key || ''
                                  ) ? 'border-gray-200' : 'border-red-300'
                                }`}
                              />
                            </div>
                            {formData.banking_data?.pix_key && !validatePixKey(formData.banking_data?.pix_key_type || 'cpf', formData.banking_data?.pix_key) && (
                              <p className="text-sm text-red-600 mt-1">
                                {(formData.banking_data?.pix_key_type === 'cpf' || !formData.banking_data?.pix_key_type) && 'CPF deve ter 11 dígitos'}
                                {formData.banking_data?.pix_key_type === 'cnpj' && 'CNPJ deve ter 14 dígitos'}
                                {formData.banking_data?.pix_key_type === 'email' && 'Digite um e-mail válido'}
                                {formData.banking_data?.pix_key_type === 'phone' && 'Digite um telefone válido'}
                                {formData.banking_data?.pix_key_type === 'random' && 'Chave deve ter pelo menos 32 caracteres'}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Notas */}
                      <div>
                        <Label htmlFor="notes">Notas Adicionais</Label>
                        <Textarea
                          id="notes"
                          value={formData.notes}
                          onChange={(e) => handleInputChange('notes', e.target.value)}
                          placeholder="Adicione observações sobre este contato..."
                          className="rounded-xl border-gray-200 h-24"
                        />
                      </div>
                    </div>
                  </form>
                )}
              </div>

              {/* Footer - Fixed */}
              <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-white flex-shrink-0">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleClose}
                  className="rounded-xl"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={!formData.first_name || !formData.email}
                  className="bg-blue-600 hover:bg-blue-700 rounded-xl"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {contact ? 'Atualizar' : 'Salvar'} Contato
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}