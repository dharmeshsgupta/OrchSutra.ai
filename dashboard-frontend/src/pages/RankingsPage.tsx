import { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { ReactNode } from 'react';
import { rankingsService } from '../services/rankingsService';
import type {
  RankingsOverview,
  LeaderboardEntry,
  DistributionChartData,
  BenchmarkPoint,
  FastestModelPoint,
} from '../services/rankingsService';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import '../styles/Rankings.css';

const getNumericValue = (value: unknown): number => {
  if (Array.isArray(value)) {
    return Number(value[0] ?? 0);
  }
  return Number(value ?? 0);
};

const formatCompact = (value: number): string => {
  if (value >= 1_000_000_000_000) return `${(value / 1_000_000_000_000).toFixed(2)}T`;
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(Math.round(value));
};

const formatMetricValue = (value: number, metric: string): string => {
  const normalized = metric.toLowerCase();
  if (normalized.includes('call')) return `${formatCompact(value)} calls`;
  if (normalized.includes('image')) return `${formatCompact(value)} images`;
  return `${formatCompact(value)} tokens`;
};

const formatPricePerMillion = (value: number): string => {
  return `$${value.toFixed(2)}/M`;
};

const SectionTooltip = ({ active, payload, label, metric }: any) => {
  if (!active || !payload || payload.length === 0) return null;

  const hasAbsoluteTotal = payload.some((entry: any) => Number(entry?.payload?.__totalValue) > 0);
  const total = hasAbsoluteTotal
    ? payload.reduce((sum: number, entry: any) => sum + getNumericValue(entry.payload.__totalValue), 0)
    : payload.reduce((sum: number, entry: any) => sum + getNumericValue(entry.value), 0);

  return (
    <div className="chart-tooltip">
      <div className="tooltip-header">{label}</div>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="tooltip-item">
          <div className="tooltip-item-name">
            <span
              className="tooltip-color-dot"
              style={{ backgroundColor: entry.color }}
            />
            <span>{entry.name}</span>
          </div>
          <span className="tooltip-item-value">{getNumericValue(entry.value).toFixed(1)}%</span>
        </div>
      ))}
      <div className="tooltip-total">
        <span>Total</span>
        <span>{hasAbsoluteTotal ? formatMetricValue(total, metric) : `${total.toFixed(1)}%`}</span>
      </div>
    </div>
  );
};

const PointTooltip = ({ active, payload }: any) => {
  if (!active || !payload || payload.length === 0) return null;

  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div className="chart-tooltip">
      <div className="tooltip-header">{point.model_name}</div>
      {'company_name' in point && <div className="tooltip-item"><span>Company</span><span>{point.company_name}</span></div>}
      {'provider_name' in point && <div className="tooltip-item"><span>Provider</span><span>{point.provider_name}</span></div>}
      {'score' in point && <div className="tooltip-item"><span>Score</span><span>{Number(point.score).toFixed(1)}</span></div>}
      {'throughput_tps' in point && <div className="tooltip-item"><span>Throughput</span><span>{Math.round(Number(point.throughput_tps))} tok/s</span></div>}
      <div className="tooltip-item"><span>Price</span><span>{formatPricePerMillion(Number(point.price_per_million))}</span></div>
    </div>
  );
};

const TrendIcon = ({ trend }: { trend: string }) => {
  if (trend === 'up') {
    return (
      <svg className="trend-up" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 15l-6-6-6 6" />
      </svg>
    );
  }
  if (trend === 'down') {
    return (
      <svg className="trend-down" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 9l6 6 6-6" />
      </svg>
    );
  }
  return (
    <svg className="trend-stable" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14" />
    </svg>
  );
};

