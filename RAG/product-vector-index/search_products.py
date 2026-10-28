
# from pathlib import Path
# # pyrefly: ignore [missing-import]
# from qdrant_client import QdrantClient
# # pyrefly: ignore [missing-import]
# from sentence_transformers import SentenceTransformer

# QDRANT_PATH = Path(__file__).resolve().parent.parent / "qdrant_data"
# COLLECTION = "amazon_products"
# MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

# # Load the model and open Qdrant once when this module is imported.
# model = SentenceTransformer(MODEL_NAME)
# qdrant = QdrantClient(path=str(QDRANT_PATH))


# def search_products(query: str) -> list[dict]:
#     """
#     Search Qdrant and return the top 3 relevant products.

#     Args:
#         query: Natural-language product search query.

#     Returns:
#         A list of up to 3 product dictionaries, including similarity scores.
#     """
#     if not query or not query.strip():
#         return []

#     query_vector = model.encode(
#         query.strip(),
#         normalize_embeddings=True,
#     ).tolist()

#     results = qdrant.query_points(
#         collection_name=COLLECTION,
#         query=query_vector,
#         limit=3,
#         with_payload=True,
#     ).points

#     products = []

#     for result in results:
#         payload = result.payload or {}

#         products.append({
#             "productId": payload.get("productId"),
#             "title": payload.get("title"),
#             "price": payload.get("price"),
#             "mainCategory": payload.get("mainCategory"),
#             "subcategory": payload.get("subcategory"),
#             "productURL": payload.get("productURL"),
#             "imgUrl": payload.get("imgUrl"),
#             "score": result.score,
#         })

#     return products


# if __name__ == "__main__":
#     query = input("best fridge under 20k ")

#     products = search_products(query)

#     if not products:
#         print("No matching products found.")
#     else:
#         for i, product in enumerate(products, start=1):
#             print(f"\n--- Product {i} ---")
#             for key, value in product.items():
#                 print(f"{key}: {value}")

from pathlib import Path
from time import perf_counter

# pyrefly: ignore[missing-import]
from qdrant_client import QdrantClient, models

# pyrefly: ignore[missing-import]
from sentence_transformers import SentenceTransformer

QDRANT_PATH = Path(__file__).resolve().parent.parent / "qdrant_data"
COLLECTION = "amazon_products"
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"


def log(message):
    print(f"[{perf_counter():.2f}] {message}", flush=True)
    


def main():
    log("Loading embedding model...")
    start = perf_counter()
    model = SentenceTransformer(MODEL_NAME)
    log(f"Model loaded in {perf_counter() - start:.2f}s")

    log(f"Opening Qdrant at: {QDRANT_PATH}")
    start = perf_counter()
    client = QdrantClient(path=str(QDRANT_PATH))
    log(f"Qdrant opened in {perf_counter() - start:.2f}s")

    try:
        log("Checking collection...")
        info = client.get_collection(COLLECTION)
        log(f"Points: {info.points_count}")

        query = input("Enter product query: ").strip()
        if not query:
            return

        log("Encoding query...")
        start = perf_counter()
        vector = model.encode(
            query,
            normalize_embeddings=True
        ).tolist()
        log(f"Query encoded in {perf_counter() - start:.2f}s")

        log("Searching Qdrant...")
        start = perf_counter()

        results = client.query_points(
            collection_name=COLLECTION,
            query=vector,
            limit=3,
            with_payload=[
                "productId",
                "title",
                "price",
                "mainCategory",
                "subcategory",
                "productURL",
                "imgUrl",
            ],
            search_params=models.SearchParams(
                exact=False,
                hnsw_ef=64,
            ),
        ).points

        log(f"Search finished in {perf_counter() - start:.2f}s")
        log(f"Results returned: {len(results)}")

        for i, point in enumerate(results, 1):
            payload = point.payload or {}
            print(f"\n--- Product {i} | Score: {point.score:.4f} ---")
            for key, value in payload.items():
                print(f"{key}: {value}")

    finally:
        client.close()
        log("Qdrant client closed.")


if __name__ == "__main__":
    main()
