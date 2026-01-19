import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);

    try {
        const user = await base44.auth.me();
        if (!user) {
            return new Response(JSON.stringify({ success: false, error: 'Usuário não autenticado.' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }

        // Buscar todos os convites pending
        const allPendingInvites = await base44.asServiceRole.entities.Invitation.filter({
            status: 'pending'
        });

        // Busca manual com comparação case insensitive para garantir compatibilidade
        const pendingInvitesManual = allPendingInvites.filter(invite => 
            invite.email.toLowerCase() === user.email.toLowerCase() && invite.status === 'pending'
        );

        // Filtrar convites não expirados
        const validInvites = pendingInvitesManual.filter(invite => {
            const expiresAt = new Date(invite.expires_at);
            const now = new Date();
            return expiresAt > now;
        });

        if (validInvites.length === 0) {
            return new Response(JSON.stringify({ 
                success: true, 
                has_invitation: false
            }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        // Retornar o primeiro convite válido
        const invitation = validInvites[0];

        return new Response(JSON.stringify({ 
            success: true, 
            has_invitation: true,
            invitation: {
                id: invitation.id,
                company_name: invitation.company_name,
                company_id: invitation.company_id,
                role_id: invitation.role_id,
                system_role: invitation.system_role,
                invited_by_name: invitation.invited_by_name,
                token: invitation.token
            }
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        console.error('Error checking pending invitation:', error);
        return new Response(JSON.stringify({ success: false, error: 'Erro interno do servidor.', details: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
});