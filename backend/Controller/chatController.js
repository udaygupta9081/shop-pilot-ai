import Conversation from "../Model/conversationModel.js"
import Message from "../Model/messageModel.js"
import mongoose from "mongoose"
import { generateTitle } from "../services/ragClient.js"
import { getRequestId, isObjectIdString, newLock, releaseLock, runTurn, sendChatError, validateQuery } from "../services/chatService.js"

export const getChat = async (req, res, next) => {
    try {
        const { id } = req.user;
        if (!id) return res.status(401).json("Unauthorized")
        const { chatId } = req.params;
        if (!isObjectIdString(chatId)) return res.status(400).json("Invalid chat id")
        const chat = await Conversation.findOne({ _id: new mongoose.Types.ObjectId(chatId) }).select("-activeRequest")
        if (!chat) return res.status(404).json("No chat found")
        if (chat.userId.toString() !== id) return res.status(403).json("Forbidden")
        const messages = await Message.find({ conversationId: new mongoose.Types.ObjectId(chatId) }).sort({ createdAt: 1 })
        res.status(200).json({ chat, messages })
    } catch (error) {
        next(error)
    }
}


export const getAllChats = async (req, res, next) => {
    try {
        const { id } = req.user;
        if (!id) return res.status(401).json("Unauthorized")
        const chats = await Conversation.find({ userId: new mongoose.Types.ObjectId(id) }).sort({ updatedAt: -1 })
        if (!chats) return res.status(404).json("No chats found")
        res.status(200).json(chats)
    } catch (error) {
        next(error)
    }
}

// export const createChat = async (req, res, next) => {
//     try {
//         const { id } = req.user;
//         if (!id) return res.status(401).json("Unauthorized");

//         const query = req.body?.query || "";
//         const cleanQuery = typeof query === "string" ? query.trim() : "";

//         // Immediate sensible fallback title from query
//         const fallbackTitle = cleanQuery
//             ? (cleanQuery.length > 35 ? `${cleanQuery.slice(0, 35)}...` : cleanQuery)
//             : "New Chat";

//         let title = fallbackTitle;
//         let backgroundPromise = null;

//         // Fetch AI title from RAG Naming API
//         if (cleanQuery) {
//             const fetchNamingPromise = axios.post(
//                 `${RAG_SERVICE_URL}/api/v1/naming/title`,
//                 { query: cleanQuery },
//                 { timeout: 10000 }
//             ).then((res) => {
//                 const genTitle = res.data?.title;
//                 return (genTitle && typeof genTitle === "string" && genTitle.trim() && genTitle.trim() !== "New Chat")
//                     ? genTitle.trim()
//                     : null;
//             }).catch((err) => {
//                 console.warn("[Naming Agent] Call failed:", err.message);
//                 return null;
//             });

//             // Wait up to NAMING_TIMEOUT_MS (3s) to return the AI title directly without client timeout
//             const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), NAMING_TIMEOUT_MS));

//             try {
//                 const fastTitle = await Promise.race([fetchNamingPromise, timeoutPromise]);
//                 if (fastTitle) {
//                     title = fastTitle;
//                 } else {
//                     // If it exceeds NAMING_TIMEOUT_MS, let it update in the background
//                     backgroundPromise = fetchNamingPromise;
//                 }
//             } catch {
//                 title = fallbackTitle;
//             }
//         }

//         const newChat = await Conversation.create({
//             userId: new mongoose.Types.ObjectId(id),
//             title,
//             unsummarizedMessageCount: 2
//         });
//         if (!newChat) return res.status(400).json("Something went wrong while creating chat");

//         const message = await Message.create({
//             conversationId: new mongoose.Types.ObjectId(newChat._id),
//             sender: "User",
//             message: query
//         });
//         if (!message) return res.status(400).json("Something went wrong while creating message");

