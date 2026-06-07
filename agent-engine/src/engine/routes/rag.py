from fastapi import APIRouter
from src.engine.schemas import RagIngestRequest, RagIngestResponse, RagSearchRequest, RagSearchResponse, RagSearchResult
from src.engine.rag.store import rag_store

router = APIRouter()

@router.post("/ingest", response_model=RagIngestResponse)
async def ingest_documents(request: RagIngestRequest):
    """
    Upserts raw text documents into a specified collection for RAG context building.
    Uses local SQLite storage for now (no embeddings).
    """
    inserted_count = rag_store.ingest(request.collection, request.documents)
    return RagIngestResponse(success=True, ingested_count=inserted_count)

@router.post("/search", response_model=RagSearchResponse)
async def search_documents(request: RagSearchRequest):
    """
    Queries documents inside a specified collection using basic keyword scoring.
    Returns the top_k snippets ordered by term-overlap score.
    """
    scored_results = rag_store.search(request.collection, request.query, request.top_k)
    
    # Map results explicitly to our new RagSearchResult object scheme
    output = []
    for sr in scored_results:
        output.append(RagSearchResult(text=sr["text"], score=float(sr["score"])))
        
    return RagSearchResponse(results=output)