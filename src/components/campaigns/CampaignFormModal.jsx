import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Megaphone,
  X,
  Save,
  Plus,
  Users,
  Settings,
  Target,
  Filter,
  Search,
  Trash2,
  Loader2
} from "lucide-react";

import { getContactFilterOptions } from "@/functions/getContactFilterOptions";
import { getFilteredContacts } from "@/functions/getFilteredContacts";

export default function CampaignFormModal({ open, onClose, campaign, onSubmit, contacts }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "promotional",
    color: "bg-purple-500",
    status: "draft",
    target_audience: {
      customer_ids: [],
      tags: [],
      filters: {}
    }
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Contact filtering states
  const [contactFilters, setContactFilters] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [contactSearchTerm, setContactSearchTerm] = useState("");
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState({});

  // Available filter fields with enhanced options
  const filterFields = [
    { id: 'first_name', label: 'Nome', type: 'text' },
    { id: 'last_name', label: 'Sobrenome', type: 'text' },
    { id: 'email', label: 'Email', type: 'text' },
    { id: 'phone', label: 'Telefone', type: 'text' },
    { id: 'company_name', label: 'Empresa', type: 'dynamic_select', apiField: 'company_name' },
    { id: 'position', label: 'Posição', type: 'dynamic_select', apiField: 'position' },
    { id: 'status', label: 'Status', type: 'dynamic_select', apiField: 'status' },
    { id: 'source', label: 'Origem', type: 'dynamic_select', apiField: 'source' },
    { id: 'birth_date', label: 'Data de Nascimento', type: 'birth_date' },
    { id: 'value', label: 'Valor Estimado', type: 'value_range' },
    { id: 'tags', label: 'Marcadores', type: 'dynamic_select', apiField: 'tags' },
    { id: 'created_date', label: 'Data de Criação', type: 'created_date' },
    { id: 'import_name', label: 'Nome da Importação', type: 'dynamic_select', apiField: 'import_name' },
    { id: 'import_type', label: 'Tipo de Importação', type: 'dynamic_select', apiField: 'import_type' }
  ];

  // Dynamic options cache
  const [dynamicOptions, setDynamicOptions] = useState({});

  useEffect(() => {
    if (open && campaign) {
      setFormData({
        name: campaign.name || "",
        description: campaign.description || "",
        type: campaign.type || "promotional",
        color: campaign.color || "bg-purple-500",
        status: campaign.status || "draft",
        target_audience: campaign.target_audience || {
          customer_ids: [],
          tags: [],
          filters: {}
        }
      });
      setSelectedContacts(campaign.target_audience?.customer_ids || []);
    } else if (open && !campaign) {
      // Reset form for new campaign
      setFormData({
        name: "",
        description: "",
        type: "promotional",
        color: "bg-purple-500",
        status: "draft",
        target_audience: {
          customer_ids: [],
          tags: [],
          filters: {}
        }
      });
      setSelectedContacts([]);
    }
    
    if (open) {
      setErrors({});
      setIsSubmitting(false);
      setContactFilters([]);
      setFilteredContacts([]);
      setContactSearchTerm("");
      setDynamicOptions({});
      loadInitialContacts();
    }
  }, [open, campaign]);

  // Load initial contacts (limited)
  const loadInitialContacts = async () => {
    setIsLoadingContacts(true);
    try {
      const response = await getFilteredContacts({
        filters: [{ field: 'deleted', operator: 'not_equals', value: 'true' }],
        searchTerm: "",
        limit: 50
      });
      
      if (response.data.success) {
        setFilteredContacts(response.data.contacts);
      }
    } catch (error) {
      console.error("Error loading initial contacts:", error);
    } finally {
      setIsLoadingContacts(false);
    }
  };

  // Apply filters to contacts
  const applyFilters = async () => {
    setIsLoadingContacts(true);
    try {
      const activeFilters = contactFilters.filter(f => f.field && f.operator && f.value);
      
      // Adiciona filtro para excluir contatos deletados
      const filtersWithDeleted = [
        ...activeFilters,
        { field: 'deleted', operator: 'not_equals', value: 'true' }
      ];
      
      const response = await getFilteredContacts({
        filters: filtersWithDeleted,
        searchTerm: contactSearchTerm,
        limit: 100
      });
      
      if (response.data.success) {
        setFilteredContacts(response.data.contacts);
      }
    } catch (error) {
      console.error("Error applying filters:", error);
    } finally {
      setIsLoadingContacts(false);
    }
  };

  // Debounced filter application
  useEffect(() => {
    const timer = setTimeout(() => {
      applyFilters();
    }, 300);

    return () => clearTimeout(timer);
  }, [contactFilters, contactSearchTerm]);

  const addFilter = () => {
    setContactFilters(prev => [...prev, {
      id: Date.now(),
      field: '',
      type: 'text',
      operator: 'contains',
      value: ''
    }]);
  };

  const updateFilter = (filterId, updates) => {
    setContactFilters(prev => prev.map(filter => 
      filter.id === filterId ? { ...filter, ...updates } : filter
    ));
  };

  const removeFilter = (filterId) => {
    setContactFilters(prev => prev.filter(filter => filter.id !== filterId));
  };

  const handleFieldChange = async (filterId, field) => {
    const fieldConfig = filterFields.find(f => f.id === field);
    
    let operator = 'contains';
    if (fieldConfig?.type === 'birth_date') operator = 'birth_year';
    if (fieldConfig?.type === 'created_date') operator = 'created_year';
    if (fieldConfig?.type === 'value_range') operator = 'value_range';
    if (fieldConfig?.type === 'dynamic_select') operator = fieldConfig.apiField === 'tags' ? 'has_tag' : 'equals';
    
    updateFilter(filterId, {
      field,
      type: fieldConfig?.type || 'text',
      operator,
      value: ''
    });

    // Load dynamic options if needed
    if (fieldConfig?.type === 'dynamic_select' && fieldConfig.apiField) {
      await loadDynamicOptions(fieldConfig.apiField);
    }
  };

  const loadDynamicOptions = async (apiField) => {
    if (dynamicOptions[apiField]) return; // Already loaded

    setIsLoadingOptions(prev => ({ ...prev, [apiField]: true }));
    
    try {
      const response = await getContactFilterOptions({ field: apiField });
      
      if (response.data.success) {
        setDynamicOptions(prev => ({
          ...prev,
          [apiField]: response.data.options
        }));
      }
    } catch (error) {
      console.error(`Error loading options for ${apiField}:`, error);
    } finally {
      setIsLoadingOptions(prev => ({ ...prev, [apiField]: false }));
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleContactToggle = (contactId) => {
    setSelectedContacts(prev => {
      const newSelected = prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId];
      
      setFormData(prevForm => ({
        ...prevForm,
        target_audience: {
          ...prevForm.target_audience,
          customer_ids: newSelected
        }
      }));
      
      return newSelected;
    });
  };

  const selectAllFiltered = () => {
    const allFilteredIds = filteredContacts.map(c => c.id);
    setSelectedContacts(allFilteredIds);
    setFormData(prev => ({
      ...prev,
      target_audience: {
        ...prev.target_audience,
        customer_ids: allFilteredIds
      }
    }));
  };

  const clearAllSelected = () => {
    setSelectedContacts([]);
    setFormData(prev => ({
      ...prev,
      target_audience: {
        ...prev.target_audience,
        customer_ids: []
      }
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = "Nome da campanha é obrigatório";
    }
    
    if (!formData.type) {
      newErrors.type = "Tipo da campanha é obrigatório";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      const submitData = {
        ...formData,
        count_contacts: selectedContacts.length
      };
      
      await onSubmit(submitData);
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  const renderFilterValueField = (filter) => {
    const fieldConfig = filterFields.find(f => f.id === filter.field);
    
    if (fieldConfig?.type === 'dynamic_select') {
      const options = dynamicOptions[fieldConfig.apiField] || [];
      const isLoading = isLoadingOptions[fieldConfig.apiField];
      
      return (
        <Select
          value={filter.value}
          onValueChange={(value) => updateFilter(filter.id, { value })}
          disabled={isLoading}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={isLoading ? "Carregando..." : "Selecione"} />
          </SelectTrigger>
          <SelectContent>
            {isLoading ? (
              <SelectItem value="loading" disabled>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Carregando...
              </SelectItem>
            ) : (
              options.map((option) => (
                <SelectItem key={option.value || option} value={option.value || option}>
                  {option.label || option}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      );
    }
    
    if (fieldConfig?.type === 'birth_date') {
      if (filter.operator === 'birth_year') {
        return (
          <Select
            value={filter.value}
            onValueChange={(value) => updateFilter(filter.id, { value })}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Selecione o ano" />
            </SelectTrigger>
            <SelectContent>
              {dynamicOptions['birth_date_years']?.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
      
      if (filter.operator === 'birth_month') {
        return (
          <Select
            value={filter.value}
            onValueChange={(value) => updateFilter(filter.id, { value })}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Selecione o mês" />
            </SelectTrigger>
            <SelectContent>
              {dynamicOptions['birth_date_months']?.map((month) => (
                <SelectItem key={month.value} value={month.value.toString()}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
    }
    
    if (fieldConfig?.type === 'value_range') {
      return (
        <Select
          value={filter.value}
          onValueChange={(value) => updateFilter(filter.id, { value })}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Selecione a faixa" />
          </SelectTrigger>
          <SelectContent>
            {dynamicOptions['value_ranges']?.map((range) => (
              <SelectItem key={`${range.min}-${range.max}`} value={`${range.min}-${range.max}`}>
                {range.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    
    // Default text input
    return (
      <Input
        type={fieldConfig?.type === 'number' ? 'number' : fieldConfig?.type === 'date' ? 'date' : 'text'}
        value={filter.value}
        onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
        placeholder="Valor"
        className="flex-1"
      />
    );
  };

  const renderOperatorSelect = (filter) => {
    const fieldConfig = filterFields.find(f => f.id === filter.field);
    
    let operators = [];
    
    if (fieldConfig?.type === 'birth_date') {
      operators = [
        { value: 'birth_year', label: 'Nasceu no ano' },
        { value: 'birth_month', label: 'Nasceu no mês' },
        { value: 'birth_day_month', label: 'Aniversário em (dia/mês)' }
      ];
    } else if (fieldConfig?.type === 'created_date') {
      operators = [
        { value: 'created_year', label: 'Criado no ano' }
      ];
    } else if (fieldConfig?.type === 'value_range') {
      operators = [
        { value: 'value_range', label: 'Na faixa' }
      ];
    } else if (fieldConfig?.apiField === 'tags') {
      operators = [
        { value: 'has_tag', label: 'Contém marcador' }
      ];
    } else if (fieldConfig?.type === 'dynamic_select') {
      operators = [
        { value: 'equals', label: 'Igual a' },
        { value: 'not_equals', label: 'Diferente de' }
      ];
    } else {
      operators = [
        { value: 'contains', label: 'Contém' },
        { value: 'not_contains', label: 'Não contém' },
        { value: 'equals', label: 'Igual a' },
        { value: 'not_equals', label: 'Diferente de' },
        { value: 'starts_with', label: 'Começa com' },
        { value: 'ends_with', label: 'Termina com' },
        { value: 'is_empty', label: 'Está vazio' },
        { value: 'not_empty', label: 'Não está vazio' }
      ];
    }

    return (
      <Select
        value={filter.operator}
        onValueChange={(value) => updateFilter(filter.id, { operator: value })}
      >
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {operators.map((op) => (
            <SelectItem key={op.value} value={op.value}>
              {op.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  if (!open) return null;

  return (
    <>
      <style jsx global>{`
        /* Custom checkbox styles with purple theme */
        .checkbox-purple [data-state="checked"] {
          background-color: #8b5cf6 !important;
          border-color: #8b5cf6 !important;
          border-radius: 4px !important;
        }
        
        .checkbox-purple [data-state="unchecked"] {
          border-color: #8b5cf6 !important;
          border-radius: 4px !important;
          border-width: 2px !important;
        }
        
        .checkbox-purple [data-state="checked"] svg {
          color: white !important;
        }
      `}</style>
      
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent 
          className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[900px] max-w-[95vw] bg-white shadow-xl border-0 overflow-hidden p-0 [&>button]:hidden"
          style={{ 
            maxHeight: '90vh',
            borderRadius: '2rem'
          }}
        >
          {/* Header - Fixed */}
          <div 
            className="relative flex-shrink-0 bg-gradient-to-br from-purple-600 to-purple-700"
            style={{ 
              height: '80px',
              borderTopLeftRadius: '2rem',
              borderTopRightRadius: '2rem'
            }}
          >
            <div className="absolute left-8 top-1/2 transform -translate-y-1/2 flex items-center gap-3">
              <div className="w-10 h-10 bg-white/30 rounded-2xl flex items-center justify-center">
                <Megaphone className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-semibold text-white">
                {campaign ? 'Editar Público-alvo' : 'Novo Público-alvo'}
              </span>
            </div>
            
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="absolute right-8 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors duration-200 disabled:opacity-50"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Content - Scrollable */}
          <div 
            className="overflow-y-auto"
            style={{ 
              maxHeight: 'calc(90vh - 200px)'
            }}
          >
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Informações Básicas */}
                <Card className="rounded-3xl border-gray-200">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Settings className="w-5 h-5 text-purple-600" />
                      Informações Básicas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="name" className="text-sm font-medium">
                        Nome da Campanha *
                      </Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="rounded-xl border-gray-200 mt-1"
                        placeholder="Digite o nome da campanha"
                      />
                      {errors.name && (
                        <p className="text-sm text-red-600 mt-1">{errors.name}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="description" className="text-sm font-medium">
                        Descrição
                      </Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        className="rounded-xl border-gray-200 mt-1 min-h-[80px]"
                        placeholder="Descreva o objetivo desta campanha..."
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="type" className="text-sm font-medium">
                          Tipo *
                        </Label>
                        <Select
                          value={formData.type}
                          onValueChange={(value) => handleInputChange('type', value)}
                        >
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
                        {errors.type && (
                          <p className="text-sm text-red-600 mt-1">{errors.type}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="color" className="text-sm font-medium">
                          Cor
                        </Label>
                        <Select
                          value={formData.color}
                          onValueChange={(value) => handleInputChange('color', value)}
                        >
                          <SelectTrigger className="rounded-xl border-gray-200 mt-1">
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

                {/* Público-alvo */}
                <Card className="rounded-3xl border-gray-200">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Target className="w-5 h-5 text-purple-600" />
                      Público-alvo
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Contact Filters */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-sm font-medium">Filtros de Contatos</Label>
                        <Button
                          type="button"
                          onClick={addFilter}
                          variant="outline"
                          size="sm"
                          className="rounded-xl"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Adicionar Filtro
                        </Button>
                      </div>

                      {contactFilters.length > 0 && (
                        <div className="space-y-3 mb-4">
                          {contactFilters.map((filter) => (
                            <div key={filter.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                              <Select
                                value={filter.field}
                                onValueChange={(value) => handleFieldChange(filter.id, value)}
                              >
                                <SelectTrigger className="w-40">
                                  <SelectValue placeholder="Campo" />
                                </SelectTrigger>
                                <SelectContent>
                                  {filterFields.map((field) => (
                                    <SelectItem key={field.id} value={field.id}>
                                      {field.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              {filter.field && renderOperatorSelect(filter)}
                              {filter.field && filter.operator && renderFilterValueField(filter)}

                              <Button
                                type="button"
                                onClick={() => removeFilter(filter.id)}
                                variant="ghost"
                                size="icon"
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Contact Search */}
                      <div className="relative mb-4">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <Input
                          value={contactSearchTerm}
                          onChange={(e) => setContactSearchTerm(e.target.value)}
                          placeholder="Pesquisar contatos..."
                          className="rounded-xl border-gray-200 pl-10"
                        />
                      </div>

                      {/* Contact Selection */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-sm font-medium">
                            Contatos ({selectedContacts.length} de {filteredContacts.length} selecionados)
                          </Label>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              onClick={selectAllFiltered}
                              variant="outline"
                              size="sm"
                              className="rounded-xl text-xs"
                              disabled={isLoadingContacts}
                            >
                              Selecionar Filtrados
                            </Button>
                            <Button
                              type="button"
                              onClick={clearAllSelected}
                              variant="outline"
                              size="sm"
                              className="rounded-xl text-xs"
                            >
                              Limpar Seleção
                            </Button>
                          </div>
                        </div>
                        
                        <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-xl p-3">
                          {isLoadingContacts ? (
                            <div className="flex items-center justify-center py-8">
                              <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                              <span className="ml-2 text-sm text-gray-600">Carregando contatos...</span>
                            </div>
                          ) : (
                            <div className="space-y-2 checkbox-purple">
                              {filteredContacts.map((contact) => (
                                <div key={contact.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`contact-${contact.id}`}
                                    checked={selectedContacts.includes(contact.id)}
                                    onCheckedChange={() => handleContactToggle(contact.id)}
                                  />
                                  <label
                                    htmlFor={`contact-${contact.id}`}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 cursor-pointer"
                                  >
                                    <div>
                                      <span>{contact.first_name} {contact.last_name}</span>
                                      <span className="text-gray-500 ml-2">{contact.email}</span>
                                    </div>
                                    {contact.company_name && (
                                      <div className="text-xs text-gray-400">{contact.company_name}</div>
                                    )}
                                  </label>
                                </div>
                              ))}
                              
                              {filteredContacts.length === 0 && !isLoadingContacts && (
                                <p className="text-sm text-gray-500 text-center py-4">
                                  Nenhum contato encontrado com os filtros aplicados.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </form>
            </div>
          </div>

          {/* Footer - Fixed with increased height */}
          <div 
            className="relative flex-shrink-0 bg-white border-t border-gray-200"
            style={{ height: '120px' }}
          >
            <div className="h-full flex justify-between items-center px-8">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
                className="rounded-xl"
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="rounded-xl text-white bg-purple-600 hover:bg-purple-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {campaign ? 'Atualizar Campanha' : 'Criar Campanha'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}