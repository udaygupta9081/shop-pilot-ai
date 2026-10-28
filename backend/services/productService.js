import mongoose from "mongoose"
import { Product } from "../catalog/models/Product.js"

// Fields the response agent and the client need; queried through the product connection (MONGO_URI).
const PRODUCT_FIELDS = "asin title imgUrl productURL price stars reviews isBestSeller boughtInLastMonth mainCategory subcategory aiProductScore"

export const isProductId = (id) => typeof id === "string" && /^[a-f0-9]{24}$/i.test(id)

/**
 * Loads products by Qdrant `productId` (= products._id hex), preserving input order.
 * Invalid and duplicate ids are dropped; ids not found are returned in `missing`.
 */
export const getProductsByIds = async (ids = []) => {
    const ordered = [...new Set((ids || []).filter(isProductId).map((id) => id.toLowerCase()))]
    if (ordered.length === 0) return { products: [], missing: [] }
    const docs = await Product.find({ _id: { $in: ordered.map((id) => new mongoose.Types.ObjectId(id)) } })
        .select(PRODUCT_FIELDS)
        .lean()
    const byId = new Map(docs.map((doc) => [doc._id.toString(), doc]))
    const products = []
    const missing = []
    for (const id of ordered) {
        const doc = byId.get(id)
        if (!doc) { missing.push(id); continue }
        const { _id, ...fields } = doc
        products.push({ product_id: id, ...fields })
    }
    return { products, missing }
}
