import React, { useState, useEffect, useMemo } from 'react';
import { ModelsService } from '../services/modelsService';
import type { Model } from '../services/modelsService';
import Navbar from '../components/Navbar';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import '../styles/Models.css';

type SortOption = 'name' | 'context' | 'speed' | 'newest' | 'popular';
type ContextFilter = 'all' | '8k' | '32k' | '100k' | '200k';

// Model categories
const CATEGORIES = [
  { id: 'all', name: 'All Models', icon: '🤖' },
  { id: 'chat', name: 'Chat', icon: '💬' },
  { id: 'completion', name: 'Completion', icon: '📝' },
  { id: 'image', name: 'Image Generation', icon: '🎨' },
  { id: 'code', name: 'Code', icon: '💻' },
  { id: 'embedding', name: 'Embedding', icon: '🔢' },
];

// Get unique providers from models
const getProviders = (models: Model[]) => {
  const providers = [...new Set(models.map(m => m.company_name))];
  return providers.sort();
};

const ModelsPage: React.FC = () => {
  const [models, setModels] = useState<Model[]>([]);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [contextFilter, setContextFilter] = useState<ContextFilter>('all');
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);
  
  // Compare Feature
  const [compareList, setCompareList] = useState<string[]>([]);
  const [showComparePanel, setShowComparePanel] = useState(false);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setLoading(true);
      const modelsData = await ModelsService.getModels();
      setModels(modelsData);
      setError('');
    } catch (err) {
      setError('Failed to load models');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Get providers list
  const providers = useMemo(() => getProviders(models), [models]);

  // Toggle provider selection
  const toggleProvider = (provider: string) => {
    setSelectedProviders(prev => 
      prev.includes(provider)
        ? prev.filter(p => p !== provider)
        : [...prev, provider]
    );
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedProviders([]);
    setContextFilter('all');
    setShowFeaturedOnly(false);
    setSortBy('popular');
  };

  // Check if any filter is active
  const hasActiveFilters = searchQuery || selectedCategory !== 'all' || 
    selectedProviders.length > 0 || contextFilter !== 'all' || showFeaturedOnly;

  // Filter and Sort Models
  const filteredModels = useMemo(() => {
    let result = [...models];
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(model => 
        model.name.toLowerCase().includes(query) ||
        model.company_name.toLowerCase().includes(query) ||
        (model.description && model.description.toLowerCase().includes(query))
      );
    }
    
    // Provider filter
    if (selectedProviders.length > 0) {
      result = result.filter(model => selectedProviders.includes(model.company_name));
    }
    
    // Context filter
    if (contextFilter !== 'all') {
      const contextMinimums: Record<ContextFilter, number> = {
        'all': 0,
        '8k': 8000,
        '32k': 32000,
        '100k': 100000,
        '200k': 200000,
      };
      result = result.filter(model => model.context_window >= contextMinimums[contextFilter]);
    }
    
    // Featured filter
    if (showFeaturedOnly) {
      result = result.filter(model => model.featured);
    }
    
    // Sort
    switch (sortBy) {
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'context':
        result.sort((a, b) => b.context_window - a.context_window);
        break;
      case 'speed':
        result.sort((a, b) => b.speed_rating - a.speed_rating);
        break;
      case 'newest':
        result.sort((a, b) => {
          if (!a.release_date) return 1;
          if (!b.release_date) return -1;
          return new Date(b.release_date).getTime() - new Date(a.release_date).getTime();
        });
        break;
      case 'popular':
        result.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
        break;
    }
    
    return result;
  }, [models, searchQuery, sortBy, selectedProviders, contextFilter, showFeaturedOnly]);

  // Compare functions
  const toggleCompare = (modelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompareList(prev => {
      if (prev.includes(modelId)) {
        return prev.filter(id => id !== modelId);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, modelId];
    });
  };

  const getComparedModels = () => models.filter(m => compareList.includes(m.id));

  const clearCompare = () => {
    setCompareList([]);
    setShowComparePanel(false);
  };

  return (
    <div className="models-page dark-theme">
      <Navbar />
      
      <div className="models-layout">
        {/* Sidebar */}
        <aside className={`models-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>

          {sidebarOpen && (
            <>
              {/* Search in sidebar */}
              <div className="sidebar-section">
                <div className="sidebar-search">
                  <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="m21 21-4.35-4.35"/>
                  </svg>
                  <input
                    type="text"
                    placeholder="Search models..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="sidebar-search-input"
                  />
                  {searchQuery && (
                    <button className="search-clear" onClick={() => setSearchQuery('')}>×</button>
                  )}
                </div>
              </div>

              {/* Categories */}
              <div className="sidebar-section">
                <h3 className="sidebar-title">Categories</h3>
                <div className="sidebar-options">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      className={`sidebar-option ${selectedCategory === cat.id ? 'active' : ''}`}
                      onClick={() => setSelectedCategory(cat.id)}
                    >
                      <span className="option-icon">{cat.icon}</span>
                      <span className="option-name">{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Providers */}
              <div className="sidebar-section">
                <h3 className="sidebar-title">Providers</h3>
                <div className="sidebar-options providers-list">
                  {providers.map(provider => (
                    <label key={provider} className="checkbox-option">
                      <input
                        type="checkbox"
                        checked={selectedProviders.includes(provider)}
                        onChange={() => toggleProvider(provider)}
                      />
                      <span className="checkbox-custom"></span>
                      <span className="option-name">{provider}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Context Length */}
              <div className="sidebar-section">
                <h3 className="sidebar-title">Context Length</h3>
                <div className="sidebar-options">
                  {(['all', '8k', '32k', '100k', '200k'] as ContextFilter[]).map(ctx => (
                    <button
                      key={ctx}
                      className={`sidebar-option compact ${contextFilter === ctx ? 'active' : ''}`}
                      onClick={() => setContextFilter(ctx)}
                    >
                      {ctx === 'all' ? 'Any' : `${ctx}+`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort */}
              <div className="sidebar-section">
                <h3 className="sidebar-title">Sort By</h3>
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="sidebar-select"
                >
                  <option value="popular">Most Popular</option>
                  <option value="name">Name (A-Z)</option>
                  <option value="context">Context Window</option>
                  <option value="speed">Speed Rating</option>
                  <option value="newest">Newest First</option>
                </select>
              </div>

              {/* Featured Toggle */}
              <div className="sidebar-section">
                <label className="toggle-option">
                  <input
                    type="checkbox"
                    checked={showFeaturedOnly}
                    onChange={() => setShowFeaturedOnly(!showFeaturedOnly)}
                  />
                  <span className="toggle-slider"></span>
                  <span className="toggle-label">Featured Only</span>
                </label>
              </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <div className="sidebar-section">
                  <button className="clear-filters-btn" onClick={clearFilters}>
                    ✕ Clear All Filters
                  </button>
                </div>
              )}
            </>
          )}
        </aside>

        {/* Main Content */}
        <main className="models-main">
          {/* Top Bar */}
          <div className="models-topbar">
            <div className="topbar-left">
              <h1>Models</h1>
              <span className="model-count">{filteredModels.length} models</span>
            </div>
            <div className="topbar-right">
              {compareList.length > 0 && (
                <button 
                  className="compare-btn"
                  onClick={() => setShowComparePanel(true)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <path d="M16 3h5v5M8 3H3v5M3 16v5h5M21 16v5h-5M3 12h18M12 3v18"/>
                  </svg>
                  Compare ({compareList.length})
                </button>
              )}
            </div>
          </div>

          {/* Active Filters Tags */}
          {hasActiveFilters && (
            <div className="active-filters">
              {searchQuery && (
                <span className="filter-tag">
                  Search: "{searchQuery}"
                  <button onClick={() => setSearchQuery('')}>×</button>
                </span>
              )}
              {selectedProviders.map(p => (
                <span key={p} className="filter-tag">
                  {p}
                  <button onClick={() => toggleProvider(p)}>×</button>
                </span>
              ))}
              {contextFilter !== 'all' && (
                <span className="filter-tag">
                  Context: {contextFilter}+
                  <button onClick={() => setContextFilter('all')}>×</button>
                </span>
              )}
              {showFeaturedOnly && (
                <span className="filter-tag">
                  Featured
                  <button onClick={() => setShowFeaturedOnly(false)}>×</button>
                </span>
              )}
            </div>
          )}

          {error && <div className="alert alert-error">{error}</div>}

          {/* Models Grid */}
          <div className="models-grid">
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading models...</p>
              </div>
            ) : filteredModels.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <h3>No models found</h3>
                <p>Try adjusting your filters or search query</p>
                {hasActiveFilters && (
                  <button onClick={clearFilters}>Clear all filters</button>
                )}
              </div>
            ) : (
              filteredModels.map((model) => (
                <div 
                  key={model.id} 
                  className={`model-card ${model.featured ? 'featured' : ''} ${compareList.includes(model.id) ? 'comparing' : ''}`}
                  onClick={() => navigate(`/models/${model.id}`)}
                >
                  {/* Compare checkbox */}
                  <button 
                    className={`compare-checkbox ${compareList.includes(model.id) ? 'checked' : ''}`}
                    onClick={(e) => toggleCompare(model.id, e)}
                    title="Add to compare"
                  >
                    {compareList.includes(model.id) ? '✓' : '+'}
                  </button>

                  {/* Featured badge */}
                  {model.featured && (
                    <span className="featured-badge">
                      <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                      Featured
                    </span>
                  )}
                  
                  <div className="model-card-header">
                    <div className="model-icon">
                      {model.company_name.charAt(0)}
                    </div>
                    <div className="model-title-group">
                      <h3 className="model-name">{model.name}</h3>
                      <span className="model-company">{model.company_name}</span>
                    </div>
                  </div>
                  
                  {model.description && (
                    <p className="model-description">{model.description}</p>
                  )}
                  
                  <div className="model-stats">
                    <div className="stat">
                      <span className="stat-value">{(model.context_window / 1000).toFixed(0)}K</span>
                      <span className="stat-label">context</span>
                    </div>
                    <div className="stat">
                      <span className="stat-value">{model.max_tokens.toLocaleString()}</span>
                      <span className="stat-label">max output</span>
                    </div>
                    <div className="stat">
                      <span className="stat-value">{model.speed_rating}</span>
                      <span className="stat-label">speed</span>
                    </div>
                  </div>

                  <div className="model-card-footer">
                    <span className="view-model-link">View details →</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      </div>

      {/* Compare Panel Modal */}
      {showComparePanel && compareList.length > 0 && (
        <div className="compare-modal-overlay" onClick={() => setShowComparePanel(false)}>
          <div className="compare-modal" onClick={(e) => e.stopPropagation()}>
            <div className="compare-modal-header">
              <h2>Compare Models</h2>
              <button className="close-btn" onClick={() => setShowComparePanel(false)}>×</button>
            </div>
            
            <div className="compare-table-wrapper">
              <table className="compare-table">
                <thead>
                  <tr>
                    <th>Feature</th>
                    {getComparedModels().map(model => (
                      <th key={model.id}>
                        <div className="compare-model-header">
                          <span>{model.name}</span>
                          <button 
                            className="remove-compare"
                            onClick={() => toggleCompare(model.id, {} as React.MouseEvent)}
                          >×</button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Provider</td>
                    {getComparedModels().map(model => (
                      <td key={model.id}>{model.company_name}</td>
                    ))}
                  </tr>
                  <tr>
                    <td>Context Window</td>
                    {getComparedModels().map(model => (
                      <td key={model.id}>{(model.context_window / 1000).toFixed(0)}K tokens</td>
                    ))}
                  </tr>
                  <tr>
                    <td>Max Output</td>
                    {getComparedModels().map(model => (
                      <td key={model.id}>{model.max_tokens.toLocaleString()} tokens</td>
                    ))}
                  </tr>
                  <tr>
                    <td>Speed Rating</td>
                    {getComparedModels().map(model => (
                      <td key={model.id}>{model.speed_rating}/5</td>
                    ))}
                  </tr>
                  <tr>
                    <td>Featured</td>
                    {getComparedModels().map(model => (
                      <td key={model.id}>{model.featured ? '✓ Yes' : 'No'}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="compare-modal-footer">
              <button className="btn-secondary" onClick={clearCompare}>Clear All</button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default ModelsPage;
