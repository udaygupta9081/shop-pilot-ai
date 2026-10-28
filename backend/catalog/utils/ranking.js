import { Product } from "../models/Product.js";

// Marketing labels in the source data, not real aisles: never featured on the homepage.
const EXCLUDED_MAIN = ["customers-most-loved", "other"];
const MIN_PRODUCTS = 100;       // tiny categories give noisy averages, so they are skipped
const HIGH_SCORE = 95;          // "high scoring" product = AI score of 95 or more
const CACHE_MS = 10 * 60 * 1000; // the data only changes when you re-import, so cache for 10 minutes

const cache = new Map(); // key -> { at, promise }

/**
 * Ranks categories by their AVERAGE AI product score (highest first).
 * Each category also gets the picture of its own best product (highest AI score,
 * most reviews as tie-break), so the homepage cards show real product images.
 *
 *   level "main" -> one card per main category (Electronics, Beauty, ...)
 *   level "sub"  -> one card per subcategory   (Body Lotions, Toothbrushes, ...)
 */
export function getRankedCategories({ level = "sub", limit = 12 } = {}) {
  const key = `${level}:${limit}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.promise;

  const promise = compute(level, limit).catch((err) => {
    cache.delete(key); // do not cache failures
    throw err;
  });
  cache.set(key, { at: Date.now(), promise });
  return promise;
}

async function compute(level, limit) {
  const isMain = level === "main";
  const idField = isMain ? "$mainSlug" : "$subSlug";
  const nameField = isMain ? "$mainCategory" : "$subcategory";

  const rows = await Product.aggregate(
    [
      { $match: { aiProductScore: { $ne: null }, mainSlug: { $nin: EXCLUDED_MAIN } } },
      {
        $project: {
          asin: 1, title: 1, imgUrl: 1, aiProductScore: 1, reviews: 1,
          mainSlug: 1, mainCategory: 1, subSlug: 1, subcategory: 1,
          hasImg: { $cond: [{ $gt: [{ $strLenCP: { $ifNull: ["$imgUrl", ""] } }, 0] }, 1, 0] },
        },
      },
      // Best product first: has a picture, then highest AI score, then most reviews.
      { $sort: { hasImg: -1, aiProductScore: -1, reviews: -1 } },
      {
        $group: {
          _id: idField,
          name: { $first: nameField },
          mainSlug: { $first: "$mainSlug" },
          mainName: { $first: "$mainCategory" },
          productCount: { $sum: 1 },
          avgAiScore: { $avg: "$aiProductScore" },
          highScoreCount: { $sum: { $cond: [{ $gte: ["$aiProductScore", HIGH_SCORE] }, 1, 0] } },
          top: { $first: { asin: "$asin", title: "$title", imgUrl: "$imgUrl", aiProductScore: "$aiProductScore" } },
        },
      },
      { $match: { productCount: { $gte: MIN_PRODUCTS }, "top.imgUrl": { $nin: [null, ""] } } },
      { $sort: { avgAiScore: -1, productCount: -1 } },
      { $limit: limit },
    ],
    { allowDiskUse: true },
  );

  return rows.map((r) => ({
    slug: r._id,
    name: r.name,
    type: isMain ? "main" : "sub",
    mainSlug: r.mainSlug,
    mainName: r.mainName,
    productCount: r.productCount,
    avgAiScore: Math.round(r.avgAiScore * 10) / 10,
    highScoreCount: r.highScoreCount,
    topProduct: r.top,
  }));
}