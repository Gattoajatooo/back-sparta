
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  X,
  Save,
  Settings,
  Zap,
  Loader2,
  PlusCircle,
  Trash2,
  Search
} from "lucide-react";
import { getContactFilterOptions } from "@/functions/getContactFilterOptions";
import { lookupAddressByCep } from "@/functions/lookupAddressByCep";

// Função simples para gerar IDs únicos (substitui uuid)
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Estrutura de opções para as regras
const ruleOptions = {
  cadastro: [
    { id: 'email_type', name: 'Tipo de E-mail', operators: [{id: 'equals', name: 'é'}], values: [{id: 'corporate', name: 'Corporativo'}, {id: 'personal', name: 'Pessoal'}] },
    { id: 'multiple_contacts', name: 'Múltiplos Contatos', operators: [{id: 'is_true', name: 'Possui'}, {id: 'is_false', name: 'Não possui'}], values: null },
    { id: 'profile_completeness', name: 'Endereço Completo', operators: [{id: 'is_true', name: 'Possui'}, {id: 'is_false', name: 'Não possui'}], values: null },
  ],
  cliente: [
    { id: 'position', name: 'Cargo', operators: [{id: 'contains', name: 'Contém'}, {id: 'not_contains', name: 'Não contém'}], values: 'dynamic_position' },
    { id: 'company_name', name: 'Empresa Associada', operators: [{id: 'is_filled', name: 'Possui'}, {id: 'is_not_filled', name: 'Não possui'}], values: null },
    { id: 'value', name: 'Valor do Contato', operators: [{id: 'greater_than', name: '> (Maior que)'}, {id: 'less_than', name: '< (Menor que)'}, {id: 'equals', name: '= (Igual a)'}], values: 'number' },
  ],
  status: [
    { id: 'status', name: 'Status do Contato', operators: [{id: 'equals', name: 'é'}, {id: 'not_equals', name: 'não é'}], values: 'dynamic_status' },
    { id: 'source', name: 'Origem do Contato', operators: [{id: 'equals', name: 'é'}, {id: 'not_equals', name: 'não é'}], values: 'dynamic_source' },
    { id: 'has_tag', name: 'Possui o Marcador', operators: [{id: 'equals', name: 'Contém'}, {id: 'not_equals', name: 'Não contém'}], values: 'dynamic_tags' },
  ],
  tempo: [
    { id: 'birth_date', name: 'Aniversário', operators: [{id: 'is_today', name: 'é hoje'}, {id: 'is_this_week', name: 'é nesta semana'}, {id: 'is_this_month', name: 'é neste mês'}], values: null },
    { id: 'last_contact_date', name: 'Última Interação há mais de (dias)', operators: [{id: 'days_ago_greater_than', name: 'que'}], values: 'number' },
    { id: 'created_date', name: 'Tempo de Cadastro há mais de (dias)', operators: [{id: 'days_ago_greater_than', name: 'que'}], values: 'number' },
  ],
  endereco: [
    { id: 'address_city', name: 'Cidade', operators: [{id: 'equals', name: 'é'}, {id: 'not_equals', name: 'não é'}], values: 'address_lookup' },
    { id: 'address_state', name: 'Estado (UF)', operators: [{id: 'equals', name: 'é'}, {id: 'not_equals', name: 'não é'}], values: 'address_lookup' },
    { id: 'address_neighborhood', name: 'Bairro', operators: [{id: 'equals', name: 'é'}, {id: 'not_equals', name: 'não é'}], values: 'address_lookup' },
    { id: 'cep_format', name: 'Formato do CEP', operators: [{id: 'is_valid', name: 'é válido'}, {id: 'is_invalid', name: 'é inválido'}], values: null },
  ],
  observacoes: [
    { id: 'notes_keywords', name: 'Palavras-chave nas Observações', operators: [{id: 'contains', name: 'Contém'}, {id: 'not_contains', name: 'Não contém'}], values: 'text' },
    { id: 'has_notes', name: 'Possui Observações', operators: [{id: 'is_true', name: 'Sim'}, {id: 'is_false', name: 'Não'}], values: null },
  ]
};

