import logging
from typing import Dict, Any
# pyrefly: ignore [missing-import]
from langchain_google_genai import ChatGoogleGenerativeAI

from app.schemas.product import Product
from app.core.utils import extract_json_safely
from .prompts import VERDICT_PROMPT
from .search import search_sources
from .index import build_ephemeral_index
# pyrefly: ignore [missing-import]
from langchain_huggingface import ChatHuggingFace, HuggingFaceEndpoint
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv
load_dotenv()
import os

HUGGINGFACEHUB_ACCESS_TOKEN = os.getenv("HUGGINGFACEHUB_ACCESS_TOKEN", "")

logger = logging.getLogger("ShopPilot.ReviewAgent")


def synthesize_verdict(product_name: str, vectorstore, query_hint: str = "") -> Dict[str, Any]:
    """
    Retrieves top relevant chunks from ephemeral vectorstore and calls Gemini
    to synthesize a structured verdict JSON.
    """
    print(f"\n🧠 [STEP 3: RAG RETRIEVAL & SYNTHESIS] Generating verdict for: '{product_name}'", flush=True)
    try:
        retriever = vectorstore.as_retriever(search_kwargs={"k": 8})
        query = f"{product_name} reviews strengths weaknesses comparison {query_hint}".strip()

        relevant_docs = retriever.invoke(query)
        print(f"✅ [RETRIEVAL] Retrieved top {len(relevant_docs)} chunks from vector store.", flush=True)
        for idx, doc in enumerate(relevant_docs[:3], 1):
            src = doc.metadata.get("source", "Unknown")
            preview = doc.page_content.replace("\n", " ")[:100]
            print(f"   Doc {idx} ({src}): {preview}...", flush=True)

        context = "\n\n---\n\n".join(d.page_content for d in relevant_docs if d.page_content)
        print(f"  ↳ Total context length passed to LLM: {len(context)} characters", flush=True)

        print("🤖 [LLM] Calling Gemini Flash...", flush=True)
        # print("🤖 [LLM] Calling HuggingFace...", flush=True)
        llm = ChatGoogleGenerativeAI(model="gemini-3.6-flash", temperature=0.2,google_api_key=os.environ.get("GOOGLE_API_KEY"))
        # llm_endpoint = HuggingFaceEndpoint(
        #     repo_id="Qwen/Qwen3.8-27B",
        #     task="text-generation",
        #     huggingfacehub_api_token=HUGGINGFACEHUB_ACCESS_TOKEN,
        # )
        # llm = ChatHuggingFace(llm=llm_endpoint)
        chain = VERDICT_PROMPT | llm

        response = chain.invoke({"product_name": product_name, "context": context})
        print(f"✅ [LLM] Received response from Gemini. Parsing JSON verdict...", flush=True)

        parsed_verdict = extract_json_safely(response.content)
        print(f"🎯 [VERDICT RESULT] Score: {parsed_verdict.get('score')}/100 | Verdict: {parsed_verdict.get('verdict')}", flush=True)
        print(f"   Summary: {parsed_verdict.get('summary')}", flush=True)
        print(f"{'='*60}\n", flush=True)

        parsed_verdict["_debug_context_length"] = len(context)
        return parsed_verdict
    except Exception as e:
        print(f"⚠️ [SYNTHESIS ERROR]: {e}", flush=True)
        logger.error(f"Synthesis failed: {e}")
        return {
            "score": 50,
            "verdict": "WAIT",
            "strengths": [],
            "limitations": [],
            "summary": f"Could not fully analyze reviews: {str(e)}",
            "sources_used": 0,
        }


def get_or_build_verdict(product: Product, include_debug: bool = False) -> Dict[str, Any]:
    """
    Full pipeline for Review Agent:
    1. Discovers external reviews via Tavily Search
    2. Builds ephemeral in-memory FAISS index
    3. Synthesizes verdict via LLM
    """
    urls, tavily_docs = search_sources(product.name)
    if not urls and not tavily_docs:
        return {
            "score": 0,
            "verdict": "WAIT",
            "strengths": [],
            "limitations": [],
            "summary": "No online reviews or sources found for this product.",
            "sources_used": 0,
            "_source": "fallback",
        }

    vectorstore = build_ephemeral_index(urls, tavily_docs=tavily_docs)
    if vectorstore is None:
        return {
            "score": 0,
            "verdict": "WAIT",
            "strengths": [],
            "limitations": [],
            "summary": "Could not extract content from discovered review pages.",
            "sources_used": len(urls),
            "_source": "fallback",
        }

    result = synthesize_verdict(product.name, vectorstore)
    result["_source"] = "live"
    if include_debug:
        result["_debug_urls"] = urls
        result["_debug_snippets_count"] = len(tavily_docs)

    return result
