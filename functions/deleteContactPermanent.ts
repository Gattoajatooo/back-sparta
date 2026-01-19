import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";

/**
 * Normaliza respostas de list()/filter() que podem vir como array ou envelope.
 * @param {any} resp
 * @returns {any[] | null}
 */
function normalizeListResponse(resp) {
  if (Array.isArray(resp)) return resp;

  if (resp && typeof resp === "object") {
    for (const k of ["items", "data", "records", "results"]) {
      if (Array.isArray(resp[k])) return resp[k];
    }
  }
  return null;
}

/**
 * Lista tudo paginando por skip.
 * Assinatura esperada do SDK: list(sort?, limit?, skip?, fields?)
 * @param {any} handler
 * @param {{ sort?: string, pageSize?: number }} opts
 * @returns {Promise<any[]>}
 */
async function listAll(handler, { sort = "-created_date", pageSize = 200 } = {}) {
  const all = [];
  let skip = 0;

  while (true) {
    const resp = await handler.list(sort, pageSize, skip);
    const batch = normalizeListResponse(resp);

    if (batch === null) {
      console.log("[deleteContactPermanent] ⚠️ list() formato inesperado:", {
        type: typeof resp,
        isArray: Array.isArray(resp),
        keys: resp && typeof resp === "object" ? Object.keys(resp).slice(0, 30) : null,
      });
      return all; // devolve o que já pegou
    }

    all.push(...batch);

    if (batch.length < pageSize) break;
    skip += batch.length;

    if (skip > 200000) {
      console.log("[deleteContactPermanent] ⚠️ Abortando paginação (skip > 200k).");
      break;
    }
  }

  return all;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    console.log("[deleteContactPermanent] 👤 user:", {
      id: user?.id,
      email: user?.email,
      role: user?.role,
      company_id: user?.company_id,
    });

    if (user?.role !== "admin") {
      return Response.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    if (!user?.company_id) {
      return Response.json({ success: false, error: "Usuário admin sem company_id" }, { status: 400 });
    }

    const contactHandler = base44.asServiceRole.entities.Contact;
    if (!contactHandler) {
      return Response.json(
        {
          success: false,
          error: "Entity 'Contact' não existe neste app/ambiente.",
        },
        { status: 500 }
      );
    }

    console.log("[deleteContactPermanent] 🚀 Modo IMEDIATO: deleted === true => excluir agora");
    console.log("[deleteContactPermanent] 🧭 Escopo: apenas company_id =", user.company_id);

    // ===========================
    // 1) TENTA BUSCAR SOMENTE DELETADOS (server-side) se existir .filter()
    // ===========================
    let deletedContacts = [];
    let strategy = "filter(company_id + deleted=true)";

    try {
      const resp = await contactHandler.filter(
        { company_id: user.company_id, deleted: true },
        "-created_date",
        0
      );
      const arr = normalizeListResponse(resp) ?? (Array.isArray(resp) ? resp : []);
      deletedContacts = arr;
    } catch (e) {
      console.log("[deleteContactPermanent] ⚠️ Contact.filter falhou, vou fazer listAll + filtro em memória:", e?.message || String(e));
      strategy = "listAll + inMemory(company_id + deleted=true)";

      const allContacts = await listAll(contactHandler, { pageSize: 200 });
      const hasCompanyIdField = allContacts.some((c) => typeof c?.company_id === "string");

      if (!hasCompanyIdField) {
        // Segurança: se não dá pra escopar por company_id, não apaga “no escuro”
        return Response.json(
          {
            success: false,
            error:
              "Não encontrei campo company_id nos contatos retornados; por segurança não vou deletar sem escopo. Verifique o schema da entity Contact.",
            debug_info: {
              strategy,
              total_contacts_listed: allContacts.length,
              sample_keys: allContacts[0] ? Object.keys(allContacts[0]).slice(0, 40) : [],
            },
          },
          { status: 500 }
        );
      }

      deletedContacts = allContacts.filter(
        (c) => c?.company_id === user.company_id && c?.deleted === true
      );
    }

    console.log("[deleteContactPermanent] 🧠 Estratégia usada:", strategy);
    console.log("[deleteContactPermanent] 📌 Contatos marcados como deleted=true (escopados):", deletedContacts.length);

    if (deletedContacts.length === 0) {
      return Response.json({
        success: true,
        message: "Nenhum contato marcado como deleted=true para excluir agora.",
        deleted_count: 0,
        debug_info: {
          strategy,
          company_id: user.company_id,
        },
      });
    }

    // ===========================
    // 2) DELETAR EM LOTES (rápido, sem esperar dias)
    // ===========================
    const BATCH_SIZE = 20; // concorrência por lote
    let deletedCount = 0;
    const errors = [];

    for (let i = 0; i < deletedContacts.length; i += BATCH_SIZE) {
      const batch = deletedContacts.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map((c) => contactHandler.delete(c.id))
      );

      results.forEach((r, idx) => {
        const contact = batch[idx];
        if (r.status === "fulfilled") {
          deletedCount++;
        } else {
          errors.push({
            contact_id: contact?.id,
            contact_name: `${contact?.first_name || ""} ${contact?.last_name || ""}`.trim() || contact?.name || "",
            error: r.reason?.message || String(r.reason),
          });
        }
      });

      if (deletedCount % 100 === 0) {
        console.log(`[deleteContactPermanent] ✅ Progresso: ${deletedCount}/${deletedContacts.length} deletados`);
      }
    }

    return Response.json({
      success: true,
      message: `${deletedCount} contatos deletados permanentemente (deleted=true => imediato)`,
      deleted_count: deletedCount,
      total_marked_deleted: deletedContacts.length,
      errors: errors.length ? errors : undefined,
      debug_info: {
        strategy,
        company_id: user.company_id,
      },
    });
  } catch (error) {
    console.error("[deleteContactPermanent] Erro:", error);
    return Response.json(
      { success: false, error: error?.message || String(error) },
      { status: 500 }
    );
  }
});
