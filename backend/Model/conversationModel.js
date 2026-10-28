import mongoose from "mongoose"

const { Schema } = mongoose

const productSetSchema = new Schema({
    messageId: { type: mongoose.Types.ObjectId, ref: "Message" },
    kind: { type: String, enum: ["recommended", "discussed"], default: "recommended" },
    products: [{
        productId: { type: mongoose.Types.ObjectId, required: true },
        position: { type: Number, required: true },
        title: { type: String },
        _id: false
    }]
}, { _id: false, timestamps: { createdAt: true, updatedAt: false } })

export const MAX_PRODUCT_SETS = 5

const conversationSchema = new Schema({
    userId: {
        type: mongoose.Types.ObjectId,
        ref: "User"
    },
    title: {
        type: String,
        default: "New Chat"
    },
    // Cumulative summary of every message with _id <= summarizedThroughMessageId.
    summary: {
        type: String,
        default: ""
    },
    // Number of persisted messages (User AND Assistent) after the summary boundary.
    unsummarizedMessageCount: {
        type: Number,
        default: 0
    },
    summarizedThroughMessageId: {
        type: mongoose.Types.ObjectId,
        default: null
    },
    // Optimistic-concurrency token for summary/boundary writes.
    summaryVersion: {
        type: Number,
        default: 0
    },
    // Structured product references from the most recent assistant turns (oldest first, capped).
    productSets: {
        type: [productSetSchema],
        default: []
    },
    // Per-conversation lock so two turns are never processed concurrently.
    activeRequest: {
        id: { type: String, default: null },
        startedAt: { type: Date, default: null }
    }
}, { timestamps: true })

export default mongoose.model("Conversation", conversationSchema)
