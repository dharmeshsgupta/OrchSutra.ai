"""
Agent Persistence — async SQLite CRUD for saved agent configurations.

Stores agent configs so they survive restarts and can be invoked by ID
from external projects via the Builder API.
"""

import sqlite3
import os
import json
import uuid
import logging
from typing import List, Optional
from datetime import datetime, timezone

from src.engine.config import config
from src.engine.schemas import AgentRecord, AgentSpec

logger = logging.getLogger(__name__)


class AgentPersistence:
    """Synchronous SQLite-backed CRUD for agent configurations."""

    def __init__(self):
        self.db_path = config.ENGINE_AGENTS_DB_PATH
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS agents (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    instructions TEXT,
                    model_hint TEXT DEFAULT 'openai/gpt-3.5-turbo',
                    allowed_tools TEXT DEFAULT '[]',
                    memory_enabled INTEGER DEFAULT 0,
                    memory_session_id TEXT,
                    memory_limit INTEGER DEFAULT 20,
                    rag_enabled INTEGER DEFAULT 0,
                    rag_collection TEXT,
                    rag_top_k INTEGER DEFAULT 5,
                    created_at TEXT,
                    updated_at TEXT,
                    user_id TEXT NOT NULL,
                    api_key TEXT NOT NULL
                )
            """)
            conn.commit()
        logger.info(f"✅ Agent persistence DB ready at {self.db_path}")

    def _row_to_record(self, row: tuple) -> AgentRecord:
        return AgentRecord(
            id=row[0],
            name=row[1],
            instructions=row[2],
            model_hint=row[3] or "openai/gpt-3.5-turbo",
            allowed_tools=json.loads(row[4]) if row[4] else [],
            memory_enabled=bool(row[5]),
            memory_session_id=row[6],
            memory_limit=row[7] or 20,
            rag_enabled=bool(row[8]),
            rag_collection=row[9],
            rag_top_k=row[10] or 5,
            created_at=row[11],
            updated_at=row[12],
            user_id=row[13],
            api_key=row[14],
            topic_restriction=row[15],
        )

    # ── CREATE ──────────────────────────────────────────────────────

    def create_agent(self, spec: AgentSpec, user_id: str, agent_id: Optional[str] = None) -> AgentRecord:
        """Create and persist a new agent from an AgentSpec."""
        aid = agent_id or uuid.uuid4().hex
        now = datetime.now(timezone.utc).isoformat()
        api_key = f"sk-agent-{os.urandom(12).hex()}"

        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """INSERT INTO agents
                   (id, name, instructions, model_hint, allowed_tools,
                    memory_enabled, memory_session_id, memory_limit,
                    rag_enabled, rag_collection, rag_top_k,
                    created_at, updated_at, user_id, api_key, topic_restriction)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    aid,
                    spec.name,
                    spec.instructions,
                    spec.model_hint or "openai/gpt-3.5-turbo",
                    json.dumps(spec.allowed_tools),
                    int(spec.memory.enabled) if spec.memory else 0,
                    spec.memory.session_id if spec.memory else None,
                    spec.memory.limit if spec.memory else 20,
                    int(spec.rag.enabled) if spec.rag else 0,
                    spec.rag.collection if spec.rag else None,
                    spec.rag.top_k if spec.rag else 5,
                    now,
                    now,
                    user_id,
                    api_key,
                    spec.topic_restriction,
                ),
            )
            conn.commit()

        return self.get_agent(aid)  # type: ignore

    def create_from_build_request(self, user_id: str, name: str, system_prompt: str,
                                   model_hint: str, tools: List[str],
                                   enable_memory: bool, enable_rag: bool,
                                   topic_restriction: Optional[str] = None) -> AgentRecord:
        """Convenience: create an agent from Builder API fields."""
        spec = AgentSpec(
            name=name,
            instructions=system_prompt,
            model_hint=model_hint,
            allowed_tools=tools,
            memory={"enabled": enable_memory, "session_id": None, "limit": 20},
            rag={"enabled": enable_rag, "collection": None, "top_k": 5},
            topic_restriction=topic_restriction,
            input="",  # placeholder — not stored
        )
        record = self.create_agent(spec, user_id=user_id)

        # Auto-set memory session and RAG collection based on agent ID
        with sqlite3.connect(self.db_path) as conn:
            updates = {}
            if enable_memory:
                updates["memory_session_id"] = f"agent-{record.id}"
            if enable_rag:
                updates["rag_collection"] = f"agent-{record.id}"

            if updates:
                set_clause = ", ".join(f"{k} = ?" for k in updates)
                conn.execute(
                    f"UPDATE agents SET {set_clause}, updated_at = ? WHERE id = ?",
                    (*updates.values(), datetime.now(timezone.utc).isoformat(), record.id),
                )
                conn.commit()

        return self.get_agent(record.id)  # type: ignore

    # ── READ ────────────────────────────────────────────────────────

    def get_agent(self, agent_id: str) -> Optional[AgentRecord]:
        with sqlite3.connect(self.db_path) as conn:
            row = conn.execute("SELECT * FROM agents WHERE id = ?", (agent_id,)).fetchone()
        return self._row_to_record(row) if row else None

    def list_agents(self, user_id: str) -> List[AgentRecord]:
        with sqlite3.connect(self.db_path) as conn:
            rows = conn.execute("SELECT * FROM agents WHERE user_id = ? ORDER BY created_at DESC", (user_id,)).fetchall()
        return [self._row_to_record(r) for r in rows]

    # ── UPDATE ──────────────────────────────────────────────────────

    def update_agent(self, agent_id: str, user_id: str, spec: AgentSpec) -> Optional[AgentRecord]:
        now = datetime.now(timezone.utc).isoformat()
        with sqlite3.connect(self.db_path) as conn:
            result = conn.execute(
                """UPDATE agents SET
                   name = ?, instructions = ?, model_hint = ?, allowed_tools = ?,
                   memory_enabled = ?, memory_session_id = ?, memory_limit = ?,
                   rag_enabled = ?, rag_collection = ?, rag_top_k = ?,
                   topic_restriction = ?, updated_at = ?
                   WHERE id = ? AND user_id = ?""",
                (
                    spec.name,
                    spec.instructions,
                    spec.model_hint or "openai/gpt-3.5-turbo",
                    json.dumps(spec.allowed_tools),
                    int(spec.memory.enabled) if spec.memory else 0,
                    spec.memory.session_id if spec.memory else None,
                    spec.memory.limit if spec.memory else 20,
                    int(spec.rag.enabled) if spec.rag else 0,
                    spec.rag.collection if spec.rag else None,
                    spec.rag.top_k if spec.rag else 5,
                    spec.topic_restriction,
                    now,
                    agent_id,
                    user_id,
                ),
            )
            conn.commit()
            if result.rowcount == 0:
                return None

        return self.get_agent(agent_id)

    # ── DELETE ──────────────────────────────────────────────────────

    def delete_agent(self, agent_id: str, user_id: str) -> bool:
        with sqlite3.connect(self.db_path) as conn:
            result = conn.execute("DELETE FROM agents WHERE id = ? AND user_id = ?", (agent_id, user_id))
            conn.commit()
            return result.rowcount > 0


agent_persistence = AgentPersistence()
