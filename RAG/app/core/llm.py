import os
from functools import lru_cache

# pyrefly: ignore [missing-import]
from langchain_google_genai import ChatGoogleGenerativeAI

from app.core.config import GEMINI_MODEL, LLM_MAX_RETRIES, LLM_TIMEOUT_SECONDS


class LLMUnavailableError(RuntimeError):
    pass


@lru_cache(maxsize=4)
def get_chat_model(temperature: float = 0.2) -> ChatGoogleGenerativeAI:
    """Shared Gemini chat client (same provider/config conventions as the naming agent)."""
    api_key = os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        raise LLMUnavailableError("GOOGLE_API_KEY is not set")
    kwargs = {
        "model": GEMINI_MODEL,
        "google_api_key": api_key,
        "max_retries": LLM_MAX_RETRIES,
        "request_timeout": max(LLM_TIMEOUT_SECONDS, 10.0),  # Google requires a deadline >= 10s
    }
    # gemini-3.6-flash uses fixed sampling defaults; omit temperature to avoid warnings
    if "3.6" not in GEMINI_MODEL:
        kwargs["temperature"] = temperature
    return ChatGoogleGenerativeAI(**kwargs)
