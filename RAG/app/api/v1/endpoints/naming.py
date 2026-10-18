# pyrefly: ignore [missing-import]
import logging
# pyrefly: ignore [missing-import]
from fastapi import APIRouter
from app.schemas.naming import NamingRequest, NamingResponse
from app.agents.naming_agent.index import name_conversation

logger = logging.getLogger("Naming Agent")
router = APIRouter(tags=["Naming Agent"])

@router.post("/title", response_model=NamingResponse)
def generate_title(body: NamingRequest):
    """
    Generates a short, descriptive 3-7 word title for a new chat
    based on the initial user message.
    """
    try:
        user_input = body.query or body.question or ""
        title = name_conversation(user_input)
        return NamingResponse(title=title)
    except Exception as e:
        logger.error(f"Failed to generate title: {e}")
        fallback = (body.query or body.question or "New Chat").strip()
        fallback_title = (fallback[:35].strip() + ("..." if len(fallback) > 35 else "")) if fallback else "New Chat"
        return NamingResponse(title=fallback_title)
