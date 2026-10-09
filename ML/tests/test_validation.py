from __future__ import annotations

import pytest


VALID_PRODUCT = {
    "categoryName": "Electronics",
    "stars": 4.5,
    "reviews": 2500,
    "price": 45000,
    "boughtInLastMonth": 1200,
}


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("stars", 5.1),
        ("stars", -0.1),
        ("price", -1),
        ("reviews", -1),
        ("boughtInLastMonth", -1),
    ],
)
def test_invalid_numeric_features_return_422(client, field, value):
    payload = {**VALID_PRODUCT, field: value}
    response = client.post("/predict", json=payload)
    assert response.status_code == 422
    assert response.json()["detail"]


def test_missing_required_field_returns_422(client):
    payload = {key: value for key, value in VALID_PRODUCT.items() if key != "price"}
    response = client.post("/predict", json=payload)
    assert response.status_code == 422
    assert any(item["loc"][-1] == "price" for item in response.json()["detail"])


def test_empty_batch_returns_422(client):
    response = client.post("/predict/batch", json={"products": []})
    assert response.status_code == 422


def test_oversized_batch_returns_422(client):
    response = client.post("/predict/batch", json={"products": [VALID_PRODUCT] * 101})
    assert response.status_code == 422

