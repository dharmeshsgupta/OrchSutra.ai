import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { appsService, type AppDetail } from '../services/appsService';
import '../styles/AppDetail.css';

const AppDetailPage: React.FC = () => {
  const { appId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<AppDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const detail = await appsService.getAppDetail(appId || '');
      if (mounted) {
        setData(detail);
        setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [appId]);

  const { chartData, keys } = useMemo(() => {
    if (!data) return { chartData: [], keys: [] as string[] };

    const keyTotals: Record<string, number> = {};
    data.usage.forEach((row) => {
      row.slices.forEach((slice) => {
        keyTotals[slice.model] = (keyTotals[slice.model] || 0) + slice.tokens;
      });
    });

    const keysSorted = Object.entries(keyTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name)
      .slice(0, 8);

    const rows = data.usage.map((row) => {
      const point: Record<string, number | string> = { day: row.date };
      row.slices.forEach((slice) => {
        if (keysSorted.includes(slice.model)) {
          point[slice.model] = slice.tokens;
        }
      });
      return point;
    });

    return { chartData: rows, keys: keysSorted };
  }, [data]);

  const colorForKey = (key: string): string => {
    if (!data) return '#60a5fa';
    for (const row of data.usage) {
      const match = row.slices.find((slice) => slice.model === key);
      if (match) return match.color;
    }
    return '#60a5fa';
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="app-detail-shell"><div className="app-detail-loading">Loading app details...</div></div>
        <Footer />
      </>
    );
  }

  if (!data) {
    return (
      <>
        <Navbar />
        <div className="app-detail-shell">
          <div className="app-detail-empty">
            <h2>App not found</h2>
            <button onClick={() => navigate('/apps')}>Back to Apps</button>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="app-detail-shell">
        <main className="app-detail-page">
          <motion.section
            className="app-hero"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          >
            <div className="app-hero-main">
              <div className="app-hero-icon">{data.icon}</div>
              <div>
                <h1>{data.name}</h1>
                <p>{data.subtitle}</p>
              </div>
            </div>
            <div className="app-hero-actions">
              <button className="app-back" onClick={() => navigate('/apps')}>Back</button>
              <a className="app-visit" href={data.officialUrl} target="_blank" rel="noreferrer">Visit</a>
            </div>
          </motion.section>

          <motion.section
            className="app-stats-grid"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08, ease: 'easeOut' }}
          >
            <article><strong>{data.tokens}</strong><span>Total tokens</span></article>
            <article><strong>{data.rank}</strong><span>Daily global rank</span></article>
            <article><strong>{data.activeSince}</strong><span>Active since</span></article>
            <article><strong>{data.modelsUsed}</strong><span>Models used</span></article>
          </motion.section>

          <div className="app-chips">
            {data.categories.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>

          <motion.section
            className="app-chart-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.15, ease: 'easeOut' }}
          >
            <div className="app-chart-head">
              <h2>{data.name} OpenRouter Usage</h2>
              <span>Last 30 days</span>
            </div>
            <div className="app-chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 14, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#8ea0bf' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#8ea0bf' }} tickLine={false} axisLine={false} />
                  <Tooltip />
                  {keys.map((key) => (
                    <Bar key={key} dataKey={key} stackId="usage" fill={colorForKey(key)} radius={[2, 2, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.section>

          <motion.section
            className="app-models-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.22, ease: 'easeOut' }}
          >
            <h3>Top models used by {data.name} this month</h3>
            <div className="app-model-list">
              {data.topModels.map((model, index) => (
                <div key={model.model} className="app-model-row">
                  <span className="app-model-rank">{index + 1}.</span>
                  <div className="app-model-main">
                    <strong>{model.model}</strong>
                    <small>{model.provider}</small>
                  </div>
                  <span className="app-model-tokens">{model.tokens}</span>
                </div>
              ))}
            </div>
          </motion.section>
        </main>
      </div>
      <Footer />
    </>
  );
};

export default AppDetailPage;
