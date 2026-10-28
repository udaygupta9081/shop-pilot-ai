# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field


class Product(BaseModel):
    id: str = Field(..., description="Unique product ID")
    name: str = Field(..., description="Full product title/name")
