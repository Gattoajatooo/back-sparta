import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

const defaultSystemTags = [
  {
    name: "Número Inválido",
    slug: "invalid_number",
    description: "Contato com número de telefone inválido ou incorreto",
    color: "#ef4444",
    icon: "XCircle",
    trigger_event: "invalid_number",
    auto_remove: false,
    priority: 100
  },
  {
    name: "Número Não Existe",
    slug: "number_not_exists",
    description: "Número não existe no WhatsApp",
    color: "#f97316",
    icon: "AlertCircle",
    trigger_event: "number_not_exists",
    auto_remove: false,
    priority: 90
  },
  {
    name: "Sessão Desconectada",
    slug: "session_disconnected",
    description: "Falha no envio devido a sessão desconectada",
    color: "#eab308",
    icon: "WifiOff",
    trigger_event: "session_disconnected",
    auto_remove: true,
    priority: 80
  },
  {
    name: "Taxa Excedida",
    slug: "rate_limit",
    description: "Limite de taxa de envio excedido",
    color: "#f59e0b",
    icon: "AlertTriangle",
    trigger_event: "rate_limit",
    auto_remove: true,
    priority: 70
  },
  {
    name: "Timeout",
    slug: "timeout",
    description: "Tempo de envio excedido",
    color: "#6b7280",
    icon: "Clock",
    trigger_event: "timeout",
    auto_remove: true,
    priority: 60
  },
  {
    name: "Erro Desconhecido",
    slug: "unknown_error",
    description: "Erro desconhecido no envio",
    color: "#9ca3af",
    icon: "HelpCircle",
    trigger_event: "unknown_error",
    auto_remove: false,
    priority: 50
  }
];

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verificar autenticação
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ 
                success: false, 
                error: 'Não autenticado' 
            }, { status: 401 });
        }

        // Verificar se é admin
        if (user.role !== 'admin') {
            return Response.json({ 
                success: false, 
                error: 'Apenas administradores podem executar esta função' 
            }, { status: 403 });
        }

        // Buscar marcadores existentes
        const existingTags = await base44.asServiceRole.entities.SystemTag.list();
        const existingSlugs = new Set(existingTags.map(t => t.slug));

        // Criar apenas os que não existem
        const tagsToCreate = defaultSystemTags.filter(tag => !existingSlugs.has(tag.slug));
        
        if (tagsToCreate.length === 0) {
            return Response.json({
                success: true,
                message: 'Todos os marcadores do sistema já existem',
                existing_count: existingTags.length
            });
        }

        const createdTags = [];
        for (const tagData of tagsToCreate) {
            try {
                const created = await base44.asServiceRole.entities.SystemTag.create(tagData);
                createdTags.push(created);
            } catch (error) {
                console.error(`Erro ao criar marcador ${tagData.slug}:`, error);
            }
        }

        return Response.json({
            success: true,
            message: `${createdTags.length} marcador(es) do sistema criado(s) com sucesso`,
            created: createdTags,
            total_tags: existingTags.length + createdTags.length
        });

    } catch (error) {
        console.error('Erro ao inicializar marcadores do sistema:', error);
        return Response.json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        }, { status: 500 });
    }
});