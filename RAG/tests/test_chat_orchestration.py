"""Orchestrator / response agent / summarization endpoint tests. External services (Ollama, Qdrant,
Tavily) are replaced with fakes so the tests run offline."""

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.agents.orchestrator import service as orch  # noqa: E402
from app.agents.product_response_agent import agent as responder  # noqa: E402
from app.api.v1.endpoints import summarize as summarize_endpoint  # noqa: E402
from app.core import llm as llm_provider  # noqa: E402
from app.agents.review_agent import agent as review_agent  # noqa: E402
from app.api.v1.endpoints import review as review_endpoint  # noqa: E402
from app.schemas.chat import WebResult  # noqa: E402

client = TestClient(app)
P1, P2, P3, P4 = "a" * 24, "b" * 24, "c" * 24, "d" * 24


def test_chat_model_uses_configured_ollama(monkeypatch):
    settings = {}

    class FakeChatOllama:
        def __init__(self, **kwargs):
            settings.update(kwargs)

    llm_provider.get_chat_model.cache_clear()
    monkeypatch.setattr(llm_provider, "ChatOllama", FakeChatOllama)
    try:
        llm_provider.get_chat_model(0.7)
        assert settings == {
            "model": llm_provider.OLLAMA_MODEL,
            "temperature": 0.7,
            "num_ctx": llm_provider.OLLAMA_NUM_CTX,
            "num_predict": 512,
            "base_url": llm_provider.OLLAMA_BASE_URL,
            "reasoning": False,
        }
    finally:
        llm_provider.get_chat_model.cache_clear()


def test_review_synthesis_uses_structured_ollama_output(monkeypatch):
    from langchain_core.documents import Document
    from langchain_core.runnables import RunnableLambda

    model = FakeModel(result=review_agent.ReviewVerdict(
        score=80, verdict="BUY", strengths=["Quiet"], limitations=["Low airflow"],
        summary="Quiet, but airflow is limited.", sources_used=1))

    class FakeProvider:
        def with_structured_output(self, schema):
            model.schemas.append(schema)
            return RunnableLambda(model.invoke)

    monkeypatch.setattr(review_agent, "get_chat_model", lambda temperature: FakeProvider())

    doc = Document(
        page_content="Quiet operation, limited airflow.",
        metadata={"source": "https://example.test/review", "title": "Desk fan review"},
    )
    result = review_agent.synthesize_verdict("Desk fan", [doc])
    assert model.schemas == [review_agent.ReviewVerdict]
    assert result["score"] == 80 and result["verdict"] == "BUY"
    prompt = model.prompts[0].to_string()
    assert "Quiet operation, limited airflow." in prompt
    assert "https://example.test/review" in prompt


def test_review_synthesis_bounds_tavily_context(monkeypatch):
    from langchain_core.documents import Document
    from langchain_core.runnables import RunnableLambda

    model = FakeModel(result=review_agent.ReviewVerdict(
        score=70, verdict="WAIT", strengths=[], limitations=[],
        summary="Evidence is limited.", sources_used=8))

    class FakeProvider:
        def with_structured_output(self, schema):
            model.schemas.append(schema)
            return RunnableLambda(model.invoke)

    monkeypatch.setattr(review_agent, "get_chat_model", lambda temperature: FakeProvider())
    docs = [
        Document(
            page_content=f"Evidence {index}. " + ("x" * 1000),
            metadata={"source": f"https://example.test/{index}", "title": f"Test product review {index}"},
        )
        for index in range(12)
    ]

    review_agent.synthesize_verdict("Test product", docs)

    prompt = model.prompts[0].to_string()
    assert sum(1 for index in range(12) if f"https://example.test/{index}" in prompt) == 8
    assert len(prompt) < 8000


def test_review_verdict_response_includes_tavily_sources_and_excerpts(monkeypatch):
    monkeypatch.setattr(review_endpoint, "get_or_build_verdict", lambda product, include_debug=False: {
        "score": 82,
        "verdict": "BUY",
        "strengths": ["Comfortable fit"],
        "limitations": ["Battery life varies"],
        "summary": "Reviewers like the fit but note mixed battery life.",
        "sources_used": 1,
        "sources": [{"title": "Independent review", "url": "https://example.test/review"}],
        "reviews": [{"title": "Independent review", "url": "https://example.test/review", "snippet": "Comfortable fit, mixed battery life."}],
        "_source": "live",
    })
    response = client.get("/api/v1/verdict", params={"product_id": P1, "product_name": "Test product"})

    assert response.status_code == 200
    data = response.json()
    assert data["verdict"] == "BUY"
    assert data["sources"] == [{"title": "Independent review", "url": "https://example.test/review"}]
    assert data["reviews"][0]["snippet"] == "Comfortable fit, mixed battery life."


