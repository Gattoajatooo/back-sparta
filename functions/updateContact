import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    const traceId = crypto.randomUUID();
    console.log(`[${traceId}] 🚀 INÍCIO updateContact`);

    try {
        // ========== AUTENTICAÇÃO ==========
        const authHeader = req.headers.get("Authorization");
        const expectedApiKey = Deno.env.get("EXTERNAL_API_KEY");

        console.log(`[${traceId}] 🔐 Auth header recebido:`, authHeader ? `Bearer ${authHeader.slice(7, 13)}...` : 'AUSENTE');

        if (!expectedApiKey) {
            console.error(`[${traceId}] ❌ EXTERNAL_API_KEY não configurada!`);
            return Response.json({
                success: false,
                error: "Configuração ausente"
            }, { status: 500 });
        }

        if (authHeader !== `Bearer ${expectedApiKey}`) {
            console.warn(`[${traceId}] ❌ Autenticação inválida`);
            return Response.json({
                success: false,
                error: "Não autorizado"
            }, { status: 401 });
        }

        console.log(`[${traceId}] ✅ Autenticação OK`);

        // ========== PARSE DO BODY ==========
        let body;
        try {
            body = await req.json();
        } catch (parseError) {
            console.error(`[${traceId}] ❌ Erro ao fazer parse do JSON:`, parseError);
            return Response.json({
                success: false,
                error: "JSON inválido no body"
            }, { status: 400 });
        }

        console.log(`[${traceId}] 📦 Body recebido:`, JSON.stringify(body, null, 2));

        const { contact_id, document_number, ...updateFields } = body;

        // ========== VALIDAÇÕES ==========
        if (!contact_id && !document_number) {
            console.error(`[${traceId}] ❌ Nenhum identificador fornecido`);
            return Response.json({
                success: false,
                error: "É necessário fornecer contact_id ou document_number"
            }, { status: 400 });
        }

        if (Object.keys(updateFields).length === 0) {
            console.warn(`[${traceId}] ⚠️ Nenhum campo para atualizar`);
            return Response.json({
                success: false,
                error: "Nenhum campo para atualizar fornecido"
            }, { status: 400 });
        }

        console.log(`[${traceId}] 📝 Identificadores recebidos:`, { contact_id, document_number });
        console.log(`[${traceId}] 📝 Campos para atualizar:`, updateFields);

        // ========== BUSCAR CONTATO ==========
        const base44 = createClientFromRequest(req);
        let existingContact;

        // Priorizar busca por contact_id se fornecido
        if (contact_id) {
            console.log(`[${traceId}] 🔍 Buscando contato por ID: ${contact_id}`);
            
            try {
                existingContact = await base44.asServiceRole.entities.Contact.get(contact_id);
            } catch (getError) {
                console.error(`[${traceId}] ❌ Erro ao buscar contato por ID:`, getError);
                return Response.json({
                    success: false,
                    error: "Erro ao buscar contato",
                    details: getError.message
                }, { status: 500 });
            }
        } else {
            // Buscar por document_number
            console.log(`[${traceId}] 🔍 Buscando contato por document_number: ${document_number}`);
            
            try {
                const contacts = await base44.asServiceRole.entities.Contact.filter({
                    document_number: document_number
                });

                if (!contacts || contacts.length === 0) {
                    console.error(`[${traceId}] ❌ Nenhum contato encontrado com document_number: ${document_number}`);
                    return Response.json({
                        success: false,
                        error: "Contato não encontrado",
                        document_number: document_number
                    }, { status: 404 });
                }

                if (contacts.length > 1) {
                    console.warn(`[${traceId}] ⚠️ Múltiplos contatos encontrados com document_number: ${document_number}`);
                }

                existingContact = contacts[0];
            } catch (filterError) {
                console.error(`[${traceId}] ❌ Erro ao buscar contato por document_number:`, filterError);
                return Response.json({
                    success: false,
                    error: "Erro ao buscar contato",
                    details: filterError.message
                }, { status: 500 });
            }
        }

        if (!existingContact) {
            console.error(`[${traceId}] ❌ Contato não encontrado`);
            return Response.json({
                success: false,
                error: "Contato não encontrado",
                search_criteria: contact_id ? { contact_id } : { document_number }
            }, { status: 404 });
        }

        console.log(`[${traceId}] ✅ Contato encontrado:`, {
            id: existingContact.id,
            first_name: existingContact.first_name,
            last_name: existingContact.last_name,
            document_number: existingContact.document_number,
            company_id: existingContact.company_id
        });

        // ========== ATUALIZAR CONTATO ==========
        console.log(`[${traceId}] 💾 Atualizando contato...`);

        let updatedContact;
        try {
            updatedContact = await base44.asServiceRole.entities.Contact.update(
                existingContact.id,
                updateFields
            );
        } catch (updateError) {
            console.error(`[${traceId}] ❌ Erro ao atualizar contato:`, updateError);
            return Response.json({
                success: false,
                error: "Erro ao atualizar contato",
                details: updateError.message
            }, { status: 500 });
        }

        console.log(`[${traceId}] ✅ Contato atualizado com sucesso!`);
        console.log(`[${traceId}] 📊 Dados atualizados:`, updatedContact);

        // ========== RESPOSTA DE SUCESSO ==========
        return Response.json({
            success: true,
            message: "Contato atualizado com sucesso",
            traceId: traceId,
            search_method: contact_id ? "contact_id" : "document_number",
            contact: {
                id: updatedContact.id,
                first_name: updatedContact.first_name,
                last_name: updatedContact.last_name,
                email: updatedContact.email,
                phone: updatedContact.phone,
                document_number: updatedContact.document_number,
                company_id: updatedContact.company_id,
                ...updateFields
            }
        }, { status: 200 });

    } catch (error) {
        console.error(`[${traceId}] ❌ ERRO INESPERADO:`, error);
        return Response.json({
            success: false,
            error: "Erro interno do servidor",
            traceId: traceId,
            details: error.message,
            stack: error.stack
        }, { status: 500 });
    }
});