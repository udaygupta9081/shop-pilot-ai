import logging
from typing import Tuple, List, Set, Optional
# pyrefly: ignore [missing-import]
from langchain_core.documents import Document
# pyrefly: ignore [missing-import]
from langchain_tavily import TavilySearch

logger = logging.getLogger("ShopPilot.ReviewAgent.Search")


class TavilySearchError(RuntimeError):
    """Raised (only when raise_on_error=True) so callers can tell a failure from an empty result."""


def search_sources(
    product_name: str,
    max_results: int = 8,
    queries: Optional[List[str]] = None,
    raise_on_error: bool = False,
) -> Tuple[List[str], List[Document]]:
    """
    Searches Tavily for product reviews across multiple review and discussion angles,
    returning discovered URLs and pre-extracted snippet Documents.
    `queries` overrides the default review angles; `raise_on_error` re-raises failures.
    """
    print(f"\n{'='*60}", flush=True)
    print(f"🔍 [STEP 1: TAVILY SEARCH] Starting search for: '{product_name}'", flush=True)
    try:
        search = TavilySearch(max_results=max_results)
        queries = queries or [
            f"{product_name} review",
            f"{product_name} reddit reviews",
            f"{product_name} vs alternatives comparison",
        ]
        urls: Set[str] = set()
        docs: List[Document] = []

        for q in queries:
            print(f"  ↳ Running Tavily query: '{q}'", flush=True)
            results = search.invoke(q)
            # Handle both list and dict response structures from Tavily
            items = results.get("results", []) if isinstance(results, dict) else results
            if isinstance(items, list):
                for item in items:
                    if isinstance(item, dict):
                        url = item.get("url")
                        content = item.get("content", "")
                        title = item.get("title", "")
                        if url and url not in urls:
                            urls.add(url)
                            if content:
                                docs.append(
                                    Document(
                                        page_content=content,
                                        metadata={"source": url, "title": title},
                                    )
                                )

        url_list = list(urls)[:max_results]
        print(f"✅ [TAVILY] Discovered {len(url_list)} unique URLs:", flush=True)
        for i, u in enumerate(url_list, 1):
            print(f"   {i}. {u}", flush=True)
        print(f"✅ [TAVILY] Extracted {len(docs)} text snippets directly from search results.", flush=True)
        return url_list, docs
    except Exception as e:
        print(f"⚠️ [TAVILY ERROR] Search failed: {e}", flush=True)
        logger.error(f"Tavily search failed: {e}")
        if raise_on_error:
            raise TavilySearchError(str(e)) from e
        return [], []
