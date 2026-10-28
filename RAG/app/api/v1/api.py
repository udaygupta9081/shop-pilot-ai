
# pyrefly: ignore [missing-import]
from fastapi import APIRouter
from app.api.v1.endpoints.review import router as review_router
# pyrefly: ignore [missing-import]
from app.api.v1.endpoints.naming import router as naming_router 
# pyrefly: ignore [missing-import]
from app.api.v1.endpoints.summarize import router as summarization_router
from app.api.v1.endpoints.orchestrator import router as orchestrator_router
from app.api.v1.endpoints.agent import router as agent_router

api_router = APIRouter()

# Agent Endpoints
api_router.include_router(review_router)
api_router.include_router(naming_router, prefix="/naming")
api_router.include_router(summarization_router, prefix="/summarization")
api_router.include_router(orchestrator_router, prefix="/orchestrator")
api_router.include_router(agent_router, prefix="/agent")

# Future Agents can be mounted here cleanly:
# from app.api.v1.endpoints.comparison import router as comparison_router
# from app.api.v1.endpoints.price import router as price_router
# api_router.include_router(comparison_router, prefix="/comparison", tags=["Comparison Agent"])
# api_router.include_router(price_router, prefix="/price", tags=["Price Agent"])