const DistributionSection = ({
  data,
  iconPath,
  rightControl,
}: {
  data: DistributionChartData;
  iconPath: string;
  rightControl?: ReactNode;
}) => {
  const chartData = useMemo(() => {
    return data.weeks.map((week) => {
      const point: Record<string, unknown> = {
        week: week.week_start.split(' ').slice(0, 2).join(' '),
        __totalValue: week.total_value,
      };

      week.items.forEach((item) => {
        point[item.item_name] = item.share_percent;
      });

      return point;
    });
  }, [data]);

  const bars = useMemo(() => {
    const firstWeek = data.weeks[0];
    if (!firstWeek) return [];

    return firstWeek.items.map((item) => ({
      name: item.item_name,
      color: item.color,
    }));
  }, [data]);

  const latestRanking = useMemo(() => {
    const latestWeek = data.weeks[data.weeks.length - 1];
    if (!latestWeek) return [];

    return [...latestWeek.items]
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [data]);

  return (
    <section className="ranking-card-section">
      <div className="chart-title-row">
        <div className="section-header section-header-tight">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d={iconPath} />
          </svg>
          <h2>{data.title}</h2>
        </div>
        {rightControl}
      </div>

      <p className="section-subtitle">{data.subtitle}</p>

      <div className="chart-container chart-container-medium">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 16, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="week" tick={{ fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
            <YAxis tickFormatter={(value) => `${value}%`} domain={[0, 100]} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
            <Tooltip content={<SectionTooltip metric={data.metric} />} />
            {bars.map((bar) => (
              <Bar key={bar.name} dataKey={bar.name} stackId="a" fill={bar.color} radius={[0, 0, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rank-list two-column">
        {latestRanking.map((item, index) => (
          <div key={item.item_id} className="rank-row detailed-row">
            <span className="rank-index">{index + 1}.</span>
            <span className="rank-dot" style={{ backgroundColor: item.color }} />
            <div className="rank-main-text">
              <span className="rank-name">{item.item_name}</span>
              <span className="rank-sub">{item.subtitle ?? data.metric}</span>
            </div>
            <div className="rank-value-group">
              <span className="rank-value">{formatCompact(item.value)}</span>
              <span className="rank-percent">{item.share_percent.toFixed(1)}%</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default function RankingsPage() {
  const [data, setData] = useState<RankingsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('week');
  const [categoryFilter, setCategoryFilter] = useState('Programming');
  const [languageFilter, setLanguageFilter] = useState('English');
  const [programmingFilter, setProgrammingFilter] = useState('Python');

  useEffect(() => {
    fetchRankings();
  }, []);

  useEffect(() => {
    if (data) {
      fetchLeaderboard();
    }
  }, [period]);

  const fetchRankings = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await rankingsService.getRankingsOverview();
      setData(result);
    } catch (err) {
      setError('Failed to load rankings data');
      console.error('Error fetching rankings:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const leaderboard = await rankingsService.getLeaderboard(period);
      setData((prev) => (prev ? { ...prev, leaderboard } : null));
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    }
  };

  // ── Top Models Line Chart (uses DB data via top_models.weeks) ──────────────
  // LESSON: The old chart used top_models_chart (legacy mock format with .models[]
  // that always showed Jan-Feb 2026). We now use top_models.weeks (DistributionWeek[]
  // with .items[] which comes from real DB backfill data — shows April-June 2026!)
  const topModelsLineData = useMemo(() => {
    if (!data?.top_models?.weeks?.length) return [];
    // Take last 20 weeks (daily snapshots grouped as needed)
    const recent = data.top_models.weeks.slice(-20);
    return recent.map((week) => {
      // Format date label: "04 Jun" from "04 Jun 2026"
      const label = week.week_start.split(' ').slice(0, 2).join(' ');
      const point: Record<string, unknown> = { date: label };
      week.items.forEach((item) => {
        // Use share_percent so all models are visible on same scale
        point[item.item_name] = Number(item.share_percent.toFixed(1));
      });
      return point;
    });
  }, [data]);

  // Top 5 models (exclude 'Others') from the latest snapshot
  const topModelLines = useMemo(() => {
    const latestWeek = data?.top_models?.weeks?.at(-1);
    if (!latestWeek) return [];
    return [...latestWeek.items]
      .filter((item) => item.item_name !== 'Others')
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
      .map((item) => ({ name: item.item_name, color: item.color }));
  }, [data]);

  // ── Market Share Bar Chart ──────────────────────────────────────────────────
  const marketShareChartData = useMemo(() => {
    if (!data?.market_share?.weeks) return [];
    const recentWeeks = data.market_share.weeks.slice(-10);
    return recentWeeks.map((week) => {
      const point: Record<string, unknown> = {
        week: week.week_start.split(' ').slice(0, 2).join(' '),
      };
      week.providers.forEach((provider) => {
        point[provider.provider_name] = provider.share_percent;
      });
      return point;
    });
  }, [data]);

  const marketShareBars = useMemo(() => {
    const latestWeek = data?.market_share?.weeks?.at(-1);
    if (!latestWeek?.providers) return [];
    return latestWeek.providers.map((provider) => ({
      name: provider.provider_name,
      color: provider.color,
    }));
  }, [data]);

  const benchmarkTop = useMemo(() => {
    if (!data?.benchmarks?.points) return [];
    return [...data.benchmarks.points].sort((a, b) => b.score - a.score).slice(0, 10);
  }, [data]);

  const fastestTop = useMemo(() => {
    if (!data?.fastest_models?.points) return [];
    return [...data.fastest_models.points].sort((a, b) => b.throughput_tps - a.throughput_tps).slice(0, 10);
  }, [data]);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="rankings-page">
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>Loading rankings...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="rankings-page">
          <div className="error-state">
            <p>{error}</p>
            <button className="retry-button" onClick={fetchRankings}>
              Retry
            </button>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="rankings-page">
        <div className="rankings-header">
          <h1>AI Model Rankings</h1>
          <p>Based on real usage data from millions of users accessing models through OrchSutra.ai.</p>
        </div>

        {/* ── Top Models Line Chart ── */}
        <section className="ranking-card-section">
          <div className="section-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3v18h18M7 16l4-4 4 4 4-5" />
            </svg>
            <h2>Top Models</h2>
          </div>
          <p className="section-subtitle">
            Daily market share % of top 5 models — hover a line to see the model name and value
          </p>

          <div className="chart-container chart-container-medium">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={topModelsLineData}
                margin={{ top: 10, right: 24, left: 0, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                  interval={Math.max(0, Math.floor(topModelsLineData.length / 8) - 1)}
                />
                <YAxis
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 'dataMax + 5']}
                />
                <Tooltip
                  formatter={(value: any, name: any) => [`${value}%`, name]}
                  contentStyle={{ borderRadius: 8, fontSize: 13 }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  formatter={(value) => (
                    <span style={{ color: '#374151', fontWeight: 500 }}>{value}</span>
                  )}
                />
                {topModelLines.map((line) => (
                  <Line
                    key={line.name}
                    type="monotone"
                    dataKey={line.name}
                    stroke={line.color}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Ranked list below the chart */}
          <div className="rank-list two-column" style={{ marginTop: '1rem' }}>
            {data?.top_models?.weeks?.at(-1)?.items
              .filter((i) => i.item_name !== 'Others')
              .sort((a, b) => b.value - a.value)
              .slice(0, 10)
              .map((item, idx) => (
                <div key={item.item_id} className="rank-row detailed-row">
                  <span className="rank-index">{idx + 1}.</span>
                  <span className="rank-dot" style={{ backgroundColor: item.color }} />
                  <div className="rank-main-text">
                    <span className="rank-name">{item.item_name}</span>
                    <span className="rank-sub">{item.subtitle}</span>
                  </div>
                  <div className="rank-value-group">
                    <span className="rank-value">{formatCompact(item.value)}</span>
                    <span className="rank-percent">{item.share_percent.toFixed(1)}%</span>
                  </div>
                </div>
              ))}
          </div>
        </section>

        {/* ── Market Share Bar Chart ── */}
        <section className="ranking-card-section">
          <div className="section-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 20V10M12 20V4M6 20v-6" />
            </svg>
            <h2>Market Share</h2>
          </div>
          <p className="section-subtitle">Token share by provider over time — hover a bar to see provider breakdown</p>

          <div className="chart-container chart-container-medium">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={marketShareChartData} margin={{ top: 10, right: 24, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                  interval={Math.max(0, Math.floor(marketShareChartData.length / 8) - 1)}
                />
                <YAxis
                  tickFormatter={(v) => `${v}%`}
                  domain={[0, 100]}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<SectionTooltip metric="tokens" />} />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  formatter={(value) => (
                    <span style={{ color: '#374151', fontWeight: 500 }}>{value}</span>
                  )}
                />
                {marketShareBars.map((bar) => (
                  <Bar
                    key={bar.name}
                    dataKey={bar.name}
                    stackId="a"
                    fill={bar.color}
                    radius={[0, 0, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="ranking-card-section">
          <div className="chart-title-row">
            <div className="section-header section-header-tight">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 2v7.31M14 9.3V1.99M8.5 2h7M14 22v-7.31M10 14.7v7.31M15.5 22h-7" />
              </svg>
              <h2>Benchmarks</h2>
            </div>
          </div>
          <p className="section-subtitle">Model intelligence score vs price per million tokens</p>

          <div className="chart-container chart-container-medium">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" dataKey="price_per_million" name="Price" tickFormatter={(value) => `$${Number(value).toFixed(2)}`} domain={[0, 'dataMax + 0.4']} tick={{ fontSize: 12 }} />
                <YAxis type="number" dataKey="score" name="Score" domain={['dataMin - 2', 'dataMax + 2']} tick={{ fontSize: 12 }} />
                <Tooltip content={<PointTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                <Scatter name="Benchmarks" data={data?.benchmarks.points ?? []}>
                  {(data?.benchmarks.points ?? []).map((point: BenchmarkPoint) => (
                    <Cell key={point.model_id} fill={point.color} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div className="rank-list two-column">
            {benchmarkTop.map((point, index) => (
              <div key={point.model_id} className="rank-row detailed-row">
                <span className="rank-index">{index + 1}.</span>
                <span className="rank-dot" style={{ backgroundColor: point.color }} />
                <div className="rank-main-text">
                  <span className="rank-name">{point.model_name}</span>
                  <span className="rank-sub">by {point.company_name}</span>
                </div>
                <span className="rank-value">{point.score.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="ranking-card-section">
          <div className="chart-title-row">
            <div className="section-header section-header-tight">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
              </svg>
              <h2>Fastest models</h2>
            </div>
          </div>
          <p className="section-subtitle">Compare throughput and price across providers</p>

          <div className="chart-container chart-container-medium">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" dataKey="price_per_million" name="Price" tickFormatter={(value) => `$${Number(value).toFixed(2)}`} domain={[0, 'dataMax + 0.2']} tick={{ fontSize: 12 }} />
                <YAxis type="number" dataKey="throughput_tps" name="Throughput" tickFormatter={(value) => `${Math.round(Number(value))} tok/s`} domain={[0, 'dataMax + 80']} tick={{ fontSize: 12 }} />
                <Tooltip content={<PointTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                <Scatter name="Fastest" data={data?.fastest_models.points ?? []}>
                  {(data?.fastest_models.points ?? []).map((point: FastestModelPoint) => (
                    <Cell key={point.model_id} fill={point.color} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div className="rank-list two-column">
            {fastestTop.map((point, index) => (
              <div key={point.model_id} className="rank-row detailed-row">
                <span className="rank-index">{index + 1}.</span>
                <span className="rank-dot" style={{ backgroundColor: point.color }} />
                <div className="rank-main-text">
                  <span className="rank-name">{point.model_name}</span>
                  <span className="rank-sub">fastest on {point.provider_name}</span>
                </div>
                <span className="rank-value">{Math.round(point.throughput_tps)} tok/s</span>
              </div>
            ))}
          </div>
        </section>

        {data && (
          <>
            <DistributionSection data={data.top_models} iconPath="M18 20V10M12 20V4M6 20v-6" />

            <DistributionSection
              data={data.categories}
              iconPath="M20 7l-8-5-8 5 8 5 8-5zM4 17l8 5 8-5M4 12l8 5 8-5"
              rightControl={(
                <select className="section-control-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                  <option value="Programming">Programming</option>
                  <option value="General">General</option>
                  <option value="Reasoning">Reasoning</option>
                  <option value="Vision">Vision</option>
                </select>
              )}
            />

            <DistributionSection
              data={data.languages}
              iconPath="M5 8l6 6M4 14h13M15 4h5v5M16 14l3-3 3 3M19 11v9"
              rightControl={(
                <select className="section-control-select" value={languageFilter} onChange={(e) => setLanguageFilter(e.target.value)}>
                  <option value="English">English</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Spanish">Spanish</option>
                  <option value="Chinese">Chinese</option>
                </select>
              )}
            />

            <DistributionSection
              data={data.programming}
              iconPath="M9 18l-6-6 6-6M15 6l6 6-6 6"
              rightControl={(
                <select className="section-control-select" value={programmingFilter} onChange={(e) => setProgrammingFilter(e.target.value)}>
                  <option value="Python">Python</option>
                  <option value="TypeScript">TypeScript</option>
                  <option value="JavaScript">JavaScript</option>
                  <option value="Java">Java</option>
                </select>
              )}
            />

            <DistributionSection
              data={data.tool_calls}
              iconPath="M14.7 6.3a1 1 0 010 1.4l-7 7a1 1 0 01-1.4 0l-2.6-2.6a1 1 0 010-1.4l7-7a1 1 0 011.4 0zM16 3l5 5"
            />

            <DistributionSection
              data={data.images}
              iconPath="M4 5h16v14H4zM8 11l2 2 4-4 3 3"
            />
          </>
        )}

        <section className="leaderboard-section">
          <div className="leaderboard-header">
            <div className="leaderboard-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 21h8M12 17V3M6 8l6-5 6 5" />
              </svg>
              <h2>LLM Leaderboard</h2>
            </div>
            <select
              className="period-select"
              value={period}
              onChange={(e) => setPeriod(e.target.value as 'week' | 'month' | 'all')}
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="all">All Time</option>
            </select>
          </div>

          <p className="section-subtitle">Compare the most popular models on OrchSutra.ai</p>

          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Model</th>
                <th>Tokens Used</th>
                <th>Trend</th>
              </tr>
            </thead>
            <tbody>
              {data?.leaderboard.entries.map((entry: LeaderboardEntry) => (
                <tr key={entry.model_id}>
                  <td className={`rank-cell ${entry.rank <= 3 ? 'top-3' : ''}`}>
                    #{entry.rank}
                  </td>
                  <td>
                    <div className="model-cell">
                      <div className="model-logo">
                        {entry.logo_url ? (
                          <img src={entry.logo_url} alt={entry.model_name} />
                        ) : (
                          entry.model_name.charAt(0)
                        )}
                      </div>
                      <div className="model-info">
                        <h4>{entry.model_name}</h4>
                        <span>{entry.company_name}</span>
                      </div>
                    </div>
                  </td>
                  <td className="tokens-cell">{entry.tokens_display} tokens</td>
                  <td>
                    <div className={`trend-cell trend-${entry.trend}`}>
                      <TrendIcon trend={entry.trend} />
                      {entry.change_percent !== undefined && (
                        <span>{Math.abs(entry.change_percent).toFixed(1)}%</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
      <Footer />
    </>
  );
}
