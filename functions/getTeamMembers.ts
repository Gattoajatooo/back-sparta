import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);

    try {
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ success: false, error: 'Usuário não autenticado.' }, { status: 401 });
        }

        let teamMembers;

        if (user.role === 'admin') {
            console.log('Admin do sistema - buscando TODOS os usuários');
            teamMembers = await base44.asServiceRole.entities.User.list();
        } else if (user.company_id) {
            console.log('Usuário normal - buscando apenas da empresa:', user.company_id);
            teamMembers = await base44.asServiceRole.entities.User.filter({
                company_id: user.company_id
            });
            
            // Incluir também convites pendentes desta empresa
            const invitations = await base44.asServiceRole.entities.Invitation.filter({
                company_id: user.company_id,
                status: 'pending'
            });
            
            console.log(`Encontrados ${teamMembers.length} membros e ${invitations.length} convites pendentes`);
        } else {
            return Response.json({ success: false, error: 'Usuário não pertence a uma empresa.' }, { status: 400 });
        }

        return Response.json({ success: true, team_members: teamMembers });

    } catch (error) {
        console.error('Erro ao buscar membros da equipe:', error);
        return Response.json({ success: false, error: 'Erro interno do servidor.', details: error.message }, { status: 500 });
    }
});