//         // send the message/content to agent and get response and store in database
//         // const agentResponse = await agent.run({ message: query })
//         // const agentResponse = "this is a test message";
//         try {
//             const ragResponse = await axios.post(
//                 `${RAG_SERVICE_URL}/api/v1/agent/ask`,
//                 {
//                     query,
//                     conversationId: newChat._id.toString(),
//                 },
//                 {
//                     timeout: 30000,
//                 }
//             );

//             ragData = ragResponse.data;
//         } catch (error) {
//             console.error(
//                 "[RAG Agent] Request failed:",
//                 error.response?.data ?? error.message
//             );
//             // The chat and user message are already saved.
//             return res.status(502).json({
//                 success: false,
//                 message: "The AI agent could not generate a response. Please try again.",
//                 chat: newChat,
//                 messages: [query],
//             });
//         }
//         const agentMessage = await Message.create({
//             conversationId: new mongoose.Types.ObjectId(newChat._id),
//             sender: "Assistent",
//             message: agentResponse
//         });
//         if (!agentMessage) {
//             await Message.deleteOne({ _id: message._id });
//             await Conversation.deleteOne({ _id: newChat._id });
//             return res.status(400).json("Something went wrong while creating agent message");
//         }

//         // If naming finished after response was prepared, update title in MongoDB
//         if (backgroundPromise) {
//             backgroundPromise.then(async (bgTitle) => {
//                 if (bgTitle && bgTitle !== fallbackTitle) {
//                     await Conversation.findByIdAndUpdate(newChat._id, { title: bgTitle }, { unsummarizedMessageCount: 2 });
//                     console.log(`[Naming Agent] Background updated chat ${newChat._id} title to: "${bgTitle}"`);
//                 }
//             }).catch((err) => {
//                 console.warn("[Naming Agent] Background update error:", err.message);
//             });
//         }

//         return res.status(201).json({ chat: newChat, messages: [message, agentMessage] });
//     } catch (error) {
//         next(error);
//     }
// }




const fallbackTitleFor = (query) => (query.length > 35 ? `${query.slice(0, 35)}...` : query)

// Existing title behaviour: respond with the fallback title, upgrade it from the naming agent in the background.
const generateTitleInBackground = (chatId, query, fallbackTitle) => {
    generateTitle(query).then(async (data) => {
        const title = typeof data?.title === "string" ? data.title.trim() : ""
        if (title && title !== "New Chat" && title !== fallbackTitle) {
            await Conversation.updateOne({ _id: chatId }, { $set: { title } })
        }
    }).catch(() => { /* logged in ragClient */ })
}

export const createChat = async (req, res, next) => {
    let newChat
    try {
        const { id } = req.user ?? {}
        if (!id) return res.status(401).json({ success: false, message: "Unauthorized" })
        const query = validateQuery(req.body?.query)
        const requestId = getRequestId(req)
        const fallbackTitle = fallbackTitleFor(query)
        const lock = newLock()

        // Created locked so no other request can add a turn before the first one completes.
        newChat = await Conversation.create({
            userId: new mongoose.Types.ObjectId(id),
            title: fallbackTitle,
            unsummarizedMessageCount: 0,
            activeRequest: lock
        })

        const turn = await runTurn({ conversation: newChat, query, requestId })
        await releaseLock(newChat._id, lock.id)
        generateTitleInBackground(newChat._id, query, fallbackTitle)

        const chat = await Conversation.findById(newChat._id).select("-activeRequest").lean()
        return res.status(201).json({
            success: true,
            chat,
            messages: [turn.userMessage, turn.assistantMessage],
            answer: turn.answer,
            intent: turn.intent,
            products: turn.products,
            sources: turn.sources
        })
    } catch (error) {
        // Generation failed before anything was persisted: remove the empty conversation.
        if (newChat) await Conversation.deleteOne({ _id: newChat._id, unsummarizedMessageCount: 0 }).catch(() => { })
        return sendChatError(error, res, next)
    }
}
