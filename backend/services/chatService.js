import crypto from "crypto"
import mongoose from "mongoose"
import Conversation, { MAX_PRODUCT_SETS } from "../Model/conversationModel.js"
import Message, { USER_SENDER, ASSISTANT_SENDER } from "../Model/messageModel.js"
import * as rag from "./ragClient.js"
import { getProductsByIds } from "./productService.js"

/*
 * Message counting / summary policy
 * - unsummarizedMessageCount = number of persisted messages (User AND Assistent) whose _id is greater than
 *   summarizedThroughMessageId. A completed turn adds 2; failed turns add nothing (nothing is persisted).
 * - Before a new turn is processed, if the count is >= SUMMARY_THRESHOLD (10 = 5 turns), the previous summary
 *   plus exactly those messages (oldest first) are sent to /summarization/summarize. On success the summary,
 *   boundary and counter are updated in one conditional write guarded by summaryVersion. On failure nothing
 *   changes, so the same messages are retried on the next turn.
 */
export const SUMMARY_THRESHOLD = Number(process.env.SUMMARY_THRESHOLD) || 10
export const MAX_QUERY_LENGTH = 2000
const RECENT_CONTEXT_LIMIT = Number(process.env.RECENT_CONTEXT_LIMIT) || 12
const MAX_SUMMARY_BATCH = 50
const LOCK_TTL_MS = Number(process.env.CHAT_LOCK_TTL_MS) || 120000

export class ChatError extends Error {
    constructor(status, message, code) {
        super(message)
        this.status = status
        this.code = code
    }
}

export const validateQuery = (raw) => {
    const query = typeof raw === "string" ? raw.trim() : ""
    if (!query) throw new ChatError(400, "Query is required.", "invalid_query")
    if (query.length > MAX_QUERY_LENGTH) throw new ChatError(400, `Query must be at most ${MAX_QUERY_LENGTH} characters.`, "invalid_query")
    return query
}

export const isObjectIdString = (id) => typeof id === "string" && /^[a-f0-9]{24}$/i.test(id)

// Optional client-supplied id (Idempotency-Key header or body.clientRequestId) used to de-duplicate retries.
export const getRequestId = (req) => {
    const value = req.get?.("Idempotency-Key") ?? req.body?.clientRequestId
    return typeof value === "string" && /^[A-Za-z0-9_-]{8,100}$/.test(value) ? value : undefined
}

// ------------------------------------------------------------------ per-conversation lock
export const newLock = () => ({ id: crypto.randomUUID(), startedAt: new Date() })

export const acquireLock = async (chatId, userId) => {
    const lock = newLock()
    const conversation = await Conversation.findOneAndUpdate(
        {
            _id: chatId,
            userId,
            $or: [{ "activeRequest.id": null }, { "activeRequest.startedAt": { $lt: new Date(Date.now() - LOCK_TTL_MS) } }]
        },
        { $set: { "activeRequest.id": lock.id, "activeRequest.startedAt": lock.startedAt } },
        { returnDocument: "after" }
    )
    if (conversation) return { conversation, lockId: lock.id }
    const existing = await Conversation.findById(chatId).select("userId").lean()
    if (!existing) throw new ChatError(404, "No chat found", "not_found")
    if (existing.userId?.toString() !== userId) throw new ChatError(403, "Forbidden", "forbidden")
    throw new ChatError(409, "A previous message in this chat is still being processed. Please wait.", "busy")
}

export const releaseLock = (chatId, lockId) =>
    Conversation.updateOne(
        { _id: chatId, "activeRequest.id": lockId },
        { $set: { "activeRequest.id": null, "activeRequest.startedAt": null } }
    ).catch((error) => console.warn("[Chat] Failed to release lock:", error.message))

// ------------------------------------------------------------------ context + summarization
const unsummarizedFilter = (conversation) => ({
    conversationId: conversation._id,
    ...(conversation.summarizedThroughMessageId ? { _id: { $gt: conversation.summarizedThroughMessageId } } : {})
})

const versionFilter = (conversation) =>
    conversation.summaryVersion ? { summaryVersion: conversation.summaryVersion } : { summaryVersion: { $in: [0, null] } }