def test_review_verdict_reports_synthesis_failure_instead_of_fabricating_wait(monkeypatch):
    def fail_synthesis(product, include_debug=False):
        raise review_agent.ReviewSynthesisError("internal provider error")

    monkeypatch.setattr(review_endpoint, "get_or_build_verdict", fail_synthesis)
    response = client.get("/api/v1/verdict", params={"product_id": P1, "product_name": "Test product"})

    assert response.status_code == 502
    assert response.json()["detail"] == "Review search is temporarily unavailable."
    assert "internal provider error" not in response.text


def test_review_agent_returns_bounded_tavily_evidence(monkeypatch):
    from langchain_core.documents import Document

    docs = [Document(
        page_content="Strong sound quality.",
        metadata={"source": "https://example.test/review", "title": "Review"},
    )]
    monkeypatch.setattr(review_agent, "search_sources", lambda name, raise_on_error: (
        ["https://example.test/review"],
        docs,
    ))
    monkeypatch.setattr(review_agent, "synthesize_verdict", lambda name, selected_docs: {
        "score": 82, "verdict": "BUY", "strengths": ["Sound"], "limitations": [],
        "summary": "Good sound.", "sources_used": 1,
    })

    result = review_agent.get_or_build_verdict(review_agent.Product(id=P1, name="Test product"))

    assert result["sources"] == [{"title": "Review", "url": "https://example.test/review", "snippet": "Strong sound quality."}]
    assert result["reviews"] == result["sources"]


class FakeModel:
    def __init__(self, result=None, error=None):
        self.result, self.error, self.prompts, self.schemas = result, error, [], []

    def with_structured_output(self, schema):
        self.schemas.append(schema)
        return self

    def invoke(self, prompt):
        self.prompts.append(prompt)
        if self.error:
            raise self.error
        return self.result


@pytest.fixture
def calls(monkeypatch):
    record = {"qdrant": [], "tavily": []}

    def fake_search(query, limit=None):
        record["qdrant"].append((query, limit))
        return [{"productId": pid, "score": 0.9 - i / 10, "title": f"Mattress {i + 1}"} for i, pid in enumerate([P1, P2, P3][:limit])]

    def fake_tavily(name, aspect, pid):
        record["tavily"].append((name, aspect, pid))
        return [WebResult(title=f"{name} review", url=f"https://example.com/{len(record['tavily'])}", snippet="ok", product_id=pid)]

    monkeypatch.setattr(orch.product_search, "search_products", fake_search)
    monkeypatch.setattr(orch, "_tavily_for", fake_tavily)
    return record


def llm(monkeypatch, module, **kwargs):
    model = FakeModel(**kwargs)
    monkeypatch.setattr(module, "get_chat_model", lambda *a, **k: model)
    return model


REFS = [
    {"product_id": P1, "position": 1, "turn": 0, "kind": "recommended", "title": "Zinus Memory Foam Mattress"},
    {"product_id": P2, "position": 2, "turn": 0, "kind": "recommended", "title": "Sweetnight Hybrid Mattress"},
    {"product_id": P3, "position": 3, "turn": 0, "kind": "recommended", "title": "Linenspa Spring Mattress"},
]


def retrieve(query, refs=None, **extra):
    body = {"query": query, "conversation_context": {"summary": "", "recent_messages": [], "referenced_products": refs or []}, **extra}
    return client.post("/api/v1/orchestrator/retrieve", json=body)


def test_recommendation_uses_qdrant_and_preserves_order(monkeypatch, calls):
    llm(monkeypatch, orch, result=orch.IntentDecision(intents=["product_recommendation"], wants_new_products=True, search_query="memory foam mattress under $500"))
    res = retrieve("Recommend a memory foam mattress under $500")
    data = res.json()
    assert res.status_code == 200
    assert data["intent"] == "product_recommendation"
    assert data["product_ids"] == [P1, P2, P3]
    assert calls["qdrant"] == [("memory foam mattress under $500", 3)]
    assert calls["tavily"] == []
    assert data["retrieval_sources"] == ["qdrant", "mongodb"]
    assert [h["rank"] for h in data["retrieved"]] == [1, 2, 3]


