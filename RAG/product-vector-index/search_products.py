"""Reusable Qdrant product search over the existing `amazon_products` collection.

- `search_products(query, limit)` is imported by the FastAPI orchestrator.
- `python search_products.py` keeps the original interactive CLI.

The embedding model and the embedded Qdrant client are opened once per process and
reused. The index is never rebuilt here (see index_products.py for ingestion).
"""
import os
import threading
from pathlib import Path
from time import perf_counter

# pyrefly: ignore[missing-import]
from qdrant_client import QdrantClient, models

# pyrefly: ignore[missing-import]
from sentence_transformers import SentenceTransformer

QDRANT_PATH = Path(os.getenv("QDRANT_PATH") or Path(__file__).resolve().parent.parent / "qdrant_data")
COLLECTION = os.getenv("QDRANT_COLLECTION", "amazon_products")
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
DEFAULT_LIMIT = int(os.getenv("PRODUCT_TOP_K", "3"))
MAX_LIMIT = int(os.getenv("MAX_PRODUCT_TOP_K", "10"))
PAYLOAD_FIELDS = ["productId", "asin", "title", "price", "mainCategory", "subcategory"]


class ProductSearchError(RuntimeError):
    """Raised when Qdrant/embeddings fail. An empty result list is NOT an error."""


_lock = threading.Lock()
_model = None
_client = None


def _resources():
    global _model, _client
    with _lock:
        if _model is None:
            _model = SentenceTransformer(MODEL_NAME)
        if _client is None:
            _client = QdrantClient(path=str(QDRANT_PATH))
    return _model, _client


def search_products(query: str, limit: int | None = None) -> list[dict]:
    """Returns up to `limit` hits ordered by relevance: {productId, score, rank, title, ...}."""
    query = (query or "").strip()
    if not query:
        return []
    limit = max(1, min(int(limit or DEFAULT_LIMIT), MAX_LIMIT))
    try:
        model, client = _resources()
        vector = model.encode(query, normalize_embeddings=True).tolist()
        points = client.query_points(
            collection_name=COLLECTION,
            query=vector,
            limit=limit,
            with_payload=PAYLOAD_FIELDS,
            search_params=models.SearchParams(exact=False, hnsw_ef=64),
        ).points
    except Exception as exc:  # connection, missing collection, lock held by another process...
        raise ProductSearchError(f"Qdrant search failed: {exc}") from exc

    hits, seen = [], set()
    for point in points:
        payload = point.payload or {}
        product_id = str(payload.get("productId") or "").strip()
        if not product_id or product_id in seen:
            continue
        seen.add(product_id)
        hits.append({**{k: payload.get(k) for k in PAYLOAD_FIELDS}, "productId": product_id,
                     "score": float(point.score), "rank": len(hits) + 1})
    return hits


def log(message):
    print(f"[{perf_counter():.2f}] {message}", flush=True)


def main():
    query = input("Enter product query: ").strip()
    if not query:
        return
    start = perf_counter()
    results = search_products(query)
    log(f"Search finished in {perf_counter() - start:.2f}s, results: {len(results)}")
    for i, hit in enumerate(results, 1):
        print(f"\n--- Product {i} | Score: {hit['score']:.4f} ---")
        for key, value in hit.items():
            print(f"{key}: {value}")


if __name__ == "__main__":
    main()
