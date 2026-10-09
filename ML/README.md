# ShopPilot AI FastAPI inference service

This service wraps the supplied `shop_pilot_ai_pipeline.joblib` artifact in a
FastAPI API. It does not retrain, refit, or modify the model. The artifact is
loaded once during application startup using FastAPI lifespan management.

## What the API returns

- `ai_product_score`: a weighted 0–100 heuristic score, capped at `99.99`.
  Its affordability component is deliberately a heuristic: lower prices
  receive higher affordability scores relative to the fixed reference value.
- `bestseller_probability_percent`: the saved pipeline's output for class `1`
  expressed as a percentage. It is a model score and is not necessarily a
  calibrated real-world probability.
- `predicted_bestseller`: the positive-class score compared with the threshold
  saved in the artifact.

`isBestSeller` is the training target and is not required in inference input.

## Setup on Windows PowerShell

From this `ML` directory:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload
```

`uvicorn app.main:app --reload` is equivalent; the root-level `main.py` is a
compatibility entry point for the shorter command above.

The supplied artifact was serialized with scikit-learn `1.6.1`. The current
machine has Python `3.14` and scikit-learn `1.9.0`; the loader contains a
narrow compatibility shim for the artifact's private stale symbols and the
unchanged artifact has been verified with real inference. For a clean
environment, use a Python version supported by scikit-learn `1.6.1` where
possible and keep the pinned dependency version.

The model path and CORS origins can be configured through environment
variables. Copy `.env.example` to `.env` for reference, or set variables in
PowerShell directly:

```powershell
$env:MODEL_PATH = "shop_pilot_ai_pipeline.joblib"
$env:ALLOWED_ORIGINS = "http://localhost:3000,http://127.0.0.1:3000"
$env:MAX_BATCH_SIZE = "100"
```

`MODEL_PATH` may be absolute or relative to the current directory. If a
relative path is not found there, the service also checks the ML directory.

## Endpoints and documentation

- `GET /` — service information.
- `GET /health` — returns `200` only when the model loaded; otherwise returns
  `503` with `{"status":"unhealthy","model_loaded":false}`.
- `GET /model-info` — safe model metadata without file paths or secrets.
- `POST /predict` — one-product prediction.
- `POST /predict/batch` — bounded, vectorized batch prediction.
- `/docs` — Swagger UI.
- `/redoc` — ReDoc.
- `/openapi.json` — generated OpenAPI document.

### HTTP contract for backend integration

Method: `POST`  
Endpoint: `/predict`  
Content type: `application/json`

Required fields:

| Field | Type | Validation |
| --- | --- | --- |
| `categoryName` | string | non-blank |
| `stars` | number | `0 <= stars <= 5` |
| `reviews` | number | non-negative |
| `price` | number | non-negative |
| `boughtInLastMonth` | number | non-negative |

Successful response shape:

```json
{
  "success": true,
  "product": {
    "categoryName": "Electronics",
    "stars": 4.5,
    "reviews": 2500,
    "price": 45000,
    "boughtInLastMonth": 1200
  },
  "prediction": {
    "ai_product_score": 78.24,
    "bestseller_probability_percent": 100.0,
    "predicted_bestseller": true,
    "prediction_label": "Bestseller",
    "threshold_used": 0.5
  }
}
```

The response values above were captured from the supplied artifact in this
workspace for the sample request. The service always recalculates them from
the artifact at runtime.

Validation errors return HTTP `422`. If the model cannot be loaded or a model
inference failure occurs, the API returns HTTP `503` without exposing a stack
trace or internal file path.

### curl

```powershell
curl.exe -X POST http://localhost:8000/predict `
  -H "Content-Type: application/json" `
  -d '{"categoryName":"Electronics","stars":4.5,"reviews":2500,"price":45000,"boughtInLastMonth":1200}'
```

### Python requests

```python
import requests

response = requests.post(
    "http://localhost:8000/predict",
    json={
        "categoryName": "Electronics",
        "stars": 4.5,
        "reviews": 2500,
        "price": 45000,
        "boughtInLastMonth": 1200,
    },
    timeout=10,
)
response.raise_for_status()
print(response.json()["prediction"]["ai_product_score"])
```

### Node.js backend example

```javascript
const response = await fetch("http://localhost:8000/predict", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    categoryName: "Electronics",
    stars: 4.5,
    reviews: 2500,
    price: 45000,
    boughtInLastMonth: 1200
  })
});

if (!response.ok) {
  throw new Error(`ShopPilot AI API failed: ${response.status}`);
}

const result = await response.json();
console.log(result.prediction.ai_product_score);
```

`localhost` works only when the calling backend runs on the same machine. For
separate machines or containers, use the reachable service hostname/address,
open only the required network path, and configure CORS for browser callers.

## Network and production deployment

For local-network development, bind to the required interface explicitly:

```powershell
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Do not use unrestricted CORS by default. Before public deployment, add
authentication, authorization, TLS termination, rate limiting, request-size
limits, structured logging, and a process manager/container health policy.
Keep the model artifact and any credentials outside public source control when
the repository is public.

## Tests

```powershell
pytest -q
```

The suite covers health and metadata, validation, single and batch inference,
model-loading failures, score/probability ranges, positive-class label
mapping, and an integration prediction using the supplied artifact.

