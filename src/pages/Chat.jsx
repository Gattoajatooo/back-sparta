import React, { useState, useEffect, useCallback, useRef } from "react";
import { User } from "@/entities/User";
import { Contact } from "@/entities/Contact";
import { Message } from "@/entities/Message";
import { Session } from "@/entities/Session";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import SafeAvatar from "@/components/contacts/SafeAvatar";
import AnimatedContactName from "@/components/contacts/AnimatedContactName";
import ContactFormModal from "@/components/contacts/ContactFormModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  MessageSquare,
  Search,
  RefreshCw,
  ArrowUpCircle,
  ArrowDownCircle,
  CheckCircle2,
  XCircle,
  Phone,
  Calendar,
  Grid,
  List,
  AlertTriangle,
  Smartphone,
  Send,
  Paperclip,
  Image,
  FileText,
  PlayCircle,
  Mic,
  X as XIcon,
  Clock,
  AlertCircle,
  CheckCheck,
  UserPlus,
  ExternalLink,
  UserCheck,
  MoreVertical,
  EyeOff,
  Trash2,
  Eye,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useWebSocket } from "../components/hooks/useWebSocket";
import { UploadFile } from "@/integrations/Core";
import { sendText } from "@/functions/sendText";
import { sendImage } from "@/functions/sendImage";
import { sendVideo } from "@/functions/sendVideo";
import { sendVoice } from "@/functions/sendVoice";
import { sendFile } from "@/functions/sendFile";
import { getWaProfile } from "@/functions/getWaProfile";
import ContactHistoryModal from "@/components/contacts/ContactHistoryModal";
import { base44 } from "@/api/base44Client";
import { Download, MessageCirclePlus, Link as LinkIcon, Volume2, File } from "lucide-react";
import AudioPlayer from "@/components/chat/AudioPlayer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RotateCcw } from "lucide-react";
import { useLocation } from "react-router-dom";
import QuickAssignResponsibleModal from "../components/contacts/QuickAssignResponsibleModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

const formatPhone = (phone) => {
  if (!phone) return '';
  
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length > 15) return phone;
  
  if (cleaned.length >= 10) {
    const ddi = cleaned.substring(0, 2);
    const ddd = cleaned.substring(2, 4);
    const number = cleaned.substring(4);
    
    if (number.length === 9) {
      const first = number.substring(0, 1);
      const middle = number.substring(1, 5);
      const last = number.substring(5);
      return `+${ddi} ${ddd} ${first} ${middle}-${last}`;
    }
    else if (number.length === 8) {
      const middle = number.substring(0, 4);
      const last = number.substring(4);
      return `+${ddi} ${ddd} ${middle}-${last}`;
    }
  }
  
  return phone;
};

