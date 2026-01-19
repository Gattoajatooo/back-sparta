// ✅ POLYFILL OBRIGATÓRIO PARA SDK NODE NO DENO
import { Buffer } from "node:buffer"
globalThis.Buffer = Buffer

import { createClientFromRequest } from "npm:@base44/sdk@0.8.6"

/**
 * =========================================================
 * Utils
 * =========================================================
 */
function base64ToBytes(base64) {
  const clean = String(base64 || "").trim()
  const binary = atob(clean)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function cleanMimetype(m) {
  return String(m || "application/octet-stream").split(";")[0].trim().toLowerCase()
}

function guessExtFromMimetype(mimetype) {
  const mt = cleanMimetype(mimetype)
  if (mt === "audio/ogg") return "ogg"
  if (mt === "audio/mpeg") return "mp3"
  if (mt === "audio/mp4") return "m4a"
  if (mt === "audio/aac") return "aac"
  if (mt === "audio/wav") return "wav"
  if (mt === "video/mp4") return "mp4"
  if (mt === "video/quicktime") return "mov"
  if (mt === "image/jpeg") return "jpg"
  if (mt === "image/png") return "png"
  if (mt === "image/webp") return "webp"
  if (mt === "application/pdf") return "pdf"
  const parts = mt.split("/")
  return (parts[1] || "bin").replace(/\W+/g, "") || "bin"
}

function normalizeMediaType(messageType, mimetype) {
  const t = String(messageType || "").toLowerCase().trim()
  const mt = cleanMimetype(mimetype)

  // ✅ nota de voz costuma vir como ptt
  if (t === "ptt" || t === "voice" || t === "voicenote" || t === "voice_note") return "audio"
  if (mt.startsWith("audio/")) return "audio"
  if (t === "image" || mt.startsWith("image/")) return "image"
  if (t === "video" || mt.startsWith("video/")) return "video"
  if (t === "document" || t === "file") return "document"
  if (mt.startsWith("application/")) return "document"
  return "document"
}

function assertMediaKeyLength(mediaKeyBytes) {
  if (!(mediaKeyBytes instanceof Uint8Array) || mediaKeyBytes.length !== 32) {
    throw new Error(`mediaKey inválida: esperado 32 bytes, veio ${mediaKeyBytes?.length}`)
  }
}

function assertAesBlockSize(len) {
  if (len <= 0 || len % 16 !== 0) {
    throw new Error(`Ciphertext inválido p/ AES-CBC: tamanho ${len} não é múltiplo de 16`)
  }
}

function equalBytes(a, b) {
  if (!a || !b || a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

function getAny(obj, keys) {
  if (!obj || typeof obj !== "object") return undefined
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k]
  }
  return undefined
}

/**
 * =========================================================
 * Deep Search (com path) - procura objeto que tenha directPath+mediaKey
 * - Busca no "message" inteiro retornado do Base44 (não só metadata)
 * =========================================================
 */
function deepFindMediaObjectWithPath(root, maxDepth = 8) {
  const seen = new WeakSet()

  const isMediaLike = (node) => {
    const directPath = getAny(node, ["directPath", "direct_path"])
    const mediaKey = getAny(node, ["mediaKey", "media_key"])
    return Boolean(directPath && mediaKey)
  }

  function walk(node, depth, path) {
    if (!node || depth > maxDepth) return null
    if (typeof node !== "object") return null
    if (seen.has(node)) return null
    seen.add(node)

    if (isMediaLike(node)) return { node, path }

    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) {
        const found = walk(node[i], depth + 1, `${path}[${i}]`)
        if (found) return found
      }
      return null
    }

    for (const k of Object.keys(node)) {
      const found = walk(node[k], depth + 1, path ? `${path}.${k}` : k)
      if (found) return found
    }
    return null
  }

  return walk(root, 0, "")
}

/**
 * =========================================================
 * Extrair mídia (com fallback por body)
 *
 * target:
 *  - "auto"    -> body -> message.metadata -> deep search no message todo
 *  - "body"    -> usa só body
 *  - "metadata"-> procura apenas em message.metadata (inclui deep dentro dela)
 *  - "deep"    -> deep search no message todo
 */
