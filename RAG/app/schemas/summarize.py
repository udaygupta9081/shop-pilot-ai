# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field
from typing import List, Optional, Union


class SummarizeMessage(BaseModel):
    sender: Optional[str] = Field(None, description="'User' or 'Assistent' (Node message model)")
    role: Optional[str] = Field(None, description="'user' or 'assistant'")
    message: Optional[str] = None
    content: Optional[str] = None


class SummarizeRequest(BaseModel):
    summary: Optional[str] = Field("", description="Previous cumulative summary")
    messages: List[Union[SummarizeMessage, str]] = Field(default_factory=list, description="Unsummarized messages, oldest first")


class SummarizeResponse(BaseModel):
    newSummary: str = Field(..., description="Updated cumulative summary")
