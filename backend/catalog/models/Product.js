import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    asin: { type: String, required: true, unique: true, uppercase: true, trim: true },
    title: { type: String, required: true },
    imgUrl: { type: String, default: null },
    productURL: { type: String, default: null },
    price: { type: Number, default: null },
    stars: { type: Number, default: null },
    reviews: { type: Number, default: null },
    isBestSeller: { type: Boolean, default: false },
    boughtInLastMonth: { type: Number, default: 0 },
    sourceCategory: { type: String, default: "" },
    mainCategory: { type: String, required: true },
    mainSlug: { type: String, required: true },
    subcategory: { type: String, required: true },
    subSlug: { type: String, required: true },
    bestsellerProbabilityPercent: { type: Number, default: null },
    predictedBestseller: { type: Boolean, default: false },
    predictionLabel: { type: String, default: null },
    aiProductScore: { type: Number, default: null },
    // lowercase title/category words; searched by anchored prefix match (index-friendly)
    keywords: { type: [String], default: [], select: false },
  },
  { timestamps: true, collection: "products" },
);

// asin unique index comes from `unique: true` above.
productSchema.index({ keywords: 1 });
productSchema.index({ subSlug: 1, stars: -1, reviews: -1 });
productSchema.index({ subSlug: 1, reviews: -1 });
productSchema.index({ subSlug: 1, price: 1 });
productSchema.index({ mainSlug: 1, stars: -1, reviews: -1 });
productSchema.index({ mainSlug: 1, reviews: -1 });
productSchema.index({ reviews: -1 });
productSchema.index({ stars: -1, reviews: -1 });
productSchema.index({ price: 1 });

export const Product = mongoose.models.Product || mongoose.model("Product", productSchema);
