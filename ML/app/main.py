"""FastAPI application for ShopPilot AI inference."""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .model_service import ModelService, PredictionError
from .schemas import (
    BatchPredictionRequest,
    BatchPredictionResponse,
    HealthResponse,
    ModelInfoResponse,
    ProductInput,
    SinglePredictionResponse,
)


logger = logging.getLogger(__name__)


def _allowed_origins() -> list[str]:
    configured = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    )
    return [origin.strip() for origin in configured.split(",") if origin.strip()]


def _service_from_request(request: Request) -> ModelService:
    return request.app.state.model_service


def create_app(service: ModelService | None = None) -> FastAPI:
    """Create the API application, optionally with an injected service for tests."""

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        model_service = service or ModelService()
        app.state.model_service = model_service
        if not model_service._load_attempted:
            model_service.load()
        yield

    app = FastAPI(
        title="ShopPilot AI",
        version="1.0.0",
        description=(
            "Product intelligence inference API. The AI product score is a "
            "weighted heuristic; bestseller probability is the saved model's "
            "positive-class output and may not be calibrated."
        ),
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_allowed_origins(),
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
    )

    @app.get(
        "/",
        summary="Service information",
        response_model=dict[str, str],
    )
    def root() -> dict[str, str]:
        return {"service": "ShopPilot AI", "status": "running", "version": "1.0.0"}

    @app.get(
        "/health",
        summary="Health check",
        response_model=HealthResponse,
        responses={503: {"model": HealthResponse}},
    )
    def health(request: Request) -> Any:
        healthy = _service_from_request(request).loaded
        body = {"status": "healthy" if healthy else "unhealthy", "model_loaded": healthy}
        if healthy:
            return body
        return JSONResponse(status_code=503, content=body)

    @app.get(
        "/model-info",
        summary="Safe model metadata",
        response_model=ModelInfoResponse,
    )
    def model_info(request: Request) -> dict[str, Any]:
        return _service_from_request(request).public_info()

    @app.post(
        "/predict",
        summary="Predict one product",
        response_model=SinglePredictionResponse,
        description=(
            "Submit the five model features. `isBestSeller` is a training label "
            "and is not required for inference. Lower prices receive a higher "
            "affordability component in the heuristic score."
        ),
    )
    def predict(product: ProductInput, request: Request) -> dict[str, Any]:
        try:
            result = _service_from_request(request).predict_products([product.model_dump()])[0]
        except PredictionError as exc:
            logger.error("Prediction request failed: %s", exc)
            return JSONResponse(
                status_code=503,
                content={"detail": "Prediction service is temporarily unavailable."},
            )
        result["success"] = True
        return result

    @app.post(
        "/predict/batch",
        summary="Predict multiple products",
        response_model=BatchPredictionResponse,
        description=(
            "Submit a bounded list of products. Inference is vectorized and the "
            "response preserves input order."
        ),
    )
    def predict_batch(
        request_body: BatchPredictionRequest,
        request: Request,
    ) -> dict[str, Any]:
        try:
            results = _service_from_request(request).predict_products(
                [product.model_dump() for product in request_body.products]
            )
        except PredictionError as exc:
            logger.error("Batch prediction request failed: %s", exc)
            return JSONResponse(
                status_code=503,
                content={"detail": "Prediction service is temporarily unavailable."},
            )
        return {
            "success": True,
            "predictions": [{"success": True, **result} for result in results],
        }

    return app


app = create_app()

