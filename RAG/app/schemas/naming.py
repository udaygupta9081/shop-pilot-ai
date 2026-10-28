# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field
from typing import List, Optional

class NamingRequest(BaseModel):
    query: Optional[str] = Field(None, description="User's query")
    question: Optional[str] = Field(None, description="User's question")

class NamingResponse(BaseModel):
    title: str = Field(..., description="Suggested title")