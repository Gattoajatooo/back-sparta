import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);

    try {
        const user = await base44.auth.me();
        if (!user) {
            return new Response(JSON.stringify({ success: false, error: 'Usuário não autenticado. Faça o login para aceitar o convite.' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }

        const { token } = await req.json();
        if (!token) {
            return new Response(JSON.stringify({ success: false, error: 'Token de convite ausente.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        
        // Use Service Role to find the invitation
        const invitations = await base44.asServiceRole.entities.Invitation.filter({ token: token, status: 'pending' });

        if (invitations.length === 0) {
            return new Response(JSON.stringify({ success: false, error: 'Convite inválido ou já utilizado.' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
        }

        const invitation = invitations[0];

        // Check if invitation is expired
        if (new Date(invitation.expires_at) < new Date()) {
            await base44.asServiceRole.entities.Invitation.update(invitation.id, { status: 'expired' });
            return new Response(JSON.stringify({ success: false, error: 'Este convite expirou. Peça um novo convite.' }), { status: 410, headers: { 'Content-Type': 'application/json' } });
        }
        
        // Check if the logged-in user's email matches the invitation email
        if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
            return new Response(JSON.stringify({ success: false, error: `Convite enviado para ${invitation.email}, mas você está logado como ${user.email}. Por favor, use a conta correta.` }), { status: 403, headers: { 'Content-Type': 'application/json' } });
        }

        // Check if user is already part of a company (Allow switching, but log it)
        if (user.company_id) {
             console.log(`User ${user.id} is switching from company ${user.company_id} to ${invitation.company_id}`);
        }

        // All checks passed, update user and invitation
        await base44.asServiceRole.entities.User.update(user.id, {
            company_id: invitation.company_id,
            role_id: invitation.role_id,
            system_role: invitation.system_role || null,
            full_name: user.full_name || invitation.full_name,
            first_login_completed: true,
            is_active: true
        });

        await base44.asServiceRole.entities.Invitation.update(invitation.id, {
            status: 'accepted'
        });

        // Verificar se a empresa existe usando service role
        try {
            const company = await base44.asServiceRole.entities.Company.get(invitation.company_id);
            if (!company) {
                throw new Error('Empresa não encontrada');
            }
            
            console.log(`✓ User ${user.id} successfully joined company ${company.id} (${company.name})`);
        } catch (companyError) {
            console.error('Company verification failed:', companyError);
            return new Response(JSON.stringify({ 
                success: false, 
                error: 'A empresa associada a este convite não foi encontrada. Entre em contato com o administrador.' 
            }), { status: 404, headers: { 'Content-Type': 'application/json' } });
        }

        return new Response(JSON.stringify({ 
            success: true, 
            message: 'Convite aceito com sucesso!',
            company_id: invitation.company_id
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        console.error('Error in acceptInvitation function:', error);
        return new Response(JSON.stringify({ success: false, error: 'Erro interno do servidor.', details: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
});