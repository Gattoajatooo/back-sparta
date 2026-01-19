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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  Users,
  Mail,
  Phone,
  Building2,
  X,
  Save,
  Plus,
  AlertCircle,
  Calendar,
  DollarSign,
  Tag,
  FileUser,
  MapPin,
  CreditCard,
  User as UserIcon,
  Minus,
  Loader2,
  Globe,
  Check,
  CheckCircle2,
  XCircle,
  Upload,
  Download,
  Camera,
  ChevronDown,
  Snowflake,
  CloudSun,
  Flame
} from "lucide-react";
import { User } from "@/entities/User";
import { Tag as TagEntity } from "@/entities/Tag";
import { Contact } from "@/entities/Contact";
import { Campaign } from "@/entities/Campaign";
import { Session } from "@/entities/Session";
import { lookupAddressByCep } from "@/functions/lookupAddressByCep";
import { getWhatsAppProfilePicture } from "@/functions/getWhatsAppProfilePicture";
import { UploadFile } from "@/integrations/Core";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRef } from "react";

export default function ContactFormModal({ open, onClose, contact, onSubmit, initialData }) {
  const [user, setUser] = useState(null);
  const [availableTagsForSelection, setAvailableTagsForSelection] = useState([]);
  const [availableCampaignsForSelection, setAvailableCampaignsForSelection] = useState([]);
  const [tagNames, setTagNames] = useState({});
  const [campaignNames, setCampaignNames] = useState({});
  const isSubmittingRef = useRef(false);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    nickname: "", // Added nickname field
    document_number: "",
    document_type: "",
    gender: "",
    responsible_name: "",
    emails: [{ email: "", type: "primary" }],
    phones: [{ phone: "", type: "primary" }],
    birth_date: "",
    company_name: "",
    position: "",
    custom_position: "",
    status: "lead",
    source: "",
    tags: [],
    campaign_ids: [],
    notes: [{ note: "", date: new Date().toISOString() }],
    value: null,
    avatar_url: "",
    addresses: [{
      type: "residential",
      cep: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      country: "Brasil"
    }],
    social_profiles: {
      linkedin: "",
      twitter: "",
      facebook: "",
      instagram: "",
      website: ""
    },
    banking_data: {
      bank_name: "",
      bank_code: "",
      agency: "",
      account: "",
      account_digit: "",
      pix_key_type: "",
      pix_key: ""
    }
  });

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isFetchingWhatsAppPhoto, setIsFetchingWhatsAppPhoto] = useState(false);
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);
  const [phoneVerificationResult, setPhoneVerificationResult] = useState(null);
  const [hasVerified, setHasVerified] = useState(false);

  const [currentTagInput, setCurrentTagInput] = useState("");
  const [currentCampaignInput, setCurrentCampaignInput] = useState("");
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitInProgress, setSubmitInProgress] = useState(false);
  const [loadingCep, setLoadingCep] = useState({});
  const [newStatus, setNewStatus] = useState("");
  const [newSource, setNewSource] = useState("");
  const [showNewStatusInput, setShowNewStatusInput] = useState(false);
  const [showNewSourceInput, setShowNewSourceInput] = useState(false);
  const [isVerifyingPhones, setIsVerifyingPhones] = useState(false);
  const [duplicateError, setDuplicateError] = useState(null);
  
  const [expandedCard, setExpandedCard] = useState('basic');

  const [availableStatuses, setAvailableStatuses] = useState([
    "lead", "prospect", "customer", "churned"
  ]);
  const [availableSources, setAvailableSources] = useState([
    "website", "referral", "social_media", "email_campaign", "cold_outreach", "event", "other"
  ]);

  const [availableResponsibles, setAvailableResponsibles] = useState([]);
  const [newResponsible, setNewResponsible] = useState("");
  const [showNewResponsibleInput, setShowNewResponsibleInput] = useState(false);

  // NOVO: Estados para confirmação de cancelamento
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [initialFormData, setInitialFormData] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (open) {
      const loadTagsAndCampaignsData = async () => {
        try {
          const currentUser = await User.me();
          if (currentUser?.company_id) {
            const tagsList = await TagEntity.filter({ company_id: currentUser.company_id });
            const tagsMap = {};
            tagsList.forEach(tag => {
              tagsMap[tag.id] = tag.name;
            });
            setTagNames(tagsMap);
            setAvailableTagsForSelection(tagsList);
            
            const campaignsList = await Campaign.filter({ company_id: currentUser.company_id });
            const campaignsMap = {};
            campaignsList.forEach(campaign => {
              campaignsMap[campaign.id] = campaign.name;
            });
            setCampaignNames(campaignsMap);
            setAvailableCampaignsForSelection(campaignsList);
          }
        } catch (error) {
          console.error("Error loading tags and campaigns data:", error);
        }
      };

      const loadStatusAndSources = async () => {
        try {
          const currentUser = await User.me();
          if (currentUser?.company_id) {
            const contacts = await Contact.filter({ company_id: currentUser.company_id });
            
            const uniqueStatuses = new Set([
              "lead", "prospect", "customer", "churned"
            ]);
            contacts.forEach(contact => {
              if (contact.status) uniqueStatuses.add(contact.status);
            });
            setAvailableStatuses([...uniqueStatuses].sort((a,b) => a.localeCompare(b)));
            
            const uniqueSources = new Set([
              "website", "referral", "social_media", "email_campaign", "cold_outreach", "event", "other"
            ]);
            contacts.forEach(contact => {
              if (contact.source) uniqueSources.add(contact.source);
            });
            setAvailableSources([...uniqueSources].sort((a,b) => a.localeCompare(b)));
          }
        } catch (error) {
          console.error("Error loading status and sources:", error);
        }
      };

      const loadAvailableResponsibles = async () => {
        try {
          const currentUser = await User.me();
          if (currentUser?.company_id) {
            const contacts = await Contact.filter({ company_id: currentUser.company_id });
            const uniqueResponsibles = [...new Set(
              contacts
                .map(c => c.responsible_name)
                .filter(name => name && name.trim())
            )].sort((a, b) => a.localeCompare(b));
            setAvailableResponsibles(uniqueResponsibles);
          }
        } catch (error) {
          console.error("Error loading available responsibles:", error);
        }
      };

      loadTagsAndCampaignsData();
      loadStatusAndSources();
      loadAvailableResponsibles();
    }

    if (open && contact) {
      setFormData({
        first_name: contact.first_name || "",
        last_name: contact.last_name || "",
        nickname: contact.nickname || "", // Set nickname from contact
        document_number: contact.document_number || "",
        document_type: contact.document_type || "",
        gender: contact.gender || "",
        responsible_name: contact.responsible_name || "",
        emails: contact.emails?.length > 0 ? contact.emails : [{ email: contact.email || "", type: "primary" }],
        phones: contact.phones?.length > 0 ? contact.phones : [{ phone: contact.phone || "", type: "primary" }],
        birth_date: contact.birth_date || "",
        company_name: contact.company_name || "",
        position: contact.position || "",
        custom_position: contact.custom_position || "",
        status: contact.status || "",
        temperature: contact.temperature || "fria",
        tags: contact.tags || [],
        campaign_ids: contact.campaign_ids || [],
        notes: Array.isArray(contact.notes) 
          ? contact.notes 
          : (contact.notes ? [{ note: contact.notes, date: new Date().toISOString() }] : [{ note: "", date: new Date().toISOString() }]),
        value: contact.value || null,
        avatar_url: contact.avatar_url || "",
        addresses: contact.addresses?.length > 0 ? contact.addresses : [{
          type: "residential",
          cep: "",
          street: "",
          number: "",
          complement: "",
          neighborhood: "",
          city: "",
          state: "",
          country: "Brasil"
        }],
        social_profiles: {
          linkedin: contact.social_profiles?.linkedin || "",
          twitter: contact.social_profiles?.twitter || "",
          facebook: contact.social_profiles?.facebook || "",
          instagram: contact.social_profiles?.instagram || "",
          website: contact.social_profiles?.website || ""
        },
        banking_data: {
          bank_name: contact.banking_data?.bank_name || "",
          bank_code: contact.banking_data?.bank_code || "",
          agency: contact.banking_data?.agency || "",
          account: contact.banking_data?.account || "",
          account_digit: contact.banking_data?.account_digit || "",
          pix_key_type: contact.banking_data?.pix_key_type || "",
          pix_key: contact.banking_data?.pix_key || ""
        }
      });
      setHasVerified(true);
      // Salvar estado inicial após carregar dados do contato
      setTimeout(() => {
        setInitialFormData(JSON.stringify(formData));
      }, 100);
    } else if (open && !contact && initialData) {
      resetForm();
      if (initialData.phones) {
        setFormData(prev => ({ ...prev, phones: initialData.phones }));
      }
      setHasVerified(false);
      setPhoneVerificationResult(null);
      // Salvar estado inicial após reset
      setTimeout(() => {
        const resetFormData = {
          ...formData,
          phones: initialData.phones
        };
        setInitialFormData(JSON.stringify(resetFormData));
      }, 100);
    } else if (open && !contact) {
      resetForm();
      setHasVerified(false);
      setPhoneVerificationResult(null);
      // Salvar estado inicial após reset para novo contato
      setTimeout(() => {
        setInitialFormData(JSON.stringify(formData));
      }, 100);
    }
  }, [open, contact, initialData]);

  const resetForm = () => {
    setFormData({
      first_name: "",
      last_name: "",
      nickname: "", // Reset nickname field
      document_number: "",
      document_type: "",
      gender: "",
      responsible_name: "",
      emails: [{ email: "", type: "primary" }],
      phones: [{ phone: "", type: "primary" }],
      birth_date: "",
      company_name: "",
      position: "",
      custom_position: "",
      status: "",
      temperature: "fria",
      tags: [],
      campaign_ids: [],
      notes: [{ note: "", date: new Date().toISOString() }],
      value: null,
      avatar_url: "",
      addresses: [{
        type: "residential",
        cep: "",
        street: "",
        number: "",
        complement: "",
        neighborhood: "",
        city: "",
        state: "",
        country: "Brasil"
      }],
      social_profiles: {
        linkedin: "",
        twitter: "",
        facebook: "",
        instagram: "",
        website: ""
      },
      banking_data: {
        bank_name: "",
        bank_code: "",
        agency: "",
        account: "",
        account_digit: "",
        pix_key_type: "",
        pix_key: ""
      }
    });
    setCurrentTagInput("");
    setCurrentCampaignInput("");
    setErrors({});
    setNewStatus("");
    setNewSource("");
    setShowNewStatusInput(false);
    setShowNewSourceInput(false);
    setNewResponsible("");
    setShowNewResponsibleInput(false);
    setIsVerifyingPhones(false);
    setDuplicateError(null);
    setHasVerified(false);
    setPhoneVerificationResult(null);
    setSubmitInProgress(false);
    isSubmittingRef.current = false;
  };

  const loadUser = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  const handleAddNewResponsible = () => {
    if (newResponsible.trim()) {
      const responsibleName = newResponsible.trim();
      setFormData(prev => ({ ...prev, responsible_name: responsibleName }));
      setAvailableResponsibles(prev => [...new Set([...prev, responsibleName])].sort((a, b) => a.localeCompare(b)));
      setNewResponsible("");
      setShowNewResponsibleInput(false);
    }
  };

  const validateCPFCNPJ = (value) => {
    if (!value) return "";
    
    const cleanValue = value.replace(/\D/g, '');
    
    if (cleanValue.length === 11) {
      return "cpf";
    } else if (cleanValue.length === 14) {
      return "cnpj";
    }
    return "";
  };

  const formatCPFCNPJ = (value) => {
    if (!value) return "";
    
    const cleanValue = value.replace(/\D/g, '');
    
    if (cleanValue.length <= 11) {
      return cleanValue
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
      return cleanValue
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
    }
  };

  const handleDocumentChange = (value) => {
    const formattedValue = formatCPFCNPJ(value);
    const documentType = validateCPFCNPJ(value);
    
    setFormData(prev => ({
      ...prev,
      document_number: formattedValue,
      document_type: documentType
    }));
  };

  const getDocumentTypeLabel = () => {
    if (formData.document_type === "cpf") return "Pessoa Física";
    if (formData.document_type === "cnpj") return "Pessoa Jurídica";
    return "Não identificado";
  };

  const handleCepLookup = async (addressIndex, cep) => {
    if (cep.length === 9) {
      setLoadingCep({ ...loadingCep, [addressIndex]: true });
      try {
        const { data } = await lookupAddressByCep({ cep: cep.replace(/\D/g, '') });
        if (data.success) {
          const addressData = data.data;
          setFormData(prev => ({
            ...prev,
            addresses: prev.addresses.map((addr, idx) => 
              idx === addressIndex ? {
                ...addr,
                street: addressData.logradouro || "",
                neighborhood: addressData.bairro || "",
                city: addressData.localidade || "",
                state: addressData.uf || ""
              } : addr
            )
          }));
        }
      } catch (error) {
        console.error("Error looking up CEP:", error);
      } finally {
        setLoadingCep({ ...loadingCep, [addressIndex]: false });
      }
    }
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length >= 10;
  };

  const checkDuplicateEmail = (email, currentIndex) => {
    const cleanEmail = email.toLowerCase().trim();
    return formData.emails.some((item, index) => 
      index !== currentIndex && item.email.toLowerCase().trim() === cleanEmail && cleanEmail !== ""
    );
  };

  const checkDuplicatePhone = (phone, currentIndex) => {
    const cleanPhone = phone.replace(/\D/g, '');
    return formData.phones.some((item, index) => 
      index !== currentIndex && item.phone.replace(/\D/g, '') === cleanPhone && cleanPhone !== ""
    );
  };

  const handleEmailChange = (index, field, value) => {
    const newEmails = [...formData.emails];
    
    if (field === 'email') {
      const emailValue = value.trim();
      if (emailValue && !validateEmail(emailValue)) {
        setErrors(prev => ({
          ...prev,
          [`email_${index}`]: 'Formato de e-mail inválido'
        }));
      } else if (emailValue && checkDuplicateEmail(emailValue, index)) {
        setErrors(prev => ({
          ...prev,
          [`email_${index}`]: 'Este e-mail já foi adicionado'
        }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[`email_${index}`];
          return newErrors;
        });
      }
    }
    
    newEmails[index] = { ...newEmails[index], [field]: value };
    setFormData(prev => ({ ...prev, emails: newEmails }));
  };

  const formatPhone = (value) => {
    const cleanPhone = value.replace(/\D/g, '');
    
    if (!cleanPhone) return '';
    
    if (cleanPhone.length <= 2) {
      return `(${cleanPhone}`;
    } else if (cleanPhone.length <= 4) {
      return `(${cleanPhone.substring(0, 2)}) ${cleanPhone.substring(2)}`;
    } else if (cleanPhone.length <= 6) {
      return `(${cleanPhone.substring(0, 2)}) ${cleanPhone.substring(2)}`;
    } else if (cleanPhone.length === 10) {
      return `(${cleanPhone.substring(0, 2)}) ${cleanPhone.substring(2, 6)}-${cleanPhone.substring(6)}`;
    } else if (cleanPhone.length === 11) {
      return `(${cleanPhone.substring(0, 2)}) ${cleanPhone.substring(2, 7)}-${cleanPhone.substring(7)}`;
    } else if (cleanPhone.length === 12 && cleanPhone.startsWith('55')) {
      const ddd = cleanPhone.substring(2, 4);
      const numero = cleanPhone.substring(4);
      return `+55 (${ddd}) ${numero.substring(0, 4)}-${numero.substring(4)}`;
    } else if (cleanPhone.length === 13 && cleanPhone.startsWith('55')) {
      const ddd = cleanPhone.substring(2, 4);
      const numero = cleanPhone.substring(4);
      return `+55 (${ddd}) ${numero.substring(0, 5)}-${numero.substring(5)}`;
    } else if (cleanPhone.length >= 12) {
      if (cleanPhone.startsWith('55')) {
        const ddd = cleanPhone.substring(2, 4);
        const numero = cleanPhone.substring(4);
        if (numero.length >= 9) {
          return `+55 (${ddd}) ${numero.substring(0, 5)}-${numero.substring(5)}`;
        } else {
          return `+55 (${ddd}) ${numero.substring(0, 4)}-${numero.substring(4)}`;
        }
      } else {
        let formatted = `+${cleanPhone}`;
        if (cleanPhone.length > 2) {
            formatted = `+${cleanPhone.substring(0,2)} ${cleanPhone.substring(2)}`;
        }
        if (cleanPhone.length > 6) {
            formatted = `${formatted.substring(0, formatted.length - 4)}-${formatted.substring(formatted.length - 4)}`;
        }
        return formatted;
      }
    } else {
      if (cleanPhone.length > 2) {
        return `(${cleanPhone.substring(0, 2)}) ${cleanPhone.substring(2)}`;
      }
    }
    
    return cleanPhone;
  };

  const handlePhoneChange = (index, field, value) => {
    const newPhones = [...formData.phones];
    
    if (field === 'phone') {
      const formattedPhone = formatPhone(value);
      
      if (value.trim() && !validatePhone(value)) {
        setErrors(prev => ({
          ...prev,
          [`phone_${index}`]: 'Número de telefone inválido'
        }));
      } else if (value.trim() && checkDuplicatePhone(value, index)) {
        setErrors(prev => ({
          ...prev,
          [`phone_${index}`]: 'Este telefone já foi adicionado'
        }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[`phone_${index}`];
          return newErrors;
        });
      }
      
      newPhones[index] = { ...newPhones[index], [field]: formattedPhone };
      setFormData(prev => ({ ...prev, phones: newPhones }));

    } else {
      newPhones[index] = { ...newPhones[index], [field]: value };
      setFormData(prev => ({ ...prev, phones: newPhones }));
    }
  };


  const addEmail = () => {
    if (formData.emails.length < 4) {
      setFormData(prev => ({
        ...prev,
        emails: [...prev.emails, { email: "", type: "secondary" }]
      }));
    }
  };

  const removeEmail = (index) => {
    if (formData.emails.length > 1) {
      setFormData(prev => {
        const updatedEmails = prev.emails.filter((_, idx) => idx !== index);
        setErrors(currentErrors => {
          const newErrors = { ...currentErrors };
          delete newErrors[`email_${index}`];
          return newErrors;
        });
        return { ...prev, emails: updatedEmails };
      });
    }
  };

  const addPhone = () => {
    if (formData.phones.length < 4) {
      setFormData(prev => ({
        ...prev,
        phones: [...prev.phones, { phone: "", type: "mobile" }]
      }));
    }
  };

  const removePhone = (index) => {
    if (formData.phones.length > 1) {
      setFormData(prev => {
        const updatedPhones = prev.phones.filter((_, idx) => idx !== index);
        setErrors(currentErrors => {
          const newErrors = { ...currentErrors };
          delete newErrors[`phone_${index}`];
          return newErrors;
        });
        return { ...prev, phones: updatedPhones };
      });
    }
  };

  const addNote = () => {
    if (formData.notes.length < 10) {
      setFormData(prev => ({
        ...prev,
        notes: [...prev.notes, { note: "", date: new Date().toISOString() }]
      }));
    }
  };

  const removeNote = (index) => {
    if (formData.notes.length > 1) {
      setFormData(prev => ({
        ...prev,
        notes: prev.notes.filter((_, idx) => idx !== index)
      }));
    }
  };

  const handleNoteChange = (index, value) => {
    setFormData(prev => ({
      ...prev,
      notes: prev.notes.map((note, idx) => 
        idx === index ? { ...note, note: value, date: new Date().toISOString() } : note
      )
    }));
  };

  const addAddress = () => {
    setFormData(prev => ({
      ...prev,
      addresses: [...prev.addresses, {
        type: "residential",
        cep: "",
        street: "",
        number: "",
        complement: "",
        neighborhood: "",
        city: "",
        state: "",
        country: "Brasil"
      }]
    }));
  };

  const removeAddress = (index) => {
    if (formData.addresses.length > 1) {
      setFormData(prev => ({
        ...prev,
        addresses: prev.addresses.filter((_, idx) => idx !== index)
      }));
    }
  };

  const handleAddTag = async () => {
    const tagName = currentTagInput.trim();
    if (!tagName) return;
  
    const existingTagId = availableTagsForSelection.find(t => t.name.toLowerCase() === tagName.toLowerCase())?.id;
    if (existingTagId && formData.tags.includes(existingTagId)) {
        toast.info(`O marcador "${tagName}" já foi adicionado.`);
        setCurrentTagInput("");
        return;
    }

    setIsSubmitting(true);
    try {
        let tagToApply = availableTagsForSelection.find(t => t.name.toLowerCase() === tagName.toLowerCase());
        
        if (!tagToApply) {
            await toast.promise(
                (async () => {
                    const currentUser = await User.me();
                    if (!currentUser.company_id) throw new Error("ID da empresa não encontrado.");
                    
                    const newTag = await TagEntity.create({
                        name: tagName,
                        company_id: currentUser.company_id
                    });

                    setAvailableTagsForSelection(prev => [...prev, newTag].sort((a, b) => a.name.localeCompare(b.name)));
                    setTagNames(prev => ({...prev, [newTag.id]: newTag.name}));

                    return newTag;
                })(),
                {
                    loading: `Criando novo marcador "${tagName}"...`,
                    success: (newTag) => {
                        setFormData(prev => ({ ...prev, tags: [...prev.tags, newTag.id] }));
                        setCurrentTagInput("");
                        return `Marcador "${tagName}" criado e adicionado!`;
                    },
                    error: (err) => {
                        console.error("Erro ao criar marcador:", err);
                        return "Falha ao criar o marcador.";
                    }
                }
            );
        } else {
            setFormData(prev => ({ ...prev, tags: [...prev.tags, tagToApply.id] }));
            setCurrentTagInput("");
            toast.success(`Marcador "${tagToApply.name}" adicionado.`);
        }
    } catch (error) {
        console.error("Erro ao adicionar marcador:", error);
        toast.error("Ocorreu um erro ao adicionar o marcador.");
    } finally {
        setIsSubmitting(false);
    }
  };

  const removeTag = (tagIdToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tagId => tagId !== tagIdToRemove)
    }));
  };

  const handleAddCampaign = () => {
    const campaignName = currentCampaignInput.trim();
    if (campaignName) {
      const campaign = availableCampaignsForSelection.find(c => c.name.toLowerCase() === campaignName.toLowerCase());
      if (campaign && !formData.campaign_ids.includes(campaign.id)) {
        setFormData(prev => ({
          ...prev,
          campaign_ids: [...prev.campaign_ids, campaign.id]
        }));
        setCurrentCampaignInput("");
      } else if (!campaign) {
        alert("Campanha não encontrada. Selecione uma campanha existente ou crie-a antes.");
      }
    }
  };

  const removeCampaign = (campaignIdToRemove) => {
    setFormData(prev => ({
      ...prev,
      campaign_ids: prev.campaign_ids.filter(campaignId => campaignId !== campaignIdToRemove)
    }));
  };

  const handleAddNewStatus = () => {
    if (newStatus.trim()) {
      const trimmedStatus = newStatus.trim();
      setFormData(prev => ({ ...prev, status: trimmedStatus }));
      
      if (!availableStatuses.includes(trimmedStatus)) {
        setAvailableStatuses(prev => [...prev, trimmedStatus].sort((a,b) => a.localeCompare(b)));
      }
      
      setNewStatus("");
      setShowNewStatusInput(false);
    }
  };

  const handleAddNewSource = () => {
    if (newSource.trim()) {
      const trimmedSource = newSource.trim();
      setFormData(prev => ({ ...prev, source: trimmedSource }));
      
      if (!availableSources.includes(trimmedSource)) {
        setAvailableSources(prev => [...prev, trimmedSource].sort((a,b) => a.localeCompare(b)));
      }
      
      setNewSource("");
      setShowNewSourceInput(false);
    }
  };

  const handleUploadPhoto = async (file) => {
    if (!file) return;

    setIsUploadingPhoto(true);
    try {
      const response = await UploadFile({ file });
      const photoUrl = response.file_url || response.data?.file_url;
      
      if (photoUrl) {
        setFormData(prev => ({ ...prev, avatar_url: photoUrl }));
        toast.success('Foto enviada com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao fazer upload da foto:', error);
      toast.error('Erro ao fazer upload da foto');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // ✅ FLUXO COMPLETO: Detectar LID, resolver e adicionar automaticamente
  const handleVerifyAndFetchPhone = async () => {
    const primaryPhone = formData.phones[0]?.phone;
    if (!primaryPhone || !primaryPhone.trim()) {
      toast.error('Digite um número de telefone primeiro');
      return;
    }

    setIsVerifyingPhone(true);
    setPhoneVerificationResult(null);

    try {
      const sessions = await Session.filter({
        company_id: user.company_id,
        is_deleted: { '$ne': true },
        status: 'WORKING'
      });

      const defaultSession = sessions.find(s => s.is_default) || sessions[0];
      
      if (!defaultSession) {
        toast.error('Nenhuma sessão ativa encontrada');
        setIsVerifyingPhone(false);
        return;
      }

      const cleanPhone = primaryPhone.replace(/\D/g, '');
      console.log('[ContactFormModal] 🔍 Verificando número:', cleanPhone);

      // Detectar se é LID
      const isLid = cleanPhone.length > 15 || (cleanPhone.length > 0 && !/^55/.test(cleanPhone) && cleanPhone.length > 13);
      
      let phoneToVerify = cleanPhone;
      let lidOriginal = null;
      
      // Se for LID, resolver primeiro
      if (isLid) {
        console.log('[ContactFormModal] 🏢 Detectado LID, resolvendo:', cleanPhone);
        const lidToResolve = cleanPhone.includes('@') ? cleanPhone : `${cleanPhone}@lid`;
        
        try {
          const resolveResponse = await base44.functions.invoke('resolveLid', {
            lid: lidToResolve,
            sessionName: defaultSession.session_name
          });

          console.log('[ContactFormModal] 📡 Resposta resolveLid:', resolveResponse.data);

          if (resolveResponse.data?.success && resolveResponse.data?.phone) {
            phoneToVerify = resolveResponse.data.phone;
            lidOriginal = resolveResponse.data.lid || lidToResolve;
            
            console.log('[ContactFormModal] ✅ LID resolvido:', {
              lid: lidOriginal,
              pn: phoneToVerify
            });
            
          } else {
            toast.error('Não foi possível resolver o LID');
            setIsVerifyingPhone(false);
            return;
          }
        } catch (lidError) {
          console.error('[ContactFormModal] ❌ Erro ao resolver LID:', lidError);
          toast.error('Erro ao resolver LID');
          setIsVerifyingPhone(false);
          return;
        }
      }

      // Verificar número no WhatsApp
      console.log('[ContactFormModal] 📞 Verificando número:', phoneToVerify);
      
      const checkResponse = await base44.functions.invoke('checkExistsContact', {
        phones: [phoneToVerify]
      });

      if (!checkResponse.data?.success || !checkResponse.data.results || checkResponse.data.results.length === 0) {
        toast.error('Erro ao verificar número');
        setIsVerifyingPhone(false);
        return;
      }

      const result = checkResponse.data.results[0];
      setPhoneVerificationResult(result);

      console.log('[ContactFormModal] 📞 Resultado:', result);

      if (!result.exists) {
        toast.warning('Número não existe no WhatsApp');
        setHasVerified(true);
        setIsVerifyingPhone(false);
        return;
      }

      const verifiedPhone = result.verified_phone || phoneToVerify;
      
      // ✅ BUSCAR LID PARA CONTAS COMERCIAIS (USANDO NOVA FUNÇÃO getLidFromPhone)
      let resolvedLid = null;
      if (!lidOriginal) {
        try {
          const sessions = await Session.filter({
            company_id: user.company_id,
            is_deleted: { '$ne': true },
            status: 'WORKING'
          });
          const defaultSession = sessions.find(s => s.is_default) || sessions[0];
          
          if (defaultSession) {
            const lidResponse = await base44.functions.invoke('getLidFromPhone', {
              phone: verifiedPhone,
              sessionName: defaultSession.session_name
            });
            
            if (lidResponse.data?.success && lidResponse.data?.hasLid && lidResponse.data?.lid) {
              resolvedLid = lidResponse.data.lid;
              console.log('[ContactFormModal] 🏢 LID detectado automaticamente:', resolvedLid);
            } else {
              console.log('[ContactFormModal] ℹ️ Número não possui LID (não é conta comercial)');
            }
          }
        } catch (error) {
          console.log('[ContactFormModal] ℹ️ Erro ao buscar LID:', error.message);
        }
      }
      
      const finalLid = lidOriginal || resolvedLid;
      
      // ✅ ADICIONAR AUTOMATICAMENTE: primary + LID se for conta comercial
      if (finalLid) {
        console.log('[ContactFormModal] ✅ Adicionando automaticamente LID:', finalLid);
        
        setFormData(prev => ({
          ...prev,
          phones: [
            {
              phone: formatPhone(verifiedPhone),
              type: 'primary',
              verified: true,
              exists: true
            },
            {
              phone: finalLid,
              type: 'lid',
              verified: false,
              exists: false
            }
          ]
        }));
        
        toast.success(`✅ LID detectado!\n\n📞 Principal: ${formatPhone(verifiedPhone)}\n🔗 LID: ${finalLid}`, { duration: 5000 });
      } else {
        // Número normal
        setFormData(prev => ({
          ...prev,
          phones: [
            {
              phone: formatPhone(verifiedPhone),
              type: 'primary',
              verified: true,
              exists: true
            }
          ]
        }));
      }

      // Buscar perfil do WhatsApp
      const chatId = verifiedPhone.includes('@') ? verifiedPhone : `${verifiedPhone}@c.us`;
      
      const profileResponse = await base44.functions.invoke('getContactInfo', {
        contactId: chatId,
        sessionName: defaultSession.session_name
      });

      if (profileResponse.data?.success) {
        const contactInfo = profileResponse.data.contact;
        
        if (contactInfo.pushname) {
          const nameParts = contactInfo.pushname.trim().split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          
          setFormData(prev => ({
            ...prev,
            first_name: prev.first_name || firstName,
            last_name: prev.last_name || lastName
          }));
        }

        // Set nickname if available
        if (contactInfo.name) {
          setFormData(prev => ({
            ...prev,
            nickname: prev.nickname || contactInfo.name // Use contactInfo.name as nickname
          }));
        }

        const photoResponse = await base44.functions.invoke('getWhatsAppProfilePicture', {
          contactId: chatId,
          sessionName: defaultSession.session_name,
          refresh: false
        });

        if (photoResponse.data?.success && photoResponse.data?.profilePictureUrl) {
          setFormData(prev => ({ ...prev, avatar_url: photoResponse.data.profilePictureUrl }));
        }

        if (!lidOriginal) {
          toast.success('Dados do WhatsApp carregados com sucesso!');
        }
      }

      setHasVerified(true);

    } catch (error) {
      console.error('Erro ao verificar telefone:', error);
      toast.error('Erro ao verificar telefone');
    } finally {
      setIsVerifyingPhone(false);
    }
  };

  const handleFetchWhatsAppPhoto = async () => {
    if (!contact?.numberExists || !contact?.phone) {
      toast.error('Número do WhatsApp não verificado');
      return;
    }

    setIsFetchingWhatsAppPhoto(true);
    try {
      const sessions = await Session.filter({
        company_id: user.company_id,
        is_deleted: { '$ne': true },
        status: 'WORKING'
      });

      const defaultSession = sessions.find(s => s.is_default) || sessions[0];
      
      if (!defaultSession) {
        toast.error('Nenhuma sessão ativa encontrada');
        return;
      }

      const response = await base44.functions.invoke('getWhatsAppProfilePicture', {
        contactId: contact.phone,
        sessionName: defaultSession.session_name,
        refresh: false
      });

      if (response.data?.success && response.data?.profilePictureUrl) {
        setFormData(prev => ({ ...prev, avatar_url: response.data.profilePictureUrl }));
        toast.success('Foto do WhatsApp carregada!');
      } else {
        toast.error('Foto não encontrada no WhatsApp');
      }
    } catch (error) {
      console.error('Erro ao buscar foto do WhatsApp:', error);
      toast.error('Erro ao buscar foto do WhatsApp');
    } finally {
      setIsFetchingWhatsAppPhoto(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Proteção dupla contra submits múltiplos
    if (isSubmittingRef.current || submitInProgress || isSubmitting) {
      console.log('[ContactFormModal] ⚠️ Submit já em andamento, ignorando...');
      return;
    }
    
    if (!contact && !hasVerified) {
      toast.error('Clique em "Verificar" antes de criar o contato');
      return;
    }
    
    let hasErrors = false;
    const newErrors = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = "Nome é obrigatório";
      hasErrors = true;
    }

    formData.emails.forEach((email, index) => {
      const emailValue = email.email.trim();
      if (emailValue && !validateEmail(emailValue)) {
        newErrors[`email_${index}`] = 'Formato de e-mail inválido';
        hasErrors = true;
      }
      if (emailValue && checkDuplicateEmail(emailValue, index)) {
        newErrors[`email_${index}`] = 'Este e-mail já foi adicionado';
        hasErrors = true;
      }
    });
    
    formData.phones.forEach((phone, index) => {
      const phoneValue = phone.phone.trim();
      if (phoneValue && !validatePhone(phoneValue)) {
        newErrors[`phone_${index}`] = 'Número de telefone inválido';
        hasErrors = true;
      }
      if (phoneValue && checkDuplicatePhone(phoneValue, index)) {
        newErrors[`phone_${index}`] = 'Este telefone já foi adicionado';
        hasErrors = true;
      }
    });

    const hasValidPhone = formData.phones.some(phone => phone.phone.trim() && validatePhone(phone.phone.trim()));
    if (!hasValidPhone && formData.phones.filter(p => p.phone.trim()).length === 0) {
      newErrors.phones = "Pelo menos um telefone é obrigatório";
      hasErrors = true;
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setSubmitInProgress(true);
    setDuplicateError(null);
    
    try {
      const phonesData = formData.phones
        .filter(phone => phone.phone.trim())
        .map(phone => ({
          phone: phone.phone.replace(/\D/g, ''),
          type: phone.type,
          verified: phone.verified || false,
          exists: phone.exists || null
        }));

      const primaryPhone = phonesData[0];

      const dataToSubmit = {
        ...formData,
        value: formData.value || null,
        emails: formData.emails.filter(email => email.email.trim()),
        phones: phonesData,
        phone: primaryPhone?.phone || '',
        checked: primaryPhone?.verified || false,
        numberExists: primaryPhone?.exists || false,
        addresses: formData.addresses.filter(addr => addr.cep || addr.street || addr.city),
        social_profiles: Object.fromEntries(
          Object.entries(formData.social_profiles).filter(([, value]) => value && value.trim())
        ),
        banking_data: Object.fromEntries(
          Object.entries(formData.banking_data).filter(([, value]) => value && value.trim())
        ),
        notes: formData.notes.filter(note => note.note.trim()),
        tags: formData.tags,
        campaign_ids: formData.campaign_ids
      };

      if (dataToSubmit.emails.length > 0) {
        dataToSubmit.email = dataToSubmit.emails[0].email;
      } else {
        dataToSubmit.email = "";
      }

      console.log('[ContactFormModal] 💾 Salvando contato:', {
        isNew: !contact,
        phone: dataToSubmit.phone,
        phones: dataToSubmit.phones,
        nickname: dataToSubmit.nickname, // Include nickname in log
        checked: dataToSubmit.checked,
        numberExists: dataToSubmit.numberExists
      });

      if (contact?.id) {
        const response = await base44.functions.invoke('saveContact', {
          contactData: dataToSubmit,
          editingContactId: contact.id,
          company_id: user.company_id
        });

        if (response.data?.success) {
          toast.success('Contato atualizado com sucesso!');
          await onSubmit(response.data.contact);
          handleClose();
        } else {
          throw new Error(response.data?.error || 'Erro ao atualizar contato');
        }
      } else {
        const response = await base44.functions.invoke('createSingleContact', {
          contactData: dataToSubmit
        });

        if (response.data?.success) {
          toast.success('Contato criado com sucesso!');
          await onSubmit(response.data.data);
          handleClose();
        } else if (response.data?.error === 'duplicate') {
          setDuplicateError({
            contact: response.data.duplicate,
            message: response.data.message
          });
        } else {
          throw new Error(response.data?.error || 'Erro ao criar contato');
        }
      }
    } catch (error) {
      console.error("Error submitting contact:", error);
      toast.error(error.message || 'Erro ao salvar contato');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      setSubmitInProgress(false);
    }
  };

  const handleClose = () => {
    // Verificar se há alterações não salvas
    const currentFormDataString = JSON.stringify(formData);
    const hasChanges = initialFormData && currentFormDataString !== initialFormData;

    console.log('[ContactFormModal] Verificando mudanças:', {
      hasInitialData: !!initialFormData,
      hasChanges,
      isSubmitting
    });

    if (hasChanges && !isSubmitting && !submitInProgress) {
      setShowCancelDialog(true);
    } else {
      resetForm();
      setInitialFormData(null);
      onClose();
    }
  };

  const confirmClose = () => {
    setShowCancelDialog(false);
    resetForm();
    setInitialFormData(null);
    onClose();
  };

  if (!open) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent 
          className="max-w-4xl w-[95vw] sm:w-[90vw] md:w-[85vw] lg:w-[80vw] xl:max-w-4xl h-[95vh] p-0 overflow-hidden flex flex-col rounded-[2.5rem] [&>button]:hidden"
          onInteractOutside={(e) => {
            if (isSubmitting || submitInProgress) {
              e.preventDefault();
            } else {
              handleClose();
            }
          }}
        >
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
        <div className="p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center">
                <FileUser className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {contact ? 'Editar Contato' : 'Novo Contato'}
                </h2>
                <p className="text-sm text-gray-600">
                  {contact ? 'Atualize as informações do contato' : 'Preencha os dados do novo contato'}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              disabled={isSubmitting}
              className="h-8 w-8 rounded-lg"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div 
          className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6 sm:space-y-8 flex-shrink"
        >
          {duplicateError && (
            <Alert className="rounded-2xl border-red-200 bg-red-50">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div className="ml-2">
                <p className="font-semibold text-red-800">Contato já cadastrado!</p>
                <AlertDescription className="text-red-700">
                  Este número já está cadastrado para <strong>{duplicateError.contact.first_name} {duplicateError.contact.last_name || ''}</strong>
                  {duplicateError.contact.phone && (
                    <span className="block text-sm mt-1">Telefone: {duplicateError.contact.phone}</span>
                  )}
                </AlertDescription>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDuplicateError(null)}
                  className="mt-2 rounded-xl border-red-300 text-red-700 hover:bg-red-100"
                >
                  <X className="w-3 h-3 mr-1" />
                  Fechar
                </Button>
              </div>
            </Alert>
          )}

          <Card className="rounded-2xl border-blue-200 border-2 shadow-lg overflow-hidden">
            <CardHeader className="pb-3 sm:pb-4 bg-gradient-to-br from-blue-50 to-white">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                Telefones *
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              {formData.phones.map((phone, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-start">
                    <div className="flex-1 w-full">
                      <Input
                        type="tel"
                        value={phone.phone}
                        onChange={(e) => handlePhoneChange(index, 'phone', e.target.value)}
                        placeholder="+55 (11) 99999-9999 ou LID"
                        className="rounded-xl border-gray-200 text-sm"
                        disabled={phone.type === 'lid'}
                      />
                      {errors[`phone_${index}`] && (
                        <p className="text-xs text-red-600 mt-1">{errors[`phone_${index}`]}</p>
                      )}
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      {index === 0 && (
                        <Button
                          type="button"
                          onClick={handleVerifyAndFetchPhone}
                          disabled={isVerifyingPhone || !phone.phone.trim()}
                          className="rounded-xl bg-green-600 hover:bg-green-700 h-9 sm:h-10 px-4"
                        >
                          {isVerifyingPhone ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Verificando...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Verificar
                            </>
                          )}
                        </Button>
                      )}
                      <Select 
                        value={phone.type} 
                        onValueChange={(value) => handlePhoneChange(index, 'type', value)}
                      >
                        <SelectTrigger className="w-full sm:w-32 rounded-xl border-gray-200 h-9 sm:h-10 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="primary">Principal</SelectItem>
                          <SelectItem value="mobile">Celular</SelectItem>
                          <SelectItem value="work">Trabalho</SelectItem>
                          <SelectItem value="home">Residencial</SelectItem>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          <SelectItem value="lid">LID (Conta Comercial)</SelectItem>
                          <SelectItem value="secondary">Secundário</SelectItem>
                        </SelectContent>
                      </Select>
                      {formData.phones.length > 1 && phone.type !== 'lid' && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removePhone(index)}
                          className="rounded-xl h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 border-red-200 text-red-600 hover:bg-red-50"
                        >
                          <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {phoneVerificationResult && index === 0 && (
                    <div className="ml-1">
                      {phoneVerificationResult.exists ? (
                        <Badge className="bg-green-100 text-green-700 text-xs border-green-200">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          ✓ Número verificado no WhatsApp
                        </Badge>
                      ) : phoneVerificationResult.verified ? (
                        <Badge className="bg-red-100 text-red-700 text-xs border-red-200">
                          <XCircle className="w-3 h-3 mr-1" />
                          Número não existe no WhatsApp
                        </Badge>
                      ) : null}
                    </div>
                  )}
                </div>
              ))}
              
              {errors.phones && (
                <p className="text-xs text-red-600">{errors.phones}</p>
              )}
              
              {formData.phones.length < 4 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={addPhone}
                  className="rounded-xl w-full border-green-200 text-green-600 hover:bg-green-50 text-sm h-9 sm:h-10"
                >
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                  Adicionar Telefone
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Informações Básicas */}
          <Collapsible open={expandedCard === 'basic'} onOpenChange={() => setExpandedCard(expandedCard === 'basic' ? null : 'basic')}>
            <Card className="rounded-2xl border-gray-200 overflow-hidden">
              <CollapsibleTrigger asChild>
                <CardHeader className="pb-3 sm:pb-4 cursor-pointer hover:bg-gray-50 transition-colors overflow-hidden">
                  <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                    <div className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                      Informações Básicas
                    </div>
                    <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform ${expandedCard === 'basic' ? 'rotate-180' : ''}`} />
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-3 sm:space-y-4">
                  <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
                    <Avatar className="w-20 h-20">
                      <AvatarImage src={formData.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-500 text-white text-xl">
                        {formData.first_name?.[0]}{formData.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                      <Label className="text-sm font-medium">Foto do Contato</Label>
                      <div className="flex gap-2">
                        <label className="flex-1">
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full rounded-xl h-9 text-sm"
                            disabled={isUploadingPhoto}
                            asChild
                          >
                            <span className="flex items-center justify-center gap-2 cursor-pointer">
                              {isUploadingPhoto ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Upload className="w-4 h-4" />
                              )}
                              Upload
                            </span>
                          </Button>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => e.target.files[0] && handleUploadPhoto(e.target.files[0])}
                            className="hidden"
                            disabled={isUploadingPhoto}
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label htmlFor="first_name" className="text-sm">Nome *</Label>
                      <Input
                        id="first_name"
                        value={formData.first_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                        placeholder="Digite o primeiro nome"
                        className="rounded-xl border-gray-200 text-sm"
                      />
                      {errors.first_name && (
                        <p className="text-xs text-red-600 mt-1">{errors.first_name}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="last_name" className="text-sm">Sobrenome</Label>
                      <Input
                        id="last_name"
                        value={formData.last_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                        placeholder="Digite o sobrenome"
                        className="rounded-xl border-gray-200 text-sm"
                      />
                    </div>
                  </div>

                  {/* Nickname field added here */}
                  <div>
                    <Label htmlFor="nickname" className="text-sm">Apelido</Label>
                    <Input
                      id="nickname"
                      value={formData.nickname}
                      onChange={(e) => setFormData(prev => ({ ...prev, nickname: e.target.value }))}
                      placeholder="Como é conhecido no WhatsApp"
                      className="rounded-xl border-gray-200 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label htmlFor="document_number" className="text-sm">CPF/CNPJ</Label>
                      <Input
                        id="document_number"
                        value={formData.document_number}
                        onChange={(e) => handleDocumentChange(e.target.value)}
                        placeholder="000.000.000-00 ou 00.000.000/0000-00"
                        className="rounded-xl border-gray-200 text-sm"
                      />
                    </div>

                    <div>
                      <Label className="text-sm">Tipo</Label>
                      <div className="h-9 sm:h-10 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl flex items-center text-xs sm:text-sm text-gray-700">
                        {getDocumentTypeLabel()}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    <div>
                      <Label htmlFor="gender" className="text-sm">Gênero</Label>
                      <Select value={formData.gender} onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}>
                        <SelectTrigger className="rounded-xl border-gray-200 h-9 sm:h-10 text-sm">
                          <SelectValue placeholder="Selecione o gênero" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="male">Masculino</SelectItem>
                          <SelectItem value="female">Feminino</SelectItem>
                          <SelectItem value="other">Outro</SelectItem>
                          <SelectItem value="not_informed">Não informado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="birth_date" className="text-sm">Data de Nascimento</Label>
                      <Input
                        id="birth_date"
                        type="date"
                        value={formData.birth_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, birth_date: e.target.value }))}
                        className="rounded-xl border-gray-200 h-9 sm:h-10 text-sm"
                      />
                    </div>

                    <div>
                      <Label htmlFor="value" className="text-sm">Valor Estimado</Label>
                      <Input
                        id="value"
                        type="number"
                        step="0.01"
                        value={formData.value || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, value: parseFloat(e.target.value) || null }))}
                        placeholder="0,00"
                        className="rounded-xl border-gray-200 h-9 sm:h-10 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="responsible_name" className="text-sm">Responsável</Label>
                    {!showNewResponsibleInput ? (
                      <Select 
                        value={formData.responsible_name} 
                        onValueChange={(value) => {
                          if (value === "__add_new__") {
                            setShowNewResponsibleInput(true);
                          } else {
                            setFormData(prev => ({ ...prev, responsible_name: value }));
                          }
                        }}
                      >
                        <SelectTrigger className="rounded-xl border-gray-200 h-9 sm:h-10 text-sm">
                          <SelectValue placeholder="Selecione um responsável" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl max-h-[200px]">
                          {availableResponsibles.map((responsible) => (
                            <SelectItem key={responsible} value={responsible}>
                              {responsible}
                            </SelectItem>
                          ))}
                          <SelectItem value="__add_new__" className="text-blue-600 font-medium">
                            <div className="flex items-center gap-2">
                              <Plus className="w-3 h-3" />
                              Adicionar novo responsável
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          value={newResponsible}
                          onChange={(e) => setNewResponsible(e.target.value)}
                          placeholder="Digite o nome do responsável"
                          className="rounded-xl border-gray-200 h-9 sm:h-10 text-sm"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddNewResponsible();
                            }
                          }}
                        />
                        <Button
                          type="button"
                          onClick={handleAddNewResponsible}
                          className="h-9 sm:h-10 px-3 bg-green-600 hover:bg-green-700 rounded-xl"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowNewResponsibleInput(false);
                            setNewResponsible("");
                          }}
                          className="h-9 sm:h-10 px-3 rounded-xl"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* E-mails */}
          <Collapsible open={expandedCard === 'emails'} onOpenChange={() => setExpandedCard(expandedCard === 'emails' ? null : 'emails')}>
            <Card className="rounded-2xl border-gray-200 overflow-hidden">
              <CollapsibleTrigger asChild>
                <CardHeader className="pb-3 sm:pb-4 cursor-pointer hover:bg-gray-50 transition-colors">
                  <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                      E-mails
                    </div>
                    <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform ${expandedCard === 'emails' ? 'rotate-180' : ''}`} />
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-3 sm:space-y-4">
                  {formData.emails.map((email, index) => (
                    <div key={index} className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-start">
                      <div className="flex-1 w-full">
                        <Input
                          type="email"
                          value={email.email}
                          onChange={(e) => handleEmailChange(index, 'email', e.target.value)}
                          placeholder="email@exemplo.com"
                          className="rounded-xl border-gray-200 text-sm"
                        />
                        {errors[`email_${index}`] && (
                          <p className="text-xs text-red-600 mt-1">{errors[`email_${index}`]}</p>
                        )}
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <Select 
                          value={email.type} 
                          onValueChange={(value) => handleEmailChange(index, 'type', value)}
                        >
                          <SelectTrigger className="w-full sm:w-32 rounded-xl border-gray-200 h-9 sm:h-10 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="primary">Principal</SelectItem>
                            <SelectItem value="work">Trabalho</SelectItem>
                            <SelectItem value="personal">Pessoal</SelectItem>
                            <SelectItem value="secondary">Secundário</SelectItem>
                          </SelectContent>
                        </Select>
                        {formData.emails.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => removeEmail(index)}
                            className="rounded-xl h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {formData.emails.length < 4 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addEmail}
                      className="rounded-xl w-full border-purple-200 text-purple-600 hover:bg-purple-50 text-sm h-9 sm:h-10"
                    >
                      <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                      Adicionar E-mail
                    </Button>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Empresa */}
          <Collapsible open={expandedCard === 'company'} onOpenChange={() => setExpandedCard(expandedCard === 'company' ? null : 'company')}>
            <Card className="rounded-2xl border-gray-200 overflow-hidden">
              <CollapsibleTrigger asChild>
                <CardHeader className="pb-3 sm:pb-4 cursor-pointer hover:bg-gray-50 transition-colors">
                  <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                      Empresa
                    </div>
                    <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform ${expandedCard === 'company' ? 'rotate-180' : ''}`} />
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-3 sm:space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label htmlFor="company_name" className="text-sm">Nome da Empresa</Label>
                      <Input
                        id="company_name"
                        value={formData.company_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                        placeholder="Nome da empresa"
                        className="rounded-xl border-gray-200 text-sm"
                      />
                    </div>

                    <div>
                      <Label htmlFor="position" className="text-sm">Cargo</Label>
                      <Select value={formData.position} onValueChange={(value) => setFormData(prev => ({ ...prev, position: value }))}>
                        <SelectTrigger className="rounded-xl border-gray-200 h-9 sm:h-10 text-sm">
                          <SelectValue placeholder="Selecione o cargo" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="ceo">CEO</SelectItem>
                          <SelectItem value="diretor">Diretor</SelectItem>
                          <SelectItem value="gerente">Gerente</SelectItem>
                          <SelectItem value="coordenador">Coordenador</SelectItem>
                          <SelectItem value="analista">Analista</SelectItem>
                          <SelectItem value="assistente">Assistente</SelectItem>
                          <SelectItem value="estagiario">Estagiário</SelectItem>
                          <SelectItem value="autonomo">Autônomo</SelectItem>
                          <SelectItem value="outros">Outros</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {formData.position === 'outros' && (
                    <div>
                      <Label htmlFor="custom_position" className="text-sm">Cargo Personalizado</Label>
                      <Input
                        id="custom_position"
                        value={formData.custom_position}
                        onChange={(e) => setFormData(prev => ({ ...prev, custom_position: e.target.value }))}
                        placeholder="Digite o cargo"
                        className="rounded-xl border-gray-200 text-sm"
                      />
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Status e Origem */}
          <Collapsible open={expandedCard === 'status'} onOpenChange={() => setExpandedCard(expandedCard === 'status' ? null : 'status')}>
            <Card className="rounded-2xl border-gray-200 overflow-hidden">
              <CollapsibleTrigger asChild>
                <CardHeader className="pb-3 sm:pb-4 cursor-pointer hover:bg-gray-50 transition-colors">
                  <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600" />
                      Status e Origem
                    </div>
                    <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform ${expandedCard === 'status' ? 'rotate-180' : ''}`} />
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-3 sm:space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label htmlFor="status" className="text-sm">Status</Label>
                      {!showNewStatusInput ? (
                        <Select 
                          value={formData.status} 
                          onValueChange={(value) => {
                            if (value === "__add_new__") {
                              setShowNewStatusInput(true);
                            } else {
                              setFormData(prev => ({ ...prev, status: value }));
                            }
                          }}
                        >
                          <SelectTrigger className="rounded-xl border-gray-200 h-9 sm:h-10 text-sm">
                            <SelectValue placeholder="Selecione o status" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl max-h-[200px]">
                            {availableStatuses.map((status) => (
                              <SelectItem key={status} value={status}>
                                {status}
                              </SelectItem>
                            ))}
                            <SelectItem value="__add_new__" className="text-blue-600 font-medium">
                              <div className="flex items-center gap-2">
                                <Plus className="w-3 h-3" />
                                Adicionar novo status
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex gap-2">
                          <Input
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value)}
                            placeholder="Digite o status"
                            className="rounded-xl border-gray-200 h-9 sm:h-10 text-sm"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddNewStatus();
                              }
                            }}
                          />
                          <Button
                            type="button"
                            onClick={handleAddNewStatus}
                            className="h-9 sm:h-10 px-3 bg-green-600 hover:bg-green-700 rounded-xl"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setShowNewStatusInput(false);
                              setNewStatus("");
                            }}
                            className="h-9 sm:h-10 px-3 rounded-xl"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="source" className="text-sm">Origem</Label>
                      {!showNewSourceInput ? (
                        <Select 
                          value={formData.source} 
                          onValueChange={(value) => {
                            if (value === "__add_new__") {
                              setShowNewSourceInput(true);
                            } else {
                              setFormData(prev => ({ ...prev, source: value }));
                            }
                          }}
                        >
                          <SelectTrigger className="rounded-xl border-gray-200 h-9 sm:h-10 text-sm">
                            <SelectValue placeholder="Selecione a origem" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl max-h-[200px]">
                            {availableSources.map((source) => (
                              <SelectItem key={source} value={source}>
                                {source}
                              </SelectItem>
                            ))}
                            <SelectItem value="__add_new__" className="text-blue-600 font-medium">
                              <div className="flex items-center gap-2">
                                <Plus className="w-3 h-3" />
                                Adicionar nova origem
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex gap-2">
                          <Input
                            value={newSource}
                            onChange={(e) => setNewSource(e.target.value)}
                            placeholder="Digite a origem"
                            className="rounded-xl border-gray-200 h-9 sm:h-10 text-sm"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddNewSource();
                              }
                            }}
                          />
                          <Button
                            type="button"
                            onClick={handleAddNewSource}
                            className="h-9 sm:h-10 px-3 bg-green-600 hover:bg-green-700 rounded-xl"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setShowNewSourceInput(false);
                              setNewSource("");
                            }}
                            className="h-9 sm:h-10 px-3 rounded-xl"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Temperatura */}
                  {contact && (
                    <div>
                      <Label className="text-sm">Temperatura</Label>
                      <div className="flex gap-2 mt-2">
                        <Button
                          type="button"
                          variant={formData.temperature === 'fria' ? 'default' : 'outline'}
                          onClick={() => setFormData(prev => ({ ...prev, temperature: 'fria' }))}
                          className={`flex-1 rounded-xl h-9 text-sm ${formData.temperature === 'fria' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                        >
                          <Snowflake className="w-4 h-4 mr-2" />
                          Fria
                        </Button>
                        <Button
                          type="button"
                          variant={formData.temperature === 'morna' ? 'default' : 'outline'}
                          onClick={() => setFormData(prev => ({ ...prev, temperature: 'morna' }))}
                          className={`flex-1 rounded-xl h-9 text-sm ${formData.temperature === 'morna' ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
                        >
                          <CloudSun className="w-4 h-4 mr-2" />
                          Morna
                        </Button>
                        <Button
                          type="button"
                          variant={formData.temperature === 'quente' ? 'default' : 'outline'}
                          onClick={() => setFormData(prev => ({ ...prev, temperature: 'quente' }))}
                          className={`flex-1 rounded-xl h-9 text-sm ${formData.temperature === 'quente' ? 'bg-red-600 hover:bg-red-700' : ''}`}
                        >
                          <Flame className="w-4 h-4 mr-2" />
                          Quente
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Marcadores e Campanhas */}
          <Collapsible open={expandedCard === 'tags'} onOpenChange={() => setExpandedCard(expandedCard === 'tags' ? null : 'tags')}>
            <Card className="rounded-2xl border-gray-200 overflow-hidden">
              <CollapsibleTrigger asChild>
                <CardHeader className="pb-3 sm:pb-4 cursor-pointer hover:bg-gray-50 transition-colors">
                  <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 sm:w-5 sm:h-5 text-pink-600" />
                      Marcadores e Campanhas
                    </div>
                    <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform ${expandedCard === 'tags' ? 'rotate-180' : ''}`} />
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  {/* Marcadores */}
                  <div>
                    <Label className="text-sm">Marcadores</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        value={currentTagInput}
                        onChange={(e) => setCurrentTagInput(e.target.value)}
                        placeholder="Digite um marcador"
                        className="rounded-xl border-gray-200 text-sm"
                        list="tag-suggestions"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTag();
                          }
                        }}
                      />
                      <datalist id="tag-suggestions">
                        {availableTagsForSelection
                          .filter(tag => !formData.tags.includes(tag.id))
                          .map(tag => (
                            <option key={tag.id} value={tag.name} />
                          ))
                        }
                      </datalist>
                      <Button
                        type="button"
                        onClick={handleAddTag}
                        disabled={!currentTagInput.trim()}
                        className="rounded-xl bg-pink-600 hover:bg-pink-700 h-9 sm:h-10 px-4"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    {formData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {formData.tags.map((tagId) => (
                          <Badge
                            key={tagId}
                            className="bg-pink-100 text-pink-700 border-pink-200 rounded-full px-3 py-1"
                          >
                            {tagNames[tagId] || tagId}
                            <button
                              type="button"
                              onClick={() => removeTag(tagId)}
                              className="ml-2 hover:text-pink-900"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Campanhas */}
                  <div>
                    <Label className="text-sm">Campanhas</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        value={currentCampaignInput}
                        onChange={(e) => setCurrentCampaignInput(e.target.value)}
                        placeholder="Digite o nome da campanha"
                        className="rounded-xl border-gray-200 text-sm"
                        list="campaign-suggestions"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCampaign();
                          }
                        }}
                      />
                      <datalist id="campaign-suggestions">
                        {availableCampaignsForSelection
                          .filter(campaign => !formData.campaign_ids.includes(campaign.id))
                          .map(campaign => (
                            <option key={campaign.id} value={campaign.name} />
                          ))
                        }
                      </datalist>
                      <Button
                        type="button"
                        onClick={handleAddCampaign}
                        disabled={!currentCampaignInput.trim()}
                        className="rounded-xl bg-indigo-600 hover:bg-indigo-700 h-9 sm:h-10 px-4"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    {formData.campaign_ids.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {formData.campaign_ids.map((campaignId) => (
                          <Badge
                            key={campaignId}
                            className="bg-indigo-100 text-indigo-700 border-indigo-200 rounded-full px-3 py-1"
                          >
                            {campaignNames[campaignId] || campaignId}
                            <button
                              type="button"
                              onClick={() => removeCampaign(campaignId)}
                              className="ml-2 hover:text-indigo-900"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Endereços */}
          <Collapsible open={expandedCard === 'addresses'} onOpenChange={() => setExpandedCard(expandedCard === 'addresses' ? null : 'addresses')}>
            <Card className="rounded-2xl border-gray-200 overflow-hidden">
              <CollapsibleTrigger asChild>
                <CardHeader className="pb-3 sm:pb-4 cursor-pointer hover:bg-gray-50 transition-colors">
                  <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                      Endereços
                    </div>
                    <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform ${expandedCard === 'addresses' ? 'rotate-180' : ''}`} />
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  {formData.addresses.map((address, index) => (
                    <div key={index} className="space-y-3 p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Endereço {index + 1}</Label>
                        {formData.addresses.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeAddress(index)}
                            className="rounded-xl h-8 border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <Minus className="w-3 h-3 mr-1" />
                            Remover
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Select 
                          value={address.type} 
                          onValueChange={(value) => {
                            const newAddresses = [...formData.addresses];
                            newAddresses[index].type = value;
                            setFormData(prev => ({ ...prev, addresses: newAddresses }));
                          }}
                        >
                          <SelectTrigger className="rounded-xl border-gray-200 h-9 text-sm">
                            <SelectValue placeholder="Tipo" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="residential">Residencial</SelectItem>
                            <SelectItem value="commercial">Comercial</SelectItem>
                            <SelectItem value="work">Trabalho</SelectItem>
                            <SelectItem value="other">Outro</SelectItem>
                          </SelectContent>
                        </Select>

                        <div className="relative">
                          <Input
                            value={address.cep}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '').slice(0, 8);
                              const formatted = value.length > 5 ? `${value.slice(0, 5)}-${value.slice(5)}` : value;
                              const newAddresses = [...formData.addresses];
                              newAddresses[index].cep = formatted;
                              setFormData(prev => ({ ...prev, addresses: newAddresses }));
                              handleCepLookup(index, formatted);
                            }}
                            placeholder="CEP"
                            className="rounded-xl border-gray-200 text-sm"
                          />
                          {loadingCep[index] && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <Input
                            value={address.street}
                            onChange={(e) => {
                              const newAddresses = [...formData.addresses];
                              newAddresses[index].street = e.target.value;
                              setFormData(prev => ({ ...prev, addresses: newAddresses }));
                            }}
                            placeholder="Rua"
                            className="rounded-xl border-gray-200 text-sm"
                          />
                        </div>
                        <Input
                          value={address.number}
                          onChange={(e) => {
                            const newAddresses = [...formData.addresses];
                            newAddresses[index].number = e.target.value;
                            setFormData(prev => ({ ...prev, addresses: newAddresses }));
                          }}
                          placeholder="Número"
                          className="rounded-xl border-gray-200 text-sm"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input
                          value={address.complement}
                          onChange={(e) => {
                            const newAddresses = [...formData.addresses];
                            newAddresses[index].complement = e.target.value;
                            setFormData(prev => ({ ...prev, addresses: newAddresses }));
                          }}
                          placeholder="Complemento"
                          className="rounded-xl border-gray-200 text-sm"
                        />
                        <Input
                          value={address.neighborhood}
                          onChange={(e) => {
                            const newAddresses = [...formData.addresses];
                            newAddresses[index].neighborhood = e.target.value;
                            setFormData(prev => ({ ...prev, addresses: newAddresses }));
                          }}
                          placeholder="Bairro"
                          className="rounded-xl border-gray-200 text-sm"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input
                          value={address.city}
                          onChange={(e) => {
                            const newAddresses = [...formData.addresses];
                            newAddresses[index].city = e.target.value;
                            setFormData(prev => ({ ...prev, addresses: newAddresses }));
                          }}
                          placeholder="Cidade"
                          className="rounded-xl border-gray-200 text-sm"
                        />
                        <Input
                          value={address.state}
                          onChange={(e) => {
                            const newAddresses = [...formData.addresses];
                            newAddresses[index].state = e.target.value;
                            setFormData(prev => ({ ...prev, addresses: newAddresses }));
                          }}
                          placeholder="Estado"
                          className="rounded-xl border-gray-200 text-sm"
                        />
                      </div>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={addAddress}
                    className="rounded-xl w-full border-red-200 text-red-600 hover:bg-red-50 text-sm h-9 sm:h-10"
                  >
                    <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                    Adicionar Endereço
                  </Button>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Redes Sociais */}
          <Collapsible open={expandedCard === 'social'} onOpenChange={() => setExpandedCard(expandedCard === 'social' ? null : 'social')}>
            <Card className="rounded-2xl border-gray-200 overflow-hidden">
              <CollapsibleTrigger asChild>
                <CardHeader className="pb-3 sm:pb-4 cursor-pointer hover:bg-gray-50 transition-colors">
                  <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-600" />
                      Redes Sociais
                    </div>
                    <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform ${expandedCard === 'social' ? 'rotate-180' : ''}`} />
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-3 sm:space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label className="text-sm">LinkedIn</Label>
                      <Input
                        value={formData.social_profiles.linkedin}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          social_profiles: { ...prev.social_profiles, linkedin: e.target.value }
                        }))}
                        placeholder="linkedin.com/in/usuario"
                        className="rounded-xl border-gray-200 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Instagram</Label>
                      <Input
                        value={formData.social_profiles.instagram}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          social_profiles: { ...prev.social_profiles, instagram: e.target.value }
                        }))}
                        placeholder="@usuario"
                        className="rounded-xl border-gray-200 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Facebook</Label>
                      <Input
                        value={formData.social_profiles.facebook}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          social_profiles: { ...prev.social_profiles, facebook: e.target.value }
                        }))}
                        placeholder="facebook.com/usuario"
                        className="rounded-xl border-gray-200 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Twitter/X</Label>
                      <Input
                        value={formData.social_profiles.twitter}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          social_profiles: { ...prev.social_profiles, twitter: e.target.value }
                        }))}
                        placeholder="@usuario"
                        className="rounded-xl border-gray-200 text-sm"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-sm">Website</Label>
                      <Input
                        value={formData.social_profiles.website}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          social_profiles: { ...prev.social_profiles, website: e.target.value }
                        }))}
                        placeholder="https://www.site.com.br"
                        className="rounded-xl border-gray-200 text-sm"
                      />
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Dados Bancários */}
          <Collapsible open={expandedCard === 'banking'} onOpenChange={() => setExpandedCard(expandedCard === 'banking' ? null : 'banking')}>
            <Card className="rounded-2xl border-gray-200 overflow-hidden">
              <CollapsibleTrigger asChild>
                <CardHeader className="pb-3 sm:pb-4 cursor-pointer hover:bg-gray-50 transition-colors">
                  <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                      Dados Bancários
                    </div>
                    <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform ${expandedCard === 'banking' ? 'rotate-180' : ''}`} />
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-3 sm:space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label className="text-sm">Nome do Banco</Label>
                      <Input
                        value={formData.banking_data.bank_name}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          banking_data: { ...prev.banking_data, bank_name: e.target.value }
                        }))}
                        placeholder="Ex: Banco do Brasil"
                        className="rounded-xl border-gray-200 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Código do Banco</Label>
                      <Input
                        value={formData.banking_data.bank_code}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          banking_data: { ...prev.banking_data, bank_code: e.target.value }
                        }))}
                        placeholder="Ex: 001"
                        className="rounded-xl border-gray-200 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Agência</Label>
                      <Input
                        value={formData.banking_data.agency}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          banking_data: { ...prev.banking_data, agency: e.target.value }
                        }))}
                        placeholder="0000"
                        className="rounded-xl border-gray-200 text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-sm">Conta</Label>
                        <Input
                          value={formData.banking_data.account}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            banking_data: { ...prev.banking_data, account: e.target.value }
                          }))}
                          placeholder="00000"
                          className="rounded-xl border-gray-200 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Dígito</Label>
                        <Input
                          value={formData.banking_data.account_digit}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            banking_data: { ...prev.banking_data, account_digit: e.target.value }
                          }))}
                          placeholder="0"
                          className="rounded-xl border-gray-200 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm">Tipo de Chave PIX</Label>
                      <Select 
                        value={formData.banking_data.pix_key_type} 
                        onValueChange={(value) => setFormData(prev => ({
                          ...prev,
                          banking_data: { ...prev.banking_data, pix_key_type: value }
                        }))}
                      >
                        <SelectTrigger className="rounded-xl border-gray-200 h-9 sm:h-10 text-sm">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="cpf">CPF</SelectItem>
                          <SelectItem value="cnpj">CNPJ</SelectItem>
                          <SelectItem value="email">E-mail</SelectItem>
                          <SelectItem value="phone">Telefone</SelectItem>
                          <SelectItem value="random">Chave Aleatória</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm">Chave PIX</Label>
                      <Input
                        value={formData.banking_data.pix_key}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          banking_data: { ...prev.banking_data, pix_key: e.target.value }
                        }))}
                        placeholder="Digite a chave PIX"
                        className="rounded-xl border-gray-200 text-sm"
                      />
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Notas */}
          <Collapsible open={expandedCard === 'notes'} onOpenChange={() => setExpandedCard(expandedCard === 'notes' ? null : 'notes')}>
            <Card className="rounded-2xl border-gray-200 overflow-hidden">
              <CollapsibleTrigger asChild>
                <CardHeader className="pb-3 sm:pb-4 cursor-pointer hover:bg-gray-50 transition-colors">
                  <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                    <div className="flex items-center gap-2">
                      <FileUser className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                      Notas
                    </div>
                    <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform ${expandedCard === 'notes' ? 'rotate-180' : ''}`} />
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-3 sm:space-y-4">
                  {formData.notes.map((note, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">
                          Nota {index + 1}
                          {note.date && (
                            <span className="text-xs text-gray-500 ml-2">
                              ({format(new Date(note.date), "dd/MM/yyyy HH:mm", { locale: ptBR })})
                            </span>
                          )}
                        </Label>
                        {formData.notes.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeNote(index)}
                            className="rounded-xl h-7 border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                      <Textarea
                        value={note.note}
                        onChange={(e) => handleNoteChange(index, e.target.value)}
                        placeholder="Digite uma nota..."
                        className="rounded-xl border-gray-200 text-sm min-h-[80px]"
                      />
                    </div>
                  ))}
                  
                  {formData.notes.length < 10 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addNote}
                      className="rounded-xl w-full border-orange-200 text-orange-600 hover:bg-orange-50 text-sm h-9 sm:h-10"
                    >
                      <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                      Adicionar Nota
                    </Button>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>

        <div className="flex justify-end items-center gap-3 p-4 sm:p-6 bg-gray-50 border-t border-gray-200 flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting || submitInProgress}
            className="rounded-xl"
          >
            Cancelar
          </Button>
          
          <Button
            type="submit"
            disabled={isSubmitting || submitInProgress || !formData.first_name.trim() || (!contact && !hasVerified)}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {contact ? 'Atualizar' : 'Criar Contato'}
              </>
            )}
          </Button>
        </div>
        </form>
      </DialogContent>
    </Dialog>

    {/* Dialog de confirmação de cancelamento */}
    <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
      <AlertDialogContent className="rounded-3xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Descartar alterações?</AlertDialogTitle>
          <AlertDialogDescription>
            {contact ? 'Você tem alterações não salvas neste contato.' : 'Você começou a criar um novo contato.'}
            {' '}Se fechar agora, todas as alterações serão perdidas.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-xl">
            Não, continuar editando
          </AlertDialogCancel>
          <AlertDialogAction onClick={confirmClose} className="rounded-xl bg-red-600 hover:bg-red-700">
            Sim, descartar alterações
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
}