import sqlite3
import os
import json
import re
import logging
from typing import List, Dict, Any, Tuple
from collections import Counter

from src.engine.config import config

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════
#  LocalRagStore — Original keyword-based search (kept for fallback)
# ═══════════════════════════════════════════════════════════════════════

class LocalRagStore:
    def __init__(self):
        # We append a specifically named sqlite db file for the vectorstore alias since it's just a folder path in config currently.
        self.db_path = os.path.join(config.ENGINE_VECTORSTORE_PATH, "rag_store.sqlite3")
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        
        self.init_db()

    def init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS documents (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    collection TEXT NOT NULL,
                    text TEXT NOT NULL,
                    metadata_json TEXT
                )
            ''')
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_rag_collection 
                ON documents (collection)
            ''')
            conn.commit()

    def ingest(self, collection: str, documents: List[Any]) -> int:
        """Insert records generically as text documents (handles string and dict)."""
        count = 0
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            for doc in documents:
                # Handle extended schema mappings
                if isinstance(doc, dict):
                    doc_id = doc.get("id")
                    text = doc.get("text", "")
                    meta_json = json.dumps(doc.get("metadata", {}))
                elif hasattr(doc, "text"):
                    # For pydantic schema objects directly passed
                    doc_id = getattr(doc, "id", None)
                    text = getattr(doc, "text", "")
                    meta_json = json.dumps(getattr(doc, "metadata", {}) or {})
                else:
                    doc_id = None
                    text = str(doc)
                    meta_json = "{}"
                    
                if doc_id is not None:
                    # Provide upsert behavior or standard insert if ID exists
                    cursor.execute('''
                        INSERT OR REPLACE INTO documents (id, collection, text, metadata_json)
                        VALUES (?, ?, ?, ?)
                    ''', (doc_id, collection, text, meta_json))
                else:
                    cursor.execute('''
                        INSERT INTO documents (collection, text, metadata_json)
                        VALUES (?, ?, ?)
                    ''', (collection, text, meta_json))
                count += 1
            conn.commit()
        return count

    def _tokenize(self, text: str) -> List[str]:
        # Simple tokenization for baseline keyword matching
        words = re.findall(r'\b\w+\b', text.lower())
        return words

    def search(self, collection: str, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Basic keyword scoring since no external embeddings are present yet.
        Scores documents by sheer term frequency overlap with the query.
        """
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            # Fetch all texts in this collection
            cursor.execute('SELECT id, text FROM documents WHERE collection = ?', (collection,))
            docs = cursor.fetchall()
            
        if not docs:
            return []

        query_tokens = set(self._tokenize(query))
        if not query_tokens:
            return []

        scored_docs = []
        for doc_id, text in docs:
            doc_tokens = self._tokenize(text)
            doc_counts = Counter(doc_tokens)
            
            # Simple Intersection Score (similar primitive to BM25 before idf weights)
            score = 0.0
            for qt in query_tokens:
                # Weighted slightly by occurrence inside the document itself
                score += doc_counts.get(qt, 0)
                
            if score > 0:
                scored_docs.append({"id": doc_id, "text": text, "score": score})

        # Sort descending by score
        scored_docs.sort(key=lambda x: x["score"], reverse=True)
        return scored_docs[:top_k]


# ═══════════════════════════════════════════════════════════════════════
#  ChromaRagStore — Real vector-based semantic search with ChromaDB
# ═══════════════════════════════════════════════════════════════════════

class ChromaRagStore:
    """
    Production RAG store using ChromaDB with sentence-transformer embeddings
    for real semantic search.
    """

    def __init__(self):
        import chromadb
        
        persist_dir = config.ENGINE_VECTORSTORE_PATH
        os.makedirs(persist_dir, exist_ok=True)
        
        self._client = chromadb.PersistentClient(path=persist_dir)
        logger.info(f"ChromaDB initialized at {persist_dir}")

    def _get_collection(self, collection_name: str):
        """Get or create a ChromaDB collection."""
        return self._client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},
        )

    def ingest(self, collection: str, documents: List[Any]) -> int:
        """
        Ingest documents into a ChromaDB collection.
        Accepts strings, dicts with text/metadata, or Pydantic objects.
        """
        coll = self._get_collection(collection)

        texts = []
        metadatas = []
        ids = []

        for i, doc in enumerate(documents):
            if isinstance(doc, dict):
                doc_id = doc.get("id", f"doc-{coll.count() + i}")
                text = doc.get("text", "")
                meta = doc.get("metadata", {})
            elif hasattr(doc, "text"):
                doc_id = getattr(doc, "id", None) or f"doc-{coll.count() + i}"
                text = getattr(doc, "text", "")
                meta = getattr(doc, "metadata", {}) or {}
            else:
                doc_id = f"doc-{coll.count() + i}"
                text = str(doc)
                meta = {}

            # ChromaDB metadata values must be str, int, float, or bool
            sanitized_meta = {}
            for k, v in (meta if isinstance(meta, dict) else {}).items():
                if isinstance(v, (str, int, float, bool)):
                    sanitized_meta[k] = v
                else:
                    sanitized_meta[k] = str(v)

            texts.append(text)
            metadatas.append(sanitized_meta)
            ids.append(str(doc_id))

        if texts:
            coll.upsert(
                documents=texts,
                metadatas=metadatas,
                ids=ids,
            )

        return len(texts)

    def search(self, collection: str, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Semantic search using ChromaDB's built-in embedding + cosine similarity.
        Returns results matching the existing schema: [{"text": ..., "score": ...}]
        """
        coll = self._get_collection(collection)

        if coll.count() == 0:
            return []

        results = coll.query(
            query_texts=[query],
            n_results=min(top_k, coll.count()),
            include=["documents", "distances"],
        )

        docs_out = []
        if results and results["documents"] and results["documents"][0]:
            for text, distance in zip(
                results["documents"][0],
                results["distances"][0],
            ):
                # ChromaDB cosine distance: 0 = identical, 2 = opposite
                # Convert to similarity score (1 = identical, 0 = orthogonal)
                score = max(0.0, 1.0 - distance)
                docs_out.append({"text": text, "score": round(score, 4)})

        return docs_out


# ═══════════════════════════════════════════════════════════════════════
#  Singleton — pick implementation based on config
# ═══════════════════════════════════════════════════════════════════════

def _create_rag_store():
    """Factory: use ChromaDB if available and enabled, else fall back to keywords."""
    if config.USE_VECTOR_RAG:
        try:
            store = ChromaRagStore()
            logger.info("✅ Using ChromaDB vector RAG store")
            return store
        except Exception as e:
            logger.warning(f"⚠️  ChromaDB not available ({e}), falling back to keyword RAG")
    
    logger.info("Using keyword-based RAG store")
    return LocalRagStore()


rag_store = _create_rag_store()
