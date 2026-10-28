import os
import uuid

# pyrefly: ignore[missing-import]
from dotenv import load_dotenv
# pyrefly: ignore[missing-import]
from pymongo import MongoClient
# pyrefly: ignore[missing-import]
from qdrant_client import QdrantClient, models
# pyrefly: ignore[missing-import]
from sentence_transformers import SentenceTransformer
from pathlib import Path

load_dotenv()

# Configuration
DB_NAME = os.environ.get("MONGO_DB_NAME", "shop_pilot")
COLLECTION_NAME = os.getenv("MONGO_COLLECTION_NAME", "products")
MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017")

QDRANT_PATH = Path(__file__).resolve().parent.parent / "qdrant_data"
QDRANT_COLLECTION = "amazon_products"
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

BATCH_SIZE = 64
VECTOR_SIZE = 384

# Persistent local database: data is saved on disk.
qdrant = QdrantClient(path=QDRANT_PATH)

mongo_client = MongoClient(MONGO_URI)
products_collection = mongo_client[DB_NAME][COLLECTION_NAME]

# Downloaded on first run, then loaded from the local model cache.
model = SentenceTransformer(MODEL_NAME)


def product_text(product):
    keywords = product.get("keywords") or []

    if isinstance(keywords, str):
        keywords = [keywords]

    return (
        f"Title: {product.get('title', '')}. "
        f"Category: {product.get('mainCategory', '')}. "
        f"Subcategory: {product.get('subcategory', '')}. "
        f"Keywords: {' '.join(map(str, keywords))}"
    )


def point_id(mongo_id):
    # Deterministic ID: the same MongoDB product always maps
    # to the same Qdrant point.
    return str(
        uuid.uuid5(uuid.NAMESPACE_URL, f"product:{mongo_id}")
    )


def create_collection_if_needed():
    if not qdrant.collection_exists(QDRANT_COLLECTION):
        qdrant.create_collection(
            collection_name=QDRANT_COLLECTION,
            vectors_config=models.VectorParams(
                size=VECTOR_SIZE,
                distance=models.Distance.COSINE,
            ),
        )
        print("Created collection:", QDRANT_COLLECTION)
    else:
        print("Collection already exists; keeping its data.")


def upload_batch(batch):
    texts = [product_text(p) for p in batch]

    vectors = model.encode(
        texts,
        batch_size=32,
        normalize_embeddings=True,
        show_progress_bar=False,
    )

    points = []

    for product, vector in zip(batch, vectors):
        mongo_id = str(product["_id"])

        keywords = product.get("keywords") or []
        if isinstance(keywords, str):
            keywords = [keywords]

        payload = {
            "productId": mongo_id,
            "title": product.get("title", ""),
            "mainCategory": product.get("mainCategory", ""),
            "mainSlug": product.get("mainSlug", ""),
            "sourceCategory": product.get("sourceCategory", ""),
            "subSlug": product.get("subSlug", ""),
            "subcategory": product.get("subcategory", ""),
            "price": product.get("price"),
            "asin": product.get("asin", ""),
            "aiProductScore": product.get("aiProductScore"),
            "boughtInLastMonth": product.get("boughtInLastMonth", 0),
            "reviews": product.get("reviews"),
            "stars": product.get("stars"),
            "isBestSeller": product.get("isBestSeller", False),
            "keywords": [str(k) for k in keywords],
        }

        points.append(
            models.PointStruct(
                id=point_id(mongo_id),
                vector=vector.tolist(),
                payload=payload,
            )
        )

    qdrant.upsert(
        collection_name=QDRANT_COLLECTION,
        points=points,
        wait=True,
    )

    return len(points)


def main():
    create_collection_if_needed()

    # Projection specifies all fields retrieved from MongoDB
    projection = {
        "_id": 1,
        "title": 1,
        "mainCategory": 1,
        "mainSlug": 1,
        "sourceCategory": 1,
        "subcategory": 1,
        "subSlug": 1,
        "keywords": 1,
        "price": 1,
        "asin": 1,
        "aiProductScore": 1,
        "boughtInLastMonth": 1,
        "reviews": 1,
        "stars": 1,
        "isBestSeller": 1,
    }

    cursor = products_collection.find(
        {},
        projection=projection,
    ).batch_size(BATCH_SIZE)

    total = 0
    batch = []

    try:
        for product in cursor:
            if not product.get("title"):
                continue

            batch.append(product)

            if len(batch) >= BATCH_SIZE:
                total += upload_batch(batch)
                batch.clear()
                print(f"Processed {total} products")

        if batch:
            total += upload_batch(batch)

        print(f"Indexing finished. Processed {total} products.")
        print("Qdrant data directory:", QDRANT_PATH)

    finally:
        cursor.close()


if __name__ == "__main__":
    try:
        main()
    finally:
        mongo_client.close()
        qdrant.close()
