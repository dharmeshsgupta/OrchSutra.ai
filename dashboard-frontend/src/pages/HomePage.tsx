import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { ScrollAnimation } from '../components/home/ScrollAnimation';
import ThreeBackground from '../components/home/ThreeBackground';
import ParticleBackground from '../components/home/ParticleBackground';
import { ModelsService } from '../services/modelsService';
import type { Model } from '../services/modelsService';
import './HomePage.css';

const AnimatedCounter: React.FC<{ target: number }> = ({ target }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let startTime: number | null = null;
    const duration = 1500; // 1.5 seconds

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const rate = Math.min(progress / duration, 1);
      const easedRate = rate * (2 - rate); // Ease out quad
      
      setCount(Math.floor(easedRate * target));
      
      if (progress < duration) {
        requestAnimationFrame(animate);
      } else {
        setCount(target);
      }
    };

    requestAnimationFrame(animate);
  }, [target]);

  return <>{count}</>;
};

const fadeUpVariant = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 }
};

const slideLeftBtn = {
  hidden: { opacity: 0, x: -80 },
  visible: { opacity: 1, x: 0 }
};

const slideRightBtn = {
  hidden: { opacity: 0, x: 80 },
  visible: { opacity: 1, x: 0 }
};

const slideUpBtn = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0 }
};

const cardVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [models, setModels] = useState<Model[]>([]);
  const [providersCount, setProvidersCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const loadHomeStats = async () => {
      try {
        const [allModels, providers] = await Promise.all([
          ModelsService.getModels(),
          ModelsService.getProviders(),
        ]);

        if (!isMounted) {
          return;
        }

        setModels(allModels);
        setProvidersCount(providers.length);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setModels([]);
        setProvidersCount(0);
      }
    };

    loadHomeStats();

    return () => {
      isMounted = false;
    };
  }, []);

  const featuredModels = useMemo(() => {
    const featured = models.filter((model) => model.featured);
    const source = featured.length > 0 ? featured : models;
    return source.slice(0, 4);
  }, [models]);

  return (
    <div className="home-page" style={{ position: 'relative' }}>
      {/* 3D WebGL Background Layer (does not affect navbar/footer styling) */}
      <ThreeBackground />

      {/* Particle Background Layer – antigravity floating particles */}
      <ParticleBackground />

      {/* Content wrapper to ensure it sits above the 3D canvas */}
      <div style={{ position: 'relative', zIndex: 10 }}>
        <Navbar />

        <main className="home-main">
          <motion.div
            className="hero-section"
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.8, ease: "easeOut" }}
            variants={fadeUpVariant}
          >
            <h1 className="hero-title">OrchSutra.ai</h1>
            <h2 className="hero-subtitle">Access the best open-source AI models in one place</h2>
            <p className="hero-description">
              Compare, deploy, and scale the most powerful open AI models with a unified interface
            </p>

            <div className="hero-buttons">
              <motion.button
                variants={slideLeftBtn}
                initial="hidden" whileInView="visible" viewport={{ once: false, amount: 0.5 }} transition={{ duration: 0.6, ease: "easeOut" }}
                className="hero-btn-primary" onClick={() => navigate('/chat')}
              >
                Start Chatting
              </motion.button>

              <motion.button
                variants={slideUpBtn}
                initial="hidden" whileInView="visible" viewport={{ once: false, amount: 0.5 }} transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
                className="hero-btn-secondary" onClick={() => navigate('/api-keys')}
              >
                Get an API
              </motion.button>

              <motion.button
                variants={slideRightBtn}
                initial="hidden" whileInView="visible" viewport={{ once: false, amount: 0.5 }} transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                className="hero-btn-secondary" onClick={() => navigate('/models')}
              >
                Explore LLM
              </motion.button>
            </div>

            <motion.div
              className="search-container"
              variants={fadeUpVariant}
              initial="hidden" whileInView="visible" viewport={{ once: false, amount: 0.5 }} transition={{ duration: 0.8, delay: 0.4 }}
            >
              <div className="search-input-wrapper">
                <input
                  type="text"
                  className="search-input"
                  placeholder={`Search ${models.length} models...`}
                />
                <Search size={20} className="search-icon" />
              </div>
              <button className="btn-search" onClick={() => navigate('/models')}>Explore Models</button>
            </motion.div>
          </motion.div>

          <motion.div
            className="stats-section"
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            variants={fadeUpVariant}
          >
            <div className="stat-item">
              <div className="stat-value">100T</div>
              <div className="stat-label">Monthly Tokens</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">8M+</div>
              <div className="stat-label">Global Users</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">
                {providersCount > 0 ? <AnimatedCounter target={providersCount} /> : '60'}+
              </div>
              <div className="stat-label">Providers</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">
                {models.length > 0 ? <AnimatedCounter target={models.length} /> : '400'}+
              </div>
              <div className="stat-label">Models</div>
            </div>
          </motion.div>

          {/* OpenRouter-style Feature Cards */}
          <motion.div
            className="features-grid"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, margin: "-50px", amount: 0.1 }}
            transition={{ duration: 0.8, ease: "easeOut", staggerChildren: 0.12 }}
            variants={fadeUpVariant}
          >
            {/* Feature 1: One API for Any Model */}
            <motion.div className="feature-card col-span-2" variants={cardVariant}>
              <div className="feature-illustration">
                <svg width="140" height="90" viewBox="0 0 140 90" fill="none">
                  {/* Central hub */}
                  <circle cx="70" cy="45" r="12" fill="rgba(99,102,241,0.2)" stroke="#6366f1" strokeWidth="1.5" className="svg-pulse-node" />
                  <circle cx="70" cy="45" r="4" fill="#818cf8" className="svg-pulse-node" />
                  {/* Satellite nodes */}
                  <circle cx="20" cy="20" r="8" fill="rgba(59,130,246,0.15)" stroke="#3b82f6" strokeWidth="1" />
                  <circle cx="120" cy="20" r="8" fill="rgba(16,185,129,0.15)" stroke="#10b981" strokeWidth="1" />
                  <circle cx="20" cy="70" r="8" fill="rgba(249,115,22,0.15)" stroke="#f97316" strokeWidth="1" />
                  <circle cx="120" cy="70" r="8" fill="rgba(236,72,153,0.15)" stroke="#ec4899" strokeWidth="1" />
                  <circle cx="70" cy="10" r="6" fill="rgba(6,182,212,0.15)" stroke="#06b6d4" strokeWidth="1" />
                  <circle cx="70" cy="80" r="6" fill="rgba(168,85,247,0.15)" stroke="#a855f7" strokeWidth="1" />
                  {/* Connection lines */}
                  <line x1="28" y1="24" x2="58" y2="41" stroke="#6366f1" strokeWidth="0.8" opacity="0.5" className="svg-flow-line" />
                  <line x1="112" y1="24" x2="82" y2="41" stroke="#6366f1" strokeWidth="0.8" opacity="0.5" className="svg-flow-line" />
                  <line x1="28" y1="66" x2="58" y2="49" stroke="#6366f1" strokeWidth="0.8" opacity="0.5" className="svg-flow-line" />
                  <line x1="112" y1="66" x2="82" y2="49" stroke="#6366f1" strokeWidth="0.8" opacity="0.5" className="svg-flow-line" />
                  <line x1="70" y1="16" x2="70" y2="33" stroke="#6366f1" strokeWidth="0.8" opacity="0.5" className="svg-flow-line" />
                  <line x1="70" y1="74" x2="70" y2="57" stroke="#6366f1" strokeWidth="0.8" opacity="0.5" className="svg-flow-line" />
                </svg>
              </div>
              <h3>One API for Any Model</h3>
              <p>Access all major models through a single, unified interface. OpenAI SDK works out of the box.</p>
              <a href="/models" onClick={(e) => { e.preventDefault(); navigate('/models'); }}>Browse all ↗</a>
            </motion.div>

            {/* Scroll Animation Frame Viewer */}
            <ScrollAnimation />

            {/* Feature 2: Higher Availability */}
            <motion.div className="feature-card col-span-2" variants={cardVariant}>
              <div className="feature-illustration">
                <svg width="140" height="90" viewBox="0 0 140 90" fill="none">
                  {/* Server nodes */}
                  <rect x="15" y="15" width="24" height="18" rx="4" fill="rgba(99,102,241,0.15)" stroke="#6366f1" strokeWidth="1" />
                  <rect x="58" y="15" width="24" height="18" rx="4" fill="rgba(99,102,241,0.15)" stroke="#6366f1" strokeWidth="1" />
                  <rect x="100" y="15" width="24" height="18" rx="4" fill="rgba(99,102,241,0.15)" stroke="#6366f1" strokeWidth="1" />
                  {/* Target */}
                  <circle cx="70" cy="70" r="10" fill="rgba(16,185,129,0.15)" stroke="#10b981" strokeWidth="1.5" />
                  <circle cx="70" cy="70" r="3" fill="#34d399" />
                  {/* Active paths */}
                  <line x1="27" y1="33" x2="62" y2="61" stroke="#10b981" strokeWidth="1" opacity="0.6" className="svg-flow-line" />
                  <line x1="112" y1="33" x2="78" y2="61" stroke="#10b981" strokeWidth="1" opacity="0.6" className="svg-flow-line" />
                  {/* Failed path with X */}
                  <line x1="70" y1="33" x2="70" y2="58" stroke="#ef4444" strokeWidth="1" className="svg-path-fail" />
                  <text x="74" y="48" fill="#ef4444" fontSize="10" fontWeight="bold" opacity="0.6">✕</text>
                </svg>
              </div>
              <h3>Higher Availability</h3>
              <p>Reliable AI models via our distributed infrastructure. Fall back to other providers when one goes down.</p>
              <a href="/models" onClick={(e) => { e.preventDefault(); navigate('/models'); }}>Learn more ↗</a>
            </motion.div>

            {/* Feature 3: Price and Performance */}
            <motion.div className="feature-card col-span-3" variants={cardVariant}>
              <div className="feature-illustration">
                <svg width="140" height="90" viewBox="0 0 140 90" fill="none">
                  {/* Chart background */}
                  <line x1="20" y1="75" x2="120" y2="75" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                  <line x1="20" y1="55" x2="120" y2="55" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
                  <line x1="20" y1="35" x2="120" y2="35" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
                  <line x1="20" y1="15" x2="120" y2="15" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
                  {/* Performance line */}
                  <polyline
                    points="20,60 35,50 50,55 65,35 80,30 95,25 110,20 120,22"
                    fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  />
                  {/* Cost line */}
                  <polyline
                    points="20,45 35,48 50,42 65,50 80,45 95,52 110,48 120,50"
                    fill="none" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7"
                  />
                  {/* Area fill */}
                  <polygon
                    points="20,60 35,50 50,55 65,35 80,30 95,25 110,20 120,22 120,75 20,75"
                    fill="url(#greenGrad)" opacity="0.15"
                  />
                  <defs>
                    <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="transparent" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <h3>Price and Performance</h3>
              <p>Keep costs in check without sacrificing speed. OrchSutra runs at the edge for minimal latency.</p>
              <a href="/models" onClick={(e) => { e.preventDefault(); navigate('/models'); }}>Learn more ↗</a>
            </motion.div>

            {/* Feature 4: Custom Data Policies */}
            <motion.div className="feature-card col-span-3" variants={cardVariant}>
              <div className="feature-illustration">
                <svg width="140" height="90" viewBox="0 0 140 90" fill="none">
                  {/* Shield outline */}
                  <path
                    d="M70 10 L100 25 L100 55 Q100 75 70 85 Q40 75 40 55 L40 25 Z"
                    fill="rgba(52,211,153,0.08)" stroke="#34d399" strokeWidth="1.5"
                    className="svg-pulse-shield"
                  />
                  {/* Inner lock */}
                  <rect x="61" y="42" width="18" height="14" rx="3" fill="rgba(52,211,153,0.2)" stroke="#34d399" strokeWidth="1" />
                  <path d="M66 42 V37 A4 4 0 0 1 74 37 V42" fill="none" stroke="#34d399" strokeWidth="1.2" />
                  <circle cx="70" cy="50" r="2" fill="#34d399" />
                  {/* Orbiting rings */}
                  <circle cx="70" cy="48" r="28" fill="none" stroke="rgba(52,211,153,0.12)" strokeWidth="0.5" strokeDasharray="3,3" />
                  {/* Checkmark dots */}
                  <circle cx="46" cy="30" r="3" fill="rgba(52,211,153,0.2)" stroke="#34d399" strokeWidth="0.8" />
                  <text x="44" y="33" fill="#34d399" fontSize="5" fontWeight="bold">✓</text>
                  <circle cx="94" cy="30" r="3" fill="rgba(52,211,153,0.2)" stroke="#34d399" strokeWidth="0.8" />
                  <text x="92" y="33" fill="#34d399" fontSize="5" fontWeight="bold">✓</text>
                </svg>
              </div>
              <h3>Custom Data Policies</h3>
              <p>Protect your organization with fine-grained data policies. Prompts only go to providers you trust.</p>
              <a href="/docs" onClick={(e) => { e.preventDefault(); navigate('/docs'); }}>View docs ↗</a>
            </motion.div>
          </motion.div>

          {/* Featured Models - OpenRouter style */}
          <motion.div
            className="featured-section"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, margin: "-100px", amount: 0.1 }}
            transition={{ duration: 0.8, ease: "easeOut", staggerChildren: 0.15 }}
            variants={fadeUpVariant}
          >
            <div className="featured-header-row">
              <div className="featured-header-left">
                <h2>Featured Models &rsaquo;</h2>
                <p>{models.length > 0 ? models.length : '400'}+ active models on {providersCount > 0 ? providersCount : '60'}+ providers</p>
              </div>
              <button className="hero-btn-view-all" onClick={() => navigate('/models')}>
                View all →
              </button>
            </div>
            <div className="models-grid">
              {featuredModels.map((model, index) => {
                const companyLower = (model.company_name || '').toLowerCase();
                const avatarClass = companyLower.includes('openai') ? 'avatar-openai'
                  : companyLower.includes('anthropic') ? 'avatar-anthropic'
                  : companyLower.includes('google') ? 'avatar-google'
                  : companyLower.includes('meta') ? 'avatar-meta'
                  : 'avatar-default';
                const initial = (model.company_name || 'M').charAt(0).toUpperCase();
                const mockTokens = ['146.6B', '503.8B', '270.6B', '89.2B'][index] || '52.1B';
                const mockTrend = ['0%', '-10%', '+47%', '+12%'][index] || '0%';
                const trendClass = mockTrend.startsWith('+') ? 'trend-up' : mockTrend.startsWith('-') ? 'trend-down' : 'trend-flat';

                return (
                  <motion.div
                    key={model.id}
                    className="model-card-new"
                    variants={cardVariant}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    onClick={() => navigate('/chat')}
                  >
                    <div className="model-card-top">
                      <div className={`model-avatar ${avatarClass}`}>{initial}</div>
                      <div className="model-identity">
                        <div className="model-name-new">
                          {model.name}
                          {model.featured && <span className="model-badge-new">New</span>}
                        </div>
                        <div className="model-provider-new">by {model.company_name}</div>
                      </div>
                    </div>
                    <div className="model-metrics-new">
                      <div className="metric-block">
                        <span className="metric-label">Tokens</span>
                        <span className="metric-value-new">{mockTokens}</span>
                      </div>
                      <div className="metric-block">
                        <span className="metric-label">Weekly Trend</span>
                        <span className={`metric-value-new ${trendClass}`}>{mockTrend}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </main>

        <Footer />
      </div>
    </div>
  );
};

export default HomePage;




