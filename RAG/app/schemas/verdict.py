from typing import List, Optional
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field


class VerdictResponse(BaseModel):
    score: int = Field(..., ge=0, le=100, description="Confidence/recommendation score 0-100")
    verdict: str = Field(..., description="Verdict: BUY, WAIT, or AVOID")
    strengths: List[str] = Field(default_factory=list, description="Top positive highlights")
    limitations: List[str] = Field(default_factory=list, description="Top drawbacks or warnings")
    summary: str = Field(..., description="Executive 2-3 sentence verdict summary")
    sources_used: int = Field(default=0, description="Count of sources referenced")
    source: Optional[str] = Field(None, alias="_source", description="Data provenance (live, cache, fallback)")
    debug_urls: Optional[List[str]] = Field(None, alias="_debug_urls")
    debug_snippets_count: Optional[int] = Field(None, alias="_debug_snippets_count")
    debug_context_length: Optional[int] = Field(None, alias="_debug_context_length")

    class Config:
        populate_by_name = True
