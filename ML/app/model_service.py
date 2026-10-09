"""Model loading and vectorized prediction for the ShopPilot API."""

from __future__ import annotations

import logging
import os
import sys
import warnings
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from scipy import sparse
from sklearn.base import BaseEstimator, TransformerMixin

from .scoring import calculate_product_scores


logger = logging.getLogger(__name__)

MODEL_FEATURES = [
    "categoryName",
    "stars",
    "reviews",
    "price",
    "boughtInLastMonth",
]
MODEL_OUTPUTS = [
    "ai_product_score",
    "bestseller_probability_percent",
    "predicted_bestseller",
]
DEFAULT_MODEL_FILENAME = "shop_pilot_ai_pipeline.joblib"


class PredictionError(RuntimeError):
    """Raised when the loaded model cannot produce a valid prediction."""


class FeatureWeighter(BaseEstimator, TransformerMixin):
    """Compatibility definition for the notebook-defined transformer.

    The serialized artifact records this class as ``__main__.FeatureWeighter``
    because it was created in a notebook. The definition is intentionally kept
    behaviorally identical to the training notebook.
    """

    def __init__(self, weights: Any):
        self.weights = weights

    def fit(self, X: Any, y: Any = None) -> "FeatureWeighter":
        return self

    def transform(self, X: Any) -> Any:
        if sparse.issparse(X):
            return X.multiply(self.weights).tocsr()
        return X * self.weights


def _install_artifact_compatibility() -> None:
    """Install narrow aliases for stale private symbols in this artifact.

    The artifact was saved by scikit-learn 1.6.1. In scikit-learn 1.9.0 the
    private remainder-column helper was removed, and the SGD loss class moved.
    These aliases only affect deserialization; the model file is not modified.
    """

    import sklearn.compose._column_transformer as column_transformer

    if not hasattr(column_transformer, "_RemainderColsList"):

        class _RemainderColsList(list):
            def __setstate__(self, state: object) -> None:
                if isinstance(state, dict):
                    data = state.get("data")
                    if isinstance(data, (list, tuple)):
                        self.extend(data)
                    self.__dict__.update(state)
                elif isinstance(state, (list, tuple)):
                    self.extend(state)

        column_transformer._RemainderColsList = _RemainderColsList

    # scikit-learn 1.6.1 pickled CyHalfBinomialLoss as `_loss.*`.
    if "_loss" not in sys.modules:
        try:
            import sklearn._loss.loss as loss_module
        except ImportError:
            logger.debug("No scikit-learn loss compatibility alias installed")
        else:
            sys.modules["_loss"] = loss_module

    # The notebook's custom class was serialized under the __main__ module.
    main_module = sys.modules.get("__main__")
    if main_module is not None and not hasattr(main_module, "FeatureWeighter"):
        setattr(main_module, "FeatureWeighter", FeatureWeighter)


def resolve_model_path(configured_path: str | os.PathLike[str] | None = None) -> Path:
    """Resolve MODEL_PATH from the current directory or repository directory."""

    configured = configured_path or os.getenv("MODEL_PATH") or DEFAULT_MODEL_FILENAME
    path = Path(configured).expanduser()
    if path.is_absolute():
        return path

    current_directory_path = Path.cwd() / path
    if current_directory_path.exists():
        return current_directory_path

    repository_path = Path(__file__).resolve().parents[1] / path
    return repository_path


