"""Shared fixtures for API tests."""

from __future__ import annotations

import numpy as np
import pytest

from app.main import create_app
from app.model_service import ModelService


class FakeModel:
    """Small deterministic model used to test API behavior without retraining."""

    # Deliberately put class 1 at index 0 to verify label-based probability lookup.
    classes_ = np.array([1, 0])

    def predict_proba(self, frame):
        probabilities = []
        for stars in frame["stars"]:
            positive_probability = 0.75 if stars >= 4 else 0.25
            probabilities.append([positive_probability, 1 - positive_probability])
        return np.asarray(probabilities, dtype=float)


@pytest.fixture
def fake_service() -> ModelService:
    return ModelService(
        model=FakeModel(),
        product_score_weights={
            "rating": 0.4,
            "popularity": 0.5,
            "reviews": 0.45,
            "affordability": 0.15,
        },
        prediction_threshold=0.5,
        popularity_reference=5000,
        reviews_reference=10000,
        price_reference=50000,
    )


@pytest.fixture
def client(fake_service):
    from fastapi.testclient import TestClient

    with TestClient(create_app(fake_service)) as test_client:
        yield test_client

