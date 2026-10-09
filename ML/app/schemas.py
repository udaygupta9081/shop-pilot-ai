"""Pydantic request and response schemas for the ShopPilot AI API."""

from __future__ import annotations

import math
import os
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


def _configured_batch_size() -> int:
    """Read the batch limit without allowing a bad environment to break imports."""

    raw_value = os.getenv("MAX_BATCH_SIZE", "100")
    try:
        value = int(raw_value)
    except (TypeError, ValueError):
        return 100
    return value if value > 0 else 100


MAX_BATCH_SIZE = _configured_batch_size()


class ProductInput(BaseModel):
    """The five raw features expected by the saved model pipeline."""

    model_config = ConfigDict(
        extra="ignore",
        allow_inf_nan=False,
        json_schema_extra={
            "example": {
                "categoryName": "Electronics",
                "stars": 4.5,
                "reviews": 2500,
                "price": 45000,
                "boughtInLastMonth": 1200,
            }
        },
    )

    categoryName: str = Field(
        min_length=1,
        description="Product category used by the saved model pipeline.",
    )
    stars: float = Field(
        ge=0,
        le=5,
        description="Product rating on a 0-to-5 scale.",
    )
    reviews: float = Field(
        ge=0,
        description="Non-negative number of product reviews.",
    )
    price: float = Field(
        ge=0,
        description="Non-negative product price in the same currency units as training data.",
    )
    boughtInLastMonth: float = Field(
        ge=0,
        description="Non-negative number of purchases in the last month.",
    )

    @field_validator("categoryName")
    @classmethod
    def category_must_not_be_blank(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("categoryName must not be blank")
        return cleaned

    @field_validator("stars", "reviews", "price", "boughtInLastMonth")
    @classmethod
    def numeric_values_must_be_finite(cls, value: float) -> float:
        if not math.isfinite(value):
            raise ValueError("numeric values must be finite")
        return value


class PredictionData(BaseModel):
    """Prediction values returned for one product."""

    model_config = ConfigDict(extra="forbid")

    ai_product_score: float = Field(
        ge=0,
        lt=100,
        description="Weighted heuristic product score, strictly below 100.",
    )
    bestseller_probability_percent: float = Field(
        ge=0,
        le=100,
        description=(
            "Saved model output for class 1 expressed as a percentage; "
            "it is not necessarily calibrated real-world probability."
        ),
    )
    predicted_bestseller: bool
    prediction_label: Literal["Bestseller", "Not Bestseller"]
    threshold_used: float = Field(
        ge=0,
        le=1,
        description="Saved positive-class decision threshold.",
    )


class SinglePredictionResponse(BaseModel):
    """Structured response for a single product prediction."""

    model_config = ConfigDict(extra="forbid")

    success: Literal[True]
    product: ProductInput
    prediction: PredictionData


class BatchPredictionRequest(BaseModel):
    """A bounded collection of products for vectorized inference."""

    model_config = ConfigDict(extra="forbid")

    products: list[ProductInput] = Field(
        min_length=1,
        max_length=MAX_BATCH_SIZE,
        description=f"Products to score, from 1 through {MAX_BATCH_SIZE} items.",
    )


class BatchPredictionResponse(BaseModel):
    """Structured response for batch inference, preserving input order."""

    model_config = ConfigDict(extra="forbid")

    success: Literal[True]
    predictions: list[SinglePredictionResponse]


class HealthResponse(BaseModel):
    status: Literal["healthy", "unhealthy"]
    model_loaded: bool


class ModelInfoResponse(BaseModel):
    model_name: str
    model_loaded: bool
    prediction_threshold: float | None
    input_features: list[str]
    outputs: list[str]

