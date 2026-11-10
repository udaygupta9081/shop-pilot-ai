# pyrefly: ignore [missing-import]
import logging
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field

from app.core.llm import get_chat_model
from .prompt import prompt

logger = logging.getLogger("Naming Agent")


class ConversationTitle(BaseModel):
    title: str = Field(..., min_length=1, description="A descriptive title with 3 to 7 words.")

# Cache the naming chain to avoid recreating LLM and pipeline on every request
_naming_chain = None

def get_naming_chain():
    global _naming_chain
    if _naming_chain is not None:
        return _naming_chain

    try:
        llm = get_chat_model(0.0)
        _naming_chain = prompt | llm.with_structured_output(ConversationTitle)
        return _naming_chain
    except Exception as e:
        logger.error(f"Failed to initialize naming chain: {e}")
        return None

def name_conversation(question: str) -> str:
    clean_q = (question or "").strip()
    if not clean_q:
        return "New Chat"

    # Fast-path only for trivial greetings
    lower_q = clean_q.lower()
    if lower_q in ["hi", "hello", "hey", "hola", "new chat"]:
        return "New Chat"

    fallback_title = clean_q[:35].strip() + ("..." if len(clean_q) > 35 else "")

    chain = get_naming_chain()
    if not chain:
        return fallback_title

    try:
        response = chain.invoke({"context": clean_q})
        raw_title = response.title.strip(' \t\n\r"\'`')
        if raw_title:
            first_line = raw_title.split("\n")[0].strip(' "\'`')
            if 3 <= len(first_line.split()) <= 7:
                print(f"[Naming Agent] Generated title: {first_line}", flush=True)
                return first_line
        return fallback_title
    except Exception as e:
        logger.error(f"Naming agent error: {e}")
        return fallback_title