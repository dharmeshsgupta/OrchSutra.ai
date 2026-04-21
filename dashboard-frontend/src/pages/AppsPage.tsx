import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { appsService, type AppsOverview } from '../services/appsService';
import '../styles/Apps.css';

const AppsPage: React.FC = () => {
  const [overview, setOverview] = React.useState<AppsOverview | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      const data = await appsService.getOverview();
      if (mounted) {
        setOverview(data);
        setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading || !overview) {
    return (
      <>
        <Navbar />
        <div className="apps-page-shell">
          <main className="apps-page">
            <header className="apps-header">
              <h1>App & Agent Rankings</h1>
              <p>Loading live apps data...</p>
            </header>
          </main>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="apps-page-shell">
        <main className="apps-page">
          <header className="apps-header">
            <h1>App & Agent Rankings</h1>
            <p>Real-time ranking boards inspired by OrchSutra.ai Apps, styled to match your current dashboard theme.</p>
          </header>

          <section className="apps-section">
            <div className="apps-section-title-row">
              <h2>Most Popular</h2>
              <a href="https://openrouter.ai/apps" target="_blank" rel="noreferrer">View more</a>
            </div>
            <div className="apps-card-grid">
              {overview.mostPopular.map((app, index) => (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: index * 0.06 }}
                >
                  <Link to={`/apps/${app.id}`} className="apps-card" style={{ borderColor: app.accent }}>
                    <div className="apps-card-icon" aria-hidden="true">{app.icon}</div>
                    <h3>{app.name}</h3>
                    <p>{app.subtitle}</p>
                    <span>{app.tokens} tokens</span>
                  </Link>
                </motion.div>
              ))}
            </div>
          </section>

          <section className="apps-section">
            <div className="apps-section-title-row">
              <h2>Trending</h2>
              <span>Fastest growing this week</span>
            </div>
            <div className="apps-trending-row">
              {overview.trending.map((item) => (
                <article key={item.name} className="apps-trend-card">
                  <div className="apps-trend-top">
                    <span className="apps-trend-icon" aria-hidden="true">{item.icon}</span>
                    <span className="apps-growth">{item.growth}</span>
                  </div>
                  <h4>{item.name}</h4>
                  <div className="apps-volume">{item.volume}</div>
                </article>
              ))}
            </div>
          </section>

          <section className="apps-lists-grid">
            <article className="apps-list-card">
              <div className="apps-list-head">
                <h3>Top Coding Agents</h3>
                <a href="https://openrouter.ai/apps" target="_blank" rel="noreferrer">View all</a>
              </div>
              {overview.topCodingAgents.map((item, index) => (
                <div key={item.name} className="apps-list-row">
                  <span className="apps-rank">{index + 1}.</span>
                  <span className="apps-list-icon" aria-hidden="true">{item.icon}</span>
                  <div className="apps-list-main">
                    <strong>{item.name}</strong>
                    <small>{item.subtitle}</small>
                  </div>
                  <span className="apps-list-tokens">{item.tokens}</span>
                </div>
              ))}
            </article>

            <article className="apps-list-card">
              <div className="apps-list-head">
                <h3>Top Productivity</h3>
                <a href="https://openrouter.ai/apps" target="_blank" rel="noreferrer">View all</a>
              </div>
              {overview.topProductivity.map((item, index) => (
                <div key={item.name} className="apps-list-row">
                  <span className="apps-rank">{index + 1}.</span>
                  <span className="apps-list-icon" aria-hidden="true">{item.icon}</span>
                  <div className="apps-list-main">
                    <strong>{item.name}</strong>
                    <small>{item.subtitle}</small>
                  </div>
                  <span className="apps-list-tokens">{item.tokens}</span>
                </div>
              ))}
            </article>
          </section>

          <section className="apps-lists-grid apps-lists-grid-reference">
            <article className="apps-list-card">
              <div className="apps-list-head">
                <h3>Top Creative</h3>
                <a href="https://openrouter.ai/apps" target="_blank" rel="noreferrer">View all</a>
              </div>
              {overview.topCreative.map((item, index) => (
                <div key={item.id} className="apps-list-row">
                  <span className="apps-rank">{index + 1}.</span>
                  <span className="apps-list-icon" aria-hidden="true">{item.icon}</span>
                  <div className="apps-list-main">
                    <strong>{item.name}</strong>
                    <small>{item.subtitle}</small>
                  </div>
                  <span className="apps-list-tokens">{item.tokens}</span>
                </div>
              ))}
            </article>

            <article className="apps-list-card">
              <div className="apps-list-head">
                <h3>Top Entertainment</h3>
                <a href="https://openrouter.ai/apps" target="_blank" rel="noreferrer">View all</a>
              </div>
              {overview.topEntertainment.map((item, index) => (
                <div key={item.id} className="apps-list-row">
                  <span className="apps-rank">{index + 1}.</span>
                  <span className="apps-list-icon" aria-hidden="true">{item.icon}</span>
                  <div className="apps-list-main">
                    <strong>{item.name}</strong>
                    <small>{item.subtitle}</small>
                  </div>
                  <span className="apps-list-tokens">{item.tokens}</span>
                </div>
              ))}
            </article>
          </section>

          <section className="apps-list-card apps-global-section">
            <div className="apps-list-head">
              <h3>Global Ranking</h3>
              <span className="apps-time-pill">Today</span>
            </div>
            <div className="apps-global-grid">
              {overview.globalRanking.map((item, index) => (
                <div key={item.id} className="apps-global-row">
                  <span className="apps-rank">{index + 1}.</span>
                  <span className="apps-list-icon" aria-hidden="true">{item.icon}</span>
                  <div className="apps-list-main">
                    <strong>{item.name}</strong>
                    <small>{item.subtitle}</small>
                    {item.tags && item.tags.length > 0 && (
                      <div className="apps-tag-row">
                        {item.tags.map((tag) => (
                          <span key={tag} className="apps-tag">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="apps-list-tokens">{item.tokens}</span>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
      <Footer />
    </>
  );
};

export default AppsPage;
