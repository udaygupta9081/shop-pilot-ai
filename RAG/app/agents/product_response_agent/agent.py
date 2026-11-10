"""Product response generation agent: turns already-retrieved evidence into the final answer."""
import json
import logging
import re
from typing import List, Literal

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


class ReviewAssessment(BaseModel):
    verdict: Literal["BUY", "WAIT", "AVOID"]
    rationale: str = Field(..., min_length=1)


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


def _product_details_prompt(req: RespondRequest) -> str:
    return f"""Assess the customer review excerpts below and return a cautious buying verdict.
Use ONLY the review excerpts to choose BUY, WAIT, or AVOID and explain the choice in one short sentence.
Do not infer specifications, prices, or facts not stated in the excerpts. If evidence is limited or mixed, choose WAIT.

Review excerpts:
{_web_block(req)}"""


def _catalog_details(products) -> str:
    lines = []
    labels = {
        "price": "Listed price",
        "stars": "Rating",
        "reviews": "Review count",
        "mainCategory": "Category",
        "subcategory": "Subcategory",
    }
    for product in products:
        facts = []
        for field, label in labels.items():
            value = getattr(product, field)
            if value is not None:
                facts.append(f"{label}: {value}{'/5' if field == 'stars' else ''}")
        details = "; ".join(facts)
        lines.append(
            f"**{product.title}**\n"
            + (f"This is listed in the {product.mainCategory or 'product'} category. " if product.mainCategory else "")
            + (f"Catalog details: {details}." if details else "The catalog does not list additional specifications.")
        )
    if not lines:
        return "I couldn't find this product in the catalog."
    return "### Product details\n\n" + "\n\n".join(lines)


def _comparison_table(products) -> str:
    if not products:
        return ""

    def cell(value) -> str:
        if value is None or value == "":
            return "Not listed"
        return str(value).replace("|", "\\|").replace("\r", " ").replace("\n", " ")

    rows = [
        ("Price", lambda p: f"{p.price:g}" if p.price is not None else None),
        ("Rating", lambda p: f"{p.stars:g}/5" if p.stars is not None else None),
        ("Reviews", lambda p: p.reviews),
        ("Category", lambda p: " · ".join(filter(None, [p.mainCategory, p.subcategory])) or None),
        ("Bestseller", lambda p: "Yes" if p.isBestSeller else "No" if p.isBestSeller is not None else None),
    ]
    header = "| Attribute | " + " | ".join(cell(product.title) for product in products) + " |"
    separator = "| --- | " + " | ".join("---" for _ in products) + " |"
    values = [
        "| " + label + " | " + " | ".join(cell(get_value(product)) for product in products) + " |"
        for label, get_value in rows
    ]
    return "### Side-by-side comparison\n\n" + "\n".join([header, separator, *values])


def _product_details_response(req: RespondRequest) -> RespondResponse:
    sections = [_catalog_details(req.products)]
    if req.web_results:
        try:
            assessment = get_chat_model(0.3).with_structured_output(ReviewAssessment).invoke(
                _product_details_prompt(req)
            )
            if not isinstance(assessment, ReviewAssessment):
                assessment = ReviewAssessment.model_validate(assessment)
        except Exception as exc:
            logger.error("Review assessment failed: %s", exc)
            raise GenerationError("Review assessment failed") from exc

        sections.extend(
            f"**Review evidence:** {source.snippet[:600]} ([{source.title or 'Source'}]({source.url}))"
            for source in req.web_results
        )
        sections.append(f"**Verdict: {assessment.verdict}.** {assessment.rationale}")
    elif req.products:
        sections.append("I don't have external review sources for this follow-up, so I can't provide a web-backed verdict.")

    answer = "\n\n".join(section for section in sections if section)
    return RespondResponse(
        answer=answer,
        intent=req.intent,
        product_ids=[product.product_id for product in req.products],
        sources=[WebSource(title=source.title, url=source.url) for source in req.web_results],
    )


def generate_response(req: RespondRequest) -> RespondResponse:
    if req.needs_clarification and req.clarification_question:
        return RespondResponse(answer=req.clarification_question, intent=req.intent, product_ids=[],
                               needs_clarification=True, generator="rule")
    if req.intent == "product_details":
        return _product_details_response(req)

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
    comparison_requested = req.intent == "product_comparison" or (
        req.intent == "mixed" and re.search(r"\b(compare|comparison|vs\.?|versus|difference|which one|better)\b", req.query, re.I)
    )
    used = [pid for pid in dict.fromkeys(out.product_ids_used) if pid in supplied]
    if comparison_requested:
        used = supplied
    elif not used and req.intent in ("product_recommendation", "mixed"):
        used = supplied  # the answer was built from exactly these products
    if not used and req.intent == "product_details" and not out.needs_clarification:
        used = supplied
    by_url = {w.url: w for w in req.web_results}
    cited = [u for u in dict.fromkeys(out.source_urls_used) if u in by_url]
    cited += [u for u in by_url if u not in cited and u in out.answer]
    answer = out.answer.strip()
    if comparison_requested and req.products:
        if answer.casefold() == req.query.strip().casefold():
            answer = "Here is a side-by-side comparison based on the available catalog data."
        answer = "\n\n".join([answer, _comparison_table(req.products)])
    return RespondResponse(
        answer=answer, intent=req.intent, product_ids=used,
        sources=[WebSource(title=by_url[u].title, url=u) for u in cited],
        needs_clarification=out.needs_clarification,
    )
