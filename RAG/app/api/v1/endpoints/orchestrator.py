import logging

# pyrefly: ignore [missing-import]
from fastapi import APIRouter
# pyrefly: ignore [missing-import]
from fastapi.concurrency import run_in_threadpool

from app.agents.orchestrator.service import orchestrate
from app.schemas.chat import RetrieveRequest, RetrieveResponse

router = APIRouter(tags=["Orchestrator"])
logger = logging.getLogger("Orchestrator")


@router.post("/retrieve", response_model=RetrieveResponse)
async def retrieve(request: RetrieveRequest) -> RetrieveResponse:
    """Classifies intent, resolves product references and runs Qdrant/Tavily only when needed.
    Partial failures are reported in `errors`; they are never returned as empty results."""
    return await run_in_threadpool(orchestrate, request)
