# Conversational product assistant

## Responsibilities

| Layer | Owns |
|---|---|
| Node (`backend/`) | auth (`sid` session → `req.user.id`), ownership checks, conversations/messages (`MONGO_URI_USERS`), product enrichment (`MONGO_URI`), product references, summary counter/boundary, per-chat lock, idempotency |
| FastAPI (`RAG/`) | intent classification + reference resolution, Qdrant search, Tavily research (`/orchestrator/retrieve`), answer generation from supplied evidence (`/agent/respond`), summarization, naming |

One turn (`backend/services/chatService.js#runTurn`):

1. `buildContext`: summary + messages after the summary boundary (max 12) + structured product references.
2. `POST /api/v1/orchestrator/retrieve` → intent, product IDs (Qdrant order), web evidence, errors.
3. `getProductsByIds` → product documents from `MONGO_URI` in Qdrant order (invalid/duplicate IDs dropped, missing reported).
4. `POST /api/v1/agent/respond` → answer + product IDs it discussed + cited sources. No retrieval happens here.
5. Persist user + assistant message and the conversation update in one transaction (manual cleanup if the server has no transactions). Nothing is saved if steps 2–4 fail.

## Databases
- `MONGO_URI` → `productConnection` in `backend/utils/db.js`; `Product`/`Category` models are registered on it.
- `MONGO_URI_USERS` → default mongoose connection (users, sessions, conversations, messages). Falls back to `MONGO_URI` when unset.
- Product identifier across systems: `products._id` (24-hex). Qdrant payload `productId` is that value; the client also gets `asin` for `/api/catalog/products/:asin` links.

## Node API (`/api/conversation`)

Authenticated endpoints use the HTTP-only `sid` cookie:

- `GET /` lists up to 100 conversations owned by the current user.
- `GET /:chatId` returns an owned conversation and its messages.
- `POST /` body `{ query, clientRequestId? }` (or `Idempotency-Key` header) creates a conversation with its first turn.
- `POST /message/:chatId` accepts the same body for a follow-up.
- `PUT /:chatId` body `{ title }` renames an owned conversation (1–80 characters).
- `DELETE /:chatId` deletes an owned conversation and its messages; a chat with an active turn cannot be deleted.
- `GET /message/:chatId` returns the owned conversation's messages.

`POST /guest/message` is the unauthenticated, non-persisting guest turn endpoint. It accepts `{ query, conversation_context }`, runs the same retrieval/enrichment/response pipeline, and returns the answer, products, sources, and assistant metadata. Guest context is sanitized and bounded; the endpoint is limited to 30 requests per IP per 15 minutes. Guest history is kept in browser local storage and is not migrated when a guest signs in.

`POST /products/:asin/verdict` loads the product title and identifier from the catalog, then calls the RAG review agent (`/api/v1/verdict`). The agent searches Tavily and synthesizes a bounded set of relevant search-result excerpts with Ollama; it does not scrape full pages or build an ephemeral FAISS index for verdicts, avoiding the extra memory load of indexing scraped pages. Ollama's context defaults to 4,096 tokens (`OLLAMA_NUM_CTX` overrides this), keeping model runtime memory bounded. The endpoint returns a BUY/WAIT/AVOID verdict with review excerpts and source links. The product route is limited to 10 verdict requests per IP per 15 minutes; synthesis/search failures are returned as errors rather than being presented as a WAIT verdict.

201:
```json
{ "success": true, "chat": { "_id": "...", "title": "...", "summary": "...", "unsummarizedMessageCount": 2, "productSets": [] },
  "messages": [{ "sender": "User", "message": "..." }, { "sender": "Assistent", "message": "...", "metadata": { "intent": "...", "productReferences": [{ "productId": "...", "position": 1, "title": "..." }], "products": [{ "productId": "...", "asin": "...", "title": "...", "price": 299 }], "sources": [{ "title": "...", "url": "..." }] } }],
  "answer": "...", "intent": "product_recommendation", "products": [{ "productId": "...", "asin": "...", "title": "...", "price": 299 }],
  "sources": [], "summarized": false }
```
Errors (`{ success: false, code, message }`, never stack traces or upstream details): 400 invalid query/id, 401, 403 not owner, 404, 409 another message in this chat is still processing, 502 AI service failed, 503 product DB unavailable, 504 AI service timed out. A repeated request with the same idempotency key returns 200 `{ duplicate: true, messages }`.

`GET /message/:chatId` → `{ messages }` (owner only).

The React chat interface is available at `/chat` for both guests and signed-in users. Signed-in history is fetched from the authenticated API; guest turns use `/guest/message` and are stored only in local storage.

## FastAPI contracts (`RAG/app/schemas/chat.py`)

