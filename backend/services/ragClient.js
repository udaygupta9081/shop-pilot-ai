import axios from "axios"

const RAG_SERVICE_URL = process.env.RAG_URL || "http://127.0.0.1:8000"
const RETRIEVE_TIMEOUT_MS = Number(process.env.RAG_RETRIEVE_TIMEOUT_MS) || 75000
const RESPOND_TIMEOUT_MS = Number(process.env.RAG_RESPOND_TIMEOUT_MS) || 75000
const SUMMARY_TIMEOUT_MS = Number(process.env.RAG_SUMMARY_TIMEOUT_MS) || 20000
const NAMING_TIMEOUT_MS = Number(process.env.RAG_NAMING_TIMEOUT_MS) || 10000

export class RagServiceError extends Error {
    constructor(stage, cause) {
        const timedOut = cause?.code === "ECONNABORTED" || cause?.code === "ETIMEDOUT"
        super(`${stage} ${timedOut ? "timed out" : "failed"}`)
        this.stage = stage
        this.timedOut = timedOut
        this.upstreamStatus = cause?.response?.status
    }
}

// No automatic retries: a retried POST could repeat Tavily/LLM side effects.
const post = async (stage, path, body, timeout) => {
    try {
        const { data } = await axios.post(`${RAG_SERVICE_URL}${path}`, body, { timeout })
        return data
    } catch (error) {
        console.error(`[RAG ${stage}]`, error.response?.status ?? error.code ?? "", error.message)
        throw new RagServiceError(stage, error)
    }
}

export const retrieve = (body) => post("retrieval", "/api/v1/orchestrator/retrieve", body, RETRIEVE_TIMEOUT_MS)
export const respond = (body) => post("generation", "/api/v1/agent/respond", body, RESPOND_TIMEOUT_MS)
export const summarize = (body) => post("summarization", "/api/v1/summarization/summarize", body, SUMMARY_TIMEOUT_MS)
export const generateTitle = (query) => post("naming", "/api/v1/naming/title", { query }, NAMING_TIMEOUT_MS)
