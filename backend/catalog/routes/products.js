import { Router } from "express";
import { Product } from "../models/Product.js";
import { buildSearchFilter, cleanQuery, parsePagination, parseSort, MIN_QUERY_LENGTH } from "../utils/query.js";

const router = Router();

const LIST_FIELDS = "asin title imgUrl price stars reviews isBestSeller aiProductScore mainCategory mainSlug subcategory subSlug";
const ASIN_RE = /^[A-Za-z0-9]{10}$/;

/** Shared by /search, /products?search= and category listings. */
export async function runProductQuery({ filter, query, defaultSort }) {
  const { page, limit, skip } = parsePagination(query);
  const { sort, extra } = parseSort(query.sort || defaultSort);
  const finalFilter = { ...filter, ...extra };
  const wantTotal = query.withTotal !== "false"; // dropdown passes withTotal=false to skip the count
  const [items, total] = await Promise.all([
    Product.find(finalFilter).select(LIST_FIELDS).sort(sort).skip(skip).limit(limit).lean(),
    wantTotal ? Product.countDocuments(finalFilter) : Promise.resolve(null),
  ]);
  return {
    items: items.map(({ _id, ...rest }) => rest),
    page,
    limit,
    total,
    totalPages: total === null ? null : Math.max(1, Math.ceil(total / limit)),
  };
}

async function searchHandler(req, res, next) {
  try {
    const raw = req.query.q ?? req.query.search;
    const q = cleanQuery(raw);
    if (!q) return res.status(400).json({ error: "Query is required", minLength: MIN_QUERY_LENGTH });
    const filter = buildSearchFilter(q);
    if (!filter) return res.status(400).json({ error: `Query must be at least ${MIN_QUERY_LENGTH} characters`, minLength: MIN_QUERY_LENGTH });
    res.json({ query: q, ...(await runProductQuery({ filter, query: req.query, defaultSort: "popular" })) });
  } catch (err) {
    next(err);
  }
}

router.get("/search", searchHandler);

// GET /api/products?search=jbl&page=1&limit=24  (optional: category=<subSlug>, main=<mainSlug>)
router.get("/", async (req, res, next) => {
  try {
    if (req.query.search !== undefined) return searchHandler(req, res, next);
    const filter = {};
    if (typeof req.query.category === "string") filter.subSlug = req.query.category;
    if (typeof req.query.main === "string") filter.mainSlug = req.query.main;
    if (req.query.bestSeller === "true") filter.isBestSeller = true;
    res.json(await runProductQuery({ filter, query: req.query, defaultSort: "rating" }));
  } catch (err) {
    next(err);
  }
});

router.get("/:asin", async (req, res, next) => {
  try {
    if (!ASIN_RE.test(req.params.asin)) return res.status(400).json({ error: "Invalid product id" });
    const product = await Product.findOne({ asin: req.params.asin.toUpperCase() }).lean();
    if (!product) return res.status(404).json({ error: "Product not found" });
    const { _id, __v, keywords, ...publicFields } = product;
    res.json(publicFields);
  } catch (err) {
    next(err);
  }
});

export default router;
