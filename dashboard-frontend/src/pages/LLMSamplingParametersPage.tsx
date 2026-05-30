import React, { useMemo, useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import {
  SamplingMetricsService,
  type SamplingMetricsResponse,
  type PieSlice,
} from '../services/samplingMetricsService';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import '../styles/LLMSamplingParameters.css';

const RANGE_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7D' },
  { id: '30d', label: '30D' },
];

const PARAMETER_LABELS: Record<string, string> = {
  top_p: 'Top P',
  top_k: 'Top K',
  temperature: 'Temperature',
  frequency_penalty: 'Frequency',
  input_tokens: 'Input Tokens',
  output_tokens: 'Output Tokens',
};

const COLORS = ['#6c8cff', '#8bd6ff', '#56d2a5', '#f4c266', '#f07d7d', '#c7a7ff'];

const formatAverage = (value: number | null, key: string) => {
  if (value === null || Number.isNaN(value)) {
    return '—';
  }
  if (key.includes('tokens')) {
    return Math.round(value).toLocaleString();
  }
  return value.toFixed(2);
};

const renderPie = (data: PieSlice[], label: string) => (
  <div className="sampling-pie">
    <h4>{label}</h4>
    {data.length === 0 ? (
      <div className="sampling-empty">No data yet</div>
    ) : (
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
            {data.map((entry, index) => (
              <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend layout="horizontal" verticalAlign="bottom" height={40} />
        </PieChart>
      </ResponsiveContainer>
    )}
  </div>
);

const LLMSamplingParametersPage: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [range, setRange] = useState('all');
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<SamplingMetricsResponse | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      try {
        const response = await SamplingMetricsService.getSamplingMetrics(range);
        setMetrics(response);
      } catch (error) {
        console.error('Failed to load sampling metrics', error);
        setMetrics(null);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [range]);

  const parameterKeys = useMemo(() => Object.keys(PARAMETER_LABELS), []);

  return (
    <>
      <Navbar />
      <div className="dashboard-with-sidebar">
        <div
          className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
          onClick={() => setSidebarOpen(false)}
        />
        <Sidebar className={sidebarOpen ? 'sidebar-open' : ''} />
        <div className="dashboard-container sampling-container">
          <div className="sampling-header">
            <div>
              <h1>LLM Sampling Parameters</h1>
              <p className="subtitle">Averages and distribution across all routed requests</p>
            </div>
            <div className="sampling-range">
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  className={`range-btn ${range === option.id ? 'active' : ''}`}
                  onClick={() => setRange(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="sampling-loading">Loading sampling analytics...</div>
          ) : !metrics ? (
            <div className="sampling-empty">Metrics are unavailable right now.</div>
          ) : (
            <div className="sampling-grid">
              {parameterKeys.map((key) => {
                const paramMetrics = metrics.metrics[key];
                return (
                  <section key={key} className="sampling-card">
                    <div className="sampling-card-header">
                      <h3>{PARAMETER_LABELS[key]}</h3>
                      <div className="sampling-average">
                        <span className="sampling-average-label">Average</span>
                        <span className="sampling-average-value">
                          {formatAverage(paramMetrics?.average ?? null, key)}
                        </span>
                      </div>
                    </div>

                    <div className="sampling-pies">
                      {renderPie(paramMetrics?.by_model ?? [], 'By Model')}
                      {renderPie(paramMetrics?.by_provider ?? [], 'By Provider')}
                      {renderPie(paramMetrics?.buckets ?? [], 'By Range')}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <button
        className="sidebar-toggle-btn"
        onClick={() => setSidebarOpen((prev) => !prev)}
        aria-label="Toggle sidebar"
      >
        {sidebarOpen ? '✕' : '☰'}
      </button>

      <Footer />
    </>
  );
};

export default LLMSamplingParametersPage;