def test_general_question_skips_retrieval(monkeypatch, calls):
    llm(monkeypatch, orch, result=orch.IntentDecision(intents=["general_question"], wants_new_products=True, needs_web_research=True))
    data = retrieve("What does memory foam mean?").json()
    assert data["intent"] == "general_question"
    assert data["product_ids"] == [] and data["retrieval_sources"] == []
    assert calls["qdrant"] == [] and calls["tavily"] == []


def test_qdrant_failure_is_reported_not_empty(monkeypatch, calls):
    llm(monkeypatch, orch, result=orch.IntentDecision(intents=["product_recommendation"], wants_new_products=True))

    def boom(*a, **k):
        raise RuntimeError("storage locked")
    monkeypatch.setattr(orch.product_search, "search_products", boom)
    data = retrieve("Recommend a mattress").json()
    assert data["product_ids"] == []
    assert "qdrant" not in data["retrieval_sources"]
    assert [e["source"] for e in data["errors"]] == ["qdrant"]
    assert "storage locked" not in str(data)  # internal error text is not exposed


def test_first_product_follow_up_with_classifier_fallback(monkeypatch, calls):
    llm(monkeypatch, orch, error=ValueError("malformed output"))
    data = retrieve("Tell me more about the first one", refs=REFS).json()
    assert data["classifier"] == "fallback"
    assert data["product_ids"] == [P1]
    assert data["intent"] == "product_details"
    assert calls["qdrant"] == []
    assert calls["tavily"] == [("Zinus Memory Foam Mattress", "reviews, pros and cons", P1)]


def test_comparison_resolves_ordinals_against_latest_recommendation(monkeypatch, calls):
    llm(monkeypatch, orch, error=ValueError("down"))
    refs = REFS + [{"product_id": P4, "position": 1, "turn": 0, "kind": "discussed", "title": "Other"}]
    refs = [dict(r, turn=1) if r["kind"] == "recommended" else r for r in refs]
    data = retrieve("Compare the first and second options", refs=refs).json()
    assert data["intent"] == "product_comparison"
    assert data["product_ids"] == [P1, P2]
    assert calls["qdrant"] == []


def test_hallucinated_ids_are_dropped_and_ordinal_safety_net_applies(monkeypatch, calls):
    llm(monkeypatch, orch, result=orch.IntentDecision(intents=["product_details"], resolved_product_ids=["f" * 24]))
    data = retrieve("Is the second product good for back pain?", refs=REFS).json()
    assert data["product_ids"] == [P2]


def test_ambiguous_reference_asks_for_clarification(monkeypatch, calls):
    llm(monkeypatch, orch, result=orch.IntentDecision(intents=["product_details"], needs_clarification=True, clarification_question="Which mattress do you mean?"))
    data = retrieve("Is that mattress firm?", refs=REFS).json()
    assert data["needs_clarification"] is True
    assert data["clarification_question"] == "Which mattress do you mean?"
    assert data["product_ids"] == []


def test_reviews_use_tavily_for_resolved_product(monkeypatch, calls):
    llm(monkeypatch, orch, result=orch.IntentDecision(intents=["product_reviews"], resolved_product_ids=[P2], needs_web_research=True, web_aspect="common complaints"))
    data = retrieve("What do customers complain about with the second one?", refs=REFS).json()
    assert data["product_ids"] == [P2]
    assert calls["qdrant"] == []
    assert calls["tavily"] == [("Sweetnight Hybrid Mattress", "common complaints", P2)]
    assert "tavily" in data["retrieval_sources"]
    assert data["web_results"][0]["product_id"] == P2


def test_tell_me_more_about_referenced_product_uses_tavily(monkeypatch, calls):
    llm(monkeypatch, orch, result=orch.IntentDecision(intents=["product_details"]))
    data = retrieve("Tell me more about the first one", refs=REFS).json()
    assert data["intent"] == "product_details"
    assert data["product_ids"] == [P1]
    assert calls["qdrant"] == []
    assert calls["tavily"] == [("Zinus Memory Foam Mattress", "reviews, pros and cons", P1)]
    assert data["retrieval_sources"] == ["mongodb", "tavily"]


