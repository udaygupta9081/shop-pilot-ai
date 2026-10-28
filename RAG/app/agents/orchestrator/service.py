"""Intent classification + retrieval planning/execution for chat turns.

Node sends the query and structured conversation context; this module decides whether
Qdrant, Tavily, both or neither are needed, runs them and returns IDs + evidence.
Product documents are NOT loaded here: Node enriches IDs from MongoDB (MONGO_URI).
"""
import logging
import re
from concurrent.futures import ThreadPoolExecutor, wait
from typing import List, Optional, Tuple

# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field

from app.agents.orchestrator.prompt import INTENT_PROMPT
from app.core.config import PRODUCT_TOP_K, MAX_PRODUCT_TOP_K, TAVILY_MAX_PRODUCTS, TAVILY_RESULTS_PER_PRODUCT, TAVILY_TIMEOUT_SECONDS
from app.core.llm import get_chat_model
from app.schemas.chat import (
    BaseIntent, ReferencedProduct, RetrievalError, RetrievalHit, RetrieveRequest, RetrieveResponse, WebResult,
)
from app.services import product_search

logger = logging.getLogger("Orchestrator")


class IntentDecision(BaseModel):
    intents: List[BaseIntent] = Field(..., min_length=1)
    resolved_product_ids: List[str] = Field(default_factory=list)
    wants_new_products: bool = False
    search_query: Optional[str] = None
    needs_web_research: bool = False
    web_aspect: Optional[str] = None
    top_k: Optional[int] = None
    needs_clarification: bool = False
    clarification_question: Optional[str] = None


# ---------------------------------------------------------------- reference helpers
ORDINALS = {"first": 1, "1st": 1, "second": 2, "2nd": 2, "third": 3, "3rd": 3, "fourth": 4, "4th": 4,
            "fifth": 5, "5th": 5, "last": -1}


def latest_set(refs: List[ReferencedProduct]) -> List[ReferencedProduct]:
    available = [r for r in refs if r.available]
    # ordinals ("the second one") refer to the latest recommendation list, not a single product discussed since
    recommended = [r for r in available if r.kind == "recommended"] or available
    if not recommended:
        return []
    newest = min(r.turn for r in recommended)
    return sorted((r for r in recommended if r.turn == newest), key=lambda r: r.position or 99)


def resolve_ordinals(query: str, refs: List[ReferencedProduct]) -> List[str]:
    """Deterministic resolution of 'the first one', 'second and third', 'both', 'all three'."""
    current = latest_set(refs)
    if not current:
        return []
    q = query.lower()
    picked: List[str] = []
    for word, pos in ORDINALS.items():
        if re.search(rf"\b{re.escape(word)}\b", q):
            idx = len(current) - 1 if pos == -1 else pos - 1
            if 0 <= idx < len(current) and current[idx].product_id not in picked:
                picked.append(current[idx].product_id)
    if picked:
        return picked
    if re.search(r"\b(both|the two|these two|those two)\b", q) and len(current) >= 2:
        return [r.product_id for r in current[:2]]
    if re.search(r"\b(all|them|these|those|all three)\b", q) and len(current) > 1:
        return [r.product_id for r in current]
    if re.search(r"\b(it|this|that|this one|that one)\b", q) and len(current) == 1:
        return [current[0].product_id]
    return []


def fallback_decision(req: RetrieveRequest) -> IntentDecision:
    """Keyword routing used when the LLM classifier is unavailable or returns malformed output."""
    q = req.query.lower()
    refs = req.conversation_context.referenced_products
    resolved = resolve_ordinals(req.query, refs)
    intents: List[str] = []
    if re.search(r"\b(review|reviews|complain|complaints|reddit|opinion|people say|reliab|durab|problems?)\b", q):
        intents.append("product_reviews")
    if re.search(r"\b(compare|comparison|vs\.?|versus|difference|better|which one)\b", q):
        intents.append("product_comparison")
    if re.search(r"\b(recommend|suggest|find|show me|looking for|best|need an?|want an?|buy|options|alternatives?)\b", q) and not (resolved and "product_comparison" in intents):
        intents.append("product_recommendation")
    if resolved and not intents:
        intents.append("product_details")
    if not intents:
        intents.append("general_question")
    wants_new = "product_recommendation" in intents
    return IntentDecision(
        intents=intents, resolved_product_ids=resolved, wants_new_products=wants_new,
        search_query=req.query if wants_new else None,
        needs_web_research="product_reviews" in intents,
    )


