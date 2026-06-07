import sqlite3
import os
from typing import List, Dict, Any
from datetime import datetime

from src.engine.config import config

class SqliteMemoryStore:
    def __init__(self):
        self.db_path = config.ENGINE_MEMORY_DB_PATH
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        
        self.init_db()

    def init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS memory (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT NOT NULL,
                    ts DATETIME DEFAULT CURRENT_TIMESTAMP,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL
                )
            ''')
            # Index for fast retrieval by session
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_session 
                ON memory (session_id)
            ''')
            conn.commit()

    def read_history(self, session_id: str, limit: int = 20) -> List[Dict[str, str]]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT role, content 
                FROM memory 
                WHERE session_id = ? 
                ORDER BY ts DESC, id DESC 
                LIMIT ?
            ''', (session_id, limit))
            
            # SQLite returns results in DESC order because of ORDER BY ts DESC
            # We generally want chronological order for LLMs, so we reverse it
            rows = cursor.fetchall()
            messages = [{"role": row[0], "content": row[1]} for row in reversed(rows)]
            return messages

    def append_message(self, session_id: str, role: str, content: str) -> None:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO memory (session_id, role, content)
                VALUES (?, ?, ?)
            ''', (session_id, role, content))
            conn.commit()

memory_store = SqliteMemoryStore()


# ── LangChain-compatible Memory Adapter ──────────────────────────────

class LangChainMemoryAdapter:
    """
    Wraps SqliteMemoryStore and returns LangChain ConversationBufferWindowMemory
    objects pre-loaded with existing conversation history.

    Usage:
        memory = langchain_memory_adapter.get_memory("session-123", k=20)
        # → ConversationBufferWindowMemory ready for LangChain chains
    """

    def __init__(self, store: SqliteMemoryStore):
        self._store = store

    def get_memory(self, session_id: str, k: int = 20):
        """
        Return a LangChain ConversationBufferWindowMemory pre-loaded with
        the last *k* turns from SQLite for the given session.
        """
        from langchain.memory import ConversationBufferWindowMemory
        from langchain_core.messages import HumanMessage, AIMessage

        memory = ConversationBufferWindowMemory(
            k=k,
            return_messages=True,
            memory_key="chat_history",
        )

        # Load existing history into the LangChain memory object
        history = self._store.read_history(session_id, limit=k)
        for msg in history:
            role = msg["role"]
            content = msg["content"]
            if role == "user":
                memory.chat_memory.add_message(HumanMessage(content=content))
            elif role == "assistant":
                memory.chat_memory.add_message(AIMessage(content=content))
            # skip system / tool messages – LangChain memory only tracks human↔ai

        return memory

    def persist_turn(self, session_id: str, user_msg: str, ai_msg: str) -> None:
        """Convenience: write a full user→assistant turn to SQLite."""
        self._store.append_message(session_id, "user", user_msg)
        self._store.append_message(session_id, "assistant", ai_msg)


langchain_memory_adapter = LangChainMemoryAdapter(memory_store)
