import { Router } from "express";
import { Category } from "../models/Category.js";
import { buildSearchFilter, cleanQuery } from "../utils/query.js";
import { runProductQuery } from "./products.js";

const router = Router();
const pub = ({ _id, __v, createdAt, updatedAt, ...rest }) => rest;

// GET /api/categories -> [{ ...main, subcategories: [...] }] (only categories that have products)
router.get("/", async (_req, res, next) => {
  try {
    const all = await Category.find({ productCount: { $gt: 0 } }).sort({ order: 1, name: 1 }).lean();
    const mains = all.filter((c) => c.type === "main").map(pub);
    const subs = all.filter((c) => c.type === "sub").map(pub);
    res.json(mains.map((m) => ({ ...m, subcategories: subs.filter((s) => s.parentSlug === m.slug) })));
  } catch (err) {
    next(err);
  }
});

router.get("/:slug", async (req, res, next) => {
  try {
    const cat = await Category.findOne({ slug: req.params.slug }).lean();
    if (!cat) return res.status(404).json({ error: "Category not found" });
    const result = pub(cat);
    if (cat.type === "main") {
      const subs = await Category.find({ parentSlug: cat.slug, productCount: { $gt: 0 } }).sort({ order: 1 }).lean();
      result.subcategories = subs.map(pub);
    } else {
      const parent = await Category.findOne({ slug: cat.parentSlug }).lean();
      result.parent = parent ? { name: parent.name, slug: parent.slug } : null;
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/categories/:slug/products?page=1&limit=24&sort=rating&q=optional
router.get("/:slug/products", async (req, res, next) => {
  try {
    const cat = await Category.findOne({ slug: req.params.slug }).lean();
    if (!cat) return res.status(404).json({ error: "Category not found" });
    const filter = cat.type === "main" ? { mainSlug: cat.slug } : { subSlug: cat.slug };
    const q = cleanQuery(req.query.q);
    if (q) {
      const search = buildSearchFilter(q);
      if (!search) return res.status(400).json({ error: "Query must be at least 2 characters" });
      Object.assign(filter, search);
    }
    res.json({ category: pub(cat), ...(await runProductQuery({ filter, query: req.query, defaultSort: "rating" })) });
  } catch (err) {
    next(err);
  }
});

export default router;
