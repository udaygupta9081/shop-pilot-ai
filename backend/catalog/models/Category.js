import mongoose from "mongoose";
import { productConnection } from "../../utils/db.js";

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    type: { type: String, enum: ["main", "sub"], required: true },
    mainCategory: { type: String, required: true },
    mainSlug: { type: String, required: true },
    parentSlug: { type: String, default: null }, // null for main categories
    productCount: { type: Number, default: 0 },
    order: { type: Number, default: 0 },
    thumbnail: { type: String, default: null }, // imgUrl of a real product in this subcategory
  },
  { timestamps: true, collection: "categories" },
);
categorySchema.index({ mainSlug: 1, order: 1 });
categorySchema.index({ parentSlug: 1, order: 1 });

export const Category = productConnection.models.Category || productConnection.model("Category", categorySchema);
