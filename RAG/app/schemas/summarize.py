# pyrefly: ignore [missing-import]
from pydantic import BaseModel
from typing import Optional


class SummarizeRequest(BaseModel):
    summary: Optional[str] = Field(None, description="Summary of the conversation")
    messages: Optional[list] = Field(None, description="Messages of the conversation")
    

class SummarizeResponse(BaseModel):
    summary: str = Field(..., description="Summary of the conversation")
    