function extractMedia(body, message, target = "auto") {
  const mapFromAny = (obj, source, sourcePath = null) => {
    if (!obj) return null
    const directPath = getAny(obj, ["directPath", "direct_path"])
    const mediaKey = getAny(obj, ["mediaKey", "media_key"])
    if (!directPath || !mediaKey) return null

    return {
      directPath,
      mediaKey,
      deprecatedMms3Url: getAny(obj, ["deprecatedMms3Url", "deprecated_mms3_url", "url"]),
      mimetype: getAny(obj, ["mimetype"]) || getAny(body, ["mimetype"]) || message?.mimetype,
      rawType: getAny(obj, ["message_type", "type", "kind"]) || getAny(body, ["type", "kind"]),
      filename:
        getAny(obj, ["filename", "caption", "name"]) ||
        getAny(body, ["filename", "caption", "name"]) ||
        message?.filename ||
        null,
      size: getAny(obj, ["size"]) || null,
      pageCount: getAny(obj, ["pageCount"]) || null,
      source,
      sourcePath,
    }
  }

  // 1) body explícito (resolve quando o Base44 não salvou os campos ainda)
  const fromBody = mapFromAny(body, "requestBody")
  if (target === "body") return fromBody

  // 2) procurar em message.metadata
  const md = message?.metadata
  if (target === "metadata") {
    if (md) {
      const foundInMeta = deepFindMediaObjectWithPath(md, 8)
      return mapFromAny(foundInMeta?.node, "message.metadata", foundInMeta?.path)
    }
    return null
  }

  // auto: tenta body primeiro
  if (fromBody) return fromBody

  // tenta deep dentro do metadata
  if (md) {
    const foundInMeta = deepFindMediaObjectWithPath(md, 8)
    const mapped = mapFromAny(foundInMeta?.node, "message.metadata", foundInMeta?.path)
    if (mapped) return mapped
  }

  // 3) deep search no message inteiro (✅ esse é o que resolve seu caso quando os dados não ficam em metadata)
  const foundInMsg = deepFindMediaObjectWithPath(message, 10)
  const mappedMsg = mapFromAny(foundInMsg?.node, "deepSearch(message)", foundInMsg?.path)
  if (mappedMsg) return mappedMsg

  return null
}

function getDownloadUrl(mediaInfo) {
  // Preferir MMS3 quando existir (comum em ptt/video/document)
  if (mediaInfo.deprecatedMms3Url) return mediaInfo.deprecatedMms3Url
  // fallback
  return `https://mmg.whatsapp.net${mediaInfo.directPath}`
}

/**
 * =========================================================
 * Decrypt WhatsApp Media (HKDF + AES-CBC + MAC)
 * =========================================================
 */
