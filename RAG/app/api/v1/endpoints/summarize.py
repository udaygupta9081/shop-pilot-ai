# pyrefly: ignore [missing-import]
import logging
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, HTTPException
from app.agents.summarization_agent.index import summarize
from app.schemas.summarize import SummarizeRequest, SummarizeResponse

router = APIRouter(tags=["Summarization Agent"])
logger = logging.getLogger("Summarization Agent")


def format_messages(messages) -> str:
    lines = []
    for m in messages:
        if isinstance(m, str):
            text, role = m, "Message"
        else:
            text = m.message if m.message is not None else (m.content or "")
            raw_role = (m.sender or m.role or "").lower()
            role = "User" if raw_role == "user" else "Assistant" if raw_role.startswith("assist") else "Message"
        text = (text or "").strip()
        if text:
            lines.append(f"{role}: {text}")
    return "\n".join(lines)


@router.post("/summarize", response_model=SummarizeResponse)
def generate_summary(request: SummarizeRequest):
    """
    Cumulative summary: new summary = summarize(previous summary + new messages).
    Returns 502 when the LLM fails so callers never treat a failure as an empty summary.
    """
    transcript = format_messages(request.messages)
    previous = (request.summary or "").strip()
    if not transcript:
        return SummarizeResponse(newSummary=previous)
    new_summary = summarize(previous or "(none)", transcript)
    if not isinstance(new_summary, str) or not new_summary.strip():
        logger.error("Summarization failed or returned empty output")
        raise HTTPException(status_code=502, detail="Summarization failed")
    return SummarizeResponse(newSummary=new_summary.strip())
