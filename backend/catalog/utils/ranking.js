import { Product } from "../models/Product.js";

// Marketing labels in the source data, not real aisles: never featured on the homepage.
const EXCLUDED_MAIN = ["customers-most-loved", "other"];
const MIN_PRODUCTS = 100;        // tiny categories give noisy averages, so they are skipped
const HIGH_SCORE = 95;           // "high scoring" product = AI score of 95 or more
const SPARE = 10;                // extra categories fetched in case a few have no usable photo
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
  const groupField = isMain ? "mainSlug" : "subSlug";
  const nameField = isMain ? "$mainCategory" : "$subcategory";

  // Step 1: one cheap pass over the products that only counts and averages
  // (a few hundred small groups, no big sort, so it also works on a free Atlas cluster).
  const groups = await Product.aggregate([
    { $match: { aiProductScore: { $ne: null }, mainSlug: { $nin: EXCLUDED_MAIN } } },
    {
      $group: {
        _id: `$${groupField}`,
        name: { $first: nameField },
        mainSlug: { $first: "$mainSlug" },
        mainName: { $first: "$mainCategory" },
        productCount: { $sum: 1 },
        avgAiScore: { $avg: "$aiProductScore" },
        highScoreCount: { $sum: { $cond: [{ $gte: ["$aiProductScore", HIGH_SCORE] }, 1, 0] } },
      },
    },
    { $match: { productCount: { $gte: MIN_PRODUCTS } } },
    { $sort: { avgAiScore: -1, productCount: -1 } },
    { $limit: limit + SPARE },
  ]);

  // Step 2: for each of those categories, find its best product that has a picture.
  const cards = await Promise.all(
    groups.map(async (g) => {
      const top = await Product.findOne({
        [groupField]: g._id,
        aiProductScore: { $ne: null },
        imgUrl: { $nin: [null, ""] },
      })
        .sort({ aiProductScore: -1, reviews: -1 })
        .select("asin title imgUrl aiProductScore")
        .lean();
      if (!top) return null;
      return {
        slug: g._id,
        name: g.name,
        type: isMain ? "main" : "sub",
        mainSlug: g.mainSlug,
        mainName: g.mainName,
        productCount: g.productCount,
        avgAiScore: Math.round(g.avgAiScore * 10) / 10,
        highScoreCount: g.highScoreCount,
        topProduct: { asin: top.asin, title: top.title, imgUrl: top.imgUrl, aiProductScore: top.aiProductScore },
      };
    }),
  );

  return cards.filter(Boolean).slice(0, limit);
}