import { mapCategory } from "../config/categoryMap.js";

const ASIN_RE = /^[A-Z0-9]{10}$/;
const MAX_KEYWORDS = 48;

/** Lowercase word tokens (unicode letters/digits). Shared by import and search. */
export function tokenize(text) {
  return String(text ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

export function buildKeywords(...texts) {
  const set = new Set();
  for (const t of texts) for (const w of tokenize(t)) set.add(w.slice(0, 40));
  return [...set].slice(0, MAX_KEYWORDS);
}

const toNumber = (v) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (s === "" || s.toLowerCase() === "nan") return null;
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
};
const positiveOrNull = (v) => {
  const n = toNumber(v);
  return n !== null && n > 0 ? n : null; // 0 / negative = "not available" in this dataset, never shown as a real value
};
const toBool = (v) => ["true", "1", "yes"].includes(String(v ?? "").trim().toLowerCase());
const validHttpUrl = (v) => {
  const s = String(v ?? "").trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:" ? s : null;
  } catch {
    return null;
  }
};

/**
 * Converts one raw CSV row into a Product document.
 * Returns { doc } or { error }. Never throws, never invents values: missing
 * numbers become null, invalid URLs become null.
 */
export function normalizeRow(row) {
  const asin = String(row.asin ?? "").trim().toUpperCase();
  if (!asin) return { error: "missing_asin" };
  if (!ASIN_RE.test(asin)) return { error: "invalid_asin" };

  const title = String(row.title ?? "").trim();
  if (!title) return { error: "missing_title", asin };

  const sourceCategory = String(row.categoryName ?? "").trim();
  const cat = mapCategory(sourceCategory);

  const doc = {
    asin,
    title,
    imgUrl: validHttpUrl(row.imgUrl),
    productURL: validHttpUrl(row.productURL),
    price: positiveOrNull(row.price),
    stars: positiveOrNull(row.stars),
    reviews: positiveOrNull(row.reviews),
    isBestSeller: toBool(row.isBestSeller), // actual flag from the data, NOT the model prediction
    boughtInLastMonth: toNumber(row.boughtInLastMonth) ?? 0,
    sourceCategory,
    mainCategory: cat.main,
    mainSlug: cat.mainSlug,
    subcategory: cat.sub,
    subSlug: cat.subSlug,
    // Prediction fields are kept separate from isBestSeller on purpose.
    bestsellerProbabilityPercent: toNumber(row.Bestseller_Probability_Percent),
    predictedBestseller: toBool(row.Predicted_Bestseller),
    predictionLabel: String(row.Prediction_Label ?? "").trim() || null,
    aiProductScore: toNumber(row.AI_Product_Score),
    keywords: buildKeywords(title, sourceCategory, cat.sub),
  };
  return { doc, mapped: cat.mapped };
}