async function decryptWhatsAppMedia(encryptedBytes, mediaKeyBase64, mediaTypeNormalized) {
  const mediaKeyBytes = base64ToBytes(mediaKeyBase64)
  assertMediaKeyLength(mediaKeyBytes)

  const infoMap = {
    image: "WhatsApp Image Keys",
    video: "WhatsApp Video Keys",
    audio: "WhatsApp Audio Keys",
    document: "WhatsApp Document Keys",
  }
  const info = infoMap[mediaTypeNormalized] || "WhatsApp Document Keys"

  const hkdfKey = await crypto.subtle.importKey("raw", mediaKeyBytes, "HKDF", false, ["deriveBits"])
  const expandedBits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(32),
      info: new TextEncoder().encode(info),
    },
    hkdfKey,
    112 * 8
  )

  const expandedKey = new Uint8Array(expandedBits)
  const iv = expandedKey.slice(0, 16)
  const cipherKey = expandedKey.slice(16, 48)
  const macKey = expandedKey.slice(48, 80)

  if (encryptedBytes.length <= 10) throw new Error("Arquivo encriptado muito pequeno")

  const ciphertext = encryptedBytes.slice(0, encryptedBytes.length - 10)
  const fileMac = encryptedBytes.slice(encryptedBytes.length - 10)

  assertAesBlockSize(ciphertext.length)

  // MAC check
  const hmacKey = await crypto.subtle.importKey("raw", macKey, { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  const macData = new Uint8Array(iv.length + ciphertext.length)
  macData.set(iv, 0)
  macData.set(ciphertext, iv.length)

  const macFull = new Uint8Array(await crypto.subtle.sign("HMAC", hmacKey, macData))
  const mac10 = macFull.slice(0, 10)

  if (!equalBytes(mac10, fileMac)) {
    throw new Error(`MAC mismatch (URL ou mediaKey errados). info="${info}" bytes=${encryptedBytes.length}`)
  }

  const aesKey = await crypto.subtle.importKey("raw", cipherKey, { name: "AES-CBC" }, false, ["decrypt"])
  try {
    const decrypted = await crypto.subtle.decrypt({ name: "AES-CBC", iv }, aesKey, ciphertext)
    return new Uint8Array(decrypted)
  } catch {
    throw new Error("Decryption failed")
  }
}

/**
 * =========================================================
 * HANDLER
 * =========================================================
 *
 * Body:
 * {
 *   "message_id": "...",
 *   "target": "auto" | "body" | "metadata" | "deep",
 *   "force_type": "audio" | "video" | "image" | "document" | null,
 *
 *   // ✅ fallback quando Base44 não salvou os campos:
 *   "directPath": "...",
 *   "mediaKey": "...",
 *   "deprecatedMms3Url": "...",
 *   "mimetype": "...",
 *   "type": "...",
 *   "filename": "..."
 * }
 */
Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return Response.json({ success: false, error: "Method Not Allowed" }, { status: 405 })
    }

    const base44 = createClientFromRequest(req)
    const user = await base44.auth.me()
    if (!user) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const message_id = body?.message_id
    const target = body?.target || "auto"
    const force_type = body?.force_type ? String(body.force_type).toLowerCase() : null

    if (!message_id) {
      return Response.json({ success: false, error: "message_id é obrigatório" }, { status: 400 })
    }

    const message = await base44.asServiceRole.entities.Message.get(message_id)

    const mediaInfo = extractMedia(body, message, target)
    if (!mediaInfo) {
      // dica objetiva: mostre se existe metadata e quais chaves tem (bem curto)
      const metaKeys = message?.metadata && typeof message.metadata === "object"
        ? Object.keys(message.metadata).slice(0, 20)
        : []
      throw new Error(
        `Não encontrei mídia (directPath/mediaKey). target=${target}. ` +
          `Se a entidade Message do Base44 não salvou esses campos, envie directPath/mediaKey no body. ` +
          `metadataKeys=${JSON.stringify(metaKeys)}`
      )
    }

    const mimetype = cleanMimetype(mediaInfo.mimetype || message?.mimetype)
    const mediaType = normalizeMediaType(mediaInfo.rawType, mimetype)

    if (force_type && mediaType !== force_type) {
      throw new Error(
        `force_type="${force_type}", mas a mídia encontrada é "${mediaType}". rawType=${mediaInfo.rawType} mimetype=${mimetype} source=${mediaInfo.source}`
      )
    }

    console.log(`[DownloadAndSaveMedia] Encontrado: source=${mediaInfo.source} path=${mediaInfo.sourcePath || ""}`)
    console.log(`[DownloadAndSaveMedia] rawType=${mediaInfo.rawType} | mediaType=${mediaType} | mimetype=${mimetype}`)

    const downloadUrl = getDownloadUrl(mediaInfo)
    console.log(`[DownloadAndSaveMedia] URL download: ${downloadUrl}`)

    const encryptedResponse = await fetch(downloadUrl)
    const ct = encryptedResponse.headers.get("content-type") || ""
    if (!encryptedResponse.ok) {
      throw new Error(`Erro ao baixar mídia: ${encryptedResponse.status} (${ct})`)
    }

    const encryptedBytes = new Uint8Array(await encryptedResponse.arrayBuffer())
    console.log(`[DownloadAndSaveMedia] Download ok. content-type=${ct} bytes=${encryptedBytes.length}`)

    const decryptedMedia = await decryptWhatsAppMedia(encryptedBytes, mediaInfo.mediaKey, mediaType)

    const ext = guessExtFromMimetype(mimetype)
    const filename =
      (mediaInfo.filename && String(mediaInfo.filename).trim()) ||
      message.filename ||
      `${mediaType}_${message.id}.${ext}`

    const file = new File([decryptedMedia], filename, { type: mimetype })
    const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file })
    if (!file_url) throw new Error("Upload não retornou file_url")

    await base44.asServiceRole.entities.Message.update(message_id, {
      media_url: file_url,
      filename,
      mimetype,
      metadata: {
        ...(message.metadata || {}),
        media_downloaded: true,
        media_downloaded_at: new Date().toISOString(),
        media_source: mediaInfo.source,
        media_source_path: mediaInfo.sourcePath || null,
        media_type_normalized: mediaType,
        raw_media_type: mediaInfo.rawType,
        used_mms3_url: Boolean(mediaInfo.deprecatedMms3Url),
        media_size: mediaInfo.size ?? undefined,
        doc_page_count: mediaInfo.pageCount ?? undefined,
      },
    })

    return Response.json({
      success: true,
      media_url: file_url,
      filename,
      mimetype,
      mediaType,
      source: mediaInfo.source,
      sourcePath: mediaInfo.sourcePath || null,
      used_mms3_url: Boolean(mediaInfo.deprecatedMms3Url),
      pageCount: mediaInfo.pageCount ?? null,
      size: mediaInfo.size ?? null,
    })
  } catch (error) {
    console.error("[DownloadAndSaveMedia]", error)
    return Response.json(
      { success: false, error: "Erro ao baixar mídia", details: error?.message || String(error) },
      { status: 500 }
    )
  }
})