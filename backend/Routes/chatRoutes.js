import express from "express"
import { getAllChats, getChat, createChat } from "../Controller/chatController.js"
import { getAllChatMessages, createMessage, updateMessage } from "../Controller/messageController.js"
import { requireAuth } from "../middleware/requireAuth.js"

const Router = express.Router()

Router.get("/", requireAuth, getAllChats)
Router.get("/:chatId", requireAuth, getChat)
Router.post("/", requireAuth, createChat)

////messages
Router.get("/message/:chatId", requireAuth, getAllChatMessages)
Router.post("/message/:chatId", requireAuth, createMessage)
Router.put("/message/:messageId", requireAuth, updateMessage)


export default Router







