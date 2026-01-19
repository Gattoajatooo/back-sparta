import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import SafeAvatar from "@/components/contacts/SafeAvatar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function MessageToast({ message, onClose, onNavigate }) {
  const [isExiting, setIsExiting] = useState(false);
  const [contactData, setContactData] = useState(message.contact || null);
  const [isLoading, setIsLoading] = useState(!message.contact && !message.metadata?.contact_avatar);

  // Carregar dados do contato se não vieram na mensagem
  useEffect(() => {
    const loadContact = async () => {
      // Se já tem dados completos do contato, não precisa buscar
      if (message.contact && message.contact.avatar_url) {
        setContactData(message.contact);
        setIsLoading(false);
        return;
      }

      // Se tem contact_id, buscar do banco
      if (message.contact_id) {
        try {
          setIsLoading(true);
          const { base44 } = await import("@/api/base44Client");
          const contact = await base44.entities.Contact.get(message.contact_id);
          console.log('[MessageToast] ✅ Contato carregado:', contact?.first_name);
          setContactData(contact);
        } catch (error) {
          console.error('[MessageToast] Erro ao carregar contato:', error);
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // Se não tem contact_id mas tem chat_id, tentar buscar por telefone ou LID
      if (message.chat_id) {
        try {
          setIsLoading(true);
          const { base44 } = await import("@/api/base44Client");
          const isLid = message.chat_id.includes('@lid');
          const phone = message.chat_id.split('@')[0];
          
          let foundContact = null;
          
          // 1. Se for telefone, buscar por phone
          if (!isLid) {
            const contacts = await base44.entities.Contact.filter({
              phone: phone
            });
            
            if (contacts.length > 0) {
              foundContact = contacts[0];
              console.log('[MessageToast] ✅ Contato encontrado por telefone:', foundContact?.first_name);
            }
          }
          
          // 2. Se for LID ou não encontrou por telefone, buscar no array phones
          if (!foundContact) {
            const allContacts = await base44.entities.Contact.filter({});
            
            for (const contact of allContacts) {
              if (contact.phones && Array.isArray(contact.phones)) {
                const hasMatch = contact.phones.some(p => 
                  p.phone === message.chat_id || p.phone === phone
                );
                if (hasMatch) {
                  foundContact = contact;
                  console.log('[MessageToast] ✅ Contato encontrado em phones[]:', foundContact?.first_name);
                  break;
                }
              }
            }
          }
          
          if (foundContact) {
            setContactData(foundContact);
          }
        } catch (error) {
          console.error('[MessageToast] Erro ao buscar contato:', error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };
    
    loadContact();
  }, [message]);

  if (!message) return null;

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleClick = () => {
    onNavigate(message);
    handleClose();
  };

  // Priorizar dados do contato que vieram no WebSocket enriquecido
  const contactName = contactData?.first_name 
    ? `${contactData.first_name} ${contactData.last_name || ''}`.trim()
    : message.metadata?.contact_name 
    || message.metadata?.notifyName 
    || message.chat_id?.split('@')[0] 
    || 'Contato';

  const contactAvatar = contactData?.avatar_url || message.metadata?.contact_avatar;

  const messagePreview = message.content || 'Mídia';

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, scale: 0.95 }}
      animate={{ 
        opacity: isExiting ? 0 : 1, 
        x: isExiting ? -20 : 0,
        scale: isExiting ? 0.95 : 1
      }}
      exit={{ opacity: 0, x: -20, scale: 0.95 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      onClick={handleClick}
      className="bg-white rounded-2xl shadow-xl border-2 border-green-500 p-3 cursor-pointer hover:shadow-2xl transition-shadow mb-3"
    >
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 relative">
          {isLoading ? (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
            </div>
          ) : contactData || contactAvatar ? (
            <SafeAvatar 
              contact={contactData || { avatar_url: contactAvatar, first_name: contactName }}
              className="w-10 h-10"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
          )}
          <div className="absolute -top-1 -left-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full animate-pulse" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-sm text-gray-900 truncate">
              {contactName}
            </h4>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              className="flex-shrink-0 h-6 w-6 rounded-lg hover:bg-gray-100"
            >
              <X className="w-3 h-3 text-gray-500" />
            </Button>
          </div>
          <p className="text-xs text-gray-600 line-clamp-2 mt-0.5">
            {messagePreview}
          </p>
          <span className="text-[10px] text-gray-400 mt-1 block">
            {format(new Date(message.created_at), "HH:mm", { locale: ptBR })}
          </span>
        </div>
      </div>
    </motion.div>
  );
}