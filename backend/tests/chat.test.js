// Integration tests for the chat pipeline: real MongoDB (two databases), stubbed FastAPI service.
// Set MONGO_TEST_URI to use a different local test database; transactions are used when supported.
import { test, before, after, beforeEach } from "node:test"
import assert from "node:assert/strict"
import express from "express"
import mongoose from "mongoose"
import cookieParser from "cookie-parser"

const BASE = process.env.MONGO_TEST_URI || "mongodb://127.0.0.1:27017/?directConnection=true&retryWrites=false"
const withDb = (name) => {
    const uri = BASE.replace(/\/(\?|$)/, `/${name}$1`)
    if (/([?&])retryWrites=/i.test(uri)) return uri.replace(/([?&])retryWrites=[^&]*/i, "$1retryWrites=false")
    return `${uri}${uri.includes("?") ? "&" : "?"}retryWrites=false`
}

// ---- stub FastAPI
const rag = { calls: [], handlers: {} }
const stub = express()
stub.use(express.json({ limit: "2mb" }))
stub.post("/api/v1/:group/:action", async (req, res) => {
    const key = `${req.params.group}/${req.params.action}`
    rag.calls.push({ key, body: req.body })
    const handler = rag.handlers[key]
    if (!handler) return res.status(404).json({ detail: "no handler" })
    const out = await handler(req.body)
    if (out?.status) return res.status(out.status).json(out.body ?? {})
    return res.json(out)
})
const stubServer = stub.listen(0)
process.env.RAG_URL = `http://127.0.0.1:${stubServer.address().port}`
process.env.RAG_RETRIEVE_TIMEOUT_MS = "1500"

const { default: connectDB, connectProductDB, productConnection } = await import("../utils/db.js")
const { Product } = await import("../catalog/models/Product.js")
const { default: Conversation } = await import("../Model/conversationModel.js")
const { default: Message } = await import("../Model/messageModel.js")
const { default: authRoutes } = await import("../Routes/authRoute.js")
const { default: chatRoutes } = await import("../Routes/chatRoutes.js")
const { createChat } = await import("../Controller/chatController.js")
const { createMessage, getAllChatMessages } = await import("../Controller/messageController.js")

const USER = new mongoose.Types.ObjectId().toString()
const OTHER = new mongoose.Types.ObjectId().toString()
const app = express()
app.use(express.json())
app.use((req, _res, next) => { req.user = { id: req.get("x-user") || USER }; next() })
app.post("/api/conversation", createChat)
app.post("/api/conversation/message/:chatId", createMessage)
app.get("/api/conversation/message/:chatId", getAllChatMessages)
app.use((err, _req, res, _next) => res.status(500).json({ message: err.message }))
const authenticatedApp = express()
authenticatedApp.use(express.json())
authenticatedApp.use(cookieParser())
authenticatedApp.use("/api/auth", authRoutes)
authenticatedApp.use("/api/conversation", chatRoutes)
authenticatedApp.use((err, _req, res, _next) => res.status(500).json({ message: err.message }))
let server, url, products
let authenticatedServer, authenticatedUrl

