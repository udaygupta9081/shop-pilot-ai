"""Integration checks against the supplied artifact when it is available."""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.model_service import ModelService


ARTIFACT = Path(__file__).resolve().parents[1] / "shop_pilot_ai_pipeline.joblib"


@pytest.mark.skipif(not ARTIFACT.is_file(), reason="supplied artifact is unavailable")
def test_supplied_artifact_produces_real_prediction():
    with TestClient(create_app(ModelService(artifact_path=ARTIFACT))) as client:
        health = client.get("/health")
        assert health.status_code == 200, health.text

        response = client.post(
            "/predict",
            json={
                "categoryName": "Electronics",
                "stars": 4.5,
                "reviews": 2500,
                "price": 45000,
                "boughtInLastMonth": 1200,
            },
        )
        assert response.status_code == 200, response.text
        prediction = response.json()["prediction"]
        assert 0 <= prediction["ai_product_score"] < 100
        assert 0 <= prediction["bestseller_probability_percent"] <= 100
        assert prediction["threshold_used"] == 0.5

