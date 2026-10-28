import mongoose from "mongoose"

const { Schema } = mongoose

// Kept as-is for compatibility with existing documents ("Assistent" is the stored value).
export const USER_SENDER = "User"
export const ASSISTANT_SENDER = "Assistent"

const productReferenceSchema = new Schema({
    productId: { type: mongoose.Types.ObjectId, required: true }, // products._id in MONGO_URI (= Qdrant payload productId)
    position: { type: Number, required: true },                   // 1-based order shown to the user
    title: { type: String }
}, { _id: false })

const messageSchema = new Schema({
    conversationId: {
        type: mongoose.Types.ObjectId,
        ref: "Conversation"
    },
    sender: {
        type: String,
        enum: [USER_SENDER, ASSISTANT_SENDER],
        required: true
    },
    message: {
        type: String
    },
    // Optional, so older messages without metadata stay valid.
    metadata: {
        requestId: { type: String },
        intent: { type: String },
        productReferences: { type: [productReferenceSchema], default: undefined },
        sources: { type: [{ title: String, url: String, _id: false }], default: undefined },
        retrievalSources: { type: [String], default: undefined },
        retrievalErrors: { type: [String], default: undefined }
    }

}, { timestamps: true })

messageSchema.index({ conversationId: 1, _id: 1 })
// Idempotency: one user message per client request id within a conversation.
messageSchema.index(
    { conversationId: 1, "metadata.requestId": 1, sender: 1 },
    { unique: true, partialFilterExpression: { "metadata.requestId": { $type: "string" } } }
)

export default mongoose.model("Message", messageSchema)