export default function Chat() {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedSessionFilter, setSelectedSessionFilter] = useState("all");
  const [selectedResponsibleFilter, setSelectedResponsibleFilter] = useState("all");
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedChatSession, setSelectedChatSession] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);
  const [responsibleNames, setResponsibleNames] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [hiddenConversations, setHiddenConversations] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('hiddenConversations') || '[]');
    } catch {
      return [];
    }
  });
  const [conversationToDelete, setConversationToDelete] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('conversationsViewMode') || 'grid';
  });
  const [message, setMessage] = useState("");
  const [sessionProfiles, setSessionProfiles] = useState({});
  const [chatMessages, setChatMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState(null);
  const chatMessagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const [showContactFormModal, setShowContactFormModal] = useState(false);
  const [prefilledContactData, setPrefilledContactData] = useState(null);
  const [hoveredMessageId, setHoveredMessageId] = useState(null);
  const hoverTimeoutRef = useRef(null);
  const [isSyncingMessages, setIsSyncingMessages] = useState(false);
  const [downloadingMediaIds, setDownloadingMediaIds] = useState(new Set());
  const [downloadedMediaIds, setDownloadedMediaIds] = useState(new Set());
  const [showNewConversationModal, setShowNewConversationModal] = useState(false);
  const [allContactsList, setAllContactsList] = useState([]);
  const [expandedMessages, setExpandedMessages] = useState(new Set());
  const [newConversationPhone, setNewConversationPhone] = useState("");
  const [isVerifyingNewPhone, setIsVerifyingNewPhone] = useState(false);
  const [newPhoneVerificationResult, setNewPhoneVerificationResult] = useState(null);
  const [verifiedContactData, setVerifiedContactData] = useState(null);
  const [isLoadingNewConversation, setIsLoadingNewConversation] = useState(false);
  const [showQuickAssignResponsible, setShowQuickAssignResponsible] = useState(false);
  const [assignResponsibleContact, setAssignResponsibleContact] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('conversationsViewMode', viewMode);
  }, [viewMode]);

  const handleWebSocketMessage = useCallback((data) => {
    console.log('[Chat] 📨 WebSocket message received:', data.type, data);
    
    if (data.type === 'message_updated' || data.type === 'message_received') {
      // Atualizar lista de contatos
      if (user?.company_id) {
        loadContacts(user.company_id);
      }
      
      // Verificar se a mensagem é para o contato selecionado
      if (selectedContact) {
        const messageData = data.data || data;
        const messageChatId = messageData.chat_id;
        const messageContactId = messageData.contact_id;
        
        // Extrair telefone do chat_id (formato: 5531999999999@c.us)
        const messagePhone = messageChatId?.split('@')[0]?.replace(/\D/g, '');
        const selectedContactPhone = selectedContact.phone?.replace(/\D/g, '');
        
        // Verificar match por contact_id ou por telefone
        const isMatchByContactId = messageContactId && messageContactId === selectedContact.id;
        const isMatchByPhone = messagePhone && selectedContactPhone && (
          messagePhone === selectedContactPhone ||
          messagePhone.endsWith(selectedContactPhone) ||
          selectedContactPhone.endsWith(messagePhone)
        );
        
        console.log('[Chat] 🔍 Verificando match:', {
          messageContactId,
          selectedContactId: selectedContact.id,
          messagePhone,
          selectedContactPhone,
          isMatchByContactId,
          isMatchByPhone
        });
        
        if (isMatchByContactId || isMatchByPhone) {
          console.log('[Chat] ✅ Match encontrado! Recarregando mensagens...');
          loadChatMessages(selectedContact, selectedChatSession?.phone || null);
        }
      }
    }
  }, [selectedContact, selectedChatSession, user]);

  // WebSocket para atualizações em tempo real
  const { isConnected: wsConnected } = useWebSocket(
    user?.company_id,
    handleWebSocketMessage,
    ['message_updated', 'message_received']
  );
  
  // Log de conexão WebSocket
  useEffect(() => {
    console.log('[Chat] 📡 WebSocket connection status:', wsConnected ? 'Connected' : 'Disconnected');
  }, [wsConnected]);

  const urlChatOpenedRef = useRef(false);

  useEffect(() => {
    loadUserAndData();
  }, []);

  useEffect(() => {
    if (location.state?.selectedChatId && contacts.length > 0 && sessions.length > 0 && !urlChatOpenedRef.current) {
      urlChatOpenedRef.current = true;
      const contact = location.state.contact || contacts.find(c => {
        const chatPhone = location.state.selectedChatId.split('@')[0];
        const contactPhone = c.phone?.replace(/\D/g, '');
        return contactPhone === chatPhone;
      });
      
      if (contact) {
        handleOpenChat(contact);
      }
    }
  }, [location.state, contacts, sessions]);

  useEffect(() => {
    if (contacts.length > 0 && sessions.length > 0 && !urlChatOpenedRef.current) {
      const urlParams = new URLSearchParams(window.location.search);
      const phoneParam = urlParams.get('phone');
      
      if (phoneParam) {
        urlChatOpenedRef.current = true;
        
        const contact = contacts.find(c => {
          const contactPhone = c.phone?.replace(/\D/g, '') || '';
          return contactPhone === phoneParam || contactPhone.endsWith(phoneParam) || phoneParam.endsWith(contactPhone);
        });
        
        if (contact) {
          handleOpenChat(contact);
        }
      }
    }
  }, [contacts, sessions]);

  const loadUserAndData = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);
      await loadSessions(currentUser.company_id);
      await loadContacts(currentUser.company_id);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      setMessage("Erro ao carregar dados");
    } finally {
      setIsLoading(false);
    }
  };

  const loadSessions = async (companyId) => {
    const targetCompanyId = companyId || user?.company_id;
    if (!targetCompanyId) return;
    try {
      const allSessions = await Session.list();
      let workingSessions = allSessions.filter(s => !s.is_deleted && s.status === 'WORKING');
      
      // Filtrar sessões por permissão de acesso do usuário
      const currentUser = user || await User.me();
      if (currentUser.system_role !== 'admin') {
        const filterResponse = await base44.functions.invoke('filterSessionsByUserAccess', {
          sessions: workingSessions
        });
        
        if (filterResponse.data?.success) {
          workingSessions = filterResponse.data.sessions;
        }
      }
      
      setSessions(workingSessions);

      if (workingSessions.length > 0 && !selectedSession) {
        setSelectedSession(workingSessions[0]);
      }

      const profiles = {};
      for (const session of workingSessions) {
        profiles[session.session_name] = {
          name: session.push_name || session.phone || session.session_name,
          phone: session.phone,
          picture: session.avatar_url
        };
      }
      setSessionProfiles(profiles);
    } catch (error) {
      console.error("Error loading sessions:", error);
    }
  };

  const loadContacts = async (companyId) => {
    try {
      const targetCompanyId = companyId || user?.company_id;
      if (!targetCompanyId) return;
      
      console.log('[Chat] 📋 Carregando contatos para empresa:', targetCompanyId);
      
      const messageFilter = {
        company_id: targetCompanyId
      };
      
      if (selectedSessionFilter !== 'all') {
        messageFilter.session_name = selectedSessionFilter;
      }
      
      const allMessages = await Message.filter(messageFilter, '-created_date');
      
      const activeSessions = sessions.length > 0 ? sessions : await Session.filter({
        company_id: targetCompanyId,
        is_deleted: { '$ne': true },
        status: 'WORKING'
      });

      const contactsWithMessages = new Map();
      
      let allContactsData = [];
      try {
        // Carregar todos os contatos (incluindo deletados para admins)
        allContactsData = await Contact.filter({ 
          company_id: targetCompanyId
        });
        
        // Filtrar deletados apenas se não for admin
        const currentUser = user || await User.me();
        if (currentUser?.system_role !== 'admin') {
          allContactsData = allContactsData.filter(c => c.deleted !== true);
        }
      } catch (error) {
        console.error("Erro ao carregar contatos:", error);
      }
      
      const contactsById = new Map(allContactsData.map(c => [c.id, c]));
      const contactsByPhone = new Map();
      
      allContactsData.forEach(contact => {
        if (contact.phone) {
          const cleanPhone = contact.phone.replace(/\D/g, '');
          if (!contactsByPhone.has(cleanPhone)) {
            contactsByPhone.set(cleanPhone, contact);
          }
        }
        
        if (contact.phones && Array.isArray(contact.phones)) {
          contact.phones.forEach(phoneEntry => {
            if (phoneEntry.phone) {
              const cleanPhone = phoneEntry.phone.replace(/\D/g, '');
              if (!contactsByPhone.has(cleanPhone)) {
                contactsByPhone.set(cleanPhone, contact);
              }
            }
          });
        }
      });
      console.log('[Chat] 📞 Total de telefones mapeados:', contactsByPhone.size);

      for (const msg of allMessages) {
        let contactData;
        let contactId;
        
        if (msg.contact_id) {
          contactData = contactsById.get(msg.contact_id);
          contactId = msg.contact_id;
        }
        
        if (!contactData && msg.chat_id) {
          const phoneFromChat = msg.chat_id.split('@')[0];
          const cleanPhone = phoneFromChat.replace(/\D/g, '');
          
          const matchingContact = contactsByPhone.get(cleanPhone);
          
          if (matchingContact) {
            console.log('[Chat] 🔗 Match encontrado por telefone:', phoneFromChat, '->', matchingContact.first_name);
            contactData = matchingContact;
            contactId = matchingContact.id;
            
            Message.update(msg.id, { contact_id: matchingContact.id }).catch(err => 
              console.error('[Chat] Erro ao atualizar contact_id:', err)
            );
          }
        }
        
        if (!contactData) {
          const phoneFromChat = msg.chat_id?.split('@')[0];
          const isLid = phoneFromChat && phoneFromChat.length > 15 && !phoneFromChat.includes('@');
          contactId = `virtual-${phoneFromChat || msg.chat_id}`;
          
          if (!contactsById.has(contactId)) {
            contactData = {
              id: contactId,
              first_name: 'Desconhecido',
              last_name: '',
              phone: phoneFromChat,
              avatar_url: null,
              isVirtual: true,
              isLid: isLid,
              company_id: targetCompanyId
            };
            contactsById.set(contactId, contactData);
          } else {
            contactData = contactsById.get(contactId);
          }
        }
        
        if (!contactsWithMessages.has(contactId)) {
          contactsWithMessages.set(contactId, {
            ...contactData,
            lastMessageTime: msg.created_at,
            lastMessage: msg.content || msg.caption || (msg.media_url ? `[Mídia: ${msg.metadata?.content_type || 'arquivo'}]` : ''),
            lastMessageDirection: msg.direction,
            sentCount: 0,
            receivedCount: 0,
            hasUnread: false,
            sessionNames: new Set()
          });
        }

        const contact = contactsWithMessages.get(contactId);
        
        if (msg.session_name) {
          contact.sessionNames.add(msg.session_name);
        }
        
        if (new Date(msg.created_at) > new Date(contact.lastMessageTime)) {
          contact.lastMessageTime = msg.created_at;
          contact.lastMessage = msg.content || msg.caption || (msg.media_url ? `[Mídia: ${msg.metadata?.content_type || 'arquivo'}]` : '');
          contact.lastMessageDirection = msg.direction;
        }

        if (msg.direction === 'sent') {
          contact.sentCount++;
        } else if (msg.direction === 'received') {
          contact.receivedCount++;
        }
      }

      const readMapRaw = localStorage.getItem('chatReadMap') || '{}';
      let readMapObj = {};
      try { readMapObj = JSON.parse(readMapRaw); } catch {}
      for (const [cid, c] of contactsWithMessages.entries()) {
        const lastReadAt = readMapObj[cid];
        if (lastReadAt) {
          c.hasUnread = c.lastMessageDirection === 'received' && new Date(c.lastMessageTime) > new Date(lastReadAt);
        } else {
          c.hasUnread = c.lastMessageDirection === 'received';
        }
      }

      const contactsList = Array.from(contactsWithMessages.values()).sort((a, b) => 
        new Date(b.lastMessageTime) - new Date(a.lastMessageTime)
      );
      
      console.log('[Chat] ✅ Total de contatos carregados:', contactsList.length);
      console.log('[Chat] 📊 Virtuais:', contactsList.filter(c => c.isVirtual).length, '| Reais:', contactsList.filter(c => !c.isVirtual).length);
      
      setContacts(contactsList);
      
      // Extrair nomes únicos de responsáveis
      const uniqueResponsibles = [...new Set(allContactsData.map(c => c.responsible_name).filter(Boolean))].sort();
      setResponsibleNames(uniqueResponsibles);
      
      return contactsList;
      
    } catch (error) {
      console.error("Error loading contacts with messages:", error);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setMessage("");
    try {
      await loadContacts();
      setMessage("✓ Mensagens atualizadas com sucesso");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Error syncing contacts:", error);
      setMessage("Erro ao atualizar mensagens");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleOpenChat = async (contact) => {
    if (contact.isLid && contact.isVirtual) {
      const session = sessions.find(s => s.status === 'WORKING');
      if (session) {
        try {
          const response = await base44.functions.invoke('resolveLid', {
            lid: contact.phone,
            sessionName: session.session_name
          });
          
          if (response.data?.success && response.data?.phone) {
            console.log('[Chat] LID resolvido:', contact.phone, '->', response.data.phone);
            contact.phone = response.data.phone;
            contact.isLid = false;
          }
        } catch (error) {
          console.error('[Chat] Erro ao resolver LID:', error);
        }
      }
    }
    
    setSelectedContact(contact);

    const now = new Date().toISOString();
    const mapRaw = localStorage.getItem('chatReadMap') || '{}';
    let map = {};
    try { map = JSON.parse(mapRaw); } catch {}
    map[contact.id] = now;
    localStorage.setItem('chatReadMap', JSON.stringify(map));

    // Carregar mensagens sem filtro para identificar última sessão
    try {
      let messageList = [];
      
      if (contact.isVirtual && contact.phone) {
        const phoneNumber = contact.phone.replace(/\D/g, '');
        const chatIds = contact.phone.includes('@') ? [contact.phone] : [`${phoneNumber}@lid`, `${phoneNumber}@c.us`];
        
        const allMessages = [];
        for (const chatId of chatIds) {
          const msgs = await Message.filter({
            company_id: user.company_id,
            chat_id: chatId
          }, 'created_at');
          allMessages.push(...msgs);
        }
        
        messageList = Array.from(
          new Map(allMessages.map(msg => [msg.id, msg])).values()
        ).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      } else {
        messageList = await Message.filter({
          company_id: user.company_id,
          contact_id: contact.id
        }, 'created_at');
      }

      // Identificar última mensagem com sessão
      const lastMessageWithSession = messageList
        .filter(msg => msg.session_name)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
      
      if (lastMessageWithSession && sessions.length > 0) {
        const suggestedSession = sessions.find(s => s.session_name === lastMessageWithSession.session_name);
        if (suggestedSession) {
          console.log('[Chat] 💡 Sessão da última mensagem:', suggestedSession.session_name);
          setSelectedChatSession(suggestedSession);
          await loadChatMessages(contact, suggestedSession.phone);
        } else {
          await loadChatMessages(contact, null);
        }
      } else {
        await loadChatMessages(contact, null);
      }
    } catch (error) {
      console.error('[Chat] Erro ao identificar última sessão:', error);
      await loadChatMessages(contact, null);
    }
    
    await loadContacts();
  };
  
  const handleAddUnknownContact = async (e, contact) => {
    e.stopPropagation();
    e.preventDefault();
    
    console.log('[Chat] Adicionando contato desconhecido:', contact);
    
    let phoneToAdd = contact.phone;
    
    if (contact.isLid) {
      const session = sessions.find(s => s.status === 'WORKING');
      if (session) {
        try {
          const response = await base44.functions.invoke('resolveLid', {
            lid: contact.phone,
            sessionName: session.session_name
          });
          
          if (response.data?.success && response.data?.phone) {
            phoneToAdd = response.data.phone;
          }
        } catch (error) {
          console.error('[Chat] Erro ao resolver LID:', error);
        }
      }
    }
    
    console.log('[Chat] Abrindo modal para criar contato com telefone:', phoneToAdd);
    
    setPrefilledContactData({
      phones: [{ phone: phoneToAdd, type: 'primary' }],
      company_id: user.company_id
    });
    setShowContactFormModal(true);
  };
  
  const handleAssignResponsible = (contact) => {
    setAssignResponsibleContact(contact);
    setShowQuickAssignResponsible(true);
  };

  const handleAssignResponsibleSuccess = async (message) => {
    setMessage(message);
    setTimeout(() => setMessage(""), 3000);
    await loadContacts(user.company_id);
  };

  const handleHideConversation = (contact, e) => {
    e.stopPropagation();
    const chatId = contact.phone?.includes('@') ? contact.phone : `${contact.phone}@c.us`;
    const newHidden = [...hiddenConversations, chatId];
    setHiddenConversations(newHidden);
    localStorage.setItem('hiddenConversations', JSON.stringify(newHidden));
    setMessage('✓ Conversa ocultada com sucesso');
    setTimeout(() => setMessage(""), 3000);
  };

  const handleUnhideConversation = (contact, e) => {
    e.stopPropagation();
    const chatId = contact.phone?.includes('@') ? contact.phone : `${contact.phone}@c.us`;
    const newHidden = hiddenConversations.filter(id => id !== chatId);
    setHiddenConversations(newHidden);
    localStorage.setItem('hiddenConversations', JSON.stringify(newHidden));
    setMessage('✓ Conversa reexibida com sucesso');
    setTimeout(() => setMessage(""), 3000);
  };

  const [deletedConversations, setDeletedConversations] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('deletedConversations') || '[]');
    } catch {
      return [];
    }
  });

  const handleDeleteConversation = (contact, e) => {
    e.stopPropagation();
    setConversationToDelete(contact);
    setShowDeleteDialog(true);
  };

  const confirmDeleteConversation = async () => {
    if (!conversationToDelete || !user) return;

    try {
      const chatId = conversationToDelete.phone?.includes('@') 
        ? conversationToDelete.phone 
        : `${conversationToDelete.phone}@c.us`;

      // Criar agendamento para exclusão permanente (7 dias)
      const scheduledFor = new Date();
      scheduledFor.setDate(scheduledFor.getDate() + 7);

      await base44.entities.SystemSchedule.create({
        company_id: user.company_id,
        type: 'conversation_delete',
        status: 'pending',
        scheduled_for: scheduledFor.toISOString(),
        created_by: user.id,
        target_type: 'conversation',
        target_id: chatId,
        target_data: {
          contact_id: conversationToDelete.id,
          contact_name: `${conversationToDelete.first_name} ${conversationToDelete.last_name || ''}`,
          phone: conversationToDelete.phone
        },
        metadata: {
          message_count: (conversationToDelete.sentCount || 0) + (conversationToDelete.receivedCount || 0)
        }
      });

      // Marcar como deletada localmente (não vai para ocultas)
      const newDeleted = [...deletedConversations, chatId];
      setDeletedConversations(newDeleted);
      localStorage.setItem('deletedConversations', JSON.stringify(newDeleted));

      // Remover das ocultas se estiver lá (uma conversa é oculta OU deletada, não ambos)
      if (hiddenConversations.includes(chatId)) {
        const newHidden = hiddenConversations.filter(id => id !== chatId);
        setHiddenConversations(newHidden);
        localStorage.setItem('hiddenConversations', JSON.stringify(newHidden));
      }

      // Fechar chat se estiver aberto
      if (selectedContact?.id === conversationToDelete.id) {
        setSelectedContact(null);
        setChatMessages([]);
        setSelectedChatSession(null);
      }

      setMessage('✓ Conversa excluída. Será removida permanentemente em 7 dias.');
      setTimeout(() => setMessage(""), 5000);
      
      await loadContacts(user.company_id);
    } catch (error) {
      console.error('Erro ao excluir conversa:', error);
      setMessage('❌ Erro ao excluir conversa');
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setShowDeleteDialog(false);
      setConversationToDelete(null);
    }
  };

  const handleContactCreated = async (newContact) => {
    console.log('[Chat] ✅ Contato criado com sucesso:', newContact);
    setShowContactFormModal(false);
    setPrefilledContactData(null);
    
    if (newContact?.phone) {
      try {
        const phoneNumber = newContact.phone.replace(/\D/g, '');
        const chatIds = [
          `${phoneNumber}@c.us`,
          `${phoneNumber}@lid`
        ];
        
        console.log('[Chat] 🔄 Vinculando mensagens ao novo contato:', newContact.id, 'com chat_ids:', chatIds);
        
        for (const chatId of chatIds) {
          const messagesToUpdate = await Message.filter({
            company_id: user.company_id,
            chat_id: chatId
          });
          
          if (messagesToUpdate.length > 0) {
            console.log(`[Chat] 📝 Encontradas ${messagesToUpdate.length} mensagens para ${chatId}`);
            
            for (const msg of messagesToUpdate) {
              if (!msg.contact_id || msg.contact_id !== newContact.id) {
                await Message.update(msg.id, { contact_id: newContact.id });
                console.log(`[Chat] ✅ Mensagem ${msg.id} vinculada ao contato ${newContact.id}`);
              }
            }
          }
        }
      } catch (error) {
        console.error('[Chat] Erro ao atualizar mensagens:', error);
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const updatedContacts = await loadContacts(user.company_id);
    
    if (selectedContact) {
      const phoneMatch = selectedContact.phone?.replace(/\D/g, '') === newContact.phone?.replace(/\D/g, '');
      if (phoneMatch) {
        console.log('[Chat] 🔄 Atualizando chat aberto com novo contato');
        
        const matchingContact = updatedContacts?.find(c => c.id === newContact.id);
        
        if (matchingContact) {
          setSelectedContact(matchingContact);
          await loadChatMessages(matchingContact, selectedChatSession?.phone || null);
        }
      }
    }
    
    setMessage(`✓ Contato ${newContact?.first_name || ''} adicionado com sucesso!`);
    setTimeout(() => setMessage(""), 3000);
  };

  const handleOpenNewConversation = async () => {
    setIsLoadingNewConversation(true);
    try {
      const allContacts = await Contact.filter({ company_id: user.company_id });
      setAllContactsList(allContacts);
      setNewConversationPhone("");
      setNewPhoneVerificationResult(null);
      setVerifiedContactData(null);
      setShowNewConversationModal(true);
    } catch (error) {
      console.error("Erro ao carregar contatos:", error);
      setMessage("❌ Erro ao carregar contatos");
    } finally {
      setIsLoadingNewConversation(false);
    }
  };

  const handleVerifyNewPhone = async () => {
    if (!newConversationPhone.trim()) {
      setMessage("Digite um número de telefone");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    setIsVerifyingNewPhone(true);
    setNewPhoneVerificationResult(null);
    setVerifiedContactData(null);

    try {
      const workingSessions = sessions.filter(s => s.status === 'WORKING');
      const defaultSession = workingSessions.find(s => s.is_default) || workingSessions[0];
      
      if (!defaultSession) {
        setMessage('Nenhuma sessão ativa encontrada');
        setTimeout(() => setMessage(""), 3000);
        setIsVerifyingNewPhone(false);
        return;
      }

      const cleanPhone = newConversationPhone.replace(/\D/g, '');
      const isLid = cleanPhone.length > 15 || (cleanPhone.length > 0 && !/^55/.test(cleanPhone) && cleanPhone.length > 13);
      
      let phoneToVerify = newConversationPhone;
      
      if (isLid) {
        console.log('[Chat] Detectado LID, resolvendo:', cleanPhone);
        const lidToResolve = cleanPhone.includes('@') ? cleanPhone : `${cleanPhone}@lid`;
        
        try {
          const resolveResponse = await base44.functions.invoke('resolveLid', {
            lid: lidToResolve,
            sessionName: defaultSession.session_name
          });

          if (resolveResponse.data?.success && resolveResponse.data?.phone) {
            phoneToVerify = resolveResponse.data.phone;
            console.log('[Chat] LID resolvido para:', phoneToVerify);
            setNewConversationPhone(formatPhone(phoneToVerify));
          } else {
            setMessage('Não foi possível resolver o LID');
            setTimeout(() => setMessage(""), 3000);
            setIsVerifyingNewPhone(false);
            return;
          }
        } catch (lidError) {
          console.error('[Chat] Erro ao resolver LID:', lidError);
          setMessage('Erro ao resolver LID');
          setTimeout(() => setMessage(""), 3000);
          setIsVerifyingNewPhone(false);
          return;
        }
      }

      const checkResponse = await base44.functions.invoke('checkExistsContact', {
        phones: [phoneToVerify]
      });

      if (!checkResponse.data?.success || !checkResponse.data.results || checkResponse.data.results.length === 0) {
        setMessage('Erro ao verificar número');
        setTimeout(() => setMessage(""), 3000);
        setIsVerifyingNewPhone(false);
        return;
      }

      const verificationData = checkResponse.data.results[0];
      setNewPhoneVerificationResult(verificationData);

      if (!verificationData.exists) {
        setMessage('Número não existe no WhatsApp');
        setTimeout(() => setMessage(""), 3000);
        setIsVerifyingNewPhone(false);
        return;
      }

      const verifiedPhone = verificationData.verified_phone || verificationData.cleaned_phone;
      if (verifiedPhone) {
        setNewConversationPhone(formatPhone(verifiedPhone));
      }

      const chatId = verifiedPhone.includes('@') ? verifiedPhone : `${verifiedPhone}@c.us`;
      
      const profileResponse = await base44.functions.invoke('getContactInfo', {
        contactId: chatId,
        sessionName: defaultSession.session_name
      });

      let contactInfo = { first_name: 'Contato', avatar_url: null };
      
      if (profileResponse.data?.success) {
        const profile = profileResponse.data.contact;
        
        if (profile.pushname) {
          const nameParts = profile.pushname.trim().split(' ');
          contactInfo.first_name = nameParts[0] || 'Contato';
          contactInfo.last_name = nameParts.slice(1).join(' ') || '';
        }

        const photoResponse = await base44.functions.invoke('getWhatsAppProfilePicture', {
          contactId: chatId,
          sessionName: defaultSession.session_name,
          refresh: false
        });

        if (photoResponse.data?.success && photoResponse.data?.profilePictureUrl) {
          contactInfo.avatar_url = photoResponse.data.profilePictureUrl;
        }
      }

      setVerifiedContactData({
        phone: verifiedPhone,
        first_name: contactInfo.first_name,
        last_name: contactInfo.last_name || '',
        avatar_url: contactInfo.avatar_url
      });

      setMessage('✓ Número verificado com sucesso!');
      setTimeout(() => setMessage(""), 3000);

    } catch (error) {
      console.error('Erro ao verificar telefone:', error);
      setMessage('Erro ao verificar telefone');
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setIsVerifyingNewPhone(false);
    }
  };

  const handleStartConversation = async () => {
    if (!verifiedContactData) return;

    const existingContact = contacts.find(c => 
      c.phone?.replace(/\D/g, '') === verifiedContactData.phone.replace(/\D/g, '')
    );

    if (existingContact) {
      setShowNewConversationModal(false);
      handleOpenChat(existingContact);
    } else {
      const virtualContact = {
        id: `virtual-${verifiedContactData.phone}`,
        first_name: verifiedContactData.first_name,
        last_name: verifiedContactData.last_name,
        phone: verifiedContactData.phone,
        avatar_url: verifiedContactData.avatar_url,
        isVirtual: true,
        company_id: user.company_id
      };
      
      setShowNewConversationModal(false);
      handleOpenChat(virtualContact);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const updateAudioLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
        setAudioLevel(average / 255);
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };
      
      updateAudioLevel();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/ogg; codecs=opus' });
        setAudioBlob(audioBlob);
        
        stream.getTracks().forEach(track => track.stop());
        
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
        
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Erro ao iniciar gravação:', error);
      setMessage('❌ Erro ao acessar o microfone');
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setAudioLevel(0);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const cancelRecording = () => {
    if (isRecording) {
      stopRecording();
    }
    setAudioBlob(null);
    setRecordingTime(0);
  };

  const continueRecording = async () => {
    if (!audioBlob) return;
    
    const previousBlob = audioBlob;
    setAudioBlob(null);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [previousBlob];

      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const updateAudioLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
        setAudioLevel(average / 255);
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };
      
      updateAudioLevel();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/ogg; codecs=opus' });
        setAudioBlob(audioBlob);
        
        stream.getTracks().forEach(track => track.stop());
        
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
        
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Erro ao continuar gravação:', error);
      setAudioBlob(previousBlob);
      setMessage('❌ Erro ao acessar o microfone');
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const sendRecordedAudio = async () => {
    if (!audioBlob || !selectedContact || !selectedChatSession) return;

    const tempId = `temp-${Date.now()}`;
    const sessionData = {
      avatar_url: sessionProfiles[selectedChatSession.session_name]?.picture,
      phone: selectedChatSession.phone,
      name: sessionProfiles[selectedChatSession.session_name]?.name || selectedChatSession.phone
    };

    const audioFile = new File([audioBlob], `audio-${Date.now()}.ogg`, {
      type: 'audio/ogg; codecs=opus'
    });

    try {
      const uploadResponse = await UploadFile({ file: audioFile });
      const fileUrl = uploadResponse.file_url || uploadResponse.data?.file_url;
      
      if (!fileUrl) {
        throw new Error('Erro ao fazer upload do áudio');
      }

      const fileData = {
        url: fileUrl,
        filename: audioFile.name,
        mimetype: audioFile.type
      };

      const optimisticMessage = {
        id: tempId,
        content: '',
        direction: 'sent',
        status: 'pending',
        created_at: Date.now(),
        contact_id: selectedContact.id,
        session_name: selectedChatSession.session_name,
        session_number: selectedChatSession.phone,
        sessionData: sessionData,
        metadata: {
          type: 'voice',
          file: fileData
        }
      };

      setChatMessages(prev => [...prev, optimisticMessage]);
      setAudioBlob(null);
      setRecordingTime(0);

      const sessionProfile = {
        name: sessionProfiles[selectedChatSession.session_name]?.name || selectedChatSession.phone || selectedChatSession.session_name,
        phone: selectedChatSession.phone,
        picture: sessionProfiles[selectedChatSession.session_name]?.picture
      };

      const response = await sendVoice({
        phone: selectedContact.phone,
        sessionName: selectedChatSession.session_name,
        contactId: selectedContact.isVirtual ? null : selectedContact.id,
        sessionProfile: sessionProfile,
        file: fileData
      });

      if (response.data?.success) {
        setChatMessages(prev => prev.map(msg => 
          msg.id === tempId ? { ...msg, status: 'success' } : msg
        ));
        
        await loadContacts();
        setTimeout(scrollToBottomSmooth, 100);
        
        setMessage("✓ Áudio enviado com sucesso");
        setTimeout(() => setMessage(""), 3000);
      } else {
        setChatMessages(prev => prev.map(msg => 
          msg.id === tempId ? { 
            ...msg, 
            status: 'failed',
            error_details: response.data?.error || 'Erro ao enviar áudio'
          } : msg
        ));
        setMessage(response.data?.error || 'Erro ao enviar áudio');
      }
    } catch (error) {
      console.error("Erro ao enviar áudio gravado:", error);
      setMessage("❌ Erro ao enviar áudio");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const handleRetryMessage = async (failedMessage) => {
    if (!failedMessage || !selectedChatSession) return;

    const tempId = `temp-${Date.now()}`;
    const sessionData = {
      avatar_url: sessionProfiles[selectedChatSession.session_name]?.picture,
      phone: selectedChatSession.phone,
      name: sessionProfiles[selectedChatSession.session_name]?.name || selectedChatSession.phone
    };

    setChatMessages(prev => prev.filter(msg => msg.id !== failedMessage.id));

    const optimisticMessage = {
      id: tempId,
      content: failedMessage.content,
      direction: 'sent',
      status: 'pending',
      created_at: Date.now(),
      contact_id: selectedContact.id,
      session_name: selectedChatSession.session_name,
      session_number: selectedChatSession.phone,
      sessionData: sessionData,
      metadata: failedMessage.metadata
    };

    setChatMessages(prev => [...prev, optimisticMessage]);
    setIsSending(true);

    try {
      const sessionProfile = {
        name: sessionProfiles[selectedChatSession.session_name]?.name || selectedChatSession.phone || selectedChatSession.session_name,
        phone: selectedChatSession.phone,
        picture: sessionProfiles[selectedChatSession.session_name]?.picture
      };

      let response;

      if (failedMessage.media_url || failedMessage.metadata?.file?.url) {
        const media = {
          url: failedMessage.media_url || failedMessage.metadata?.file?.url,
          type: failedMessage.metadata?.message_type || failedMessage.metadata?.content_type || failedMessage.metadata?.type,
          filename: failedMessage.filename || failedMessage.metadata?.file?.filename,
          mimetype: failedMessage.mimetype || failedMessage.metadata?.file?.mimetype
        };

        const isImage = media.type === 'image' || media.mimetype?.startsWith('image');
        const isVideo = media.type === 'video' || media.mimetype?.startsWith('video');
        const isAudio = media.type === 'audio' || media.type === 'voice' || media.type === 'ptt' || media.mimetype?.startsWith('audio');

        const params = {
          phone: selectedContact.phone,
          sessionName: selectedChatSession.session_name,
          contactId: selectedContact.isVirtual ? null : selectedContact.id,
          sessionProfile: sessionProfile,
          file: {
            url: media.url,
            filename: media.filename,
            mimetype: media.mimetype
          }
        };

        if (isImage || isVideo) {
          params.caption = failedMessage.content || undefined;
        }

        if (isImage) {
          response = await sendImage(params);
        } else if (isVideo) {
          response = await sendVideo(params);
        } else if (isAudio) {
          response = await sendVoice(params);
        } else {
          response = await sendFile(params);
        }
      } else {
        response = await sendText({
          phone: selectedContact.phone,
          text: failedMessage.content,
          sessionName: selectedChatSession.session_name,
          contactId: selectedContact.isVirtual ? null : selectedContact.id,
          sessionProfile: sessionProfile
        });
      }

      if (response.data?.success) {
        setChatMessages(prev => prev.map(msg => 
          msg.id === tempId ? { ...msg, status: 'success' } : msg
        ));
        
        loadContacts();
        
        setMessage("✓ Mensagem reenviada com sucesso");
        setTimeout(() => setMessage(""), 3000);
      } else {
        setChatMessages(prev => prev.map(msg => 
          msg.id === tempId ? { 
            ...msg, 
            status: 'failed',
            error_details: response.data?.error || 'Erro ao enviar mensagem'
          } : msg
        ));
        setMessage(response.data?.error || 'Erro ao reenviar mensagem');
      }
    } catch (error) {
      console.error("Erro ao reenviar mensagem:", error);
      setChatMessages(prev => prev.map(msg => 
        msg.id === tempId ? { 
          ...msg, 
          status: 'failed',
          error_details: error.message || 'Erro ao enviar mensagem'
        } : msg
      ));
      setMessage(error.message || 'Erro ao reenviar mensagem. Tente novamente.');
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const handleSelectContactFromModal = (contact) => {
    setShowNewConversationModal(false);
    handleOpenChat(contact);
  };

  const scrollToBottomSmooth = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  const scrollToBottomInstant = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  const loadChatMessages = async (contact, sessionPhone = null) => {
    const filterPhone = sessionPhone || selectedChatSession?.phone;
    try {
      let messageList = [];
      
      if (contact.isVirtual && contact.phone) {
        const phoneNumber = contact.phone.replace(/\D/g, '');
        const isLid = phoneNumber.length > 15 || contact.isLid;
        
        const chatIds = [];
        
        if (contact.phone.includes('@')) {
          chatIds.push(contact.phone);
        } else {
          chatIds.push(`${phoneNumber}@lid`);
          chatIds.push(`${phoneNumber}@c.us`);
        }
        
        console.log('[Chat] Buscando mensagens para contato desconhecido:', {
          phone: contact.phone,
          phoneNumber: phoneNumber,
          isLid: isLid,
          chatIds: chatIds
        });
        
        const allMessages = [];
        for (const chatId of chatIds) {
          const filters = {
            company_id: user.company_id,
            chat_id: chatId
          };
          
          if (filterPhone) {
            filters.session_number = filterPhone;
          }
          
          const msgs = await Message.filter(filters, 'created_at');
          allMessages.push(...msgs);
        }
        
        messageList = Array.from(
          new Map(allMessages.map(msg => [msg.id, msg])).values()
        ).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        
        console.log('[Chat] Total de mensagens encontradas:', messageList.length);
      } else {
        const filters = {
          company_id: user.company_id,
          contact_id: contact.id
        };
        
        if (filterPhone) {
          filters.session_number = filterPhone;
        }

        messageList = await Message.filter(filters, 'created_at');
      }

      const enrichedMessages = messageList.map((message) => {
        let sessionData = null;

        if (message.session_name && sessionProfiles[message.session_name]) {
          sessionData = {
            avatar_url: sessionProfiles[message.session_name].picture,
            phone: sessionProfiles[message.session_name].phone,
            name: sessionProfiles[message.session_name].name
          };
        }

        return {
          ...message,
          sessionData
        };
      });

      setChatMessages(enrichedMessages);
      
      setTimeout(scrollToBottomInstant, 100);
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error);
      setChatMessages([]);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedContact || !selectedChatSession) return;
    if (!messageText.trim() && !pendingAttachment) return;

    const tempId = `temp-${Date.now()}`;
    const sessionData = {
      avatar_url: sessionProfiles[selectedChatSession.session_name]?.picture,
      phone: selectedChatSession.phone,
      name: sessionProfiles[selectedChatSession.session_name]?.name || selectedChatSession.phone
    };

    setIsSending(true);
    const currentMessageText = messageText;
    const currentAttachment = pendingAttachment;
    setMessageText("");
    setPendingAttachment(null);

    let fileUrl = null;
    let fileData = null;

    if (currentAttachment) {
      setUploadingFile(true);
      try {
        const uploadResponse = await UploadFile({ file: currentAttachment.file });
        fileUrl = uploadResponse.file_url || uploadResponse.data?.file_url;
        
        if (!fileUrl) {
          throw new Error('Erro ao fazer upload do arquivo');
        }

        fileData = {
          url: fileUrl,
          filename: currentAttachment.file.name,
          mimetype: currentAttachment.file.type
        };
      } catch (uploadError) {
        console.error("Erro no upload:", uploadError);
        setIsSending(false);
        setUploadingFile(false);
        setMessage("❌ Erro ao fazer upload do arquivo");
        setTimeout(() => setMessage(""), 3000);
        return;
      } finally {
        setUploadingFile(false);
      }
    }

    const optimisticMessage = {
      id: tempId,
      content: currentMessageText,
      direction: 'sent',
      status: 'pending',
      created_at: Date.now(),
      contact_id: selectedContact.id,
      session_name: selectedChatSession.session_name,
      session_number: selectedChatSession.phone,
      sessionData: sessionData,
      metadata: fileData ? {
        type: currentAttachment.type,
        file: fileData
      } : null
    };

    setChatMessages(prev => [...prev, optimisticMessage]);

    try {
      const sessionProfile = {
        name: sessionProfiles[selectedChatSession.session_name]?.name || selectedChatSession.phone || selectedChatSession.session_name,
        phone: selectedChatSession.phone,
        picture: sessionProfiles[selectedChatSession.session_name]?.picture
      };

      let response;

      if (currentAttachment && fileData) {

        const params = {
          phone: selectedContact.phone,
          sessionName: selectedChatSession.session_name,
          contactId: selectedContact.isVirtual ? null : selectedContact.id,
          sessionProfile: sessionProfile,
          file: fileData
        };

        if (currentAttachment.type === 'image' || currentAttachment.type === 'video') {
          params.caption = currentMessageText.trim() || undefined;
        }

        switch (currentAttachment.type) {
          case 'image':
            response = await sendImage(params);
            break;
          case 'video':
            response = await sendVideo(params);
            break;
          case 'voice':
            response = await sendVoice(params);
            break;
          default:
            response = await sendFile(params);
        }
      } else {
        response = await sendText({
          phone: selectedContact.phone,
          text: currentMessageText,
          sessionName: selectedChatSession.session_name,
          contactId: selectedContact.isVirtual ? null : selectedContact.id,
          sessionProfile: sessionProfile
        });
      }

      if (response.data?.success) {
        setChatMessages(prev => prev.map(msg => 
          msg.id === tempId ? { ...msg, status: 'success' } : msg
        ));
        
        loadContacts();
      } else {
        setChatMessages(prev => prev.map(msg => 
          msg.id === tempId ? { 
            ...msg, 
            status: 'failed',
            error_details: response.data?.error || 'Erro ao enviar mensagem'
          } : msg
        ));
        const errorMessage = response.data?.error || 'Erro ao enviar mensagem';
        setMessage(errorMessage);
      }
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      setChatMessages(prev => prev.map(msg => 
        msg.id === tempId ? { 
          ...msg, 
          status: 'failed',
          error_details: error.message || 'Erro ao enviar mensagem'
        } : msg
      ));
      setMessage(error.message || 'Erro ao enviar mensagem. Tente novamente.');
    } finally {
      setIsSending(false);
    }
  };

  const handleFileSelect = (file, type) => {
    if (!file) return;
    
    setPendingAttachment({ file, type });
    setShowAttachMenu(false);
    
    if (type === 'voice' || type === 'file') {
      setMessageText("");
    }
  };

  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          handleFileSelect(file, 'image');
          setMessage("✓ Imagem colada");
          setTimeout(() => setMessage(""), 2000);
        }
        break;
      }
    }
  };

  const handleDownloadMedia = async (message) => {
    const messageId = message.id || message.scheduler_job_id;
    setDownloadingMediaIds(prev => new Set(prev).add(messageId));
    
    try {
      console.log('[Chat] Baixando mídia:', messageId);
      
      const response = await base44.functions.invoke('downloadAndSaveMedia', {
        message_id: message.id,
        session_name: message.session_name
      });

      if (response.data?.success) {
        setMessage(`✓ Mídia baixada com sucesso!`);
        
        setDownloadedMediaIds(prev => new Set(prev).add(messageId));
        
        setChatMessages(prev => prev.map(msg => {
          if ((msg.id || msg.scheduler_job_id) === messageId) {
            return {
              ...msg,
              media_url: response.data.media_url,
              mimetype: response.data.mimetype,
              filename: response.data.filename,
              metadata: {
                ...msg.metadata,
                media_downloaded: true
              }
            };
          }
          return msg;
        }));
        
        setTimeout(() => setMessage(""), 3000);
      } else {
        throw new Error(response.data?.error || 'Erro ao baixar mídia');
      }
    } catch (error) {
      console.error('[Chat] Erro ao baixar mídia:', error);
      setMessage(`❌ Erro ao baixar mídia: ${error.message}`);
      setTimeout(() => setMessage(""), 5000);
    } finally {
      setDownloadingMediaIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(messageId);
        return newSet;
      });
    }
  };

  const handleSyncWhatsAppMessages = async () => {
    if (!selectedContact || !selectedChatSession) {
      setMessage("⚠️ Selecione uma sessão para sincronizar");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    setIsSyncingMessages(true);
    setChatMessages([]);
    
    try {
      const chatId = selectedContact.phone?.includes('@') 
        ? selectedContact.phone 
        : `${selectedContact.phone}@c.us`;

      console.log('[Chat] Sincronizando mensagens:', {
        session_name: selectedChatSession.session_name,
        chat_id: chatId
      });

      const response = await base44.functions.invoke('syncWhatsAppMessages', {
        session_name: selectedChatSession.session_name,
        chat_id: chatId,
        limit: 50
      });

      if (response.data?.success) {
        const { new_messages, duplicates, errors } = response.data.data;
        
        if (new_messages > 0) {
          setMessage(`✓ ${new_messages} mensagens sincronizadas com sucesso!`);
        } else if (duplicates > 0) {
          setMessage(`✓ Chat já sincronizado (${duplicates} mensagens)`);
        } else {
          setMessage("✓ Nenhuma mensagem nova encontrada");
        }
        
        await loadChatMessages(selectedContact, selectedChatSession.phone);
        await loadContacts();

        if (errors > 0) {
          console.warn(`[Chat] ${errors} erros durante sincronização`);
        }
      } else {
        throw new Error(response.data?.error || 'Erro ao sincronizar');
      }
    } catch (error) {
      console.error('[Chat] Erro ao sincronizar mensagens:', error);
      setMessage(`❌ Erro ao sincronizar: ${error.message}`);
      await loadChatMessages(selectedContact, selectedChatSession.phone);
    } finally {
      setIsSyncingMessages(false);
      setTimeout(() => setMessage(""), 5000);
    }
  };

  useEffect(() => {
    if (user?.company_id) {
      loadContacts(user.company_id);
    }
  }, [selectedSessionFilter]);

  const filteredContacts = contacts.filter(contact => {
    const chatId = contact.phone?.includes('@') ? contact.phone : `${contact.phone}@c.us`;
    const isHidden = hiddenConversations.includes(chatId);
    const isDeleted = deletedConversations.includes(chatId);

    // Se é a aba "deleted" (só para admins), mostrar apenas as excluídas
    if (activeTab === 'deleted') {
      if (!isDeleted) return false;
      const matchesSearch = !searchTerm ||
        `${contact.first_name} ${contact.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.phone?.includes(searchTerm);
      return matchesSearch;
    }

    // Excluir conversas marcadas para deletar (não aparecem em outras abas)
    if (isDeleted) return false;

    const matchesSearch = !searchTerm ||
      `${contact.first_name} ${contact.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.phone?.includes(searchTerm);

    const matchesTab = 
      (activeTab === 'all' && !isHidden) ||
      (activeTab === 'sent' && contact.sentCount > 0 && !isHidden) ||
      (activeTab === 'received' && contact.hasUnread && !isHidden) ||
      (activeTab === 'hidden' && isHidden);

    const matchesResponsible = selectedResponsibleFilter === 'all' || contact.responsible_name === selectedResponsibleFilter;

    return matchesSearch && matchesTab && matchesResponsible;
  });


  const getUnreadCount = (contact) => {
    // Contar mensagens não lidas para este contato
    const chatId = contact.phone?.includes('@') ? contact.phone : `${contact.phone}@c.us`;
    const readMapRaw = localStorage.getItem('chatReadMap') || '{}';
    let readMapObj = {};
    try { readMapObj = JSON.parse(readMapRaw); } catch {}
    
    const lastReadAt = readMapObj[contact.id];
    
    // Se não tem lastReadAt, todas as mensagens recebidas são não lidas
    if (!lastReadAt) {
      return contact.receivedCount || 0;
    }
    
    // Contar quantas mensagens recebidas são mais recentes que lastReadAt
    // Aproximação: se hasUnread = true, então há pelo menos 1 não lida
    // Para contagem precisa, seria necessário consultar o banco
    return contact.hasUnread ? Math.min(contact.receivedCount || 1, 9) : 0;
  };

  const renderContactCard = (contact) => {
    const unreadCount = getUnreadCount(contact);
    const showUnread = contact.hasUnread && unreadCount > 0;
    
    return (
      <Card 
        key={contact.id} 
        className={`rounded-3xl border-2 hover:shadow-md transition-all cursor-pointer overflow-hidden relative ${
          showUnread 
            ? 'border-green-500 shadow-green-500/20' 
            : 'border-gray-200'
        }`}
        onClick={() => handleOpenChat(contact)}
      >
        <CardContent className="p-4 sm:p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="relative flex-shrink-0">
            <SafeAvatar 
              contact={contact}
              className="w-12 h-12"
            />
            {showUnread && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 border-2 border-white rounded-full flex items-center justify-center">
                <span className="text-white text-[10px] font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-semibold text-gray-900 truncate text-sm sm:text-base">
                <AnimatedContactName 
                  name={`${contact.first_name} ${contact.last_name}`}
                  nickname={contact.nickname}
                />
              </h3>
                {contact.isVirtual && (
                  <Badge variant="outline" className="text-xs flex-shrink-0">
                    Não salvo
                  </Badge>
                )}
                {contact.isLid && (
                  <Badge className="text-xs bg-amber-100 text-amber-800 flex-shrink-0">
                    LID
                  </Badge>
                )}
                {!contact.isVirtual && contact.responsible_name && (
                  <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs px-2 py-0.5 font-medium flex-shrink-0">
                    <UserCheck className="w-3 h-3 mr-1" />
                    {contact.responsible_name}
                  </Badge>
                )}
              </div>
              {contact.phone && (
                <p className="text-xs sm:text-sm text-gray-600 flex items-center gap-1 truncate">
                  <Phone className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">
                    {contact.isLid ? contact.phone : formatPhone(contact.phone)}
                  </span>
                </p>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              {contact.isVirtual ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => handleAddUnknownContact(e, contact)}
                  className="flex-shrink-0 h-8 w-8 rounded-xl hover:bg-blue-50"
                >
                  <UserPlus className="w-4 h-4 text-blue-600" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAssignResponsible(contact);
                  }}
                  className="flex-shrink-0 h-8 w-8 rounded-xl hover:bg-indigo-50"
                >
                  <UserCheck className="w-4 h-4 text-indigo-600" />
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0 h-8 w-8 rounded-xl hover:bg-gray-100"
                  >
                    <MoreVertical className="w-4 h-4 text-gray-600" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl">
                  {activeTab !== 'hidden' ? (
                    <DropdownMenuItem onClick={(e) => handleHideConversation(contact, e)} className="rounded-lg">
                      <EyeOff className="w-4 h-4 mr-2" />
                      Ocultar conversa
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={(e) => handleUnhideConversation(contact, e)} className="rounded-lg">
                      <Eye className="w-4 h-4 mr-2" />
                      Reexibir conversa
                    </DropdownMenuItem>
                  )}
                  {user?.system_role === 'admin' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={(e) => handleDeleteConversation(contact, e)} 
                        className="rounded-lg text-red-600 focus:text-red-600 focus:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir permanentemente
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="space-y-3">
            {contact.lastMessage && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-600 mb-1">
                  {contact.lastMessageDirection === 'sent' ? 'Você enviou:' : 'Recebeu:'}
                </p>
                <p className="text-sm text-gray-900 truncate flex items-center gap-1.5">
                  {contact.lastMessage.includes('[Mídia: image') && <Image className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />}
                  {contact.lastMessage.includes('[Mídia: video') && <PlayCircle className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />}
                  {contact.lastMessage.includes('[Mídia: audio') && <Mic className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />}
                  {contact.lastMessage.includes('[Mídia: voice') && <Mic className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />}
                  {contact.lastMessage.includes('[Mídia: ptt') && <Mic className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />}
                  {contact.lastMessage.includes('[Mídia: document') && <FileText className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />}
                  {contact.lastMessage.includes('[Mídia: file') && <FileText className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />}
                  {contact.lastMessage.includes('[Mídia: arquivo') && <FileText className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />}
                  <span className={contact.lastMessage.startsWith('[Mídia:') ? 'italic' : ''}>
                    {contact.lastMessage}
                  </span>
                </p>
              </div>
            )}

            {contact.lastMessageTime && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 text-xs sm:text-sm">
                <span className="text-gray-600 flex items-center gap-1 flex-shrink-0">
                  <Calendar className="w-3 h-3" />
                  Última mensagem:
                </span>
                <span className="text-gray-900 font-medium truncate">
                  {format(new Date(contact.lastMessageTime), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
            )}

            <div className="pt-3 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-600 mb-2">Mensagens</p>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1 text-gray-600">
                    <ArrowUpCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="text-xs sm:text-sm">Enviadas</span>
                  </div>
                  <span className="text-base sm:text-lg font-bold text-gray-900">
                    {contact.sentCount || 0}
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1 text-gray-600">
                    <ArrowDownCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="text-xs sm:text-sm">Recebidas</span>
                  </div>
                  <span className="text-base sm:text-lg font-bold text-gray-900">
                    {contact.receivedCount || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderContactList = (contact) => {
    const unreadCount = getUnreadCount(contact);
    const showUnread = contact.hasUnread && unreadCount > 0;
    
    return (
      <Card 
        key={contact.id} 
        className={`rounded-2xl border-2 hover:shadow-md transition-all cursor-pointer overflow-hidden relative ${
          showUnread 
            ? 'border-green-500 shadow-green-500/20' 
            : 'border-gray-200'
        }`}
        onClick={() => handleOpenChat(contact)}
      >
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <SafeAvatar 
                contact={contact}
                className="w-10 h-10 sm:w-12 sm:h-12"
              />
              {showUnread && (
                <div className="absolute -top-2 -right-2 w-5 h-5 sm:w-6 sm:h-6 bg-green-500 border-2 border-white rounded-full flex items-center justify-center">
                  <span className="text-white text-[10px] font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="font-semibold text-gray-900 truncate text-sm sm:text-base">
                  <AnimatedContactName 
                    name={`${contact.first_name} ${contact.last_name}`}
                    nickname={contact.nickname}
                  />
                </h3>
                {contact.isVirtual && (
                  <Badge variant="outline" className="text-xs flex-shrink-0">
                    Não salvo
                  </Badge>
                )}
                {contact.isLid && (
                  <Badge className="text-xs bg-amber-100 text-amber-800 flex-shrink-0">
                    LID
                  </Badge>
                )}
                {!contact.isVirtual && contact.responsible_name && (
                  <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs px-2 py-0.5 font-medium flex-shrink-0">
                    <UserCheck className="w-3 h-3 mr-1" />
                    {contact.responsible_name}
                  </Badge>
                )}
              </div>
              {contact.phone && (
                <p className="text-xs sm:text-sm text-gray-600 flex items-center gap-1 truncate">
                  <Phone className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">
                    {contact.isLid ? contact.phone : formatPhone(contact.phone)}
                  </span>
                </p>
              )}
              {contact.lastMessage && (
                <p className="text-xs text-gray-500 truncate mt-1 flex items-center gap-1">
                  {contact.lastMessage.includes('[Mídia: image') && <Image className="w-3 h-3 text-gray-400 flex-shrink-0" />}
                  {contact.lastMessage.includes('[Mídia: video') && <PlayCircle className="w-3 h-3 text-gray-400 flex-shrink-0" />}
                  {contact.lastMessage.includes('[Mídia: audio') && <Mic className="w-3 h-3 text-gray-400 flex-shrink-0" />}
                  {contact.lastMessage.includes('[Mídia: voice') && <Mic className="w-3 h-3 text-gray-400 flex-shrink-0" />}
                  {contact.lastMessage.includes('[Mídia: ptt') && <Mic className="w-3 h-3 text-gray-400 flex-shrink-0" />}
                  {contact.lastMessage.includes('[Mídia: document') && <FileText className="w-3 h-3 text-gray-400 flex-shrink-0" />}
                  {contact.lastMessage.includes('[Mídia: file') && <FileText className="w-3 h-3 text-gray-400 flex-shrink-0" />}
                  {contact.lastMessage.includes('[Mídia: arquivo') && <FileText className="w-3 h-3 text-gray-400 flex-shrink-0" />}
                  <span className={contact.lastMessage.startsWith('[Mídia:') ? 'italic' : ''}>
                    {contact.lastMessageDirection === 'sent' ? 'Você: ' : ''}{contact.lastMessage}
                  </span>
                </p>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              {contact.isVirtual ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => handleAddUnknownContact(e, contact)}
                  className="flex-shrink-0 h-8 w-8 rounded-xl hover:bg-blue-50"
                >
                  <UserPlus className="w-4 h-4 text-blue-600" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAssignResponsible(contact);
                  }}
                  className="flex-shrink-0 h-8 w-8 rounded-xl hover:bg-indigo-50"
                >
                  <UserCheck className="w-4 h-4 text-indigo-600" />
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0 h-8 w-8 rounded-xl hover:bg-gray-100"
                  >
                    <MoreVertical className="w-4 h-4 text-gray-600" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl">
                  {activeTab !== 'hidden' ? (
                    <DropdownMenuItem onClick={(e) => handleHideConversation(contact, e)} className="rounded-lg">
                      <EyeOff className="w-4 h-4 mr-2" />
                      Ocultar conversa
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={(e) => handleUnhideConversation(contact, e)} className="rounded-lg">
                      <Eye className="w-4 h-4 mr-2" />
                      Reexibir conversa
                    </DropdownMenuItem>
                  )}
                  {user?.system_role === 'admin' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={(e) => handleDeleteConversation(contact, e)} 
                        className="rounded-lg text-red-600 focus:text-red-600 focus:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir permanentemente
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="hidden sm:flex items-center gap-4 flex-shrink-0">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-gray-600">
                    <ArrowUpCircle className="w-3 h-3" />
                    <span className="text-xs">Env:</span>
                    <span className="font-medium text-gray-900">{contact.sentCount || 0}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-600">
                    <ArrowDownCircle className="w-3 h-3" />
                    <span className="text-xs">Rec:</span>
                    <span className="font-medium text-gray-900">{contact.receivedCount || 0}</span>
                  </div>
                </div>
              </div>

              {contact.lastMessageTime && (
                <div className="text-xs sm:text-sm text-gray-600 flex items-center gap-1">
                  <Calendar className="w-3 h-3 flex-shrink-0" />
                  <span className="whitespace-nowrap">
                    {format(new Date(contact.lastMessageTime), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="sm:hidden mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-gray-600">
                <ArrowUpCircle className="w-3 h-3" />
                <span>Env: <span className="font-medium text-gray-900">{contact.sentCount || 0}</span></span>
              </div>
              <div className="flex items-center gap-1 text-gray-600">
                <ArrowDownCircle className="w-3 h-3" />
                <span>Rec: <span className="font-medium text-gray-900">{contact.receivedCount || 0}</span></span>
              </div>
            </div>
            {contact.lastMessageTime && (
              <div className="text-gray-600 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{format(new Date(contact.lastMessageTime), "dd/MM HH:mm", { locale: ptBR })}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto overflow-hidden">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690a8ae384e85f405dd1958f/8d6af0619_ChatGPTImage24denovde202519_02_27.png"
              alt="Sparta Sync"
              className="w-16 h-16 object-contain"
              onError={(e) => {
                console.error('Logo failed to load on Chat page');
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
    <div className="space-y-6">
      {selectedContact ? (
        <div className="overflow-x-hidden">
          <div className="flex flex-col gap-3 mb-4 md:mb-6">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setSelectedContact(null);
                  setChatMessages([]);
                  setSelectedChatSession(null);
                }}
                className="rounded-xl flex-shrink-0"
              >
                <XIcon className="w-5 h-5" />
              </Button>
              <SafeAvatar 
                contact={selectedContact}
                className="w-10 h-10 flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg md:text-2xl font-bold text-gray-900 truncate">
                    <AnimatedContactName 
                      name={`${selectedContact.first_name} ${selectedContact.last_name}`}
                      nickname={selectedContact.nickname}
                      className="text-lg md:text-2xl"
                    />
                  </h1>
                  {selectedContact.isVirtual && (
                    <Badge variant="outline" className="text-xs flex-shrink-0">
                      Não salvo
                    </Badge>
                  )}
                  {selectedContact.isLid && (
                    <Badge className="text-xs bg-amber-100 text-amber-800 flex-shrink-0">
                      LID
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600 truncate">
                  {selectedContact.isLid ? selectedContact.phone : formatPhone(selectedContact.phone)}
                </p>
              </div>

              {selectedContact.isVirtual && (
                <Button
                  onClick={(e) => handleAddUnknownContact(e, selectedContact)}
                  className="hidden md:flex bg-blue-600 hover:bg-blue-700 rounded-xl gap-2 flex-shrink-0"
                >
                  <UserPlus className="w-4 h-4" />
                  Adicionar
                </Button>
              )}

              <div className="hidden md:flex items-center gap-2 flex-shrink-0">
                <Select 
                  value={selectedChatSession?.id || "none"} 
                  onValueChange={(value) => {
                    if (value === "none") {
                      setSelectedChatSession(null);
                      loadChatMessages(selectedContact, null);
                    } else {
                      const session = sessions.find(s => s.id === value);
                      setSelectedChatSession(session);
                      loadChatMessages(selectedContact, session.phone);
                    }
                  }}
                >
                  <SelectTrigger className="w-64 rounded-xl">
                    <SelectValue placeholder="Selecione uma sessão" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="none">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Todas as Sessões
                      </div>
                    </SelectItem>
                    {sessions.map((session) => (
                     <SelectItem key={session.id} value={session.id}>
                       <div className="flex items-center gap-2">
                         <Avatar className="w-5 h-5">
                           <AvatarImage src={session.avatar_url} />
                           <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-500 text-white text-xs">
                             <Smartphone className="w-3 h-3" />
                           </AvatarFallback>
                         </Avatar>
                         {session.custom_name || session.phone || session.session_name}
                       </div>
                     </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedContact.isVirtual && (
              <Button
                onClick={(e) => handleAddUnknownContact(e, selectedContact)}
                className="md:hidden w-full bg-blue-600 hover:bg-blue-700 rounded-xl gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Adicionar Contato
              </Button>
            )}

            <div className="md:hidden w-full">
              <Select 
                value={selectedChatSession?.id || "none"} 
                onValueChange={(value) => {
                  if (value === "none") {
                    setSelectedChatSession(null);
                    loadChatMessages(selectedContact, null);
                  } else {
                    const session = sessions.find(s => s.id === value);
                    setSelectedChatSession(session);
                    loadChatMessages(selectedContact, session.phone);
                  }
                }}
              >
                <SelectTrigger className="w-full rounded-xl">
                  <SelectValue placeholder="Selecione uma sessão" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="none">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Todas as Sessões
                    </div>
                  </SelectItem>
                  {sessions.map((session) => (
                    <SelectItem key={session.id} value={session.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={session.avatar_url} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-500 text-white text-xs">
                            <Smartphone className="w-3 h-3" />
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{session.custom_name || session.phone || session.session_name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-gradient-to-b from-gray-50 to-white rounded-3xl border border-gray-200 overflow-hidden flex flex-col shadow-sm" style={{ height: 'calc(100vh - 240px)' }}>
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-3" style={{ scrollBehavior: 'smooth' }}>
              {isSyncingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : chatMessages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageSquare className="w-16 h-16 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500">Nenhuma mensagem ainda</p>
                    <p className="text-sm text-gray-400 mt-1">Envie a primeira mensagem para iniciar a conversa</p>
                  </div>
                </div>
              ) : (
                chatMessages.map((msg) => {
                  // Detectar tipo de mídia - verificar múltiplas fontes
                  const mediaType = msg.metadata?.message_type || msg.metadata?.content_type || msg.metadata?.type || msg.metadata?.media_type_normalized;
                  const mimetype = msg.mimetype || msg.metadata?.mimetype || msg.metadata?.file?.mimetype || '';
                  const hasMedia = msg.media_url || msg.metadata?.file?.url || msg.metadata?.hasMedia || msg.metadata?.directPath || msg.metadata?.mediaKey;
                  const mediaUrl = msg.media_url || msg.metadata?.file?.url;
                  const isMediaDownloaded = msg.metadata?.media_downloaded || (mediaUrl && !mediaUrl.includes('mmg.whatsapp.net') && mediaUrl.includes('supabase'));
                  const wasJustDownloaded = downloadedMediaIds.has(msg.id || msg.scheduler_job_id);
                  
                  // Detectar tipos com base em múltiplos indicadores - ordem importa!
                  const isImage = mediaType === 'image' || mimetype.startsWith('image/') || msg.content?.includes('[Mídia: image');
                  const isVideo = mediaType === 'video' || mimetype.startsWith('video/') || msg.content?.includes('[Mídia: video');
                  const isAudio = mediaType === 'audio' || mediaType === 'voice' || mediaType === 'ptt' || mediaType === 'voicenote' || mimetype.startsWith('audio/') || msg.content?.includes('[Mídia: audio') || msg.content?.includes('[Mídia: voice') || msg.content?.includes('[Mídia: ptt');
                  // Documento é apenas se não for nenhum dos outros tipos
                  const isDocument = hasMedia && !isImage && !isVideo && !isAudio;
                  
                  // Determinar label e cores do tipo
                  const getMediaLabel = () => {
                    if (isImage) return 'Imagem';
                    if (isVideo) return 'Vídeo';
                    if (isAudio) return 'Áudio';
                    return 'Arquivo';
                  };
                  const getMediaButtonLabel = () => {
                    if (isImage) return 'Baixar Imagem';
                    if (isVideo) return 'Baixar Vídeo';
                    if (isAudio) return 'Baixar Áudio';
                    return 'Baixar Arquivo';
                  };
                  const getMediaColors = () => {
                    if (isImage) return { bg: 'bg-blue-100', icon: 'text-blue-600', border: 'border-blue-300', text: 'text-blue-700', hover: 'hover:bg-blue-50' };
                    if (isVideo) return { bg: 'bg-purple-100', icon: 'text-purple-600', border: 'border-purple-300', text: 'text-purple-700', hover: 'hover:bg-purple-50' };
                    if (isAudio) return { bg: 'bg-orange-100', icon: 'text-orange-600', border: 'border-orange-300', text: 'text-orange-700', hover: 'hover:bg-orange-50' };
                    return { bg: 'bg-green-100', icon: 'text-green-600', border: 'border-green-300', text: 'text-green-700', hover: 'hover:bg-green-50' };
                  };
                  const getMediaIcon = () => {
                    if (isImage) return <Image className={`w-6 h-6 ${getMediaColors().icon}`} />;
                    if (isVideo) return <PlayCircle className={`w-6 h-6 ${getMediaColors().icon}`} />;
                    if (isAudio) return <Volume2 className={`w-6 h-6 ${getMediaColors().icon}`} />;
                    return <File className={`w-6 h-6 ${getMediaColors().icon}`} />;
                  };
                  
                  const messageId = msg.id || msg.scheduler_job_id;
                  const isDownloading = downloadingMediaIds.has(messageId);
                  
                  // Detectar URLs no conteúdo da mensagem
                  const urlRegex = /(https?:\/\/[^\s]+)/g;
                  const hasUrl = msg.content && urlRegex.test(msg.content);

                  return (
                  <div
                    key={messageId}
                    className={`flex items-end gap-2 ${msg.direction === 'sent' ? 'justify-end' : 'justify-start'} relative group`}
                  >
                    {msg.direction === 'received' && (
                      <SafeAvatar 
                        contact={selectedContact}
                        className="w-8 h-8 flex-shrink-0"
                        fallbackClassName="bg-gradient-to-br from-gray-400 to-gray-500 text-white text-xs"
                      />
                    )}

                    {msg.direction === 'sent' && msg.status === 'failed' && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRetryMessage(msg)}
                              className="h-8 w-8 rounded-full hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                            >
                              <RotateCcw className="w-4 h-4 text-red-600" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="rounded-lg">
                            <p>Enviar novamente</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}

                    <div className="flex flex-col items-end max-w-[70%]">
                      {msg.direction === 'sent' && !selectedChatSession && (
                        <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                          <Smartphone className="w-3 h-3" />
                          {msg.session_number || 'Número não identificado'}
                        </div>
                      )}
                      <div className={`${
                        msg.direction === 'sent'
                          ? 'bg-white text-gray-900 border-2 border-blue-500 rounded-3xl rounded-br-md shadow-sm'
                          : 'bg-white text-gray-900 border border-gray-200 rounded-3xl rounded-bl-md shadow-sm'
                      }`}>
                        {/* Conteúdo de mídia */}
                        {hasMedia && (
                          <div className="px-3 pt-3" style={{ minWidth: isAudio ? '280px' : 'auto' }}>
                            {/* Mídia já baixada - mostrar preview */}
                            {isMediaDownloaded && mediaUrl ? (
                              <motion.div 
                                className="mb-2"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3 }}
                              >
                                {isImage && (
                                  <img 
                                    src={mediaUrl} 
                                    alt="Imagem" 
                                    className="max-w-full rounded-xl max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => window.open(mediaUrl, '_blank')}
                                  />
                                )}
                                {isVideo && (
                                  <video 
                                    src={mediaUrl} 
                                    controls 
                                    className="max-w-full rounded-xl max-h-64"
                                  />
                                )}
                                {isAudio && (
                                  <div style={{ minWidth: '260px' }}>
                                    <AudioPlayer src={mediaUrl} />
                                  </div>
                                )}
                                {isDocument && (
                                  <a 
                                    href={mediaUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                                  >
                                    <FileText className="w-8 h-8 text-green-600" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-900 truncate">
                                        {msg.filename || msg.metadata?.file?.filename || 'Arquivo'}
                                      </p>
                                      <p className="text-xs text-gray-500">Clique para abrir</p>
                                    </div>
                                    <ExternalLink className="w-4 h-4 text-gray-400" />
                                  </a>
                                )}
                              </motion.div>
                            ) : isDownloading ? (
                              /* Animação de carregamento durante download */
                              <div className="mb-2 p-4 bg-gray-50 rounded-xl">
                                <div className="flex items-center gap-3">
                                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getMediaColors().bg}`}>
                                    <RefreshCw className={`w-6 h-6 ${getMediaColors().icon} animate-spin`} />
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">Baixando {getMediaLabel()}...</p>
                                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                                      <motion.div 
                                        className={`h-1.5 rounded-full ${getMediaColors().bg.replace('100', '500')}`}
                                        initial={{ width: '0%' }}
                                        animate={{ width: '100%' }}
                                        transition={{ duration: 3, ease: 'easeInOut' }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              /* Mídia não baixada - mostrar botão de download com tipo */
                              <div className="mb-2 p-3 bg-gray-50 rounded-xl">
                                <div className="flex items-center gap-3 mb-3">
                                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getMediaColors().bg}`}>
                                    {getMediaIcon()}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900">{getMediaLabel()}</p>
                                    <p className="text-xs text-gray-500">
                                      {msg.filename || msg.metadata?.file?.filename || 'Toque para baixar'}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  onClick={() => handleDownloadMedia(msg)}
                                  disabled={isDownloading}
                                  variant="outline"
                                  className={`w-full rounded-xl gap-2 ${getMediaColors().border} ${getMediaColors().text} ${getMediaColors().hover}`}
                                >
                                  <Download className="w-4 h-4" />
                                  <span>{getMediaButtonLabel()}</span>
                                </Button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Texto da mensagem ou legenda */}
                        {msg.content && !msg.content.startsWith('[Mídia:') && (
                          <div className="px-4 py-3">
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          </div>
                        )}

                        {/* Botão para acessar URL detectada */}
                        {hasUrl && !hasMedia && (
                          <div className="px-3 pb-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full rounded-xl gap-2"
                              onClick={() => {
                                const urls = msg.content.match(urlRegex);
                                if (urls && urls[0]) {
                                  window.open(urls[0], '_blank');
                                }
                              }}
                            >
                              <LinkIcon className="w-4 h-4 text-blue-600" />
                              Acessar Link
                            </Button>
                          </div>
                        )}

                        <div className={`flex items-center gap-2 justify-end px-4 pb-2 ${
                          msg.direction === 'sent' ? 'text-gray-500' : 'text-gray-500'
                        }`}>
                          <span className="text-xs">
                            {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                          </span>
                          {msg.direction === 'sent' && (
                            <div className="flex items-center">
                              {msg.status === 'success' && <CheckCheck className="w-3 h-3 text-green-600" />}
                              {msg.status === 'pending' && <Clock className="w-3 h-3 text-amber-600" />}
                              {msg.status === 'failed' && <XCircle className="w-3 h-3 text-red-600" />}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {msg.direction === 'sent' && (
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarImage src={msg.sessionData?.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-500 text-white text-xs">
                          <Smartphone className="w-4 h-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                  );
                })
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-white">
              {!selectedChatSession && (
                <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <p className="text-sm text-amber-700">Selecione uma sessão no topo para enviar mensagens</p>
                </div>
              )}

              {/* Preview de anexo pendente */}
              {pendingAttachment && (
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-3">
                  {pendingAttachment.type === 'image' && <Image className="w-5 h-5 text-blue-600" />}
                  {pendingAttachment.type === 'video' && <PlayCircle className="w-5 h-5 text-blue-600" />}
                  {pendingAttachment.type === 'voice' && <Mic className="w-5 h-5 text-blue-600" />}
                  {pendingAttachment.type === 'file' && <FileText className="w-5 h-5 text-blue-600" />}
                  <span className="text-sm text-blue-700 flex-1 truncate">{pendingAttachment.file.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPendingAttachment(null)}
                    className="h-6 w-6 rounded-full hover:bg-blue-100"
                  >
                    <XIcon className="w-4 h-4 text-blue-600" />
                  </Button>
                </div>
              )}

              {/* Gravação de áudio */}
              {isRecording && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3">
                  <div className="relative">
                    <div 
                      className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center animate-pulse"
                      style={{
                        transform: `scale(${1 + audioLevel * 0.3})`,
                        transition: 'transform 0.1s ease-out'
                      }}
                    >
                      <Mic className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-700">Gravando áudio...</p>
                    <p className="text-xs text-red-600">{Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={cancelRecording}
                    className="h-8 w-8 rounded-full hover:bg-red-100"
                  >
                    <XIcon className="w-4 h-4 text-red-600" />
                  </Button>
                  <Button
                    onClick={stopRecording}
                    className="bg-red-600 hover:bg-red-700 rounded-full h-10 px-4"
                  >
                    Parar
                  </Button>
                </div>
              )}

              {/* Preview de áudio gravado */}
              {audioBlob && !isRecording && (
                <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-2xl flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                    <Mic className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-700">Áudio gravado</p>
                    <p className="text-xs text-green-600">{Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={cancelRecording}
                    className="h-8 w-8 rounded-full hover:bg-green-100"
                  >
                    <XIcon className="w-4 h-4 text-green-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={continueRecording}
                    className="h-8 w-8 rounded-full hover:bg-green-100"
                  >
                    <Mic className="w-4 h-4 text-green-600" />
                  </Button>
                  <Button
                    onClick={sendRecordedAudio}
                    disabled={isSending}
                    className="bg-green-600 hover:bg-green-700 rounded-full h-10 px-4"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Enviar
                  </Button>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                {/* Botão de anexos */}
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowAttachMenu(!showAttachMenu)}
                    disabled={!selectedChatSession || isRecording}
                    className="h-10 w-10 rounded-full hover:bg-gray-100 flex-shrink-0"
                  >
                    <Paperclip className="w-5 h-5 text-gray-600" />
                  </Button>

                  {showAttachMenu && (
                    <div className="absolute bottom-12 left-0 bg-white border border-gray-200 rounded-2xl shadow-lg p-2 min-w-[160px] z-10">
                      <label className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-xl cursor-pointer">
                        <Image className="w-4 h-4 text-blue-600" />
                        <span className="text-sm">Imagem</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileSelect(e.target.files[0], 'image')}
                        />
                      </label>
                      <label className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-xl cursor-pointer">
                        <PlayCircle className="w-4 h-4 text-purple-600" />
                        <span className="text-sm">Vídeo</span>
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={(e) => handleFileSelect(e.target.files[0], 'video')}
                        />
                      </label>
                      <label className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-xl cursor-pointer">
                        <Mic className="w-4 h-4 text-orange-600" />
                        <span className="text-sm">Áudio</span>
                        <input
                          type="file"
                          accept="audio/*"
                          className="hidden"
                          onChange={(e) => handleFileSelect(e.target.files[0], 'voice')}
                        />
                      </label>
                      <label className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-xl cursor-pointer">
                        <FileText className="w-4 h-4 text-green-600" />
                        <span className="text-sm">Arquivo</span>
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => handleFileSelect(e.target.files[0], 'file')}
                        />
                      </label>
                    </div>
                  )}
                </div>

                <Textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onPaste={handlePaste}
                  placeholder="Digite uma mensagem..."
                  className="flex-1 rounded-2xl border-gray-300 px-4 md:px-5 py-3 focus:border-blue-500 focus:ring-blue-500 resize-none min-h-[48px] max-h-[120px] text-sm md:text-base scrollbar-hide overflow-y-auto"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  disabled={!selectedChatSession || isRecording}
                />

                {/* Botão de enviar ou gravar áudio */}
                {messageText.trim() || pendingAttachment ? (
                  <Button
                    onClick={handleSendMessage}
                    disabled={isSending || !selectedChatSession}
                    size="icon"
                    className="bg-blue-600 hover:bg-blue-700 rounded-full h-12 w-12 shadow-md hover:shadow-lg transition-all flex-shrink-0"
                  >
                    {isSending ? (
                      <RefreshCw className="w-5 h-5 text-white animate-spin" />
                    ) : (
                      <Send className="w-5 h-5 text-white" />
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={!selectedChatSession || audioBlob}
                    size="icon"
                    className={`rounded-full h-12 w-12 shadow-md hover:shadow-lg transition-all flex-shrink-0 ${
                      isRecording 
                        ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    <Mic className="w-5 h-5 text-white" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Conversas</h1>
                <p className="text-gray-600">
                  Histórico de mensagens enviadas aos contatos
                </p>
              </div>
            </div>
          </div>

          {message && (
            <Alert className={`rounded-2xl ${message.includes('Erro') ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
              {message.includes('Erro') ? (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              )}
              <AlertDescription className={message.includes('Erro') ? 'text-red-800' : 'text-green-800'}>
                {message}
              </AlertDescription>
            </Alert>
          )}

          <div className="mt-4 flex flex-col gap-4">
            <div className="hidden md:flex gap-2 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar por nome ou telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 rounded-xl"
                />
              </div>

              <Select value={selectedSessionFilter} onValueChange={setSelectedSessionFilter}>
                <SelectTrigger className="w-48 rounded-xl">
                  <SelectValue placeholder="Todas as sessões" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4" />
                      Todas as sessões
                    </div>
                  </SelectItem>
                  {sessions.map((session) => (
                    <SelectItem key={session.id} value={session.session_name}>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={session.avatar_url} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-500 text-white text-xs">
                            <Smartphone className="w-3 h-3" />
                          </AvatarFallback>
                        </Avatar>
                        {session.custom_name || session.phone || session.session_name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedResponsibleFilter} onValueChange={setSelectedResponsibleFilter}>
                <SelectTrigger className="w-48 rounded-xl">
                  <SelectValue placeholder="Todos responsáveis" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4" />
                      Todos responsáveis
                    </div>
                  </SelectItem>
                  {responsibleNames.map((responsibleName) => (
                    <SelectItem key={responsibleName} value={responsibleName}>
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4" />
                        {responsibleName}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex gap-1 border rounded-xl p-1">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('grid')}
                  className="h-8 w-8"
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('list')}
                  className="h-8 w-8"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>

              {/* Botão de ver excluídas - apenas para admin */}
              {user?.system_role === 'admin' && (
                <Button
                  variant={activeTab === 'deleted' ? 'secondary' : 'outline'}
                  onClick={() => setActiveTab(activeTab === 'deleted' ? 'all' : 'deleted')}
                  className="rounded-xl gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluídas ({contacts.filter(c => {
                    const chatId = c.phone?.includes('@') ? c.phone : `${c.phone}@c.us`;
                    return deletedConversations.includes(chatId);
                  }).length})
                </Button>
              )}

              <Button
                variant="outline"
                onClick={handleSync}
                disabled={isSyncing}
                className="rounded-xl"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-5 md:mt-7">
            <TabsList className="rounded-2xl bg-gray-100 p-1">
              <TabsTrigger value="all" className="rounded-xl">
                Todas ({contacts.filter(c => {
                  const chatId = c.phone?.includes('@') ? c.phone : `${c.phone}@c.us`;
                  return !hiddenConversations.includes(chatId);
                }).length})
              </TabsTrigger>
              <TabsTrigger value="sent" className="rounded-xl">
                Enviadas ({contacts.filter(c => {
                  const chatId = c.phone?.includes('@') ? c.phone : `${c.phone}@c.us`;
                  return c.sentCount > 0 && !hiddenConversations.includes(chatId);
                }).length})
              </TabsTrigger>
              <TabsTrigger value="received" className="rounded-xl">
                Não Lidas ({contacts.filter(c => {
                  const chatId = c.phone?.includes('@') ? c.phone : `${c.phone}@c.us`;
                  return c.hasUnread && !hiddenConversations.includes(chatId);
                }).length})
              </TabsTrigger>
              <TabsTrigger value="hidden" className="rounded-xl">
                Ocultas ({contacts.filter(c => {
                  const chatId = c.phone?.includes('@') ? c.phone : `${c.phone}@c.us`;
                  return hiddenConversations.includes(chatId) && !deletedConversations.includes(chatId);
                }).length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              {filteredContacts.length === 0 ? (
                <Card className="rounded-3xl border-dashed border-2 border-gray-200">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <MessageSquare className="w-16 h-16 text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Nenhuma mensagem encontrada
                    </h3>
                    <p className="text-gray-600 mb-6">
                      {searchTerm ? 'Tente ajustar os filtros de busca' : 'Envie mensagens para seus contatos para começar'}
                    </p>
                  </CardContent>
                </Card>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredContacts.map(renderContactCard)}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredContacts.map(renderContactList)}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
      
      <ContactFormModal
        open={showContactFormModal}
        onClose={() => {
          setShowContactFormModal(false);
          setPrefilledContactData(null);
        }}
        onSubmit={handleContactCreated}
        contact={null}
        initialData={prefilledContactData}
      />

      <QuickAssignResponsibleModal
        open={showQuickAssignResponsible}
        onClose={() => {
          setShowQuickAssignResponsible(false);
          setAssignResponsibleContact(null);
        }}
        contact={assignResponsibleContact}
        onSuccess={handleAssignResponsibleSuccess}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conversa permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A conversa com <strong>{conversationToDelete?.first_name} {conversationToDelete?.last_name}</strong> será excluída permanentemente em 7 dias.
              <br /><br />
              Todas as mensagens serão removidas do sistema e não poderão ser recuperadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteConversation}
              className="rounded-xl bg-red-600 hover:bg-red-700"
            >
              Sim, excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}