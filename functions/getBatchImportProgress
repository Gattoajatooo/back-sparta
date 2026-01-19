import { createClientFromRequest } from 'npm:@base44/sdk@0.5.0';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        if (!(await base44.auth.isAuthenticated())) {
            return new Response(JSON.stringify({ 
                success: false,
                error: 'Não autorizado' 
            }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const { import_job_id } = await req.json();

        // Como agora usamos importação síncrona, qualquer job ID que chegue aqui
        // significa que a importação já foi concluída
        return new Response(JSON.stringify({
            success: true,
            job_id: import_job_id || 'sync_import',
            status: 'completed',
            completed: true,
            progress_percentage: 100,
            message: 'Importação já foi concluída de forma síncrona'
        }), {
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });

    } catch (error) {
        console.error('Erro ao verificar progresso:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Erro interno',
            details: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});