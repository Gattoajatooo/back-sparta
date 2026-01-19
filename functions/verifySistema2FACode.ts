import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { code } = await req.json();

    if (!code || code.length !== 6) {
      return Response.json({ error: 'Código inválido' }, { status: 400 });
    }

    // Criar hash do código fornecido
    const encoder = new TextEncoder();
    const data = encoder.encode(code.toUpperCase());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const codeHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Buscar código do usuário
    const codes = await base44.asServiceRole.entities.Sistema2FACode.filter({
      user_id: user.id,
      verified: false
    });

    if (codes.length === 0) {
      return Response.json({ 
        error: 'Nenhum código ativo. Solicite um novo código.' 
      }, { status: 400 });
    }

    const savedCode = codes[0];

    // Verificar expiração
    const now = new Date();
    const expiresAt = new Date(savedCode.expires_at);
    
    if (now > expiresAt) {
      await base44.asServiceRole.entities.Sistema2FACode.delete(savedCode.id);
      return Response.json({ 
        error: 'Código expirado. Solicite um novo código.' 
      }, { status: 400 });
    }

    // Verificar número de tentativas (máximo 3)
    if (savedCode.attempts >= 3) {
      await base44.asServiceRole.entities.Sistema2FACode.delete(savedCode.id);
      return Response.json({ 
        error: 'Número máximo de tentativas excedido. Solicite um novo código.' 
      }, { status: 400 });
    }

    // Verificar se o hash corresponde
    if (savedCode.code_hash !== codeHash) {
      // Incrementar tentativas
      await base44.asServiceRole.entities.Sistema2FACode.update(savedCode.id, {
        attempts: savedCode.attempts + 1
      });

      const remainingAttempts = 3 - (savedCode.attempts + 1);
      return Response.json({ 
        error: `Código incorreto. ${remainingAttempts} tentativa(s) restante(s).` 
      }, { status: 400 });
    }

    // Código correto! Marcar como verificado e deletar
    await base44.asServiceRole.entities.Sistema2FACode.update(savedCode.id, {
      verified: true
    });
    
    // Deletar após verificação bem-sucedida
    await base44.asServiceRole.entities.Sistema2FACode.delete(savedCode.id);

    return Response.json({
      success: true,
      message: 'Código verificado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao verificar código 2FA:', error.message);
    return Response.json({ error: 'Erro ao verificar código' }, { status: 500 });
  }
});