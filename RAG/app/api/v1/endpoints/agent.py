import logging

# pyrefly: ignore [missing-import]
from fastapi import APIRouter, HTTPException
# pyrefly: ignore [missing-import]
from fastapi.concurrency import run_in_threadpool

from app.agents.product_response_agent.agent import GenerationError, generate_response
from app.schemas.chat import RespondRequest, RespondResponse

router = APIRouter(tags=["Product Response Agent"])
logger = logging.getLogger("Product Response Agent")


@router.post("/respond", response_model=RespondResponse)
async def respond(request: RespondRequest) -> RespondResponse:
    """Generates the final answer from supplied evidence only (no retrieval here)."""
    try:
        return await run_in_threadpool(generate_response, request)
    except GenerationError:
        raise HTTPException(status_code=502, detail="Response generation failed")
