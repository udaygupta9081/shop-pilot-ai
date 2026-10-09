from __future__ import annotations


PRODUCT = {
    "categoryName": "Electronics",
    "stars": 4.5,
    "reviews": 2500,
    "price": 45000,
    "boughtInLastMonth": 1200,
}


def test_single_prediction_uses_class_label_and_safe_ranges(client):
    response = client.post("/predict", json=PRODUCT)
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["product"] == PRODUCT
    prediction = body["prediction"]
    assert prediction["ai_product_score"] == 78.24
    assert 0 <= prediction["ai_product_score"] < 100
    assert prediction["bestseller_probability_percent"] == 75.0
    assert 0 <= prediction["bestseller_probability_percent"] <= 100
    assert prediction["predicted_bestseller"] is True
    assert prediction["prediction_label"] == "Bestseller"
    assert prediction["threshold_used"] == 0.5


def test_batch_prediction_is_vectorized_and_preserves_order(client):
    second = {
        "categoryName": "Home & Kitchen",
        "stars": 3.8,
        "reviews": 150,
        "price": 1200,
        "boughtInLastMonth": 80,
    }
    response = client.post("/predict/batch", json={"products": [PRODUCT, second]})
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert [item["product"] for item in body["predictions"]] == [PRODUCT, second]
    assert [
        item["prediction"]["prediction_label"] for item in body["predictions"]
    ] == ["Bestseller", "Not Bestseller"]

