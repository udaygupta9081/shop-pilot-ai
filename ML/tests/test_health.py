from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import create_app
from app.model_service import ModelService


def test_root_and_health(client):
    root = client.get("/")
    assert root.status_code == 200
    assert root.json() == {
        "service": "ShopPilot AI",
        "status": "running",
        "version": "1.0.0",
    }

    health = client.get("/health")
    assert health.status_code == 200
    assert health.json() == {"status": "healthy", "model_loaded": True}


def test_model_info_does_not_expose_internal_path(client):
    response = client.get("/model-info")
    assert response.status_code == 200
    body = response.json()
    assert body["model_loaded"] is True
    assert body["prediction_threshold"] == 0.5
    assert body["input_features"] == [
        "categoryName",
        "stars",
        "reviews",
        "price",
        "boughtInLastMonth",
    ]
    assert "artifact_path" not in body


def test_model_loading_failure_is_reported_as_unhealthy(tmp_path):
    missing_service = ModelService(artifact_path=tmp_path / "missing.joblib")
    with TestClient(create_app(missing_service)) as client:
        health = client.get("/health")
        assert health.status_code == 503
        assert health.json() == {"status": "unhealthy", "model_loaded": False}

        prediction = client.post(
            "/predict",
            json={
                "categoryName": "Electronics",
                "stars": 4.5,
                "reviews": 2500,
                "price": 45000,
                "boughtInLastMonth": 1200,
            },
        )
        assert prediction.status_code == 503
        assert prediction.json() == {
            "detail": "Prediction service is temporarily unavailable."
        }

