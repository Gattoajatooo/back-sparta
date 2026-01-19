import { createClientFromRequest } from 'npm:@base44/sdk@0.7.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user || user.role !== 'admin') {
            return Response.json({
                success: false,
                error: 'Acesso negado'
            }, { status: 403 });
        }
        
        // Buscar todas as features ativas
        const features = await base44.entities.Feature.filter({ is_active: true }, 'name');
        
        return Response.json({
            success: true,
            features: features
        });
        
    } catch (error) {
        console.error('Erro ao buscar features:', error);
        return Response.json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        }, { status: 500 });
    }
});