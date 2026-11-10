import logging
import re
from typing import Dict, Any, Literal

from pydantic import BaseModel, Field
from app.schemas.product import Product
from app.core.llm import get_chat_model
from .prompts import VERDICT_PROMPT
from .search import search_sources

logger = logging.getLogger("ShopPilot.ReviewAgent")

class ReviewSynthesisError(RuntimeError):
    pass


class ReviewVerdict(BaseModel):
    score: int = Field(..., ge=0, le=100)
    verdict: Literal["BUY", "WAIT", "AVOID"]
    strengths: list[str]
    limitations: list[str]
    summary: str
    sources_used: int = Field(..., ge=0)


def _review_evidence(urls, tavily_docs):
    sources = []
    seen = set()
    for doc in tavily_docs:
        url = doc.metadata.get("source")
        if not isinstance(url, str) or not url.startswith(("http://", "https://")) or url in seen:
            continue
        seen.add(url)
        sources.append({
            "title": str(doc.metadata.get("title") or ""),
            "url": url,
            "snippet": doc.page_content.strip()[:700],
        })
    for url in urls:
        if isinstance(url, str) and url.startswith(("http://", "https://")) and url not in seen:
            seen.add(url)
            sources.append({"title": "", "url": url, "snippet": ""})
    return sources[:8]


def _select_review_docs(product_name: str, tavily_docs, limit: int = 8):
    terms = {
        term.casefold()
        for term in re.findall(r"[a-z0-9]+", product_name)
        if len(term) > 2
    }

    def relevance(doc):
        title = str(doc.metadata.get("title") or "").casefold()
        text = f"{title} {doc.page_content}".casefold()
        return sum(1 for term in terms if term in text)

    docs = [doc for doc in tavily_docs if doc.page_content and doc.page_content.strip()]
    return sorted(docs, key=relevance, reverse=True)[:limit]


def synthesize_verdict(product_name: str, review_docs, query_hint: str = "") -> Dict[str, Any]:
    """
    Synthesizes a verdict from bounded Tavily excerpts without loading a second
    embedding model alongside the local chat model.
    """
    print(f"\n🧠 [STEP 3: RAG RETRIEVAL & SYNTHESIS] Generating verdict for: '{product_name}'", flush=True)
    try:
        relevant_docs = _select_review_docs(product_name, review_docs)
        print(f"✅ [RETRIEVAL] Selected {len(relevant_docs)} relevant Tavily excerpts.", flush=True)
        for idx, doc in enumerate(relevant_docs[:3], 1):
            src = doc.metadata.get("source", "Unknown")
            preview = doc.page_content.replace("\n", " ")[:100]
            print(f"   Doc {idx} ({src}): {preview}...", flush=True)

        context = "\n\n---\n\n".join(
            f"Source: {d.metadata.get('title') or 'Review'} <{d.metadata.get('source', '')}>\n"
            f"{d.page_content.strip()[:700]}"
            for d in relevant_docs
        )
        if query_hint:
            context = f"User focus: {query_hint}\n\n{context}"
        print(f"  ↳ Total context length passed to LLM: {len(context)} characters", flush=True)

        print("🤖 [LLM] Calling local Ollama model...", flush=True)
        chain = VERDICT_PROMPT | get_chat_model(0.2).with_structured_output(ReviewVerdict)

        verdict = chain.invoke({"product_name": product_name, "context": context})
        print("✅ [LLM] Received structured verdict from Ollama.", flush=True)

        if not isinstance(verdict, ReviewVerdict):
            verdict = ReviewVerdict.model_validate(verdict)
        parsed_verdict = verdict.model_dump()
        print(f"🎯 [VERDICT RESULT] Score: {parsed_verdict.get('score')}/100 | Verdict: {parsed_verdict.get('verdict')}", flush=True)
        print(f"   Summary: {parsed_verdict.get('summary')}", flush=True)
        print(f"{'='*60}\n", flush=True)

        parsed_verdict["_debug_context_length"] = len(context)
        return parsed_verdict
    except Exception as e:
        print(f"⚠️ [SYNTHESIS ERROR]: {e}", flush=True)
        logger.error(f"Synthesis failed: {e}")
        raise ReviewSynthesisError("Could not synthesize the review evidence.") from e


def get_or_build_verdict(product: Product, include_debug: bool = False) -> Dict[str, Any]:
    """
    Full pipeline for Review Agent:
    1. Discovers external reviews via Tavily Search
    2. Selects a small set of relevant Tavily excerpts
    3. Synthesizes verdict via LLM without loading an embedding model
    """
    urls, tavily_docs = search_sources(product.name, raise_on_error=True)
    relevant_docs = _select_review_docs(product.name, tavily_docs)
    review_sources = _review_evidence(urls, relevant_docs)
    if not urls and not tavily_docs:
        return {
            "score": 0,
            "verdict": "WAIT",
            "strengths": [],
            "limitations": [],
            "summary": "No online reviews or sources found for this product.",
            "sources_used": 0,
            "sources": [],
            "reviews": [],
            "_source": "fallback",
        }

    if not relevant_docs:
        return {
            "score": 0,
            "verdict": "WAIT",
            "strengths": [],
            "limitations": [],
            "summary": "Could not extract content from discovered review pages.",
            "sources_used": len(urls),
            "sources": review_sources,
            "reviews": review_sources,
            "_source": "fallback",
        }

    result = synthesize_verdict(product.name, relevant_docs)
    result["sources"] = review_sources
    result["reviews"] = review_sources
    result["_source"] = "live"
    if include_debug:
        result["_debug_urls"] = urls
        result["_debug_snippets_count"] = len(tavily_docs)

    return result
