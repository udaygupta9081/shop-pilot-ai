import mongoose from "mongoose"
import Conversation from "../Model/conversationModel.js"
import Message from "../Model/messageModel.js"
import axios from "axios"

const RAG_SERVICE_URL = process.env.RAG_URL || "http://127.0.0.1:8000";
const NAMING_TIMEOUT_MS = Number(process.env.NAMING_TIMEOUT_MS) || 3000;

export const getAllChatMessages = (req, res, next) => {
    try {

    } catch (error) {
        next(error)
    }
}

export const createMessage = async (req, res, next) => {
    try {
        const { chatId } = req.params
        const { id } = req.user
        if (!req.user) return res.status(401).json("Unauthorized")
        const conversation = await Conversation.findOne({ _id: chatId })
        if (!conversation) return res.status(400).json("No conversation found")
        const { unsummarizedMessageCount, summary } = conversation
        const prevMessages = await Message.find({
            conversationId: new mongoose.Types.ObjectId(chatId)
        }).sort({ createdAt: -1 }).limit(unsummarizedMessageCount);
        if (unsummarizedMessageCount >= 10) {
            //summarize the current and previous summary
            // decrease unsummaried count and update the unsummarizedCnt
            try {
                const summaryResponse = await axios.post(
                    `${RAG_SERVICE_URL}/api/v1/summarization/summarize`,
                    { summary, messages: prevMessages },
                    { timeout: 10000 }
                );
                const newSummary = summaryResponse.data?.newSummary;
                console.log({ newSummary })
            } catch (error) {
                console.warn("[Summarization Agent] Call failed:", error.message);
            }
        }



        //call llm with this messges, summary and query
        return res.status(200).json({ messages: prevMessages })




    } catch (error) {
        next(error)
    }
}

export const updateMessage = (req, res, next) => {
    try {

    } catch (error) {
        next(error)
    }
}