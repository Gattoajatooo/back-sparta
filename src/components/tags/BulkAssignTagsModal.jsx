import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Tag as TagIcon,
  Users,
  Plus,
  X,
  Filter,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Search
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Opções de filtro similares às campanhas
const FILTER_FIELDS = [
  { value: 'has_tag', label: 'Possui Marcador' },
  { value: 'status', label: 'Status' },
  { value: 'source', label: 'Origem' },
  { value: 'birth_date', label: 'Aniversário' },
];

const OPERATORS = {
  has_tag: [
    { value: 'equals', label: 'É igual a' },
    { value: 'not_equals', label: 'Não é igual a' },
    { value: 'is_true', label: 'Possui qualquer' },
    { value: 'is_false', label: 'Não possui nenhum' },
  ],
  status: [
    { value: 'equals', label: 'É igual a' },
    { value: 'not_equals', label: 'Não é igual a' },
  ],
  source: [
    { value: 'equals', label: 'É igual a' },
    { value: 'not_equals', label: 'Não é igual a' },
  ],
  birth_date: [
    { value: 'is_today', label: 'É hoje' },
    { value: 'is_this_month', label: 'É este mês' },
  ],
};

const STATUS_OPTIONS = [
  { value: 'lead', label: 'Lead' },
  { value: 'prospect', label: 'Prospect' },
  { value: 'customer', label: 'Cliente' },
  { value: 'inactive', label: 'Inativo' },
  { value: 'churned', label: 'Perdido' },
];

const SOURCE_OPTIONS = [
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Indicação' },
  { value: 'social_media', label: 'Redes Sociais' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'import', label: 'Importação' },
  { value: 'manual', label: 'Manual' },
];

