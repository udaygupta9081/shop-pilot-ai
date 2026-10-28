import logging
import os
import sys
import threading
# pyrefly: ignore [missing-import]
from fastapi import FastAPI
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
# pyrefly: ignore [missing-import]
from app.api.v1.api import api_router

# Agents print emoji progress lines; on Windows a redirected stdout is cp1252 and would raise
# UnicodeEncodeError inside the agent (e.g. failing every Tavily search). Never let logging break a request.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(errors="backslashreplace")
    except Exception:
        pass

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
    application.include_router(api_router, prefix="/api/v1")
    application.include_router(api_router)

    @application.on_event("startup")
    def warm_up_product_search():
        # Loading the model + 90k-point local Qdrant store takes ~30s; do it in the background
        # so the first chat request does not hit the Node retrieval timeout.
        if os.getenv("QDRANT_WARMUP", "true").lower() in ("0", "false", "no"):
            return

        def _run():
            try:
                from app.services.product_search import warm_up
                warm_up()
                logger.info("Product search warmed up")
            except Exception as exc:
                logger.warning("Product search warm-up failed: %s", exc)

        threading.Thread(target=_run, daemon=True).start()

    @application.get("/health", tags=["Health"])
    def health_check():
        return {
            "status": "healthy",
            "service": "ShopPilot AI RAG Platform",
            "version": "1.0.0",
        }

    return application


app = create_app()
