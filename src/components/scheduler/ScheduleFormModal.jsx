import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  X,
  Users,
  Calendar as CalendarIcon,
  Clock,
  FileText,
  Info,
  Plus,
  Loader2,
  ChevronDown,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Calculator,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Send,
  Zap,
  Shuffle,
  Brain,
  ArrowRight,
  AlertTriangle,
  MessageSquare,
  Tag as TagIcon,
  Paperclip,
  Trash2,
  List,
  LayoutGrid,
  PlusCircle,
  Search,
  HelpCircle,
  Hash,
  CheckSquare,
  Square,
  Lightbulb,
  RefreshCw,
  Sparkles
} from "lucide-react";
import { format, startOfDay, isBefore, isAfter, setHours, setMinutes, addDays, addWeeks, addMonths, addQuarters, addYears, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Campaign } from "@/entities/Campaign";
import { Tag } from "@/entities/Tag";
import { MessageTemplate } from "@/entities/MessageTemplate";
import { Session } from "@/entities/Session";
import { User } from "@/entities/User";
import { Message } from "@/entities/Message";
import { Plan } from "@/entities/Plan";
import { Schedule } from "@/entities/Schedule";
import { Contact } from "@/entities/Contact"; // Assuming Contact entity is available
import { SystemTag } from "@/entities/SystemTag"; // NEW IMPORT
import { getContactFilterOptions } from "@/functions/getContactFilterOptions";
import { lookupAddressByCep } from "@/functions/lookupAddressByCep";
import { getFilteredContactsByRules } from "@/functions/getFilteredContactsByRules";
import { getSubscriptionStatus } from "@/functions/getSubscriptionStatus";
import { createSchedule } from "@/functions/createSchedule";

import TemplateFormModal from "../templates/TemplateFormModal";

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const debounce = (func, delay) => {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
};

const campaignOperators = [
  { id: 'all_contacts', name: 'Todos os contatos' },
  { id: 'with_errors', name: 'Com erros' },
  { id: 'pending', name: 'Envio pendente' },
  { id: 'success', name: 'Enviado com sucesso' },
  { id: 'cancelled', name: 'Cancelado' }
];

const errorTypeValues = [
  { id: 'all_errors', name: 'Todos os erros' },
  { id: 'invalid_number', name: 'Número inválido' },
  { id: 'session_disconnected', name: 'Sessão desconectada' },
  { id: 'number_not_exists', name: 'Número não existe no WhatsApp' },
  { id: 'rate_limit', name: 'Limite de taxa excedido' },
  { id: 'timeout', name: 'Timeout' },
  { id: 'unknown', name: 'Erro desconhecido' }
];

const filterOptions = {
  cadastro: [
    { id: 'email_type', name: 'Tipo de E-mail', operators: [{id: 'equals', name: 'é'}, {id: 'not_equals', name: 'não é'}], values: [{id: 'corporate', name: 'Corporativo'}, {id: 'personal', name: 'Pessoal'}] },
    { id: 'multiple_contacts', name: 'Múltiplos Contatos', operators: [{id: 'is_true', name: 'Possui'}, {id: 'is_false', name: 'Não possui'}], values: null },
    { id: 'profile_completeness', name: 'Endereço Completo', operators: [{id: 'is_true', name: 'Possui'}, {id: 'is_false', name: 'Não possui'}], values: null },
  ],
  cliente: [
    { id: 'position', name: 'Cargo', operators: [{id: 'greater_than', name: '> (Maior que)'}, {id: 'less_than', name: '< (Menor que)'}, {id: 'equals', name: '= (Igual a)'}, {id: 'is_not_filled', name: 'Não Preenchido'}], values: 'number' },
    { id: 'company_name', name: 'Empresa Associada', operators: [{id: 'equals', name: 'é'}, {id: 'not_equals', name: 'não é'}], values: 'dynamic_company_name' },
    { id: 'value', name: 'Valor do Contato', operators: [{id: 'greater_than', name: '> (Maior que)'}, {id: 'less_than', name: '< (Menor que)'}, {id: 'equals', name: '= (Igual a)'}, {id: 'is_not_filled', name: 'Não Preenchido'}], values: 'number' },
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
    { id: 'address_city', name: 'Cidade', operators: [{id: 'equals', name: 'é'}, {id: 'not_equals', name: 'não é'}, {id: 'contains', name: 'Contém'}, {id: 'not_contains', name: 'Não contém'}], values: 'text' },
    { id: 'address_state', name: 'Estado (UF)', operators: [{id: 'equals', name: 'é'}, {id: 'not_equals', name: 'não é'}, {id: 'contains', name: 'Contém'}, {id: 'not_contains', name: 'Não contém'}], values: 'text' },
    { id: 'address_neighborhood', name: 'Bairro', operators: [{id: 'equals', name: 'é'}, {id: 'not_equals', name: 'não é'}, {id: 'contains', name: 'Contém'}, {id: 'not_contains', name: 'Não contém'}], values: 'text' },
    { id: 'cep_format', name: 'Formato do CEP', operators: [{id: 'is_valid', name: 'é válido'}, {id: 'is_invalid', name: 'é inválido'}], values: null },
  ],
  observacoes: [
    { id: 'notes_keywords', name: 'Palavras-chave nas Observações', operators: [{id: 'contains', name: 'Contém'}, {id: 'not_contains', name: 'Não contém'}], values: 'text' },
    { id: 'has_notes', name: 'Possui Observações', operators: [{id: 'is_true', name: 'Sim'}, {id: 'is_false', name: 'Não'}], values: null },
  ],
  campanha: [] // Será preenchido dinamicamente com as campanhas
};


const defaultFormData = {
  name: "",
  message_type: "whatsapp",
  contact_filters: [],
  filter_logic: 'AND',
  is_dynamic_campaign: false,
  selected_contacts: [], // This will be managed by `selectedContacts` state
  selected_templates: [],
  template_order: [], // Array de objetos: { id: unique-id, template_id: id, variation_index: null ou número }
  selected_sessions: [],
  session_sending_strategy: "sequential",
  schedule_type: "immediate",
  scheduled_date: null,
  scheduled_time: "09:00",
  recurrence_settings: {
    type: "daily",
    day_of_week: 1,
    day_of_month: 1,
    frequency: 1,
    end_type: "after_count",
    end_count: 10,
    end_date: null
  },
  delivery_settings: {
    interval_type: "fixed",
    interval_fixed: 3000,
    interval_random_min: 1000,
    interval_random_max: 10000,
    respect_business_hours: true,
    start_hour: 8,
    end_hour: 18
  },
  smart_send_settings: {
    enabled: false,
    days_to_split: 1,
    enable_recurrence: false,
    recurrence_count: 1,
    selected_weekdays: [1, 2, 3, 4, 5] // Segunda a Sexta por padrão
  }
};

const useSimulatedContacts = (filters, logic, isDynamic, startDate, recurrenceSettings) => {
  const [simulatedBatches, setSimulatedBatches] = useState({
    first: { date: null, contacts: [], loading: false },
    second: { date: null, contacts: [], loading: false },
    third: { date: null, contacts: [], loading: false },
  });

  const calculateNextDate = useCallback((currentDate, settings) => {
    if (!currentDate || !isValid(currentDate)) return null;

    const { type, frequency, day_of_week, day_of_month } = settings;
    const baseDate = new Date(currentDate);

    if (!type || !frequency || frequency < 1) return null;

    try {
        switch (type) {
            case 'daily':
                return addDays(baseDate, frequency);
            case 'weekly': {
                let nextDate = addWeeks(baseDate, frequency);
                // Adjust to the specific day of week if needed, though for recurrence,
                // it usually means "this day of week in X weeks".
                // For simplicity, we just add weeks based on the start date for simulation.
                return nextDate;
            }
            case 'monthly': {
                let nextDate = addMonths(baseDate, frequency);
                if (day_of_month !== undefined) {
                    nextDate.setDate(Math.min(day_of_month, nextDate.getDate()));
                }
                return nextDate;
            }
            case 'quarterly':
                return addQuarters(baseDate, frequency);
            case 'yearly':
                return addYears(baseDate, frequency);
            default:
                return null;
        }
    } catch {
        return null;
    }
  }, []);

  useEffect(() => {
    const fetchBatches = async () => {
      // If not dynamic, or no filters, or no start date (for recurrence), clear simulations
      if (!isDynamic || !startDate || !filters || filters.length === 0 || !(startDate instanceof Date && isValid(startDate))) {
        setSimulatedBatches({
          first: { date: null, contacts: [], loading: false },
          second: { date: null, contacts: [], loading: false },
          third: { date: null, contacts: [], loading: false },
        });
        return;
      }

      setSimulatedBatches(prev => ({
        first: { ...prev.first, loading: true },
        second: { ...prev.second, loading: true },
        third: { ...prev.third, loading: true },
      }));

      const firstBatchDate = startDate;
      const secondBatchDate = calculateNextDate(firstBatchDate, recurrenceSettings);
      const thirdBatchDate = secondBatchDate ? calculateNextDate(secondBatchDate, recurrenceSettings) : null;

      const [firstResult, secondResult, thirdResult] = await Promise.all([
        getFilteredContactsByRules({ filters, logic, simulation_date: firstBatchDate.toISOString() }).catch(e => { console.error("Error fetching 1st batch:", e); return { data: { contacts: [] } }; }),
        secondBatchDate ? getFilteredContactsByRules({ filters, logic, simulation_date: secondBatchDate.toISOString() }).catch(e => { console.error("Error fetching 2nd batch:", e); return { data: { contacts: [] } }; }) : Promise.resolve(null),
        thirdBatchDate ? getFilteredContactsByRules({ filters, logic, simulation_date: thirdBatchDate.toISOString() }).catch(e => { console.error("Error fetching 3rd batch:", e); return { data: { contacts: [] } }; }) : Promise.resolve(null)
      ]);

      setSimulatedBatches({
        first: { date: firstBatchDate, contacts: firstResult?.data?.contacts || [], loading: false },
        second: { date: secondBatchDate, contacts: secondResult?.data?.contacts || [], loading: false },
        third: { date: thirdBatchDate, contacts: thirdResult?.data?.contacts || [], loading: false },
      });
    };

    const debouncedFetchBatches = debounce(fetchBatches, 500); // Debounce to prevent excessive API calls
    debouncedFetchBatches();
  }, [filters, logic, isDynamic, startDate, recurrenceSettings, calculateNextDate]);

  return { simulatedBatches };
};


