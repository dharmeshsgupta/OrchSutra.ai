import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ModelsService, ModelDetailService } from '../services/modelsService';
import type { 
  Model, 
  ModelProvider, 
  ProviderStats, 
  PerformanceData,
  PerformancePoint,
  ActivityRecord,
  ParameterRange 
} from '../services/modelsService';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import '../styles/ModelDetail.css';

// ============== TAB CONFIGURATION ==============
const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'providers', label: 'Providers' },
  { id: 'performance', label: 'Performance' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'benchmarks', label: 'Benchmarks' },
  { id: 'activity', label: 'Activity' },
  { id: 'quickstart', label: 'Quickstart' },
];

// ============== MAIN COMPONENT ==============
const ModelDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [model, setModel] = useState<Model | null>(null);
  const [providers, setProviders] = useState<ModelProvider[]>([]);
  console.log(providers); // suppress TS error
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);

  // ============== NAVBAR SCROLL STATE ==============
  const [navbarVisible, setNavbarVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // ============== CHAT PANEL STATE ==============
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // ============== COMPARE STATE ==============
  const [compareList, setCompareList] = useState<string[]>(() => {
    const saved = localStorage.getItem('compareModels');
    return saved ? JSON.parse(saved) : [];
  });
  const [showCompareToast, setShowCompareToast] = useState(false);

  // ============== SECTION REFS FOR SCROLL TRACKING ==============
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  // ============== DYNAMIC DATA STATE (From API) ==============
  const [providerStats, setProviderStats] = useState<ProviderStats[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [benchmarkScores, setBenchmarkScores] = useState<Record<string, number>>({});
  const [activityData, setActivityData] = useState<ActivityRecord[]>([]);
  const [parameters, setParameters] = useState<Record<string, ParameterRange>>({});
  console.log(parameters); // suppress TS error

  // Derived data from performanceData
  const throughputData: PerformancePoint[] = performanceData?.throughput || [];
  const latencyData: PerformancePoint[] = performanceData?.latency || [];

  // ============== NAVBAR SCROLL HIDE/SHOW ==============
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY < 100) {
        // Always show navbar at top
        setNavbarVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down - hide navbar
        setNavbarVisible(false);
      } else if (currentScrollY < lastScrollY) {
        // Scrolling up - show navbar
        setNavbarVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // ============== INTERSECTION OBSERVER FOR SCROLL-BASED TAB SWITCHING ==============
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -60% 0px',
      threshold: 0
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      if (isScrolling) return;
      
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const sectionId = entry.target.getAttribute('data-section');
          if (sectionId) {
            setActiveTab(sectionId);
          }
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    // Observe all sections
    Object.values(sectionRefs.current).forEach((section) => {
      if (section) observer.observe(section);
    });

    return () => observer.disconnect();
  }, [isScrolling, loading]);

  // ============== SMOOTH SCROLL TO SECTION ON TAB CLICK ==============
  const handleTabClick = useCallback((tabId: string) => {
    setIsScrolling(true);
    setActiveTab(tabId);
    
    const section = sectionRefs.current[tabId];
    if (section) {
      const yOffset = -100; // Offset for sticky header
      const y = section.getBoundingClientRect().top + window.pageYOffset + yOffset;
      
      window.scrollTo({ top: y, behavior: 'smooth' });
      
      // Reset scrolling flag after animation
      setTimeout(() => setIsScrolling(false), 800);
    }
  }, []);

  // ============== CHAT HANDLERS ==============
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatLoading(true);

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      const modelName = model?.name || 'this model';
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Thanks for your message! I'm ${modelName}. This is a demo response. In production, this would connect to the actual API endpoint to process: "${userMessage}"` 
      }]);
      setChatLoading(false);
    }, 1500);
  };

  // ============== COMPARE HANDLERS ==============
  const handleAddToCompare = () => {
    if (!model) return;
    
    const modelId = model.id;
    let newList: string[];
    
    if (compareList.includes(modelId)) {
      // Remove from compare
      newList = compareList.filter(id => id !== modelId);
    } else {
      // Add to compare (max 4 models)
      if (compareList.length >= 4) {
        setShowCompareToast(true);
        setTimeout(() => setShowCompareToast(false), 3000);
        return;
      }
      newList = [...compareList, modelId];
    }
    
    setCompareList(newList);
    localStorage.setItem('compareModels', JSON.stringify(newList));
    setShowCompareToast(true);
    setTimeout(() => setShowCompareToast(false), 2000);
  };

  const handleGoToCompare = () => {
    if (compareList.length >= 2) {
      navigate(`/models/compare?ids=${compareList.join(',')}`);
    }
  };

  const isInCompareList = model ? compareList.includes(model.id) : false;

  // ============== EFFECTS ==============
  useEffect(() => {
    if (id) {
      loadModelDetails();
    }
  }, [id]);

  // ============== API CALLS ==============
  const loadModelDetails = async () => {
    try {
      setLoading(true);
      const models = await ModelsService.getModels();
      const foundModel = models.find(m => m.id === id);
      if (foundModel) {
        setModel(foundModel);
        
        // Fetch all detail data in parallel for better performance
        const [
          providersData,
          providerStatsData,
          performanceMetrics,
          benchmarksData,
          activityHistory,
          parametersData
        ] = await Promise.all([
          ModelsService.getModelProviders(id!),
          ModelDetailService.getProviderStats(id!),
          ModelDetailService.getPerformanceData(id!),
          ModelDetailService.getBenchmarks(id!),
          ModelDetailService.getActivityHistory(id!),
          ModelDetailService.getParameters(id!)
        ]);
        
        setProviders(providersData);
        setProviderStats(providerStatsData);
        setPerformanceData(performanceMetrics);
        setBenchmarkScores(benchmarksData);
        setActivityData(activityHistory);
        setParameters(parametersData);
      } else {
        setError('Model not found');
      }
    } catch (err) {
      setError('Failed to load model details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ============== HANDLERS ==============
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  // ============== LOADING STATE ==============
  if (loading) {
    return (
      <div className="model-detail-page dark-theme">
        <Navbar />
        <div className="detail-container">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading model details...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // ============== ERROR STATE ==============
  if (error || !model) {
    return (
      <div className="model-detail-page dark-theme">
        <Navbar />
        <div className="detail-container">
          <div className="error-state">
            <span className="error-icon">⚠️</span>
            <h2>Model not found</h2>
            <p>{error || 'The model you are looking for does not exist.'}</p>
            <Link to="/models" className="back-btn">← Back to Models</Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const modelSlug = model.slug || `${model.company_name.toLowerCase()}/${model.name.toLowerCase().replace(/\s+/g, '-')}`;

  // ============== MAIN RENDER ==============
  return (
    <div className="model-detail-page dark-theme">
      {/* Navbar with scroll hide/show */}
      <div className={`navbar-wrapper ${navbarVisible ? 'visible' : 'hidden'}`}>
        <Navbar />
      </div>
      
      <div className="detail-container">
        
        {/* ========== HEADER SECTION (Like OpenRouter) ========== */}
        <div className="model-header-section">
          <div className="header-top">
            <div className="header-left">
              <h1 className="model-main-title">
                {model.company_name}: {model.name}
              </h1>
              <div className="model-slug-row">
                <code className="model-slug">{modelSlug}</code>
                <button 
                  className="copy-icon-btn"
                  onClick={() => handleCopy(modelSlug, 'slug')}
                  title="Copy model ID"
                >
                  {copied === 'slug' ? '✓' : '📋'}
                </button>
              </div>
              
              {/* Meta info row */}
              <div className="model-meta-row">
                <span className="meta-item">
                  <span className="meta-label">Released</span>
                  <span className="meta-value">{model.release_date || 'Mar 5, 2026'}</span>
                </span>
                <span className="meta-divider">|</span>
                <span className="meta-item">
                  <span className="meta-value">{formatNumber(model.context_window)} context</span>
                </span>
                <span className="meta-divider">|</span>
                <span className="meta-item">
                  <span className="meta-value">${providerStats[0]?.inputPrice || 30}/M input tokens</span>
                </span>
                <span className="meta-divider">|</span>
                <span className="meta-item">
                  <span className="meta-value">${providerStats[0]?.outputPrice || 180}/M output tokens</span>
                </span>
              </div>
            </div>
            
            <div className="header-right">
              <button className="chat-btn" onClick={() => setChatOpen(true)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                Chat
              </button>
              <button 
                className={`compare-btn-header ${isInCompareList ? 'active' : ''}`}
                onClick={handleAddToCompare}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7"/>
                  <rect x="14" y="3" width="7" height="7"/>
                  <rect x="14" y="14" width="7" height="7"/>
                  <rect x="3" y="14" width="7" height="7"/>
                </svg>
                {isInCompareList ? 'Added ✓' : 'Compare'}
              </button>
              {compareList.length >= 2 && (
                <button className="go-compare-btn" onClick={handleGoToCompare}>
                  Compare ({compareList.length})
                </button>
              )}
            </div>
          </div>
          
          {/* Description */}
          <div className="model-description-section">
            <p className="model-full-description">
              {model.description || `${model.name} is ${model.company_name}'s most advanced model, building on ${model.name}'s unified architecture with enhanced reasoning capabilities for complex, high-stakes tasks. It features a ${formatNumber(model.context_window)}+ token context window (${formatNumber(model.context_window - 100000)} input, ${formatNumber(model.max_tokens)} output) with support for text and image inputs. Optimized for step-by-step reasoning, instruction following, and accuracy, ${model.name} excels at agentic coding, long-context workflows, and multi-step problem solving.`}
            </p>
            <button className="expand-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>
          </div>
        </div>

        {/* ========== TAB NAVIGATION (Sticky) ========== */}
        <div className="tab-navigation sticky">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => handleTabClick(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ========== ALL SECTIONS (Scroll-based) ========== */}
        <div className="sections-container" ref={containerRef}>
          
          {/* ---------- OVERVIEW SECTION ---------- */}
          <div 
            className="section-panel" 
            data-section="overview"
            ref={(el) => { sectionRefs.current['overview'] = el; }}
          >
            <ProvidersSection 
              providers={providerStats} 
              modelName={model.name}
            />
          </div>

          {/* ---------- PROVIDERS SECTION ---------- */}
          <div 
            className="section-panel"
            data-section="providers"
            ref={(el) => { sectionRefs.current['providers'] = el; }}
          >
            <div className="providers-full-section">
              <h2>Providers for {model.name}</h2>
              <p className="section-desc">
                OpenRouter <a href="#">routes requests</a> to the best providers that are able to handle your prompt size and parameters, with fallbacks to maximize <a href="#">uptime</a>.
              </p>
              
              <div className="providers-table">
                <div className="provider-row header">
                  <div className="provider-info-col">Provider</div>
                  <div className="provider-stat-col">Latency</div>
                  <div className="provider-stat-col">Throughput</div>
                  <div className="provider-stat-col">Uptime</div>
                </div>
                
                {providerStats.map((provider, idx) => (
                  <div key={idx} className="provider-row">
                    <div className="provider-info-col">
                      <div className="provider-name-cell">
                        <strong>{provider.name}</strong>
                        <div className="provider-badges">
                          <span className="provider-badge">{provider.region}</span>
                        </div>
                      </div>
                    </div>
                    <div className="provider-stat-col">
                      <span className="stat-main">{provider.latency}s</span>
                    </div>
                    <div className="provider-stat-col">
                      <span className="stat-main">{provider.throughput}tps</span>
                    </div>
                    <div className="provider-stat-col">
                      <div className="uptime-bars">
                        <span className="uptime-bar active"></span>
                        <span className="uptime-bar active"></span>
                        <span className="uptime-bar active"></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Provider Details Table */}
              <div className="provider-details-table">
                <div className="detail-grid">
                  <div className="detail-cell">
                    <span className="detail-label">Total Context</span>
                    <span className="detail-value">{providerStats[0]?.totalContext}</span>
                  </div>
                  <div className="detail-cell">
                    <span className="detail-label">Max Output</span>
                    <span className="detail-value">{providerStats[0]?.maxOutput}</span>
                  </div>
                  <div className="detail-cell">
                    <span className="detail-label">Input Price</span>
                    <div className="price-tiers">
                      <span>≤272K <strong>${providerStats[0]?.inputPrice}</strong></span>
                      <span>&gt;272K <strong>${providerStats[0]?.inputPriceHigh}</strong></span>
                    </div>
                  </div>
                  <div className="detail-cell">
                    <span className="detail-label">Output Price</span>
                    <div className="price-tiers">
                      <span>≤272K <strong>${providerStats[0]?.outputPrice}</strong></span>
                      <span>&gt;272K <strong>${providerStats[0]?.outputPriceHigh}</strong></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ---------- PERFORMANCE SECTION ---------- */}
          <div 
            className="section-panel"
            data-section="performance"
            ref={(el) => { sectionRefs.current['performance'] = el; }}
          >
            <div className="performance-section">
              <div className="performance-header">
                <h2>Performance for {model.name}</h2>
                <p>Compare different providers across OpenRouter</p>
                <select className="location-select">
                  <option>All locations</option>
                  <option>US East</option>
                  <option>US West</option>
                  <option>Europe</option>
                  <option>Asia</option>
                </select>
              </div>
              
              <div className="metrics-grid">
                <MetricChart 
                  title="Throughput" 
                  data={throughputData} 
                  unit="tok/s" 
                  average={7}
                  color="#6366f1"
                />
                <MetricChart 
                  title="Latency" 
                  data={latencyData} 
                  unit="s" 
                  average={109.5}
                  color="#6366f1"
                />
                <MetricChart 
                  title="E2E Latency" 
                  data={latencyData.map(d => ({ ...d, value: d.value * 2.1 }))} 
                  unit="s" 
                  average={234.24}
                  color="#6366f1"
                />
                <MetricChart 
                  title="Tool Call Error Rate" 
                  data={throughputData.map(d => ({ ...d, value: d.value * 0.03 }))} 
                  unit="%" 
                  average={0.21}
                  color="#ef4444"
                />
              </div>
            </div>
          </div>

          {/* ---------- PRICING SECTION ---------- */}
          <div 
            className="section-panel"
            data-section="pricing"
            ref={(el) => { sectionRefs.current['pricing'] = el; }}
          >
            <div className="pricing-section">
              <h2>Effective Pricing for {model.name}</h2>
              <p className="section-desc">Actual cost per million tokens across providers over the past hour</p>
              
              <div className="weighted-avg-section">
                <h3 className="subsection-title">Weighted Average <span className="info-icon">ⓘ</span></h3>
                <div className="weighted-cards">
                  <div className="weighted-card">
                    <span className="weighted-label">Weighted Avg Input Price</span>
                    <span className="weighted-value">${providerStats[0]?.inputPrice}.44</span>
                    <span className="weighted-unit">per 1M tokens</span>
                  </div>
                  <div className="weighted-card">
                    <span className="weighted-label">Weighted Avg Output Price</span>
                    <span className="weighted-value">${providerStats[0]?.outputPrice}.59</span>
                    <span className="weighted-unit">per 1M tokens</span>
                  </div>
                </div>
              </div>
              
              <div className="pricing-providers-table">
                <div className="pricing-row header">
                  <div className="pricing-col">Provider</div>
                  <div className="pricing-col">Input $/1M</div>
                  <div className="pricing-col">Output $/1M</div>
                  <div className="pricing-col">Cache Hit Rate</div>
                </div>
                {providerStats.map((p, idx) => (
                  <div key={idx} className="pricing-row">
                    <div className="pricing-col">
                      <span className="provider-dot"></span>
                      {p.name}
                    </div>
                    <div className="pricing-col">${p.inputPrice}.44</div>
                    <div className="pricing-col">${p.outputPrice}.59</div>
                    <div className="pricing-col">0.0%</div>
                  </div>
                ))}
              </div>
              
              <div className="pricing-charts">
                <div className="pricing-chart-card">
                  <h4>Input Price / 1M tokens (7 days)</h4>
                  <SimpleLineChart data={throughputData.map(d => ({ ...d, value: 30 + Math.random() * 5 }))} />
                </div>
                <div className="pricing-chart-card">
                  <h4>Output Price / 1M tokens (7 days)</h4>
                  <SimpleLineChart data={throughputData.map(d => ({ ...d, value: 180 + Math.random() * 10 }))} />
                </div>
              </div>
            </div>
          </div>

          {/* ---------- BENCHMARKS SECTION (Enhanced) ---------- */}
          <div 
            className="section-panel"
            data-section="benchmarks"
            ref={(el) => { sectionRefs.current['benchmarks'] = el; }}
          >
            <div className="benchmarks-section-enhanced">
              <div className="benchmarks-header">
                <div>
                  <h2>Benchmarks for {model.name}</h2>
                  <p className="section-desc">Performance across standardized evaluation metrics</p>
                </div>
                <div className="benchmark-summary">
                  <div className="summary-badge excellent">
                    <span className="badge-value">{Object.values(benchmarkScores).filter(s => s >= 90).length}</span>
                    <span className="badge-label">Excellent</span>
                  </div>
                  <div className="summary-badge good">
                    <span className="badge-value">{Object.values(benchmarkScores).filter(s => s >= 80 && s < 90).length}</span>
                    <span className="badge-label">Very Good</span>
                  </div>
                </div>
              </div>
              
              {/* Radar Chart Preview */}
              <div className="benchmark-visual-row">
                <div className="radar-chart-container">
                  <RadarChart scores={benchmarkScores} />
                </div>
                
                <div className="benchmarks-chart-enhanced">
                  {Object.entries(benchmarkScores).map(([name, score], idx) => (
                    <AnimatedBenchmarkBar 
                      key={name}
                      name={name}
                      score={score}
                      index={idx}
                      description={getBenchmarkDescription(name)}
                      category={getBenchmarkCategory(name)}
                    />
                  ))}
                </div>
              </div>

              {/* Benchmark Categories */}
              <div className="benchmark-categories">
                <h3>Benchmark Categories</h3>
                <div className="category-grid">
                  <div className="category-card">
                    <div className="category-icon">🧠</div>
                    <h4>Reasoning</h4>
                    <p>GPQA, MATH - Complex problem solving and logical reasoning</p>
                    <div className="category-score">
                      <span>Avg Score</span>
                      <strong>{((benchmarkScores['GPQA'] || 0) + (benchmarkScores['MATH'] || 0)) / 2}%</strong>
                    </div>
                  </div>
                  <div className="category-card">
                    <div className="category-icon">📚</div>
                    <h4>Knowledge</h4>
                    <p>MMLU - Multitask understanding across 57 subjects</p>
                    <div className="category-score">
                      <span>Score</span>
                      <strong>{benchmarkScores['MMLU'] || 0}%</strong>
                    </div>
                  </div>
                  <div className="category-card">
                    <div className="category-icon">💻</div>
                    <h4>Coding</h4>
                    <p>HumanEval - Code generation and function completion</p>
                    <div className="category-score">
                      <span>Score</span>
                      <strong>{benchmarkScores['HumanEval'] || 0}%</strong>
                    </div>
                  </div>
                  <div className="category-card">
                    <div className="category-icon">🌍</div>
                    <h4>Multilingual</h4>
                    <p>MGSM - Multilingual grade school math</p>
                    <div className="category-score">
                      <span>Score</span>
                      <strong>{benchmarkScores['MGSM'] || 0}%</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Model Capabilities */}
              <div className="model-capabilities">
                <h3>Model Capabilities</h3>
                <div className="capabilities-grid">
                  <CapabilityCard 
                    icon="📝" 
                    title="Text Generation" 
                    level={95} 
                    description="Advanced text completion and creative writing"
                  />
                  <CapabilityCard 
                    icon="🔍" 
                    title="Analysis" 
                    level={92} 
                    description="Deep understanding and insight extraction"
                  />
                  <CapabilityCard 
                    icon="💻" 
                    title="Code" 
                    level={90} 
                    description="Programming assistance and code generation"
                  />
                  <CapabilityCard 
                    icon="🎯" 
                    title="Instruction Following" 
                    level={94} 
                    description="Precise task execution and direction adherence"
                  />
                  <CapabilityCard 
                    icon="🖼️" 
                    title="Vision" 
                    level={88} 
                    description="Image understanding and description"
                  />
                  <CapabilityCard 
                    icon="🧮" 
                    title="Math & Reasoning" 
                    level={85} 
                    description="Complex calculations and logical deduction"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ---------- ACTIVITY SECTION ---------- */}
          <div 
            className="section-panel"
            data-section="activity"
            ref={(el) => { sectionRefs.current['activity'] = el; }}
          >
            <div className="activity-section">
              <h2>Activity for {model.name}</h2>
              <p className="section-desc">Request volume over time</p>
              
              <div className="activity-stats">
                <div className="activity-stat-card">
                  <span className="activity-label">Total Requests (24h)</span>
                  <span className="activity-value">1.2M</span>
                </div>
                <div className="activity-stat-card">
                  <span className="activity-label">Active Users (24h)</span>
                  <span className="activity-value">45.2K</span>
                </div>
                <div className="activity-stat-card">
                  <span className="activity-label">Avg Tokens/Request</span>
                  <span className="activity-value">2,847</span>
                </div>
              </div>
              
              <div className="activity-table">
                <div className="activity-row header">
                  <span>Date</span>
                  <span>Requests</span>
                  <span>Change</span>
                </div>
                {activityData.map((item, idx) => (
                  <div key={idx} className="activity-row">
                    <span>{item.date}</span>
                    <span>{formatNumber(item.requests)}</span>
                    <span className={idx > 0 ? (item.requests > activityData[idx-1].requests ? 'positive' : 'negative') : ''}>
                      {idx > 0 ? `${((item.requests - activityData[idx-1].requests) / activityData[idx-1].requests * 100).toFixed(1)}%` : '-'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ---------- QUICKSTART SECTION ---------- */}
          <div 
            className="section-panel"
            data-section="quickstart"
            ref={(el) => { sectionRefs.current['quickstart'] = el; }}
          >
            <QuickstartSection model={model} onCopy={handleCopy} copied={copied} />
          </div>

        </div>
      </div>

      {/* ========== CHAT PANEL (Slide-in) ========== */}
      <div className={`chat-panel ${chatOpen ? 'open' : ''}`}>
        <div className="chat-panel-header">
          <h3>Chat with {model.name}</h3>
          <button className="close-chat-btn" onClick={() => setChatOpen(false)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        
        <div className="chat-messages">
          {chatMessages.length === 0 && (
            <div className="chat-empty">
              <div className="chat-empty-icon">💬</div>
              <p>Start a conversation with {model.name}</p>
              <span>Ask questions, get help with code, or explore capabilities</span>
            </div>
          )}
          {chatMessages.map((msg, idx) => (
            <div key={idx} className={`chat-message ${msg.role}`}>
              <div className="message-avatar">
                {msg.role === 'user' ? '👤' : '🤖'}
              </div>
              <div className="message-content">{msg.content}</div>
            </div>
          ))}
          {chatLoading && (
            <div className="chat-message assistant">
              <div className="message-avatar">🤖</div>
              <div className="message-content typing">
                <span></span><span></span><span></span>
              </div>
            </div>
          )}
        </div>
        
        <form className="chat-input-form" onSubmit={handleChatSubmit}>
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder={`Message ${model.name}...`}
            disabled={chatLoading}
          />
          <button type="submit" disabled={chatLoading || !chatInput.trim()}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
            </svg>
          </button>
        </form>
      </div>
      
      {/* Chat panel backdrop */}
      {chatOpen && <div className="chat-backdrop" onClick={() => setChatOpen(false)} />}

      {/* ========== COMPARE TOAST ========== */}
      <div className={`compare-toast ${showCompareToast ? 'show' : ''}`}>
        {compareList.length >= 4 ? (
          <span>Maximum 4 models can be compared</span>
        ) : isInCompareList ? (
          <span>✓ Added to compare ({compareList.length}/4)</span>
        ) : (
          <span>Removed from compare</span>
        )}
      </div>

      <Footer />
    </div>
  );
};

// ============== PROVIDERS SECTION COMPONENT ==============
const ProvidersSection: React.FC<{ providers: ProviderStats[]; modelName: string }> = ({ providers, modelName }) => (
  <div className="providers-overview">
    <h2>Providers for {modelName}</h2>
    <p className="section-desc">
      OpenRouter <a href="#">routes requests</a> to the best providers that are able to handle your prompt size and parameters, with fallbacks to maximize <a href="#">uptime</a>. <span className="info-icon">ⓘ</span>
    </p>
    
    <div className="providers-table">
      <div className="provider-row header">
        <div className="provider-info-col"></div>
        <div className="provider-stat-col">Latency</div>
        <div className="provider-stat-col">Throughput</div>
        <div className="provider-stat-col">Uptime</div>
      </div>
      
      {providers.map((provider, idx) => (
        <div key={idx} className="provider-row">
          <div className="provider-info-col">
            <strong>{provider.name}</strong>
            <div className="provider-badges">
              <span className="provider-badge region">{provider.region}</span>
              <span className="provider-badge feature">⏱</span>
              <span className="provider-badge feature">📄</span>
              <span className="provider-badge feature">⚙️</span>
            </div>
          </div>
          <div className="provider-stat-col">
            <span className="stat-value">{provider.latency}s</span>
          </div>
          <div className="provider-stat-col">
            <span className="stat-value">{provider.throughput}tps</span>
          </div>
          <div className="provider-stat-col">
            <div className="uptime-indicator">
              <span className="uptime-bar green"></span>
              <span className="uptime-bar green"></span>
              <span className="uptime-bar green"></span>
            </div>
          </div>
        </div>
      ))}
    </div>
    
    {/* Provider Details */}
    <div className="provider-details-grid">
      <div className="detail-item">
        <span className="detail-label">Total Context</span>
        <span className="detail-value">{providers[0]?.totalContext}</span>
      </div>
      <div className="detail-item">
        <span className="detail-label">Max Output</span>
        <span className="detail-value">{providers[0]?.maxOutput}</span>
      </div>
      <div className="detail-item">
        <span className="detail-label">Input Price</span>
        <div className="price-breakdown">
          <span>≤272K <strong>${providers[0]?.inputPrice}</strong></span>
          <span>&gt;272K <strong>${providers[0]?.inputPriceHigh}</strong></span>
        </div>
      </div>
      <div className="detail-item">
        <span className="detail-label">Output Price</span>
        <div className="price-breakdown">
          <span>≤272K <strong>${providers[0]?.outputPrice}</strong></span>
          <span>&gt;272K <strong>${providers[0]?.outputPriceHigh}</strong></span>
        </div>
      </div>
    </div>
  </div>
);

// ============== METRIC CHART COMPONENT (Enhanced with Animations) ==============
const MetricChart: React.FC<{
  title: string;
  data: PerformancePoint[];
  unit: string;
  average: number;
  color: string;
}> = ({ title, data, unit, average, color }) => {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  // Intersection observer for animation on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );
    
    if (chartRef.current) {
      observer.observe(chartRef.current);
    }
    
    return () => observer.disconnect();
  }, []);

  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue || 1;
  
  const points = data.map((d, i) => {
    const x = 10 + (i / (data.length - 1)) * 80;
    const y = 85 - ((d.value - minValue) / range) * 70;
    return { x, y, value: d.value, date: d.date };
  });

  const pathD = points.map((p, i) => 
    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
  ).join(' ');

  const areaD = `${pathD} L ${points[points.length - 1].x} 85 L ${points[0].x} 85 Z`;
  
  // Calculate path length for animation
  const pathLength = 500;

  return (
    <div className="metric-card enhanced" ref={chartRef}>
      <div className="metric-header">
        <div className="metric-title-row">
          <h4>{title}</h4>
          <span className="metric-info-icon" title={`Average ${title.toLowerCase()} over the past 7 days`}>ⓘ</span>
        </div>
        <div className="metric-actions">
          <select className="time-range-select">
            <option>7d</option>
            <option>24h</option>
            <option>30d</option>
          </select>
          <button className="expand-chart-btn" title="Expand chart">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
            </svg>
          </button>
        </div>
      </div>
      
      <div className="metric-chart-container">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="metric-svg">
          {/* Gradient definition */}
          <defs>
            <linearGradient id={`gradient-${title}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
              <stop offset="100%" stopColor={color} stopOpacity="0"/>
            </linearGradient>
          </defs>
          
          {/* Grid lines */}
          <g className="grid-lines">
            {[25, 50, 75].map(y => (
              <line key={y} x1="10" y1={y} x2="90" y2={y} stroke="var(--border-color)" strokeWidth="0.3" strokeDasharray="2,2"/>
            ))}
          </g>
          
          {/* Area fill */}
          <path 
            d={areaD}
            fill={`url(#gradient-${title})`}
            className={`chart-area ${isVisible ? 'animate' : ''}`}
          />
          
          {/* Line */}
          <path 
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`chart-line ${isVisible ? 'animate' : ''}`}
            style={{ 
              strokeDasharray: pathLength,
              strokeDashoffset: isVisible ? 0 : pathLength
            }}
          />
          
          {/* Data points */}
          {points.map((point, idx) => (
            <g key={idx}>
              <circle 
                cx={point.x} 
                cy={point.y} 
                r={hoveredPoint === idx ? 4 : 2.5}
                fill={color}
                className="data-point"
                onMouseEnter={() => setHoveredPoint(idx)}
                onMouseLeave={() => setHoveredPoint(null)}
                style={{ 
                  opacity: isVisible ? 1 : 0,
                  transition: `opacity 0.3s ${idx * 0.1}s, r 0.2s`
                }}
              />
              {/* Hover ring */}
              {hoveredPoint === idx && (
                <circle 
                  cx={point.x} 
                  cy={point.y} 
                  r="8"
                  fill="none"
                  stroke={color}
                  strokeWidth="1"
                  opacity="0.3"
                  className="hover-ring"
                />
              )}
            </g>
          ))}
        </svg>
        
        {/* Tooltip */}
        {hoveredPoint !== null && (
          <div 
            className="chart-tooltip"
            style={{
              left: `${points[hoveredPoint].x}%`,
              top: `${points[hoveredPoint].y - 15}%`
            }}
          >
            <span className="tooltip-value">{points[hoveredPoint].value.toFixed(2)} {unit}</span>
            <span className="tooltip-date">{points[hoveredPoint].date}</span>
          </div>
        )}
      </div>
      
      <div className="metric-footer">
        <div className="metric-legend">
          <span className="legend-dot pulse" style={{ background: color }}></span>
          <span>OpenAI</span>
        </div>
        <div className="metric-stats">
          <div className="stat-item">
            <span className="stat-label">Avg</span>
            <strong style={{ color }}>{average} {unit}</strong>
          </div>
          <div className="stat-item">
            <span className="stat-label">Max</span>
            <strong>{maxValue.toFixed(1)} {unit}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============== ANIMATED BENCHMARK BAR COMPONENT ==============
const AnimatedBenchmarkBar: React.FC<{
  name: string;
  score: number;
  index: number;
  description?: string;
  category?: string;
}> = ({ name, score, index, description, category }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Stagger animation based on index
          setTimeout(() => setIsVisible(true), index * 150);
        }
      },
      { threshold: 0.2 }
    );
    
    if (barRef.current) {
      observer.observe(barRef.current);
    }
    
    return () => observer.disconnect();
  }, [index]);

  const getScoreColor = (score: number) => {
    if (score >= 90) return '#22c55e';
    if (score >= 80) return '#6366f1';
    if (score >= 70) return '#f59e0b';
    return '#ef4444';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Very Good';
    if (score >= 70) return 'Good';
    return 'Average';
  };

  return (
    <div 
      className={`benchmark-item-enhanced ${isVisible ? 'visible' : ''}`}
      ref={barRef}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="benchmark-header">
        <div className="benchmark-name-row">
          <span className="benchmark-name">{name}</span>
          {category && <span className="benchmark-category">{category}</span>}
        </div>
        <div className="benchmark-score-row">
          <span className="benchmark-score" style={{ color: getScoreColor(score) }}>
            {isVisible ? score.toFixed(1) : '0.0'}%
          </span>
          <span className="score-label" style={{ color: getScoreColor(score) }}>
            {getScoreLabel(score)}
          </span>
        </div>
      </div>
      
      <div className="benchmark-bar-track">
        <div 
          className="benchmark-bar-fill-enhanced"
          style={{ 
            width: isVisible ? `${score}%` : '0%',
            background: `linear-gradient(90deg, ${getScoreColor(score)}, ${getScoreColor(score)}99)`
          }}
        >
          <div className="bar-shimmer"></div>
        </div>
        {/* Milestone markers */}
        <div className="bar-markers">
          <span className="marker" style={{ left: '25%' }}></span>
          <span className="marker" style={{ left: '50%' }}></span>
          <span className="marker" style={{ left: '75%' }}></span>
        </div>
      </div>
      
      {/* Tooltip */}
      {showTooltip && description && (
        <div className="benchmark-tooltip">
          <strong>{name}</strong>
          <p>{description}</p>
        </div>
      )}
    </div>
  );
};

// ============== SIMPLE LINE CHART (Enhanced) ==============
const SimpleLineChart: React.FC<{ data: PerformancePoint[]; color?: string }> = ({ data, color = '#6366f1' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.3 }
    );
    if (chartRef.current) observer.observe(chartRef.current);
    return () => observer.disconnect();
  }, []);

  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue || 1;
  
  const points = data.map((d, i) => {
    const x = 5 + (i / (data.length - 1)) * 90;
    const y = 90 - ((d.value - minValue) / range) * 80;
    return { x, y };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L ${points[points.length - 1].x} 95 L ${points[0].x} 95 Z`;

  return (
    <div className="simple-chart-enhanced" ref={chartRef}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="simpleGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.2"/>
            <stop offset="100%" stopColor={color} stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#simpleGradient)" className={isVisible ? 'animate-area' : ''} />
        <path 
          d={pathD} 
          fill="none" 
          stroke={color} 
          strokeWidth="2"
          strokeLinecap="round"
          className={`simple-line ${isVisible ? 'animate' : ''}`}
        />
      </svg>
    </div>
  );
};

// ============== QUICKSTART SECTION ==============
const QuickstartSection: React.FC<{
  model: Model;
  onCopy: (text: string, id: string) => void;
  copied: string | null;
}> = ({ model, onCopy, copied }) => {
  const [language, setLanguage] = useState('python');
  const modelSlug = model.slug || `${model.company_name.toLowerCase()}/${model.name.toLowerCase().replace(/\s+/g, '-')}`;

  const codeExamples: Record<string, string> = {
    python: `from openai import OpenAI

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key="<OPENROUTER_API_KEY>",
)

completion = client.chat.completions.create(
    extra_headers={
        "HTTP-Referer": "<YOUR_SITE_URL>",  # Optional
        "X-Title": "<YOUR_SITE_NAME>",      # Optional
    },
    extra_body={},
    model="${modelSlug}",
    messages=[
        {
            "role": "user",
            "content": "What is the meaning of life?"
        }
    ]
)

print(completion.choices[0].message.content)`,

    typescript: `import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: "<OPENROUTER_API_KEY>",
});

async function main() {
  const completion = await openai.chat.completions.create({
    model: "${modelSlug}",
    messages: [
      {
        role: "user",
        content: "What is the meaning of life?",
      },
    ],
  });

  console.log(completion.choices[0].message.content);
}

main();`,

    curl: `curl https://openrouter.ai/api/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <OPENROUTER_API_KEY>" \\
  -d '{
    "model": "${modelSlug}",
    "messages": [
      {
        "role": "user",
        "content": "What is the meaning of life?"
      }
    ]
  }'`,
  };

  return (
    <div className="quickstart-section">
      <h2>Quickstart for {model.name}</h2>
      <p className="section-desc">Get started with {model.name} using the OpenAI SDK</p>
      
      <div className="code-example">
        <div className="code-header">
          <div className="code-tabs">
            {Object.keys(codeExamples).map((lang) => (
              <button
                key={lang}
                className={`code-tab ${language === lang ? 'active' : ''}`}
                onClick={() => setLanguage(lang)}
              >
                {lang === 'curl' ? 'cURL' : lang.charAt(0).toUpperCase() + lang.slice(1)}
              </button>
            ))}
          </div>
          <button 
            className="copy-code-btn"
            onClick={() => onCopy(codeExamples[language], 'code')}
          >
            {copied === 'code' ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <div className="code-body">
          <pre className="code-block">
            <code>{codeExamples[language]}</code>
          </pre>
        </div>
      </div>
      
      <div className="api-reference">
        <h3>API Reference</h3>
        <div className="api-details">
          <div className="api-row">
            <span className="api-label">Endpoint</span>
            <code>https://openrouter.ai/api/v1/chat/completions</code>
          </div>
          <div className="api-row">
            <span className="api-label">Model ID</span>
            <code>{modelSlug}</code>
          </div>
          <div className="api-row">
            <span className="api-label">Authentication</span>
            <code>Bearer &lt;OPENROUTER_API_KEY&gt;</code>
          </div>
        </div>
      </div>
      
      <div className="supported-params">
        <h3>Supported Parameters</h3>
        <div className="params-grid">
          <div className="param-card">
            <code>temperature</code>
            <span>0 - 2 (default: 1)</span>
          </div>
          <div className="param-card">
            <code>max_tokens</code>
            <span>1 - 128,000</span>
          </div>
          <div className="param-card">
            <code>top_p</code>
            <span>0 - 1 (default: 1)</span>
          </div>
          <div className="param-card">
            <code>frequency_penalty</code>
            <span>-2 - 2 (default: 0)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============== RADAR CHART COMPONENT ==============
const RadarChart: React.FC<{ scores: Record<string, number> }> = ({ scores }) => {
  const [isVisible, setIsVisible] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.3 }
    );
    if (chartRef.current) observer.observe(chartRef.current);
    return () => observer.disconnect();
  }, []);

  const entries = Object.entries(scores);
  const numPoints = entries.length;
  const angleStep = (2 * Math.PI) / numPoints;
  const centerX = 50;
  const centerY = 50;
  const maxRadius = 35;

  // Generate polygon points
  const points = entries.map(([, score], i) => {
    const angle = i * angleStep - Math.PI / 2;
    const radius = (score / 100) * maxRadius;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    return { x, y, score };
  });

  const polygonPoints = points.map(p => `${p.x},${p.y}`).join(' ');

  // Generate label positions
  const labels = entries.map(([name], i) => {
    const angle = i * angleStep - Math.PI / 2;
    const radius = maxRadius + 10;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    return { name, x, y };
  });

  return (
    <div className="radar-chart" ref={chartRef}>
      <svg viewBox="0 0 100 100">
        {/* Background circles */}
        {[25, 50, 75, 100].map(pct => (
          <circle 
            key={pct}
            cx={centerX} 
            cy={centerY} 
            r={(pct / 100) * maxRadius}
            fill="none"
            stroke="var(--border-color)"
            strokeWidth="0.5"
            strokeDasharray="2,2"
          />
        ))}
        
        {/* Axis lines */}
        {entries.map((_, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const x2 = centerX + maxRadius * Math.cos(angle);
          const y2 = centerY + maxRadius * Math.sin(angle);
          return (
            <line 
              key={i}
              x1={centerX} 
              y1={centerY} 
              x2={x2} 
              y2={y2}
              stroke="var(--border-color)"
              strokeWidth="0.5"
            />
          );
        })}
        
        {/* Data polygon */}
        <polygon 
          points={polygonPoints}
          fill="var(--accent-color)"
          fillOpacity={isVisible ? 0.3 : 0}
          stroke="var(--accent-color)"
          strokeWidth="2"
          className={`radar-polygon ${isVisible ? 'animate' : ''}`}
        />
        
        {/* Data points */}
        {points.map((point, i) => (
          <circle 
            key={i}
            cx={point.x} 
            cy={point.y} 
            r="3"
            fill="var(--accent-color)"
            className="radar-point"
            style={{ 
              opacity: isVisible ? 1 : 0,
              transition: `opacity 0.3s ${i * 0.1}s`
            }}
          />
        ))}
        
        {/* Labels */}
        {labels.map((label, i) => (
          <text 
            key={i}
            x={label.x} 
            y={label.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="var(--text-secondary)"
            fontSize="4"
            fontWeight="500"
          >
            {label.name}
          </text>
        ))}
      </svg>
    </div>
  );
};

