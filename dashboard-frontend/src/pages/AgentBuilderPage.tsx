import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { ModelsService, type Model } from '../services/modelsService';
import { ChatService, type ChatModelOption } from '../services/chatService';
import { auth } from '../firebase';
import '../styles/AgentBuilder.css';

interface AgentMemory { enabled: boolean; session_id: string | null; limit: number; }
interface AgentRag { enabled: boolean; collection: string | null; top_k: number; }
interface AgentSpec {
  name: string; instructions: string; model_hint: string;
  allowed_tools: string[]; memory: AgentMemory; rag: AgentRag; input: string;
  topic_restriction: string;
}
interface SavedAgent {
  id: string; name: string; instructions: string | null; model_hint: string;
  allowed_tools: string[]; memory_enabled: boolean; rag_enabled: boolean; created_at: string | null;
  api_key?: string;
  topic_restriction: string | null;
}

// Same direct-route models as ChatPage
const DIRECT_CHAT_MODELS: Model[] = [
  { id: 'gemini-3-flash', name: 'Gemini 3 Flash', slug: 'gemini-3-flash', description: 'Direct Gemini route.', context_window: 0, speed_rating: 0, featured: true, logo_url: null, release_date: null, max_tokens: 0, company_name: 'Google', priority: 1, fallback_group: 'gemini', is_active: true },
  { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', slug: 'claude-sonnet-4-6', description: 'Direct Anthropic route.', context_window: 0, speed_rating: 0, featured: true, logo_url: null, release_date: null, max_tokens: 0, company_name: 'Anthropic', priority: 1, fallback_group: 'anthropic', is_active: true },
  { id: 'deepseek-chat', name: 'DeepSeek Chat', slug: 'deepseek-chat', description: 'DeepSeek API.', context_window: 0, speed_rating: 0, featured: false, logo_url: null, release_date: null, max_tokens: 0, company_name: 'DeepSeek', priority: 1, fallback_group: 'deepseek', is_active: true },
  { id: 'groq-llama-3.3-70b', name: 'Llama 3.3 70B (Groq)', slug: 'groq-llama-3.3-70b', description: 'Groq Llama 3.3.', context_window: 0, speed_rating: 0, featured: false, logo_url: null, release_date: null, max_tokens: 0, company_name: 'Groq', priority: 1, fallback_group: 'groq', is_active: true },
];

const mergeDirectModels = (fetched: Model[]): Model[] => {
  const existing = new Set(fetched.map(m => m.id));
  const extras = DIRECT_CHAT_MODELS.filter(m => !existing.has(m.id));
  return [...extras, ...fetched];
};

const mapChatOptionToModel = (opt: ChatModelOption): Model => ({
  id: opt.id, name: opt.name, slug: opt.id, description: opt.description ?? null,
  context_window: 0, speed_rating: 0, featured: opt.is_default, logo_url: null,
  release_date: null, max_tokens: 0, company_name: opt.provider_name,
  priority: 1, fallback_group: opt.provider_name, is_active: opt.is_active,
});

const TOOLS = [
  { id: 'time_now', name: 'Time Now', desc: 'Get the current date & time', icon: 'T' },
  { id: 'math_add', name: 'Math Add', desc: 'Perform numeric calculations', icon: '+' },
];

const AgentBuilderPage: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [availableModels, setAvailableModels] = useState<Model[]>([]);
  const [modelFetchError, setModelFetchError] = useState(false);
  const [engineOnline, setEngineOnline] = useState<boolean | null>(null);

  const [savedAgents, setSavedAgents] = useState<SavedAgent[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [quickChatId, setQuickChatId] = useState<string | null>(null);
  const [quickChatInput, setQuickChatInput] = useState('');
  const [quickChatResult, setQuickChatResult] = useState<any>(null);
  const [quickChatLoading, setQuickChatLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedApiKeyId, setCopiedApiKeyId] = useState<string | null>(null);

  const [buildResult, setBuildResult] = useState<any>(null);
  const [runResult, setRunResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const agentEngineUrl = (import.meta as any).env?.VITE_AGENT_ENGINE_URL || 'http://localhost:3002';

  const [spec, setSpec] = useState<AgentSpec>({
    name: 'My Custom Agent',
    instructions: 'You are a helpful assistant.',
    model_hint: 'openai/gpt-3.5-turbo',
    allowed_tools: [],
    memory: { enabled: false, session_id: 'session-1', limit: 20 },
    rag: { enabled: false, collection: 'docs', top_k: 5 },
    topic_restriction: '',
    input: '',
  });

  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return fetch(url, { ...options, headers });
  };

  // ── Check Agent Engine health ──
  useEffect(() => {
    fetch(`${agentEngineUrl}/health`, { method: 'GET' })
      .then(r => { if (r.ok) setEngineOnline(true); else setEngineOnline(false); })
      .catch(() => setEngineOnline(false));
  }, [agentEngineUrl]);

  // ── Fetch models (same pipeline as ChatPage) ──
  useEffect(() => {
    const loadModels = async () => {
      try {
        const [fetched, chatOptions] = await Promise.all([
          ModelsService.getModels(),
          ChatService.getModelOptions().catch(() => [] as ChatModelOption[]),
        ]);
        const backendOptions = chatOptions.filter(opt => opt.is_active).map(mapChatOptionToModel);
        const merged = backendOptions.length > 0 ? backendOptions : mergeDirectModels(fetched);
        setAvailableModels(merged);
        const defaultModel = chatOptions.find(opt => opt.is_default && opt.is_active)?.id;
        setSpec(s => ({ ...s, model_hint: defaultModel ?? merged[0]?.id ?? s.model_hint }));
      } catch {
        setModelFetchError(true);
      }
    };
    loadModels();
  }, []);

  // ── Fetch saved agents ──
  const fetchSaved = async () => {
    setSavedLoading(true);
    try {
      const r = await fetchWithAuth(`${agentEngineUrl}/v1/agents/list`);
      if (r.ok) { const d = await r.json(); setSavedAgents(d.agents || []); }
    } catch {} finally { setSavedLoading(false); }
  };
  useEffect(() => { fetchSaved(); }, []);

  const toggleTool = (id: string) => setSpec(s => ({
    ...s, allowed_tools: s.allowed_tools.includes(id) ? s.allowed_tools.filter(t => t !== id) : [...s.allowed_tools, id]
  }));

  // ── Run Agent ──
  const handleRun = async () => {
    if (!spec.input.trim()) return;
    setLoading(true); setError(null); setRunResult(null); setBuildResult(null);
    try {
      const payload = { ...spec, memory: { ...spec.memory, session_id: spec.memory.session_id || null }, rag: { ...spec.rag, collection: spec.rag.collection || null } };
      const r = await fetchWithAuth(`${agentEngineUrl}/v1/agents/run`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const d = await r.json();
      if (!r.ok) throw new Error(typeof d.detail === 'string' ? d.detail : JSON.stringify(d));
      setRunResult(d);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  // ── Build & Save ──
  const handleSave = async () => {
    setLoading(true); setError(null); setRunResult(null); setBuildResult(null);
    try {
      const r = await fetchWithAuth(`${agentEngineUrl}/v1/build/agent`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: "build_agent",
          basics: { agentName: spec.name, systemPrompt: spec.instructions, modelHint: spec.model_hint, topicRestriction: spec.topic_restriction },
          capabilities: { tools: spec.allowed_tools, enableMemory: spec.memory.enabled, enableRagContext: spec.rag.enabled }
        })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(typeof d.detail === 'string' ? d.detail : JSON.stringify(d));
      setBuildResult(d);
      fetchSaved();
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => {
    await fetchWithAuth(`${agentEngineUrl}/v1/agents/${id}`, { method: 'DELETE' }).catch(() => {});
    fetchSaved();
  };

  const handleQuickChat = async (id: string) => {
    if (!quickChatInput.trim()) return;
    setQuickChatLoading(true); setQuickChatResult(null);
    try {
      const r = await fetchWithAuth(`${agentEngineUrl}/v1/build/agent/${id}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: quickChatInput }) });
      const d = await r.json();
      if (!r.ok) throw new Error(typeof d.detail === 'string' ? d.detail : JSON.stringify(d));
      setQuickChatResult(d);
    } catch (e: any) { setQuickChatResult({ error: e.message }); } finally { setQuickChatLoading(false); }
  };

  const copyEndpoint = (id: string) => {
    navigator.clipboard.writeText(`${agentEngineUrl}/v1/build/agent/${id}/chat`);
    setCopiedId(id); setTimeout(() => setCopiedId(null), 2000);
  };

  const copyApiKey = (id: string, key?: string) => {
    if (!key) return;
    navigator.clipboard.writeText(key);
    setCopiedApiKeyId(id); setTimeout(() => setCopiedApiKeyId(null), 2000);
  };

  return (
    <>
      <Navbar />
      <div className="dashboard-with-sidebar">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="dashboard-content dashboard-fadeIn">
          <div className="ab-page">
            <div className="ab-hero">
              <h1>Agent Builder</h1>
              <p>Configure your AI agent visually, test it live, and deploy with one click.</p>
            </div>

            {engineOnline === false && (
              <div className="ab-result-error fade-in" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                <strong>Agent Engine Offline</strong> — Cannot reach <code>{agentEngineUrl}</code>. Start it with: <code>.\venv\Scripts\python.exe -m uvicorn src.engine.main:app --port 3002</code>
              </div>
            )}

            <div className="ab-grid">
              {/* ═══ Left: Configuration ═══ */}
              <div className="ab-config">

                {/* Identity */}
                <div className="ab-section">
                  <div className="ab-section-head">
                    <div className="ab-section-icon identity">ID</div>
                    <div>
                      <h3 className="ab-section-title">Identity</h3>
                      <p className="ab-section-subtitle">Name and personality of your agent</p>
                    </div>
                  </div>
                  <div className="ab-field">
                    <span className="ab-field-label">Agent Name</span>
                    <input className="ab-input" value={spec.name} onChange={e => setSpec({...spec, name: e.target.value})} placeholder="e.g. Support Bot" />
                  </div>
                  <div className="ab-field">
                    <span className="ab-field-label">System Prompt</span>
                    <textarea className="ab-input" rows={3} value={spec.instructions} onChange={e => setSpec({...spec, instructions: e.target.value})} placeholder="Describe what the agent should do..." />
                  </div>
                  <div className="ab-field">
                    <span className="ab-field-label">Topic Restriction (Optional)</span>
                    <input className="ab-input" value={spec.topic_restriction} onChange={e => setSpec({...spec, topic_restriction: e.target.value})} placeholder="e.g. Travel, E-commerce, Code..." />
                    <small style={{ display: 'block', marginTop: '0.25rem', color: '#6b7280', fontSize: '0.75rem' }}>If set, the agent will gracefully refuse to answer questions outside this topic.</small>
                  </div>
                </div>

                {/* Model */}
                <div className="ab-section">
                  <div className="ab-section-head">
                    <div className="ab-section-icon model">AI</div>
                    <div>
                      <h3 className="ab-section-title">Model</h3>
                      <p className="ab-section-subtitle">Choose the LLM powering your agent</p>
                    </div>
                  </div>
                  <div className="ab-field">
                    {!modelFetchError && availableModels.length > 0 ? (
                      <select className="ab-input" value={spec.model_hint} onChange={e => setSpec({...spec, model_hint: e.target.value})}>
                        {availableModels.filter(m => m.is_active !== false).map(m => (
                          <option key={m.id} value={m.id}>{m.name || m.id} ({m.company_name})</option>
                        ))}
                      </select>
                    ) : (
                      <input className="ab-input" value={spec.model_hint} onChange={e => setSpec({...spec, model_hint: e.target.value})} placeholder="openai/gpt-4o" />
                    )}
                  </div>
                </div>

                {/* Tools */}
                <div className="ab-section">
                  <div className="ab-section-head">
                    <div className="ab-section-icon tools">FN</div>
                    <div>
                      <h3 className="ab-section-title">Tools</h3>
                      <p className="ab-section-subtitle">Enable functions your agent can call</p>
                    </div>
                  </div>
                  <div className="ab-tools-grid">
                    {TOOLS.map(tool => (
                      <div key={tool.id} className={`ab-tool-card ${spec.allowed_tools.includes(tool.id) ? 'active' : ''}`} onClick={() => toggleTool(tool.id)}>
                        <div className="ab-tool-icon">{tool.icon}</div>
                        <div className="ab-tool-info">
                          <div className="ab-tool-name">{tool.name}</div>
                          <div className="ab-tool-desc">{tool.desc}</div>
                        </div>
                        <div className="ab-tool-toggle" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Features: Memory & RAG */}
                <div className="ab-section">
                  <div className="ab-section-head">
                    <div className="ab-section-icon features">+</div>
                    <div>
                      <h3 className="ab-section-title">Features</h3>
                      <p className="ab-section-subtitle">Memory persistence and knowledge base</p>
                    </div>
                  </div>
                  <div className="ab-features-grid">
                    {/* Memory */}
                    <div className={`ab-feature-card ${spec.memory.enabled ? 'active' : ''}`}>
                      <div className="ab-feature-header" onClick={() => setSpec({...spec, memory: {...spec.memory, enabled: !spec.memory.enabled}})}>
                        <div className="ab-feature-icon memory">M</div>
                        <div className="ab-feature-info">
                          <div className="ab-feature-name">Conversation Memory</div>
                          <div className="ab-feature-desc">Remember previous messages across sessions</div>
                        </div>
                        <div className={`ab-tool-toggle ${spec.memory.enabled ? '' : ''}`} style={spec.memory.enabled ? { background: 'rgba(139, 92, 246, 0.5)' } : {}} >
                          <span style={spec.memory.enabled ? { position: 'absolute', width: 16, height: 16, borderRadius: '50%', background: '#fff', top: 2, left: 2, transform: 'translateX(16px)', transition: 'transform 0.25s' } : { position: 'absolute', width: 16, height: 16, borderRadius: '50%', background: '#fff', top: 2, left: 2, transition: 'transform 0.25s' }} />
                        </div>
                      </div>
                      {spec.memory.enabled && (
                        <div className="ab-feature-body">
                          <div className="ab-field">
                            <span className="ab-field-label">Session ID</span>
                            <input className="ab-input" value={spec.memory.session_id || ''} onChange={e => setSpec({...spec, memory: {...spec.memory, session_id: e.target.value}})} />
                          </div>
                          <div className="ab-field">
                            <span className="ab-field-label">History Limit</span>
                            <input className="ab-input" type="number" value={spec.memory.limit} onChange={e => setSpec({...spec, memory: {...spec.memory, limit: parseInt(e.target.value) || 20}})} />
                          </div>
                        </div>
                      )}
                    </div>
                    {/* RAG */}
                    <div className={`ab-feature-card ${spec.rag.enabled ? 'active' : ''}`}>
                      <div className="ab-feature-header" onClick={() => setSpec({...spec, rag: {...spec.rag, enabled: !spec.rag.enabled}})}>
                        <div className="ab-feature-icon rag">R</div>
                        <div className="ab-feature-info">
                          <div className="ab-feature-name">RAG Knowledge Base</div>
                          <div className="ab-feature-desc">Search private documents for context</div>
                        </div>
                        <div className="ab-tool-toggle" style={spec.rag.enabled ? { background: 'rgba(245, 158, 11, 0.5)' } : {}}>
                          <span style={spec.rag.enabled ? { position: 'absolute', width: 16, height: 16, borderRadius: '50%', background: '#fff', top: 2, left: 2, transform: 'translateX(16px)', transition: 'transform 0.25s' } : { position: 'absolute', width: 16, height: 16, borderRadius: '50%', background: '#fff', top: 2, left: 2, transition: 'transform 0.25s' }} />
                        </div>
                      </div>
                      {spec.rag.enabled && (
                        <div className="ab-feature-body">
                          <div className="ab-field">
                            <span className="ab-field-label">Collection</span>
                            <input className="ab-input" value={spec.rag.collection || ''} onChange={e => setSpec({...spec, rag: {...spec.rag, collection: e.target.value}})} />
                          </div>
                          <div className="ab-field">
                            <span className="ab-field-label">Top K</span>
                            <input className="ab-input" type="number" value={spec.rag.top_k} onChange={e => setSpec({...spec, rag: {...spec.rag, top_k: parseInt(e.target.value) || 5}})} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Playground */}
                <div className="ab-section ab-playground">
                  <div className="ab-section-head">
                    <div className="ab-section-icon playground">GO</div>
                    <div>
                      <h3 className="ab-section-title">Playground</h3>
                      <p className="ab-section-subtitle">Test or save your agent configuration</p>
                    </div>
                  </div>
                  <div className="ab-chat-input-wrap">
                    <textarea
                      className="ab-chat-input"
                      value={spec.input}
                      onChange={e => setSpec({...spec, input: e.target.value})}
                      placeholder="Type a message to test your agent..."
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleRun(); } }}
                    />
                    <div className="ab-chat-actions">
                      <button className="ab-btn save" onClick={handleSave} disabled={loading}>
                        {loading ? '...' : 'Save Agent'}
                      </button>
                      <button className="ab-btn run" onClick={handleRun} disabled={loading || !spec.input.trim()}>
                        {loading ? '...' : 'Run Agent'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ═══ Right: Live Preview + Results ═══ */}
              <div className="ab-preview">
                <div className="ab-preview-card">
                  <div className="ab-preview-head">
                    <div className="ab-preview-title">
                      <div className="ab-preview-dot" />
                      Live Preview
                    </div>
                  </div>
                  <div className="ab-preview-row">
                    <span className="ab-preview-label">Name</span>
                    <span className="ab-preview-value">{spec.name || '—'}</span>
                  </div>
                  <div className="ab-preview-row">
                    <span className="ab-preview-label">Model</span>
                    <span className="ab-preview-value"><code>{spec.model_hint}</code></span>
                  </div>
                  <div className="ab-preview-row">
                    <span className="ab-preview-label">Prompt</span>
                    <span className="ab-preview-value">{spec.instructions?.substring(0, 40) || '—'}{spec.instructions?.length > 40 ? '...' : ''}</span>
                  </div>
                  <div className="ab-preview-row">
                    <span className="ab-preview-label">Capabilities</span>
                    <div className="ab-preview-tags">
                      {spec.allowed_tools.map(t => <span key={t} className="ab-ptag tool">{t}</span>)}
                      {spec.memory.enabled && <span className="ab-ptag mem">Memory</span>}
                      {spec.rag.enabled && <span className="ab-ptag rag">RAG</span>}
                      {spec.allowed_tools.length === 0 && !spec.memory.enabled && !spec.rag.enabled && <span className="ab-ptag none">None</span>}
                    </div>
                  </div>
                </div>

                {/* Results Area */}
                <div className="ab-preview-card">
                  <div className="ab-preview-head">
                    <div className="ab-preview-title">Output</div>
                  </div>

                  {error && <div className="ab-result-error fade-in">{error}</div>}

                  {buildResult && !error && (
                    <div className="ab-result-success fade-in">
                      <h4><span style={{ fontSize: '1rem' }}>&#10003;</span> Agent Saved</h4>
                      <div className="ab-result-info">
                        <span className="label">ID</span>
                        <span className="val"><code>{buildResult.agent_id}</code></span>
                        <span className="label">API Key</span>
                        <span className="val"><code>{buildResult.api_key}</code></span>
                        <span className="label">Name</span>
                        <span className="val">{buildResult.name}</span>
                        <span className="label">Status</span>
                        <span className="val" style={{ color: '#34d399' }}>{buildResult.status}</span>
                      </div>
                    </div>
                  )}

                  {loading && (
                    <div className="ab-result-loading"><div className="ab-spinner" /><span>Processing...</span></div>
                  )}

                  {runResult && !loading && !error && (
                    <div className="ab-result-answer fade-in">
                      <h4>Agent Response</h4>
                      <div className="answer-body">{runResult.answer}</div>
                      {runResult.used_tools?.length > 0 && (
                        <div className="tools-line">Tools used: {runResult.used_tools.join(', ')}</div>
                      )}
                    </div>
                  )}

                  {!error && !buildResult && !runResult && !loading && (
                    <div className="ab-result-idle">
                      <p>No output yet</p>
                      <p>Configure your agent and run it to see results.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ═══ Saved Agents ═══ */}
            <div className="ab-saved">
              <div className="ab-saved-panel">
                <div className="ab-saved-head">
                  <h3>Saved Agents</h3>
                  <button className="ab-btn blue" onClick={fetchSaved}>Refresh</button>
                </div>

                {savedLoading && <div className="ab-result-loading"><div className="ab-spinner" /></div>}

                {!savedLoading && savedAgents.length === 0 && (
                  <div className="ab-saved-empty">
                    <p>No saved agents yet</p>
                    <span>Build and save an agent above to see it here.</span>
                  </div>
                )}

                {!savedLoading && savedAgents.length > 0 && (
                  <div className="ab-agents-grid">
                    {savedAgents.map(agent => (
                      <div key={agent.id} className="ab-agent-card">
                        <div className="ab-agent-top">
                          <div>
                            <h4 className="ab-agent-name">{agent.name}</h4>
                            <div className="ab-agent-model">{agent.model_hint}</div>
                          </div>
                          <div className="ab-agent-badges">
                            {agent.topic_restriction && <span className="ab-badge guardrail" title={`Guardrail: ${agent.topic_restriction}`}>🛡️ {agent.topic_restriction}</span>}
                            {agent.memory_enabled && <span className="ab-badge mem" title="Memory">M</span>}
                            {agent.rag_enabled && <span className="ab-badge rag" title="RAG">R</span>}
                            {agent.allowed_tools.length > 0 && <span className="ab-badge tool" title={agent.allowed_tools.join(', ')}>T</span>}
                          </div>
                        </div>
                        {agent.instructions && <p className="ab-agent-prompt">{agent.instructions}</p>}
                        <div className="ab-agent-actions">
                          <button className="ab-btn green" onClick={() => { setQuickChatId(quickChatId === agent.id ? null : agent.id); setQuickChatResult(null); setQuickChatInput(''); }}>
                            {quickChatId === agent.id ? 'Close' : 'Run'}
                          </button>
                          {agent.api_key && (
                            <button className="ab-btn gray" onClick={() => copyApiKey(agent.id, agent.api_key)}>
                              {copiedApiKeyId === agent.id ? 'Copied Key!' : 'Copy Key'}
                            </button>
                          )}
                          <button className="ab-btn blue" onClick={() => copyEndpoint(agent.id)}>
                            {copiedId === agent.id ? 'Copied URL!' : 'Copy URL'}
                          </button>
                          <button className="ab-btn red" onClick={() => handleDelete(agent.id)}>Delete</button>
                        </div>
                        {quickChatId === agent.id && (
                          <div className="ab-qchat">
                            <div className="ab-qchat-row">
                              <input className="ab-input" placeholder="Type a message..." value={quickChatInput} onChange={e => setQuickChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleQuickChat(agent.id)} />
                              <button className="ab-btn run" disabled={quickChatLoading || !quickChatInput.trim()} onClick={() => handleQuickChat(agent.id)}>
                                {quickChatLoading ? '...' : 'Send'}
                              </button>
                            </div>
                            {quickChatResult && (
                              <div className="ab-qchat-result">
                                {quickChatResult.error
                                  ? <span style={{ color: '#f87171' }}>{quickChatResult.error}</span>
                                  : <>
                                      <p style={{ margin: 0 }}>{quickChatResult.response}</p>
                                      {quickChatResult.tools_used?.length > 0 && <div style={{ marginTop: '0.25rem', fontSize: '0.72rem', color: '#6b7280' }}>Tools: {quickChatResult.tools_used.join(', ')}</div>}
                                    </>
                                }
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default AgentBuilderPage;
