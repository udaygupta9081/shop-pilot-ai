import express from "express"
import { getAllChats, getChat, createChat } from "../Controller/chatController.js"
import { getAllChatMessages, createMessage, updateMessage } from "../Controller/messageController.js"
import { verifyToken } from "../middleware/verifyToken.js"

const Router = express.Router()

Router.get("/", verifyToken, getAllChats)
Router.get("/:chatId", verifyToken, getChat)
Router.post("/", verifyToken, createChat)

////messages
Router.get("/message/:chatId", verifyToken, getAllChatMessages)
Router.post("/message/:chatId", verifyToken, createMessage)
Router.put("/message/:messageId", verifyToken, updateMessage)


export default Router








