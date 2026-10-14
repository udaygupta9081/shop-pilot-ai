import logging
# pyrefly: ignore [missing-import]
from fastapi import FastAPI
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
# pyrefly: ignore [missing-import]
from app.api.v1.api import api_router

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ShopPilot")


def create_app() -> FastAPI:
    application = FastAPI(
        title="ShopPilot AI - Multi-Agent RAG Platform",
        description="Autonomous RAG agents for Product Verdicts, Price Analysis, Comparison & Orchestration",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # Enable CORS for frontend and microservices
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Mount API routers
    application.include_router(api_router)

    @application.get("/health", tags=["Health"])
    def health_check():
        return {
            "status": "healthy",
            "service": "ShopPilot AI RAG Platform",
            "version": "1.0.0",
        }

    return application


app = create_app()
