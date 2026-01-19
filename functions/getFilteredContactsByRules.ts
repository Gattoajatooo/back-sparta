import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/** ======================= Utils Gerais ======================= **/

const SAFE_MAX = 5000; // corte defensivo no payload de resposta

function norm(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

// Normalização robusta para valores de tag (remove acentos, emojis, pontuação, colapsa espaços)
function normTag(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\p{Extended_Pictographic}|\p{Emoji_Presentation}/gu, '')
    .replace(/[\p{P}\p{S}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

function normField(f) {
  return String(f ?? '').trim();
}

function normOp(op) {
  return String(op ?? '').toLowerCase().trim();
}

function toNum(x) {
  const n = typeof x === 'number' ? x : Number(String(x).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

function almostEq(a, b, eps = 1e-6) {
  return Math.abs(a - b) <= eps;
}

function parseDateOnlyUTC(d) {
  if (!d) return null;
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt.getTime())) return null;
  return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
}

function daysBetweenUTC(fromUTC, toUTC) {
  const ms = toUTC.getTime() - fromUTC.getTime();
  return Math.floor(ms / 86400000);
}

function anyAddress(contact, predicate) {
  const arr = Array.isArray(contact?.addresses) ? contact.addresses : [];
  return arr.some((a) => a && predicate(a));
}

// Lê arrays de string/objetos { name } de forma segura
function coerceStrArray(input) {
  if (!input) return [];
  if (Array.isArray(input)) {
    const out = [];
    for (const it of input) {
      if (typeof it === 'string') out.push(it);
      else if (it && typeof it === 'object' && typeof it.name === 'string') out.push(it.name);
    }
    return out;
  }
  return [];
}

/**
 * Extrai e normaliza tags de vários lugares comuns do contato.
 * Se vierem IDs (tag_ids), você pode passar um mapa opcional no body: { tags_map: { "vip": "id-123" } }
 * que permite comparar por nome mesmo usando ids.
 */
function getTagsNormalized(contact, tagsMapByName) {
  const candidates = [];

  // 1) campos prováveis (strings/objetos)
  const tags1 = coerceStrArray(contact?.tags);
  if (tags1.length) candidates.push({ arr: tags1, source: 'contact.tags' });

  const tags2 = coerceStrArray(contact?.markers);
  if (tags2.length) candidates.push({ arr: tags2, source: 'contact.markers' });

  const tags3 = coerceStrArray(contact?.labels);
  if (tags3.length) candidates.push({ arr: tags3, source: 'contact.labels' });

  const tags4 = coerceStrArray(contact?.categories);
  if (tags4.length) candidates.push({ arr: tags4, source: 'contact.categories' });

  const tags5 = coerceStrArray(contact?.metadata?.tags);
  if (tags5.length) candidates.push({ arr: tags5, source: 'contact.metadata.tags' });

  const tags6 = coerceStrArray(contact?.custom_fields?.tags);
  if (tags6.length) candidates.push({ arr: tags6, source: 'contact.custom_fields.tags' });

  // 2) Por fim, ids (tag_ids) com mapa opcional para nomes
  const tagIds = Array.isArray(contact?.tag_ids) ? contact.tag_ids : [];
  if (tagIds.length && tagsMapByName) {
    const namesFromIds = [];
    for (const [name, id] of Object.entries(tagsMapByName)) {
      if (tagIds.includes(id)) namesFromIds.push(name);
    }
    if (namesFromIds.length) candidates.push({ arr: namesFromIds, source: 'contact.tag_ids + tags_map' });
  }

  // 3) fallback: campos localizados
  const ptTags = coerceStrArray(contact?.Marcadores ?? contact?.marcadores);
  if (ptTags.length) candidates.push({ arr: ptTags, source: 'contact.Marcadores' });

  // 4) escolhe o primeiro candidato não-vazio
  const winner = candidates[0] ?? { arr: [], source: 'none' };
  const normalized = winner.arr.map(normTag).filter(Boolean);
  return { list: normalized, source: winner.source };
}

const FIELD_OPERATORS = {
  email_type: new Set(['equals', 'not_equals']),
  multiple_contacts: new Set(['is_true', 'is_false']),
  profile_completeness: new Set(['is_true', 'is_false']),
  birth_date: new Set(['is_today', 'is_this_week', 'is_this_month']),
  last_contact_date: new Set(['days_ago_greater_than', 'days_ago_less_than', 'days_ago_equals', 'between']),
  created_date: new Set(['days_ago_greater_than', 'days_ago_less_than', 'days_ago_equals', 'between']),
  cep_format: new Set(['is_valid', 'is_invalid']),
  has_notes: new Set(['is_true', 'is_false']),
  has_tag: new Set(['equals', 'not_equals', 'in', 'not_in', 'contains', 'is_true', 'is_false']),
  position: new Set(['equals', 'not_equals', 'contains', 'not_contains', 'is_filled', 'is_not_filled']),
  company_name: new Set(['equals', 'not_equals', 'contains', 'not_contains', 'is_filled', 'is_not_filled']),
  status: new Set(['equals', 'not_equals']),
  source: new Set(['equals', 'not_equals']),
  value: new Set(['greater_than', 'less_than', 'equals', 'is_not_filled', 'between']),
  address_city: new Set(['equals', 'not_equals', 'contains', 'not_contains']),
  address_state: new Set(['equals', 'not_equals', 'contains', 'not_contains']),
  address_neighborhood: new Set(['equals', 'not_equals', 'contains', 'not_contains']),
  notes_keywords: new Set(['contains', 'not_contains']),
};

function validateFilters(filters) {
  if (!Array.isArray(filters)) return { ok: false, msg: 'filters precisa ser um array' };
  for (const f of filters) {
    if (!f || typeof f !== 'object') return { ok: false, msg: 'Filtro malformado' };

    const field = normField(f.field);
    const op = normOp(f.operator);

    // Ignorar filtros vazios/incompletos (não são erro)
    if (!field || !op) continue;

    if (!FIELD_OPERATORS[field]) return { ok: false, msg: `Campo inválido: ${field}` };
    if (!FIELD_OPERATORS[field].has(op)) {
      return { ok: false, msg: `Operador inválido para ${field}: ${f.operator}` };
    }
  }
  return { ok: true };
}

/** ======================= Comparadores ======================= **/

function checkEmailType(contact, operator, value) {
  if (!contact?.email) return false;
  const personalDomains = [
    'gmail.com',
    'hotmail.com',
    'yahoo.com',
    'outlook.com',
    'uol.com.br',
    'bol.com.br',
    'icloud.com',
    'protonmail.com',
  ];
  const domain = String(contact.email).split('@')[1]?.toLowerCase();
  const isPersonal = personalDomains.includes(domain);
  const emailType = isPersonal ? 'personal' : 'corporate';
  return operator === 'equals' ? emailType === value : emailType !== value;
}

function checkMultipleContacts(contact, operator) {
  const phones = Array.isArray(contact?.phones) ? contact.phones : [];
  const count = phones.filter(Boolean).length;
  const hasMultiple = count >= 2;
  return operator === 'is_true' ? hasMultiple : !hasMultiple;
}

function checkProfileCompleteness(contact, operator) {
  const ok = anyAddress(contact, (a) => a?.cep && a?.street && a?.city && a?.state);
  return operator === 'is_true' ? ok : !ok;
}

function checkBirthDate(contact, operator, todayUTC) {
  if (!contact?.birth_date) return false;
  const birth = parseDateOnlyUTC(contact.birth_date);
  if (!birth) return false;

  switch (operator) {
    case 'is_today':
      return (
        birth.getUTCDate() === todayUTC.getUTCDate() &&
        birth.getUTCMonth() === todayUTC.getUTCMonth()
      );
    case 'is_this_week': {
      const dow = todayUTC.getUTCDay();
      const diffToMonday = dow === 0 ? 6 : dow - 1;
      const weekStart = new Date(todayUTC);
      weekStart.setUTCDate(todayUTC.getUTCDate() - diffToMonday);
      weekStart.setUTCHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
      weekEnd.setUTCHours(23, 59, 59, 999);

      const thisYear = todayUTC.getUTCFullYear();
      const bdayThisYear = new Date(
        Date.UTC(thisYear, birth.getUTCMonth(), birth.getUTCDate())
      );
      return bdayThisYear >= weekStart && bdayThisYear <= weekEnd;
    }
    case 'is_this_month':
      return birth.getUTCMonth() === todayUTC.getUTCMonth();
    default:
      return false;
  }
}

function checkDaysAgo(dateStr, operator, value, todayUTC) {
  const d = parseDateOnlyUTC(dateStr);
  if (!d) return false;
  const days = daysBetweenUTC(d, todayUTC);

  if (operator === 'days_ago_equals') return days === Number(value);
  if (operator === 'days_ago_greater_than') return days > Number(value);
  if (operator === 'days_ago_less_than') return days < Number(value);
  if (operator === 'between') {
    const [min, max] = Array.isArray(value) ? value : [];
    if (typeof min !== 'number' || typeof max !== 'number') return false;
    return days >= min && days <= max;
  }
  return false;
}

function checkLastContactDate(contact, operator, value, todayUTC) {
  if (!contact?.last_contact_date) return false;
  return checkDaysAgo(contact.last_contact_date, operator, value, todayUTC);
}

function checkCreatedDate(contact, operator, value, todayUTC) {
  if (!contact?.created_date) return false;
  return checkDaysAgo(contact.created_date, operator, value, todayUTC);
}

function checkCepFormat(contact, operator) {
  const anyValid = anyAddress(contact, (a) => {
    const raw = String(a?.cep ?? '').trim();
    if (!raw) return false;
    const onlyDigits = raw.replace(/\D/g, '');
    return /^\d{8}$/.test(onlyDigits);
  });
  return operator === 'is_valid' ? anyValid : !anyValid;
}

function checkHasNotes(contact, operator) {
  const has = !!(contact?.notes && String(contact.notes).trim().length > 0);
  return operator === 'is_true' ? has : !has;
}

// checkHasTag agora usa o extrator de tags e aceita tags_map opcional
function checkHasTag(contact, operator, value, tagsMapByName) {
  const { list: tagsNorm } = getTagsNormalized(contact, tagsMapByName);

  if (operator === 'is_true' || operator === 'is_false') {
    const has = tagsNorm.length > 0;
    return operator === 'is_true' ? has : !has;
  }

  const vals = Array.isArray(value) ? value : [value];
  const valsNorm = vals.map(normTag).filter(Boolean);
  if (valsNorm.length === 0) return false;

  const anyEq = valsNorm.some((v) => tagsNorm.includes(v));

  if (operator === 'equals' || operator === 'in') return anyEq;
  if (operator === 'not_equals' || operator === 'not_in') return !anyEq;

  if (operator === 'contains') {
    const needle = valsNorm[0];
    return tagsNorm.some((t) => t.includes(needle));
  }
  if (operator === 'not_contains') {
    const needle = valsNorm[0];
    return tagsNorm.every((t) => !t.includes(needle));
  }
  return false;
}

function checkTextField(raw, operator, value) {
  const s = norm(raw);
  const v = norm(value);
  switch (operator) {
    case 'equals':
      return s === v;
    case 'not_equals':
      return s !== v;
    case 'contains':
      return s.includes(v);
    case 'not_contains':
      return !s.includes(v);
    case 'is_filled':
      return s.length > 0;
    case 'is_not_filled':
      return s.length === 0;
    default:
      return false;
  }
}

function compareAnyAddressField(contact, field, operator, value) {
  const v = norm(value);
  const has = anyAddress(contact, (a) => {
    const s = norm(a?.[field]);
    if (operator === 'equals') return s === v;
    if (operator === 'not_equals') return s !== v;
    if (operator === 'contains') return s.includes(v);
    if (operator === 'not_contains') return !s.includes(v);
    return false;
  });

  if (operator.startsWith('not_')) return !has;
  return has;
}

function checkAddressCity(contact, operator, value) {
  return compareAnyAddressField(contact, 'city', operator, value);
}
function checkAddressState(contact, operator, value) {
  return compareAnyAddressField(contact, 'state', operator, value);
}
function checkAddressNeighborhood(contact, operator, value) {
  return compareAnyAddressField(contact, 'neighborhood', operator, value);
}

function checkPosition(contact, operator, value) {
  return checkTextField(contact?.position, operator, value);
}

function checkCompanyName(contact, operator, value) {
  return checkTextField(contact?.company_name, operator, value);
}

function checkStatus(contact, operator, value) {
  const status = norm(contact?.status);
  const v = norm(value);
  return operator === 'equals' ? status === v : status !== v;
}

function checkSource(contact, operator, value) {
  const source = norm(contact?.source);
  const v = norm(value);
  return operator === 'equals' ? source === v : source !== v;
}

function checkValue(contact, operator, value) {
  const c = toNum(contact?.value);
  if (operator === 'is_not_filled') return c === undefined;

  if (operator === 'between') {
    const [min, max] = Array.isArray(value) ? value.map(toNum) : [undefined, undefined];
    if (c === undefined || min === undefined || max === undefined) return false;
    return c >= min && c <= max;
  }

  const v = toNum(value);
  if (c === undefined || v === undefined) return false;

  if (operator === 'greater_than') return c > v;
  if (operator === 'less_than') return c < v;
  if (operator === 'equals') return almostEq(c, v);
  return false;
}

/** ======================= Motor de Filtro ======================= **/

function passesFilter(contact, rawFilter, todayUTC, tagsMapByName) {
  const field = normField(rawFilter?.field);
  const operator = normOp(rawFilter?.operator);
  const value = rawFilter?.value;

  switch (field) {
    case 'email_type':
      return checkEmailType(contact, operator, value);
    case 'multiple_contacts':
      return checkMultipleContacts(contact, operator);
    case 'profile_completeness':
      return checkProfileCompleteness(contact, operator);
    case 'birth_date':
      return checkBirthDate(contact, operator, todayUTC);
    case 'last_contact_date':
      return checkLastContactDate(contact, operator, value, todayUTC);
    case 'created_date':
      return checkCreatedDate(contact, operator, value, todayUTC);
    case 'cep_format':
      return checkCepFormat(contact, operator);
    case 'has_notes':
      return checkHasNotes(contact, operator);
    case 'has_tag':
        return checkHasTag(contact, operator, value, tagsMapByName);
    case 'position':
      return checkPosition(contact, operator, value);
    case 'company_name':
      return checkCompanyName(contact, operator, value);
    case 'status':
      return checkStatus(contact, operator, value);
    case 'source':
      return checkSource(contact, operator, value);
    case 'value':
      return checkValue(contact, operator, value);
    case 'address_city':
      return checkAddressCity(contact, operator, value);
    case 'address_state':
      return checkAddressState(contact, operator, value);
    case 'address_neighborhood':
      return checkAddressNeighborhood(contact, operator, value);
    case 'notes_keywords': {
      const notes = norm(contact?.notes);
      const v = norm(value);
      if (operator === 'contains') return notes.includes(v);
      if (operator === 'not_contains') return !notes.includes(v);
      return false;
    }
    default:
      console.warn('Campo não reconhecido (falha fechada):', field);
      return false;
  }
}

/** ======================= Handler HTTP ======================= **/

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user?.company_id) {
      return Response.json(
        { success: false, error: 'Usuário não autenticado ou sem empresa' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    let {
      filters: rawFilters = [],
      logic = 'AND',
      simulation_date,
      limit = 2000,
      offset = 0,
      project,
      debug = false,
      tags_map,
    } = body || {};

    const combinator = String(logic || 'AND').toUpperCase() === 'OR' ? 'OR' : 'AND';

    // Separar filtros de campanha dos outros
    const campaignFilters = rawFilters.filter(f => f.category === 'campanha');
    const otherFilters = rawFilters.filter(f => f.category !== 'campanha');

    // FILTRAR apenas outros filtros válidos (remover vazios/incompletos)
    const validOtherFilters = otherFilters.filter(f => {
      const field = normField(f?.field);
      const op = normOp(f?.operator);
      return field && op;
    });

    console.log(`📊 Filtros recebidos: ${rawFilters.length}, campanha: ${campaignFilters.length}, outros válidos: ${validOtherFilters.length}`);

    // Validar apenas os outros filtros válidos
    const vf = validateFilters(validOtherFilters);
    if (!vf.ok) {
      return Response.json({ success: false, error: vf.msg }, { status: 400 });
    }

    // ============================================
    // BUSCAR SYSTEM TAGS PARA FILTRAR NÚMEROS INVÁLIDOS
    // ============================================
    console.log('\n🏷️ Buscando SystemTags para filtrar números inválidos...');
    const systemTags = await base44.asServiceRole.entities.SystemTag.list();
    const invalidNumberTag = systemTags.find(tag => tag.slug === 'invalid_number');
    const numberNotExistsTag = systemTags.find(tag => tag.slug === 'number_not_exists');
    
    const invalidSystemTagIds = [
      invalidNumberTag?.id,
      numberNotExistsTag?.id
    ].filter(Boolean);
    
    console.log(`   ✓ IDs de tags inválidas: ${invalidSystemTagIds.join(', ')}`);

    // Processar filtros de campanha primeiro
    let campaignContactIdsSet = null;
    
    if (campaignFilters.length > 0) {
      const campaignContactSets = [];
      
      for (const filter of campaignFilters) {
        const campaignId = filter.field;
        const operator = normOp(filter.operator);
        const value = filter.value;
        
        if (!campaignId) {
            console.warn(`Filtro de campanha sem ID de campanha no campo 'field' será ignorado: ${JSON.stringify(filter)}`);
            continue;
        }

        let messageQuery = {
            schedule_id: campaignId,
            company_id: user.company_id
        };
        
        if (operator === 'all_contacts') {
            // All contacts
        } else if (operator === 'with_errors') {
            messageQuery.status = 'failed';
            if (value && String(value).toLowerCase() !== 'all_errors') {
                messageQuery.type_error = norm(value);
            }
        } else if (operator === 'pending') {
            messageQuery.status = 'pending';
        } else if (operator === 'success') {
            messageQuery.status = 'success';
        } else if (operator === 'cancelled') {
            messageQuery.status = 'cancelled';
        } else {
             console.warn(`Filtro de campanha com operador não reconhecido ou malformado será ignorado: ${JSON.stringify(filter)}`);
             continue;
        }
        
        const messages = await base44.asServiceRole.entities.Message.filter(messageQuery);
        const contactIds = new Set(messages.map(m => m.contact_id).filter(Boolean));
        campaignContactSets.push(contactIds);
      }
      
      if (campaignContactSets.length > 0) {
        if (combinator === 'AND') {
          campaignContactIdsSet = campaignContactSets.reduce((acc, set) => {
            return new Set([...acc].filter(x => set.has(x)));
          });
        } else {
          campaignContactIdsSet = campaignContactSets.reduce((acc, set) => {
            return new Set([...acc, ...set]);
          }, new Set());
        }
      }
    }

    // Buscar todos os contatos da empresa (EXCLUINDO DELETADOS)
    let allContacts = await base44.entities.Contact.filter(
      { 
        company_id: user.company_id,
        deleted: { '$ne': true }
      },
      '-created_date',
      0
    );
    console.log(`✅ Contatos iniciais da empresa (não deletados): ${allContacts.length}`);

    // ============================================
    // FILTRAR CONTATOS COM SYSTEM TAGS INVÁLIDAS
    // ============================================
    console.log('\n🔍 Filtrando contatos com números inválidos...');
    const contactsBeforeSystemTagFilter = allContacts.length;
    
    allContacts = allContacts.filter(contact => {
      // Se não tem tags_system, considerar válido
      if (!contact.tags_system || contact.tags_system.length === 0) return true;
      
      // Verificar se alguma tag do contato está na lista de tags inválidas
      const hasInvalidTag = contact.tags_system.some(tagId => invalidSystemTagIds.includes(tagId));
      
      return !hasInvalidTag;
    });
    
    const filteredBySystemTags = contactsBeforeSystemTagFilter - allContacts.length;
    console.log(`   ✓ ${filteredBySystemTags} contato(s) filtrado(s) por número inválido`);
    console.log(`   ✓ ${allContacts.length} contatos válidos restantes`);

    // Se temos filtros de campanha, filtrar contatos por IDs de campanha primeiro
    if (campaignContactIdsSet !== null) {
      allContacts = allContacts.filter(c => campaignContactIdsSet.has(c.id));
      console.log(`✅ Contatos após filtro de campanha: ${allContacts.length}`);
      
      if (validOtherFilters.length === 0) {
        const total = allContacts.length;
        limit = Math.max(1, Math.min(Number(limit) || 2000, SAFE_MAX));
        offset = Math.max(0, Number(offset) || 0);
        
        const paged = allContacts.slice(offset, offset + limit);
        const projected = projectArray(paged, project);

        return Response.json({
          success: true,
          count: total,
          limit,
          offset,
          has_more: offset + limit < total,
          contacts: projected,
          ...(debug && {
            debug: {
                company_id: user.company_id,
                totalContacts: total,
                campaignFiltersApplied: campaignFilters.length > 0,
                campaignContactIdsCount: campaignContactIdsSet?.size ?? 0,
                filteredByInvalidNumber: filteredBySystemTags,
                invalidSystemTagIds
            }
          }),
        });
      }
    } else if (validOtherFilters.length === 0) {
      console.log('⚠️ Nenhum filtro válido encontrado, retornando lista vazia');
      return Response.json({
        success: true,
        count: 0,
        limit,
        offset: 0,
        has_more: false,
        contacts: [],
      });
    }

    const tmp = simulation_date ? new Date(simulation_date) : new Date();
    const todayUTC = new Date(Date.UTC(tmp.getUTCFullYear(), tmp.getUTCMonth(), tmp.getUTCDate()));

    console.log('Lógica de combinação dos demais filtros:', combinator);
    console.log('Data de referência (UTC):', todayUTC.toISOString());
    console.log(`Processando ${allContacts.length} contatos restantes com outros filtros...`);

    // ============================================
    // DEBUG MODE
    // ============================================
    let debugInfo = undefined;
    if (debug) {
      console.log('🔍 Modo DEBUG ativado');

      const totalRawContactsForDebug = Array.isArray(allContacts) ? allContacts.length : 0;

      // cobertura por filtro (quantos contatos passariam cada um isoladamente)
      const perFilterPass = validOtherFilters.map((f, idx) => {
        try {
          const field = normField(f.field);
          const op = normOp(f.operator);
          const val = f.value;

          let passCount = 0;
          if (field === 'has_tag') {
            passCount = allContacts.filter((c) => checkHasTag(c, op, val, tags_map)).length;
          } else {
            passCount = allContacts.filter((c) => passesFilter(c, f, todayUTC, tags_map)).length;
          }

          return { index: idx, field: f?.field, operator: f?.operator, value: f?.value, passCount };
        } catch (e) {
          return {
            index: idx,
            field: f?.field,
            operator: f?.operator,
            value: f?.value,
            error: String(e?.message ?? e),
          };
        }
      });

      // histograma de tags (normalizadas) + contagem por fonte
      const tagFreq = {};
      const tagSourceCount = {};
      for (const c of allContacts) {
        const { list, source } = getTagsNormalized(c, tags_map);
        if (list.length) tagSourceCount[source] = (tagSourceCount[source] || 0) + 1;
        for (const t of list) {
          tagFreq[t] = (tagFreq[t] || 0) + 1;
        }
      }

      // amostra "segura" do primeiro contato
      const sample = allContacts[0]
        ? {
            id: allContacts[0].id,
            name: allContacts[0].name,
            email: allContacts[0].email,
            status: allContacts[0].status,
            source: allContacts[0].source,
            value: allContacts[0].value,
            created_date: allContacts[0].created_date,
            last_contact_date: allContacts[0].last_contact_date,
            tags_detected: (() => {
              const raw = getTagsNormalized(allContacts[0], tags_map);
              return { source: raw.source, values: raw.list.slice(0, 10) };
            })(),
            raw_shapes: {
              tags: typeof allContacts[0].tags,
              markers: typeof allContacts[0].markers,
              labels: typeof allContacts[0].labels,
              categories: typeof allContacts[0].categories,
              metadata_tags: typeof allContacts[0]?.metadata?.tags,
              custom_fields_tags: typeof allContacts[0]?.custom_fields?.tags,
              tag_ids_len: Array.isArray(allContacts[0]?.tag_ids) ? allContacts[0].tag_ids.length : 0,
            },
            keys: Object.keys(allContacts[0]).slice(0, 80),
          }
        : null;

      debugInfo = {
        company_id: user.company_id,
        totalContactsBeforeOtherFilters: totalRawContactsForDebug,
        validOtherFilters,
        perFilterPass,
        tagHistogram: tagFreq,
        tagSourceCount,
        sampleFirstContact: sample,
        campaignFiltersApplied: campaignFilters.length > 0,
        campaignContactIdsCount: campaignContactIdsSet?.size ?? 0,
        filteredByInvalidNumber: filteredBySystemTags,
        invalidSystemTagIds,
      };

      console.log('🔍 Debug Info:', JSON.stringify(debugInfo, null, 2));
    }

    // Aplicação dos demais filtros em memória (injeção de tags_map quando for has_tag)
    const filtered = allContacts.filter((c) =>
      combinator === 'OR'
        ? validOtherFilters.some((f) => {
            const field = normField(f.field);
            const op = normOp(f.operator);
            if (field === 'has_tag') return checkHasTag(c, op, f.value, tags_map);
            return passesFilter(c, f, todayUTC, tags_map); // pass tags_map
          })
        : validOtherFilters.every((f) => {
            const field = normField(f.field);
            const op = normOp(f.operator);
            if (field === 'has_tag') return checkHasTag(c, op, f.value, tags_map);
            return passesFilter(c, f, todayUTC, tags_map); // pass tags_map
          })
    );

    const total = filtered.length;
    console.log(`✅ Contatos filtrados (total final): ${total}`);

    if (total > SAFE_MAX) {
      const sliced = filtered.slice(0, SAFE_MAX);
      const projected = projectArray(sliced, project);
      return Response.json({
        success: true,
        warning: `Mais de ${SAFE_MAX} resultados — refine os filtros`,
        count: total,
        limit: SAFE_MAX,
        offset: 0,
        has_more: true,
        contacts: projected,
        ...(debug && { 
          debug: {
            ...debugInfo,
            filteredByInvalidNumber: filteredBySystemTags,
            invalidSystemTagIds
          } 
        }),
      });
    }

    limit = Math.max(1, Math.min(Number(limit) || 2000, SAFE_MAX));
    offset = Math.max(0, Number(offset) || 0);
    const page = filtered.slice(offset, offset + limit);

    const contacts = projectArray(page, project);

    return Response.json({
      success: true,
      count: total,
      limit,
      offset,
      has_more: offset + limit < total,
      contacts,
      ...(debug && { 
        debug: {
          ...debugInfo,
          filteredByInvalidNumber: filteredBySystemTags,
          invalidSystemTagIds
        } 
      }),
    });
  } catch (error) {
    console.error('❌ Erro ao filtrar contatos:', error);
    return Response.json(
      {
        success: false,
        error: 'Erro interno do servidor',
        details: String(error?.message ?? error),
      },
      { status: 500 }
    );
  }
});

/** ======================= Projeção opcional ======================= **/

function projectArray(arr, project) {
  if (!project || !Array.isArray(project) || project.length === 0) return arr;
  const fields = project.map(String);
  return arr.map((c) => {
    const out = {};
    for (const k of fields) out[k] = c?.[k];
    return out;
  });
}