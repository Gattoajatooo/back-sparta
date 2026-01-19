import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Gerar código alfanumérico de 6 dígitos
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sem caracteres ambíguos
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    // Criar hash do código usando Web Crypto API
    const encoder = new TextEncoder();
    const data = encoder.encode(code);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const codeHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Data de expiração: 5 minutos
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Deletar códigos antigos do usuário
    const oldCodes = await base44.asServiceRole.entities.Sistema2FACode.filter({
      user_id: user.id
    });
    
    for (const oldCode of oldCodes) {
      await base44.asServiceRole.entities.Sistema2FACode.delete(oldCode.id);
    }

    // Salvar hash do código
    await base44.asServiceRole.entities.Sistema2FACode.create({
      code_hash: codeHash,
      user_id: user.id,
      expires_at: expiresAt,
      attempts: 0,
      verified: false
    });

    // Buscar todos os admins
    const allUsers = await base44.asServiceRole.entities.User.filter({
      role: 'admin'
    });

    // Enviar e-mail para todos os admins
    const emailPromises = allUsers.map(admin => 
      base44.asServiceRole.integrations.Core.SendEmail({
        from_name: 'Sparta Sync - Sistema',
        to: admin.email,
        subject: '🔐 Código de Acesso ao Sistema',
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1e40af;">Código de Acesso ao Sistema</h2>
            <p>Olá, ${admin.full_name || 'Admin'},</p>
            <p>Um administrador solicitou acesso à área do Sistema. Use o código abaixo para autorizar o acesso:</p>
            <div style="background: #f3f4f6; border-left: 4px solid #1e40af; padding: 20px; margin: 20px 0;">
              <h1 style="font-size: 32px; letter-spacing: 8px; margin: 0; color: #1e40af; text-align: center;">${code}</h1>
            </div>
            <p style="color: #dc2626; font-weight: bold;">⚠️ Este código expira em 5 minutos.</p>
            <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
              Se você não solicitou este código, ignore este e-mail.
            </p>
          </div>
        `
      })
    );

    await Promise.all(emailPromises);

    // NUNCA retornar o código - apenas sucesso
    return Response.json({
      success: true,
      message: 'Código enviado por e-mail para todos os administradores',
      expires_in_minutes: 5
    });

  } catch (error) {
    console.error('Erro ao gerar código 2FA:', error.message);
    return Response.json({ error: 'Erro ao gerar código' }, { status: 500 });
  }
});