`POST /api/v1/orchestrator/retrieve`
```json
{ "query": "Compare the first and second options",
  "conversation_context": { "summary": "", "recent_messages": [{ "role": "user", "content": "..." }],
    "referenced_products": [{ "product_id": "<24 hex>", "position": 1, "turn": 0, "kind": "recommended", "title": "..." }] },
  "top_k": null }
```
→
```json
{ "intent": "product_comparison", "intents": ["product_comparison"], "retrieval_sources": ["mongodb"],
  "product_ids": ["...", "..."], "retrieved": [{ "product_id": "...", "rank": 1, "source": "conversation", "score": null }],
  "search_query": null, "web_results": [{ "title": "...", "url": "...", "snippet": "...", "product_id": "..." }],
  "needs_clarification": false, "clarification_question": null,
  "errors": [{ "source": "qdrant|tavily|classifier", "message": "..." }], "classifier": "llm" }
```
`POST /api/v1/agent/respond` takes `query, intent, conversation_context, products[], missing_product_ids, retrieved, web_results, retrieval_sources, errors, needs_clarification, clarification_question` and returns `{ answer, intent, product_ids, sources[{title,url}], needs_clarification, generator }`; 502 when the LLM fails. Product-detail follow-ups always include a catalog-grounded description, and include cited web review evidence plus a verdict when Tavily returned results. Product-comparison answers include a side-by-side Markdown table for available catalog attributes. Node preserves the Tavily sources in assistant message metadata even if the answer generator omitted citations, so the chat can render source links.

`POST /api/v1/summarization/summarize` `{ summary, messages: [{ sender, message }] }` → `{ newSummary }`; 502 on failure.

## Orchestration rules (`RAG/app/agents/orchestrator/service.py`)
- Ollama structured output (`IntentDecision`) classifies intents and resolves references to IDs from `referenced_products` only; unknown IDs are dropped. If the classifier fails, keyword routing is used (`classifier: "fallback"`).
- Ordinals ("first", "second and third", "both", "last") are also resolved deterministically against the latest *recommended* set, so "the second one" still means the original list after discussing a single product.
- Qdrant runs only for recommendations / requests needing new products (default top 3, `top_k` up to `MAX_PRODUCT_TOP_K`). Tavily runs for explicit review/opinion requests and resolved-product follow-ups phrased "tell me more", once per product (max `TAVILY_MAX_PRODUCTS`), in parallel with a timeout. Those broad detail follow-ups include review evidence and a BUY/WAIT/AVOID assessment when usable web results are returned. General questions use neither.
- The FastAPI startup loads the embedding model and opens the embedded Qdrant store in a background thread (`QDRANT_WARMUP=false` disables it), so the first chat does not exceed the Node retrieval timeout. Nothing is indexed at startup.
- Failures are returned in `errors` (never as empty results); the response agent is told which step failed and says so.
- Ambiguous or unavailable references → `needs_clarification`; `/agent/respond` returns the question without calling the LLM.

## Product references
- Assistant message `metadata.productReferences`: ordered `{productId, position, title}` of the products the answer discussed.
- Conversation `productSets`: the last 5 such sets (`kind` = `recommended` when new Qdrant products were shown, else `discussed`). They are sent with every turn as `referenced_products` (turn 0 = newest), so references keep working after summarization removes old messages from the context.

## Message counting / summary boundary
- `unsummarizedMessageCount` = persisted User **and** Assistant messages with `_id > summarizedThroughMessageId`. A successful turn adds 2; a failed turn adds nothing.
- Before processing a turn, if the count is ≥ `SUMMARY_THRESHOLD` (10), the previous summary + exactly those messages (oldest first) are summarized. On success `summary`, `summarizedThroughMessageId` (last summarized message) and the counter (−N) are written in one update conditioned on `summaryVersion` (optimistic concurrency). On failure nothing changes and the same messages are retried next turn.
- A per-conversation lock (`activeRequest`, TTL `CHAT_LOCK_TTL_MS`) serializes turns; concurrent sends get 409.

## Running
```bash
# FastAPI (needs RAG/.env and RAG/qdrant_data built by product-vector-index/index_products.py)
cd RAG
pip install -r requirements.txt
ollama pull qwen3:4b
uvicorn app.main:app --port 8000
# Node
cd backend && npm install && npm run serve
# Frontend
cd frontend && npm install && npm run dev
```
The RAG agents use the local Ollama service (`OLLAMA_BASE_URL`, default
`http://localhost:11434`) and model (`OLLAMA_MODEL`, default `qwen3:4b`).
Start Ollama before serving the RAG API. LLM requests do not require a Gemini
API key or token; Tavily web research still requires `TAVILY_API_KEY`.
Embedded Qdrant (`QdrantClient(path=...)`) allows a single process: run one uvicorn worker and don't run `search_products.py` CLI at the same time.

## Tests
```bash
cd RAG && python -m pytest tests            # offline: Ollama/Qdrant/Tavily faked
cd backend && npm test                      # needs MongoDB replica set at MONGO_TEST_URI (default mongodb://127.0.0.1:27017/?directConnection=true); FastAPI stubbed
```
