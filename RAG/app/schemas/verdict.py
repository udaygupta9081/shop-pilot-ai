from typing import List, Literal, Optional
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, ConfigDict, Field


class ReviewSource(BaseModel):
    title: str = ""
    url: str


class ReviewExcerpt(BaseModel):
    title: str = ""
    url: str
    snippet: str = ""


class VerdictResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    score: int = Field(..., ge=0, le=100, description="Confidence/recommendation score 0-100")
    verdict: Literal["BUY", "WAIT", "AVOID"] = Field(..., description="Verdict: BUY, WAIT, or AVOID")
    strengths: List[str] = Field(default_factory=list, description="Top positive highlights")
    limitations: List[str] = Field(default_factory=list, description="Top drawbacks or warnings")
    summary: str = Field(..., description="Executive 2-3 sentence verdict summary")
    sources_used: int = Field(default=0, description="Count of sources referenced")
    sources: List[ReviewSource] = Field(default_factory=list, description="External review pages discovered for this product")
    reviews: List[ReviewExcerpt] = Field(default_factory=list, description="Review excerpts returned by Tavily")
    source: Optional[str] = Field(None, alias="_source", description="Data provenance (live, cache, fallback)")
    debug_urls: Optional[List[str]] = Field(None, alias="_debug_urls")
    debug_snippets_count: Optional[int] = Field(None, alias="_debug_snippets_count")
    debug_context_length: Optional[int] = Field(None, alias="_debug_context_length")
