import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);

    try {
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ success: false, error: 'Usuário não autenticado.' }, { status: 401 });
        }

        const { user_id_to_remove } = await req.json();

        if (!user_id_to_remove) {
            return Response.json({ success: false, error: 'ID do usuário é obrigatório.' }, { status: 400 });
        }

        // Buscar usuário a ser removido
        const userToRemove = await base44.asServiceRole.entities.User.get(user_id_to_remove);
        if (!userToRemove) {
            return Response.json({ success: false, error: 'Usuário não encontrado.' }, { status: 404 });
        }

        // Verificar permissões
        const isAdmin = user.role === 'admin';
        const isCompanyAdmin = user.system_role === 'admin' && user.company_id === userToRemove.company_id;
        const isSelfRemoval = user.id === user_id_to_remove;

        // Apenas admins do sistema, admins da empresa ou o próprio usuário podem remover
        if (!isAdmin && !isCompanyAdmin && !isSelfRemoval) {
            return Response.json({ 
                success: false, 
                error: 'Você não tem permissão para remover este usuário.' 
            }, { status: 403 });
        }

        // Não permitir remover o proprietário (owner) da empresa
        if (userToRemove.system_role === 'owner') {
            return Response.json({ 
                success: false, 
                error: 'Não é possível remover o proprietário da empresa.' 
            }, { status: 403 });
        }

        // Preparar dados de atualização
        const updateData = {
            company_id: null,
            role_id: null,
            is_active: true // Mantém ativo para que possa criar/entrar em outra empresa
        };

        // Se o usuário tinha uma empresa anterior, restaurar
        if (userToRemove.previous_company_id) {
            console.log('Restaurando usuário para empresa anterior:', userToRemove.previous_company_id);
            updateData.company_id = userToRemove.previous_company_id;
            updateData.previous_company_id = null;
        }

        // Atualizar usuário
        await base44.asServiceRole.entities.User.update(user_id_to_remove, updateData);

        console.log('Usuário removido da equipe:', user_id_to_remove);

        // Criar log de auditoria
        try {
            await base44.asServiceRole.entities.SystemLog.create({
                company_id: user.company_id,
                user_id: user.id,
                action: 'remove_team_member',
                resource_type: 'user',
                resource_id: user_id_to_remove,
                status: 'success',
                method: 'POST',
                endpoint: '/functions/removeUserFromTeam',
                metadata: {
                    removed_user_email: userToRemove.email,
                    restored_to_previous_company: !!userToRemove.previous_company_id
                }
            });
        } catch (logError) {
            console.error('Erro ao criar log:', logError);
        }

        return Response.json({ 
            success: true, 
            message: 'Usuário removido da equipe com sucesso.',
            restored_to_previous: !!userToRemove.previous_company_id
        });

    } catch (error) {
        console.error('Erro ao remover usuário da equipe:', error);
        return Response.json({ 
            success: false, 
            error: 'Erro interno do servidor.', 
            details: error.message 
        }, { status: 500 });
    }
});