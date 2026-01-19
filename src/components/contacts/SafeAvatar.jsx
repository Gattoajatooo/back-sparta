import React, { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { base44 } from "@/api/base44Client";

// Cache global para evitar múltiplas tentativas para o mesmo contato
const refreshAttempts = new Map();
const COOLDOWN_MS = 60000; // 60 segundos entre tentativas

/**
 * SafeAvatar - Avatar que busca nova URL quando detecta expiração (403)
 */
export default function SafeAvatar({ contact, className, size, fallbackClassName }) {
  const [imageUrl, setImageUrl] = useState(contact?.avatar_url);
  const [hasError, setHasError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const hasAttemptedRefresh = useRef(false);

  useEffect(() => {
    setImageUrl(contact?.avatar_url);
    setHasError(false);
    hasAttemptedRefresh.current = false;
  }, [contact?.id, contact?.avatar_url]);

  const handleImageError = async (e) => {
    const imgSrc = e?.target?.src;
    
    // Verificar se é URL do WhatsApp
    const isWhatsAppUrl = imgSrc?.includes('pps.whatsapp.net');
    
    if (!isWhatsAppUrl || hasAttemptedRefresh.current || isRefreshing) {
      setHasError(true);
      return;
    }

    // Verificar cooldown global
    const cacheKey = contact?.id;
    const lastAttempt = refreshAttempts.get(cacheKey);
    if (lastAttempt && (Date.now() - lastAttempt) < COOLDOWN_MS) {
      console.log(`[SafeAvatar] ⏳ Cooldown ativo para ${contact?.first_name}`);
      setHasError(true);
      return;
    }

    // Verificar dados necessários
    if (!contact?.phone || !contact?.company_id) {
      setHasError(true);
      return;
    }

    try {
      // Buscar sessão default
      const sessions = await base44.entities.Session.filter({
        company_id: contact.company_id,
        is_default: true,
        is_deleted: { '$ne': true },
        status: 'WORKING'
      });

      if (sessions.length === 0) {
        console.log('[SafeAvatar] Sem sessão default');
        setHasError(true);
        return;
      }

      console.log(`[SafeAvatar] 🔄 Buscando nova foto para ${contact.first_name}...`);
      
      hasAttemptedRefresh.current = true;
      setIsRefreshing(true);
      refreshAttempts.set(cacheKey, Date.now());

      const chatId = contact.phone.includes('@') 
        ? contact.phone 
        : `${contact.phone.replace(/\D/g, '')}@c.us`;

      const response = await base44.functions.invoke('getWaProfile', {
        sessionName: sessions[0].session_name,
        contactId: chatId
      });

      if (response.data?.profilePictureUrl) {
        console.log(`[SafeAvatar] ✅ Nova URL obtida`);
        
        await base44.entities.Contact.update(contact.id, {
          avatar_url: response.data.profilePictureUrl
        });

        setImageUrl(response.data.profilePictureUrl);
        setHasError(false);
      } else {
        setHasError(true);
      }
    } catch (error) {
      console.error(`[SafeAvatar] ❌ Erro:`, error.message);
      setHasError(true);
    } finally {
      setIsRefreshing(false);
    }
  };

  const initials = `${contact?.first_name?.[0] || ''}${contact?.last_name?.[0] || ''}`.toUpperCase() || 'C';

  return (
    <Avatar className={className || size || "w-10 h-10"}>
      {imageUrl && !hasError ? (
        <AvatarImage 
          src={imageUrl} 
          onError={handleImageError}
          loading="lazy"
        />
      ) : null}
      <AvatarFallback className={fallbackClassName || "bg-gradient-to-br from-blue-400 to-blue-500 text-white"}>
        {isRefreshing ? (
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
        ) : (
          initials
        )}
      </AvatarFallback>
    </Avatar>
  );
}