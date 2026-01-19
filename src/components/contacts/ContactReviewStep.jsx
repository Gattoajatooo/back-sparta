import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tag } from "@/entities/Tag";
import { User } from "@/entities/User";
import {
  ArrowLeft,
  CheckCircle2,
  Tag as TagIcon,
  Users,
  Info,
  X,
  Plus
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import TagFormModal from "../tags/TagFormModal";

// Custom Creatable-like select component using shadcn
const CustomCreatableSelect = ({ options, value, onChange, placeholder }) => {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const selectedValues = new Set(value.map(v => v.value));

  const handleSelect = (option) => {
    const newValue = [...value, option];
    onChange(newValue);
    setInputValue('');
  };
  
  const handleCreate = () => {
    if (inputValue && !options.find(o => o.label === inputValue) && !value.find(v => v.label === inputValue)) {
      const newOption = { value: inputValue, label: inputValue, __isNew__: true };
      handleSelect(newOption);
    }
  };

  const handleRemove = (optionToRemove) => {
    onChange(value.filter(v => v.value !== optionToRemove.value));
  };
  
  const filteredOptions = options.filter(o => !selectedValues.has(o.value) && o.label.toLowerCase().includes(inputValue.toLowerCase()));

  return (
    <div className="relative">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <div className="flex items-center flex-wrap gap-2 p-2 border border-gray-300 rounded-lg min-h-[40px] max-h-28 overflow-y-auto">
            {value.map(v => (
              <Badge key={v.value} variant="secondary" className="flex items-center gap-1">
                {v.label}
                <button onClick={() => handleRemove(v)} className="ml-1">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={value.length === 0 ? placeholder : ''}
              className="flex-1 border-none shadow-none focus-visible:ring-0 p-0 h-auto"
              onFocus={() => setIsOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                   e.preventDefault();
                   handleCreate();
                }
              }}
            />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-full max-h-64 overflow-y-auto">
          <div className="max-h-56 overflow-y-auto space-y-1">
            {filteredOptions.map(option => (
              <DropdownMenuItem key={option.value} onSelect={() => handleSelect(option)}>
                {option.label}
              </DropdownMenuItem>
            ))}
            {filteredOptions.length === 0 && (
              <div className="p-3 text-sm text-gray-500">Nenhum marcador encontrado</div>
            )}
          </div>
          {inputValue && !filteredOptions.some(o => o.label.toLowerCase() === inputValue.toLowerCase()) && (
             <DropdownMenuItem onSelect={handleCreate} className="mt-1">
               <Plus className="w-4 h-4 mr-2" />
               Criar "{inputValue}"
             </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};


import { Loader2 } from "lucide-react";

export default function ContactReviewStep({ contacts, onPrevious, onConfirm, importName, isSubmitting }) {
  const [finalContacts, setFinalContacts] = useState([]);
  const [globalTags, setGlobalTags] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [individualAssignments, setIndividualAssignments] = useState({});
  const [showTagForm, setShowTagForm] = useState(false);
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const [user, setUser] = useState(null);

  const fetchTags = async () => {
    setIsLoadingTags(true);
    try {
      const tags = await Tag.list();
      setAvailableTags(tags.map(t => ({ value: t.id, label: t.name })));
    } catch (error) {
      console.error("Failed to fetch tags:", error);
    } finally {
      setIsLoadingTags(false);
    }
  };

  useEffect(() => {
    const loadUserAndTags = async () => {
      try {
        console.log('[ContactReviewStep] 📥 Received contacts:', contacts?.length);
        console.log('[ContactReviewStep] First contact sample:', contacts?.[0]);

        const currentUser = await User.me();
        setUser(currentUser);
        
        const contactsWithId = contacts.map((c, i) => ({
          ...c,
          _tempId: c._tempId || `import-contact-${Date.now()}-${i}`
        }));
        
        console.log('[ContactReviewStep] ✅ Contacts with IDs:', contactsWithId.length);
        console.log('[ContactReviewStep] First contact with ID:', contactsWithId[0]);

        setFinalContacts(contactsWithId);
        setIndividualAssignments({});
        setGlobalTags([]);

        await fetchTags();
      } catch (error) {
        console.error("[ContactReviewStep] ❌ Error loading user and tags:", error);
        console.error("[ContactReviewStep] Error details:", error.message, error.stack);
      }
    };

    if (contacts && contacts.length > 0) {
      loadUserAndTags();
    }
  }, [contacts]);

  const handleConfirm = () => {
    const finalAssignments = { ...individualAssignments };
    const globalTagLabels = globalTags.map(t => t.label);

    onConfirm({
      contactsData: finalContacts,
      globalTags: globalTagLabels,
      individualAssignments: Object.entries(finalAssignments).reduce((acc, [contactId, assignments]) => {
        acc[contactId] = {
          tags: assignments.tags ? assignments.tags.map(t => t.label) : []
        };
        return acc;
      }, {}),
    });
  };

  const handleIndividualTagChange = (contactId, selectedOptions) => {
    setIndividualAssignments(prev => {
      const newAssignments = { ...prev };
      const currentContactAssignments = newAssignments[contactId] || {};
      newAssignments[contactId] = {
        ...currentContactAssignments,
        tags: selectedOptions || []
      };
      return newAssignments;
    });
  };

  const handleCreateTag = async (tagData) => {
    try {
      // Criar o marcador de fato na Entity Tag
      await Tag.create({
        ...tagData,
        company_id: user.company_id
      });
      
      // Recarregar a lista de marcadores
      await fetchTags();
      
      // Fechar o modal
      setShowTagForm(false);
      
      console.log("Marcador criado com sucesso!");
    } catch (error) {
      console.error("Erro ao criar marcador:", error);
      throw error; // Re-throw para que o TagFormModal possa lidar com o erro
    }
  };

  const getFinalTagsForContact = (contactId) => {
    const individual = individualAssignments[contactId]?.tags || [];
    const combined = [...globalTags, ...individual];
    const unique = Array.from(new Map(combined.map(item => [item.value, item])).values());
    return unique;
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            Revisão e Atribuições
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            Importação: <span className="font-semibold">{importName}</span>
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="font-medium text-gray-700 flex items-center gap-2">
                  <TagIcon className="w-4 h-4" />
                  Atribuir Marcadores em Massa
                </Label>
                <Button
                  onClick={() => setShowTagForm(true)}
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-2 border-blue-600 text-blue-600 hover:bg-blue-50 hover:border-blue-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Criar Marcador
                </Button>
              </div>
              <p className="text-xs text-gray-500 mb-2">
                Estes marcadores serão aplicados a <span className="font-semibold">{finalContacts.length}</span> contatos.
              </p>
              <CustomCreatableSelect
                options={availableTags}
                value={globalTags}
                onChange={setGlobalTags}
                placeholder={isLoadingTags ? "Carregando marcadores..." : "Selecione ou crie marcadores..."}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="rounded-2xl border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Revisão de Contatos ({finalContacts.length})
          </CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            Revise os contatos e faça atribuições individuais, se necessário.
          </p>
        </CardHeader>
        <CardContent>
          <div className="max-h-[400px] overflow-y-auto pr-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contato</TableHead>
                  <TableHead>Marcadores</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {finalContacts.map((contact) => (
                  <TableRow key={contact._tempId}>
                    <TableCell>
                      <div className="font-medium">{contact.first_name} {contact.last_name}</div>
                      <div className="text-sm text-gray-500">{contact.phone || contact.email}</div>
                    </TableCell>
                    <TableCell className="w-1/2">
                       <CustomCreatableSelect
                        options={availableTags}
                        value={individualAssignments[contact._tempId]?.tags || []}
                        onChange={(options) => handleIndividualTagChange(contact._tempId, options)}
                        placeholder="Marcadores individuais..."
                      />
                      <div className="flex flex-wrap gap-1 mt-2">
                        {getFinalTagsForContact(contact._tempId).map(tag => (
                          <Badge key={tag.value} variant="secondary" className="rounded-md bg-gray-100 text-gray-700">
                            {tag.label}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center mt-6">
        <div className="flex gap-2">
          <Button 
            onClick={() => {
              // Limpar progresso no localStorage
              localStorage.removeItem('importProgress');
              
              // Disparar evento para atualizar UI
              window.dispatchEvent(new CustomEvent('importProgressUpdate', {
                detail: {
                  isProcessing: false,
                  total: 0,
                  processed: 0,
                  successful: 0,
                  failed: 0,
                  duplicates: 0,
                  noWhatsApp: 0,
                  updated: 0
                }
              }));
              
              // Fechar modal de importação
              window.dispatchEvent(new CustomEvent('cancelImport'));
            }} 
            variant="outline" 
            className="rounded-xl text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
          >
            <X className="w-4 h-4 mr-2" />
            Cancelar Importação
          </Button>
          <Button onClick={onPrevious} variant="outline" className="rounded-xl">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>
        <Button 
          onClick={handleConfirm} 
          disabled={isSubmitting}
          className="bg-blue-600 hover:bg-blue-700 rounded-xl min-w-[180px]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {isSubmitting === 'preparing' ? 'Preparando...' : 'Iniciando...'}
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Iniciar Importação
            </>
          )}
        </Button>
      </div>

      {/* Modal para criar marcador */}
      <TagFormModal
        open={showTagForm}
        onClose={() => setShowTagForm(false)}
        onSubmit={handleCreateTag}
        tag={null}
      />
    </div>
  );
}