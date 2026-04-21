from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import sqlite3

from src.engine.config import config

router = APIRouter()

class DBQueryRequest(BaseModel):
    query: str
    params: Optional[List[Any]] = None

class DBQueryResponse(BaseModel):
    columns: List[str]
    rows: List[Dict[str, Any]]

@router.post("/query", response_model=DBQueryResponse)
async def run_db_query(request: DBQueryRequest):
    """
    Executes a SELECT query against the defined DATABASE_URL.
    Safeguards: Only allows read-only SELECT commands (basic regex validation).
    """
    db_url = config.DATABASE_URL
    if not db_url:
        raise HTTPException(status_code=500, detail="DATABASE_URL not configured")
        
    query_upper = request.query.strip().upper()
    if not query_upper.startswith("SELECT") and not query_upper.startswith("WITH"):
        raise HTTPException(status_code=400, detail="Only SELECT queries are allowed via this endpoint")

    try:
        # Assuming sqlite syntax for standard backend DB (or replace if using asyncpg)
        with sqlite3.connect(db_url) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            if request.params:
                cursor.execute(request.query, request.params)
            else:
                cursor.execute(request.query)
                
            records = cursor.fetchall()
            if records:
                columns = list(records[0].keys())
                rows = [dict(row) for row in records]
            else:
                columns = [desc[0] for desc in cursor.description] if cursor.description else []
                rows = []
                
            return DBQueryResponse(columns=columns, rows=rows)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")
