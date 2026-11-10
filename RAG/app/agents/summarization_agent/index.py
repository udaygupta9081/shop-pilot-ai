# pyrefly: ignore [missing-import]
import logging
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field

from app.core.llm import get_chat_model
from .prompt import prompt

logger = logging.getLogger("Summarization Agent")


class ConversationSummary(BaseModel):
    summary: str = Field(..., min_length=1, description="A concise updated conversation summary.")


def summarize(summary: str, messages: str):
    try:
        chain = prompt | get_chat_model().with_structured_output(ConversationSummary)
        response = chain.invoke({"summary": summary, "messages": messages})
        text = " ".join(response.summary.split())
        return " ".join(text.split()[:100]) or None
    except Exception:
        logger.exception("Failed to summarize")
        return None