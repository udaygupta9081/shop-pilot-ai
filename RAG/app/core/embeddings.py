import logging

from langchain_huggingface import HuggingFaceEmbeddings
from app.core.config import EMBEDDING_MODEL_NAME

logger = logging.getLogger(__name__)

# Global embedding model cache to avoid reloading PyTorch weights on each request
_embeddings_instance = None


def get_embeddings():
    """Returns a singleton instance of the embeddings model."""
    global _embeddings_instance
    if _embeddings_instance is None:
        try:
            print("📦 [INIT] Loading sentence-transformers embeddings...", flush=True)
            _embeddings_instance = HuggingFaceEmbeddings(
                model_name=EMBEDDING_MODEL_NAME
            )
            print("✅ [INIT] Embeddings model loaded successfully.", flush=True)
        except Exception:
            logger.exception("Failed to load local HuggingFace embeddings")
            raise
    return _embeddings_instance