class ModelService:
    """Owns one loaded artifact and performs all inference through it."""

    def __init__(
        self,
        artifact_path: str | os.PathLike[str] | None = None,
        *,
        model: Any | None = None,
        product_score_weights: dict[str, float] | None = None,
        prediction_threshold: float | None = None,
        popularity_reference: float | None = None,
        reviews_reference: float | None = None,
        price_reference: float | None = None,
    ) -> None:
        self.artifact_path = resolve_model_path(artifact_path)
        self.model = model
        self.product_score_weights = product_score_weights
        self.prediction_threshold = prediction_threshold
        self.popularity_reference = popularity_reference
        self.reviews_reference = reviews_reference
        self.price_reference = price_reference
        self.load_error: str | None = None
        self._load_attempted = model is not None

    @property
    def loaded(self) -> bool:
        return self.model is not None and self.load_error is None

    def load(self) -> bool:
        """Load and validate the artifact exactly once."""

        if self._load_attempted:
            return self.loaded
        self._load_attempted = True

        try:
            if not self.artifact_path.is_file():
                raise FileNotFoundError(f"Model artifact not found: {self.artifact_path}")

            _install_artifact_compatibility()
            with warnings.catch_warnings(record=True) as caught_warnings:
                warnings.simplefilter("always")
                saved = joblib.load(self.artifact_path)
            for warning in caught_warnings:
                logger.warning("Model artifact warning: %s", warning.message)

            if not isinstance(saved, dict):
                raise ValueError("Model artifact must contain a dictionary")

            required_keys = {
                "pipeline",
                "product_score_weights",
                "prediction_threshold",
                "popularity_reference",
                "reviews_reference",
                "price_reference",
            }
            missing_keys = sorted(required_keys - saved.keys())
            if missing_keys:
                raise ValueError(f"Model artifact is missing keys: {missing_keys}")

            model = saved["pipeline"]
            classes = list(getattr(model, "classes_", []))
            if not callable(getattr(model, "predict_proba", None)) or 1 not in classes:
                raise ValueError("Saved pipeline must expose predict_proba and class 1")

            threshold = float(saved["prediction_threshold"])
            if not np.isfinite(threshold) or not 0 <= threshold <= 1:
                raise ValueError("Saved prediction threshold must be between 0 and 1")

            self.model = model
            self.product_score_weights = dict(saved["product_score_weights"])
            self.prediction_threshold = threshold
            self.popularity_reference = float(saved["popularity_reference"])
            self.reviews_reference = float(saved["reviews_reference"])
            self.price_reference = float(saved["price_reference"])
            self.load_error = None
            logger.info("ShopPilot AI model loaded from %s", self.artifact_path)
            return True
        except Exception as exc:
            self.model = None
            self.load_error = f"{type(exc).__name__}: {exc}"
            logger.exception("Unable to load ShopPilot AI model")
            return False

    def public_info(self) -> dict[str, Any]:
        return {
            "model_name": "ShopPilot AI",
            "model_loaded": self.loaded,
            "prediction_threshold": self.prediction_threshold
            if self.loaded
            else None,
            "input_features": MODEL_FEATURES,
            "outputs": MODEL_OUTPUTS,
        }

    def predict_products(self, products: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Run vectorized score calculation and model inference in input order."""

        if not self.loaded:
            raise PredictionError("The model is not available")
        if not products:
            raise PredictionError("At least one product is required")
        if any(value is None for value in (
            self.product_score_weights,
            self.prediction_threshold,
            self.popularity_reference,
            self.reviews_reference,
            self.price_reference,
        )):
            raise PredictionError("The model configuration is incomplete")

        frame = pd.DataFrame(products, columns=MODEL_FEATURES)
        try:
            probabilities = np.asarray(self.model.predict_proba(frame), dtype=float)
            classes = list(getattr(self.model, "classes_", []))
            positive_index = classes.index(1)
            if probabilities.ndim != 2 or probabilities.shape[0] != len(frame):
                raise ValueError("Model returned an invalid probability shape")
            positive_probabilities = probabilities[:, positive_index]
            scores = calculate_product_scores(
                frame,
                self.product_score_weights,
                self.popularity_reference,
                self.reviews_reference,
                self.price_reference,
            )
        except Exception as exc:
            raise PredictionError("Model inference failed") from exc

        if not np.all(np.isfinite(positive_probabilities)):
            raise PredictionError("Model returned non-finite probabilities")

        positive_probabilities = np.clip(positive_probabilities, 0.0, 1.0)
        threshold = float(self.prediction_threshold)
        response: list[dict[str, Any]] = []
        for product, score, probability in zip(
            products,
            scores,
            positive_probabilities,
            strict=True,
        ):
            predicted = bool(probability >= threshold)
            response.append(
                {
                    "product": product,
                    "prediction": {
                        "ai_product_score": float(score),
                        "bestseller_probability_percent": round(
                            float(probability * 100.0), 2
                        ),
                        "predicted_bestseller": predicted,
                        "prediction_label": (
                            "Bestseller" if predicted else "Not Bestseller"
                        ),
                        "threshold_used": threshold,
                    },
                }
            )
        return response

