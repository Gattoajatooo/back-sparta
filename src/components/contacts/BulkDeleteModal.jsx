import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Trash2,
  X,
  AlertTriangle,
  Users,
  Loader2,
  RotateCcw,
  Calendar,
  CheckCircle2,
  CheckCircle, // NOVO: Adicionado para seleção de contatos
  Square,      // NOVO: Adicionado para seleção de contatos
  Copy,        // NOVO: Para duplicados
  Merge,       // NOVO: Para mesclar
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { getContactFilterOptions } from "@/functions/getContactFilterOptions";
import { getFilteredContacts } from "@/functions/getFilteredContacts";
import { getFilteredContactsByCampaign } from "@/functions/getFilteredContactsByCampaign";
import { base44 } from "@/api/base44Client";

export default function BulkDeleteModal({ open, onClose, onConfirm, onRestore }) {
  const [activeTab, setActiveTab] = useState("delete");
  const [deleteBy, setDeleteBy] = useState("tags");
  const [selectedValue, setSelectedValue] = useState("");
  const [availableOptions, setAvailableOptions] = useState([]);
  const [allContacts, setAllContacts] = useState([]); // Todos os contatos (ativos ou deletados)
  const [filteredContacts, setFilteredContacts] = useState([]); // Contatos após aplicar filtros
  const [selectedContactIds, setSelectedContactIds] = useState(new Set());
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [user, setUser] = useState(null);
  
  // NOVO: Estados para duplicados
  const [duplicateGroups, setDuplicateGroups] = useState([]);
  const [isLoadingDuplicates, setIsLoadingDuplicates] = useState(false);
  const [isMerging, setIsMerging] = useState(false);

  // Campaign filters
  const [campaigns, setCampaigns] = useState([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [errorTypes, setErrorTypes] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");

  // Advanced filters
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [birthMonth, setBirthMonth] = useState("");

  // NOVO: Estado para armazenar tags disponíveis com id, nome e cor
  const [availableTags, setAvailableTags] = useState([]);

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        console.log('✅ User loaded:', { id: currentUser.id, company_id: currentUser.company_id });
      } catch (error) {
        console.error('❌ Error loading user:', error);
      }
    };
    loadUser();
  }, []);

  // Load campaigns when user is available and modal opens
  useEffect(() => {
    if (user?.company_id && open) {
      console.log('🔄 Modal opened with user, loading campaigns for company:', user.company_id);
      loadCampaigns();
    }
  }, [user, open]);

  // Load campaigns when deleteBy changes to "campaign"
  useEffect(() => {
    if (deleteBy === 'campaign' && user?.company_id && campaigns.length === 0) {
      console.log('🔄 DeleteBy changed to campaign, loading campaigns...');
      loadCampaigns();
    }
  }, [deleteBy, user]);

  useEffect(() => {
    if (open && user) {
      console.log('🔄 Modal opened, initializing...');
      setActiveTab("delete");
      setDeleteBy("tags");
      setSelectedValue("");
      setAvailableOptions([]);
      setAllContacts([]);
      setFilteredContacts([]);
      setSelectedCampaign("");
      setErrorTypes([]);
      setStatusFilter("all");
      setAgeMin("");
      setAgeMax("");
      setBirthMonth("");
      setSelectedContactIds(new Set());
      setDuplicateGroups([]); // NOVO

      loadTagsForDisplay();
      loadAllActiveContacts();
    }
  }, [open, user]);

  useEffect(() => {
    setSelectedValue("");
    setSelectedCampaign("");
    setStatusFilter("all");
    setFilteredContacts([]);
    setSelectedContactIds(new Set());

    if (activeTab === "restore") {
      loadAllDeletedContacts();
    } else if (activeTab === "duplicates") {
      loadDuplicateContacts();
    } else {
      loadAllActiveContacts();
    }
  }, [activeTab]);

  useEffect(() => {
    setSelectedValue("");
    setSelectedCampaign("");
    setFilteredContacts([]);
    setSelectedContactIds(new Set());
    generateFilterOptions();
  }, [deleteBy, allContacts]);

  useEffect(() => {
    applyFilters();
  }, [selectedValue, selectedCampaign, statusFilter, errorTypes, allContacts]);

  useEffect(() => {
    if (filteredContacts.length > 0) {
      setSelectedContactIds(new Set(filteredContacts.map(c => c.id)));
    } else {
      setSelectedContactIds(new Set());
    }
  }, [filteredContacts]);

  const loadAllActiveContacts = async () => {
    if (!user?.company_id) return;
    
    setIsLoadingContacts(true);
    try {
      const contacts = await base44.entities.Contact.filter({
        company_id: user.company_id,
        deleted: { '$ne': true }
      });
      
      console.log(`✅ Loaded ${contacts.length} active contacts`);
      setAllContacts(contacts);
      
      if (activeTab === 'delete') {
        setFilteredContacts(contacts);
      }
    } catch (error) {
      console.error('❌ Error loading active contacts:', error);
      setAllContacts([]);
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const loadAllDeletedContacts = async () => {
    if (!user?.company_id) return;
    
    setIsLoadingContacts(true);
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const contacts = await base44.entities.Contact.filter({
        company_id: user.company_id,
        deleted: true,
        deleted_at: { '$gte': sevenDaysAgo.toISOString() }
      });
      
      console.log(`✅ Loaded ${contacts.length} deleted contacts`);
      setAllContacts(contacts);
      setFilteredContacts([]);
    } catch (error) {
      console.error('❌ Error loading deleted contacts:', error);
      setAllContacts([]);
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const generateFilterOptions = () => {
    if (!allContacts.length) {
      setAvailableOptions([]);
      return;
    }

    let options = [];
    
    switch (deleteBy) {
      case 'tags':
      case 'tags_system':
        options = [...new Set(
          allContacts
            .flatMap(c => c[deleteBy] || [])
            .filter(val => val && val !== '')
        )].sort();
        break;
      
      case 'gender':
      case 'status':
      case 'source':
      case 'import_name':
        options = [...new Set(
          allContacts
            .map(c => c[deleteBy])
            .filter(val => val && val !== '')
        )].sort();
        break;
      
      default:
        options = [];
    }
    
    setAvailableOptions(options);
  };

  const applyFilters = () => {
    if (!allContacts.length) {
      setFilteredContacts([]);
      return;
    }

    // Na aba de restaurar, não mostrar contatos até selecionar um filtro
    if (activeTab === 'restore' && !selectedValue && !selectedCampaign) {
      setFilteredContacts([]);
      return;
    }

    // Na aba de deletar sem filtro, mostrar todos
    if (activeTab === 'delete' && !selectedValue && !selectedCampaign) {
      setFilteredContacts(allContacts);
      return;
    }

    let filtered = [...allContacts];

    if (deleteBy === 'campaign' && selectedCampaign) {
      // Filtro por campanha será implementado via API
      loadCampaignContactsFiltered();
      return;
    } else if (deleteBy === 'birth_month' && selectedValue) {
      filtered = filtered.filter(c => {
        if (!c.birth_date) return false;
        const month = c.birth_date.substring(5, 7);
        return month === selectedValue;
      });
    } else if (deleteBy === 'tags' && selectedValue) {
      filtered = filtered.filter(c => 
        c.tags && Array.isArray(c.tags) && c.tags.includes(selectedValue)
      );
    } else if (deleteBy === 'tags_system' && selectedValue) {
      filtered = filtered.filter(c => 
        c.tags_system && Array.isArray(c.tags_system) && c.tags_system.includes(selectedValue)
      );
    } else if (selectedValue) {
      filtered = filtered.filter(c => c[deleteBy] === selectedValue);
    }

    setFilteredContacts(filtered);
  };

  const loadCampaignContactsFiltered = async () => {
    setIsLoadingContacts(true);
    try {
      const response = await getFilteredContactsByCampaign({
        schedule_id: selectedCampaign,
        error_types: errorTypes.length > 0 ? errorTypes : undefined,
        status_filter: statusFilter
      });

      if (response.data.success) {
        const campaignContactIds = new Set((response.data.contacts || []).map(c => c.id));
        const filtered = allContacts.filter(c => campaignContactIds.has(c.id));
        setFilteredContacts(filtered);
      }
    } catch (error) {
      console.error("❌ Error loading campaign contacts:", error);
      setFilteredContacts([]);
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const loadCampaigns = async () => {
    if (!user?.company_id) {
      console.log('⚠️ Cannot load campaigns - No company_id available. User:', user);
      return;
    }

    setIsLoadingCampaigns(true);
    console.log('📡 Starting to fetch campaigns for company_id:', user.company_id);

    try {
      // PRIMEIRO: Tentar carregar TODAS as campanhas da empresa (sem filtro de status)
      const allCampaignsUnfiltered = await base44.entities.Schedule.filter({
        company_id: user.company_id
      }, '-created_date');

      console.log('📊 ALL Campaigns (no status filter):', {
        count: allCampaignsUnfiltered.length,
        company_id: user.company_id,
        campaigns: allCampaignsUnfiltered.map(c => ({
          id: c.id,
          name: c.name,
          status: c.status,
          company_id: c.company_id,
          recipients: c.total_recipients
        }))
      });

      // Filtrar apenas as que têm recipients (campanhas já enviadas)
      const campaignsWithRecipients = allCampaignsUnfiltered.filter(c =>
        c.total_recipients && c.total_recipients > 0
      );

      console.log('✅ Campaigns with recipients loaded:', {
        count: campaignsWithRecipients.length,
        campaigns: campaignsWithRecipients.map(c => ({
          id: c.id,
          name: c.name,
          status: c.status,
          recipients: c.total_recipients
        }))
      });

      setCampaigns(campaignsWithRecipients);
    } catch (error) {
      console.error('❌ Error loading campaigns:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        user_company_id: user?.company_id
      });
      setCampaigns([]);
    } finally {
      setIsLoadingCampaigns(false);
    }
  };



  // NOVO: Carregar tags detalhadas (id, name, color) para exibição
  const loadTagsForDisplay = async () => {
    try {
      const tags = await base44.entities.Tag.filter({
        company_id: user?.company_id
      });
      setAvailableTags(tags);
    } catch (error) {
      console.error('❌ Error loading detailed tags:', error);
      setAvailableTags([]);
    }
  };



  const handleDeleteContacts = async () => { // Renamed from handleConfirm
    // Usar apenas os contatos selecionados
    const contactsToDelete = Array.from(selectedContactIds);
    
    if (contactsToDelete.length === 0) {
      console.warn('Nenhum contato selecionado para deletar.');
      return;
    }

    setIsDeleting(true);
    try {
      // ✅ CORRIGIDO: Passar objeto com contactIds ao invés de apenas o array
      await onConfirm({ contactIds: contactsToDelete });
      console.log(`${contactsToDelete.length} contato(s) deletado(s) com sucesso!`);
      onClose();
    } catch (error) {
      console.error('Erro ao deletar contatos:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  // NOVO: Carregar duplicados
  const loadDuplicateContacts = async () => {
    if (!user?.company_id) return;
    
    setIsLoadingDuplicates(true);
    try {
      // Buscar TODOS os contatos (deletados e não deletados)
      const allContactsIncludingDeleted = await base44.entities.Contact.filter({
        company_id: user.company_id
      });
      
      console.log(`✅ Analisando ${allContactsIncludingDeleted.length} contatos para duplicados...`);
      
      // Agrupar por número de telefone (normalizado)
      const phoneGroups = {};
      allContactsIncludingDeleted.forEach(contact => {
        if (!contact.phone) return;
        
        // Normalizar número (remover caracteres especiais)
        const normalizedPhone = contact.phone.replace(/\D/g, '');
        
        if (!phoneGroups[normalizedPhone]) {
          phoneGroups[normalizedPhone] = [];
        }
        phoneGroups[normalizedPhone].push(contact);
      });
      
      // Filtrar apenas grupos com 2 ou mais contatos
      const duplicates = Object.entries(phoneGroups)
        .filter(([phone, contacts]) => contacts.length > 1)
        .map(([phone, contacts]) => ({
          phone: phone,
          contacts: contacts.sort((a, b) => {
            // Priorizar não deletados
            if (a.deleted && !b.deleted) return 1;
            if (!a.deleted && b.deleted) return -1;
            // Se ambos deletados ou não deletados, ordenar por data de criação (mais antigo primeiro)
            return new Date(a.created_date) - new Date(b.created_date);
          }),
          count: contacts.length
        }));
      
      console.log(`🔍 Encontrados ${duplicates.length} grupos de duplicados`);
      setDuplicateGroups(duplicates);
    } catch (error) {
      console.error('❌ Error loading duplicates:', error);
      setDuplicateGroups([]);
    } finally {
      setIsLoadingDuplicates(false);
    }
  };

  // NOVO: Mesclar duplicados
  const handleMergeDuplicates = async (group) => {
    if (group.contacts.length < 2) return;
    
    const confirmed = window.confirm(
      `Tem certeza que deseja mesclar ${group.contacts.length} contatos duplicados?\n\n` +
      `O primeiro contato será mantido e os outros ${group.contacts.length - 1} serão deletados permanentemente.`
    );
    
    if (!confirmed) return;
    
    setIsMerging(true);
    try {
      const response = await base44.functions.invoke('mergeDuplicateContacts', { group });
      
      if (response.data?.success) {
        console.log(`✅ ${response.data.merged_count} duplicados deletados permanentemente`);
        
        // Recarregar duplicados
        await loadDuplicateContacts();
        
        alert(`✅ Contatos mesclados com sucesso! ${response.data.merged_count} duplicado(s) removido(s).`);
      } else {
        throw new Error(response.data?.error || 'Erro ao mesclar contatos');
      }
    } catch (error) {
      console.error('❌ Error merging duplicates:', error);
      alert('❌ Erro ao mesclar contatos duplicados');
    } finally {
      setIsMerging(false);
    }
  };

  // NOVO: Toggle de seleção individual
  const toggleContactSelection = (contactId) => {
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

  // NOVO: Selecionar/Desselecionar todos
  const toggleSelectAll = () => {
    if (selectedContactIds.size === filteredContacts.length && filteredContacts.length > 0) {
      setSelectedContactIds(new Set());
    } else {
      setSelectedContactIds(new Set(filteredContacts.map(c => c.id)));
    }
  };

  const handleRestore = async (contactIds) => {
    setIsDeleting(true);
    try {
      await onRestore(contactIds);
      await loadAllDeletedContacts();
    } catch (error) {
      console.error("Error restoring contacts:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 bg-white rounded-[2.5rem] border-gray-200 overflow-hidden flex flex-col [&>button]:hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-gray-900 truncate">Gerenciar Contatos</h2>
                <p className="text-sm text-gray-600 truncate">Deletar ou restaurar contatos</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              disabled={isDeleting}
              className="h-8 w-8 rounded-lg flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className={`grid w-full rounded-xl ${user?.role === 'admin' ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <TabsTrigger value="delete" className="rounded-lg">Deletar</TabsTrigger>
              <TabsTrigger value="restore" className="rounded-lg">Restaurar</TabsTrigger>
              {user?.role === 'admin' && (
                <TabsTrigger value="duplicates" className="rounded-lg">Duplicados</TabsTrigger>
              )}
            </TabsList>

            {/* Delete Tab */}
            <TabsContent value="delete" className="space-y-4 mt-4">
              <Alert className="rounded-2xl border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>Atenção:</strong> Os contatos serão deletados permanentemente. Esta ação não pode ser desfeita.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Deletar contatos por:</Label>
                  <Select value={deleteBy} onValueChange={setDeleteBy}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="tags">Marcador</SelectItem>
                      <SelectItem value="tags_system">Marcador do Sistema</SelectItem>
                      <SelectItem value="campaign">Campanha</SelectItem>
                      <SelectItem value="gender">Gênero</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                      <SelectItem value="source">Origem</SelectItem>
                      <SelectItem value="import_name">Nome da Importação</SelectItem>
                      <SelectItem value="birth_month">Mês de Aniversário</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {deleteBy === 'campaign' && (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Campanha:</Label>
                      <Select value={selectedCampaign} onValueChange={setSelectedCampaign} disabled={isLoadingCampaigns}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder={isLoadingCampaigns ? "Carregando..." : "Selecione"} />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {campaigns.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Status:</Label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="failed">Falharam</SelectItem>
                          <SelectItem value="success">Sucesso</SelectItem>
                          <SelectItem value="pending">Pendentes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {deleteBy === 'birth_month' && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Mês:</Label>
                    <Select value={birthMonth} onValueChange={(v) => { setBirthMonth(v); setSelectedValue(v); }}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((m, i) => (
                          <SelectItem key={i} value={String(i + 1).padStart(2, '0')}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {deleteBy !== 'campaign' && deleteBy !== 'birth_month' && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Valor:</Label>
                    <Select value={selectedValue} onValueChange={setSelectedValue} disabled={isLoadingContacts}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder={isLoadingContacts ? "Carregando..." : "Selecione"} />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {availableOptions.map((opt) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {isLoadingContacts && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              )}

              {!isLoadingContacts && filteredContacts.length > 0 && (
                <Card className="rounded-2xl border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">
                        {selectedContactIds.size} de {filteredContacts.length} selecionado(s)
                      </span>
                      <Button variant="outline" size="sm" onClick={toggleSelectAll} className="rounded-lg">
                        {selectedContactIds.size === filteredContacts.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                      </Button>
                    </div>
                    <ScrollArea className="h-64">
                      <div className="space-y-2">
                        {filteredContacts.map((c) => (
                          <div
                            key={c.id}
                            onClick={() => toggleContactSelection(c.id)}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${
                              selectedContactIds.has(c.id) ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
                            }`}
                          >
                            {selectedContactIds.has(c.id) ? (
                              <CheckCircle className="w-5 h-5 text-blue-600" />
                            ) : (
                              <Square className="w-5 h-5 text-gray-400" />
                            )}
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="text-xs">{c.first_name?.[0]}{c.last_name?.[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{c.first_name} {c.last_name}</p>
                              <p className="text-xs text-gray-500 truncate">{c.phone}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={onClose} disabled={isDeleting} className="rounded-xl">
                  Cancelar
                </Button>
                <Button
                  onClick={handleDeleteContacts}
                  disabled={isDeleting || selectedContactIds.size === 0}
                  className="bg-red-600 hover:bg-red-700 rounded-xl"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deletando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Deletar {selectedContactIds.size}
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            {/* Restore Tab */}
            <TabsContent value="restore" className="space-y-4 mt-4">
              <Alert className="rounded-2xl border-blue-200 bg-blue-50">
                <RotateCcw className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>Recuperação:</strong> Filtre e restaure contatos deletados nos últimos 7 dias.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Restaurar contatos por:</Label>
                  <Select value={deleteBy} onValueChange={setDeleteBy}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="tags">Marcador</SelectItem>
                      <SelectItem value="tags_system">Marcador do Sistema</SelectItem>
                      <SelectItem value="campaign">Campanha</SelectItem>
                      <SelectItem value="gender">Gênero</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                      <SelectItem value="source">Origem</SelectItem>
                      <SelectItem value="import_name">Nome da Importação</SelectItem>
                      <SelectItem value="birth_month">Mês de Aniversário</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {deleteBy === 'campaign' && (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Campanha:</Label>
                      <Select value={selectedCampaign} onValueChange={setSelectedCampaign} disabled={isLoadingCampaigns}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder={isLoadingCampaigns ? "Carregando..." : "Selecione"} />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {campaigns.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Status:</Label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="failed">Falharam</SelectItem>
                          <SelectItem value="success">Sucesso</SelectItem>
                          <SelectItem value="pending">Pendentes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {deleteBy === 'birth_month' && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Mês:</Label>
                    <Select value={birthMonth} onValueChange={(v) => { setBirthMonth(v); setSelectedValue(v); }}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((m, i) => (
                          <SelectItem key={i} value={String(i + 1).padStart(2, '0')}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {deleteBy !== 'campaign' && deleteBy !== 'birth_month' && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Valor:</Label>
                    <Select value={selectedValue} onValueChange={setSelectedValue} disabled={isLoadingContacts}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder={isLoadingContacts ? "Carregando..." : "Selecione"} />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {availableOptions.map((opt) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {isLoadingContacts && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              )}

              {!isLoadingContacts && filteredContacts.length > 0 && (
                <Card className="rounded-2xl border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">
                        {selectedContactIds.size} de {filteredContacts.length} selecionado(s)
                      </span>
                      <Button variant="outline" size="sm" onClick={toggleSelectAll} className="rounded-lg">
                        {selectedContactIds.size === filteredContacts.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                      </Button>
                    </div>
                    <ScrollArea className="h-64">
                      <div className="space-y-2">
                        {filteredContacts.map((c) => (
                          <div
                            key={c.id}
                            onClick={() => toggleContactSelection(c.id)}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${
                              selectedContactIds.has(c.id) ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
                            }`}
                          >
                            {selectedContactIds.has(c.id) ? (
                              <CheckCircle className="w-5 h-5 text-blue-600" />
                            ) : (
                              <Square className="w-5 h-5 text-gray-400" />
                            )}
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="text-xs">{c.first_name?.[0]}{c.last_name?.[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{c.first_name} {c.last_name}</p>
                              <p className="text-xs text-gray-500 truncate">{c.phone}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              {!isLoadingContacts && filteredContacts.length === 0 && selectedValue && (
                <div className="text-center py-8 text-gray-500">
                  Nenhum contato encontrado com os filtros selecionados
                </div>
              )}

              {!isLoadingContacts && !selectedValue && !selectedCampaign && (
                <div className="text-center py-8 text-gray-500">
                  Selecione um filtro para visualizar os contatos
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={onClose} disabled={isDeleting} className="rounded-xl">
                  Cancelar
                </Button>
                <Button
                  onClick={() => handleRestore(Array.from(selectedContactIds))}
                  disabled={isDeleting || selectedContactIds.size === 0}
                  className="bg-blue-600 hover:bg-blue-700 rounded-xl"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Restaurando...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Restaurar {selectedContactIds.size}
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            {/* NOVO: Duplicates Tab */}
            {user?.role === 'admin' && (
              <TabsContent value="duplicates" className="space-y-4 mt-4">
                <Alert className="rounded-2xl border-purple-200 bg-purple-50">
                  <Copy className="h-4 w-4 text-purple-600" />
                  <AlertDescription className="text-purple-800">
                    <strong>Detectar Duplicados:</strong> Contatos com o mesmo número de telefone serão agrupados. O primeiro contato será mantido e os outros deletados permanentemente.
                  </AlertDescription>
                </Alert>

                {isLoadingDuplicates && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                  </div>
                )}

                {!isLoadingDuplicates && duplicateGroups.length === 0 && (
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500" />
                    <p className="text-gray-700 font-medium">Nenhum duplicado encontrado!</p>
                    <p className="text-sm text-gray-500 mt-1">Todos os contatos possuem números únicos.</p>
                  </div>
                )}

                {!isLoadingDuplicates && duplicateGroups.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <p className="text-sm font-medium text-gray-700">
                        {duplicateGroups.length} grupo(s) de duplicados
                      </p>
                      <Badge className="rounded-full bg-purple-100 text-purple-700 w-fit">
                        {duplicateGroups.reduce((acc, g) => acc + g.count, 0)} contatos afetados
                      </Badge>
                    </div>

                    <ScrollArea className="h-96">
                      <div className="space-y-3 pr-3">
                        {duplicateGroups.map((group, groupIndex) => (
                          <Card key={groupIndex} className="rounded-2xl border-purple-200">
                            <CardHeader className="pb-3">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <Copy className="w-4 h-4 text-purple-600 flex-shrink-0" />
                                  <CardTitle className="text-sm truncate">
                                    {group.phone}
                                  </CardTitle>
                                  <Badge className="rounded-full bg-purple-100 text-purple-700 text-xs flex-shrink-0">
                                    {group.count}
                                  </Badge>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => handleMergeDuplicates(group)}
                                  disabled={isMerging}
                                  className="bg-purple-600 hover:bg-purple-700 rounded-xl flex-shrink-0 w-full sm:w-auto"
                                >
                                  {isMerging ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <>
                                      <Merge className="w-4 h-4 mr-1" />
                                      Mesclar
                                    </>
                                  )}
                                </Button>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              {group.contacts.map((contact, contactIndex) => (
                                <div
                                  key={contact.id}
                                  className={`flex items-center gap-2 p-2 rounded-lg border ${
                                    contactIndex === 0
                                      ? 'bg-green-50 border-green-200'
                                      : contact.deleted
                                      ? 'bg-red-50 border-red-200'
                                      : 'bg-gray-50 border-gray-200'
                                  }`}
                                >
                                  <Avatar className="w-7 h-7 flex-shrink-0">
                                    <AvatarFallback className="text-xs">
                                      {contact.first_name?.[0]}{contact.last_name?.[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1 flex-wrap">
                                      <p className="font-medium text-xs truncate">
                                        {contact.first_name} {contact.last_name}
                                      </p>
                                      {contactIndex === 0 && (
                                        <Badge className="rounded-full bg-green-600 text-white text-[10px] px-1.5 py-0">
                                          Manter
                                        </Badge>
                                      )}
                                      {contactIndex > 0 && !contact.deleted && (
                                        <Badge className="rounded-full bg-red-600 text-white text-[10px] px-1.5 py-0">
                                          Deletar
                                        </Badge>
                                      )}
                                      {contact.deleted && (
                                        <Badge className="rounded-full bg-gray-600 text-white text-[10px] px-1.5 py-0">
                                          Já deletado
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-gray-500 truncate">{contact.email || 'Sem email'}</p>
                                    <p className="text-[10px] text-gray-400">
                                      {new Date(contact.created_date).toLocaleDateString('pt-BR')}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={onClose} className="rounded-xl">
                    Fechar
                  </Button>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}