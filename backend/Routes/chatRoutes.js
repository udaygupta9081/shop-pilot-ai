import express from "express"
import rateLimit from "express-rate-limit"
import { getAllChats, getChat, createChat, deleteChat, renameChat } from "../Controller/chatController.js"
import { getAllChatMessages, createMessage, createGuestMessage, updateMessage } from "../Controller/messageController.js"
import { requireAuth } from "../middleware/requireAuth.js"

const Router = express.Router()

const guestChatLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { success: false, message: "Guest chat limit reached. Please try again later." }
})

Router.post("/guest/message", guestChatLimit, createGuestMessage)
Router.get("/", requireAuth, getAllChats)
Router.put("/:chatId", requireAuth, renameChat)
Router.delete("/:chatId", requireAuth, deleteChat)
Router.get("/:chatId", requireAuth, getChat)
Router.post("/", requireAuth, createChat)

////messages
Router.get("/message/:chatId", requireAuth, getAllChatMessages)
Router.post("/message/:chatId", requireAuth, createMessage)
Router.put("/message/:messageId", requireAuth, updateMessage)


export default Router






