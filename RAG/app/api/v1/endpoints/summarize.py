# pyrefly: ignore [missing-import]
import logging
# pyrefly: ignore [missing-import]
from app.agents.summarization_agent.index import summarize
# pyrefly: ignore [missing-import]
from fastapi import APIRouter
# pyrefly: ignore [missing-import]
from pydantic import BaseModel

router = APIRouter(tags=["Summarization Agent"])
logger = logging.getLogger("Summarization Agent")

class SummarizeRequest(BaseModel):
    summary: str
    messages: list
@router.post("/summarize")
def generate_summary(request: SummarizeRequest):
    """
    Generates a summary of the conversation
    """
    try:
        summary = request.summary
        messages = request.messages
        newSummary = summarize(summary, messages)
        return {"newSummary": newSummary}
    except Exception as e:
        logger.error(f"Failed to summarize: {e}")
        return None
    