def _format_refs(refs: List[ReferencedProduct]) -> str:
    if not refs:
        return "(none)"
    return "\n".join(
        f"- id={r.product_id} turn={r.turn} position={r.position} kind={r.kind}"
        f"{'' if r.available else ' (no longer in catalog)'} title={(r.title or '')[:160]!r}"
        for r in sorted(refs, key=lambda r: (r.turn, r.position or 99))
    )


def classify(req: RetrieveRequest) -> Tuple[IntentDecision, str, Optional[RetrievalError]]:
    ctx = req.conversation_context
    prompt = INTENT_PROMPT.format(
        products=_format_refs(ctx.referenced_products),
        summary=ctx.summary or "(none)",
        recent="\n".join(f"{m.role}: {m.content[:600]}" for m in ctx.recent_messages[-8:]) or "(none)",
        query=req.query,
    )
    try:
        decision = get_chat_model(0.0).with_structured_output(IntentDecision).invoke(prompt)
        if not isinstance(decision, IntentDecision):
            decision = IntentDecision.model_validate(decision)
        return decision, "llm", None
    except Exception as exc:
        logger.warning("Intent classifier failed, using keyword fallback: %s", exc)
        return fallback_decision(req), "fallback", RetrievalError(source="classifier", message="Intent classifier unavailable; used keyword routing")


# ---------------------------------------------------------------- tavily
def _short_title(title: str, words: int = 12) -> str:
    return " ".join(re.sub(r"[\[\]()|,]+", " ", title or "").split()[:words])


def _tavily_for(product_name: str, aspect: str, product_id: Optional[str]) -> List[WebResult]:
    from app.agents.review_agent.search import search_sources
    _, docs = search_sources(product_name, max_results=TAVILY_RESULTS_PER_PRODUCT,
                             queries=[f"{product_name} {aspect}"], raise_on_error=True)
    # Tavily often returns reviews of other products; keep only pages that mention the brand.
    brand = (product_name.split() or [""])[0].lower()
    return [WebResult(title=d.metadata.get("title", ""), url=d.metadata["source"],
                      snippet=d.page_content[:1200], product_id=product_id) for d in docs
            if d.metadata.get("source") and brand in f"{d.metadata.get('title', '')} {d.page_content}".lower()]


def run_web_research(targets: List[Tuple[str, Optional[str]]], aspect: str) -> Tuple[List[WebResult], List[RetrievalError]]:
    results: List[WebResult] = []
    errors: List[RetrievalError] = []
    pool = ThreadPoolExecutor(max_workers=max(1, len(targets)))
    futures = {pool.submit(_tavily_for, name, aspect, pid): name for name, pid in targets}
    done, pending = wait(futures, timeout=TAVILY_TIMEOUT_SECONDS)
    for fut in futures:
        name = futures[fut]
        if fut in pending:
            errors.append(RetrievalError(source="tavily", message=f"Web research timed out for '{name}'"))
        elif fut.exception() is not None:
            logger.warning("Web research failed for '%s': %r", name, fut.exception())
            errors.append(RetrievalError(source="tavily", message=f"Web research failed for '{name}'"))
        else:
            results.extend(fut.result())
    pool.shutdown(wait=False, cancel_futures=True)
    seen, unique = set(), []
    for r in results:
        if r.url not in seen:
            seen.add(r.url)
            unique.append(r)
    return unique, errors


