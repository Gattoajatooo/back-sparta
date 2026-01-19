import React, { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tag as TagIcon,
  Search,
  Loader2,
  CheckCircle2,
  X
} from "lucide-react";

export default function QuickAssignTagModal({ 
  open, 
  onClose, 
  contact,
  onSuccess 
}) {
  const [tags, setTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Carregar tags disponíveis
  useEffect(() => {
    if (open && contact) {
      loadTags();
    }
  }, [open, contact]);

  const loadTags = async () => {
    setIsLoading(true);
    try {
      const user = await base44.auth.me();
      const tagList = await base44.entities.Tag.filter({ 
        company_id: user.company_id,
        is_active: true 
      });
      setTags(tagList);
      
      // Pré-selecionar tags que o contato já possui
      if (contact?.tags && Array.isArray(contact.tags)) {
        const existingTagIds = contact.tags.map(t => {
          // Se for um ID (string longa), retorna direto
          if (typeof t === 'string' && t.length > 20) return t;
          // Se for um nome, busca o ID correspondente
          const foundTag = tagList.find(tag => tag.name === t);
          return foundTag?.id;
        }).filter(Boolean);
        setSelectedTags(existingTagIds);
      } else {
        setSelectedTags([]);
      }
    } catch (error) {
      console.error('Erro ao carregar tags:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filtrar tags pela busca
  const filteredTags = tags.filter(tag => 
    tag.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Toggle seleção de tag
  const toggleTag = (tagId) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  // Salvar tags
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Converter IDs para nomes para salvar
      const tagNames = selectedTags.map(id => {
        const tag = tags.find(t => t.id === id);
        return tag?.name;
      }).filter(Boolean);

      await base44.entities.Contact.update(contact.id, {
        tags: tagNames
      });

      onSuccess?.('Marcadores atualizados com sucesso!');
      onClose();
    } catch (error) {
      console.error('Erro ao salvar tags:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Reset ao fechar
  const handleClose = () => {
    setSearchTerm('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center">
              <TagIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="block">Atribuir Marcadores</span>
              <span className="text-sm font-normal text-gray-500">
                {contact?.first_name} {contact?.last_name}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar marcador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>

          {/* Tags selecionadas */}
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-2 p-3 bg-blue-50 rounded-xl max-h-28 overflow-y-auto">
              {selectedTags.map(tagId => {
                const tag = tags.find(t => t.id === tagId);
                if (!tag) return null;
                return (
                  <Badge
                    key={tagId}
                    className="bg-blue-600 text-white px-2 py-1 cursor-pointer hover:bg-blue-700"
                    onClick={() => toggleTag(tagId)}
                  >
                    {tag.name}
                    <X className="w-3 h-3 ml-1" />
                  </Badge>
                );
              })}
            </div>
          )}

          {/* Lista de tags */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <ScrollArea className="h-64 rounded-xl border p-3">
              <div className="space-y-2">
                {filteredTags.map(tag => (
                  <div
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                      selectedTags.includes(tag.id)
                        ? 'bg-blue-100 border-2 border-blue-500'
                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: tag.color + '20', color: tag.color }}
                    >
                      <TagIcon className="w-4 h-4" />
                    </div>
                    <span className="flex-1 font-medium text-gray-900">{tag.name}</span>
                    {selectedTags.includes(tag.id) && (
                      <CheckCircle2 className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                ))}
                {filteredTags.length === 0 && (
                  <p className="text-center text-gray-500 py-4">
                    Nenhum marcador encontrado
                  </p>
                )}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} className="rounded-xl">
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700 rounded-xl"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Salvar ({selectedTags.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}