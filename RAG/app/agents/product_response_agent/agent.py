"""Product response generation agent: turns already-retrieved evidence into the final answer."""
import json
import logging
from typing import List

# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field

from app.agents.product_response_agent.prompt import RESPONSE_PROMPT
from app.core.llm import get_chat_model
from app.schemas.chat import RespondRequest, RespondResponse, WebSource

logger = logging.getLogger("Product Response Agent")

CATALOG_FIELDS = ["title", "asin", "price", "stars", "reviews", "isBestSeller", "boughtInLastMonth",
                  "mainCategory", "subcategory", "aiProductScore", "productURL"]

ERROR_NOTES = {
    "qdrant": "Catalog product search FAILED (service unavailable). No new products could be retrieved.",
    "tavily": "Web research FAILED or timed out for some products; external reviews may be missing.",
    "classifier": None,
}


class GenerationError(RuntimeError):
    pass


class LLMAnswer(BaseModel):
    answer: str = Field(..., min_length=1)
    product_ids_used: List[str] = Field(default_factory=list)
    source_urls_used: List[str] = Field(default_factory=list)
    needs_clarification: bool = False


def _products_block(req: RespondRequest) -> str:
    if not req.products:
        return "(none)"
    lines = []
    for i, p in enumerate(req.products, 1):
        facts = {k: v for k, v in p.model_dump().items() if k in CATALOG_FIELDS and v is not None}
        lines.append(f"P{i} product_id={p.product_id} {json.dumps(facts, ensure_ascii=False)}")
    return "\n".join(lines)


def _web_block(req: RespondRequest) -> str:
    if not req.web_results:
        return "(none)"
    return "\n".join(f"[W{i}] {w.title} <{w.url}>{' (about ' + w.product_id + ')' if w.product_id else ''}\n{w.snippet[:800]}"
                     for i, w in enumerate(req.web_results, 1))


def _notes(req: RespondRequest) -> str:
    notes = [ERROR_NOTES[e.source] for e in req.errors if ERROR_NOTES.get(e.source)]
    if req.missing_product_ids:
        notes.append(f"{len(req.missing_product_ids)} previously shown product(s) are no longer in the catalog.")
    if "qdrant" in req.retrieval_sources and not req.products:
        notes.append("Catalog search succeeded but found no matching products.")
    return "\n".join(dict.fromkeys(notes)) or "(none)"


def generate_response(req: RespondRequest) -> RespondResponse:
    if req.needs_clarification and req.clarification_question:
        return RespondResponse(answer=req.clarification_question, intent=req.intent, product_ids=[],
                               needs_clarification=True, generator="rule")
    ctx = req.conversation_context
    prompt = RESPONSE_PROMPT.format(
        summary=ctx.summary or "(none)",
        recent="\n".join(f"{m.role}: {m.content[:800]}" for m in ctx.recent_messages[-6:]) or "(none)",
        products=_products_block(req), web=_web_block(req), notes=_notes(req), query=req.query,
    )
    try:
        out = get_chat_model(0.3).with_structured_output(LLMAnswer).invoke(prompt)
        if not isinstance(out, LLMAnswer):
            out = LLMAnswer.model_validate(out)
    except Exception as exc:
        logger.error("Response generation failed: %s", exc)
        raise GenerationError("Response generation failed") from exc
    if not out.answer.strip():
        raise GenerationError("Empty response")

    supplied = [p.product_id for p in req.products]
    used = [pid for pid in dict.fromkeys(out.product_ids_used) if pid in supplied]
    if not used and req.intent in ("product_recommendation", "product_comparison", "mixed"):
        used = supplied  # the answer was built from exactly these products
    by_url = {w.url: w for w in req.web_results}
    cited = [u for u in dict.fromkeys(out.source_urls_used) if u in by_url]
    cited += [u for u in by_url if u not in cited and u in out.answer]
    return RespondResponse(
        answer=out.answer.strip(), intent=req.intent, product_ids=used,
        sources=[WebSource(title=by_url[u].title, url=u) for u in cited],
        needs_clarification=out.needs_clarification,
    )