export default function ScheduleFormModal({ schedule, templates = [], isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState(defaultFormData);
  const [campaigns, setCampaigns] = useState([]);
  const [tags, setTags] = useState([]); // Stores tag objects with ID and name
  const [messageTemplates, setMessageTemplates] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // States para filtros dinâmicos
  const [dynamicOptions, setDynamicOptions] = useState({});
  const [isLoadingOptions, setIsLoadingOptions] = useState({});
  const [isLoadingCep, setIsLoadingCep] = useState({});

  // Novo state para armazenar campanhas disponíveis para filtros
  const [availableCampaigns, setAvailableCampaigns] = useState([]);

  // NEW STATE: Current authenticated user
  const [currentUser, setCurrentUser] = useState(null);
  // NEW STATE: All valid contacts (after system tag filtering) for the current company
  const [allValidCompanyContacts, setAllValidCompanyContacts] = useState([]);
  // NEW STATE: Loading indicator for all valid company contacts
  const [isLoadingAllCompanyContacts, setIsLoadingAllCompanyContacts] = useState(false);
  // NEW STATE: IDs of system tags that indicate invalid numbers
  const [invalidSystemTagIds, setInvalidSystemTagIds] = useState([]);

  // States para contatos filtrados
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [isLoadingFilteredContacts, setIsLoadingFilteredContacts] = useState(false);

  // IMPORTANTE: Estado separado para selected_contacts
  const [selectedContacts, setSelectedContacts] = useState([]);

  const [notification, setNotification] = useState({
    show: false,
    type: 'success',
    message: ''
  });
  const [sendingSpeed, setSendingSpeed] = useState('conservative');
  const [expandedBatches, setExpandedBatches] = useState({});

  // Refs para rastrear mudanças de filtros
  const prevFiltersRef = useRef(null);

  // Criar chave estável dos filtros usando useMemo
  // IMPORTANTE: NÃO incluir schedule_type aqui para evitar limpar contatos ao mudar tipo de agendamento
  const filtersKey = useMemo(() => {
    return JSON.stringify({
      filters: formData.contact_filters,
      logic: formData.filter_logic,
      dynamic: formData.is_dynamic_campaign
    });
  }, [formData.contact_filters, formData.filter_logic, formData.is_dynamic_campaign]);

  const { simulatedBatches } = useSimulatedContacts(
    formData.contact_filters,
    formData.filter_logic,
    formData.schedule_type === 'recurring' && formData.is_dynamic_campaign, // Only simulate if it's a recurring dynamic campaign
    formData.scheduled_date,
    formData.recurrence_settings
  );

  const formatPhoneNumber = (phone) => {
    if (!phone) return 'Sem número';

    const cleanPhone = phone.replace(/\D/g, '');

    if (cleanPhone.length === 13 && cleanPhone.startsWith('55')) {
      const ddd = cleanPhone.substring(2, 4);
      const number = cleanPhone.substring(4);
      return `+55 (${ddd}) ${number.substring(0, 5)}-${number.substring(5)}`;
    } else if (cleanPhone.length === 11) {
      const ddd = cleanPhone.substring(0, 2);
      const number = cleanPhone.substring(2);
      return `+55 (${ddd}) ${number.substring(0, 5)}-${number.substring(5)}`;
    }

    if (cleanPhone.length > 0) {
      return `+${cleanPhone}`;
    }
    return 'Número inválido';
  };

  const getSessionDisplayName = (session) => {
    if (session.api_response?.me?.pushName) {
      return session.api_response.me.pushName;
    }
    if (session.api_response?.name) {
      return session.api_response.name;
    }

    if (session.user_email) {
      const emailName = session.user_email.split('@')[0];
      return emailName.charAt(0).toUpperCase() + emailName.slice(1);
    }

    if (session.session_name) {
      return session.session_name.substring(0, 8).toUpperCase();
    }

    return 'Sessão Desconhecida';
  };

  const getSessionStatusColor = (status) => {
    switch (status) {
      case 'WORKING':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'SCAN_QR_CODE':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'FAILED':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'STOPPED':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getBrasiliaTime = useCallback(() => {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const brasiliaTime = new Date(utc + (-3 * 3600000));
    return brasiliaTime;
  }, []);

  const findFilterDefinition = useCallback((filterCategory, fieldId) => {
    if (filterCategory === 'campanha') {
      const campaign = availableCampaigns.find(c => c.id === fieldId);
      if (campaign) {
        return {
          id: campaign.id,
          name: campaign.name,
          operators: campaignOperators,
          values: 'campaign_dynamic'
        };
      }
    }

    for (const categoryKey in filterOptions) {
        const category = filterOptions[categoryKey];
        const definition = category.find(f => f.id === fieldId);
        if (definition) return definition;
    }
    return null;
  }, [availableCampaigns]);

  const needsValue = useCallback((filter) => {
    if (filter.category === 'campanha') {
      return filter.operator === 'with_errors';
    }
    const definition = findFilterDefinition(filter.category, filter.field);
    const operatorsWithoutValue = ['is_true', 'is_false', 'is_filled', 'is_not_filled', 'is_valid', 'is_invalid', 'is_today', 'is_this_week', 'is_this_month'];
    return definition?.operators && !operatorsWithoutValue.includes(filter.operator);
  }, [findFilterDefinition]);

  const isValidTimeForToday = useCallback((selectedDate, selectedTime) => {
    if (!selectedDate || !selectedTime) return true;

    const now = getBrasiliaTime();
    const today = startOfDay(now);
    const selectedDay = startOfDay(selectedDate);

    if (isBefore(selectedDay, today)) {
      return false; // Cannot select a date in the past
    }

    if (selectedDay.getTime() === today.getTime()) {
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const selectedDateTime = setMinutes(setHours(selectedDay, hours), minutes);
      return isAfter(selectedDateTime, now);
    }

    return true; // Future dates are always valid
  }, [getBrasiliaTime]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Main data loading function, now also loads currentUser and system tags
  const loadData = useCallback(async () => {
    setIsLoadingSessions(true);
    try {
      const user = await User.me();
      setCurrentUser(user); // Set current user state

      if (user?.company_id) {
        // Fetch SystemTags first to get invalid number IDs
        const systemTags = await SystemTag.list();
        const invalidNumberTag = systemTags.find(tag => tag.slug === 'invalid_number');
        const numberNotExistsTag = systemTags.find(tag => tag.slug === 'number_not_exists');
        const ids = [
          invalidNumberTag?.id,
          numberNotExistsTag?.id
        ].filter(Boolean);
        setInvalidSystemTagIds(ids); // Store invalid system tag IDs

        // Load all company contacts and filter by system tags and deleted status
        setIsLoadingAllCompanyContacts(true);
        const allContacts = await Contact.filter({ 
          company_id: user.company_id,
          deleted: { '$ne': true }
        });
        const validCompanyContacts = allContacts.filter(contact => {
          if (!contact.tags_system || contact.tags_system.length === 0) return true; // Contact has no system tags, consider valid
          return !contact.tags_system.some(tagId => ids.includes(tagId)); // Filter out if any invalid tag is present
        });
        setAllValidCompanyContacts(validCompanyContacts);
        setIsLoadingAllCompanyContacts(false);

        const [campaignList, tagList, templateList, sessionList, scheduleList] = await Promise.all([
          Campaign.filter({ company_id: user.company_id }).catch(() => []),
          Tag.filter({ company_id: user.company_id }).catch(() => []), // Removed 'name' to fetch full tag objects (including ID)
          MessageTemplate.filter({ company_id: user.company_id }, 'name').catch(() => []),
          Session.filter({ company_id: user.company_id }, '-created_date').catch(() => []),
          Schedule.filter({ company_id: user.company_id }).catch(() => []) // Buscar schedules anteriores para usar como campanhas no filtro
        ]);

        setCampaigns(Array.isArray(campaignList) ? campaignList : []);
        setTags(Array.isArray(tagList) ? tagList : []);
        setMessageTemplates(Array.isArray(templateList) ? templateList : []);

        const sessionArray = Array.isArray(sessionList) ? sessionList : [];
        const workingSessions = sessionArray.filter(session => 
          session.status === 'WORKING' && !session.is_system_session
        );
        setSessions(workingSessions);

        const schedulesArray = Array.isArray(scheduleList) ? scheduleList : [];
        setAvailableCampaigns(schedulesArray);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      setCampaigns([]);
      setTags([]);
      setMessageTemplates([]);
      setSessions([]);
      setAvailableCampaigns([]);
      setAllValidCompanyContacts([]);
      setInvalidSystemTagIds([]);
    } finally {
      setIsLoadingSessions(false);
      setIsLoadingAllCompanyContacts(false);
    }
  }, []);

  // Inicializar form data quando o modal abrir ou schedule mudar
  useEffect(() => {
    if (!isOpen) {
      resetForm();
      return;
    }

    loadData(); // Load data regardless of new or edit mode

    if (schedule) {
      console.log('Inicializando modal com schedule:', schedule);

      const scheduleType = schedule.type || schedule.schedule_type || 'immediate';
      const templateIds = Array.isArray(schedule.selected_templates) ? schedule.selected_templates : (Array.isArray(schedule.template_ids) ? schedule.template_ids : []);
      const sessionNames = Array.isArray(schedule.selected_sessions) ? schedule.selected_sessions : [];
      const contactIds = Array.isArray(schedule.selected_contacts) ? schedule.selected_contacts : [];

      console.log('Templates a carregar:', templateIds);
      console.log('Sessões a carregar:', sessionNames);
      console.log('Contatos a carregar:', contactIds);

      // Converter template_order antigo para novo formato se necessário
      let templateOrder = [];
      if (Array.isArray(schedule.template_order) && schedule.template_order.length > 0) {
        // Verificar se já está no novo formato (array de objetos)
        if (typeof schedule.template_order[0] === 'object' && schedule.template_order[0].template_id) {
          templateOrder = schedule.template_order;
        } else {
          // Converter do formato antigo (array de IDs) para novo formato
          templateOrder = schedule.template_order.map((tid, index) => ({
            id: `${tid}-original-${index}`,
            template_id: tid,
            variation_index: null
          }));
        }
      } else if (templateIds.length > 0) {
        // Se não tem template_order, criar do selected_templates
        templateOrder = templateIds.map((tid, index) => ({
          id: `${tid}-original-${index}`,
          template_id: tid,
          variation_index: null
        }));
      }

      setFormData(prev => ({
        ...defaultFormData, // Spread default to ensure new fields are present
        name: schedule.name || "",
        message_type: schedule.message_type || "whatsapp",
        contact_filters: Array.isArray(schedule.contact_filters) ? schedule.contact_filters : [],
        filter_logic: schedule.filter_logic || 'AND',
        is_dynamic_campaign: schedule.is_dynamic_campaign || false,
        // selected_contacts is now managed by selectedContacts state, not directly in formData here
        selected_templates: templateIds,
        template_order: templateOrder,
        selected_sessions: sessionNames,
        session_sending_strategy: (schedule.session_sending_strategy === "intelligent" ? "smart" : schedule.session_sending_strategy) || "sequential",
        schedule_type: scheduleType, // Map type directly
        scheduled_date: schedule.scheduled_date ? new Date(schedule.scheduled_date) : null,
        scheduled_time: schedule.scheduled_date ? format(new Date(schedule.scheduled_date), 'HH:mm') : (schedule.scheduled_time || "09:00"),
        recurrence_settings: { // Load recurrence settings
          ...defaultFormData.recurrence_settings, // Ensure all fields are present even if schedule doesn't have them
          ...(schedule.recurrence_settings || {}),
          end_date: schedule.recurrence_settings?.end_date ? new Date(schedule.recurrence_settings.end_date) : null // Convert to Date object
        },
        delivery_settings: {
          ...prev.delivery_settings,
          ...(schedule.delivery_settings || {})
        }
      }));

      // Set the separate selectedContacts state
      setSelectedContacts(contactIds);

      // Set sending speed from delivery settings
      setSendingSpeed(schedule.delivery_settings?.speed_mode || 'conservative');

      console.log('FormData inicializado:', {
        templates: templateIds,
        sessions: sessionNames,
        contacts: contactIds,
        type: scheduleType
      });
    } else {
      resetForm();
      setSendingSpeed('conservative'); // Setting default for new forms
      setSelectedContacts([]); // Clear selected contacts on reset/new form
    }
    setSubmitError(null);
    setFilteredContacts([]); // Clear filtered contacts on open/reset
    setIsLoadingFilteredContacts(false);
  }, [isOpen, schedule, loadData]);

  // Efeito para limpar a data final da recorrência se as dependências mudarem
  useEffect(() => {
    if (formData.schedule_type === 'recurring') {
        setFormData(prev => {
            if (prev.recurrence_settings.end_date !== null) {
                return {
                    ...prev,
                    recurrence_settings: {
                        ...prev.recurrence_settings,
                        end_date: null
                    }
                };
            }
            return prev;
        });
    }
  }, [formData.schedule_type, formData.scheduled_date, formData.recurrence_settings.type, formData.recurrence_settings.frequency]);

  const maxEndDate = useMemo(() => {
    const { scheduled_date, recurrence_settings } = formData;
    if (!scheduled_date || !isValid(scheduled_date)) return null;

    const { type, frequency } = recurrence_settings;
    const startDate = new Date(scheduled_date);
    const periodsToAdd = 30; // Limite de 30 lotes

    try {
        switch (type) {
            case 'daily':
                return addDays(startDate, periodsToAdd * frequency);
            case 'weekly':
                return addWeeks(startDate, periodsToAdd * frequency);
            case 'monthly':
                return addMonths(startDate, periodsToAdd * frequency);
            case 'quarterly':
                return addQuarters(startDate, periodsToAdd * frequency);
            case 'yearly':
                return addYears(startDate, periodsToAdd * frequency);
            default:
                return null;
        }
    } catch (error) {
        console.error("Error calculating max end date:", error);
        return null;
    }
  }, [formData.scheduled_date, formData.recurrence_settings.type, formData.recurrence_settings.frequency]);

  const calculateNextRecurrenceDate = useCallback((startDate, recurrenceSettings) => {
    if (!startDate || !isValid(new Date(startDate))) return null;

    const { type, frequency } = recurrenceSettings;
    const baseDate = new Date(startDate);

    if (!type || !frequency || frequency < 1) return null;

    try {
        switch (type) {
            case 'daily':
                return addDays(baseDate, frequency);
            case 'weekly':
                return addWeeks(baseDate, frequency);
            case 'monthly':
                return addMonths(baseDate, frequency);
            case 'quarterly':
                return addQuarters(baseDate, frequency);
            case 'yearly':
                return addYears(baseDate, frequency);
            default:
                return null;
        }
    } catch {
        return null;
    }
  }, []);

  const resetForm = () => {
    setFormData(defaultFormData);
    setSelectedContacts([]); // Reset selected contacts as well
  };

  // Define a lógica de busca de contatos
  const filterContactsFetchLogic = useCallback(async (filters, logic, isDynamicCampaign) => {
      // If it's a dynamic campaign, we do not fetch contacts for manual selection
      if (isDynamicCampaign) {
          setFilteredContacts([]);
          setSelectedContacts([]); // Limpa seleção também
          setIsLoadingFilteredContacts(false);
          return;
      }
      const validFilters = Array.isArray(filters) ? filters : [];
      if (validFilters.length === 0) {
          // If no user-defined filters, show all valid company contacts
          setFilteredContacts(allValidCompanyContacts); // Use the pre-filtered list
          setSelectedContacts([]); // Clear selection as the list might have changed
          setIsLoadingFilteredContacts(false);
          return;
      }
      setIsLoadingFilteredContacts(true);
      try {
          const response = await getFilteredContactsByRules({ filters: validFilters, logic: logic || 'AND' });
          let fetchedContacts = response.data?.contacts || [];

          // NEW: Filter out contacts with invalid system tags from the fetched results
          const systemTagFilteredContacts = fetchedContacts.filter(contact => {
              if (!contact.tags_system || contact.tags_system.length === 0) return true; // Contact has no system tags, consider valid
              return !contact.tags_system.some(tagId => invalidSystemTagIds.includes(tagId)); // Filter out if any invalid tag is present
          });

          setFilteredContacts(systemTagFilteredContacts);
          setSelectedContacts([]); // Clear selection when filters change
      } catch (error) {
          console.error('Erro ao carregar contatos filtrados:', error);
          setFilteredContacts([]);
          setSelectedContacts([]);
      } finally {
          setIsLoadingFilteredContacts(false);
      }
  }, [allValidCompanyContacts, invalidSystemTagIds]); // Added dependencies

  // Cria uma versão debounced estável da função de busca
  const debouncedFilterContactsRef = useRef(null);

  if (!debouncedFilterContactsRef.current) {
    debouncedFilterContactsRef.current = debounce(filterContactsFetchLogic, 500);
  }

  // UseEffect que só roda quando filtersKey muda (não quando selected_contacts muda)
  useEffect(() => {
      if (!isOpen || !debouncedFilterContactsRef.current || !currentUser?.company_id) return; // Wait for currentUser

      console.log("useEffect [filtersKey] disparado. FiltersKey:", filtersKey);

      // Special handling if no contact filters are applied
      if (formData.contact_filters.length === 0 && !formData.is_dynamic_campaign) {
          setFilteredContacts(allValidCompanyContacts);
          setSelectedContacts([]);
          setIsLoadingFilteredContacts(false);
          prevFiltersRef.current = filtersKey; // Mark as processed
          return;
      }

      // Só executar se a chave dos filtros realmente mudou
      if (prevFiltersRef.current !== filtersKey) {
          prevFiltersRef.current = filtersKey;
          debouncedFilterContactsRef.current(
              formData.contact_filters,
              formData.filter_logic,
              formData.is_dynamic_campaign
          );
      }
  }, [isOpen, filtersKey, formData.is_dynamic_campaign, allValidCompanyContacts, currentUser]); // Added allValidCompanyContacts and currentUser dependencies

  // Sincronizar selectedContacts com formData.selected_contacts
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      selected_contacts: selectedContacts
    }));
  }, [selectedContacts]);

  const getTotalSelectedContacts = useCallback(() => {
    // If it's a dynamic campaign (regardless of recurrence type), the contacts are found by filters dynamically.
    // The simulation data is only relevant for *recurring* dynamic campaigns to show a preview.
    // For a dynamic campaign, manual selection is disabled, so selectedContacts will be empty.
    if (formData.is_dynamic_campaign) {
      return simulatedBatches.first.contacts.length; // Show first batch simulation count for dynamic campaigns
    }
    return selectedContacts.length;
  }, [selectedContacts, formData.is_dynamic_campaign, simulatedBatches.first.contacts.length]);

  // Handlers para seleção de contatos
  const handleContactToggle = useCallback((contactId) => {
    // If it's a dynamic campaign, manual selection is not allowed.
    if (formData.is_dynamic_campaign) {
      return;
    }

    setSelectedContacts(prev => {
      if (prev.includes(contactId)) {
        return prev.filter(id => id !== contactId);
      } else {
        return [...prev, contactId];
      }
    });
  }, [formData.is_dynamic_campaign]);

  const handleSelectAll = useCallback(() => {
    // If it's a dynamic campaign, manual selection is not allowed.
    if (formData.is_dynamic_campaign) return;

    setSelectedContacts(prev => {
      if (prev.length === filteredContacts.length) {
        // All are selected, so deselect all
        return [];
      } else {
        // Not all are selected, so select all
        return filteredContacts.map(c => c.id);
      }
    });
  }, [formData.is_dynamic_campaign, filteredContacts]);

  // Funções de gerenciamento de filtros
  const handleAddFilter = () => {
    const newFilter = {
      id: generateId(),
      category: '',
      field: '',
      operator: '',
      value: ''
    };
    setFormData(prev => ({
      ...prev,
      contact_filters: [...(Array.isArray(prev.contact_filters) ? prev.contact_filters : []), newFilter]
    }));
  };

  const handleRemoveFilter = (filterId) => {
    setFormData(prev => ({
      ...prev,
      contact_filters: (Array.isArray(prev.contact_filters) ? prev.contact_filters : []).filter(f => f.id !== filterId)
    }));
  };

  const handleFilterChange = (filterId, field, value) => {
    setFormData(prev => {
      const filters = Array.isArray(prev.contact_filters) ? prev.contact_filters : [];
      const updatedFilters = filters.map(filter => {
        if (filter.id === filterId) {
          const updated = { ...filter, [field]: value };

          // Reset dependent fields when category or field changes
          if (field === 'category') {
            updated.field = '';
            updated.operator = '';
            updated.value = '';
          } else if (field === 'field') {
            updated.operator = '';
            updated.value = '';
          } else if (field === 'operator') {
            // If operator changes for 'campanha' category, clear value if it's no longer 'with_errors'
            if (filter.category === 'campanha') {
              if (value !== 'with_errors') {
                updated.value = '';
              }
            } else { // For other categories
              const oldOperatorRequiresValue = needsValue({ ...filter, operator: filter.operator });
              const newOperatorRequiresValue = needsValue({ ...filter, operator: value });
              if (oldOperatorRequiresValue && !newOperatorRequiresValue) {
                updated.value = '';
              }
            }
          }

          return updated;
        }
        return filter;
      });

      return { ...prev, contact_filters: updatedFilters };
    });
  };

  const getFieldOptions = (category) => {
    if (!category) return [];

    if (category === 'campanha') {
      return availableCampaigns.map(campaign => ({
        id: campaign.id,
        name: campaign.name,
        operators: campaignOperators,
        values: 'campaign_dynamic'
      }));
    }

    return filterOptions[category] || [];
  };

  const getOperatorOptions = (category, fieldId) => {
    if (!category || !fieldId) return [];

    if (category === 'campanha') {
      return campaignOperators;
    }

    const categoryOptions = filterOptions[category] || [];
    const field = categoryOptions.find(f => f.id === fieldId);
    return field?.operators || [];
  };

  const renderValueInput = (filter) => {
    const category = filter.category;

    // For 'campanha' category
    if (category === 'campanha') {
      const operator = filter.operator;

      const operatorsWithoutValue = ['all_contacts', 'pending', 'success', 'cancelled'];

      if (operatorsWithoutValue.includes(operator)) {
        return (
          <Input
            disabled
            placeholder="Não requer valor"
            className="rounded-xl border-gray-200 bg-gray-100"
          />
        );
      }

      if (operator === 'with_errors') {
        return (
          <Select
            value={filter.value}
            onValueChange={(value) => handleFilterChange(filter.id, 'value', value)}
            disabled={!filter.operator}
          >
            <SelectTrigger className="rounded-xl border-gray-200 bg-white">
              <SelectValue placeholder="Selecione o tipo de erro..." />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {errorTypeValues.map((errorType) => (
                <SelectItem key={errorType.id} value={errorType.id}>
                  {errorType.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }

      return (
        <Input
          disabled
          placeholder="Selecione a condição primeiro"
          className="rounded-xl border-gray-200 bg-gray-100"
        />
      );
    }

    // Existing logic for other categories
    const categoryOptions = filterOptions[filter.category] || [];
    const fieldDef = categoryOptions.find(f => f.id === filter.field);

    if (!fieldDef) {
      return (
        <Input
          disabled
          placeholder="Selecione o campo primeiro"
          className="rounded-xl border-gray-200 bg-gray-100"
        />
      );
    }

    const operatorsWithoutValue = ['is_true', 'is_false', 'is_filled', 'is_not_filled', 'is_valid', 'is_invalid', 'is_today', 'is_this_week', 'is_this_month'];
    if (operatorsWithoutValue.includes(filter.operator)) {
      return (
        <Input
          disabled
          placeholder="Não requer valor"
          className="rounded-xl border-gray-200 bg-gray-100"
        />
      );
    }

    // Dynamic options (tags, status, source, etc.)
    if (fieldDef.values === 'dynamic_tags') {
      return (
        <Select
          value={filter.value}
          onValueChange={(value) => handleFilterChange(filter.id, 'value', value)}
          disabled={!filter.operator}
        >
          <SelectTrigger className="rounded-xl border-gray-200 bg-white">
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {tags.map((tag) => (
              <SelectItem key={tag.id} value={tag.id}>
                {tag.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (fieldDef.values === 'dynamic_status' || fieldDef.values === 'dynamic_company_name' || fieldDef.values === 'dynamic_source') {
      const optionsKey = fieldDef.values.replace('dynamic_', '');
      const options = dynamicOptions[optionsKey] || [];
      const isLoading = isLoadingOptions[optionsKey] || false;

      return (
        <Select
          value={filter.value}
          onValueChange={(value) => handleFilterChange(filter.id, 'value', value)}
          disabled={!filter.operator || isLoading}
        >
          <SelectTrigger className="rounded-xl border-gray-200 bg-white">
            <SelectValue placeholder={isLoading ? "Carregando..." : "Selecione..."} />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    // Static options
    if (Array.isArray(fieldDef.values)) {
      const isDisabled = !filter.operator;

      return (
        <Select
          value={filter.value}
          onValueChange={(value) => handleFilterChange(filter.id, 'value', value)}
          disabled={isDisabled}
        >
          <SelectTrigger className="rounded-xl border-gray-200 bg-white">
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {fieldDef.values.map((opt) => (
              <SelectItem key={opt.id} value={opt.id}>
                {opt.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    // Number input
    if (fieldDef.values === 'number') {
      return (
        <Input
          type="number"
          value={filter.value}
          onChange={(e) => handleFilterChange(filter.id, 'value', e.target.value)}
          placeholder="Digite um número"
          className="rounded-xl border-gray-200 bg-white"
          disabled={!filter.operator}
        />
      );
    }

    // Text input (default)
    return (
      <Input
        type="text"
        value={filter.value}
        onChange={(e) => handleFilterChange(filter.id, 'value', e.target.value)}
        placeholder="Digite o valor"
        className="rounded-xl border-gray-200 bg-white"
        disabled={!filter.operator}
      />
    );
  };

  const toggleTemplate = (templateId) => {
    setFormData(prev => {
      const currentSelected = Array.isArray(prev.selected_templates) ? prev.selected_templates : [];
      const currentOrder = Array.isArray(prev.template_order) ? prev.template_order : [];

      let newSelectedTemplates, newTemplateOrder;

      if (currentSelected.includes(templateId)) {
        // Remover template e todas suas variações da ordem
        newSelectedTemplates = currentSelected.filter(id => id !== templateId);
        newTemplateOrder = currentOrder.filter(item => item.template_id !== templateId);
      } else {
        // Adicionar template (apenas original por padrão)
        newSelectedTemplates = [...currentSelected, templateId];
        newTemplateOrder = [...currentOrder, { 
          id: `${templateId}-original-${Date.now()}`, 
          template_id: templateId, 
          variation_index: null // null = mensagem original
        }];
      }

      return {
        ...prev,
        selected_templates: newSelectedTemplates,
        template_order: newTemplateOrder
      };
    });
  };

  const toggleVariation = (templateId, variationIndex) => {
    setFormData(prev => {
      const currentOrder = Array.isArray(prev.template_order) ? prev.template_order : [];
      
      // Verificar se esta variação já existe na ordem
      const existingIndex = currentOrder.findIndex(
        item => item.template_id === templateId && item.variation_index === variationIndex
      );

      let newOrder;
      if (existingIndex >= 0) {
        // Remover esta variação
        newOrder = currentOrder.filter((_, idx) => idx !== existingIndex);
      } else {
        // Adicionar esta variação ao final
        newOrder = [...currentOrder, {
          id: `${templateId}-var${variationIndex}-${Date.now()}`,
          template_id: templateId,
          variation_index: variationIndex
        }];
      }

      return {
        ...prev,
        template_order: newOrder
      };
    });
  };

  const isVariationSelected = (templateId, variationIndex) => {
    return formData.template_order.some(
      item => item.template_id === templateId && item.variation_index === variationIndex
    );
  };

  const moveItemUp = (itemId) => {
    setFormData(prev => {
      const newOrder = [...(Array.isArray(prev.template_order) ? prev.template_order : [])];
      const index = newOrder.findIndex(item => item.id === itemId);
      if (index > 0) {
        [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
      }
      return { ...prev, template_order: newOrder };
    });
  };

  const moveItemDown = (itemId) => {
    setFormData(prev => {
      const newOrder = [...(Array.isArray(prev.template_order) ? prev.template_order : [])];
      const index = newOrder.findIndex(item => item.id === itemId);
      if (index >= 0 && index < newOrder.length - 1) {
        [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      }
      return { ...prev, template_order: newOrder };
    });
  };

  const handleSessionToggle = (sessionId) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    setFormData(prev => {
      const currentSelected = Array.isArray(prev.selected_sessions) ? prev.selected_sessions : [];
      const sessionNameFromEntity = session.session_name;

      const isSelected = currentSelected.includes(sessionNameFromEntity);

      return {
        ...prev,
        selected_sessions: isSelected
          ? currentSelected.filter(name => name !== sessionNameFromEntity)
          : [...currentSelected, sessionNameFromEntity]
      };
    });
  };

  const showNotification = (type, message) => {
    setNotification({
      show: true,
      type,
      message
    });

    setTimeout(() => {
      setNotification({
        show: false,
        type: 'success',
        message: ''
      });
    }, 5000);
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const totalSelected = getTotalSelectedContacts();
    if (totalSelected === 0 && !formData.is_dynamic_campaign) {
      setSubmitError('Selecione pelo menos um contato para criar a campanha.');
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (!formData.name?.trim()) {
        setSubmitError("Por favor, insira um nome para a campanha.");
        setIsSubmitting(false);
        return;
      }

      const isScheduledOrRecurring = formData.schedule_type === 'scheduled' || formData.schedule_type === 'recurring' || formData.schedule_type === 'smart';
      if (isScheduledOrRecurring && (!formData.scheduled_date || !formData.scheduled_time)) {
        setSubmitError("Para envio agendado, recorrente ou inteligente, por favor, selecione data e hora de início.");
        setIsSubmitting(false);
        return;
      }

      if (isScheduledOrRecurring && !isValidTimeForToday(formData.scheduled_date, formData.scheduled_time)) {
        setSubmitError("A data e hora agendadas não podem ser no passado.");
        setIsSubmitting(false);
        return;
      }

      // Validação específica para Envio Inteligente
      if (formData.schedule_type === 'smart') {
        if (formData.smart_send_settings.days_to_split < 1 || formData.smart_send_settings.days_to_split > getTotalSelectedContacts()) {
          setSubmitError('O número de dias deve estar entre 1 e o total de contatos selecionados.');
          setIsSubmitting(false);
          return;
        }

        if (formData.smart_send_settings.enable_recurrence) {
          if (formData.smart_send_settings.selected_weekdays.length === 0) {
            setSubmitError('Selecione pelo menos um dia da semana para a recorrência.');
            setIsSubmitting(false);
            return;
          }

          if (formData.smart_send_settings.recurrence_count < 1 || formData.smart_send_settings.recurrence_count > 30) {
            setSubmitError('O número de repetições deve estar entre 1 e 30.');
            setIsSubmitting(false);
            return;
          }
        }
      }

      // Validação de filtros
      const allFiltersValid = formData.contact_filters.every(f => {
        if (!f.category || !f.field || !f.operator) {
          return false;
        }

        if (f.category === 'campanha') {
          if (!f.field) return false; // campaign_id should be in 'field'
          if (f.operator === 'with_errors' && !f.value) return false; // error_type must be selected
          return true;
        }

        if (needsValue(f)) {
          if (!(f.value && String(f.value).trim() !== '')) return false;
        }
        return true;
      });

      if (formData.is_dynamic_campaign) {
        if (!Array.isArray(formData.contact_filters) || formData.contact_filters.length === 0) {
          setSubmitError('É necessário adicionar pelo menos um filtro para campanhas dinâmicas.');
          setIsSubmitting(false);
          return;
        }
        if (!allFiltersValid) {
          setSubmitError('Para campanha dinâmica, é necessário definir filtros de contato válidos e preenchidos.');
          setIsSubmitting(false);
          return;
        }
      } else { // Static campaign needs contacts, and if filters are used, they must be valid.
        if (formData.contact_filters.length > 0 && !allFiltersValid) {
          setSubmitError('Os filtros de contato configurados são inválidos ou incompletos.');
          setIsSubmitting(false);
          return;
        }
      }

      if (!Array.isArray(formData.selected_templates) || formData.selected_templates.length === 0) {
        setSubmitError("Por favor, selecione pelo menos uma mensagem.");
        setIsSubmitting(false);
        return;
      }

      if (!Array.isArray(formData.selected_sessions) || formData.selected_sessions.length === 0) {
        setSubmitError("Por favor, selecione pelo menos uma sessão WhatsApp.");
        setIsSubmitting(false);
        return;
      }

      const formatPhoneNumberForAPI = (phone) => {
        if (!phone) return null;
        let cleanPhone = phone.toString().replace(/\D/g, '');

        if (cleanPhone.startsWith('55')) {
          return cleanPhone;
        }

        if (cleanPhone.length >= 10 && cleanPhone.length <= 11) {
          return `55${cleanPhone}`;
        }

        return null;
      };

      let recipientsToSubmit = [];
      if (formData.is_dynamic_campaign) {
        recipientsToSubmit = []; // Dynamic campaigns don't submit static recipients
      } else {
        // Use filteredContacts as the source, which already includes system tag filtering
        const contactsSource = filteredContacts;

        recipientsToSubmit = contactsSource
            .filter(contact => selectedContacts.includes(contact.id))
            .map(contact => {
                if (!contact || !contact.phone) return null;

                const formattedPhone = formatPhoneNumberForAPI(contact.phone);
                if (!formattedPhone) return null;

                return {
                    contact_id: contact.id,
                    name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
                    phone: formattedPhone,
                    email: contact.email,
                    status: 'pending'
                };
            })
            .filter(Boolean);

        if (recipientsToSubmit.length === 0 && totalSelected > 0) {
          setSubmitError('Nenhum dos contatos selecionados possui um número de telefone válido com DDI 55 para envio.');
          setIsSubmitting(false);
          return;
        }
      }

      let scheduleData = {
        ...formData,
        type: formData.schedule_type,
        scheduled_date: (isScheduledOrRecurring) && formData.scheduled_date ? formData.scheduled_date.toISOString() : null,
        scheduled_time: (isScheduledOrRecurring) ? formData.scheduled_time : null,
        filter_logic: formData.filter_logic,
        is_dynamic_campaign: formData.is_dynamic_campaign,
        recipients: recipientsToSubmit,
        total_recipients: getTotalSelectedContacts(),
        status: (isScheduledOrRecurring) ? 'pending' : 'processing',
        selected_sessions: formData.selected_sessions,
        delivery_settings: {
          ...formData.delivery_settings,
          speed_mode: sendingSpeed
        }
      };

      if (formData.schedule_type === 'recurring') {
        scheduleData.recurrence_settings = {
          ...formData.recurrence_settings,
          end_date: formData.recurrence_settings.end_date ? new Date(formData.recurrence_settings.end_date).toISOString() : null
        };
      } else if (formData.schedule_type === 'smart') {
        // Incluir configurações de envio inteligente
        scheduleData.smart_send_settings = formData.smart_send_settings;
      } else {
        delete scheduleData.recurrence_settings;
        delete scheduleData.smart_send_settings;
      }

      delete scheduleData.schedule_type;
      delete scheduleData.message_sequence_type;
      delete scheduleData.trigger_type;
      delete scheduleData.source_type;
      delete scheduleData.selected_campaigns;
      delete scheduleData.selected_tags;
      scheduleData.template_order = formData.template_order;

      console.log('[components/scheduler/ScheduleFormModal.js] Enviando dados do agendamento:', scheduleData);

      // MUDANÇA: Aguardar 2 segundos de animação antes de fechar
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Fechar modal e resetar
      onClose();
      resetForm();
      setIsSubmitting(false);

      // Notificar que está processando
      if (window.showNotification) {
        window.showNotification('info', 'Processando campanha em segundo plano...');
      }

      // Continuar processamento em segundo plano
      onSubmit(scheduleData).then(result => {
        if (result && result.success) {
          let successMessage = '';
          if (scheduleData.type === 'immediate') {
            successMessage = 'Campanha criada! O envio das mensagens foi iniciado em segundo plano.';
          } else if (scheduleData.type === 'scheduled') {
            successMessage = 'Campanha agendada com sucesso!';
          } else if (scheduleData.type === 'recurring') {
            successMessage = 'Campanha recorrente configurada com sucesso! Aguardando aprovação dos lotes.';
          }
          if (window.showNotification) {
            window.showNotification('success', successMessage);
          }
        } else {
          const errorMessage = result?.error || result?.data?.error || 'Erro desconhecido ao criar campanha';
          if (window.showNotification) {
            window.showNotification('error', `Erro: ${errorMessage}`);
          }
        }
      }).catch(error => {
        console.error('[components/scheduler/ScheduleFormModal.js] Erro no processamento em segundo plano:', error);
        if (window.showNotification) {
          window.showNotification('error', `Erro ao criar campanha: ${error.message}`);
        }
      });

    } catch (error) {
      console.error('[components/scheduler/ScheduleFormModal.js] Erro no submit:', error);
      setSubmitError(error.message || 'Erro ao criar campanha');
      setIsSubmitting(false);
    }
  };

  const handleTemplateCreate = async (templateData) => {
    try {
      const user = await User.me();
      if (!user?.company_id) {
        showNotification("error", "Não foi possível obter o ID da empresa do usuário.");
        return;
      }

      const templateToSave = {
        ...templateData,
        company_id: user.company_id,
      };

      const newTemplate = await MessageTemplate.create(templateToSave);

      // Reload data to get the fresh list of templates
      await loadData();

      // Automatically select the new template
      setFormData((prev) => ({
        ...prev,
        selected_templates: [...(Array.isArray(prev.selected_templates) ? prev.selected_templates : []), newTemplate.id],
        template_order: [...(Array.isArray(prev.template_order) ? prev.template_order : []), newTemplate.id],
      }));

      showNotification("success", "Novo modelo de mensagem salvo e selecionado!");
      setShowTemplateForm(false);
    } catch (error) {
      console.error("Erro ao criar e salvar template:", error);
      showNotification(
        "error",
        "Erro ao salvar o novo modelo: " + (error.message || "Erro desconhecido")
      );
    }
  };

  const getSessionStrategyDescription = () => {
    switch (formData.session_sending_strategy) {
      case 'sequential':
        return 'As mensagens serão enviadas usando as sessões na ordem em que foram selecionadas.';
      case 'random':
        return 'Para cada mensagem, uma sessão será escolhida aleatoriamente dentre as sessões selecionadas.';
      case 'smart':
        return 'O sistema verificará a última sessão que interagiu com cada contato e usará essa sessão. Se não houver histórico, usará ordem sequencial.';
      default:
        return '';
    }
  };

  const getSessionStatusText = (status) => {
    switch (status) {
      case 'WORKING': return 'Ativa';
      case 'SCAN_QR_CODE': return 'Aguardando QR';
      case 'FAILED': return 'Falhou';
      case 'STOPPED': return 'Parada';
      default: return status;
    }
  };

  const canSubmit = useMemo(() => {
    const hasName = formData.name.trim() !== '';
    const hasTemplate = Array.isArray(formData.selected_templates) && formData.selected_templates.length > 0;
    const hasSession = Array.isArray(formData.selected_sessions) && formData.selected_sessions.length > 0;

    const isScheduledOrRecurring = formData.schedule_type === 'scheduled' || formData.schedule_type === 'recurring' || formData.schedule_type === 'smart';
    const isDateTimeValid = !isScheduledOrRecurring || (formData.scheduled_date && formData.scheduled_time && isValidTimeForToday(formData.scheduled_date, formData.scheduled_time));
    
    // Validação adicional para Envio Inteligente
    const isSmartSendValid = formData.schedule_type !== 'smart' || (
      formData.smart_send_settings.days_to_split >= 1 &&
      formData.smart_send_settings.days_to_split <= getTotalSelectedContacts() &&
      (!formData.smart_send_settings.enable_recurrence || (
        formData.smart_send_settings.selected_weekdays.length > 0 &&
        formData.smart_send_settings.recurrence_count >= 1 &&
        formData.smart_send_settings.recurrence_count <= 30
      ))
    );

    const allFiltersValid = formData.contact_filters.every(f => {
      if (!f.category || !f.field || !f.operator) {
        return false;
      }
      // Specific validation for 'campanha' category
      if (f.category === 'campanha') {
        if (!f.field) return false; // campaign_id should be in 'field'
        if (f.operator === 'with_errors' && !f.value) return false; // error_type must be selected
        return true;
      }

      // General validation for other categories
      if (needsValue(f)) {
        if (!(f.value && String(f.value).trim() !== '')) return false;
      }
      return true;
    });

    const hasValidFilters = formData.contact_filters.length === 0 || allFiltersValid;

    const hasRecipients = formData.is_dynamic_campaign // If dynamic, it's ready if filters are valid
      ? (formData.contact_filters.length > 0 && allFiltersValid)
      : getTotalSelectedContacts() > 0; // If static, actual contacts must be selected

    return hasName && hasTemplate && hasSession && isDateTimeValid && hasValidFilters && hasRecipients && isSmartSendValid;
  }, [formData, getTotalSelectedContacts, isValidTimeForToday, needsValue]);

  // Componente memoizado para item de contato
  const ContactItem = React.memo(({ contact, isSelected, onToggle }) => (
    <div
      className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg"
    >
      <Checkbox
        id={`contact-${contact.id}`}
        checked={isSelected}
        onCheckedChange={(checked) => onToggle(contact.id)}
        onClick={(e) => e.stopPropagation()}
        className="custom-checkbox"
      />
      <Avatar className="w-8 h-8">
        <AvatarImage src={contact.avatar_url} alt={`${contact.first_name} ${contact.last_name}`} />
        <AvatarFallback className="text-xs bg-gray-100 text-gray-600">
          {contact.first_name?.[0]}{contact.last_name?.[0]}
        </AvatarFallback>
      </Avatar>
      <div 
        className="flex-1 cursor-pointer"
        onClick={() => onToggle(contact.id)}
      >
        <p className="text-sm font-medium text-gray-900">
          {contact.first_name} {contact.last_name}
        </p>
        <p className="text-xs text-gray-500">{formatPhoneNumber(contact.phone)}</p>
      </div>
    </div>
  ));


  if (!isOpen) return null;

  return (
    <>
      <style key="custom-modal-styles">
        {`
          .custom-checkbox[data-state="checked"] {
            background-color: #2563eb !important;
            border-color: #2563eb !important;
          }

          .custom-checkbox {
            border-color: #2563eb !important;
          }

          .custom-checkbox:focus-visible {
            box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2) !important;
            outline: none;
          }
        `}
      </style>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent
          className="max-w-4xl w-[95vw] sm:w-[90vw] md:w-[85vw] lg:w-[80vw] xl:max-w-4xl max-h-[95vh] p-0 overflow-hidden flex flex-col rounded-[2.5rem] [&>button]:hidden"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>{schedule ? 'Editar Campanha' : 'Nova Campanha'}</DialogTitle>
            <DialogDescription>
              {schedule ? 'Atualize as configurações da campanha' : 'Configure e agende envios de mensagens'}
            </DialogDescription>
          </DialogHeader>

          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center">
                  <Send className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {schedule ? 'Editar Campanha' : 'Nova Campanha'}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {schedule ? 'Atualize as configurações da campanha' : 'Configure e agende envios de mensagens'}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                disabled={isSubmitting}
                className="h-8 w-8 rounded-lg"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Content - Scrollable */}
          <div 
            className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6 sm:space-y-8"
            style={{ 
              maxHeight: 'calc(95vh - 140px)',
              minHeight: '300px'
            }}
          >

              {/* 1. Informações Básicas */}
              <Card className="rounded-2xl border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Info className="w-5 h-5 text-blue-600" />
                    Informações Básicas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-sm font-medium">
                      Nome da Campanha <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Digite o nome da campanha"
                      className="mt-1 rounded-xl border-gray-200 w-full"
                    />
                  </div>

                  <div>
                    <Label htmlFor="channel" className="text-sm font-medium">Canal</Label>
                    <Select
                      value={formData.message_type}
                      onValueChange={(value) => handleInputChange('message_type', value)}
                    >
                      <SelectTrigger className="mt-1 rounded-xl border-gray-200 w-full">
                        <SelectValue placeholder="Selecione o canal" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="email" disabled>Email (Em breve)</SelectItem>
                        <SelectItem value="sms" disabled>SMS (Em breve)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* 2. Configuração de Sessões WhatsApp (Movido para cima) */}
              <Card className="rounded-2xl border-gray-200">
                <CardHeader className="pb-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Smartphone className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                    Configuração de Sessões WhatsApp
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Seleção de Sessões */}
                  <div>
                    <Label className="text-sm font-medium">
                      Selecionar Sessões <span className="text-red-500">*</span>
                    </Label>
                    <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-xl p-3 space-y-3">
                      {isLoadingSessions ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
                          <span className="ml-2 text-sm text-gray-600">Carregando sessões...</span>
                        </div>
                      ) : Array.isArray(sessions) && sessions.length > 0 ? sessions.map((session) => (
                        <div key={session.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                          <Checkbox
                            id={`session-${session.id}`}
                            className="custom-checkbox"
                            checked={Array.isArray(formData.selected_sessions) && formData.selected_sessions.includes(session.session_name)}
                            onCheckedChange={() => handleSessionToggle(session.id)}
                          />

                          <div className="flex-shrink-0">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={session.avatar_url} alt={`Avatar de ${getSessionDisplayName(session)}`} />
                              <AvatarFallback className="bg-gradient-to-br from-green-400 to-green-500 text-white font-medium text-sm">
                                {getSessionDisplayName(session).charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          </div>

                          <div className="flex-1 min-w-0">
                            <Label htmlFor={`session-${session.id}`} className="text-sm font-medium text-gray-900 block cursor-pointer">
                              {session.custom_name || session.session_name}
                            </Label>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {formatPhoneNumber(session.phone)}
                            </p>
                          </div>

                          <Badge
                            variant="outline"
                            className={`text-xs flex-shrink-0 ${getSessionStatusColor(session.status)}`}
                          >
                            {getSessionStatusText(session.status)}
                          </Badge>
                        </div>
                      )) : (
                        <div className="text-center py-6 text-gray-500">
                          <Smartphone className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                          <p className="text-sm">Nenhuma sessão ativa encontrada</p>
                          <p className="text-xs mt-1">Conecte uma sessão WhatsApp primeiro</p>
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-gray-500 mt-2">
                      {sessions.length} sessão(ões) disponível(eis) • {Array.isArray(formData.selected_sessions) ? formData.selected_sessions.length : 0} selecionada(s)
                    </div>
                  </div>

                  {Array.isArray(formData.selected_sessions) && formData.selected_sessions.length > 1 && (
                    <div>
                      <Label htmlFor="session_sending_strategy" className="text-sm font-medium">Estratégia de Distribuição entre Sessões</Label>
                      <Select
                        value={formData.session_sending_strategy}
                        onValueChange={(value) => handleInputChange('session_sending_strategy', value)}
                      >
                        <SelectTrigger className="mt-1 rounded-xl border-gray-200 w-full">
                          <SelectValue placeholder="Como distribuir entre as sessões" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="sequential">
                            <div className="flex items-center gap-2">
                              <ArrowRight className="w-4 h-4" />
                              <div>
                                <p className="font-medium">Sequencial</p>
                                <p className="text-xs text-gray-500">Uma sessão por vez, em ordem</p>
                              </div>
                            </div>
                          </SelectItem>
                          <SelectItem value="random">
                            <div className="flex items-center gap-2">
                              <Shuffle className="w-4 h-4" />
                              <div>
                                <p className="font-medium">Aleatório</p>
                                <p className="text-xs text-gray-500">Escolha aleatória entre as sessões</p>
                              </div>
                            </div>
                          </SelectItem>
                          <SelectItem value="smart" disabled>
                            <div className="flex items-center gap-2">
                              <Brain className="w-4 h-4 text-gray-400" />
                              <div>
                                <p className="font-medium text-gray-400">Inteligente</p>
                                <p className="text-xs text-gray-400">Em breve - baseado no histórico</p>
                              </div>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-xl">
                        <p className="text-sm text-green-800">
                          <Info className="w-4 h-4 inline mr-1" />
                          {getSessionStrategyDescription()}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 3. Destinatários */}
              <Card className="rounded-2xl border-gray-200">
                <CardHeader className="pb-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                    Destinatários {getTotalSelectedContacts() > 0 && <span className="ml-2 bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded-full">{getTotalSelectedContacts()}</span>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Campanhas Dinâmicas */}
                  <div className={`flex items-start gap-3 p-4 bg-gradient-to-r ${formData.is_dynamic_campaign ? 'from-purple-50 to-indigo-50 border-purple-300' : 'from-gray-50 to-gray-100 border-gray-200'} border rounded-xl transition-all`}>
                    <div className="flex items-center h-5">
                      <Checkbox
                        id="is_dynamic_campaign"
                        checked={formData.is_dynamic_campaign}
                        onCheckedChange={(checked) => {
                          handleInputChange('is_dynamic_campaign', checked);
                          // Se ativar campanha dinâmica, forçar tipo recorrente
                          if (checked) {
                            handleInputChange('schedule_type', 'recurring');
                            setSelectedContacts([]); // Limpar contatos selecionados
                          }
                        }}
                        className="custom-checkbox"
                      />
                    </div>
                    <div className="flex-1">
                      <label htmlFor="is_dynamic_campaign" className="text-sm font-medium text-gray-900 cursor-pointer flex items-center gap-2">
                        <Zap className={`w-4 h-4 ${formData.is_dynamic_campaign ? 'text-purple-600' : 'text-gray-500'}`} />
                        Campanha Dinâmica
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        Os contatos serão recalculados automaticamente a cada ciclo com base nos filtros definidos abaixo.
                        Ideal para campanhas que precisam sempre enviar para contatos que atendem critérios específicos no momento do envio.
                      </p>
                    </div>
                  </div>

                  {/* Filtros de Contatos - SEMPRE VISÍVEL */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Filtros de Contatos</Label>
                    <div className="space-y-3 mb-4">
                        {Array.isArray(formData.contact_filters) && formData.contact_filters.map((filter) => (
                          <div key={filter.id} className="flex gap-3 items-end p-4 border border-gray-200 rounded-xl bg-gray-50/50">
                              <div className="flex-1 space-y-2">
                                <Label className="text-xs text-gray-600">Categoria</Label>
                                <Select
                                  value={filter.category}
                                  onValueChange={(value) => handleFilterChange(filter.id, 'category', value)}
                                >
                                  <SelectTrigger className="rounded-xl border-gray-200 bg-white">
                                    <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                  <SelectContent className="rounded-xl">
                                    <SelectItem value="cadastro">Cadastro</SelectItem>
                                    <SelectItem value="cliente">Cliente</SelectItem>
                                    <SelectItem value="status">Status</SelectItem>
                                    <SelectItem value="tempo">Tempo</SelectItem>
                                    <SelectItem value="endereco">Endereço</SelectItem>
                                    <SelectItem value="observacoes">Observações</SelectItem>
                                    <SelectItem value="campanha">Campanha</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="flex-1 space-y-2">
                                <Label className="text-xs text-gray-600">Campo</Label>
                                {filter.category === 'campanha' ? (
                                  <Select
                                    value={filter.field}
                                    onValueChange={(value) => handleFilterChange(filter.id, 'field', value)}
                                    disabled={!filter.category}
                                  >
                                    <SelectTrigger className="rounded-xl border-gray-200 bg-white">
                                      <SelectValue placeholder="Selecione a campanha..." />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                      {getFieldOptions(filter.category).map((field) => (
                                        <SelectItem key={field.id} value={field.id}>
                                          {field.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Select
                                    value={filter.field}
                                    onValueChange={(value) => handleFilterChange(filter.id, 'field', value)}
                                    disabled={!filter.category}
                                  >
                                    <SelectTrigger className="rounded-xl border-gray-200 bg-white">
                                      <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                      {getFieldOptions(filter.category).map((field) => (
                                        <SelectItem key={field.id} value={field.id}>
                                          {field.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              </div>

                              <div className="flex-1 space-y-2">
                                <Label className="text-xs text-gray-600">Condição</Label>
                                <Select
                                  value={filter.operator}
                                  onValueChange={(value) => handleFilterChange(filter.id, 'operator', value)}
                                  disabled={!filter.field}
                                >
                                  <SelectTrigger className="rounded-xl border-gray-200 bg-white">
                                    <SelectValue placeholder="Selecione..." />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-xl">
                                    {getOperatorOptions(filter.category, filter.field).map((operator) => (
                                      <SelectItem key={operator.id} value={operator.id}>
                                        {operator.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="flex-1 space-y-2">
                                <Label className="text-xs text-gray-600">Valor</Label>
                                {renderValueInput(filter)}
                              </div>

                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => handleRemoveFilter(filter.id)}
                                className="rounded-xl text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                          </div>
                        ))}
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAddFilter}
                        className="rounded-xl border-purple-300 text-purple-600 hover:bg-purple-50"
                      >
                        <PlusCircle className="w-4 h-4 mr-2" />
                        Adicionar Filtro
                      </Button>

                    {/* Filter logic (AND/OR) selector */}
                    {Array.isArray(formData.contact_filters) && formData.contact_filters.length > 1 && (
                      <div className="flex items-center gap-4 bg-gray-100 p-3 rounded-xl mt-4">
                        <Label className="text-sm font-medium text-gray-700">Lógica entre as regras:</Label>
                        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border">
                          <Button
                            size="sm"
                            variant={formData.filter_logic === 'AND' ? 'secondary' : 'ghost'}
                            onClick={() => handleInputChange('filter_logic', 'AND')}
                            className="rounded-md h-8 text-xs"
                          >
                            E (Todas as condições)
                          </Button>
                          <Button
                            size="sm"
                            variant={formData.filter_logic === 'OR' ? 'secondary' : 'ghost'}
                            onClick={() => handleInputChange('filter_logic', 'OR')}
                            className="rounded-md h-8 text-xs"
                          >
                            OU (Qualquer condição)
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Lista de Contatos Filtrados - Oculta apenas se for dinâmica */}
                  {!formData.is_dynamic_campaign ? ( // Condition simplified
                    <>
                      <div className="my-6 border-t border-gray-200"></div>

                      {/* Informações sobre contatos filtrados */}
                      <div className="flex justify-between items-center mb-2">
                        <Label className="block text-sm font-medium text-gray-700">
                          Contatos Encontrados ({filteredContacts.length})
                        </Label>
                        {filteredContacts.length > 0 && (
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleSelectAll}
                              className="text-xs h-8 rounded-lg px-2 flex items-center gap-1.5"
                            >
                              {selectedContacts.length === filteredContacts.length ? (
                                <>
                                  <Square className="w-3.5 h-3.5" />
                                  Desmarcar Todos
                                </>
                              ) : (
                                <>
                                  <CheckSquare className="w-3.5 h-3.5" />
                                  Marcar Todos
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Lista de contatos com componente memoizado */}
                      {(isLoadingFilteredContacts || isLoadingAllCompanyContacts) ? ( // Use combined loading state
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                        </div>
                      ) : filteredContacts.length > 0 ? (
                        <ScrollArea className="h-64 rounded-lg border border-gray-200">
                          <div className="p-2 space-y-1">
                            {filteredContacts.map((contact) => (
                              <ContactItem
                                key={contact.id}
                                contact={contact}
                                isSelected={selectedContacts.includes(contact.id)}
                                onToggle={handleContactToggle}
                              />
                            ))}
                          </div>
                        </ScrollArea>
                      ) : (
                        <div className="text-center p-8 text-gray-500">
                          <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                          <p className="text-sm font-medium">Nenhum contato encontrado</p>
                          <p className="text-xs mt-1">Ajuste os filtros para encontrar contatos</p>
                        </div>
                      )}
                    </>
                  ) : (
                    /* Aviso para Campanhas Dinâmicas */
                    <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                      <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-amber-800">
                        <p className="font-medium">Campanha Dinâmica Ativa</p>
                        <p className="text-xs mt-1">
                          Os contatos serão calculados automaticamente em cada ciclo com base nos filtros acima.
                          Você não precisa selecionar contatos manualmente. A contagem de destinatários será exibida na aprovação de cada lote.
                        </p>
                        {formData.schedule_type === 'recurring' && simulatedBatches.first.date && (
                          <div className="mt-2 p-2 bg-white rounded-lg border border-amber-300 flex items-center gap-2">
                              <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                              <span className="text-xs text-amber-700">
                                Simulação para o primeiro lote ({format(simulatedBatches.first.date, 'dd/MM/yyyy')}):
                                <strong> {simulatedBatches.first.contacts.length} contatos </strong>
                                {simulatedBatches.first.loading && <Loader2 className="w-3.5 h-3.5 animate-spin ml-1 text-amber-500" />}
                              </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 4. Mensagens para Envio */}
              <Card className="rounded-2xl border-gray-200">
                <CardHeader className="pb-3 sm:pb-4">
                  <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                      Mensagens para Envio
                    </div>
                    {/* Botão Nova Mensagem desabilitado temporariamente */}
                    {/* <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowTemplateForm(true)}
                      className="rounded-xl border-orange-300 text-orange-600 hover:bg-orange-50"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Nova Mensagem
                    </Button> */}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Lista de Templates */}
                  <div className="space-y-3">
                    {/* Seção de Seleção de Templates */}
                    <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Selecionar Modelos
                      </h4>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {Array.isArray(messageTemplates) && messageTemplates.length > 0 ? (
                          messageTemplates.map((template) => {
                            const isSelected = Array.isArray(formData.selected_templates) && formData.selected_templates.includes(template.id);
                            const isSmartTemplate = template.is_smart_template && template.content_variations?.length > 0;

                            return (
                              <div key={template.id} className="space-y-2">
                                {/* Template Principal */}
                                <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-xl bg-white hover:bg-gray-50">
                                  <Checkbox
                                    id={`template-${template.id}`}
                                    className="custom-checkbox mt-1"
                                    checked={isSelected}
                                    onCheckedChange={() => toggleTemplate(template.id)}
                                  />

                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium text-gray-900 truncate">{template.name}</p>
                                      {isSmartTemplate && (
                                        <Badge className="bg-purple-100 text-purple-700 border-purple-300 text-xs">
                                          <Sparkles className="w-3 h-3 mr-1" />
                                          {template.content_variations.length + 1} msgs
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-500 truncate mt-1">{template.content}</p>
                                  </div>
                                </div>

                                {/* Expandir Variações se Smart Template estiver selecionado */}
                                {isSmartTemplate && isSelected && (
                                  <div className="ml-6 space-y-2 p-3 bg-purple-50 border border-purple-200 rounded-xl">
                                    <p className="text-xs font-semibold text-purple-900 mb-2 flex items-center gap-1">
                                      <Sparkles className="w-3 h-3" />
                                      Selecione as variações para incluir:
                                    </p>

                                    {/* Mensagem Original */}
                                    <div className="flex items-start gap-2 p-2 bg-white rounded-lg border border-purple-200">
                                      <Checkbox
                                        id={`var-${template.id}-original`}
                                        className="custom-checkbox mt-1"
                                        checked={isVariationSelected(template.id, null)}
                                        onCheckedChange={() => toggleVariation(template.id, null)}
                                      />
                                      <div className="flex-1">
                                        <Badge variant="outline" className="text-xs mb-1 bg-blue-100 text-blue-700 border-blue-300">
                                          Original
                                        </Badge>
                                        <p className="text-xs text-gray-700 line-clamp-2">
                                          {template.content}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Variações Geradas */}
                                    {template.content_variations.map((variation, idx) => (
                                      <div key={idx} className="flex items-start gap-2 p-2 bg-white rounded-lg border border-purple-200">
                                        <Checkbox
                                          id={`var-${template.id}-${idx}`}
                                          className="custom-checkbox mt-1"
                                          checked={isVariationSelected(template.id, idx)}
                                          onCheckedChange={() => toggleVariation(template.id, idx)}
                                        />
                                        <div className="flex-1">
                                          <Badge variant="outline" className="text-xs mb-1 bg-purple-100 text-purple-700 border-purple-300">
                                            Variação {idx + 1}
                                          </Badge>
                                          <p className="text-xs text-gray-700 line-clamp-2">
                                            {variation}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <h4 className="font-medium text-gray-600 mb-2">Nenhuma mensagem disponível</h4>
                            <p className="text-sm">Crie sua primeira mensagem clicando no botão "Nova Mensagem" acima.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Seção de Sequência de Envio */}
                    {formData.template_order.length > 0 && (
                      <div className="border border-blue-200 rounded-xl p-4 bg-blue-50">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <List className="w-4 h-4 text-blue-600" />
                          Sequência de Envio ({formData.template_order.length} mensagens)
                        </h4>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {formData.template_order.map((item, idx) => {
                            const template = messageTemplates.find(t => t.id === item.template_id);
                            if (!template) return null;

                            const isOriginal = item.variation_index === null;
                            const variationContent = isOriginal 
                              ? template.content 
                              : template.content_variations[item.variation_index];

                            return (
                              <div key={item.id} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-blue-200">
                                <Badge className="bg-blue-600 text-white text-xs font-bold min-w-[28px] justify-center">
                                  {idx + 1}
                                </Badge>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="text-xs font-medium text-gray-900 truncate">
                                      {template.name}
                                    </p>
                                    <Badge variant="outline" className={`text-xs ${isOriginal ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                      {isOriginal ? 'Original' : `Var. ${item.variation_index + 1}`}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-gray-600 line-clamp-1 mt-0.5">
                                    {variationContent}
                                  </p>
                                </div>

                                <div className="flex items-center gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => moveItemUp(item.id)}
                                    disabled={idx === 0}
                                  >
                                    <ArrowUp className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => moveItemDown(item.id)}
                                    disabled={idx === formData.template_order.length - 1}
                                  >
                                    <ArrowDown className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-red-500 hover:text-red-700"
                                    onClick={() => toggleVariation(item.template_id, item.variation_index)}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tipo de Agendamento */}
                  <div>
                    <Label htmlFor="schedule_type" className="text-sm font-medium">
                      Tipo de Agendamento
                      {formData.is_dynamic_campaign && (
                        <span className="ml-2 text-xs text-blue-600">(Bloqueado para Campanhas Dinâmicas)</span>
                      )}
                    </Label>
                    <Select
                      value={formData.schedule_type}
                      onValueChange={(value) => {
                        // Apenas mudar o tipo de agendamento, SEM limpar os contatos selecionados
                        setFormData(prev => ({
                          ...prev,
                          schedule_type: value
                        }));
                      }}
                      disabled={formData.is_dynamic_campaign} // Desabilitar se for campanha dinâmica
                    >
                      <SelectTrigger className={`mt-1 rounded-xl border-gray-200 w-full ${formData.is_dynamic_campaign ? 'bg-gray-100 cursor-not-allowed' : ''}`}>
                        <SelectValue placeholder="Selecione o tipo de envio" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="immediate">
                          <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4" />
                            <div>
                              <p className="font-medium">Envio Imediato</p>
                              <p className="text-xs text-gray-500">Enviar campanha agora</p>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="scheduled">
                           <div className="flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4" />
                            <div>
                              <p className="font-medium">Agendar Envio</p>
                              <p className="text-xs text-gray-500">Escolher data e hora específica</p>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="recurring">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <div>
                              <p className="font-medium">Envio Recorrente</p>
                              <p className="text-xs text-gray-500">Envio automático em intervalos definidos</p>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="smart">
                          <div className="flex items-center gap-2">
                            <Lightbulb className="w-4 h-4" />
                            <div>
                              <p className="font-medium">Envio Inteligente</p>
                              <p className="text-xs text-gray-500">Divida envios por dias com recorrência opcional</p>
                            </div>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {formData.is_dynamic_campaign && (
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        Campanhas dinâmicas requerem envio recorrente para recalcular destinatários a cada ciclo.
                      </p>
                    )}
                  </div>

                  {/* Date/Time Picker para Agendado */}
                  {formData.schedule_type === 'scheduled' && (
                      <div className="grid grid-cols-2 gap-4 p-4 border border-gray-100 rounded-xl bg-gray-50/50">
                          <div>
                              <Label htmlFor="scheduled_date" className="text-sm font-medium">Data do Envio</Label>
                              <Popover>
                                  <PopoverTrigger asChild>
                                      <Button
                                          variant={"outline"}
                                          className="w-full justify-start text-left font-normal mt-1 rounded-xl border-gray-200 bg-white"
                                      >
                                          <CalendarIcon className="mr-2 h-4 w-4" />
                                          {formData.scheduled_date ? format(formData.scheduled_date, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                                      </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0">
                                      <Calendar
                                          mode="single"
                                          selected={formData.scheduled_date}
                                          onSelect={(date) => handleInputChange('scheduled_date', date)}
                                          initialFocus
                                          disabled={(date) => isBefore(date, startOfDay(new Date()))}
                                      />
                                  </PopoverContent>
                              </Popover>
                          </div>
                          <div>
                              <Label htmlFor="scheduled_time" className="text-sm font-medium">Hora do Envio</Label>
                              <Input
                                  id="scheduled_time"
                                  type="time"
                                  value={formData.scheduled_time}
                                  onChange={(e) => handleInputChange('scheduled_time', e.target.value)}
                                  className="mt-1 rounded-xl border-gray-200 bg-white"
                              />
                          </div>
                      </div>
                  )}

                  {/* Configurações de Envio Inteligente */}
                  {formData.schedule_type === 'smart' && (
                    <div className="space-y-4 p-4 border border-gray-100 rounded-xl bg-gray-50/50">
                      <div className="flex items-center gap-2 mb-3">
                        <Lightbulb className="w-5 h-5 text-purple-600" />
                        <h4 className="font-semibold text-gray-900">Configurações de Envio Inteligente</h4>
                      </div>

                      {/* Data e Hora de Início */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium">Data de Início</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal mt-1 rounded-xl border-gray-200 bg-white"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {formData.scheduled_date ? format(formData.scheduled_date, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={formData.scheduled_date}
                                onSelect={(date) => handleInputChange('scheduled_date', date)}
                                initialFocus
                                disabled={(date) => isBefore(date, startOfDay(new Date()))}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div>
                          <Label className="text-sm font-medium">Horário</Label>
                          <Input
                            type="time"
                            value={formData.scheduled_time}
                            onChange={(e) => handleInputChange('scheduled_time', e.target.value)}
                            className="mt-1 rounded-xl border-gray-200 bg-white"
                          />
                        </div>
                      </div>

                      {/* Divisão de Envios */}
                      <div>
                        <Label className="text-sm font-medium mb-2 block">
                          Dividir envios em quantos dias?
                        </Label>
                        <div className="space-y-3">
                          <div className="flex items-center gap-4">
                            <Input
                              type="number"
                              min="1"
                              max={getTotalSelectedContacts()}
                              value={formData.smart_send_settings.days_to_split}
                              onChange={(e) => {
                                const value = Math.max(1, Math.min(getTotalSelectedContacts(), parseInt(e.target.value) || 1));
                                setFormData(prev => ({
                                  ...prev,
                                  smart_send_settings: {
                                    ...prev.smart_send_settings,
                                    days_to_split: value
                                  }
                                }));
                              }}
                              className="w-24 rounded-xl border-gray-200 bg-white"
                            />
                            <span className="text-sm text-gray-600">
                              dias (máximo: {getTotalSelectedContacts()})
                            </span>
                          </div>
                          
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                            <p className="text-xs text-blue-800">
                              <Calculator className="w-3 h-3 inline mr-1" />
                              {getTotalSelectedContacts()} contatos ÷ {formData.smart_send_settings.days_to_split} dias = 
                              <strong> ~{Math.ceil(getTotalSelectedContacts() / formData.smart_send_settings.days_to_split)} contatos por dia</strong>
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Habilitar Recorrência */}
                      <div className="flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-xl">
                        <Checkbox
                          id="smart_enable_recurrence"
                          checked={formData.smart_send_settings.enable_recurrence}
                          onCheckedChange={(checked) => {
                            setFormData(prev => ({
                              ...prev,
                              smart_send_settings: {
                                ...prev.smart_send_settings,
                                enable_recurrence: checked
                              }
                            }));
                          }}
                          className="custom-checkbox mt-0.5"
                        />
                        <div className="flex-1">
                          <label htmlFor="smart_enable_recurrence" className="text-sm font-medium text-gray-900 cursor-pointer flex items-center gap-2">
                            <RefreshCw className="w-4 h-4 text-gray-600" />
                            Habilitar Recorrência
                          </label>
                          <p className="text-xs text-gray-500 mt-1">
                            Repetir o ciclo de envios automaticamente após completar todos os dias.
                          </p>
                        </div>
                      </div>

                      {/* Configurações de Recorrência */}
                      {formData.smart_send_settings.enable_recurrence && (
                        <div className="space-y-4 p-4 bg-white border border-gray-200 rounded-xl">
                          <div>
                            <Label className="text-sm font-medium">Quantas vezes repetir?</Label>
                            <Input
                              type="number"
                              min="1"
                              max="30"
                              value={formData.smart_send_settings.recurrence_count}
                              onChange={(e) => {
                                const value = Math.max(1, Math.min(30, parseInt(e.target.value) || 1));
                                setFormData(prev => ({
                                  ...prev,
                                  smart_send_settings: {
                                    ...prev.smart_send_settings,
                                    recurrence_count: value
                                  }
                                }));
                              }}
                              className="mt-1 rounded-xl border-gray-200 bg-white w-32"
                            />
                            <p className="text-xs text-gray-500 mt-1">Máximo: 30 repetições</p>
                          </div>

                          {/* Seleção de Dias da Semana */}
                          <div>
                            <Label className="text-sm font-medium mb-2 block">Dias da semana para envio</Label>
                            <div className="grid grid-cols-7 gap-1.5">
                              {[
                                { day: 1, label: 'Seg.', full: 'Segunda-feira' },
                                { day: 2, label: 'Ter.', full: 'Terça-feira' },
                                { day: 3, label: 'Qua.', full: 'Quarta-feira' },
                                { day: 4, label: 'Qui.', full: 'Quinta-feira' },
                                { day: 5, label: 'Sex.', full: 'Sexta-feira' },
                                { day: 6, label: 'Sáb.', full: 'Sábado' },
                                { day: 7, label: 'Dom.', full: 'Domingo' }
                              ].map(({ day, label, full }) => {
                                const isSelected = formData.smart_send_settings.selected_weekdays.includes(day);
                                return (
                                  <TooltipProvider key={day}>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          type="button"
                                          variant={isSelected ? "default" : "outline"}
                                          size="sm"
                                          onClick={() => {
                                            setFormData(prev => ({
                                              ...prev,
                                              smart_send_settings: {
                                                ...prev.smart_send_settings,
                                                selected_weekdays: isSelected
                                                  ? prev.smart_send_settings.selected_weekdays.filter(d => d !== day)
                                                  : [...prev.smart_send_settings.selected_weekdays, day].sort()
                                              }
                                            }));
                                          }}
                                          className={`h-8 rounded-xl text-xs ${isSelected ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                                        >
                                          {label}
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>{full}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                );
                              })}
                            </div>
                            {formData.smart_send_settings.selected_weekdays.length === 0 && (
                              <p className="text-xs text-red-600 mt-2">Selecione pelo menos um dia da semana</p>
                            )}
                          </div>

                          {/* Exemplo de Funcionamento */}
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                            <p className="text-xs text-blue-900 font-medium mb-2">Como funcionará:</p>
                            <ul className="text-xs text-blue-800 space-y-1 list-disc pl-4">
                              <li>
                                <strong>{getTotalSelectedContacts()} contatos</strong> divididos em <strong>{formData.smart_send_settings.days_to_split} dias</strong>
                                = ~{Math.ceil(getTotalSelectedContacts() / formData.smart_send_settings.days_to_split)} por dia
                              </li>
                              <li>
                                Enviando apenas nos dias: {formData.smart_send_settings.selected_weekdays.map(d => 
                                  ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][d === 7 ? 0 : d]
                                ).join(', ')}
                              </li>
                              <li>
                                Ciclo completo se repete <strong>{formData.smart_send_settings.recurrence_count} vez(es)</strong>
                              </li>
                              {formData.is_dynamic_campaign && (
                                <li className="text-blue-900 font-medium">
                                  ⚡ Campanha dinâmica: os contatos serão recalculados em cada ciclo
                                </li>
                              )}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Configurações de Recorrência */}
                  {formData.schedule_type === 'recurring' && (
                    <div className="space-y-4 p-4 border border-gray-100 rounded-xl bg-gray-50/50">
                      <div className="flex items-center gap-2 mb-3">
                        <Clock className="w-4 h-4 text-indigo-600" />
                        <h4 className="font-medium text-gray-900">Configurações de Recorrência</h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Tipo de Recorrência */}
                        <div>
                          <Label className="text-sm font-medium">Frequência</Label>
                          <Select
                            value={formData.recurrence_settings.type}
                            onValueChange={(value) => setFormData(prev => ({
                              ...prev,
                              recurrence_settings: {
                                ...prev.recurrence_settings,
                                type: value,
                                // Reset day_of_week or day_of_month based on new type
                                day_of_week: value === 'weekly' ? prev.recurrence_settings.day_of_week : 1, // Reset to 1 (Monday) if not weekly
                                day_of_month: ['monthly', 'quarterly', 'yearly'].includes(value) ? prev.recurrence_settings.day_of_month : 1 // Reset to 1st if not monthly/quarterly/yearly
                              }
                            }))}
                          >
                            <SelectTrigger className="mt-1 rounded-xl border-gray-200 bg-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="daily">Diária</SelectItem>
                              <SelectItem value="weekly">Semanal</SelectItem>
                              <SelectItem value="monthly">Mensal</SelectItem>
                              <SelectItem value="quarterly">Trimestral</SelectItem>
                              <SelectItem value="yearly">Anual</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Intervalo */}
                        <div>
                          <Label className="text-sm font-medium">
                            A cada {formData.recurrence_settings.type === 'daily' ? 'dia(s)' :
                                   formData.recurrence_settings.type === 'weekly' ? 'semana(s)' :
                                   formData.recurrence_settings.type === 'monthly' ? 'mês(es)' :
                                   formData.recurrence_settings.type === 'quarterly' ? 'trimestre(s)' : 'ano(s)'}
                          </Label>
                          <Input
                            type="number"
                            min="1"
                            value={formData.recurrence_settings.frequency}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              recurrence_settings: { ...prev.recurrence_settings, frequency: parseInt(e.target.value) || 1 }
                            }))}
                            className="mt-1 rounded-xl border-gray-200 bg-white"
                          />
                        </div>

                        {/* Dia da Semana (se semanal) */}
                        {formData.recurrence_settings.type === 'weekly' && (
                          <div>
                            <Label className="text-sm font-medium">Dia da Semana</Label>
                            <Select
                              value={formData.recurrence_settings.day_of_week.toString()}
                              onValueChange={(value) => setFormData(prev => ({
                                ...prev,
                                recurrence_settings: { ...prev.recurrence_settings, day_of_week: parseInt(value) }
                              }))}
                            >
                              <SelectTrigger className="mt-1 rounded-xl border-gray-200 bg-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                <SelectItem value="1">Segunda-feira</SelectItem>
                                <SelectItem value="2">Terça-feira</SelectItem>
                                <SelectItem value="3">Quarta-feira</SelectItem>
                                <SelectItem value="4">Quinta-feira</SelectItem>
                                <SelectItem value="5">Sexta-feira</SelectItem>
                                <SelectItem value="6">Sábado</SelectItem>
                                <SelectItem value="7">Domingo</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* Dia do Mês (se mensal/trimestral/anual) */}
                        {['monthly', 'quarterly', 'yearly'].includes(formData.recurrence_settings.type) && (
                          <div>
                            <Label className="text-sm font-medium">Dia do Mês</Label>
                            <Input
                              type="number"
                              min="1"
                              max="31"
                              value={formData.recurrence_settings.day_of_month}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                recurrence_settings: { ...prev.recurrence_settings, day_of_month: parseInt(e.target.value) || 1 }
                              }))}
                              className="mt-1 rounded-xl border-gray-200 bg-white"
                            />
                          </div>
                        )}

                        {/* Horário */}
                        <div>
                          <Label className="text-sm font-medium">Horário de Envio</Label>
                          <Input
                            type="time"
                            value={formData.scheduled_time}
                            onChange={(e) => handleInputChange('scheduled_time', e.target.value)}
                            className="mt-1 rounded-xl border-gray-200 bg-white"
                          />
                        </div>

                        {/* Data de Início */}
                        <div>
                          <Label className="text-sm font-medium">Data de Início</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal mt-1 rounded-xl border-gray-200 bg-white"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {formData.scheduled_date ? format(formData.scheduled_date, "PPP", { locale: ptBR }) : <span>Data de início</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={formData.scheduled_date}
                                onSelect={(date) => handleInputChange('scheduled_date', date)}
                                initialFocus
                                disabled={(date) => isBefore(date, startOfDay(new Date()))}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>

                      {/* Configurações de Término */}
                      <div className="border-t pt-4">
                        <Label className="text-sm font-medium">Terminar Recorrência</Label>
                        <div className="mt-2 space-y-3">
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="after_count"
                              name="end_type"
                              value="after_count"
                              checked={formData.recurrence_settings.end_type === 'after_count'}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                recurrence_settings: { ...prev.recurrence_settings, end_type: e.target.value }
                              }))}
                              className="w-4 h-4 text-indigo-600"
                            />
                            <Label htmlFor="after_count" className="text-sm">Após</Label>
                            <Input
                              type="number"
                              min="1"
                              max="30"
                              value={formData.recurrence_settings.end_count}
                              onChange={(e) => {
                                let count = parseInt(e.target.value);
                                if (isNaN(count) || count < 1) {
                                    count = 1;
                                } else if (count > 30) {
                                    count = 30;
                                }
                                setFormData(prev => ({
                                  ...prev,
                                  recurrence_settings: { ...prev.recurrence_settings, end_count: count }
                                }))
                              }}
                              className="w-20 h-8 text-sm rounded-lg border-gray-200"
                              disabled={formData.recurrence_settings.end_type !== 'after_count'}
                            />
                            <span className="text-sm text-gray-600">envios</span>
                          </div>

                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="end_date"
                              name="end_type"
                              value="end_date"
                              checked={formData.recurrence_settings.end_type === 'end_date'}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                recurrence_settings: { ...prev.recurrence_settings, end_type: e.target.value }
                              }))}
                              className="w-4 h-4 text-indigo-600"
                              disabled={!formData.scheduled_date || !formData.recurrence_settings.frequency}
                            />
                            <Label htmlFor="end_date" className={`text-sm ${(!formData.scheduled_date || !formData.recurrence_settings.frequency) ? 'text-gray-400' : ''}`}>
                              Em uma data específica
                            </Label>

                            <div className="flex items-center gap-2">
                              {/* Input de data direta */}
                              <Input
                                type="date"
                                value={formData.recurrence_settings.end_date ? new Date(formData.recurrence_settings.end_date).toISOString().split('T')[0] : ''}
                                onChange={(e) => {
                                  if (e.target.value) {
                                    const selectedDate = new Date(e.target.value);
                                    const maxPossibleDate = maxEndDate;

                                    if (maxPossibleDate && selectedDate > maxPossibleDate) {
                                      // Data excede o limite - não atualiza e mostra erro
                                      // This is primarily handled by the 'max' attribute, but this is a fail-safe
                                      // if a user bypasses it (e.g., via console or pasting)
                                      return;
                                    }

                                    setFormData(prev => ({
                                      ...prev,
                                      recurrence_settings: {
                                        ...prev.recurrence_settings,
                                        end_date: selectedDate.toISOString()
                                      }
                                    }));
                                  } else {
                                    setFormData(prev => ({
                                      ...prev,
                                      recurrence_settings: {
                                        ...prev.recurrence_settings,
                                        end_date: null
                                      }
                                    }));
                                  }
                                }}
                                min={formData.scheduled_date ? new Date(formData.scheduled_date).toISOString().split('T')[0] : undefined}
                                max={maxEndDate ? maxEndDate.toISOString().split('T')[0] : undefined}
                                disabled={formData.recurrence_settings.end_type !== 'end_date' || !formData.scheduled_date || !formData.recurrence_settings.frequency}
                                className="rounded-lg border-gray-200 text-sm w-40"
                              />

                              {/* Botão alternativo do calendário */}
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-sm rounded-lg border-gray-200"
                                    disabled={formData.recurrence_settings.end_type !== 'end_date' || !formData.scheduled_date || !formData.recurrence_settings.frequency}
                                  >
                                    <CalendarIcon className="w-3 h-3" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                  <Calendar
                                    mode="single"
                                    selected={formData.recurrence_settings.end_date ? new Date(formData.recurrence_settings.end_date) : undefined}
                                    onSelect={(date) => setFormData(prev => ({
                                      ...prev,
                                      recurrence_settings: { ...prev.recurrence_settings, end_date: date?.toISOString() }
                                    }))}
                                    initialFocus
                                    disabled={(date) =>
                                      isBefore(date, startOfDay(formData.scheduled_date || new Date())) || (maxEndDate && isAfter(date, maxEndDate))
                                    }
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>

                          {/* Validação de data limite */}
                          {formData.recurrence_settings.end_type === 'end_date' && maxEndDate && (
                            <div className="mt-2 ml-6">
                              {(() => {
                                const currentEndDate = formData.recurrence_settings.end_date ? new Date(formData.recurrence_settings.end_date) : null;
                                const exceedsLimit = currentEndDate && maxEndDate && currentEndDate > maxEndDate;

                                const formatMaxDate = maxEndDate.toLocaleDateString('pt-BR', {
                                  timeZone: 'America/Sao_Paulo',
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit'
                                });

                                return (
                                  <div className={`text-xs p-2 rounded-lg ${exceedsLimit ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                                    {exceedsLimit ? (
                                      <>
                                        <AlertTriangle className="w-3 h-3 inline mr-1" />
                                        <strong>Data excede o limite!</strong> A data máxima permitida é {formatMaxDate}
                                      </>
                                    ) : (
                                      <>
                                        <Info className="w-3 h-3 inline mr-1" />
                                        Data limite: {formatMaxDate} (máximo 30 envios)
                                      </>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                        <p className="text-sm text-blue-800">
                          <Info className="w-4 h-4 inline mr-1" />
                          <strong>Importante:</strong> Envios recorrentes requerem autorização manual para cada novo ciclo.
                          Apenas o primeiro envio será agendado automaticamente.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 5. Configurações de Envio (Permanece por último) */}
              <Card className="rounded-2xl border-gray-200">
                <CardHeader className="pb-3 sm:pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                    Configurações de Envio
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="sending_speed" className="text-sm font-medium">Velocidade de Envio</Label>
                    <Select
                      value={sendingSpeed}
                      onValueChange={setSendingSpeed}
                    >
                      <SelectTrigger className="mt-1 rounded-xl border-gray-200 w-full">
                        <SelectValue placeholder="Selecione a velocidade" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="aggressive">
                          <div className="flex flex-col">
                            <span className="font-medium">Agressivo (3–8s)</span>
                            <span className="text-xs text-red-600">Alto risco de banimento</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="moderate">
                          <div className="flex flex-col">
                            <span className="font-medium">Moderado (9–20s)</span>
                            <span className="text-xs text-yellow-600">Risco moderado</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="conservative">
                          <div className="flex flex-col">
                            <span className="font-medium">Conservador (20–60s)</span>
                            <span className="text-xs text-green-600">Baixo risco</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="defensive">
                          <div className="flex flex-col">
                            <span className="font-medium">Defensivo (2–5min)</span>
                            <span className="text-xs text-blue-600">Risco mínimo</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="mt-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-amber-800">
                          <p className="font-medium mb-1">⚠️ Importante sobre velocidade de envio:</p>
                          <ul className="list-disc pl-5 space-y-1 text-xs">
                            <li><strong>Agressivo:</strong> Intervalos de 3-8s. Alto risco de detecção como spam pelo WhatsApp</li>
                            <li><strong>Moderado:</strong> Intervalos de 9-20s. Velocidade balanceada com risco moderado</li>
                            <li><strong>Conservador:</strong> Intervalos de 20-60s. Mais lento, mas mais seguro (recomendado)</li>
                            <li><strong>Defensivo:</strong> Intervalos de 2–5min. O mais seguro para grandes volumes</li>
                          </ul>
                          <p className="mt-2 font-medium">Quanto maior a velocidade, maior o risco de banimento do número!</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Expectativa de mensagens - MOVIDO PARA CÁ E CORRIGIDO */}
              {/* Removed message usage expectation section */}
            </div>

          {/* Footer */}
          <div className="flex justify-end items-center gap-3 p-6 bg-gray-50 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onClose();
                resetForm();
              }}
              disabled={isSubmitting}
              className="rounded-xl"
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              onClick={handleSubmit}
              disabled={isSubmitting || !canSubmit}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
            >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    {/* Spinner único simplificado */}
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="animate-pulse">
                      {formData.schedule_type === 'immediate' ? 'Criando...' : 'Agendando...'}
                    </span>
                  </div>
                ) : schedule ? ( // Check if we are editing an existing schedule
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Atualizar Campanha
                  </>
                ) : formData.schedule_type === 'immediate' ? (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Criar e Enviar Agora
                  </>
                ) : (
                  <>
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    Agendar Campanha
                  </>
                )}
              </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Renderiza o modal de template separadamente para garantir que ele apareça na frente */}
      <TemplateFormModal
        template={null}
        categories={[
          { id: "promotional", name: "Promocional" },
          { id: "billing", name: "Cobrança" },
          { id: "birthday", name: "Aniversário" },
          { id: "welcome", name: "Boas-vindas" },
          { id: "follow_up", name: "Follow-up" },
          { id: "reminders", name: "Lembretes" },
          { id: "congratulations", name: "Parabéns" },
          { id: "surveys", name: "Pesquisas" },
          { id: "seasonal", name: "Sazonal" },
          { id: "retention", name: "Retenção" }
        ]}
        types={[
          { id: "whatsapp", name: "WhatsApp" },
          { id: "email", name: "E-mail" },
          { id: "sms", name: "SMS" }
        ]}
        isOpen={showTemplateForm}
        onClose={() => {
          console.log('Fechando modal de template');
          setShowTemplateForm(false);
        }}
        onSubmit={handleTemplateCreate}
      />

      {notification.show && (
        <div className="fixed top-4 right-4 z-[99999]">
          <Alert
            className={`rounded-2xl shadow-lg border-2 ${
              notification.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription className="font-medium">
              {notification.message}
            </AlertDescription>
          </Alert>
        </div>
      )}
    </>
  );
}