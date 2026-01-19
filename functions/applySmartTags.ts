import { createClient } from 'npm:@base44/sdk@0.1.0';

const base44 = createClient({
  appId: Deno.env.get('BASE44_APP_ID'),
});

// Helper para parse de datas
function parseDate(dateStr) {
  if (!dateStr) return null;
  let date = new Date(dateStr);
  if (!date || isNaN(date.getTime())) return null;
  return date;
}

// Helper para semana do ano
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Função principal de avaliação de condição
function evaluateCondition(contact, condition) {
  const { field, operator, value } = condition;
  
  switch (field) {
    // --- CADASTRO ---
    case 'email_type': {
      const email = contact.email || contact.emails?.[0]?.email;
      if (!email) return false;
      const personalDomains = ['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com', 'live.com', 'aol.com', 'icloud.com'];
      const domain = email.split('@')[1];
      const isPersonal = personalDomains.includes(domain);
      return (value === 'personal') ? isPersonal : !isPersonal;
    }
    case 'multiple_contacts': {
      const hasMultipleEmails = contact.emails && contact.emails.length > 1;
      const hasMultiplePhones = contact.phones && contact.phones.length > 1;
      const hasMultiple = hasMultipleEmails || hasMultiplePhones;
      return (operator === 'is_true') ? hasMultiple : !hasMultiple;
    }
    case 'profile_completeness': { // Endereço Completo
      const address = contact.addresses?.[0];
      if (!address) return false;
      const isComplete = address.cep && address.street && address.number && address.city && address.state;
      return (operator === 'is_true') ? !!isComplete : !isComplete;
    }

    // --- CLIENTE ---
    case 'position': {
      const position = (contact.position || '').toLowerCase();
      const keywords = (value || '').toLowerCase();
      if (operator === 'contains') return position.includes(keywords);
      if (operator === 'not_contains') return !position.includes(keywords);
      return false;
    }
    case 'company_name': {
      const hasCompany = !!contact.company_name;
      if (operator === 'is_filled') return hasCompany;
      if (operator === 'is_not_filled') return !hasCompany;
      return false;
    }
    case 'value': {
      const contactValue = parseFloat(contact.value) || 0;
      const ruleValue = parseFloat(value) || 0;
      if (operator === 'greater_than') return contactValue > ruleValue;
      if (operator === 'less_than') return contactValue < ruleValue;
      if (operator === 'equals') return contactValue === ruleValue;
      return false;
    }

    // --- STATUS ---
    case 'status':
    case 'source': {
      const contactValue = (contact[field] || '').toLowerCase();
      const ruleValue = (value || '').toLowerCase();
      if (operator === 'equals') return contactValue === ruleValue;
      if (operator === 'not_equals') return contactValue !== ruleValue;
      return false;
    }
    case 'has_tag': {
      const tags = contact.tags || [];
      const hasTag = tags.map(t => t.toLowerCase()).includes((value || '').toLowerCase());
      if (operator === 'equals') return hasTag;
      if (operator === 'not_equals') return !hasTag;
      return false;
    }

    // --- TEMPO ---
    case 'birth_date': {
      const birthDate = parseDate(contact.birth_date);
      if (!birthDate) return false;
      const now = new Date();
      
      if (operator === 'is_today') {
        return birthDate.getDate() === now.getDate() && birthDate.getMonth() === now.getMonth();
      }
      if (operator === 'is_this_week') {
        const birthdayThisYear = new Date(now.getFullYear(), birthDate.getMonth(), birthDate.getDate());
        return getWeekNumber(birthdayThisYear) === getWeekNumber(now);
      }
      if (operator === 'is_this_month') {
        return birthDate.getMonth() === now.getMonth();
      }
      return false;
    }
    case 'last_contact_date':
    case 'created_date': {
      const dateValue = parseDate(contact[field]);
      if (!dateValue) return false;
      const now = new Date();
      const daysAgo = parseInt(value, 10);
      if (isNaN(daysAgo)) return false;
      
      const diffTime = Math.abs(now - dateValue);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (operator === 'days_ago_greater_than') return diffDays > daysAgo;
      return false;
    }

    // --- ENDEREÇO ---
    case 'address_city':
    case 'address_state':
    case 'address_neighborhood': {
      const address = contact.addresses?.[0];
      if (!address) return false;
      const fieldKey = field.replace('address_', '');
      const contactValue = (address[fieldKey] || '').toLowerCase();
      const ruleValue = (value || '').toLowerCase();
      if (operator === 'equals') return contactValue === ruleValue;
      if (operator === 'not_equals') return contactValue !== ruleValue;
      return false;
    }
    case 'cep_format': {
      const cep = contact.addresses?.[0]?.cep?.replace(/\D/g, '') || '';
      const isValid = cep.length === 8;
      if (operator === 'is_valid') return isValid;
      if (operator === 'is_invalid') return !isValid;
      return false;
    }

    // --- OBSERVAÇÕES ---
    case 'notes_keywords': {
      const notes = (contact.notes || '').toLowerCase();
      const keywords = (value || '').toLowerCase();
      if (operator === 'contains') return notes.includes(keywords);
      if (operator === 'not_contains') return !notes.includes(keywords);
      return false;
    }
    case 'has_notes': {
      const hasNotes = !!contact.notes;
      if (operator === 'is_true') return hasNotes;
      if (operator === 'is_false') return !hasNotes;
      return false;
    }

    default: return false;
  }
}

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const token = authHeader.split(' ')[1];
    base44.auth.setToken(token);
    const user = await base44.auth.me();
    if (!user?.company_id) {
      return new Response(JSON.stringify({ error: 'No company' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { tagId, contactId } = await req.json().catch(() => ({}));

    const tags = tagId
      ? await base44.entities.Tag.filter({ id: tagId, company_id: user.company_id, is_smart: true, is_active: true })
      : await base44.entities.Tag.filter({ company_id: user.company_id, is_smart: true, is_active: true });

    const contacts = contactId
      ? await base44.entities.Contact.filter({ id: contactId, company_id: user.company_id })
      : await base44.entities.Contact.filter({ company_id: user.company_id });

    let applied = 0;
    let checked = 0;

    for (const tag of tags) {
      if (!tag.smart_rules?.auto_apply) continue;
      const conditions = tag.smart_rules?.conditions || [];
      if (conditions.length === 0) continue;
      
      for (const contact of contacts) {
        checked++;
        if (contact.tags?.includes(tag.name)) continue;

        // ALL conditions must be met
        const allConditionsMet = conditions.every((cond) => evaluateCondition(contact, cond));

        if (allConditionsMet) {
          const updatedTags = contact.tags ? [...contact.tags, tag.name] : [tag.name];
          await base44.entities.Contact.update(contact.id, { tags: updatedTags });

          const currentStats = tag.usage_stats || {};
          const updatedStats = {
            ...currentStats,
            total_applied: (currentStats.total_applied || 0) + 1,
            auto_applied: (currentStats.auto_applied || 0) + 1,
          };
          
          await base44.entities.Tag.update(tag.id, {
            usage_stats: updatedStats,
            contacts_count: (tag.contacts_count || 0) + 1
          });
          applied++;
        }
      }
    }

    return new Response(JSON.stringify({ success: true, applied, checked }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    console.error('applySmartTags error:', e);
    return new Response(JSON.stringify({ error: 'Internal error', details: e.message }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' }
    });
  }
});