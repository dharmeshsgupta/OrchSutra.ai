import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ThreeBackground from '../components/home/ThreeBackground';
import ParticleBackground from '../components/home/ParticleBackground';
import { ModelsService } from '../services/modelsService';
import type { Model } from '../services/modelsService';
import './HomePage.css';

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

            <div className="hero-buttons" style={{ overflow: 'hidden' }}>
              <motion.button
                variants={slideLeftBtn}
                initial="hidden" whileInView="visible" viewport={{ once: false, amount: 0.5 }} transition={{ duration: 0.6, ease: "easeOut" }}
                className="btn-primary" onClick={() => navigate('/chat')}
              >
                Start Chatting
              </motion.button>

              <motion.button
                variants={slideUpBtn}
                initial="hidden" whileInView="visible" viewport={{ once: false, amount: 0.5 }} transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
                className="btn-secondary" onClick={() => navigate('/api-keys')}
              >
                Get an API
              </motion.button>

              <motion.button
                variants={slideRightBtn}
                initial="hidden" whileInView="visible" viewport={{ once: false, amount: 0.5 }} transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                className="btn-secondary" onClick={() => navigate('/models')}
              >
                Explore LLM
              </motion.button>
            </div>

            <motion.div
              className="search-container"
              variants={fadeUpVariant}
              initial="hidden" whileInView="visible" viewport={{ once: false, amount: 0.5 }} transition={{ duration: 0.8, delay: 0.4 }}
            >
              <input
                type="text"
                className="search-input"
                placeholder={`Search ${models.length} models...`}
              />
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
              <div className="stat-value">{models.length} +</div>
              <div className="stat-label">MODELS</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{providersCount} +</div>
              <div className="stat-label">PROVIDERS</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">24/7</div>
              <div className="stat-label">UPTIME</div>
            </div>
          </motion.div>

          <motion.div
            className="featured-section"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, margin: "-100px", amount: 0.1 }}
            transition={{ duration: 0.8, ease: "easeOut", staggerChildren: 0.15 }}
            variants={fadeUpVariant}
          >
            <h2 className="featured-title">Featured Models</h2>
            <div className="models-grid">
              {featuredModels.map((model) => (
                <motion.div
                  key={model.id}
                  className="model-card"
                  variants={cardVariant}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  whileHover={{ y: -8, scale: 1.01, boxShadow: '0 12px 30px rgba(0,0,0,0.4)', transition: { duration: 0.3, ease: 'easeInOut' } }}
                >
                  <h3 className="model-name">{model.name}</h3>
                  <p className="model-provider">by {model.company_name}</p>
                  <p className="model-description">
                    {model.description ?? 'High-performance model ready for production workloads.'}
                  </p>
                  <button className="btn-try" onClick={() => navigate('/chat')}>Try Now</button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </main>

        <Footer />
      </div>
    </div>
  );
};

export default HomePage;






