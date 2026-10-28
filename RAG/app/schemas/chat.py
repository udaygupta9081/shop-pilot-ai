"""Contracts between the Node backend and the chat orchestration / response agents."""
from typing import List, Literal, Optional

# pyrefly: ignore [missing-import]
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.config import MAX_PRODUCT_TOP_K

PRODUCT_ID_PATTERN = r"^[a-fA-F0-9]{24}$"  # MongoDB ObjectId hex (Qdrant payload `productId`)

BaseIntent = Literal[
    "product_recommendation", "product_details", "product_reviews", "product_comparison", "general_question",
]
Intent = Literal[
    "product_recommendation", "product_details", "product_reviews", "product_comparison", "general_question", "mixed",
]


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., max_length=8000)


class ReferencedProduct(BaseModel):
    product_id: str = Field(..., pattern=PRODUCT_ID_PATTERN)
    position: Optional[int] = Field(None, ge=1, description="1-based position in the assistant turn that showed it")
    kind: Literal["recommended", "discussed"] = "recommended"
    turn: int = Field(0, ge=0, description="0 = most recent assistant turn with products, 1 = the one before, ...")
    title: Optional[str] = Field(None, max_length=500)
    available: bool = Field(True, description="False when the product no longer exists in the catalog")


class ConversationContext(BaseModel):
    summary: str = Field("", max_length=4000)
    recent_messages: List[ChatMessage] = Field(default_factory=list, max_length=30)
    referenced_products: List[ReferencedProduct] = Field(default_factory=list, max_length=60)


class RetrieveRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000)
    conversation_context: ConversationContext = Field(default_factory=ConversationContext)
    top_k: Optional[int] = Field(None, ge=1, le=MAX_PRODUCT_TOP_K)

    @field_validator("query")
    @classmethod
    def strip_query(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("query must not be empty")
        return v


class WebResult(BaseModel):
    title: str = ""
    url: str
    snippet: str = ""
    product_id: Optional[str] = None


class RetrievalHit(BaseModel):
    product_id: str
    rank: int
    source: Literal["qdrant", "conversation"]
    score: Optional[float] = None


class RetrievalError(BaseModel):
    source: Literal["classifier", "qdrant", "tavily"]
    message: str


class RetrieveResponse(BaseModel):
    intent: Intent
    intents: List[BaseIntent]
    retrieval_sources: List[Literal["qdrant", "mongodb", "tavily"]]
    product_ids: List[str] = Field(description="Products to enrich from MongoDB, in relevance/reference order")
    retrieved: List[RetrievalHit] = Field(default_factory=list)
    search_query: Optional[str] = None
    web_results: List[WebResult] = Field(default_factory=list)
    needs_clarification: bool = False
    clarification_question: Optional[str] = None
    errors: List[RetrievalError] = Field(default_factory=list)
    classifier: Literal["llm", "fallback"] = "llm"


class ProductDocument(BaseModel):
    """Authoritative catalog fields supplied by Node from MONGO_URI."""
    model_config = ConfigDict(extra="ignore")
    product_id: str = Field(..., pattern=PRODUCT_ID_PATTERN)
    title: str
    asin: Optional[str] = None
    price: Optional[float] = None
    stars: Optional[float] = None
    reviews: Optional[int] = None
    isBestSeller: Optional[bool] = None
    boughtInLastMonth: Optional[int] = None
    mainCategory: Optional[str] = None
    subcategory: Optional[str] = None
    aiProductScore: Optional[float] = None
    productURL: Optional[str] = None


class RespondRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000)
    intent: Intent = "general_question"
    conversation_context: ConversationContext = Field(default_factory=ConversationContext)
    products: List[ProductDocument] = Field(default_factory=list, max_length=MAX_PRODUCT_TOP_K * 2)
    missing_product_ids: List[str] = Field(default_factory=list)
    retrieved: List[RetrievalHit] = Field(default_factory=list)
    web_results: List[WebResult] = Field(default_factory=list, max_length=30)
    retrieval_sources: List[str] = Field(default_factory=list)
    errors: List[RetrievalError] = Field(default_factory=list)
    needs_clarification: bool = False
    clarification_question: Optional[str] = None


class WebSource(BaseModel):
    title: str = ""
    url: str


class RespondResponse(BaseModel):
    answer: str
    intent: Intent
    product_ids: List[str] = Field(description="Supplied products the answer discusses, in presentation order")
    sources: List[WebSource] = Field(default_factory=list)
    needs_clarification: bool = False
    generator: Literal["llm", "rule"] = "llm"
