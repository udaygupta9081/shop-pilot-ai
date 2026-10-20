import Conversation from "../Model/conversationModel.js"
import Message from "../Model/messageModel.js"
import axios from "axios"
import mongoose from "mongoose"

export const getChat = async (req, res, next) => {
    try {
        const { id } = req.user;
        if (!id) return res.status(401).json("Unauthorized")
        const { chatId } = req.params;
        if (!chatId) return res.status(404).json("No chat id provided")
        const chat = await Conversation.findOne({ _id: new mongoose.Types.ObjectId(chatId) })
        if (!chat) return res.status(404).json("No chat found")
        if (chat.userId.toString() !== id) return res.status(403).json("Forbidden")
        const messages = await Message.find({ conversationId: new mongoose.Types.ObjectId(chatId) }).sort({ createdAt: 1 })
        res.status(200).json({ chat, messages })
    } catch (error) {
        next(error)
    }
}

const RAG_SERVICE_URL = process.env.RAG_URL || "http://127.0.0.1:8000";
const NAMING_TIMEOUT_MS = Number(process.env.NAMING_TIMEOUT_MS) || 3000;

export const getAllChats = async (req, res, next) => {
    try {
        const { id } = req.user;
        if (!id) return res.status(401).json("Unauthorized")
        console.log(req.user)
        const chats = await Conversation.find({ userId: new mongoose.Types.ObjectId(id) }).sort({ updatedAt: -1 })
        if (!chats) return res.status(404).json("No chats found")
        res.status(200).json(chats)
    } catch (error) {
        next(error)
    }
}

export const createChat = async (req, res, next) => {
    try {
        const { id } = req.user;
        if (!id) return res.status(401).json("Unauthorized");

        const query = req.body?.query || "";
        const cleanQuery = typeof query === "string" ? query.trim() : "";

        // Immediate sensible fallback title from query
        const fallbackTitle = cleanQuery
            ? (cleanQuery.length > 35 ? `${cleanQuery.slice(0, 35)}...` : cleanQuery)
            : "New Chat";

        let title = fallbackTitle;
        let backgroundPromise = null;

        // Fetch AI title from RAG Naming API
        if (cleanQuery) {
            const fetchNamingPromise = axios.post(
                `${RAG_SERVICE_URL}/api/v1/naming/title`,
                { query: cleanQuery },
                { timeout: 10000 }
            ).then((res) => {
                const genTitle = res.data?.title;
                return (genTitle && typeof genTitle === "string" && genTitle.trim() && genTitle.trim() !== "New Chat")
                    ? genTitle.trim()
                    : null;
            }).catch((err) => {
                console.warn("[Naming Agent] Call failed:", err.message);
                return null;
            });

            // Wait up to NAMING_TIMEOUT_MS (3s) to return the AI title directly without client timeout
            const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), NAMING_TIMEOUT_MS));

            try {
                const fastTitle = await Promise.race([fetchNamingPromise, timeoutPromise]);
                if (fastTitle) {
                    title = fastTitle;
                } else {
                    // If it exceeds NAMING_TIMEOUT_MS, let it update in the background
                    backgroundPromise = fetchNamingPromise;
                }
            } catch {
                title = fallbackTitle;
            }
        }

        const newChat = await Conversation.create({
            userId: new mongoose.Types.ObjectId(id),
            title
        });
        if (!newChat) return res.status(400).json("Something went wrong while creating chat");

        const message = await Message.create({
            conversationId: new mongoose.Types.ObjectId(newChat._id),
            sender: "User",
            message: query
        });
        if (!message) return res.status(400).json("Something went wrong while creating message");

        // send the message/content to agent and get response and store in database
        // const agentResponse = await agent.run({ message: query })
        const agentResponse = "this is a test message";
        const agentMessage = await Message.create({
            conversationId: new mongoose.Types.ObjectId(newChat._id),
            sender: "Assistent",
            message: agentResponse
        });
        if (!agentMessage) {
            await Message.deleteOne({ _id: message._id });
            await Conversation.deleteOne({ _id: newChat._id });
            return res.status(400).json("Something went wrong while creating agent message");
        }

        // If naming finished after response was prepared, update title in MongoDB
        if (backgroundPromise) {
            backgroundPromise.then(async (bgTitle) => {
                if (bgTitle && bgTitle !== fallbackTitle) {
                    await Conversation.findByIdAndUpdate(newChat._id, { title: bgTitle }, { unsummarizedMessageCount: 2 });
                    console.log(`[Naming Agent] Background updated chat ${newChat._id} title to: "${bgTitle}"`);
                }
            }).catch((err) => {
                console.warn("[Naming Agent] Background update error:", err.message);
            });
        }

        return res.status(201).json({ chat: newChat, messages: [message, agentMessage] });
    } catch (error) {
        next(error);
    }
}
