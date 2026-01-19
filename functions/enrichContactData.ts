import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Função para enriquecer dados de um contato a partir do WhatsApp
 * 
 * Esta função:
 * 1. Verifica se o identificador é LID ou telefone
 * 2. Se for LID, resolve para obter o telefone real
 * 3. Se for telefone, tenta obter o LID
 * 4. Busca o nome/pushName/nickname do perfil
 * 5. Busca a foto de perfil
 * 6. Retorna todos os dados enriquecidos
 */

async function resolveContactIdentifier(sessionName, chatId, wahaApiUrl, wahaApiKey) {
  const result = {
    phone: null,
    lid: null,
    isLid: false
  };

  // Verificar se é LID ou telefone
  if (chatId.includes('@lid')) {
    result.isLid = true;
    result.lid = chatId;
    
    // Resolver LID para obter telefone
    try {
      const formattedLid = chatId.includes('@lid') ? chatId : `${chatId}@lid`;
      const url = `${wahaApiUrl}/api/${sessionName}/lids/${encodeURIComponent(formattedLid)}`;
      
      console.log('[enrichContactData] 🔍 Resolvendo LID:', formattedLid);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Api-Key': wahaApiKey,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.pn) {
          result.phone = data.pn.replace('@c.us', '').replace(/\D/g, '');
          console.log('[enrichContactData] ✅ Telefone obtido do LID:', result.phone);
        }
      } else {
        console.log('[enrichContactData] ⚠️ Não foi possível resolver LID');
      }
    } catch (error) {
      console.error('[enrichContactData] ❌ Erro ao resolver LID:', error.message);
    }
  } else {
    // É um número de telefone
    result.phone = chatId.replace('@c.us', '').replace(/\D/g, '');
    
    // Tentar obter LID do telefone
    try {
      const url = `${wahaApiUrl}/api/${sessionName}/lids/pn/${result.phone}`;
      
      console.log('[enrichContactData] 🔍 Buscando LID para telefone:', result.phone);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Api-Key': wahaApiKey,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.lid) {
          result.lid = data.lid;
          console.log('[enrichContactData] ✅ LID obtido:', result.lid);
        } else if (data.id && data.id.includes('@lid')) {
          result.lid = data.id;
          console.log('[enrichContactData] ✅ LID obtido (formato alternativo):', result.lid);
        }
      }
    } catch (error) {
      console.log('[enrichContactData] ℹ️ Não foi possível obter LID (pode não ser conta comercial)');
    }
  }

  return result;
}

async function getContactProfile(sessionName, contactId, wahaApiUrl, wahaApiKey) {
  const result = {
    pushName: null,
    nickname: null,
    profilePictureUrl: null
  };

  // Buscar foto de perfil
  try {
    const photoUrl = `${wahaApiUrl}/api/contacts/profile-picture?contactId=${encodeURIComponent(contactId)}&refresh=false&session=${encodeURIComponent(sessionName)}`;
    
    console.log('[enrichContactData] 📷 Buscando foto de perfil...');
    
    const photoResponse = await fetch(photoUrl, {
      method: 'GET',
      headers: {
        'X-Api-Key': wahaApiKey,
        'Content-Type': 'application/json'
      }
    });

    if (photoResponse.ok) {
      const photoData = await photoResponse.json();
      if (photoData.profilePictureURL) {
        result.profilePictureUrl = photoData.profilePictureURL;
        console.log('[enrichContactData] ✅ Foto de perfil obtida');
      }
    }
  } catch (error) {
    console.log('[enrichContactData] ℹ️ Não foi possível obter foto de perfil');
  }

  // Buscar informações do contato
  try {
    const contactUrl = `${wahaApiUrl}/api/contacts?contactId=${encodeURIComponent(contactId)}&session=${encodeURIComponent(sessionName)}`;
    
    console.log('[enrichContactData] 👤 Buscando informações do contato...');
    
    const contactResponse = await fetch(contactUrl, {
      method: 'GET',
      headers: {
        'X-Api-Key': wahaApiKey,
        'Content-Type': 'application/json'
      }
    });

    if (contactResponse.ok) {
      const contactData = await contactResponse.json();
      if (contactData.pushname) {
        result.pushName = contactData.pushname;
        console.log('[enrichContactData] ✅ PushName obtido:', result.pushName);
      }
      if (contactData.name) {
        result.nickname = contactData.name;
        console.log('[enrichContactData] ✅ Nickname obtido:', result.nickname);
      }
    }
  } catch (error) {
    console.log('[enrichContactData] ℹ️ Não foi possível obter informações do contato');
  }

  return result;
}

function parseContactName(fullName) {
  if (!fullName) return { firstName: null, lastName: null };
  
  const parts = fullName.trim().split(/\s+/);
  
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: null };
  }
  
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ');
  
  return { firstName, lastName };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { 
      chatId, 
      sessionName, 
      companyId, 
      pushName: payloadPushName,
      forceRefresh = false 
    } = await req.json();

    if (!chatId || !sessionName || !companyId) {
      return Response.json({
        success: false,
        error: 'chatId, sessionName e companyId são obrigatórios'
      }, { status: 400 });
    }

    const wahaApiUrl = Deno.env.get('WAHA_API_URL');
    const wahaApiKey = Deno.env.get('WAHA_API_KEY');

    if (!wahaApiUrl || !wahaApiKey) {
      return Response.json({
        success: false,
        error: 'Configuração da API WAHA não encontrada'
      }, { status: 500 });
    }

    console.log('[enrichContactData] 🚀 Iniciando enriquecimento para:', chatId);

    // 1. Resolver identificador (LID <-> Telefone)
    const identifierData = await resolveContactIdentifier(sessionName, chatId, wahaApiUrl, wahaApiKey);
    
    // 2. Buscar perfil do contato (nome, nickname e foto)
    const profileData = await getContactProfile(sessionName, chatId, wahaApiUrl, wahaApiKey);
    
    // Usar pushName do payload se não conseguiu do perfil
    const finalPushName = profileData.pushName || payloadPushName;
    
    // 3. Parsear nome completo em primeiro e último nome
    const { firstName, lastName } = parseContactName(finalPushName);
    
    // 4. Montar objeto de contato enriquecido
    const enrichedContact = {
      phone: identifierData.phone,
      lid: identifierData.lid,
      first_name: firstName || 'Novo Contato',
      last_name: lastName,
      nickname: profileData.nickname,
      avatar_url: profileData.profilePictureUrl,
      numberExists: true,
      checked: true
    };

    // Adicionar LID na lista de phones se existir
    if (identifierData.lid) {
      enrichedContact.phones = [{
        phone: identifierData.lid,
        type: 'lid'
      }];
      
      // Se também tem telefone, adicionar como primary
      if (identifierData.phone) {
        enrichedContact.phones.unshift({
          phone: identifierData.phone,
          type: 'primary'
        });
      }
    }

    console.log('[enrichContactData] ✅ Dados enriquecidos:', {
      phone: enrichedContact.phone,
      lid: enrichedContact.lid,
      first_name: enrichedContact.first_name,
      last_name: enrichedContact.last_name,
      nickname: enrichedContact.nickname,
      has_avatar: !!enrichedContact.avatar_url
    });

    return Response.json({
      success: true,
      contact: enrichedContact
    });

  } catch (error) {
    console.error('[enrichContactData] ❌ Erro:', error);
    return Response.json({
      success: false,
      error: error.message || 'Erro interno ao enriquecer dados do contato'
    }, { status: 500 });
  }
});