# pyrefly: ignore [missing-import]
from langchain_core.prompts import ChatPromptTemplate

VERDICT_PROMPT = ChatPromptTemplate.from_template(
    """You are a product research assistant. Using ONLY the context below
(real excerpts gathered from the web), write a structured verdict for
"{product_name}".

Context:
{context} 

Respond as strict JSON with this exact shape, and nothing else:
{{
  "score": <integer 0-100>,
  "verdict": "BUY" | "WAIT" | "AVOID",
  "strengths": ["...", "..."],
  "limitations": ["...", "..."],
  "summary": "2-3 sentence summary",
  "sources_used": <integer count of distinct sources referenced>
}}

If the context doesn't contain enough information, lower the score,
set verdict to "WAIT", and say so plainly in the summary. Do not invent facts
that are not present in the context."""
)
