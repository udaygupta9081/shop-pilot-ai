import mongoose from "mongoose"

const { Schema } = mongoose

const messageSchema = new Schema({
    conversationId: {
        type: mongoose.Types.ObjectId,
        ref: "Conversation"
    },
    sender: {
        enum: ["User", "Assistent"],
        required: true
    },
    message: {
        type: String
    },

}, { timestamps: true })

export default mongoose.model("Message", messageSchema)