# ---------------------------------------------------------------- main entry
def orchestrate(req: RetrieveRequest) -> RetrieveResponse:
    refs = req.conversation_context.referenced_products
    decision, classifier, cls_error = classify(req)
    errors: List[RetrievalError] = [cls_error] if cls_error else []

    known = {r.product_id: r for r in refs}
    resolved = [pid for pid in dict.fromkeys(decision.resolved_product_ids) if pid in known]
    if not resolved and set(decision.intents) & {"product_details", "product_reviews", "product_comparison"}:
        resolved = resolve_ordinals(req.query, refs)  # deterministic safety net for ordinal references
    unavailable = [pid for pid in resolved if not known[pid].available]

    intents = list(dict.fromkeys(decision.intents))
    needs_products = bool(set(intents) & {"product_details", "product_reviews", "product_comparison"})
    wants_new = "product_recommendation" in intents or decision.wants_new_products
    needs_web = "product_reviews" in intents or decision.needs_web_research
    if intents == ["general_question"]:
        wants_new = needs_web = False

    clarify = decision.needs_clarification
    question = decision.clarification_question
    if needs_products and not resolved and not wants_new and refs and not needs_web:
        clarify = True
    if clarify and not question:
        question = "Which product do you mean? You can refer to it by its position or name."
    if unavailable and len(unavailable) == len(resolved) and not wants_new:
        clarify, question = True, "That product is no longer available in our catalog. Would you like similar alternatives?"

    hits: List[RetrievalHit] = []
    sources: List[str] = []
    qdrant_titles = {}
    if wants_new and not clarify:
        top_k = req.top_k or decision.top_k or PRODUCT_TOP_K
        top_k = max(1, min(int(top_k), MAX_PRODUCT_TOP_K))
        search_query = (decision.search_query or req.query).strip()
        try:
            for hit in product_search.search_products(search_query, limit=top_k):
                if hit["productId"] in resolved:
                    continue
                hits.append(RetrievalHit(product_id=hit["productId"], rank=len(hits) + 1, source="qdrant", score=hit["score"]))
                qdrant_titles[hit["productId"]] = hit.get("title") or ""
            sources.append("qdrant")
        except Exception as exc:
            logger.error("Product search failed: %s", exc)
            errors.append(RetrievalError(source="qdrant", message="Product search is temporarily unavailable"))
    else:
        search_query = None

    context_hits = [RetrievalHit(product_id=pid, rank=i + 1, source="conversation") for i, pid in enumerate(resolved)
                    if known[pid].available]
    product_ids = list(dict.fromkeys([h.product_id for h in context_hits] + [h.product_id for h in hits]))
    if product_ids:
        sources.append("mongodb")

    web_results: List[WebResult] = []
    if needs_web and not clarify:
        targets = [(_short_title(known[pid].title or ""), pid) for pid in resolved if known[pid].title]
        targets += [(_short_title(qdrant_titles[h.product_id]), h.product_id) for h in hits if qdrant_titles.get(h.product_id)]
        targets = [t for t in targets if t[0]][:TAVILY_MAX_PRODUCTS]
        if not targets and not refs:
            targets = [(req.query[:150], None)]  # user named a product we don't have in context
        if targets:
            web_results, web_errors = run_web_research(targets, decision.web_aspect or "reviews")
            errors.extend(web_errors)
            if len(web_errors) < len(targets):
                sources.append("tavily")
        elif refs:
            clarify, question = True, question or "Which product should I look up reviews for?"

    return RetrieveResponse(
        intent="mixed" if len(intents) > 1 else intents[0],
        intents=intents,
        retrieval_sources=sources,
        product_ids=product_ids,
        retrieved=context_hits + hits,
        search_query=search_query,
        web_results=web_results,
        needs_clarification=clarify,
        clarification_question=question if clarify else None,
        errors=errors,
        classifier=classifier,
    )
