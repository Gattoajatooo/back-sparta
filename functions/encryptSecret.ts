import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { key_name, value, category, description, is_sensitive } = await req.json();

    if (!key_name || !value || !category) {
      return Response.json({ error: 'Campos obrigatórios faltando' }, { status: 400 });
    }

    // Usar BASE44_SECRET_KEY como chave de criptografia
    const secretKey = Deno.env.get('BASE44_SECRET_KEY');
    if (!secretKey) {
      return Response.json({ error: 'Chave de criptografia não configurada' }, { status: 500 });
    }

    // Gerar IV aleatório
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Importar chave
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secretKey.padEnd(32, '0').substring(0, 32));
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );

    // Criptografar valor
    const encodedValue = encoder.encode(value);
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      encodedValue
    );

    // Converter para base64
    const encryptedArray = new Uint8Array(encryptedBuffer);
    const ivArray = Array.from(iv);
    const encryptedValueArray = Array.from(encryptedArray);
    
    const combined = JSON.stringify({
      iv: ivArray,
      data: encryptedValueArray
    });
    
    const encryptedValue = btoa(combined);

    // Verificar se já existe
    const existing = await base44.asServiceRole.entities.Secret.filter({ key_name });

    let secret;
    if (existing.length > 0) {
      // Atualizar
      secret = await base44.asServiceRole.entities.Secret.update(existing[0].id, {
        encrypted_value: encryptedValue,
        category,
        description,
        is_sensitive: is_sensitive ?? true,
        last_updated_by: user.id
      });
    } else {
      // Criar novo
      secret = await base44.asServiceRole.entities.Secret.create({
        key_name,
        encrypted_value: encryptedValue,
        category,
        description,
        is_sensitive: is_sensitive ?? true,
        last_updated_by: user.id
      });
    }

    return Response.json({
      success: true,
      secret: {
        id: secret.id,
        key_name: secret.key_name,
        category: secret.category,
        description: secret.description,
        is_sensitive: secret.is_sensitive
      }
    });

  } catch (error) {
    console.error('Erro ao salvar secret:', error.message);
    return Response.json({ error: 'Erro ao salvar secret' }, { status: 500 });
  }
});