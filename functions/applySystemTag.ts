import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Aplica marcador do sistema a um contato baseado em um erro
 * @param contact_id - ID do contato
 * @param error_type - Tipo de erro (invalid_number, number_not_exists, etc.)
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const { contact_id, error_type, company_id } = await req.json();

        if (!contact_id || !error_type) {
            return Response.json({
                success: false,
                error: 'contact_id e error_type são obrigatórios'
            }, { status: 400 });
        }

        // Buscar o marcador do sistema correspondente
        const systemTags = await base44.asServiceRole.entities.SystemTag.filter({
            trigger_event: error_type,
            is_active: true
        });

        if (systemTags.length === 0) {
            console.log(`Nenhum marcador do sistema encontrado para o erro: ${error_type}`);
            return Response.json({
                success: false,
                message: `Nenhum marcador do sistema configurado para: ${error_type}`
            });
        }

        const systemTag = systemTags[0];

        // Buscar o contato
        const contact = await base44.asServiceRole.entities.Contact.get(contact_id);
        
        if (!contact) {
            return Response.json({
                success: false,
                error: 'Contato não encontrado'
            }, { status: 404 });
        }

        // Verificar se o contato já possui este marcador do sistema
        const currentSystemTags = contact.tags_system || [];
        const tagId = systemTag.id;
        const tagName = systemTag.name;

        if (currentSystemTags.includes(tagId)) {
            return Response.json({
                success: true,
                message: 'Contato já possui este marcador do sistema',
                tag_applied: false,
                tag_id: tagId,
                tag_name: tagName
            });
        }

        // Adicionar o ID do marcador do sistema ao array tags_system
        const updatedSystemTags = [...currentSystemTags, tagId];
        
        await base44.asServiceRole.entities.Contact.update(contact_id, {
            tags_system: updatedSystemTags
        });

        console.log(`Marcador do sistema "${tagName}" (ID: ${tagId}) aplicado ao contato ${contact_id}`);

        return Response.json({
            success: true,
            message: `Marcador do sistema "${tagName}" aplicado com sucesso`,
            tag_applied: true,
            tag_id: tagId,
            tag_name: tagName,
            contact_id: contact_id
        });

    } catch (error) {
        console.error('Erro ao aplicar marcador do sistema:', error);
        return Response.json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        }, { status: 500 });
    }
});