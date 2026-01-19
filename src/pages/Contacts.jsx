import React, { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Users,
  Search,
  Plus,
  Filter,
  MoreVertical,
  Tag as TagIcon,
  Upload,
  ArrowUpDown,
  X,
  RefreshCw,
  Grid,
  List,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Info,
  CheckSquare,
  Square,
  UserCheck
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import ContactFormModal from "../components/contacts/ContactFormModal";
import ContactCard from "../components/contacts/ContactCard";
import ContactImportModal from "../components/contacts/ContactImportModal";
import ContactDetailsModal from "../components/contacts/ContactDetailsModal";
import BulkDeleteModal from "../components/contacts/BulkDeleteModal";
import ImportProgressModal from "../components/contacts/ImportProgressModal";
import { createSystemLog } from "@/functions/createSystemLog";
import DuplicateContactModal from "../components/contacts/DuplicateContactModal";
import { getFilteredContacts } from "@/functions/getFilteredContacts";
import { checkContactDuplicates } from "@/functions/checkContactDuplicates";
import { saveContact } from "@/functions/saveContact";
import BulkDeleteProgressModal from "../components/contacts/BulkDeleteProgressModal";
import ContactHistoryModal from "../components/contacts/ContactHistoryModal";
import QuickAssignTagModal from "../components/contacts/QuickAssignTagModal";
import { bulkDeleteContacts } from "@/functions/bulkDeleteContacts";
import BulkAssignTagsModal from "../components/tags/BulkAssignTagsModal";
import { getWhatsAppProfilePicture } from "@/functions/getWhatsAppProfilePicture";

// Banner component
const Banner = ({ show, message, type, onClose }) => {
  if (!show) return null;

  const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : type === 'warning' ? 'bg-yellow-500' : 'bg-gray-500'; // Added warning type
  const textColor = 'text-white';

  return (
    <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center justify-between ${bgColor} ${textColor}`}>
      <span>{message}</span>
      <button onClick={onClose} className="ml-4 p-1 rounded-full hover:bg-white hover:bg-opacity-20">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default function ContactsPage() { // Renamed from Contacts to ContactsPage
  const navigate = useNavigate();
  const contentRef = useRef(null);

  // Core data states
  const [contacts, setContacts] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [systemTags, setSystemTags] = useState([]);
  const [importNames, setImportNames] = useState([]);
  const [user, setUser] = useState(null);
  const [totalCompanyContacts, setTotalCompanyContacts] = useState(0);

  // Loading and UI states
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("created_date");
  const [sortOrder, setSortOrder] = useState("desc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalContacts, setTotalContacts] = useState(1); // Set initial to 1 to avoid "No contacts" on initial load
  const contactsPerPage = 100;

  // Banner state
  const [banner, setBanner] = useState({ show: false, message: '', type: 'success' });

  // Debounce state for search
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // View preferences
  const [viewMode, setViewMode] = useState(() => {
    const saved = localStorage.getItem('contacts_viewMode');
    return saved || "grid";
  });
  const [gridColumns, setGridColumns] = useState(() => {
    const saved = localStorage.getItem('contacts_gridColumns');
    return saved ? parseInt(saved) : 3;
  });
  const [listCompactness, setListCompactness] = useState(() => {
    const saved = localStorage.getItem('contacts_listCompactness');
    return saved || "normal";
  });

  // Filters
  const [selectedCampaigns, setSelectedCampaigns] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedSystemTags, setSelectedSystemTags] = useState([]);
  const [selectedImports, setSelectedImports] = useState([]);
  const [selectedResponsibles, setSelectedResponsibles] = useState([]);
  const [responsibleNames, setResponsibleNames] = useState([]);
  const [campaignFilterOpen, setCampaignFilterOpen] = useState(false);
  const [tagFilterOpen, setTagFilterOpen] = useState(false);
  const [systemTagFilterOpen, setSystemTagFilterOpen] = useState(false);
  const [importFilterOpen, setImportFilterOpen] = useState(false);
  const [responsibleFilterOpen, setResponsibleFilterOpen] = useState(false);

  // Modals/Sidebars
  const [showForm, setShowForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [viewingContact, setViewingContact] = useState(null);

  // Bulk operations
  const [showBulkDelete, setShowBulkDelete] = useState(false); // Renamed from showBulkDeleteModal in outline
  const [showImportProgress, setShowImportProgress] = useState(false);
  const [currentImportJobId, setCurrentImportJobId] = useState(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateData, setDuplicateData] = useState(null);
  const [showBulkDeleteProgress, setShowBulkDeleteProgress] = useState(false); // Renamed from showBulkDeleteProgressModal in outline
  const [bulkDeleteData, setBulkDeleteData] = useState(null);
  const [showPostImportLoading, setShowPostImportLoading] = useState(false);

  // History modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyContact, setHistoryContact] = useState(null);

  // Quick assign tag modal
  const [showQuickAssignTag, setShowQuickAssignTag] = useState(false);
  const [assignTagContact, setAssignTagContact] = useState(null);

  // NOVO: Estados para modo de seleção
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedContactIds, setSelectedContactIds] = useState([]);
  const [showBulkAssignTags, setShowBulkAssignTags] = useState(false);

  // NOVO: Estados para confirmação de exclusão
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [contactToDelete, setContactToDelete] = useState(null);

  // ✅ NOVO: Limite de contatos do plano
  const [contactLimit, setContactLimit] = useState(null);

  // ✅ NOVO: Estado para verificar se existe sessão default
  const [hasDefaultSession, setHasDefaultSession] = useState(false);
  const [defaultSessionName, setDefaultSessionName] = useState(null);

  // NOVO: Estado para atualização de fotos
  const [isRefreshingPhotos, setIsRefreshingPhotos] = useState(false);

  // NOVO: Estados para progresso real de exclusão/restauração
  const [bulkProgress, setBulkProgress] = useState({
    total: 0,
    processed: 0,
    successful: 0,
    failed: 0
  });

  // NOVO: Estado para processamento em background
  const [isProcessingInBackground, setIsProcessingInBackground] = useState(false);
  const [backgroundProcessType, setBackgroundProcessType] = useState(null); // 'delete' ou 'restore'

  // NOVO: Estado para controlar minimização do modal
  const [isProgressMinimized, setIsProgressMinimized] = useState(false);

  // NOVO: Estado para cancelamento
  const [isCancelling, setIsCancelling] = useState(false);
  const cancelProcessingRef = useRef(false);

  // ✅ NOVO: Estados para progresso de importação
  const [isImportProgressModalOpen, setIsImportProgressModalOpen] = useState(false);
  const [isImportMinimized, setIsImportMinimized] = useState(false);
  const [importProgress, setImportProgress] = useState({
    isProcessing: false,
    total: 0,
    processed: 0,
    successful: 0,
    failed: 0
  });

  // NOVO: Ref para manter o processamento em background - this was already here

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Utility functions for banner
  const hideBanner = useCallback(() => {
    setBanner({ show: false, message: '', type: 'success' });
  }, []);

  const showBannerFunc = useCallback((message, type = 'success') => { // Renamed from showBanner
    setBanner({ show: true, message, type });
    setTimeout(() => {
      hideBanner();
    }, 5000);
  }, [hideBanner]);

  // Function to scroll to top
  const scrollToTop = useCallback(() => {
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  // Function to save view preferences
  const saveViewPreferences = useCallback(async (newPrefs) => {
    try {
      if (newPrefs.viewMode !== undefined) {
        localStorage.setItem('contacts_viewMode', newPrefs.viewMode);
      }
      if (newPrefs.gridColumns !== undefined) {
        localStorage.setItem('contacts_gridColumns', newPrefs.gridColumns.toString());
      }
      if (newPrefs.listCompactness !== undefined) {
        localStorage.setItem('contacts_listCompactness', newPrefs.listCompactness);
      }

      if (user?.id) {
        const currentUser = await base44.auth.me();
        const currentSettings = currentUser.settings || {};
        const currentViewPrefs = currentSettings.view_preferences || {};

        const updatedSettings = {
          ...currentSettings,
          view_preferences: {
            ...currentViewPrefs,
            contacts: {
              ...currentViewPrefs.contacts,
              ...newPrefs
            }
          }
        };

        await base44.auth.updateMe({ settings: updatedSettings });
      }
    } catch (error) {
      console.error("Error saving view preferences:", error);
      showBannerFunc("Erro ao salvar preferências de visualização", "error");
    }
  }, [user, showBannerFunc]);

  // Função para verificar ação de criar contato via URL
  const checkForCreateAction = useCallback(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'create') {
      setShowForm(true);
    }
  }, []);

  // FUNÇÃO PRINCIPAL DE CARREGAMENTO DE DATAS
  const loadData = useCallback(async (page = 1, loadMetadata = false) => {
    console.log(`🔄 loadData called - Page: ${page}, LoadMetadata: ${loadMetadata}`);

    setIsLoading(true);
    try {
      const currentUser = await base44.auth.me();
      if (!currentUser.company_id) {
        throw new Error('Company ID not found');
      }

      // Carregar campanhas (Schedule), tags e marcadores do sistema apenas quando necessário
      if (loadMetadata || campaigns.length === 0 || availableTags.length === 0 || systemTags.length === 0 || importNames.length === 0) {
        console.log('📚 Loading campaigns (schedules), tags, system tags, and import names...');

        const [campaignList, tagList, systemTagList, allContacts] = await Promise.all([
          base44.entities.Schedule.filter({ 
            company_id: currentUser.company_id,
            status: { '$nin': ['cancelled', 'completed'] }
          }),
          base44.entities.Tag.filter({ company_id: currentUser.company_id }),
          base44.entities.SystemTag.filter({ is_active: true }),
          base44.entities.Contact.filter({ company_id: currentUser.company_id })
        ]);

        // Extrair nomes únicos de importação e responsáveis
        const uniqueImportNames = [...new Set(allContacts.map(c => c.import_name).filter(Boolean))].sort();
        const uniqueResponsibles = [...new Set(allContacts.map(c => c.responsible_name).filter(Boolean))].sort();

        setCampaigns(campaignList);
        setAvailableTags(tagList);
        setSystemTags(systemTagList);
        setImportNames(uniqueImportNames);
        setResponsibleNames(uniqueResponsibles);
        console.log(`✅ Loaded ${campaignList.length} campaigns, ${tagList.length} tags, ${systemTagList.length} system tags, ${uniqueImportNames.length} import names, and ${uniqueResponsibles.length} responsibles`);
      }

      // Buscar contatos paginados
      console.log(`📞 Calling getFilteredContacts for page ${page}...`);
      const response = await getFilteredContacts({
        company_id: currentUser.company_id,
        searchTerm: debouncedSearchTerm,
        selectedCampaigns,
        selectedTags,
        selectedSystemTags,
        selectedImports,
        selectedResponsibles,
        sortBy,
        sortOrder,
        page: page,
        limit: contactsPerPage,
        deleted: false // Load only non-deleted contacts
      });

      if (response.data && response.data.success) {
        console.log(`✅ Successfully loaded ${response.data.contacts.length} contacts for page ${page}`);

        setContacts(response.data.contacts);
        setTotalContacts(response.data.pagination.totalContacts);
        setTotalPages(response.data.pagination.totalPages);
        setCurrentPage(response.data.pagination.currentPage);
        
        // ✅ Atualizar total geral de contatos da empresa (sem filtros)
        if (loadMetadata || totalCompanyContacts === 0) {
          const allCompanyContacts = await base44.entities.Contact.filter({
            company_id: currentUser.company_id,
            deleted: { '$ne': true }
          });
          setTotalCompanyContacts(allCompanyContacts.length);
        }

        if (page > 1) {
          scrollToTop();
        }

      } else {
        throw new Error(response.data?.error || "Failed to load contacts from backend");
      }

      if (!user) {
        setUser(currentUser);
      }

    } catch (error) {
      console.error("❌ Error loading contacts:", error);
      showBannerFunc(error.message || 'Erro ao carregar contatos', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [
    debouncedSearchTerm,
    selectedCampaigns,
    selectedTags,
    selectedSystemTags,
    selectedImports,
    selectedResponsibles,
    sortBy,
    sortOrder,
    contactsPerPage,
    campaigns.length,
    availableTags.length,
    systemTags.length,
    importNames.length,
    responsibleNames.length,
    user,
    showBannerFunc,
    scrollToTop
  ]);

  // ✅ NOVO: Carregar limite de contatos
  const loadContactLimit = useCallback(async () => {
    if (!user?.company_id) return;
    try {
      const { data } = await base44.functions.invoke('getSubscriptionStatus');
      if (data?.success && data.has_active_subscription) {
        const planId = data.subscription.metadata?.plan_id;
        if (planId) {
          const currentPlan = await base44.entities.Plan.get(planId);
          setContactLimit(currentPlan.active_contacts);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar limite de contatos:", error);
      setContactLimit(null);
    }
  }, [user]);

  // ✅ NOVO: Verificar se existe sessão default
  const checkDefaultSession = useCallback(async () => {
    if (!user?.company_id) return;
    try {
      const sessions = await base44.entities.Session.filter({
        company_id: user.company_id,
        is_default: true,
        is_deleted: { '$ne': true },
        status: 'WORKING'
      });
      setHasDefaultSession(sessions.length > 0);
      if (sessions.length > 0) {
        setDefaultSessionName(sessions[0].session_name);
      }
    } catch (error) {
      console.error("Erro ao verificar sessão default:", error);
      setHasDefaultSession(false);
      setDefaultSessionName(null);
    }
  }, [user]);

  // NOVO: Função para atualizar fotos expiradas
  const handleRefreshPhotos = async () => {
    if (!defaultSessionName || !user?.company_id) {
      showBannerFunc('Nenhuma sessão ativa encontrada', 'error');
      return;
    }

    setIsRefreshingPhotos(true);
    let updatedCount = 0;

    try {
      const phonesToRefresh = contacts
        .filter(c => c.phone)
        .map(c => ({
          id: c.id,
          phone: c.phone,
          name: `${c.first_name} ${c.last_name}`
        }));

      for (const contact of phonesToRefresh) {
        try {
          const chatId = contact.phone.includes('@') ? contact.phone : `${contact.phone.replace(/\D/g, '')}@c.us`;
          
          const response = await base44.functions.invoke('getWaProfile', {
            sessionName: defaultSessionName,
            contactId: chatId
          });

          if (response.data?.profilePictureUrl) {
            await base44.entities.Contact.update(contact.id, {
              avatar_url: response.data.profilePictureUrl
            });
            updatedCount++;
          }
        } catch (error) {
          console.error(`Erro ao atualizar foto de ${contact.name}:`, error);
        }
      }

      if (updatedCount > 0) {
        showBannerFunc(`${updatedCount} foto(s) atualizada(s) com sucesso`, 'success');
        await loadData(currentPage, false);
      } else {
        showBannerFunc('Nenhuma foto foi atualizada', 'warning');
      }
    } catch (error) {
      console.error('Erro ao atualizar fotos:', error);
      showBannerFunc('Erro ao atualizar fotos', 'error');
    } finally {
      setIsRefreshingPhotos(false);
    }
  };



  useEffect(() => {
    if (user) {
      loadContactLimit();
      checkDefaultSession();
    }
  }, [user, loadContactLimit, checkDefaultSession]);

  // CARREGAMENTO INICIAL
  useEffect(() => {
    console.log("🚀 Initial load useEffect");
    loadData(1, true);
    checkForCreateAction();
  }, []);

  // RECARREGAR DADOS QUANDO FILTROS MUDAM
  useEffect(() => {
    if (user) {
      console.log("🔍 Filters changed, loading page 1");
      setIsLoading(true); // ✅ Mostrar loading imediatamente
      loadData(1, false);
    }
  }, [debouncedSearchTerm, selectedCampaigns, selectedTags, selectedSystemTags, selectedImports, selectedResponsibles, sortBy, sortOrder]);

  // Carregar preferências de visualização
  useEffect(() => {
    const loadUserViewPreferences = async () => {
      try {
        if (user?.settings?.view_preferences?.contacts) {
          const prefs = user.settings.view_preferences.contacts;
          if (prefs.viewMode && !localStorage.getItem('contacts_viewMode')) {
            setViewMode(prefs.viewMode);
          }
          if (prefs.gridColumns && !localStorage.getItem('contacts_gridColumns')) {
            setGridColumns(prefs.gridColumns);
          }
          if (prefs.listCompactness && !localStorage.getItem('contacts_listCompactness')) {
            setListCompactness(prefs.listCompactness);
          }
        }
      } catch (error) {
        console.error("Error loading view preferences:", error);
      }
    };

    if (user) {
      loadUserViewPreferences();
    }
  }, [user]);

  // NOVO: Escutar evento para abrir modal de progresso
  useEffect(() => {
    const handleOpenModal = () => {
      setIsProgressMinimized(false);
      setShowBulkDeleteProgress(true);
    };

    window.addEventListener('openBulkProgressModal', handleOpenModal);

    return () => {
      window.removeEventListener('openBulkProgressModal', handleOpenModal);
    };
  }, []);

  // ✅ NOVO: Escutar evento para abrir modal de importação
  useEffect(() => {
    const handleOpenImportProgress = () => {
      setIsImportProgressModalOpen(true);
      setIsImportMinimized(false);
    };

    window.addEventListener('openImportProgressModal', handleOpenImportProgress);

    return () => {
      window.removeEventListener('openImportProgressModal', handleOpenImportProgress);
    };
  }, []);

  // ✅ NOVO: Carregar estado de importação do localStorage
  useEffect(() => {
    let pollingInterval = null;
    
    const checkImportStatus = () => {
      try {
        const savedProgress = localStorage.getItem('importProgress');
        if (savedProgress) {
          const progress = JSON.parse(savedProgress);

          // ✅ Limpar localStorage se total for 0 ou inválido
          if (!progress.total || progress.total === 0) {
            console.log('[Contacts] 🧹 Limpando importProgress inválido (total=0)');
            localStorage.removeItem('importProgress');
            setImportProgress({
              isProcessing: false,
              total: 0,
              processed: 0,
              successful: 0,
              failed: 0,
              duplicates: 0,
              updated: 0,
              noWhatsApp: 0
            });
            if (pollingInterval) {
              clearInterval(pollingInterval);
              pollingInterval = null;
            }
            return;
          }

          setImportProgress({
            isProcessing: progress.isProcessing || false,
            total: progress.total || 0,
            processed: progress.processed || 0,
            successful: progress.successful || 0,
            failed: progress.failed || 0,
            duplicates: progress.duplicates || 0,
            updated: progress.updated || 0,
            noWhatsApp: progress.noWhatsApp || 0,
            status: progress.status || 'starting'
          });
          
          // ✅ Parar polling se completou
          if (progress.status === 'completed' || !progress.isProcessing) {
            console.log('[Contacts] ✅ Importação completa, parando polling');
            if (pollingInterval) {
              clearInterval(pollingInterval);
              pollingInterval = null;
            }
          }
        } else {
          // ✅ Sem dados no localStorage - limpar estado
          setImportProgress({
            isProcessing: false,
            total: 0,
            processed: 0,
            successful: 0,
            failed: 0,
            duplicates: 0,
            updated: 0,
            noWhatsApp: 0
          });
          if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
          }
        }
      } catch (error) {
        console.error('Error loading import status:', error);
      }
    };

    checkImportStatus();

    // ✅ Polling controlado
    pollingInterval = setInterval(() => {
      const savedProgress = localStorage.getItem('importProgress');
      if (savedProgress) {
        try {
          const progress = JSON.parse(savedProgress);
          
          // ✅ Parar polling SOMENTE se status = completed E usuário já viu (não vamos parar por isProcessing false automaticamente para não sumir o modal)
          // Mas se total=0, é inválido, então para.
          if (!progress.total || progress.total === 0) {
            if (pollingInterval) {
              clearInterval(pollingInterval);
              pollingInterval = null;
            }
            return;
          }
          
          // Continuar polling mesmo se completed, para garantir sincronia final
          checkImportStatus();
        } catch (error) {
          // Ignorar erro de parse
        }
      }
    }, 800); // ✅ Polling um pouco mais rápido

    const handleStorageChange = (e) => {
      if (e.key === 'importProgress') {
        if (e.newValue) {
          try {
            const progress = JSON.parse(e.newValue);
            
            // ✅ Ignorar se total = 0
            if (!progress.total || progress.total === 0) {
              console.log('[Contacts] 🧹 Storage mudou mas total=0, ignorando');
              return;
            }
            
            setImportProgress({
              isProcessing: progress.isProcessing || false,
              total: progress.total || 0,
              processed: progress.processed || 0,
              successful: progress.successful || 0,
              failed: progress.failed || 0,
              duplicates: progress.duplicates || 0,
              updated: progress.updated || 0,
              noWhatsApp: progress.noWhatsApp || 0,
              status: progress.status || 'starting'
            });
          } catch (error) {
            console.error('Error parsing storage change:', error);
          }
        } else {
          setImportProgress({
            isProcessing: false,
            total: 0,
            processed: 0,
            successful: 0,
            failed: 0,
            duplicates: 0,
            updated: 0,
            noWhatsApp: 0
          });
        }
      }
    };

    const handleImportProgressUpdate = (e) => {
      // ✅ Ignorar se total = 0
      if (!e.detail.total || e.detail.total === 0) {
        console.log('[Contacts] 🧹 Evento com total=0, ignorando');
        return;
      }
      
      console.log('[Contacts] 📥 WebSocket update:', e.detail);
      setImportProgress({
        isProcessing: e.detail.isProcessing || false,
        total: e.detail.total || 0,
        processed: e.detail.processed || 0,
        successful: e.detail.successful || 0,
        failed: e.detail.failed || 0,
        duplicates: e.detail.duplicates || 0,
        updated: e.detail.updated || 0,
        noWhatsApp: e.detail.noWhatsApp || 0,
        status: e.detail.status || 'starting'
      });
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('importProgressUpdate', handleImportProgressUpdate);

    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('importProgressUpdate', handleImportProgressUpdate);
    };
  }, []);

  // NOVO: Carregar estado de processamento do localStorage ao montar E manter polling para sincronização
  useEffect(() => {
    // Carregamento inicial do estado
    try {
      const savedProgress = localStorage.getItem('bulkContactsProgress');
      if (savedProgress) {
        const progress = JSON.parse(savedProgress);
        if (progress.isProcessing) {
          setBulkProgress({
            total: progress.total || 0,
            processed: progress.processed || 0,
            successful: progress.successful || 0,
            failed: progress.failed || 0
          });
          setIsProcessingInBackground(progress.isProcessing || false);
          setBackgroundProcessType(progress.processType || null);
          setIsProgressMinimized(true); // Começa minimizado se estava processando
          setShowBulkDeleteProgress(true); // ✅ Abrir modal automaticamente
        }
      }
    } catch (error) {
      console.error('Error loading initial processing status from localStorage:', error);
    }

    // Polling para sincronizar estado do localStorage
    const syncInterval = setInterval(() => {
      try {
        const savedProgress = localStorage.getItem('bulkContactsProgress');
        if (savedProgress) {
          const progress = JSON.parse(savedProgress);
          
          // Atualizar estado local
          setBulkProgress({
            total: progress.total || 0,
            processed: progress.processed || 0,
            successful: progress.successful || 0,
            failed: progress.failed || 0
          });
          setIsProcessingInBackground(progress.isProcessing || false);
          setBackgroundProcessType(progress.processType || null);
        } else {
          // Se não há dados, limpar estados locais
          setIsProcessingInBackground(false);
          setBackgroundProcessType(null);
          setBulkProgress({
            total: 0,
            processed: 0,
            successful: 0,
            failed: 0
          });
        }
      } catch (error) {
        console.error('Error syncing processing status from localStorage:', error);
      }
    }, 500); // Poll every 500ms

    // ✅ NOVO: Escutar eventos de WebSocket
    const handleBulkProgressEvent = (e) => {
      console.log('[Contacts] 📥 WebSocket bulk progress:', e.detail);
      
      const progress = e.detail;
      setBulkProgress({
        total: progress.total || 0,
        processed: progress.processed || 0,
        successful: progress.successful || 0,
        failed: progress.failed || 0
      });

      // Atualizar localStorage também
      const progressData = {
        isProcessing: progress.status !== 'completed',
        processType: backgroundProcessType,
        total: progress.total || 0,
        processed: progress.processed || 0,
        successful: progress.successful || 0,
        failed: progress.failed || 0
      };
      localStorage.setItem('bulkContactsProgress', JSON.stringify(progressData));
    };

    window.addEventListener('bulkDeleteProgressUpdate', handleBulkProgressEvent);

    return () => {
      clearInterval(syncInterval);
      window.removeEventListener('bulkDeleteProgressUpdate', handleBulkProgressEvent);
    };
  }, [backgroundProcessType]);

  // NOVO: Salvar progresso no localStorage sempre que mudar E disparar evento
  useEffect(() => {
    const progressData = {
      isProcessing: isProcessingInBackground,
      processType: backgroundProcessType,
      total: bulkProgress.total,
      processed: bulkProgress.processed,
      successful: bulkProgress.successful,
      failed: bulkProgress.failed
    };

    localStorage.setItem('bulkContactsProgress', JSON.stringify(progressData));
    
    // Disparar evento customizado para atualizar o Layout
    window.dispatchEvent(new CustomEvent('bulkProgressUpdate', { detail: progressData }));
  }, [isProcessingInBackground, backgroundProcessType, bulkProgress]);

  // NOVO: Sincronizar estado showBulkDeleteProgress com o Layout
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('bulkProgressModalStateChange', { 
      detail: { isOpen: showBulkDeleteProgress } 
    }));
  }, [showBulkDeleteProgress]);


  // NOVO: Cleanup - garantir que o processamento não seja interrompido ao desmontar
  useEffect(() => {
    return () => {
      // Quando o componente desmontar, não cancelar o processamento
      console.log('Component unmounting, but processing continues in background');
    };
  }, []);

  // FUNÇÃO PARA SUBMISSÃO DE CONTATO
  // ✅ IMPORTANTE: Esta função é chamada APÓS o modal já ter criado/atualizado o contato com sucesso
  // O modal já faz a chamada createSingleContact/saveContact, então aqui apenas recarregamos a lista
  const handleContactSubmit = async (contactData) => {
    console.log('[Contacts] ✅ Contato salvo com sucesso pelo modal, recarregando lista...');
    
    // Fechar modal e limpar estado
    setShowForm(false);
    setEditingContact(null);
    
    // Recarregar lista de contatos
    loadData(1, false);
    
    // Mostrar mensagem de sucesso
    const isUpdate = contactData?.id && editingContact?.id;
    showBannerFunc(
      isUpdate ? 'Contato atualizado com sucesso!' : 'Contato criado com sucesso!', 
      'success'
    );
  };

  // FUNÇÃO PARA LIDAR COM DUPLICATAS
  const handleDuplicateUpdate = async () => {
    if (!duplicateData || !user?.company_id) return;

    const startTime = Date.now();
    try {
      const saveResult = await saveContact({
        contactData: duplicateData.newContactData,
        editingContactId: duplicateData.existingContact.id,
        company_id: user.company_id
      });

      if (saveResult?.data?.success) {
        showBannerFunc('Contato existente atualizado com sucesso!', 'success');

        try {
          await createSystemLog({}, {
            company_id: user.company_id,
            user_id: user.id,
            action: 'update_duplicate_resolution',
            resource_type: 'contact',
            resource_id: duplicateData.existingContact.id,
            status: 'success',
            method: 'PUT',
            endpoint: 'Contact.update',
            request_data: duplicateData.newContactData,
            duration_ms: Date.now() - startTime,
            metadata: {
              operation_type: 'duplicate_resolution',
              resolution_action: 'update_existing',
              duplicate_field: duplicateData.duplicateField,
              duplicate_value: duplicateData.duplicateValue
            }
          });
        } catch (logError) {
          console.error('Error logging duplicate resolution:', logError);
        }

        setShowForm(false);
        setEditingContact(null);
        setShowDuplicateModal(false);
        setDuplicateData(null);
        loadData(1, false);
      } else {
        throw new Error(saveResult?.data?.message || saveResult?.data?.error || 'Erro desconhecido ao atualizar contato existente');
      }

    } catch (error) {
      console.error("Error updating existing contact:", error);
      showBannerFunc('Erro ao atualizar contato existente', 'error');
      try {
        await createSystemLog({}, {
          company_id: user.company_id,
          user_id: user.id,
          action: 'update_duplicate_resolution',
          resource_type: 'contact',
          resource_id: duplicateData.existingContact.id,
          status: 'error',
          method: 'PUT',
          endpoint: 'Contact.update',
          request_data: duplicateData.newContactData,
          error_message: error.message,
          error_stack: error.stack,
          duration_ms: Date.now() - startTime,
          metadata: {
            operation_type: 'duplicate_resolution',
            resolution_action: 'update_existing'
          }
        });
      } catch (logError) {
        console.error('Error logging duplicate resolution failure:', logError);
      }
    }
  };

  const handleDuplicateCreateNew = async () => {
    if (!duplicateData || !user?.company_id) return;

    const startTime = Date.now();
    try {
      const saveResult = await saveContact({
        contactData: duplicateData.newContactData,
        editingContactId: null,
        company_id: user.company_id
      });

      if (saveResult?.data?.success) {
        showBannerFunc('Novo contato criado (duplicata ignorada)', 'warning');

        try {
          await createSystemLog({}, {
            company_id: user.company_id,
            user_id: user.id,
            action: 'create_duplicate_override',
            resource_type: 'contact',
            resource_id: saveResult.data.contact.id,
            status: 'warning',
            method: 'POST',
            endpoint: 'Contact.create',
            request_data: duplicateData.newContactData,
            duration_ms: Date.now() - startTime,
            metadata: {
              operation_type: 'duplicate_resolution',
              resolution_action: 'create_anyway',
              duplicate_of: duplicateData.existingContact.id,
              duplicate_field: duplicateData.duplicateField,
              duplicate_value: duplicateData.duplicateValue
            }
          });
        } catch (logError) {
          console.error('Error logging duplicate resolution:', logError);
        }

        setShowForm(false);
        setEditingContact(null);
        setShowDuplicateModal(false);
        setDuplicateData(null);
        loadData(1, false);
      } else {
        throw new Error(saveResult?.data?.message || saveResult?.data?.error || 'Erro desconhecido ao criar novo contato');
      }

    } catch (error) {
      console.error("Error creating new contact:", error);
      showBannerFunc('Erro ao criar novo contato', 'error');
      try {
        await createSystemLog({}, {
          company_id: user.company_id,
          user_id: user.id,
          action: 'create_duplicate_override',
          resource_type: 'contact',
          resource_id: null,
          status: 'error',
          method: 'POST',
          endpoint: 'Contact.create',
          request_data: duplicateData.newContactData,
          error_message: error.message,
          error_stack: error.stack,
          duration_ms: Date.now() - startTime,
          metadata: {
            operation_type: 'duplicate_resolution',
            resolution_action: 'create_anyway'
          }
        });
      } catch (logError) {
        console.error('Error logging duplicate resolution failure:', logError);
      }
    }
  };

  const handleDuplicateCancel = () => {
    setShowDuplicateModal(false);
    setDuplicateData(null);
  };

  const handleImportSuccess = async (result) => {
    console.log('[Contacts] 🎉 Import iniciado:', result);
    
    // ✅ Não fechar modal - deixar aberto para acompanhar progresso
    setShowImportModal(false);
    setIsImportProgressModalOpen(true);
    setIsImportMinimized(false);
  };

  const handleImportComplete = async (importData) => {
    setShowImportProgress(false);
    setCurrentImportJobId(null);

    const startTime = Date.now();
    let logData;

    if (importData.status === 'completed') {
      const message = `Importação concluída! ${importData.successful_records} contatos importados${importData.failed_records > 0 ? `, ${importData.failed_records} falharam` : ''}`;
      showBannerFunc(message, importData.failed_records > 0 ? 'warning' : 'success');

      setShowPostImportLoading(true);
      loadData(1, false);

      setTimeout(() => {
        setShowPostImportLoading(false);
      }, 1500);

      logData = {
        company_id: user?.company_id,
        user_id: user?.id,
        action: 'import_complete',
        resource_type: 'contact_import_job',
        resource_id: importData.import_job_id,
        status: importData.failed_records > 0 ? 'warning' : 'success',
        method: 'GET',
        endpoint: 'Contact.import.status',
        response_data: {
          message: message,
          successful_records: importData.successful_records,
          failed_records: importData.failed_records
        },
        duration_ms: Date.now() - startTime,
        metadata: {
          operation_type: 'contact_import_job_completion'
        }
      };

    } else if (importData.status === 'failed') {
      showBannerFunc('Importação falhou. Verifique os dados e tente novamente.', 'error');

      logData = {
        company_id: user?.company_id,
        user_id: user?.id,
        action: 'import_complete',
        resource_type: 'contact_import_job',
        resource_id: importData.import_job_id,
        status: 'error',
        method: 'GET',
        endpoint: 'Contact.import.status',
        error_message: 'Import job failed',
        response_data: importData,
        duration_ms: Date.now() - startTime,
        metadata: {
          operation_type: 'contact_import_job_completion'
        }
      };
    }

    try {
      if (logData) {
        await createSystemLog({}, logData);
      }
    } catch (logError) {
      console.error('Error logging import job completion:', logError);
    }
  };

  const handleEdit = (contact) => {
    setEditingContact(contact);
    setShowForm(true);
  };

  const handleView = (contact) => {
    setViewingContact(contact);
    setShowDetailsModal(true);
  };

  const handleChat = (contact) => {
    // Navegar para Chat com o chat_id do contato
    const chatId = contact.phone ? `${contact.phone.replace(/\D/g, '')}@c.us` : '';
    navigate(createPageUrl('Chat'), { 
      state: { 
        selectedChatId: chatId,
        contact: contact
      } 
    });
  };

  const handleHistory = (contact) => {
    setHistoryContact(contact);
    setShowHistoryModal(true);
  };

  const handleAssignTag = (contact) => {
    setAssignTagContact(contact);
    setShowQuickAssignTag(true);
  };

  const handleAssignTagSuccess = (message) => {
    showBannerFunc(message, 'success');
    loadData(currentPage, false);
  };

  // NOVO: Funções de seleção
  const toggleSelection = (contactId) => {
    setSelectedContactIds(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const selectAll = () => {
    const allIds = contacts.map(c => c.id);
    setSelectedContactIds(allIds);
  };

  const deselectAll = () => {
    setSelectedContactIds([]);
  };

  const handleBulkAssignTags = () => {
    setShowBulkAssignTags(true);
  };

  const handleBulkAssignTagsSuccess = (message) => {
    showBannerFunc(message, 'success');
    setShowBulkAssignTags(false);
    setSelectedContactIds([]);
    setSelectionMode(false);
    loadData(currentPage, false);
  };

  const handleDelete = async (contact) => {
    setContactToDelete(contact);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!contactToDelete) return;
    
    const startTime = Date.now();
    setShowDeleteDialog(false);
    
    try {
      // ✅ EXCLUSÃO PERMANENTE
      await base44.entities.Contact.delete(contactToDelete.id);
      showBannerFunc('Contato excluído permanentemente!', 'success');
      loadData(currentPage, false);

        try {
          await createSystemLog({}, {
            company_id: user?.company_id,
            user_id: user?.id,
            action: 'delete',
            resource_type: 'contact',
            resource_id: contactToDelete.id,
            status: 'success',
            method: 'DELETE',
            endpoint: 'Contact.delete',
            request_data: { contact_id: contactToDelete.id },
            response_data: { message: 'Contact deleted successfully' },
            duration_ms: Date.now() - startTime,
            metadata: {
              operation_type: 'manual_delete'
            }
          });
        } catch (logError) {
          console.error('Error logging contact deletion:', logError);
        }

      } catch (error) {
        console.error("Error deleting contact:", error);
        showBannerFunc('Erro ao excluir contato', 'error');

        try {
          await createSystemLog({}, {
            company_id: user?.company_id,
            user_id: user?.id,
            action: 'delete',
            resource_type: 'contact',
            resource_id: contactToDelete.id,
            status: 'error',
            method: 'DELETE',
            endpoint: 'Contact.delete',
            request_data: { contact_id: contactToDelete.id },
            error_message: error.message,
            error_stack: error.stack,
            duration_ms: Date.now() - startTime,
            metadata: {
              operation_type: 'manual_delete'
            }
          });
        } catch (logError) {
          console.error('Error logging contact deletion failure:', logError);
        }
      } finally {
        setContactToDelete(null);
      }
  };

  const handleBulkDelete = async (deleteData) => {
    if (!user || !user.company_id || !user.id) {
      showBannerFunc('Erro: Dados de autenticação do usuário não disponíveis para exclusão em massa.', 'error');
      return;
    }

    const contactsToDelete = deleteData.contactIds;
    const totalContacts = contactsToDelete.length;

    console.log(`🗑️ Iniciando delete de ${totalContacts} contatos`);

    // Reset cancelamento
    cancelProcessingRef.current = false;
    setIsCancelling(false);

    // Inicializar progresso
    const initialProgress = {
      total: totalContacts,
      processed: 0,
      successful: 0,
      failed: 0
    };
    
    setBulkProgress(initialProgress);
    setShowBulkDelete(false);
    setIsProcessingInBackground(true);
    setBackgroundProcessType('delete');
    setIsProgressMinimized(false);
    setShowBulkDeleteProgress(true);

    // Salvar no localStorage imediatamente
    const initialData = {
      isProcessing: true,
      processType: 'delete',
      ...initialProgress
    };
    localStorage.setItem('bulkContactsProgress', JSON.stringify(initialData));
    window.dispatchEvent(new CustomEvent('bulkProgressUpdate', { detail: initialData }));

    // ✅ NOVO: Enviar TODOS os IDs de uma vez para o backend
    try {
      console.log(`📤 Enviando ${totalContacts} contatos para backend processar...`);
      
      const result = await bulkDeleteContacts({
        contactIds: contactsToDelete,
        restore: false
      });

      console.log('📥 Resultado do backend:', result.data);

      // Finalizar processamento
      const finalData = {
        isProcessing: false,
        processType: null,
        total: 0,
        processed: 0,
        successful: 0,
        failed: 0
      };

      localStorage.setItem('bulkContactsProgress', JSON.stringify(finalData));
      window.dispatchEvent(new CustomEvent('bulkProgressUpdate', { detail: finalData }));

      setIsProcessingInBackground(false);
      setBackgroundProcessType(null);
      setIsProgressMinimized(false);
      setShowBulkDeleteProgress(false);

      if (result.data && result.data.success) {
        if (result.data.successful > 0) {
          showBannerFunc(`✅ ${result.data.successful} contato(s) deletado(s) com sucesso!`, 'success');
        }
        if (result.data.failed > 0) {
          showBannerFunc(`⚠️ ${result.data.failed} contato(s) falharam na exclusão.`, 'warning');
        }
      }

      await loadData(currentPage, false);
    } catch (error) {
      console.error("❌ Erro ao deletar contatos:", error);
      
      const errorData = {
        isProcessing: false,
        processType: null,
        total: 0,
        processed: 0,
        successful: 0,
        failed: 0
      };
      
      localStorage.setItem('bulkContactsProgress', JSON.stringify(errorData));
      window.dispatchEvent(new CustomEvent('bulkProgressUpdate', { detail: errorData }));
      
      setIsProcessingInBackground(false);
      setBackgroundProcessType(null);
      setShowBulkDeleteProgress(false);
      showBannerFunc('❌ Erro ao deletar contatos.', 'error');
    }
  };

  const handleRestoreContacts = async (contactIds) => {
    if (!user || !user.company_id || !user.id) {
      showBannerFunc('Erro: Dados de autenticação do usuário não disponíveis para restauração em massa.', 'error');
      return;
    }

    const totalContacts = contactIds.length;

    console.log(`♻️ Iniciando restore de ${totalContacts} contatos`);

    // Reset cancelamento
    cancelProcessingRef.current = false;
    setIsCancelling(false);

    // Inicializar progresso
    const initialProgress = {
      total: totalContacts,
      processed: 0,
      successful: 0,
      failed: 0
    };

    setBulkProgress(initialProgress);
    setIsProcessingInBackground(true);
    setBackgroundProcessType('restore');
    setIsProgressMinimized(false);
    setShowBulkDeleteProgress(true);

    // Salvar no localStorage imediatamente
    const initialData = {
      isProcessing: true,
      processType: 'restore',
      ...initialProgress
    };
    localStorage.setItem('bulkContactsProgress', JSON.stringify(initialData));
    window.dispatchEvent(new CustomEvent('bulkProgressUpdate', { detail: initialData }));

    // ✅ NOVO: Enviar TODOS os IDs de uma vez para o backend
    try {
      console.log(`📤 Enviando ${totalContacts} contatos para backend processar...`);
      
      const result = await bulkDeleteContacts({
        contactIds: contactIds,
        restore: true
      });

      console.log('📥 Resultado do backend:', result.data);

      // Finalizar processamento
      const finalData = {
        isProcessing: false,
        processType: null,
        total: 0,
        processed: 0,
        successful: 0,
        failed: 0
      };

      localStorage.setItem('bulkContactsProgress', JSON.stringify(finalData));
      window.dispatchEvent(new CustomEvent('bulkProgressUpdate', { detail: finalData }));

      setIsProcessingInBackground(false);
      setBackgroundProcessType(null);
      setIsProgressMinimized(false);
      setShowBulkDeleteProgress(false);

      if (result.data && result.data.success) {
        if (result.data.successful > 0) {
          showBannerFunc(`✅ ${result.data.successful} contato(s) restaurado(s) com sucesso!`, 'success');
        }
        if (result.data.failed > 0) {
          showBannerFunc(`⚠️ ${result.data.failed} contato(s) falharam na restauração.`, 'warning');
        }
      }

      await loadData(currentPage, false);
    } catch (error) {
      console.error("❌ Erro ao restaurar contatos:", error);
      
      const errorData = {
        isProcessing: false,
        processType: null,
        total: 0,
        processed: 0,
        successful: 0,
        failed: 0
      };
      
      localStorage.setItem('bulkContactsProgress', JSON.stringify(errorData));
      window.dispatchEvent(new CustomEvent('bulkProgressUpdate', { detail: errorData }));
      
      setIsProcessingInBackground(false);
      setBackgroundProcessType(null);
      setShowBulkDeleteProgress(false);
      showBannerFunc('❌ Erro ao restaurar contatos.', 'error');
    }
  };

  const handleCancelProcessing = () => {
    if (window.confirm('Tem certeza que deseja cancelar o processamento? Os contatos já processados não serão revertidos.')) {
      setIsCancelling(true);
      cancelProcessingRef.current = true;
    }
  };

  const toggleCampaignFilter = (campaignId) => {
    setSelectedCampaigns(prev =>
      prev.includes(campaignId)
        ? prev.filter(id => id !== campaignId)
        : [...prev, campaignId]
    );
  };

  const toggleTagFilter = (tagName) => {
    setSelectedTags(prev =>
      prev.includes(tagName)
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    );
  };

  const removeTagFilter = (tagName) => {
    setSelectedTags(prev => prev.filter(t => t !== tagName));
  };

  const toggleSystemTagFilter = (systemTagId) => {
    setSelectedSystemTags(prev =>
      prev.includes(systemTagId)
        ? prev.filter(id => id !== systemTagId)
        : [...prev, systemTagId]
    );
  };

  const removeSystemTagFilter = (systemTagId) => {
    setSelectedSystemTags(prev => prev.filter(id => id !== systemTagId));
  };

  const toggleImportFilter = (importName) => {
    setSelectedImports(prev =>
      prev.includes(importName)
        ? prev.filter(name => name !== importName)
        : [...prev, importName]
    );
  };

  const removeImportFilter = (importName) => {
    setSelectedImports(prev => prev.filter(name => name !== importName));
  };

  const toggleResponsibleFilter = (responsibleName) => {
    setSelectedResponsibles(prev =>
      prev.includes(responsibleName)
        ? prev.filter(name => name !== responsibleName)
        : [...prev, responsibleName]
    );
  };

  const removeResponsibleFilter = (responsibleName) => {
    setSelectedResponsibles(prev => prev.filter(name => name !== responsibleName));
  };

  const removeCampaignFilter = (campaignId) => {
    setSelectedCampaigns(prev => prev.filter(id => id !== campaignId));
  };

  const getSelectedCampaignNames = () => {
    return campaigns
      .filter(c => selectedCampaigns.includes(c.id))
      .map(c => c.name);
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages && page !== currentPage && !isLoading) {
      console.log(`🔄 User requested page ${page}`);
      loadData(page, false);
    }
  };

  // handleBulkDeleteComplete is no longer necessary as completion is handled directly in handleBulkDelete and handleRestoreContacts
  // Its body is removed but the declaration is kept to avoid breaking other parts of the code if it's called somewhere else
  const handleBulkDeleteComplete = async (result) => {
    // This function is now effectively unused if handleBulkDelete and handleRestoreContacts
    // directly handle the completion logic and banner display.
    // If it were still used, its content would look something like the old implementation:
    // setShowBulkDeleteProgress(false);
    // setBulkDeleteData(null);
    // if (result.deleted > 0) { showBannerFunc(`${result.deleted} contatos excluídos com sucesso!`, 'success'); loadData(1, false); }
    // if (result.failed > 0) { showBannerFunc(`${result.failed} contatos falharam na exclusão.`, 'warning'); loadData(1, false); }
  };


  if (isLoading && contacts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto overflow-hidden">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690a8ae384e85f405dd1958f/8d6af0619_ChatGPTImage24denovde202519_02_27.png"
              alt="Sparta Sync"
              className="w-16 h-16 object-contain"
              onError={(e) => {
                console.error('Logo failed to load on Contacts page');
                e.target.onerror = null;
                e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"%3E%3Ctext x="50%25" y="50%25" font-size="24" text-anchor="middle" dominant-baseline="middle"%3ESS%3C/text%3E%3C/svg%3E';
              }}
            />
            <div className="shine-effect"></div>
          </div>
          <style>
            {`
              @keyframes shine {
                0% {
                  transform: translateX(-100%) translateY(100%) rotate(-45deg);
                  opacity: 0;
                }
                50% {
                  opacity: 1;
                }
                100% {
                  transform: translateX(100%) translateY(-100%) rotate(-45deg);
                  opacity: 0;
                }
              }
              .shine-effect {
                position: absolute;
                top: -50%;
                left: -50%;
                width: 250%;
                height: 250%;
                background: linear-gradient(
                  to right,
                  rgba(255, 255, 255, 0) 0%,
                  rgba(255, 255, 255, 0) 20%,
                  rgba(255, 255, 255, 0.8) 50%,
                  rgba(255, 255, 255, 0) 80%,
                  rgba(255, 255, 255, 0) 100%
                );
                animation: shine 2.5s ease-in-out infinite;
                pointer-events: none;
              }
            `}
          </style>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Contatos</h1>
              <p className="text-sm sm:text-base text-gray-600 hidden sm:block">
                Gerencie seus contatos e relacionamentos
              </p>
            </div>
          </div>

          {/* Contador de Contatos */}
          {contactLimit !== null && (
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 self-start sm:self-auto">
              <Users className="w-4 h-4 text-gray-600 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-900 whitespace-nowrap">
                {totalCompanyContacts} / {contactLimit === -1 ? '∞' : contactLimit}
              </span>
              <span className="text-xs text-gray-600 whitespace-nowrap">contatos ativos</span>
            </div>
          )}
        </div>

        {/* Message Alert */}
        {banner.show && (
          <Alert className={`rounded-2xl ${banner.type === 'error' ? 'border-red-200 bg-red-50' : banner.type === 'warning' ? 'border-yellow-200 bg-yellow-50' : 'border-green-200 bg-green-50'}`}>
            {banner.type === 'error' ? (
              <AlertCircle className="h-4 w-4 text-red-600" />
            ) : banner.type === 'warning' ? (
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            )}
            <AlertDescription className={banner.type === 'error' ? 'text-red-800' : banner.type === 'warning' ? 'text-yellow-800' : 'text-green-800'}>
              {banner.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Toolbar */}
        <div className="flex flex-col gap-3">
          {/* Mobile: Botões primeiro */}
          <div className="flex gap-2 w-full sm:hidden">
            <div className="flex gap-1 border rounded-xl p-1 bg-white">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => {
                  setViewMode('grid');
                  saveViewPreferences({ viewMode: 'grid' });
                }}
                className="h-8 w-8 rounded-lg"
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => {
                  setViewMode('list');
                  saveViewPreferences({ viewMode: 'list' });
                }}
                className="h-8 w-8 rounded-lg"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>

            <Button
              variant="outline"
              onClick={() => loadData(currentPage, true)}
              disabled={isLoading}
              className="rounded-xl h-10 w-10 p-0"
              size="icon"
              title="Atualizar"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="rounded-xl h-10 w-10 p-0"
                  size="icon"
                  disabled={!hasDefaultSession || isRefreshingPhotos}
                  title="Mais opções"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="rounded-xl">
                <DropdownMenuItem 
                  onClick={handleRefreshPhotos}
                  disabled={isRefreshingPhotos}
                  className="rounded-lg"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshingPhotos ? 'animate-spin' : ''}`} />
                  Atualizar Fotos
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              onClick={() => {
                if (isProcessingInBackground) {
                  setShowBulkDeleteProgress(true);
                  setIsProgressMinimized(false);
                } else {
                  setShowBulkDelete(true);
                }
              }}
              variant="outline"
              className="rounded-xl h-10 w-10 p-0"
              size="icon"
            >
              <Trash2 className={`w-4 h-4 ${isProcessingInBackground ? 'text-red-500 animate-pulse' : ''}`} />
            </Button>

            <Button
              onClick={() => setShowImportModal(true)}
              variant="outline"
              className="rounded-xl h-10 w-10 p-0"
              size="icon"
              disabled={!hasDefaultSession}
            >
              <Upload className="w-4 h-4" />
            </Button>

            <Button
              onClick={() => {
                setEditingContact(null);
                setShowForm(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 rounded-xl flex-1"
              disabled={!hasDefaultSession}
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Contato
            </Button>
          </div>

          {/* Mobile: Ordenação */}
          <div className="flex gap-2 sm:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="rounded-xl flex-1 justify-between">
                  <span className="flex items-center gap-2">
                    <ArrowUpDown className="w-4 h-4" />
                    {sortBy === 'name' ? 'Nome' : 
                     sortBy === 'email' ? 'Email' : 
                     sortBy === 'company' ? 'Empresa' : 
                     sortBy === 'created_date' ? 'Data' : 
                     sortBy === 'value' ? 'Valor' : 'Ordenar'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48 rounded-xl">
                {[
                  { value: 'name', label: 'Nome' },
                  { value: 'email', label: 'Email' },
                  { value: 'company', label: 'Empresa' },
                  { value: 'created_date', label: 'Data de Criação' },
                  { value: 'value', label: 'Valor' }
                ].map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={(e) => {
                      e.preventDefault();
                      if (sortBy === option.value) {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortBy(option.value);
                        setSortOrder('asc');
                      }
                    }}
                    className="rounded-lg flex justify-between cursor-pointer"
                  >
                    <span>{option.label}</span>
                    {sortBy === option.value && (
                      <span className="text-blue-600 font-medium">
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile: Barra de pesquisa */}
          <div className="relative w-full sm:hidden">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar contatos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>

          {/* Desktop: Tudo na mesma linha */}
          <div className="hidden sm:flex gap-2 items-center">
            {/* Barra de pesquisa */}
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar contatos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-xl"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="rounded-xl w-44 justify-between">
                  <span className="flex items-center gap-2">
                    <ArrowUpDown className="w-4 h-4" />
                    {sortBy === 'name' ? 'Nome' : 
                     sortBy === 'email' ? 'Email' : 
                     sortBy === 'company' ? 'Empresa' : 
                     sortBy === 'created_date' ? 'Data de Criação' : 
                     sortBy === 'value' ? 'Valor' : 'Ordenar por'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-44 rounded-xl">
                {[
                  { value: 'name', label: 'Nome' },
                  { value: 'email', label: 'Email' },
                  { value: 'company', label: 'Empresa' },
                  { value: 'created_date', label: 'Data de Criação' },
                  { value: 'value', label: 'Valor' }
                ].map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={(e) => {
                      e.preventDefault();
                      if (sortBy === option.value) {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortBy(option.value);
                        setSortOrder('asc');
                      }
                    }}
                    className="rounded-lg flex justify-between cursor-pointer"
                  >
                    <span>{option.label}</span>
                    {sortBy === option.value && (
                      <span className="text-blue-600 font-medium">
                        {sortOrder === 'asc' ? '↑ Cresc.' : '↓ Decresc.'}
                      </span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex gap-1 border rounded-xl p-1">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => {
                  setViewMode('grid');
                  saveViewPreferences({ viewMode: 'grid' });
                }}
                className="h-8 w-8 rounded-lg"
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => {
                  setViewMode('list');
                  saveViewPreferences({ viewMode: 'list' });
                }}
                className="h-8 w-8 rounded-lg"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>

            <Button
              variant="outline"
              onClick={() => loadData(currentPage, true)}
              disabled={isLoading}
              className="rounded-xl h-10 w-10 p-0"
              size="icon"
              title="Atualizar"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="rounded-xl h-10 w-10 p-0"
                  size="icon"
                  disabled={!hasDefaultSession || isRefreshingPhotos}
                  title="Mais opções"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="rounded-xl">
                <DropdownMenuItem 
                  onClick={handleRefreshPhotos}
                  disabled={isRefreshingPhotos}
                  className="rounded-lg"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshingPhotos ? 'animate-spin' : ''}`} />
                  Atualizar Fotos
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              onClick={() => {
                if (isProcessingInBackground) {
                  setShowBulkDeleteProgress(true);
                  setIsProgressMinimized(false);
                } else {
                  setShowBulkDelete(true);
                }
              }}
              variant="outline"
              className="rounded-xl h-10 w-10 p-0"
              size="icon"
              title={isProcessingInBackground
                ? `${backgroundProcessType === 'delete' ? 'Deletando' : 'Restaurando'} contatos...`
                : 'Excluir em massa'
              }
            >
              <Trash2 className={`w-4 h-4 ${isProcessingInBackground ? 'text-red-500 animate-pulse' : ''}`} />
            </Button>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => setShowImportModal(true)}
                    variant="outline"
                    className="rounded-xl h-10 w-10 p-0"
                    size="icon"
                    disabled={!hasDefaultSession}
                    title="Importar"
                  >
                    <Upload className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                {!hasDefaultSession && (
                  <TooltipContent className="rounded-lg">
                    <p>Você precisa conectar uma sessão e defini-la como padrão</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => {
                      setEditingContact(null);
                      setShowForm(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 rounded-xl"
                    disabled={!hasDefaultSession}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Contato
                  </Button>
                </TooltipTrigger>
                {!hasDefaultSession && (
                  <TooltipContent className="rounded-lg">
                    <p>Você precisa conectar uma sessão e defini-la como padrão</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center">
          {/* NOVO: Botão Seleção */}
          <Button
            variant={selectionMode ? "default" : "outline"}
            onClick={() => {
              setSelectionMode(!selectionMode);
              if (selectionMode) {
                setSelectedContactIds([]);
              }
            }}
            className="rounded-xl"
          >
            {selectionMode ? <CheckSquare className="w-4 h-4 mr-2" /> : <Square className="w-4 h-4 mr-2" />}
            Seleção
          </Button>

          <DropdownMenu open={campaignFilterOpen} onOpenChange={setCampaignFilterOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="rounded-xl">
                <Filter className="w-4 h-4 mr-2" />
                Campanhas ({selectedCampaigns.length})
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 rounded-xl p-4 max-h-96 overflow-y-auto">
              <div className="space-y-2">
                <p className="font-medium text-sm text-gray-900 mb-3">Selecionar Campanhas</p>
                {campaigns.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-2">Nenhuma campanha disponível</p>
                ) : (
                  campaigns.map((campaign) => (
                    <div key={campaign.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`campaign-${campaign.id}`}
                        checked={selectedCampaigns.includes(campaign.id)}
                        onCheckedChange={() => toggleCampaignFilter(campaign.id)}
                      />
                      <label
                        htmlFor={`campaign-${campaign.id}`}
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                        {campaign.name}
                      </label>
                    </div>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu open={tagFilterOpen} onOpenChange={setTagFilterOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="rounded-xl">
                <TagIcon className="w-4 h-4 mr-2" />
                Marcadores ({selectedTags.length})
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 rounded-xl p-4 max-h-64 overflow-y-auto">
              <div className="space-y-2">
                <p className="font-medium text-sm text-gray-900 mb-3">Selecionar Marcadores</p>
                {availableTags.map((tag) => (
                  <div key={tag.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`tag-${tag.id}`}
                      checked={selectedTags.includes(tag.name)}
                      onCheckedChange={() => toggleTagFilter(tag.name)}
                    />
                    <label
                      htmlFor={`tag-${tag.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {tag.name}
                    </label>
                  </div>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu open={systemTagFilterOpen} onOpenChange={setSystemTagFilterOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="rounded-xl">
                <AlertCircle className="w-4 h-4 mr-2" />
                Marcadores de Sistema ({selectedSystemTags.length})
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 rounded-xl p-4 max-h-64 overflow-y-auto">
              <div className="space-y-2">
                <p className="font-medium text-sm text-gray-900 mb-3">Selecionar Marcadores de Sistema</p>
                {systemTags.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-2">Nenhum marcador de sistema disponível</p>
                ) : (
                  systemTags.map((tag) => (
                    <div key={tag.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`system-tag-${tag.id}`}
                        checked={selectedSystemTags.includes(tag.id)}
                        onCheckedChange={() => toggleSystemTagFilter(tag.id)}
                      />
                      <label
                        htmlFor={`system-tag-${tag.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {tag.name}
                      </label>
                    </div>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu open={importFilterOpen} onOpenChange={setImportFilterOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="rounded-xl">
                <Upload className="w-4 h-4 mr-2" />
                Importação ({selectedImports.length})
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 rounded-xl p-4 max-h-64 overflow-y-auto">
              <div className="space-y-2">
                <p className="font-medium text-sm text-gray-900 mb-3">Selecionar Importação</p>
                {importNames.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-2">Nenhuma importação disponível</p>
                ) : (
                  importNames.map((importName) => (
                    <div key={importName} className="flex items-center space-x-2">
                      <Checkbox
                        id={`import-${importName}`}
                        checked={selectedImports.includes(importName)}
                        onCheckedChange={() => toggleImportFilter(importName)}
                      />
                      <label
                        htmlFor={`import-${importName}`}
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                        {importName}
                      </label>
                    </div>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu open={responsibleFilterOpen} onOpenChange={setResponsibleFilterOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="rounded-xl">
                <UserCheck className="w-4 h-4 mr-2" />
                Responsável ({selectedResponsibles.length})
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 rounded-xl p-4 max-h-64 overflow-y-auto">
              <div className="space-y-2">
                <p className="font-medium text-sm text-gray-900 mb-3">Selecionar Responsável</p>
                {responsibleNames.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-2">Nenhum responsável disponível</p>
                ) : (
                  responsibleNames.map((responsibleName) => (
                    <div key={responsibleName} className="flex items-center space-x-2">
                      <Checkbox
                        id={`responsible-${responsibleName}`}
                        checked={selectedResponsibles.includes(responsibleName)}
                        onCheckedChange={() => toggleResponsibleFilter(responsibleName)}
                      />
                      <label
                        htmlFor={`responsible-${responsibleName}`}
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                        {responsibleName}
                      </label>
                    </div>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* NOVO: Barra de seleção */}
        {selectionMode && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (selectedContactIds.length === contacts.length) {
                      deselectAll();
                    } else {
                      selectAll();
                    }
                  }}
                  className="rounded-xl"
                >
                  {selectedContactIds.length === contacts.length ? (
                    <>
                      <CheckSquare className="w-4 h-4 mr-2" />
                      Desselecionar Todos
                    </>
                  ) : (
                    <>
                      <Square className="w-4 h-4 mr-2" />
                      Selecionar Todos ({totalContacts})
                    </>
                  )}
                </Button>
                <Badge className="bg-blue-600 text-white rounded-full px-3 py-1">
                  {selectedContactIds.length} selecionado{selectedContactIds.length !== 1 ? 's' : ''}
                </Badge>
              </div>
              {selectedContactIds.length > 0 && (
                <Button
                  onClick={handleBulkAssignTags}
                  className="bg-blue-600 hover:bg-blue-700 rounded-xl"
                >
                  <TagIcon className="w-4 h-4 mr-2" />
                  Atribuir Marcador
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Active Filters */}
        {(selectedCampaigns.length > 0 || selectedTags.length > 0 || selectedSystemTags.length > 0 || selectedImports.length > 0 || selectedResponsibles.length > 0) && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-gray-500 mr-2">Filtros ativos:</span>
            <Badge className="rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1">
              {totalContacts} {totalContacts === 1 ? 'contato' : 'contatos'}
            </Badge>
            {getSelectedCampaignNames().map((campaignName, index) => (
              <Badge
                key={`campaign-${index}`}
                variant="secondary"
                className="rounded-full px-3 py-1 bg-blue-100 text-blue-800 border-blue-200"
              >
                {campaignName}
                <button
                  onClick={() => removeCampaignFilter(selectedCampaigns[index])}
                  className="ml-2 hover:text-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            {selectedTags.map((tag) => (
              <Badge
                key={`tag-${tag}`}
                variant="secondary"
                className="rounded-full px-3 py-1 bg-green-100 text-green-800 border-green-200"
              >
                {tag}
                <button
                  onClick={() => removeTagFilter(tag)}
                  className="ml-2 hover:text-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            {selectedSystemTags.map((systemTagId) => {
              const systemTag = systemTags.find(t => t.id === systemTagId);
              return (
                <Badge
                  key={`system-tag-${systemTagId}`}
                  variant="secondary"
                  className="rounded-full px-3 py-1 bg-red-100 text-red-800 border-red-200"
                >
                  {systemTag?.name || systemTagId}
                  <button
                    onClick={() => removeSystemTagFilter(systemTagId)}
                    className="ml-2 hover:text-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              );
            })}
            {selectedImports.map((importName) => (
              <Badge
                key={`import-${importName}`}
                variant="secondary"
                className="rounded-full px-3 py-1 bg-purple-100 text-purple-800 border-purple-200"
              >
                {importName}
                <button
                  onClick={() => removeImportFilter(importName)}
                  className="ml-2 hover:text-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            {selectedResponsibles.map((responsibleName) => (
              <Badge
                key={`responsible-${responsibleName}`}
                variant="secondary"
                className="rounded-full px-3 py-1 bg-indigo-100 text-indigo-800 border-indigo-200"
              >
                {responsibleName}
                <button
                  onClick={() => removeResponsibleFilter(responsibleName)}
                  className="ml-2 hover:text-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {/* Contacts List */}
        {contacts.length === 0 ? (
          <Card className="rounded-3xl border-dashed border-2 border-gray-200">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhum contato encontrado
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || selectedCampaigns.length > 0 || selectedTags.length > 0 || selectedSystemTags.length > 0 || selectedImports.length > 0
                  ? 'Tente ajustar os filtros de busca'
                  : 'Adicione contatos para começar'}
              </p>
              {!searchTerm && selectedCampaigns.length === 0 && selectedTags.length === 0 && selectedSystemTags.length === 0 && selectedImports.length === 0 && (
                <Button
                  onClick={() => {
                    setEditingContact(null);
                    setShowForm(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 rounded-xl"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Contato
                </Button>
              )}
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contacts.map((contact) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                viewMode={viewMode}
                listCompactness={listCompactness}
                campaigns={campaigns}
                availableTags={availableTags}
                systemTags={systemTags}
                onEdit={handleEdit}
                onView={handleView}
                onChat={handleChat}
                onDelete={handleDelete}
                onHistory={handleHistory}
                onAssignTag={handleAssignTag}
                selectionMode={selectionMode}
                isSelected={selectedContactIds.includes(contact.id)}
                onToggleSelection={() => toggleSelection(contact.id)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {contacts.map((contact) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                viewMode={viewMode}
                listCompactness={listCompactness}
                campaigns={campaigns}
                availableTags={availableTags}
                systemTags={systemTags}
                onEdit={handleEdit}
                onView={handleView}
                onChat={handleChat}
                onDelete={handleDelete}
                onHistory={handleHistory}
                onAssignTag={handleAssignTag}
                selectionMode={selectionMode}
                isSelected={selectedContactIds.includes(contact.id)}
                onToggleSelection={() => toggleSelection(contact.id)}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-700">
              Mostrando {((currentPage - 1) * contactsPerPage) + 1} a {Math.min(currentPage * contactsPerPage, totalContacts)} de {totalContacts} contatos
            </p>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || isLoading}
                variant="outline"
                size="sm"
                className="rounded-xl"
              >
                Anterior
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      variant={currentPage === pageNum ? 'default' : 'ghost'}
                      size="sm"
                      disabled={isLoading}
                      className="rounded-xl w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || isLoading}
                variant="outline"
                size="sm"
                className="rounded-xl"
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <ContactImportModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={handleImportSuccess}
        companyId={user?.company_id}
        useAsyncImport={true}
      />

      <ContactDetailsModal
        open={showDetailsModal}
        contact={viewingContact}
        onClose={() => {
          setShowDetailsModal(false);
          setViewingContact(null);
        }}
        onEdit={(contact) => {
          setEditingContact(contact);
          setShowDetailsModal(false);
          setShowForm(true);
        }}
      />

      <ContactFormModal
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingContact(null);
        }}
        contact={editingContact}
        onSubmit={handleContactSubmit}
      />

      <DuplicateContactModal
        open={showDuplicateModal}
        onClose={handleDuplicateCancel}
        existingContact={duplicateData?.existingContact}
        newContactData={duplicateData?.newContactData}
        duplicateField={duplicateData?.duplicateField}
        duplicateValue={duplicateData?.duplicateValue}
        onUpdate={handleDuplicateUpdate}
        onCreateNew={handleDuplicateCreateNew}
        onCancel={handleDuplicateCancel}
      />

      <BulkDeleteProgressModal
        open={showBulkDeleteProgress}
        onClose={() => {
          if (!isProcessingInBackground) {
            setShowBulkDeleteProgress(false);
            setIsProgressMinimized(false);
          }
        }}
        onMinimize={() => {
          setIsProgressMinimized(true);
          setShowBulkDeleteProgress(false);
        }}
        onCancel={handleCancelProcessing}
        progress={bulkProgress}
        isProcessing={isProcessingInBackground}
        isCancelling={isCancelling}
        processType={backgroundProcessType}
      />

      <ContactHistoryModal
        open={showHistoryModal}
        onClose={() => {
          setShowHistoryModal(false);
          setHistoryContact(null);
        }}
        contact={historyContact}
      />

      <BulkDeleteModal
        open={showBulkDelete}
        onClose={() => setShowBulkDelete(false)}
        onConfirm={handleBulkDelete}
        onRestore={handleRestoreContacts}
      />

      <QuickAssignTagModal
        open={showQuickAssignTag}
        onClose={() => {
          setShowQuickAssignTag(false);
          setAssignTagContact(null);
        }}
        contact={assignTagContact}
        onSuccess={handleAssignTagSuccess}
      />

      <ImportProgressModal
        open={isImportProgressModalOpen && !isImportMinimized}
        onClose={() => {
          const isCompleted = importProgress.status === 'completed' || (importProgress.processed >= importProgress.total && importProgress.total > 0);
          
          if (isCompleted) {
            console.log('[Contacts] 🧹 Fechando modal e limpando progresso');
            setIsImportProgressModalOpen(false);
            setIsImportMinimized(false);
            localStorage.removeItem('importProgress');
            
            const totalImported = (importProgress.successful || 0) + (importProgress.updated || 0);
            
            setImportProgress({
              isProcessing: false,
              total: 0,
              processed: 0,
              successful: 0,
              failed: 0,
              duplicates: 0,
              updated: 0,
              noWhatsApp: 0
            });
            
            if (totalImported > 0) {
              showBannerFunc(
                `✅ Importação concluída: ${importProgress.successful || 0} novos, ${importProgress.updated || 0} atualizados`,
                'success'
              );
            }
            
            loadData(1, false);
          }
        }}
        onMinimize={() => {
          setIsImportMinimized(true);
          setIsImportProgressModalOpen(false);
        }}
        progress={importProgress}
      />

      <BulkAssignTagsModal
        open={showBulkAssignTags}
        onClose={() => {
          setShowBulkAssignTags(false);
        }}
        contactIds={selectedContactIds}
        tags={availableTags.filter(t => (t.type === 'manual' || t.type === 'smart') && t.is_active !== false)}
        companyId={user?.company_id}
        onSuccess={handleBulkAssignTagsSuccess}
      />

      {showPostImportLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-8 max-w-sm mx-4 text-center shadow-2xl">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Carregando Contatos
            </h3>
            <p className="text-gray-600 text-sm">
              Atualizando lista com os contatos importados...
            </p>
          </div>
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir contato?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir permanentemente <strong>{contactToDelete?.first_name} {contactToDelete?.last_name}</strong>?
              <br />
              <span className="text-red-600 font-medium mt-2 block">⚠️ Esta ação é IRREVERSÍVEL e o contato será deletado permanentemente do sistema.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="rounded-xl bg-red-600 hover:bg-red-700"
            >
              Sim, excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}