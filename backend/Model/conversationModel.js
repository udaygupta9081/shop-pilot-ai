import mongoose from "mongoose"

const { Schema } = mongoose

const conversationSchema = new Schema({
    userId: {
        type: mongoose.Types.ObjectId,
        ref: "User"
    },
    title: {
        type: String,
        default: "New Chat"
    },
    summary: {
        type: String,
        default: ""
    },
    unsummarizedMessageCount: {
        type: Number,
        default: 0
    }
}, { timestamps: true })

export default mongoose.model("Conversation", conversationSchema)