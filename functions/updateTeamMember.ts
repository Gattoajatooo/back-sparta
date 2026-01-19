import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // 1. Autentica o usuário que está fazendo a chamada
        const callingUser = await base44.auth.me();
        if (!callingUser) {
            return new Response(JSON.stringify({ success: false, error: 'Autenticação necessária.' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }

        const { userIdToUpdate, data } = await req.json();
        if (!userIdToUpdate || !data) {
            return new Response(JSON.stringify({ success: false, error: 'ID do usuário e dados para atualização são obrigatórios.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        // 2. Usa a service role para buscar o usuário que será atualizado
        const userToUpdate = await base44.asServiceRole.entities.User.get(userIdToUpdate);

        // 3. VERIFICAÇÃO DE SEGURANÇA: 
        // Admin do sistema (role == 'admin') pode atualizar qualquer usuário
        // Usuários normais só podem atualizar usuários da mesma empresa
        if (callingUser.role !== 'admin') {
            if (!callingUser.company_id || userToUpdate.company_id !== callingUser.company_id) {
                return new Response(JSON.stringify({ success: false, error: 'Você não tem autorização para atualizar este usuário.' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
            }
        }

        // 4. Realiza a atualização usando a service role
        const updatedUser = await base44.asServiceRole.entities.User.update(userIdToUpdate, data);

        return new Response(JSON.stringify({ success: true, data: updatedUser }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        console.error('Erro na função updateTeamMember:', error);
        return new Response(JSON.stringify({ success: false, error: 'Erro interno do servidor.', details: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
});