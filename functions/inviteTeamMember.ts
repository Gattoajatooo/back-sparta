import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// ✅ NOVO: Rate limiting simples em memória
const inviteAttempts = new Map();

function checkRateLimit(userId) {
    const now = Date.now();
    const userAttempts = inviteAttempts.get(userId) || { count: 0, resetAt: now };
    
    // Resetar se passou do tempo
    if (now > userAttempts.resetAt) {
        userAttempts.count = 0;
        userAttempts.resetAt = now + (5 * 60 * 1000); // 5 minutos
    }
    
    // Verificar limite
    if (userAttempts.count >= 5) {
        const waitTime = Math.ceil((userAttempts.resetAt - now) / 1000 / 60);
        return { allowed: false, waitTime };
    }
    
    // Incrementar contador
    userAttempts.count++;
    inviteAttempts.set(userId, userAttempts);
    
    return { allowed: true };
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        if (!(await base44.auth.isAuthenticated())) {
            return Response.json({ success: false, error: 'Não autenticado' }, { status: 401 });
        }

        const currentUser = await base44.auth.me();
        if (!currentUser) {
            return Response.json({ success: false, error: 'Usuário não encontrado' }, { status: 401 });
        }

        const { email, role_id, system_role, target_company_id } = await req.json();

        if (!email) {
            return Response.json({ success: false, error: 'Email é obrigatório' }, { status: 400 });
        }

        // ✅ NOVO: Determinar qual empresa usar
        // Se target_company_id foi fornecido E o usuário atual é admin global, usar ele
        // Caso contrário, usar a empresa do usuário atual
        let companyId;
        let companyName;

        if (target_company_id && currentUser.role === 'admin') {
            console.log(`[InviteTeamMember] Admin global convidando para empresa ${target_company_id}`);
            
            try {
                const targetCompany = await base44.asServiceRole.entities.Company.get(target_company_id);
                if (!targetCompany) {
                    return Response.json({ 
                        success: false, 
                        error: 'Empresa alvo não encontrada' 
                    }, { status: 404 });
                }
                
                companyId = targetCompany.id;
                companyName = targetCompany.name;
            } catch (error) {
                console.error('[InviteTeamMember] Erro ao buscar empresa alvo:', error);
                return Response.json({ 
                    success: false, 
                    error: 'Erro ao buscar empresa alvo' 
                }, { status: 500 });
            }
        } else {
            // Convite normal: usar a empresa do usuário atual
            if (!currentUser.company_id) {
                return Response.json({ 
                    success: false, 
                    error: 'Usuário não possui empresa' 
                }, { status: 400 });
            }
            
            companyId = currentUser.company_id;
            
            try {
                const userCompany = await base44.entities.Company.get(companyId);
                companyName = userCompany?.name || 'Empresa';
            } catch (error) {
                console.error('[InviteTeamMember] Erro ao buscar empresa:', error);
                companyName = 'Empresa';
            }
        }

        console.log(`[InviteTeamMember] Convidando ${email} para ${companyName} (${companyId})`);

        // Rate limiting
        const rateLimitCheck = checkRateLimit(currentUser.id);
        if (!rateLimitCheck.allowed) {
            return Response.json({
                success: false,
                error: `Limite de convites excedido. Tente novamente em ${rateLimitCheck.waitTime} minutos.`
            }, { status: 429 });
        }

        // Verificar se o email já existe no sistema
        let existingUser = null;
        try {
            const users = await base44.asServiceRole.entities.User.filter({ email });
            existingUser = users.length > 0 ? users[0] : null;
        } catch (error) {
            console.error('[InviteTeamMember] Erro ao verificar usuário:', error);
        }

        // Verificar convites pendentes
        const pendingInvites = await base44.asServiceRole.entities.Invitation.filter({
            email,
            company_id: companyId,
            status: 'pending'
        });

        if (pendingInvites.length > 0) {
            return Response.json({
                success: false,
                error: 'Já existe um convite pendente para este email nesta empresa'
            }, { status: 409 });
        }

        // Se usuário existe e já está na mesma empresa
        if (existingUser && existingUser.company_id === companyId) {
            return Response.json({
                success: false,
                error: 'Este usuário já faz parte desta empresa'
            }, { status: 409 });
        }

        // Gerar token único
        const token = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        // Criar convite
        const invitationData = {
            email,
            company_id: companyId,
            company_name: companyName,
            token,
            status: 'pending',
            expires_at: expiresAt.toISOString(),
            invited_by_name: currentUser.full_name,
            role_id: role_id || null,
            system_role: system_role || null
        };

        // Se usuário existe, adicionar info da empresa anterior
        if (existingUser && existingUser.company_id) {
            try {
                const previousCompany = await base44.asServiceRole.entities.Company.get(existingUser.company_id);
                invitationData.previous_company_name = previousCompany?.name || null;
            } catch (error) {
                console.error('[InviteTeamMember] Erro ao buscar empresa anterior:', error);
            }
        }

        const invitation = await base44.asServiceRole.entities.Invitation.create(invitationData);

        // Enviar notificação se usuário existe
        if (existingUser) {
            try {
                await base44.asServiceRole.entities.Notification.create({
                    user_id: existingUser.id,
                    title: 'Novo Convite de Equipe',
                    message: `Você foi convidado para fazer parte da empresa ${companyName}`,
                    type: 'team_invitation',
                    is_read: false,
                    link: `/accept-invitation?token=${token}`,
                    metadata: {
                        invitation_id: invitation.id,
                        company_id: companyId,
                        company_name: companyName
                    }
                });
                console.log('[InviteTeamMember] ✅ Notificação criada para usuário existente');
            } catch (notifError) {
                console.error('[InviteTeamMember] Erro ao criar notificação:', notifError);
            }
        }

        // Enviar email de convite
        const inviteUrl = `${Deno.env.get('BASE44_APP_URL')}/accept-invitation?token=${token}`;
        
        try {
            await base44.asServiceRole.integrations.Core.SendEmail({
                to: email,
                subject: `Convite para ${companyName} - Sparta Sync`,
                body: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #2563eb;">Você foi convidado!</h2>
                        <p>Olá,</p>
                        <p>${currentUser.full_name} convidou você para fazer parte da equipe da empresa <strong>${companyName}</strong> no Sparta Sync.</p>
                        
                        ${existingUser && existingUser.company_id ? `
                            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0;">
                                <strong>⚠️ Atenção:</strong> Ao aceitar este convite, você será transferido da sua empresa atual para ${companyName}.
                            </div>
                        ` : ''}
                        
                        <p style="margin: 30px 0;">
                            <a href="${inviteUrl}" 
                               style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
                                Aceitar Convite
                            </a>
                        </p>
                        
                        <p style="color: #666; font-size: 12px;">
                            Este convite expira em 7 dias.
                        </p>
                        
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
                        
                        <p style="color: #666; font-size: 12px;">
                            Se você não solicitou este convite, pode ignorar este email com segurança.
                        </p>
                    </div>
                `
            });
            console.log('[InviteTeamMember] ✅ Email enviado com sucesso');
        } catch (emailError) {
            console.error('[InviteTeamMember] Erro ao enviar email:', emailError);
        }

        return Response.json({
            success: true,
            message: 'Convite enviado com sucesso',
            data: {
                invitation_id: invitation.id,
                email,
                company_name: companyName,
                expires_at: invitation.expires_at,
                invite_url: inviteUrl
            }
        }, { status: 201 });

    } catch (error) {
        console.error('[InviteTeamMember] Erro geral:', error);
        return Response.json({
            success: false,
            error: 'Erro ao processar convite',
            details: error.message
        }, { status: 500 });
    }
});