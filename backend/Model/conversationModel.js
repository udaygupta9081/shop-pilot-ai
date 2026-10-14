import mongoose from "mongoose"

const { Schema } = mongoose

const conversationSchema = new Schema({
    userId: {
        type: mongoose.Types.ObjectId,
        ref: "User"
    },
    title: {
        type: String
    }
}, { timestamps: true })

export default mongoose.model("Conversation", conversationSchema)