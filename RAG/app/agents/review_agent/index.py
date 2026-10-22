# pyrefly: ignore [missing-import]
import logging
from typing import List, Optional
# pyrefly: ignore [missing-import]
from langchain_core.documents import Document
# pyrefly: ignore [missing-import]
from langchain_community.document_loaders import AsyncHtmlLoader
# pyrefly: ignore [missing-import]
from langchain_community.document_transformers import BeautifulSoupTransformer
# pyrefly: ignore [missing-import]
from langchain_community.vectorstores import FAISS
# pyrefly: ignore [missing-import]
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.core.embeddings import get_embeddings

logger = logging.getLogger("ShopPilot.ReviewAgent.Index")


def build_ephemeral_index(urls: List[str], tavily_docs: Optional[List[Document]] = None):
    """
    Loads text from Tavily and HTML pages, chunks the content,
    and embeds into an in-memory ephemeral FAISS index.
    Per architectural spec, scraped review text is not persisted to avoid stale data.
    """
    print(f"\n📦 [STEP 2: VECTOR INDEXING] Building ephemeral FAISS index...", flush=True)
    if not urls and not tavily_docs:
        print("⚠️ [INDEX] No URLs or documents provided to index.", flush=True)
        return None

    all_docs: List[Document] = list(tavily_docs or [])

    # Optionally attempt AsyncHtmlLoader to augment Tavily snippets
    if urls:
        try:
            print(f"  ↳ Attempting AsyncHtmlLoader on top {min(len(urls), 4)} URLs...", flush=True)
            loader = AsyncHtmlLoader(urls[:4], verify_ssl=False)
            raw_docs = loader.load()

            bs_transformer = BeautifulSoupTransformer()
            transformed_docs = bs_transformer.transform_documents(
                raw_docs, tags_to_extract=["p", "li", "span", "h1", "h2", "h3"]
            )
            scraped_count = 0
            for d in transformed_docs:
                if len(d.page_content.strip()) > 100:
                    all_docs.append(d)
                    scraped_count += 1
            print(f"  ↳ Successfully scraped HTML from {scraped_count} pages.", flush=True)
        except Exception as e:
            print(f"⚠️ AsyncHtmlLoader notice (using Tavily snippets): {e}", flush=True)

    if not all_docs:
        print("⚠️ [INDEX] No documents available to chunk.", flush=True)
        return None

    try:
        splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
        chunks = splitter.split_documents(all_docs)

        # Filter out empty or whitespace-only chunks
        chunks = [c for c in chunks if c.page_content and c.page_content.strip()]
        print(f"✅ [INDEX] Created {len(chunks)} text chunks for embedding.", flush=True)
        if not chunks:
            return None

        embeddings = get_embeddings()
        vectorstore = FAISS.from_documents(chunks, embeddings)
        print("✅ [INDEX] FAISS Vector Store populated successfully.", flush=True)
        return vectorstore
    except Exception as e:
        print(f"⚠️ [INDEX ERROR] Vector indexing failed: {e}", flush=True)
        logger.error(f"Vector indexing failed: {e}")
        return None
