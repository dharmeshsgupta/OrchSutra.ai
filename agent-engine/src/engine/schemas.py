from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Union
from datetime import datetime

# ═══════════════════════════════════════════════════════════════════════
#  Prompt Structuring
# ═══════════════════════════════════════════════════════════════════════

class PromptStructureRequest(BaseModel):
    input: str
    instructions: Optional[str] = None
    output_schema: Optional[Dict[str, Any]] = None

class PromptStructureResponse(BaseModel):
    system_prompt: str
    messages: List[Dict[str, Any]]
    output_format_hint: Optional[str] = None

# ═══════════════════════════════════════════════════════════════════════
#  Tools
# ═══════════════════════════════════════════════════════════════════════

class ToolExecuteRequest(BaseModel):
    tool_name: str
    arguments: Dict[str, Any]

class ToolExecuteResponse(BaseModel):
    result: Any
    error: Optional[str] = None

# ═══════════════════════════════════════════════════════════════════════
#  Memory
# ═══════════════════════════════════════════════════════════════════════

class MemoryReadRequest(BaseModel):
    session_id: str
    limit: int = 20

class MemoryReadResponse(BaseModel):
    messages: List[Dict[str, Any]]

class MemoryWriteRequest(BaseModel):
    session_id: str
    role: str
    content: str
    
class MemoryWriteResponse(BaseModel):
    success: bool

# ═══════════════════════════════════════════════════════════════════════
#  RAG
# ═══════════════════════════════════════════════════════════════════════

class RagDocumentSchema(BaseModel):
    id: Optional[str] = None
    text: str
    metadata: Optional[Dict[str, Any]] = None

class RagIngestRequest(BaseModel):
    collection: str
    documents: List[Union[str, RagDocumentSchema]]
    
class RagIngestResponse(BaseModel):
    success: bool
    ingested_count: int

class RagSearchRequest(BaseModel):
    collection: str
    query: str
    top_k: int = 5

class RagSearchResult(BaseModel):
    text: str
    score: float

class RagSearchResponse(BaseModel):
    results: List[RagSearchResult]

# ═══════════════════════════════════════════════════════════════════════
#  Agent Spec (run-time input for the LangGraph pipeline)
# ═══════════════════════════════════════════════════════════════════════

class AgentMemoryConfig(BaseModel):
    enabled: bool = False
    session_id: Optional[str] = None
    limit: int = 20

class AgentRagConfig(BaseModel):
    enabled: bool = False
    collection: Optional[str] = None
    top_k: int = 5

class AgentSpec(BaseModel):
    name: str
    instructions: Optional[str] = None
    model_hint: Optional[str] = None
    allowed_tools: List[str] = Field(default_factory=list)
    memory: AgentMemoryConfig = Field(default_factory=AgentMemoryConfig)
    rag: AgentRagConfig = Field(default_factory=AgentRagConfig)
    topic_restriction: Optional[str] = None
    input: str

class AgentRunResponse(BaseModel):
    answer: str
    used_tools: List[str] = Field(default_factory=list)
    rag_context: List[str] = Field(default_factory=list)
    messages: Optional[List[Dict[str, Any]]] = None

# ═══════════════════════════════════════════════════════════════════════
#  Agent Record (persisted agent configuration)
# ═══════════════════════════════════════════════════════════════════════

class AgentRecord(BaseModel):
    id: str
    user_id: str
    api_key: str
    name: str
    instructions: Optional[str] = None
    topic_restriction: Optional[str] = None
    model_hint: str = "openai/gpt-3.5-turbo"
    allowed_tools: List[str] = Field(default_factory=list)
    memory_enabled: bool = False
    memory_session_id: Optional[str] = None
    memory_limit: int = 20
    rag_enabled: bool = False
    rag_collection: Optional[str] = None
    rag_top_k: int = 5
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    def to_agent_spec(self, user_input: str) -> AgentSpec:
        """Convert a saved AgentRecord into a runnable AgentSpec."""
        return AgentSpec(
            name=self.name,
            instructions=self.instructions,
            model_hint=self.model_hint,
            allowed_tools=self.allowed_tools,
            memory=AgentMemoryConfig(
                enabled=self.memory_enabled,
                session_id=self.memory_session_id,
                limit=self.memory_limit,
            ),
            rag=AgentRagConfig(
                enabled=self.rag_enabled,
                collection=self.rag_collection,
                top_k=self.rag_top_k,
            ),
            topic_restriction=self.topic_restriction,
            input=user_input,
        )

class AgentListResponse(BaseModel):
    agents: List[AgentRecord]

# ═══════════════════════════════════════════════════════════════════════
#  Builder API Schemas (simplified external-facing interface)
# ═══════════════════════════════════════════════════════════════════════

class BuildAgentBasics(BaseModel):
    agentName: str
    systemPrompt: str
    topicRestriction: Optional[str] = None
    modelHint: str = "openai/gpt-3.5-turbo"

class BuildAgentCapabilities(BaseModel):
    tools: List[str] = Field(default_factory=list)
    enableMemory: bool = False
    enableRagContext: bool = False

class BuildAgentRequest(BaseModel):
    action: str = "build_agent"
    basics: BuildAgentBasics
    capabilities: BuildAgentCapabilities

class BuildAgentEndpoints(BaseModel):
    run: str
    config: str
    chat: str
    export: str

class BuildAgentResponse(BaseModel):
    agent_id: str
    api_key: str
    name: str
    status: str = "ready"
    endpoints: BuildAgentEndpoints

class BuildChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

class BuildChatResponse(BaseModel):
    response: str
    tools_used: List[str] = Field(default_factory=list)
    session_id: str

class BuildIngestRequest(BaseModel):
    documents: List[str]

class BuildIngestResponse(BaseModel):
    success: bool
    ingested_count: int
    collection: str

class BuildCapabilitiesResponse(BaseModel):
    available_tools: List[Dict[str, str]]
    available_models: List[str]
    features: Dict[str, bool]
