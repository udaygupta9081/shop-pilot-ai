# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Query
# pyrefly: ignore [missing-import]
from app.schemas.product import Product
from app.schemas.verdict import VerdictResponse
from app.agents.review_agent.agent import get_or_build_verdict

router = APIRouter(tags=["Review Agent"])


@router.get("/products/verdict", response_model=VerdictResponse)
@router.get("/verdict", response_model=VerdictResponse)
def get_verdict(
    product_id: str = Query(..., description="Unique product ID"),
    product_name: str = Query(..., description="Full product name/title"),
    debug: bool = Query(False, description="Include debug URLs and snippet counts"),
    refresh: bool = Query(False, description="Force fresh analysis and bypass cache"),
):
    """
    Review Agent Verdict Endpoint:
    Performs ephemeral web research (Tavily + LangChain + FAISS + Gemini)
    to generate a structured BUY/WAIT/AVOID verdict with score, strengths, and limitations.
    """
    product = Product(id=product_id, name=product_name)
    return get_or_build_verdict(product, include_debug=debug)