export default function BulkAssignTagsModal({ 
  open, 
  onClose, 
  tags = [],
  companyId,
  onSuccess,
  contactIds = [] // NOVO: IDs pré-selecionados
}) {
  const [selectedTags, setSelectedTags] = useState([]);
  const [filters, setFilters] = useState([]);
  const [filterLogic, setFilterLogic] = useState('AND');
  const [isCalculating, setIsCalculating] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [matchedCount, setMatchedCount] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tagSearch, setTagSearch] = useState('');
  const [selectedContacts, setSelectedContacts] = useState([]); // NOVO: Contatos selecionados

  // Filtrar tags pela busca
  const filteredTags = tags.filter(tag => 
    tag.name.toLowerCase().includes(tagSearch.toLowerCase())
  );

  // Reset ao abrir
  useEffect(() => {
    if (open) {
      setSelectedTags([]);
      setError('');
      setSuccess('');
      setTagSearch('');
      
      // NOVO: Se há IDs pré-selecionados, usar modo de seleção direta
      if (contactIds && contactIds.length > 0) {
        setFilters([]);
        setFilterLogic('AND');
        setMatchedCount(contactIds.length);
        loadSelectedContacts();
      } else {
        setFilters([]);
        setFilterLogic('AND');
        setMatchedCount(null);
        setSelectedContacts([]);
      }
    }
  }, [open, contactIds]);

  // NOVO: Carregar contatos selecionados
  const loadSelectedContacts = async () => {
    if (!contactIds || contactIds.length === 0) return;
    
    try {
      const contacts = await Promise.all(
        contactIds.map(id => base44.entities.Contact.get(id))
      );
      setSelectedContacts(contacts);
    } catch (error) {
      console.error('Erro ao carregar contatos selecionados:', error);
    }
  };

  // Adicionar filtro
  const addFilter = () => {
    setFilters([...filters, { field: '', operator: '', value: '' }]);
  };

  // Remover filtro
  const removeFilter = (index) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  // Atualizar filtro
  const updateFilter = (index, key, value) => {
    const newFilters = [...filters];
    newFilters[index][key] = value;
    
    // Reset operator e value ao mudar field
    if (key === 'field') {
      newFilters[index].operator = '';
      newFilters[index].value = '';
    }
    
    // Reset value ao mudar operator
    if (key === 'operator') {
      // Para operadores que não precisam de valor
      if (['is_true', 'is_false', 'is_today', 'is_this_month'].includes(value)) {
        newFilters[index].value = '';
      }
    }
    
    setFilters(newFilters);
  };

  // Toggle seleção de tag
  const toggleTag = (tagId) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  // Calcular contatos que serão afetados
  const calculateMatchedContacts = useCallback(async () => {
    if (filters.length === 0) {
      setMatchedCount(null);
      return;
    }

    // Verificar se todos os filtros estão completos
    const incompleteFilter = filters.find(f => {
      if (!f.field || !f.operator) return true;
      // Operadores que não precisam de valor
      if (['is_true', 'is_false', 'is_today', 'is_this_month'].includes(f.operator)) return false;
      return !f.value;
    });

    if (incompleteFilter) {
      setMatchedCount(null);
      return;
    }

    setIsCalculating(true);
    try {
      const response = await base44.functions.invoke('getFilteredContactsByRules', {
        filters: filters,
        logic: filterLogic,
        simulation_date: new Date().toISOString()
      });

      if (response.data?.success) {
        setMatchedCount(response.data.count);
      } else {
        setMatchedCount(0);
      }
    } catch (error) {
      console.error('Erro ao calcular contatos:', error);
      setMatchedCount(0);
    } finally {
      setIsCalculating(false);
    }
  }, [filters, filterLogic]);

  // Recalcular ao mudar filtros
  useEffect(() => {
    const timer = setTimeout(() => {
      calculateMatchedContacts();
    }, 500);
    return () => clearTimeout(timer);
  }, [calculateMatchedContacts]);

  // Atribuir marcadores
  const handleAssign = async () => {
    if (selectedTags.length === 0) {
      setError('Selecione pelo menos um marcador');
      return;
    }

    // NOVO: Se há contatos pré-selecionados, usar modo direto
    if (contactIds && contactIds.length > 0) {
      setIsAssigning(true);
      setError('');
      setSuccess('');

      try {
        const response = await base44.functions.invoke('bulkAssignTags', {
          tag_ids: selectedTags,
          contact_ids: contactIds,
          company_id: companyId
        });

        if (response.data?.success) {
          setSuccess(`${response.data.updated_count} contato(s) atualizado(s) com sucesso!`);
          setTimeout(() => {
            onSuccess(`${response.data.updated_count} contato(s) atualizado(s) com marcadores`);
            onClose();
          }, 1500);
        } else {
          setError(response.data?.error || 'Erro ao atribuir marcadores');
        }
      } catch (error) {
        console.error('Erro ao atribuir marcadores:', error);
        setError('Erro ao atribuir marcadores: ' + error.message);
      } finally {
        setIsAssigning(false);
      }
      return;
    }

    // Modo com filtros (comportamento original)
    if (filters.length === 0) {
      setError('Adicione pelo menos um filtro');
      return;
    }

    setIsAssigning(true);
    setError('');
    setSuccess('');

    try {
      const response = await base44.functions.invoke('bulkAssignTags', {
        tag_ids: selectedTags,
        filters: filters,
        filter_logic: filterLogic,
        company_id: companyId
      });

      if (response.data?.success) {
        setSuccess(`${response.data.updated_count} contato(s) atualizado(s) com sucesso!`);
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1500);
      } else {
        setError(response.data?.error || 'Erro ao atribuir marcadores');
      }
    } catch (error) {
      console.error('Erro ao atribuir marcadores:', error);
      setError('Erro ao atribuir marcadores: ' + error.message);
    } finally {
      setIsAssigning(false);
    }
  };

  // Renderizar campo de valor baseado no tipo de filtro
  const renderValueField = (filter, index) => {
    // Operadores que não precisam de valor
    if (['is_true', 'is_false', 'is_today', 'is_this_month'].includes(filter.operator)) {
      return null;
    }

    if (filter.field === 'has_tag') {
      return (
        <Select
          value={filter.value}
          onValueChange={(value) => updateFilter(index, 'value', value)}
        >
          <SelectTrigger className="flex-1 rounded-xl">
            <SelectValue placeholder="Selecione o marcador" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {tags.map(tag => (
              <SelectItem key={tag.id} value={tag.name} className="rounded-lg">
                {tag.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (filter.field === 'status') {
      return (
        <Select
          value={filter.value}
          onValueChange={(value) => updateFilter(index, 'value', value)}
        >
          <SelectTrigger className="flex-1 rounded-xl">
            <SelectValue placeholder="Selecione o status" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {STATUS_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value} className="rounded-lg">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (filter.field === 'source') {
      return (
        <Select
          value={filter.value}
          onValueChange={(value) => updateFilter(index, 'value', value)}
        >
          <SelectTrigger className="flex-1 rounded-xl">
            <SelectValue placeholder="Selecione a origem" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {SOURCE_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value} className="rounded-lg">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl rounded-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center">
              <TagIcon className="w-5 h-5 text-white" />
            </div>
            Atribuir Marcadores em Massa
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* Mensagens de erro/sucesso */}
          {error && (
            <Alert className="rounded-2xl border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert className="rounded-2xl border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          {/* Seleção de Marcadores */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <TagIcon className="w-4 h-4" />
                Marcadores a Atribuir
              </h3>
              <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                {selectedTags.length} selecionado(s)
              </Badge>
            </div>

            {/* Busca de tags */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar marcador..."
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                className="pl-10 rounded-xl"
              />
            </div>

            <ScrollArea className="h-32 rounded-xl border p-3">
              <div className="flex flex-wrap gap-2">
                {filteredTags.map(tag => (
                  <Badge
                    key={tag.id}
                    variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                    className={`cursor-pointer transition-all px-3 py-1.5 ${
                      selectedTags.includes(tag.id)
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'hover:bg-gray-100'
                    }`}
                    style={!selectedTags.includes(tag.id) ? {
                      borderColor: tag.color + '60',
                      color: tag.color
                    } : {}}
                    onClick={() => toggleTag(tag.id)}
                  >
                    <TagIcon className="w-3 h-3 mr-1" />
                    {tag.name}
                  </Badge>
                ))}
                {filteredTags.length === 0 && (
                  <p className="text-sm text-gray-500">Nenhum marcador encontrado</p>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* NOVO: Lista de contatos selecionados */}
          {contactIds && contactIds.length > 0 && selectedContacts.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Contatos Selecionados
                </h3>
                <Badge className="bg-green-100 text-green-700 border-green-200">
                  {selectedContacts.length}
                </Badge>
              </div>
              
              <ScrollArea className="h-40 rounded-xl border p-3">
                <div className="space-y-2">
                  {selectedContacts.map(contact => (
                    <div key={contact.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold text-xs flex-shrink-0">
                        {contact.first_name?.[0]}{contact.last_name?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {contact.first_name} {contact.last_name}
                        </p>
                        {contact.phone && (
                          <p className="text-xs text-gray-500 truncate">{contact.phone}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Filtros - Apenas se NÃO há contatos pré-selecionados */}
          {(!contactIds || contactIds.length === 0) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Filtros de Contatos
                </h3>
              
              {filters.length > 1 && (
                <Select value={filterLogic} onValueChange={setFilterLogic}>
                  <SelectTrigger className="w-28 h-8 text-xs rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="AND" className="rounded-lg">E (AND)</SelectItem>
                    <SelectItem value="OR" className="rounded-lg">OU (OR)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              {filters.map((filter, index) => (
                <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                  {/* Campo */}
                  <Select
                    value={filter.field}
                    onValueChange={(value) => updateFilter(index, 'field', value)}
                  >
                    <SelectTrigger className="w-40 rounded-xl">
                      <SelectValue placeholder="Campo" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {FILTER_FIELDS.map(f => (
                        <SelectItem key={f.value} value={f.value} className="rounded-lg">
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Operador */}
                  {filter.field && (
                    <Select
                      value={filter.operator}
                      onValueChange={(value) => updateFilter(index, 'operator', value)}
                    >
                      <SelectTrigger className="w-40 rounded-xl">
                        <SelectValue placeholder="Operador" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {OPERATORS[filter.field]?.map(op => (
                          <SelectItem key={op.value} value={op.value} className="rounded-lg">
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Valor */}
                  {filter.field && filter.operator && renderValueField(filter, index)}

                  {/* Remover */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFilter(index)}
                    className="h-8 w-8 rounded-lg hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}

              <Button
                variant="outline"
                onClick={addFilter}
                className="w-full rounded-xl border-dashed"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Filtro
              </Button>
            </div>

            {/* Preview de contatos */}
            {filters.length > 0 && (
            <div className="p-4 bg-blue-50 rounded-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-900">Contatos que serão afetados:</span>
                </div>
                {isCalculating ? (
                  <div className="flex items-center gap-2 text-blue-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Calculando...</span>
                  </div>
                ) : matchedCount !== null ? (
                  <Badge className="bg-blue-600 text-white text-lg px-3 py-1">
                    {matchedCount}
                  </Badge>
                ) : (
                  <span className="text-sm text-blue-600">Complete os filtros</span>
                )}
              </div>
            </div>
            )}
          </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            Cancelar
          </Button>
          <Button
            onClick={handleAssign}
            disabled={isAssigning || selectedTags.length === 0 || ((!contactIds || contactIds.length === 0) && (filters.length === 0 || matchedCount === 0))}
            className="bg-blue-600 hover:bg-blue-700 rounded-xl"
          >
            {isAssigning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Atribuindo...
              </>
            ) : (
              <>
                <TagIcon className="w-4 h-4 mr-2" />
                Atribuir a {contactIds && contactIds.length > 0 ? contactIds.length : matchedCount || 0} Contato(s)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}