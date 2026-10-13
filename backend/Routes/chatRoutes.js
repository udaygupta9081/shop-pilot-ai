import express from "express"
import { getAllChats, getChat, createChat } from "../Controller/chatController.js"
import { getAllChatMessages, createMessage, updateMessage } from "../Controller/messageController.js"
import { verifyToken } from "../utils/jwtAuth.js"

const Router = express.Router()

Router.get("/user/:userId", verifyToken, getAllChats)
Router.get("/:chatId", verifyToken, getChat)
Router.post("/user/:userId", verifyToken, createChat)

////messages
Router.get("/message/:chatId", verifyToken, getAllChatMessages)
Router.post("/message/:chatId", verifyToken, createMessage)
Router.put("/message/:messageId", verifyToken, updateMessage)


export default Router