const call = async (path, body, headers = {}) => {
    const res = await fetch(`${url}${path}`, { method: body ? "POST" : "GET", headers: { "content-type": "application/json", ...headers }, body: body && JSON.stringify(body) })
    return { status: res.status, body: await res.json() }
}
const callAuthenticated = async (path, { method = "GET", body, cookie } = {}) => {
    const res = await fetch(`${authenticatedUrl}${path}`, {
        method,
        headers: {
            ...(body ? { "content-type": "application/json" } : {}),
            ...(cookie ? { cookie } : {})
        },
        ...(body ? { body: JSON.stringify(body) } : {})
    })
    return { status: res.status, body: await res.json(), setCookie: res.headers.get("set-cookie") }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const ids = () => products.map((p) => p._id.toString())

const recommend = (pick = [0, 1, 2]) => (body) => ({
    intent: "product_recommendation", intents: ["product_recommendation"], retrieval_sources: ["qdrant", "mongodb"],
    product_ids: pick.map((i) => ids()[i]),
    retrieved: pick.map((i, r) => ({ product_id: ids()[i], rank: r + 1, source: "qdrant", score: 0.9 })),
    web_results: [], errors: [], needs_clarification: false
})
const echoRespond = (body) => ({
    answer: `Answer for: ${body.query}`, intent: body.intent, product_ids: body.products.map((p) => p.product_id), sources: [], needs_clarification: false
})

before(async () => {
    await connectDB(withDb("shoppilot_test_users"))
    await connectProductDB(withDb("shoppilot_test_products"))
    await mongoose.connection.dropDatabase()
    await productConnection.dropDatabase()
    await Message.syncIndexes()
    products = await Product.insertMany(["Zinus Memory Foam Mattress", "Sweetnight Hybrid Mattress", "Linenspa Spring Mattress"].map((title, i) => ({
        asin: `B0TEST000${i}`, title, price: 200 + i * 100, stars: 4.5, reviews: 1000, mainCategory: "Home", mainSlug: "home", subcategory: "Mattresses", subSlug: "mattresses"
    })))
    server = app.listen(0)
    url = `http://127.0.0.1:${server.address().port}`
    authenticatedServer = authenticatedApp.listen(0)
    authenticatedUrl = `http://127.0.0.1:${authenticatedServer.address().port}`
})

after(async () => {
    server?.close(); authenticatedServer?.close(); stubServer.close()
    await mongoose.connection.dropDatabase(); await productConnection.dropDatabase()
    await mongoose.disconnect(); await productConnection.close()
})

beforeEach(() => {
    rag.calls = []
    rag.handlers = {
        "orchestrator/retrieve": recommend(),
        "agent/respond": echoRespond,
        "naming/title": () => ({ title: "Mattress search" }),
        "summarization/summarize": (b) => ({ newSummary: `summary(${b.summary}|${b.messages.length})` })
    }
})

const newChat = async () => (await call("/api/conversation", { query: "Recommend a memory foam mattress under $500" })).body

test("new conversation: retrieve -> enrich (order, missing, invalid ids) -> respond -> persist", async () => {
    const missing = new mongoose.Types.ObjectId().toString()
    rag.handlers["orchestrator/retrieve"] = (b) => ({ ...recommend([2, 0])(b), product_ids: [ids()[2], "not-an-id", missing, ids()[0], ids()[2]] })
    const { status, body } = await call("/api/conversation", { query: "  Recommend a mattress  " })
    assert.equal(status, 201)
    assert.equal(body.messages.length, 2)
    assert.deepEqual(body.messages.map((m) => m.sender), ["User", "Assistent"])
    assert.equal(body.messages[0].message, "Recommend a mattress")
    assert.equal(body.chat.unsummarizedMessageCount, 2)
    assert.equal(body.chat.activeRequest, undefined)

    const respondCall = rag.calls.find((c) => c.key === "agent/respond").body
    assert.deepEqual(respondCall.products.map((p) => p.product_id), [ids()[2], ids()[0]])
    assert.deepEqual(respondCall.missing_product_ids, [missing])
    assert.equal(respondCall.products[0].title, "Linenspa Spring Mattress")
    assert.equal(rag.calls.find((c) => c.key === "orchestrator/retrieve").body.conversation_context.recent_messages.length, 0)

    assert.deepEqual(body.products.map((p) => p.asin), ["B0TEST0002", "B0TEST0000"])
    const chat = await Conversation.findById(body.chat._id).lean()
    assert.deepEqual(chat.productSets.at(-1).products.map((p) => [p.productId.toString(), p.position]), [[ids()[2], 1], [ids()[0], 2]])
    assert.equal(chat.productSets.at(-1).kind, "recommended")
    const assistant = await Message.findById(body.messages[1]._id).lean()
    assert.equal(assistant.metadata.productReferences.length, 2)
    await sleep(50)
    assert.equal((await Conversation.findById(body.chat._id).lean()).title, "Mattress search")
})

test("databases are separated: app data never lands in the product database", async () => {
    await newChat()
    const productCollections = (await productConnection.db.listCollections().toArray()).map((c) => c.name)
    assert.ok(!productCollections.includes("messages") && !productCollections.includes("conversations"))
    const appCollections = (await mongoose.connection.db.listCollections().toArray()).map((c) => c.name)
    assert.ok(!appCollections.includes("products"))
})

test("generation failure persists nothing", async () => {
    rag.handlers["agent/respond"] = () => ({ status: 502, body: { detail: "Response generation failed" } })
    const before = await Conversation.countDocuments()
    const { status, body } = await call("/api/conversation", { query: "Recommend a mattress" })
    assert.equal(status, 502)
    assert.equal(body.success, false)
    assert.equal(await Conversation.countDocuments(), before)
})

test("retrieval timeout returns 504 and persists nothing", async () => {
    const chat = await newChat()
    rag.handlers["orchestrator/retrieve"] = async (b) => { await sleep(2500); return recommend()(b) }
    const { status, body } = await call(`/api/conversation/message/${chat.chat._id}`, { query: "more?" })
    assert.equal(status, 504)
    assert.equal(body.code, "retrieval_timeout")
    assert.equal(await Message.countDocuments({ conversationId: chat.chat._id }), 2)
    assert.equal((await Conversation.findById(chat.chat._id).lean()).unsummarizedMessageCount, 2)
})

test("follow-up sends structured product references and records discussed product", async () => {
    const chat = await newChat()
    rag.handlers["orchestrator/retrieve"] = (b) => ({
        intent: "product_details", intents: ["product_details"], retrieval_sources: ["mongodb"],
        product_ids: [b.conversation_context.referenced_products.find((r) => r.position === 1).product_id],
        retrieved: [], web_results: [], errors: []
    })
    const { status, body } = await call(`/api/conversation/message/${chat.chat._id}`, { query: "Tell me more about the first one" })
    assert.equal(status, 201)
    const ctx = rag.calls.findLast((c) => c.key === "orchestrator/retrieve").body.conversation_context
    assert.deepEqual(ctx.referenced_products.map((r) => [r.product_id, r.position, r.turn, r.kind]),
        [[ids()[0], 1, 0, "recommended"], [ids()[1], 2, 0, "recommended"], [ids()[2], 3, 0, "recommended"]])
    assert.deepEqual(ctx.recent_messages.map((m) => m.role), ["user", "assistant"])
    assert.deepEqual(body.products.map((p) => p.productId), [ids()[0]])
    const saved = await Conversation.findById(chat.chat._id).lean()
    assert.equal(saved.productSets.length, 2)
    assert.equal(saved.productSets[1].kind, "discussed")
})

test("validation, auth and ownership", async () => {
    const chat = await newChat()
    assert.equal((await call("/api/conversation", { query: "   " })).status, 400)
    assert.equal((await call("/api/conversation", { query: 42 })).status, 400)
    assert.equal((await call(`/api/conversation/message/not-an-id`, { query: "hi" })).status, 400)
    assert.equal((await call(`/api/conversation/message/${new mongoose.Types.ObjectId()}`, { query: "hi" })).status, 404)
    assert.equal((await call(`/api/conversation/message/${chat.chat._id}`, { query: "hi" }, { "x-user": OTHER })).status, 403)
    assert.equal((await call(`/api/conversation/message/${chat.chat._id}`, undefined, { "x-user": OTHER })).status, 403)
    assert.equal(await Message.countDocuments({ conversationId: chat.chat._id }), 2)
})

test("summary threshold: below 10 no summary, at 10 cumulative summary of exactly the unsummarized messages", async () => {
    const chat = (await newChat()).chat
    const send = (q) => call(`/api/conversation/message/${chat._id}`, { query: q })
    for (let i = 1; i <= 4; i++) assert.equal((await send(`q${i}`)).status, 201) // count goes 2 -> 10
    assert.equal(rag.calls.filter((c) => c.key === "summarization/summarize").length, 0)
    assert.equal((await Conversation.findById(chat._id).lean()).unsummarizedMessageCount, 10)

    rag.calls = []
    const r5 = await send("q5")
    assert.equal(r5.status, 201)
    assert.equal(r5.body.summarized, true)
    const sumCall = rag.calls.find((c) => c.key === "summarization/summarize").body
    assert.equal(sumCall.summary, "")
    assert.equal(sumCall.messages.length, 10)
    assert.equal(sumCall.messages[0].message, "Recommend a memory foam mattress under $500")
    let conv = await Conversation.findById(chat._id).lean()
    assert.equal(conv.summary, "summary(|10)")
    assert.equal(conv.unsummarizedMessageCount, 2)
    const all = await Message.find({ conversationId: chat._id }).sort({ _id: 1 }).lean()
    assert.equal(conv.summarizedThroughMessageId.toString(), all[9]._id.toString())
    const ctx = rag.calls.find((c) => c.key === "orchestrator/retrieve").body.conversation_context
    assert.equal(ctx.summary, "summary(|10)")
    assert.equal(ctx.recent_messages.length, 0)
    assert.equal(ctx.referenced_products.length > 0, true) // references survive summarization

    // consecutive follow-ups after summarization: next summary is cumulative, no message repeated
    for (let i = 6; i <= 9; i++) assert.equal((await send(`q${i}`)).status, 201)
    rag.calls = []
    await send("q10")
    const second = rag.calls.find((c) => c.key === "summarization/summarize").body
    assert.equal(second.summary, "summary(|10)")
    assert.deepEqual(second.messages.filter((m) => m.sender === "User").map((m) => m.message), ["q5", "q6", "q7", "q8", "q9"])
    conv = await Conversation.findById(chat._id).lean()
    assert.equal(conv.summary, "summary(summary(|10)|10)")
    assert.equal(conv.unsummarizedMessageCount, 2)
    assert.equal(conv.summaryVersion, 2)
})

test("summarization failure keeps counter and messages, retries next turn", async () => {
    const chat = (await newChat()).chat
    for (let i = 1; i <= 4; i++) assert.equal((await call(`/api/conversation/message/${chat._id}`, { query: `q${i}` })).status, 201)
    rag.handlers["summarization/summarize"] = () => ({ status: 502, body: { detail: "Summarization failed" } })
    const r = await call(`/api/conversation/message/${chat._id}`, { query: "q5" })
    assert.equal(r.status, 201)
    assert.equal(r.body.summarized, false)
    let conv = await Conversation.findById(chat._id).lean()
    assert.equal(conv.summary, "")
    assert.equal(conv.unsummarizedMessageCount, 12)
    assert.equal(conv.summarizedThroughMessageId, null)

    rag.handlers["summarization/summarize"] = (b) => ({ newSummary: `ok(${b.messages.length})` })
    rag.calls = []
    await call(`/api/conversation/message/${chat._id}`, { query: "q6" })
    assert.equal(rag.calls.find((c) => c.key === "summarization/summarize").body.messages.length, 12)
    conv = await Conversation.findById(chat._id).lean()
    assert.equal(conv.summary, "ok(12)")
    assert.equal(conv.unsummarizedMessageCount, 2)
})

test("concurrent messages on one conversation: one processed, the other rejected with 409", async () => {
    const chat = (await newChat()).chat
    rag.handlers["agent/respond"] = async (b) => { await sleep(300); return echoRespond(b) }
    const [a, b] = await Promise.all([
        call(`/api/conversation/message/${chat._id}`, { query: "first" }),
        call(`/api/conversation/message/${chat._id}`, { query: "second" })
    ])
    assert.deepEqual([a.status, b.status].sort(), [201, 409])
    assert.equal(await Message.countDocuments({ conversationId: chat._id }), 4)
    assert.equal((await Conversation.findById(chat._id).lean()).unsummarizedMessageCount, 4)
    assert.equal((await call(`/api/conversation/message/${chat._id}`, { query: "third" })).status, 201) // lock released
})

test("duplicate request with the same Idempotency-Key does not create duplicate messages", async () => {
    const chat = (await newChat()).chat
    const headers = { "Idempotency-Key": "req-12345678" }
    const first = await call(`/api/conversation/message/${chat._id}`, { query: "hello" }, headers)
    const again = await call(`/api/conversation/message/${chat._id}`, { query: "hello" }, headers)
    assert.equal(first.status, 201)
    assert.equal(again.status, 200)
    assert.equal(again.body.duplicate, true)
    assert.equal(again.body.messages[1]._id, first.body.messages[1]._id)
    assert.equal(await Message.countDocuments({ conversationId: chat._id }), 4)
})

test("retrieval errors are forwarded to the response agent (no false success)", async () => {
    rag.handlers["orchestrator/retrieve"] = () => ({
        intent: "product_recommendation", intents: ["product_recommendation"], retrieval_sources: [], product_ids: [],
        retrieved: [], web_results: [], errors: [{ source: "qdrant", message: "Product search is temporarily unavailable" }]
    })
    const { status, body } = await call("/api/conversation", { query: "Recommend a mattress" })
    assert.equal(status, 201)
    assert.deepEqual(rag.calls.find((c) => c.key === "agent/respond").body.errors.map((e) => e.source), ["qdrant"])
    const assistant = await Message.findById(body.messages[1]._id).lean()
    assert.deepEqual(assistant.metadata.retrievalErrors, ["qdrant"])
    assert.equal((await Conversation.findById(body.chat._id).lean()).productSets.length, 0)
})

test("login session cookie authorizes conversation creation end to end", async () => {
    const email = `chat-${new mongoose.Types.ObjectId()}@example.com`
    const password = "Passw0rd!234"
    const registration = await callAuthenticated("/api/auth/register", {
        method: "POST",
        body: { name: "Chat Tester", email, password }
    })
    assert.equal(registration.status, 201)

    const login = await callAuthenticated("/api/auth/login", {
        method: "POST",
        body: { email, password }
    })
    assert.equal(login.status, 200)
    assert.match(login.setCookie || "", /^sid=/)
    const cookie = login.setCookie.split(";")[0]

    const me = await callAuthenticated("/api/auth/me", { cookie })
    assert.equal(me.status, 200)
    assert.equal(me.body.user.email, email)

    const unauthorized = await callAuthenticated("/api/conversation/")
    assert.equal(unauthorized.status, 401)

    const chat = await callAuthenticated("/api/conversation/", {
        method: "POST",
        cookie,
        body: { query: "Recommend a memory foam mattress under $300" }
    })
    assert.equal(chat.status, 201, JSON.stringify(chat.body))
    assert.equal(chat.body.messages.length, 2)
    assert.equal(chat.body.messages[0].sender, "User")
    assert.equal(chat.body.messages[1].sender, "Assistent")
    assert.equal(chat.body.answer, "Answer for: Recommend a memory foam mattress under $300")

    const chatId = chat.body.chat._id
    const followUp = await callAuthenticated(`/api/conversation/message/${chatId}`, {
        method: "POST",
        cookie,
        body: { query: "Tell me more about the first one" }
    })
    assert.equal(followUp.status, 201, JSON.stringify(followUp.body))
    assert.equal(followUp.body.messages.length, 2)

    const messages = await callAuthenticated(`/api/conversation/message/${chatId}`, { cookie })
    assert.equal(messages.status, 200)
    assert.equal(messages.body.messages.length, 4)

    const savedChat = await callAuthenticated(`/api/conversation/${chatId}`, { cookie })
    assert.equal(savedChat.status, 200)
    assert.equal(savedChat.body.messages.length, 4)
})