def test_tavily_failure_is_reported(monkeypatch, calls):
    llm(monkeypatch, orch, result=orch.IntentDecision(intents=["product_reviews"], resolved_product_ids=[P1], needs_web_research=True))

    def boom(*a):
        raise RuntimeError("429 rate limit")
    monkeypatch.setattr(orch, "_tavily_for", boom)
    data = retrieve("Reviews for the first one?", refs=REFS).json()
    assert data["web_results"] == []
    assert "tavily" not in data["retrieval_sources"]
    assert [e["source"] for e in data["errors"]] == ["tavily"]


def test_mixed_recommendation_and_reviews(monkeypatch, calls):
    llm(monkeypatch, orch, result=orch.IntentDecision(intents=["product_recommendation", "product_reviews"], wants_new_products=True, needs_web_research=True, top_k=2))
    data = retrieve("Recommend two mattresses and find independent reviews").json()
    assert data["intent"] == "mixed"
    assert data["product_ids"] == [P1, P2]
    assert len(calls["tavily"]) == 2


def test_blank_query_rejected():
    assert retrieve("   ").status_code == 422


# ---------------------------------------------------------------- response agent
PRODUCTS = [{"product_id": P1, "title": "Zinus Memory Foam Mattress", "price": 299.0},
            {"product_id": P2, "title": "Sweetnight Hybrid Mattress", "price": 459.0}]


def test_respond_filters_unsupplied_ids_and_sources(monkeypatch):
    model = llm(monkeypatch, responder, result=responder.LLMAnswer(
        answer="1. Zinus ... see [review](https://example.com/r1)", product_ids_used=[P2, "e" * 24, P1],
        source_urls_used=["https://example.com/r1", "https://fake.example/made-up"]))
    res = client.post("/api/v1/agent/respond", json={
        "query": "recommend", "intent": "product_recommendation", "products": PRODUCTS,
        "web_results": [{"title": "R1", "url": "https://example.com/r1", "snippet": "good"}]})
    data = res.json()
    assert res.status_code == 200
    assert data["product_ids"] == [P2, P1]
    assert data["sources"] == [{"title": "R1", "url": "https://example.com/r1"}]
    assert "Zinus Memory Foam Mattress" in model.prompts[0] and '"price": 299.0' in model.prompts[0]


def test_responds_to_web_researched_product_details_with_verdict(monkeypatch):
    model = llm(monkeypatch, responder, result=responder.ReviewAssessment(
        verdict="WAIT", rationale="The supplied review reports battery concerns."))
    res = client.post("/api/v1/agent/respond", json={
        "query": "Tell me more about the first one",
        "intent": "product_details",
        "products": [{"product_id": P1, "title": "Samsung Galaxy A5", "price": 49.99, "stars": 4.3}],
        "web_results": [{"title": "Phone review", "url": "https://example.com/phone-review",
                         "snippet": "Reviewers praise the display but report battery concerns.", "product_id": P1}],
        "retrieval_sources": ["mongodb", "tavily"],
    })
    data = res.json()
    assert res.status_code == 200
    assert data["product_ids"] == [P1]
    assert data["sources"] == [{"title": "Phone review", "url": "https://example.com/phone-review"}]
    assert "BUY, WAIT, or AVOID" in model.prompts[0]
    assert "Reviewers praise the display" in model.prompts[0]
    assert "Samsung Galaxy A5" in data["answer"]
    assert "Verdict: WAIT" in data["answer"]
    assert "battery concerns" in data["answer"]


def test_product_details_without_web_results_still_describes_catalog_product(monkeypatch):
    model = llm(monkeypatch, responder, error=AssertionError("no review assessment without web evidence"))
    data = client.post("/api/v1/agent/respond", json={
        "query": "Tell me about this product",
        "intent": "product_details",
        "products": [{"product_id": P1, "title": "Samsung Galaxy A5", "price": 49.99,
                      "stars": 4.3, "reviews": 5777, "mainCategory": "Phones & Wearables"}],
    }).json()

    assert "Samsung Galaxy A5" in data["answer"]
    assert "Listed price: 49.99" in data["answer"]
    assert "Rating: 4.3/5" in data["answer"]
    assert "can't provide a web-backed verdict" in data["answer"]
    assert data["sources"] == []
    assert model.prompts == []


