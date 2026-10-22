# pyrefly: ignore [missing-import]
import logging
# pyrefly: ignore [missing-import]
from RAG.app.agents.summarization_agent.index import summarize
# pyrefly: ignore [missing-import]
from fastapi import APIRouter

router = APIRouter(tags=["Summarization Agent"])
logger = logging.getLogger("Summarization Agent")

@router.post("/summarize")
def generate_summary(summary:str, messages:list):
    """
    Generates a summary of the conversation
    """
    try:
        summary = summary
        messages = messages
        newSummary = summarize(summary, messages)
        return {"newSummary": newSummary}
    except Exception as e:
        logger.error(f"Failed to summarize: {e}")
        return None
    