const RuleBuilder = ({ conditions, setConditions }) => {
  const [dynamicOptions, setDynamicOptions] = useState({});
  const [isLoadingOptions, setIsLoadingOptions] = useState({});
  const [isLoadingCep, setIsLoadingCep] = useState({});

  const handleAddCondition = () => {
    setConditions([
      ...conditions,
      { id: generateId(), category: '', field: '', operator: '', value: '' }
    ]);
  };

  const handleRemoveCondition = (id) => {
    setConditions(conditions.filter(c => c.id !== id));
  };

  const handleConditionChange = async (id, part, value) => {
    setConditions(conditions.map(c => {
      if (c.id === id) {
        const updatedCondition = { ...c, [part]: value };
        if (part === 'category') {
          updatedCondition.field = '';
          updatedCondition.operator = '';
          updatedCondition.value = '';
          updatedCondition.addressData = null; // Clear address data when category changes
        }
        if (part === 'field') {
          updatedCondition.operator = '';
          updatedCondition.value = '';
          
          // Se mudou o campo de endereço e já tem dados do CEP, atualizar automaticamente
          if (updatedCondition.category === 'endereco' && updatedCondition.addressData) {
            const fieldKey = value.replace('address_', '');
            const fieldMapping = {
              'city': updatedCondition.addressData.city,
              'state': updatedCondition.addressData.state,
              'neighborhood': updatedCondition.addressData.neighborhood,
              'street': updatedCondition.addressData.street
            };

            if (fieldMapping[fieldKey]) {
              updatedCondition.value = fieldMapping[fieldKey];
            }
          }
          
          // Carregar opções dinâmicas quando o campo for selecionado
          const category = updatedCondition.category;
          const field = value;
          loadDynamicOptions(category, field);
        }
        return updatedCondition;
      }
      return c;
    }));
  };

  const loadDynamicOptions = async (category, field) => {
    const fieldConfig = ruleOptions[category]?.find(f => f.id === field);
    if (!fieldConfig) return;

    const valueType = fieldConfig.values;
    if (typeof valueType === 'string' && valueType.startsWith('dynamic_')) {
      const optionKey = `${category}_${field}`;
      setIsLoadingOptions(prev => ({ ...prev, [optionKey]: true }));

      try {
        let apiField = field;
        if (valueType === 'dynamic_position') apiField = 'position';
        else if (valueType === 'dynamic_status') apiField = 'status';
        else if (valueType === 'dynamic_source') apiField = 'source';
        else if (valueType === 'dynamic_tags') apiField = 'tags';

        const response = await getContactFilterOptions({ field: apiField });
        if (response.success) {
          setDynamicOptions(prev => ({
            ...prev,
            [optionKey]: response.options
          }));
        }
      } catch (error) {
        console.error('Erro ao carregar opções dinâmicas:', error);
      } finally {
        setIsLoadingOptions(prev => ({ ...prev, [optionKey]: false }));
      }
    }
  };

  const handleCepLookup = async (conditionId, cep) => {
    if (!cep || cep.length !== 8) return;
    
    setIsLoadingCep(prev => ({ ...prev, [conditionId]: true }));
    
    try {
      const response = await lookupAddressByCep({ cep });
      if (response.success) {
        const addressData = response.data;
        
        // Atualizar a condição atual com dados do CEP
        setConditions(conditions.map(c => {
          if (c.id === conditionId) {
            const updatedCondition = {
              ...c,
              addressData: {
                city: addressData.localidade,
                state: addressData.uf,
                neighborhood: addressData.bairro,
                street: addressData.logradouro
              }
            };
            
            // Se já tem um campo de endereço selecionado, atualizar o valor automaticamente
            if (c.field && c.category === 'endereco') {
              const fieldKey = c.field.replace('address_', '');
              const fieldMapping = {
                'city': addressData.localidade,
                'state': addressData.uf,
                'neighborhood': addressData.bairro,
                'street': addressData.logradouro
              };
              
              if (fieldMapping[fieldKey]) {
                updatedCondition.value = fieldMapping[fieldKey];
              }
            }
            
            return updatedCondition;
          }
          return c;
        }));
      } else {
        console.warn('CEP lookup failed:', response.message);
        // Optionally clear addressData or show an error to the user
        setConditions(conditions.map(c => 
          c.id === conditionId ? { ...c, addressData: null, value: '' } : c
        ));
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      setConditions(conditions.map(c => 
        c.id === conditionId ? { ...c, addressData: null, value: '' } : c
      ));
    } finally {
      setIsLoadingCep(prev => ({ ...prev, [conditionId]: false }));
    }
  };

  const getFieldOptions = (category) => {
    return ruleOptions[category] || [];
  };

  const getOperatorOptions = (category, field) => {
    const fields = ruleOptions[category] || [];
    const selectedField = fields.find(f => f.id === field);
    return selectedField?.operators || [];
  };

  const getValueOptions = (category, field) => {
    const fields = ruleOptions[category] || [];
    const selectedField = fields.find(f => f.id === field);
    return selectedField?.values || null;
  };

  const renderValueField = (condition) => {
    const valueOptions = getValueOptions(condition.category, condition.field);
    if (valueOptions === null) return null; // Campo não precisa de valor (ex: is_true)

    // Para campos de endereço com lookup
    if (valueOptions === 'address_lookup') {
      const isLoadingThisCep = isLoadingCep[condition.id];
      
      return (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Digite o CEP (opcional)"
              className="rounded-xl border-gray-200"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  const cep = e.currentTarget.value.replace(/\D/g, '');
                  if (cep.length === 8) {
                    handleCepLookup(condition.id, cep);
                  }
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="rounded-xl"
              title="Buscar por CEP"
              disabled={isLoadingThisCep}
              onClick={(e) => {
                const input = e.currentTarget.closest('.flex').querySelector('input');
                const cep = input.value.replace(/\D/g, '');
                if (cep.length === 8) {
                  handleCepLookup(condition.id, cep);
                }
              }}
            >
              {isLoadingThisCep ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>
          
          {condition.addressData && (
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleConditionChange(condition.id, 'value', condition.addressData.city)}
                className="rounded-lg text-left justify-start"
              >
                🏙️ {condition.addressData.city}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleConditionChange(condition.id, 'value', condition.addressData.state)}
                className="rounded-lg text-left justify-start"
              >
                🗺️ {condition.addressData.state}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleConditionChange(condition.id, 'value', condition.addressData.neighborhood)}
                className="rounded-lg text-left justify-start"
              >
                🏘️ {condition.addressData.neighborhood}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleConditionChange(condition.id, 'value', condition.addressData.street)}
                className="rounded-lg text-left justify-start"
              >
                🛣️ {condition.addressData.street}
              </Button>
            </div>
          )}
          
          <Input
            type="text"
            value={condition.value || ''}
            onChange={(e) => handleConditionChange(condition.id, 'value', e.target.value)}
            disabled={!condition.operator}
            placeholder="Ou digite o valor manualmente"
            className="rounded-xl border-gray-200"
          />
        </div>
      );
    }

    // Para campos dinâmicos (cargo, status, origem, tags)
    if (typeof valueOptions === 'string' && valueOptions.startsWith('dynamic_')) {
      const optionKey = `${condition.category}_${condition.field}`;
      const options = dynamicOptions[optionKey] || [];
      const isLoading = isLoadingOptions[optionKey];

      return (
        <Select
          value={condition.value}
          onValueChange={(val) => handleConditionChange(condition.id, 'value', val)}
          disabled={!condition.operator || isLoading}
        >
          <SelectTrigger className="rounded-xl border-gray-200">
            <SelectValue placeholder={isLoading ? "Carregando..." : "Selecione uma opção"} />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {options.map((option, index) => {
              // AJUSTE: Tratar corretamente as opções que vêm como string simples ou objeto
              const optionValue = typeof option === 'object' ? option.value : option;
              const optionLabel = typeof option === 'object' ? option.label : option;
              
              return (
                <SelectItem key={`${optionValue}-${index}`} value={optionValue}>
                  {optionLabel}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      );
    }

    // Para arrays estáticos
    if (Array.isArray(valueOptions)) {
      return (
        <Select
          value={condition.value}
          onValueChange={(val) => handleConditionChange(condition.id, 'value', val)}
          disabled={!condition.operator}
        >
          <SelectTrigger className="rounded-xl border-gray-200">
            <SelectValue placeholder="Valor" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {valueOptions.map(opt => (
              <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    // Para campos de texto/número
    return (
      <Input
        type={valueOptions}
        value={condition.value || ''}
        onChange={(e) => handleConditionChange(condition.id, 'value', e.target.value)}
        disabled={!condition.operator}
        placeholder="Digite o valor"
        className="rounded-xl border-gray-200"
      />
    );
  };

  return (
    <div className="space-y-4">
      {conditions.map((condition, index) => (
        <div key={condition.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-gray-700">Condição {index + 1}</Label>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => handleRemoveCondition(condition.id)}
              className="h-7 w-7 text-gray-400 hover:text-red-500 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Categoria */}
            <Select
              value={condition.category}
              onValueChange={(val) => handleConditionChange(condition.id, 'category', val)}
            >
              <SelectTrigger className="rounded-xl border-gray-200">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {Object.keys(ruleOptions).map(key => (
                  <SelectItem key={key} value={key} className="capitalize">
                    {key.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Campo */}
            <Select
              value={condition.field}
              onValueChange={(val) => handleConditionChange(condition.id, 'field', val)}
              disabled={!condition.category}
            >
              <SelectTrigger className="rounded-xl border-gray-200">
                <SelectValue placeholder="Campo" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {getFieldOptions(condition.category).map(opt => (
                  <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Operador */}
            <Select
              value={condition.operator}
              onValueChange={(val) => handleConditionChange(condition.id, 'operator', val)}
              disabled={!condition.field}
            >
              <SelectTrigger className="rounded-xl border-gray-200">
                <SelectValue placeholder="Condição" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {getOperatorOptions(condition.category, condition.field).map(opt => (
                  <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Valor */}
            <div>
              {renderValueField(condition)}
            </div>
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={handleAddCondition}
        className="w-full rounded-xl border-dashed"
      >
        <PlusCircle className="w-4 h-4 mr-2" />
        Adicionar Condição
      </Button>
    </div>
  );
};

function SmartTagRulesModal({ open, onClose, tag, onSave }) {
  const [autoApply, setAutoApply] = useState(false);
  const [conditions, setConditions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    if (open && tag) {
      setAutoApply(tag.smart_rules?.auto_apply || false);
      // Ensure conditions have unique IDs for React keys
      const conditionsWithIds = (tag.smart_rules?.conditions || []).map(c => ({
        ...c, 
        id: c.id || generateId()
      }));
      setConditions(conditionsWithIds);
    }
    
    if (open) {
      setIsLoading(false);
    }
  }, [open, tag]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const finalFormData = { 
      ...tag, 
      smart_rules: {
        auto_apply: autoApply,
        // Remove temporary ID and addressData before saving
        conditions: conditions.map(({ id, addressData, ...rest }) => rest)
      }
    };

    try {
      await onSave(finalFormData);
    } finally {
      setIsLoading(false);
    }
  };

  if (!open || !tag) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[700px] max-w-[95vw] bg-white shadow-xl border-0 overflow-hidden p-0 [&>button]:hidden"
        style={{ 
          maxHeight: '85vh',
          borderRadius: '2rem'
        }}
      >
        {/* Header - Fixed */}
        <div 
          className="relative flex-shrink-0 bg-gradient-to-br from-blue-600 to-blue-700"
          style={{ 
            height: '80px',
            borderTopLeftRadius: '2rem',
            borderTopRightRadius: '2rem'
          }}
        >
          <div className="absolute left-8 top-1/2 transform -translate-y-1/2 flex items-center gap-3">
            <div className="w-10 h-10 bg-white/30 rounded-2xl flex items-center justify-center">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-semibold text-white">
              Configurar Regras Inteligentes
            </span>
          </div>
          
          <button
            onClick={onClose}
            disabled={isLoading}
            className="absolute right-8 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-colors duration-200 disabled:opacity-50"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div 
          className="flex-1 overflow-y-auto"
          style={{ 
            maxHeight: 'calc(85vh - 80px - 100px)',
            minHeight: '300px'
          }}
        >
          <div className="p-8">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="ml-2 text-blue-600">Carregando...</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Informações do Marcador */}
                <Card className="rounded-2xl border-blue-200 bg-blue-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-blue-600" />
                      {tag.name}
                      <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                        Inteligente
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {tag.description && (
                      <p className="text-sm text-blue-800">{tag.description}</p>
                    )}
                  </CardContent>
                </Card>

                {/* Configurações */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Configurações de Aplicação</h3>
                  
                  <div className="flex items-center space-x-2 mb-4">
                    <Checkbox
                      id="auto_apply"
                      checked={autoApply}
                      onCheckedChange={setAutoApply}
                      className="border-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                    />
                    <Label htmlFor="auto_apply" className="text-sm">
                      Aplicar este marcador automaticamente quando as condições abaixo forem atendidas.
                    </Label>
                  </div>
                </div>

                {/* Construtor de Regras */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Condições</h3>
                  <p className="text-sm text-gray-500 mb-4">O marcador será aplicado se TODAS as condições forem verdadeiras.</p>
                  <RuleBuilder conditions={conditions} setConditions={setConditions} />
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Footer - Fixed */}
        <div 
          className="flex-shrink-0 flex justify-between items-center bg-gray-50 px-8 border-t border-gray-200"
          style={{ 
            height: '100px',
            borderBottomLeftRadius: '2rem',
            borderBottomRightRadius: '2rem'
          }}
        >
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose}
            disabled={isLoading}
            className="rounded-xl"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 rounded-xl"
          >
            <Save className="w-4 h-4 mr-2" />
            Salvar Configurações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SmartTagRulesModal;