export const maybeSummarize = async (conversation) => {
    if ((conversation.unsummarizedMessageCount || 0) < SUMMARY_THRESHOLD) return { conversation, summarized: false }

    const messages = await Message.find(unsummarizedFilter(conversation))
        .sort({ _id: 1 }).limit(MAX_SUMMARY_BATCH).select("sender message").lean()
    if (messages.length === 0) return { conversation, summarized: false }

    let newSummary = ""
    try {
        const data = await rag.summarize({
            summary: conversation.summary || "",
            messages: messages.map(({ sender, message }) => ({ sender, message: message || "" }))
        })
        newSummary = typeof data?.newSummary === "string" ? data.newSummary.trim() : ""
    } catch {
        // logged in ragClient; keep everything unsummarized and retry next turn
    }
    if (!newSummary) return { conversation, summarized: false, summaryFailed: true }

    const updated = await Conversation.findOneAndUpdate(
        { _id: conversation._id, ...versionFilter(conversation) },
        {
            $set: { summary: newSummary, summarizedThroughMessageId: messages[messages.length - 1]._id },
            $inc: { unsummarizedMessageCount: -messages.length, summaryVersion: 1 }
        },
        { returnDocument: "after" }
    )
    if (!updated) return { conversation: await Conversation.findById(conversation._id), summarized: false }
    return { conversation: updated, summarized: true }
}

export const buildContext = async (conversation) => {
    const recent = await Message.find(unsummarizedFilter(conversation))
        .sort({ _id: -1 }).limit(RECENT_CONTEXT_LIMIT).select("sender message").lean()
    const sets = conversation.productSets || []
    return {
        summary: (conversation.summary || "").slice(0, 4000),
        recent_messages: recent.reverse()
            .filter((m) => m.message)
            .map((m) => ({ role: m.sender === USER_SENDER ? "user" : "assistant", content: m.message.slice(0, 8000) })),
        referenced_products: sets.flatMap((set, index) => (set.products || []).map((p) => ({
            product_id: p.productId.toString(),
            position: p.position,
            kind: set.kind || "recommended",
            turn: sets.length - 1 - index,
            title: (p.title || "").slice(0, 500) || null
        })))
    }
}

// ------------------------------------------------------------------ persistence
const isTransactionUnsupported = (error) =>
    error?.code === 20 || /Transaction numbers are only allowed|does not support transactions|does not support retryable writes/i.test(error?.message || "")

const writeTurn = async ({ conversationId, query, answer, requestId, metadata, productSet }, session) => {
    const opts = session ? { session } : {}
    const created = []
    try {
        const [userMessage] = await Message.create([{
            conversationId, sender: USER_SENDER, message: query, ...(requestId ? { metadata: { requestId } } : {})
        }], opts)
        created.push(userMessage._id)
        const [assistantMessage] = await Message.create([{
            conversationId, sender: ASSISTANT_SENDER, message: answer, metadata: { ...metadata, requestId }
        }], opts)
        created.push(assistantMessage._id)
        const update = { $inc: { unsummarizedMessageCount: 2 } }
        if (productSet) {
            update.$push = { productSets: { $each: [{ ...productSet, messageId: assistantMessage._id }], $slice: -MAX_PRODUCT_SETS } }
        }
        await Conversation.updateOne({ _id: conversationId }, update, opts)
        return { userMessage, assistantMessage }
    } catch (error) {
        // Without a transaction, undo partial writes so the history never has an orphaned turn.
        if (!session && created.length) await Message.deleteMany({ _id: { $in: created } }).catch(() => { })
        throw error
    }
}

export const persistTurn = async (turn) => {
    let session
    try {
        session = await mongoose.startSession()
        let result
        await session.withTransaction(async () => { result = await writeTurn(turn, session) })
        return result
    } catch (error) {
        if (isTransactionUnsupported(error)) return writeTurn(turn, null)
        throw error
    } finally {
        await session?.endSession()
    }
}

