from functools import lru_cache

from langchain_ollama import ChatOllama

from app.core.config import OLLAMA_BASE_URL, OLLAMA_MODEL, OLLAMA_NUM_CTX


class LLMUnavailableError(RuntimeError):
    pass


@lru_cache(maxsize=4)
def get_chat_model(temperature: float = 0.2) -> ChatOllama:
    """Return a cached local Ollama chat model."""
    try:
        return ChatOllama(
            model=OLLAMA_MODEL,
            temperature=temperature,
            num_ctx=OLLAMA_NUM_CTX,
            num_predict=512,
            base_url=OLLAMA_BASE_URL,
            reasoning=False,
        )
    except Exception as exc:
        raise LLMUnavailableError(
            f"Failed to initialize Ollama chat model: {exc}"
        ) from exc