def test_comparison_response_includes_catalog_table_and_grounded_answer(monkeypatch):
    model = llm(monkeypatch, responder, result=responder.LLMAnswer(
        answer="The first option costs less; here is the catalog comparison.",
        product_ids_used=[P1, P2],
    ))
    res = client.post("/api/v1/agent/respond", json={
        "query": "Compare the first and second options",
        "intent": "product_comparison",
        "products": [
            {"product_id": P1, "title": "Zinus | Memory Foam Mattress", "price": 299, "stars": 4.5,
             "reviews": 1200, "mainCategory": "Home", "subcategory": "Mattresses"},
            {"product_id": P2, "title": "Sweetnight Hybrid Mattress", "price": 459, "stars": 4.2,
             "reviews": 850, "mainCategory": "Home", "subcategory": "Mattresses"},
        ],
    })
    data = res.json()
    assert res.status_code == 200
    assert "The first option costs less" in data["answer"]
    assert "### Side-by-side comparison" in data["answer"]
    assert "| Price | 299 | 459 |" in data["answer"]
    assert "| Rating | 4.5/5 | 4.2/5 |" in data["answer"]
    assert "Zinus \\| Memory Foam Mattress" in data["answer"]
    assert data["product_ids"] == [P1, P2]
    assert model.prompts


def test_respond_mentions_failed_retrieval_in_prompt(monkeypatch):
    model = llm(monkeypatch, responder, result=responder.LLMAnswer(answer="Product search is unavailable right now."))
    client.post("/api/v1/agent/respond", json={"query": "recommend", "intent": "product_recommendation",
                                               "errors": [{"source": "qdrant", "message": "x"}]})
    assert "Catalog product search FAILED" in model.prompts[0]


def test_respond_clarification_without_llm(monkeypatch):
    model = llm(monkeypatch, responder, error=AssertionError("should not be called"))
    data = client.post("/api/v1/agent/respond", json={"query": "that one?", "needs_clarification": True,
                                                      "clarification_question": "Which product do you mean?"}).json()
    assert data == {"answer": "Which product do you mean?", "intent": "general_question", "product_ids": [],
                    "sources": [], "needs_clarification": True, "generator": "rule"}
    assert model.prompts == []


def test_respond_llm_failure_returns_502(monkeypatch):
    llm(monkeypatch, responder, error=TimeoutError("deadline"))
    res = client.post("/api/v1/agent/respond", json={"query": "hi"})
    assert res.status_code == 502
    assert "deadline" not in res.text


# ---------------------------------------------------------------- summarization endpoint
def test_summarize_is_cumulative_and_formats_messages(monkeypatch):
    seen = {}

    def fake(summary, messages):
        seen.update(summary=summary, messages=messages)
        return "new summary"
    monkeypatch.setattr(summarize_endpoint, "summarize", fake)
    res = client.post("/api/v1/summarization/summarize", json={"summary": "old", "messages": [
        {"sender": "User", "message": "hi"}, {"sender": "Assistent", "message": "hello"}]})
    assert res.json() == {"newSummary": "new summary"}
    assert seen == {"summary": "old", "messages": "User: hi\nAssistant: hello"}


def test_summarize_failure_returns_502(monkeypatch):
    monkeypatch.setattr(summarize_endpoint, "summarize", lambda s, m: None)
    res = client.post("/api/v1/summarization/summarize", json={"summary": "old", "messages": [{"sender": "User", "message": "hi"}]})
    assert res.status_code == 502


def test_tavily_results_for_other_products_are_dropped(monkeypatch):
    from langchain_core.documents import Document
    import app.agents.review_agent.search as search
    docs = [Document(page_content="The Inofia springs click", metadata={"source": "https://a.example/inofia", "title": "Inofia review"}),
            Document(page_content="Saatva is firm", metadata={"source": "https://b.example/saatva", "title": "Saatva review"})]
    monkeypatch.setattr(search, "search_sources", lambda *a, **k: (["x"], docs))
    out = orch._tavily_for("Inofia Double Memory Foam Mattress", "complaints", "a" * 24)
    assert [w.url for w in out] == ["https://a.example/inofia"]