// ============== CAPABILITY CARD COMPONENT ==============
const CapabilityCard: React.FC<{
  icon: string;
  title: string;
  level: number;
  description: string;
}> = ({ icon, title, level, description }) => {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.3 }
    );
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={`capability-card ${isVisible ? 'visible' : ''}`} ref={cardRef}>
      <div className="capability-icon">{icon}</div>
      <div className="capability-content">
        <h4>{title}</h4>
        <p>{description}</p>
        <div className="capability-level">
          <div className="level-track">
            <div 
              className="level-fill" 
              style={{ width: isVisible ? `${level}%` : '0%' }}
            />
          </div>
          <span className="level-value">{level}%</span>
        </div>
      </div>
    </div>
  );
};

// ============== HELPER FUNCTIONS ==============
const getBenchmarkDescription = (name: string): string => {
  const descriptions: Record<string, string> = {
    'MMLU': 'Massive Multitask Language Understanding - Tests knowledge across 57 subjects including STEM, humanities, and social sciences',
    'GPQA': 'Graduate-level science questions requiring expert knowledge in physics, chemistry, and biology',
    'MATH': 'Competition mathematics problems from AMC, AIME, and Olympiad competitions',
    'HumanEval': 'Code generation benchmark with function completion tasks in Python',
    'MGSM': 'Multilingual Grade School Math - Tests mathematical reasoning in multiple languages',
  };
  return descriptions[name] || 'Standardized benchmark for evaluating model performance';
};

const getBenchmarkCategory = (name: string): string => {
  const categories: Record<string, string> = {
    'MMLU': 'Knowledge',
    'GPQA': 'Reasoning',
    'MATH': 'Reasoning',
    'HumanEval': 'Coding',
    'MGSM': 'Multilingual',
  };
  return categories[name] || 'General';
};

export default ModelDetailPage;
