import mongoose from "mongoose"
import Conversation from "../Model/conversationModel.js"
import Message from "../Model/messageModel.js"
import {
    acquireLock, findExistingTurn, getRequestId, isObjectIdString, maybeSummarize, releaseLock, runTurn,
    sendChatError, validateQuery
} from "../services/chatService.js"

export const getAllChatMessages = async (req, res, next) => {
    try {
        const { id } = req.user ?? {}
        if (!id) return res.status(401).json("Unauthorized")
        const { chatId } = req.params
        if (!isObjectIdString(chatId)) return res.status(400).json("Invalid chat id")
        const chat = await Conversation.findById(chatId).select("userId").lean()
        if (!chat) return res.status(404).json("No chat found")
        if (chat.userId?.toString() !== id) return res.status(403).json("Forbidden")
        const messages = await Message.find({ conversationId: new mongoose.Types.ObjectId(chatId) }).sort({ _id: 1 })
        return res.status(200).json({ messages })
    } catch (error) {
        next(error)
    }
}

export const createMessage = async (req, res, next) => {
    let lock
    const { chatId } = req.params
    try {
        const { id } = req.user ?? {}
        if (!id) return res.status(401).json({ success: false, message: "Unauthorized" })
        if (!isObjectIdString(chatId)) return res.status(400).json({ success: false, message: "Invalid chat id" })
        const query = validateQuery(req.body?.query)
        const requestId = getRequestId(req)

        lock = await acquireLock(chatId, id) // also validates existence and ownership

        const existing = await findExistingTurn(lock.conversation._id, requestId)
        if (existing) {
            await releaseLock(chatId, lock.lockId)
            lock = null
            return res.status(200).json({
                success: true, duplicate: true, messages: [existing.userMessage, existing.assistantMessage],
                answer: existing.assistantMessage.message, intent: existing.assistantMessage.metadata?.intent
            })
        }

        const { conversation, summarized } = await maybeSummarize(lock.conversation)
        const turn = await runTurn({ conversation, query, requestId })
        // Release before responding so the client's next message never races the lock.
        await releaseLock(chatId, lock.lockId)
        lock = null
        const chat = await Conversation.findById(chatId).select("-activeRequest").lean()

        return res.status(201).json({
            success: true,
            chat,
            messages: [turn.userMessage, turn.assistantMessage],
            answer: turn.answer,
            intent: turn.intent,
            products: turn.products,
            sources: turn.sources,
            summarized
        })
    } catch (error) {
        return sendChatError(error, res, next)
    } finally {
        if (lock) await releaseLock(chatId, lock.lockId)
    }
}

export const updateMessage = (req, res, next) => {
    try {

    } catch (error) {
        next(error)
    }
}