export const findExistingTurn = async (conversationId, requestId) => {
    if (!requestId) return null
    const messages = await Message.find({ conversationId, "metadata.requestId": requestId }).sort({ _id: 1 }).lean()
    const userMessage = messages.find((m) => m.sender === USER_SENDER)
    const assistantMessage = messages.find((m) => m.sender === ASSISTANT_SENDER)
    return userMessage && assistantMessage ? { userMessage, assistantMessage } : null
}

// ------------------------------------------------------------------ one chat turn
const publicProduct = ({ product_id, ...fields }) => ({ productId: product_id, ...fields })

/**
 * intent/retrieval (FastAPI) -> product enrichment (MONGO_URI) -> response generation (FastAPI) -> persistence.
 * Nothing is persisted unless generation succeeds.
 */
export const runTurn = async ({ conversation, query, requestId }) => {
    const context = await buildContext(conversation)
    const retrieval = await rag.retrieve({ query, conversation_context: context })
    if (!retrieval || typeof retrieval.intent !== "string") throw new ChatError(502, "The AI service returned an invalid response.", "invalid_retrieval")

    let enrichment
    try {
        enrichment = await getProductsByIds(retrieval.product_ids || [])
    } catch (error) {
        console.error("[Chat] Product enrichment failed:", error.message)
        throw new ChatError(503, "The product catalog is temporarily unavailable. Please try again.", "catalog_unavailable")
    }

    const errors = retrieval.errors || []
    const generation = await rag.respond({
        query,
        intent: retrieval.intent,
        conversation_context: context,
        products: enrichment.products,
        missing_product_ids: enrichment.missing,
        retrieved: retrieval.retrieved || [],
        web_results: retrieval.web_results || [],
        retrieval_sources: retrieval.retrieval_sources || [],
        errors,
        needs_clarification: Boolean(retrieval.needs_clarification),
        clarification_question: retrieval.clarification_question ?? null
    })
    const answer = typeof generation?.answer === "string" ? generation.answer.trim() : ""
    if (!answer) throw new ChatError(502, "The AI service returned an invalid response.", "invalid_generation")

    const byId = new Map(enrichment.products.map((p) => [p.product_id, p]))
    const usedIds = [...new Set(generation.product_ids || [])].filter((id) => byId.has(id))
    const references = usedIds.map((id, i) => ({ productId: id, position: i + 1, title: byId.get(id).title }))
    const qdrantIds = new Set((retrieval.retrieved || []).filter((h) => h.source === "qdrant").map((h) => h.product_id))
    const sources = (generation.sources || []).filter((s) => typeof s?.url === "string").map(({ title, url }) => ({ title: title || "", url }))

    let saved
    try {
        saved = await persistTurn({
            conversationId: conversation._id,
            query,
            answer,
            requestId,
            metadata: {
                intent: generation.intent || retrieval.intent,
                productReferences: references.length ? references : undefined,
                sources: sources.length ? sources : undefined,
                retrievalSources: retrieval.retrieval_sources || [],
                retrievalErrors: errors.length ? errors.map((e) => e.source) : undefined
            },
            productSet: references.length
                ? { kind: usedIds.some((id) => qdrantIds.has(id)) ? "recommended" : "discussed", products: references }
                : null
        })
    } catch (error) {
        if (error?.code === 11000 && requestId) {
            const existing = await findExistingTurn(conversation._id, requestId)
            if (existing) return { ...existing, answer: existing.assistantMessage.message, products: [], sources: [], intent: existing.assistantMessage.metadata?.intent, duplicate: true }
        }
        throw error
    }

    return {
        ...saved,
        answer,
        intent: generation.intent || retrieval.intent,
        products: usedIds.map((id) => publicProduct(byId.get(id))),
        sources,
        needsClarification: Boolean(generation.needs_clarification)
    }
}

export const sendChatError = (error, res, next) => {
    if (error instanceof ChatError) return res.status(error.status).json({ success: false, message: error.message, code: error.code })
    if (error instanceof rag.RagServiceError) {
        return res.status(error.timedOut ? 504 : 502).json({
            success: false,
            code: `${error.stage}_${error.timedOut ? "timeout" : "failed"}`,
            message: "The AI assistant could not generate a response. Please try again."
        })
    }
    return next(error)
}
