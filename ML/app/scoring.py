"""Deterministic heuristic scoring used alongside ML inference."""

from __future__ import annotations

from collections.abc import Mapping

import numpy as np
import pandas as pd


def _safe_numeric(
    values: pd.Series,
    *,
    default: float,
    lower: float | None = None,
    upper: float | None = None,
) -> pd.Series:
    """Convert a feature to finite numeric values and apply safe bounds."""

    result = pd.to_numeric(values, errors="coerce")
    result = result.replace([np.inf, -np.inf], np.nan).fillna(default)
    if lower is not None:
        result = result.clip(lower=lower)
    if upper is not None:
        result = result.clip(upper=upper)
    return result.astype(float)


def calculate_product_scores(
    products: pd.DataFrame,
    product_score_weights: Mapping[str, float],
    popularity_reference: float,
    reviews_reference: float,
    price_reference: float,
) -> np.ndarray:
    """Calculate one safe, strictly-below-100 heuristic score per product.

    The artifact's official score keys are ``rating``, ``popularity``,
    ``reviews``, and ``affordability``. Their source features are respectively
    ``stars``, ``boughtInLastMonth``, ``reviews``, and ``price``. Only matching
    keys contribute, and the result is normalized by the weights used.
    """

    if not isinstance(products, pd.DataFrame):
        raise TypeError("products must be a pandas DataFrame")

    references = {
        "popularity_reference": popularity_reference,
        "reviews_reference": reviews_reference,
        "price_reference": price_reference,
    }
    for name, value in references.items():
        numeric_value = float(value)
        if not np.isfinite(numeric_value) or numeric_value <= 0:
            raise ValueError(f"{name} must be a finite positive number")

    stars = _safe_numeric(products["stars"], default=0.0, lower=0.0, upper=5.0)
    reviews = _safe_numeric(products["reviews"], default=0.0, lower=0.0)
    purchases = _safe_numeric(
        products["boughtInLastMonth"],
        default=0.0,
        lower=0.0,
    )
    price = _safe_numeric(
        products["price"],
        default=float(price_reference),
        lower=0.0,
    )

    component_scores = {
        "rating": (stars / 5.0 * 100.0).to_numpy(dtype=float),
        "popularity": (
            np.log1p(purchases.to_numpy(dtype=float))
            / np.log1p(float(popularity_reference))
            * 100.0
        ),
        "reviews": (
            np.log1p(reviews.to_numpy(dtype=float))
            / np.log1p(float(reviews_reference))
            * 100.0
        ),
        "affordability": (
            1.0 - price.to_numpy(dtype=float) / float(price_reference)
        )
        * 100.0,
    }

    for key in ("popularity", "reviews", "affordability"):
        component_scores[key] = np.clip(component_scores[key], 0.0, 100.0)

    weighted_sum = np.zeros(len(products), dtype=float)
    used_weight = 0.0
    for key, raw_weight in product_score_weights.items():
        try:
            weight = float(raw_weight)
        except (TypeError, ValueError) as exc:
            raise ValueError(f"Invalid product score weight for {key!r}") from exc
        if not np.isfinite(weight) or weight < 0:
            raise ValueError(f"Product score weight for {key!r} must be non-negative")
        if key not in component_scores or weight == 0:
            continue
        weighted_sum += component_scores[key] * weight
        used_weight += weight

    if used_weight <= 0:
        raise ValueError("No valid product-score weights were found")

    score = weighted_sum / used_weight
    score = np.nan_to_num(score, nan=0.0, posinf=99.99, neginf=0.0)
    return np.round(np.clip(score, 0.0, 99.99), 2)


def calculate_product_score(
    product: Mapping[str, object] | pd.Series,
    product_score_weights: Mapping[str, float],
    popularity_reference: float,
    reviews_reference: float,
    price_reference: float,
) -> float:
    """Convenience wrapper for calculating the score of one product."""

    frame = pd.DataFrame([dict(product)])
    return float(
        calculate_product_scores(
            frame,
            product_score_weights,
            popularity_reference,
            reviews_reference,
            price_reference,
        )[0]
    )

