import os
from pathlib import Path
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv

# Base directory for RAG
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Load environment variables
load_dotenv(dotenv_path=BASE_DIR / ".env")

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
HUGGINGFACEHUB_ACCESS_TOKEN = os.getenv("HUGGINGFACEHUB_ACCESS_TOKEN", "")
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "")
EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "sentence-transformers/all-MiniLM-L6-v2")
CHROMA_PERSIST_DIRECTORY = os.getenv("CHROMA_PERSIST_DIRECTORY", "./chroma_db")

# --- Chat orchestration ------------------------------------------------------
def _int_env(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, default))
    except (TypeError, ValueError):
        return default


def _float_env(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, default))
    except (TypeError, ValueError):
        return default


GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
LLM_TIMEOUT_SECONDS = _float_env("LLM_TIMEOUT_SECONDS", 30.0)
# Gemini calls are read-only, so retrying transient 429/503s is safe.
LLM_MAX_RETRIES = _int_env("LLM_MAX_RETRIES", 2)
PRODUCT_TOP_K = _int_env("PRODUCT_TOP_K", 3)
MAX_PRODUCT_TOP_K = _int_env("MAX_PRODUCT_TOP_K", 10)
QDRANT_PATH = os.getenv("QDRANT_PATH", str(BASE_DIR / "qdrant_data"))
QDRANT_COLLECTION = os.getenv("QDRANT_COLLECTION", "amazon_products")
TAVILY_TIMEOUT_SECONDS = _float_env("TAVILY_TIMEOUT_SECONDS", 20.0)
TAVILY_RESULTS_PER_PRODUCT = _int_env("TAVILY_RESULTS_PER_PRODUCT", 4)
TAVILY_MAX_PRODUCTS = _int_env("TAVILY_MAX_PRODUCTS", 3)
