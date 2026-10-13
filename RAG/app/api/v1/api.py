from fastapi import APIRouter
from app.api.v1.endpoints.review import router as review_router

api_router = APIRouter()

# Review Agent Endpoints
api_router.include_router(review_router)

# Future Agents can be mounted here cleanly:
# from app.api.v1.endpoints.comparison import router as comparison_router
# from app.api.v1.endpoints.price import router as price_router
# from app.api.v1.endpoints.orchestrator import router as orchestrator_router
# api_router.include_router(comparison_router, prefix="/comparison", tags=["Comparison Agent"])
# api_router.include_router(price_router, prefix="/price", tags=["Price Agent"])
# api_router.include_router(orchestrator_router, prefix="/orchestrator", tags=["Orchestrator"])
