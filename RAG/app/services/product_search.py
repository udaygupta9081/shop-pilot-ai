"""Bridge to the reusable Qdrant search in `RAG/product-vector-index/search_products.py`.

The directory name contains a hyphen, so it is loaded by file path once and cached.
"""
import importlib.util
import sys
from functools import lru_cache
from pathlib import Path
from typing import Dict, List, Optional

from app.core.config import BASE_DIR

SEARCH_MODULE_PATH = Path(BASE_DIR) / "product-vector-index" / "search_products.py"


@lru_cache(maxsize=1)
def _module():
    spec = importlib.util.spec_from_file_location("product_vector_index.search_products", SEARCH_MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def search_products(query: str, limit: Optional[int] = None) -> List[Dict]:
    """Returns ranked hits ({productId, score, title, ...}). Raises ProductSearchError on failure."""
    return _module().search_products(query, limit=limit)


def product_search_error():
    return _module().ProductSearchError


def warm_up() -> None:
    """Loads the embedding model and opens the embedded Qdrant store once (no indexing)."""
    _module()._resources()
