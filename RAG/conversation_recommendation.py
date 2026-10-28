"""
ShopPilot AI - Product Verdict & Review Agent

This module references the modular package architecture inside `app/`.
All internal logic has been structured into clean components:
  - App & Routing: app/main.py, app/api/v1/
  - Review Agent: app/agents/review_agent/
  - Shared Core:   app/core/ (embeddings, utils, config)
  - Data Schemas:  app/schemas/ (product, verdict)

Run with:
    uvicorn main:app --reload --port 8000
    # or
    python main.py
    # or
    uvicorn conversation_recommendation:app --reload --port 8000
"""

# pyrefly: ignore [missing-import]
import uvicorn
from app.main import app
from app.schemas.product import Product
from app.schemas.verdict import VerdictResponse
from app.agents.review_agent.agent import get_or_build_verdict, synthesize_verdict
from app.agents.review_agent.search import search_sources
from app.agents.review_agent.index import build_ephemeral_index
from app.agents.review_agent.prompts import VERDICT_PROMPT

__all__ = [
    "app",
    "Product",
    "VerdictResponse",
    "get_or_build_verdict",
    "synthesize_verdict",
    "search_sources",
    "build_ephemeral_index",
    "VERDICT_PROMPT",
]

if __name__ == "__main__":
    uvicorn.run("conversation_recommendation:app", host="127.0.0.1", port=8000, reload=True)
