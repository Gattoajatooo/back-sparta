import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { secret_id } = await req.json();

    if (!secret_id) {
      return Response.json({ error: 'ID do secret não fornecido' }, { status: 400 });
    }

    // Buscar secret
    const secret = await base44.asServiceRole.entities.Secret.get(secret_id);
    if (!secret) {
      return Response.json({ error: 'Secret não encontrado' }, { status: 404 });
    }

    // Usar BASE44_SECRET_KEY como chave de descriptografia
    const secretKey = Deno.env.get('BASE44_SECRET_KEY');
    if (!secretKey) {
      return Response.json({ error: 'Chave de descriptografia não configurada' }, { status: 500 });
    }

    // Decodificar base64
    const combined = JSON.parse(atob(secret.encrypted_value));
    const iv = new Uint8Array(combined.iv);
    const encryptedData = new Uint8Array(combined.data);

    // Importar chave
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secretKey.padEnd(32, '0').substring(0, 32));
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    // Descriptografar
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      encryptedData
    );

    const decoder = new TextDecoder();
    const decryptedValue = decoder.decode(decryptedBuffer);

    return Response.json({
      success: true,
      value: decryptedValue
    });

  } catch (error) {
    console.error('Erro ao descriptografar secret:', error.message);
    return Response.json({ error: 'Erro ao descriptografar secret' }, { status: 500 });
  }
});