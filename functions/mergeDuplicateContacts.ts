import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Apenas administradores podem mesclar duplicados' }, { status: 403 });
    }

    const { group } = await req.json();

    if (!group || !group.contacts || group.contacts.length < 2) {
      return Response.json({ error: 'Grupo de duplicados inválido' }, { status: 400 });
    }

    const [keepContact, ...deleteContacts] = group.contacts;

    console.log(`🔗 Mesclando duplicados - Manter: ${keepContact.id}, Deletar: ${deleteContacts.map(c => c.id).join(', ')}`);

    // Mesclar dados
    const mergedData = {
      ...keepContact,
      // Combinar emails únicos
      emails: [...new Set([
        ...(keepContact.emails || []).map(e => e.email),
        ...deleteContacts.flatMap(c => (c.emails || []).map(e => e.email))
      ])].map(email => ({ email, type: 'secondary' })),
      
      // Combinar telefones únicos
      phones: [...new Set([
        ...(keepContact.phones || []).map(p => p.phone),
        ...deleteContacts.flatMap(c => (c.phones || []).map(p => p.phone))
      ])].map(phone => ({ phone, type: 'secondary' })),
      
      // Combinar tags únicas
      tags: [...new Set([
        ...(keepContact.tags || []),
        ...deleteContacts.flatMap(c => c.tags || [])
      ])],
      
      // Combinar notas
      notes: [
        ...(keepContact.notes || []),
        ...deleteContacts.flatMap(c => (c.notes || []))
      ].sort((a, b) => new Date(b.date) - new Date(a.date)),
      
      // Se não tem foto, pegar do primeiro duplicado que tem
      avatar_url: keepContact.avatar_url || deleteContacts.find(c => c.avatar_url)?.avatar_url
    };

    // Atualizar contato principal com dados mesclados
    await base44.asServiceRole.entities.Contact.update(keepContact.id, mergedData);

    // Deletar permanentemente os duplicados
    for (const contact of deleteContacts) {
      await base44.asServiceRole.entities.Contact.delete(contact.id);
    }

    console.log(`✅ ${deleteContacts.length} duplicados deletados permanentemente`);

    return Response.json({
      success: true,
      merged_count: deleteContacts.length,
      kept_contact_id: keepContact.id
    });

  } catch (error) {
    console.error('❌ Error merging duplicates:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});