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

## Node API (`/api/conversation`, cookie auth)

`POST /` body `{ query, clientRequestId? }` (or `Idempotency-Key` header)
`POST /message/:chatId` same body

201:
```json
{ "success": true, "chat": { "_id": "...", "title": "...", "summary": "...", "unsummarizedMessageCount": 2, "productSets": [] },
  "messages": [{ "sender": "User", "message": "..." }, { "sender": "Assistent", "message": "...", "metadata": { "intent": "...", "productReferences": [{ "productId": "...", "position": 1, "title": "..." }], "sources": [{ "title": "...", "url": "..." }] } }],
  "answer": "...", "intent": "product_recommendation", "products": [{ "productId": "...", "asin": "...", "title": "...", "price": 299 }],
  "sources": [], "summarized": false }
```
Errors (`{ success: false, code, message }`, never stack traces or upstream details): 400 invalid query/id, 401, 403 not owner, 404, 409 another message in this chat is still processing, 502 AI service failed, 503 product DB unavailable, 504 AI service timed out. A repeated request with the same idempotency key returns 200 `{ duplicate: true, messages }`.

`GET /message/:chatId` → `{ messages }` (owner only).

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
`POST /api/v1/agent/respond` takes `query, intent, conversation_context, products[], missing_product_ids, retrieved, web_results, retrieval_sources, errors, needs_clarification, clarification_question` and returns `{ answer, intent, product_ids, sources[{title,url}], needs_clarification, generator }`; 502 when the LLM fails.

`POST /api/v1/summarization/summarize` `{ summary, messages: [{ sender, message }] }` → `{ newSummary }`; 502 on failure.

## Orchestration rules (`RAG/app/agents/orchestrator/service.py`)
- Gemini structured output (`IntentDecision`) classifies intents and resolves references to IDs from `referenced_products` only; unknown IDs are dropped. If the classifier fails, keyword routing is used (`classifier: "fallback"`).
- Ordinals ("first", "second and third", "both", "last") are also resolved deterministically against the latest *recommended* set, so "the second one" still means the original list after discussing a single product.
- Qdrant runs only for recommendations / requests needing new products (default top 3, `top_k` up to `MAX_PRODUCT_TOP_K`). Tavily runs only for review/opinion requests, once per product (max `TAVILY_MAX_PRODUCTS`), in parallel with a timeout. General questions use neither.
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
cd RAG && pip install -r requirements.txt && uvicorn app.main:app --port 8000
# Node
cd backend && npm install && npm run serve
```
Embedded Qdrant (`QdrantClient(path=...)`) allows a single process: run one uvicorn worker and don't run `search_products.py` CLI at the same time.

## Tests
```bash
cd RAG && python -m pytest tests            # offline: Gemini/Qdrant/Tavily faked
cd backend && npm test                      # needs MongoDB replica set at MONGO_TEST_URI (default mongodb://127.0.0.1:27017/?directConnection=true); FastAPI stubbed
```
