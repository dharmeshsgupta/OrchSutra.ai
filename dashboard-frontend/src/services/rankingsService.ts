import apiClient from './apiClient';

export interface ModelUsagePoint {
  model_id: string;
  model_name: string;
  tokens: number;
  color: string;
}

export interface WeeklyUsageData {
  week_start: string;
  week_end: string;
  models: ModelUsagePoint[];
  total_tokens: number;
}

export interface TopModelsChartData {
  weeks: WeeklyUsageData[];
}

export interface MarketShareProviderPoint {
  provider_id: string;
  provider_name: string;
  share_percent: number;
  color: string;
}

export interface MarketShareWeek {
  week_start: string;
  week_end: string;
  providers: MarketShareProviderPoint[];
}

export interface MarketShareData {
  weeks: MarketShareWeek[];
}

export interface BenchmarkPoint {
  model_id: string;
  model_name: string;
  company_name: string;
  score: number;
  price_per_million: number;
  color: string;
}

export interface BenchmarksData {
  metric: string;
  points: BenchmarkPoint[];
}

export interface FastestModelPoint {
  model_id: string;
  model_name: string;
  provider_name: string;
  throughput_tps: number;
  latency_ms: number;
  price_per_million: number;
  color: string;
}

export interface FastestModelsData {
  metric: string;
  points: FastestModelPoint[];
}

export interface DistributionPoint {
  item_id: string;
  item_name: string;
  value: number;
  share_percent: number;
  color: string;
  subtitle?: string;
}

export interface DistributionWeek {
  week_start: string;
  week_end: string;
  items: DistributionPoint[];
  total_value: number;
}

export interface DistributionChartData {
  title: string;
  subtitle: string;
  metric: string;
  weeks: DistributionWeek[];
}

export interface LeaderboardEntry {
  rank: number;
  model_id: string;
  model_name: string;
  company_name: string;
  logo_url?: string;
  total_tokens: number;
  tokens_display: string;
  change_percent?: number;
  trend: 'up' | 'down' | 'stable';
}

export interface LeaderboardData {
  period: string;
  entries: LeaderboardEntry[];
  updated_at: string;
}

export interface RankingsOverview {
  top_models_chart: TopModelsChartData;
  market_share: MarketShareData;
  benchmarks: BenchmarksData;
  fastest_models: FastestModelsData;
  top_models: DistributionChartData;
  categories: DistributionChartData;
  languages: DistributionChartData;
  programming: DistributionChartData;
  tool_calls: DistributionChartData;
  images: DistributionChartData;
  leaderboard: LeaderboardData;
}

const mockModels = [
  { model_id: '1', model_name: 'MiniMax M3.5', company_name: 'MiniMax', color: '#ec4899' },
  { model_id: '2', model_name: 'Claude Sonnet 4.5', company_name: 'Anthropic', color: '#3b82f6' },
  { model_id: '3', model_name: 'Grok Code Fast 1', company_name: 'xAI', color: '#f97316' },
  { model_id: '4', model_name: 'Gemini 3 Flash Preview', company_name: 'Google', color: '#84cc16' },
  { model_id: '5', model_name: 'DeepSeek V3.2', company_name: 'DeepSeek', color: '#14b8a6' },
];

const marketShareProviders = [
  { provider_id: 'openrouter', provider_name: 'OpenRouter', color: '#d4a017' },
  { provider_id: 'google', provider_name: 'Google', color: '#10b981' },
  { provider_id: 'anthropic', provider_name: 'Anthropic', color: '#1d82e6' },
  { provider_id: 'openai', provider_name: 'OpenAI', color: '#ff6b4a' },
  { provider_id: 'deepseek', provider_name: 'DeepSeek', color: '#f7b32b' },
  { provider_id: 'stepfun', provider_name: 'StepFun', color: '#ff4d00' },
  { provider_id: 'minimax', provider_name: 'MiniMax', color: '#43b581' },
  { provider_id: 'z-ai', provider_name: 'Z-AI', color: '#638c1c' },
  { provider_id: 'x-ai', provider_name: 'xAI', color: '#7367f0' },
  { provider_id: 'others', provider_name: 'Others', color: '#f472b6' },
];

const formatTokens = (tokens: number): string => {
  if (tokens >= 1_000_000_000_000) {
    return `${(tokens / 1_000_000_000_000).toFixed(2)}T`;
  }
  if (tokens >= 1_000_000_000) {
    return `${Math.round(tokens / 1_000_000_000)}B`;
  }
  if (tokens >= 1_000_000) {
    return `${Math.round(tokens / 1_000_000)}M`;
  }
  return String(tokens);
};

const buildMockChart = (): TopModelsChartData => {
  const weeks: WeeklyUsageData[] = [
    { week_start: '06 Jan 2026', week_end: '12 Jan 2026', total_tokens: 4_920_000_000_000, models: [] },
    { week_start: '13 Jan 2026', week_end: '19 Jan 2026', total_tokens: 5_440_000_000_000, models: [] },
    { week_start: '20 Jan 2026', week_end: '26 Jan 2026', total_tokens: 6_130_000_000_000, models: [] },
    { week_start: '27 Jan 2026', week_end: '02 Feb 2026', total_tokens: 7_020_000_000_000, models: [] },
    { week_start: '03 Feb 2026', week_end: '09 Feb 2026', total_tokens: 8_240_000_000_000, models: [] },
    { week_start: '10 Feb 2026', week_end: '16 Feb 2026', total_tokens: 9_380_000_000_000, models: [] },
    { week_start: '17 Feb 2026', week_end: '23 Feb 2026', total_tokens: 10_920_000_000_000, models: [] },
    { week_start: '24 Feb 2026', week_end: '02 Mar 2026', total_tokens: 12_410_000_000_000, models: [] },
  ];

  const shares = [0.38, 0.17, 0.13, 0.11, 0.08];

  return {
    weeks: weeks.map((week) => {
      const models = mockModels.map((model, index) => ({
        model_id: model.model_id,
        model_name: model.model_name,
        tokens: Math.floor(week.total_tokens * shares[index]),
        color: model.color,
      }));

      const knownTotal = models.reduce((sum, model) => sum + model.tokens, 0);
      models.push({
        model_id: 'others',
        model_name: 'Others',
        tokens: Math.max(week.total_tokens - knownTotal, 0),
        color: '#9ca3af',
      });

      return {
        ...week,
        models,
      };
    }),
  };
};

const buildMockLeaderboard = (period: 'week' | 'month' | 'all' = 'week'): LeaderboardData => {
  const periodLabel = {
    week: 'This Week',
    month: 'This Month',
    all: 'All Time',
  }[period];

  const totals = {
    week: [2_010_000_000_000, 531_000_000_000, 413_000_000_000, 387_000_000_000, 311_000_000_000],
    month: [6_420_000_000_000, 1_980_000_000_000, 1_420_000_000_000, 1_210_000_000_000, 990_000_000_000],
    all: [31_700_000_000_000, 10_300_000_000_000, 8_220_000_000_000, 7_510_000_000_000, 6_300_000_000_000],
  }[period];

  return {
    period: periodLabel,
    updated_at: new Date().toISOString(),
    entries: mockModels.map((model, index) => ({
      rank: index + 1,
      model_id: model.model_id,
      model_name: model.model_name,
      company_name: model.company_name,
      total_tokens: totals[index],
      tokens_display: formatTokens(totals[index]),
      trend: index % 3 === 0 ? 'up' : index % 3 === 1 ? 'stable' : 'down',
      change_percent: index % 3 === 0 ? 12.4 : index % 3 === 1 ? 1.2 : -3.8,
    })),
  };
};

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

const buildMockMarketShare = (): MarketShareData => {
  const weeks: MarketShareWeek[] = [];
  const start = new Date('2025-03-16T00:00:00Z');
  const baseShares = [14.6, 14.4, 11.7, 11.0, 8.7, 8.5, 6.4, 4.9, 3.3, 16.5];

  for (let i = 0; i < 52; i += 1) {
    const weekStart = new Date(start);
    weekStart.setUTCDate(start.getUTCDate() + i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekStart.getUTCDate() + 6);

    const oscillated = baseShares.map((share, index) => {
      const wave = Math.sin(i * 0.24 + index * 0.8) * 1.8;
      const trend = Math.cos(i * 0.09 + index * 0.3) * 0.9;
      return clamp(share + wave + trend, 1.5, 32);
    });

    const total = oscillated.reduce((sum, value) => sum + value, 0);

    const providers = marketShareProviders.map((provider, index) => ({
      provider_id: provider.provider_id,
      provider_name: provider.provider_name,
      share_percent: Number(((oscillated[index] / total) * 100).toFixed(2)),
      color: provider.color,
    }));

    weeks.push({
      week_start: weekStart.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      week_end: weekEnd.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      providers,
    });
  }

  return { weeks };
};

const buildMockBenchmarks = (): BenchmarksData => {
  return {
    metric: 'Intelligence Index Score',
    points: [
      { model_id: 'b1', model_name: 'Gemini 3.1 Pro Preview', company_name: 'Google', score: 57.2, price_per_million: 2.0, color: '#f7b32b' },
      { model_id: 'b2', model_name: 'GPT-5.4', company_name: 'OpenAI', score: 57.0, price_per_million: 2.5, color: '#43a371' },
      { model_id: 'b3', model_name: 'GPT-5.3-Codex', company_name: 'OpenAI', score: 54.0, price_per_million: 1.8, color: '#31925d' },
      { model_id: 'b4', model_name: 'Claude Opus 4.6', company_name: 'Anthropic', score: 53.0, price_per_million: 5.0, color: '#f9844a' },
      { model_id: 'b5', model_name: 'Claude Sonnet 4.6', company_name: 'Anthropic', score: 51.7, price_per_million: 3.2, color: '#f77f42' },
      { model_id: 'b6', model_name: 'GPT-5.2', company_name: 'OpenAI', score: 51.3, price_per_million: 1.9, color: '#2f8f58' },
      { model_id: 'b7', model_name: 'GLM 5', company_name: 'Z-AI', score: 49.8, price_per_million: 0.8, color: '#9acb45' },
      { model_id: 'b8', model_name: 'Claude Opus 4.5', company_name: 'Anthropic', score: 49.7, price_per_million: 5.0, color: '#f39a66' },
      { model_id: 'b9', model_name: 'Gemini 3 Pro Preview', company_name: 'Google', score: 48.4, price_per_million: 1.4, color: '#f5bf53' },
      { model_id: 'b10', model_name: 'GPT-5.1', company_name: 'OpenAI', score: 47.7, price_per_million: 1.3, color: '#3f9967' },
      { model_id: 'b11', model_name: 'Mistral Large 2', company_name: 'Mistral AI', score: 47.0, price_per_million: 0.55, color: '#7ea7ce' },
      { model_id: 'b12', model_name: 'Qwen3 32B', company_name: 'Qwen', score: 46.8, price_per_million: 0.5, color: '#f27f64' },
    ],
  };
};

const buildMockFastestModels = (): FastestModelsData => {
  return {
    metric: 'Highest throughput',
    points: [
      { model_id: 'f1', model_name: 'gpt-oss-safeguard-20b', provider_name: 'Groq', throughput_tps: 814, latency_ms: 75, price_per_million: 0.07, color: '#58d3ce' },
      { model_id: 'f2', model_name: 'gpt-oss-20b', provider_name: 'Groq', throughput_tps: 757, latency_ms: 82, price_per_million: 0.07, color: '#4bc7c2' },
      { model_id: 'f3', model_name: 'gpt-oss-120b', provider_name: 'Groq', throughput_tps: 385, latency_ms: 145, price_per_million: 0.15, color: '#4bc7c2' },
      { model_id: 'f4', model_name: 'Qwen3 32B', provider_name: 'Groq', throughput_tps: 318, latency_ms: 160, price_per_million: 0.29, color: '#f06db7' },
      { model_id: 'f5', model_name: 'o3 Mini', provider_name: 'OpenAI', throughput_tps: 265, latency_ms: 210, price_per_million: 1.1, color: '#43c8c1' },
      { model_id: 'f6', model_name: 'Llama 3.1 8B Instruct', provider_name: 'Groq', throughput_tps: 253, latency_ms: 135, price_per_million: 0.05, color: '#ff6a4d' },
      { model_id: 'f7', model_name: 'Nemotron 3 Nano 30B A3B', provider_name: 'Nvidia', throughput_tps: 225, latency_ms: 210, price_per_million: 0.0, color: '#c26be2' },
      { model_id: 'f8', model_name: 'MiniMax M2.5', provider_name: 'SambaNova', throughput_tps: 211, latency_ms: 180, price_per_million: 0.3, color: '#4a81b8' },
      { model_id: 'f9', model_name: 'Gemini 2.5 Flash Lite', provider_name: 'Google AI Studio', throughput_tps: 198, latency_ms: 200, price_per_million: 0.1, color: '#f3b128' },
      { model_id: 'f10', model_name: 'Gemini 2.5 Flash Lite Preview', provider_name: 'Google', throughput_tps: 178, latency_ms: 220, price_per_million: 0.1, color: '#f3b128' },
    ],
  };
};

const weekDateLabel = (date: Date): string => {
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const defaultColorPalette = [
  '#1d82e6', '#08b9a7', '#f7b32b', '#ff6b4a', '#8bc34a',
  '#43b581', '#6f61e8', '#d9a82f', '#7f1d9e', '#f062b0',
  '#4d90c6', '#c06ad6', '#ff4d00', '#5b8e1d', '#2ac4c4',
];

const createDistributionWeeks = (
  itemSeed: Array<{ id: string; name: string; subtitle: string; baseShare: number; color?: string }>,
  totalSeed: number,
  weeks: number,
  volatility: number,
): DistributionWeek[] => {
  const results: DistributionWeek[] = [];
  const start = new Date('2025-12-15T00:00:00Z');

  for (let i = 0; i < weeks; i += 1) {
    const weekStart = new Date(start);
    weekStart.setUTCDate(start.getUTCDate() + i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekStart.getUTCDate() + 6);

    const total = Math.max(
      1,
      Math.floor(totalSeed * (0.8 + i * 0.02 + Math.sin(i * 0.33) * 0.15))
    );

    const rawShares = itemSeed.map((item, index) => {
      const wave = Math.sin(i * 0.27 + index * 0.65) * volatility;
      const trend = Math.cos(i * 0.08 + index * 0.31) * (volatility * 0.6);
      return clamp(item.baseShare + wave + trend, 0.3, 85);
    });

    const rawTotal = rawShares.reduce((sum, value) => sum + value, 0);

    const items = itemSeed.map((item, index) => {
      const share = (rawShares[index] / rawTotal) * 100;
      return {
        item_id: item.id,
        item_name: item.name,
        subtitle: item.subtitle,
        share_percent: Number(share.toFixed(2)),
        value: Math.floor(total * (share / 100)),
        color: item.color ?? defaultColorPalette[index % defaultColorPalette.length],
      };
    });

    const used = items.reduce((sum, item) => sum + item.value, 0);
    const delta = total - used;
    if (delta !== 0 && items.length > 0) {
      items[0].value += delta;
    }

    results.push({
      week_start: weekDateLabel(weekStart),
      week_end: weekDateLabel(weekEnd),
      items,
      total_value: total,
    });
  }

  return results;
};

const buildTopModelsChart = (): DistributionChartData => {
  return {
    title: 'Top Models',
    subtitle: 'Weekly usage of models across OpenRouter',
    metric: 'tokens',
    weeks: createDistributionWeeks([
      { id: 'others', name: 'Others', subtitle: 'by unknown', baseShare: 43, color: '#f062b0' },
      { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', subtitle: 'by anthropic', baseShare: 12, color: '#08b9a7' },
      { id: 'gemini-2-flash', name: 'Gemini 2.0 Flash', subtitle: 'by google', baseShare: 10, color: '#1d82e6' },
      { id: 'deepseek-v3', name: 'DeepSeek V3', subtitle: 'by deepseek', baseShare: 8, color: '#43b581' },
      { id: 'gemini-2-5-flash-lite', name: 'Gemini 2.5 Flash Lite', subtitle: 'by google', baseShare: 7, color: '#f7b32b' },
      { id: 'claude-3-7-sonnet', name: 'Claude 3.7 Sonnet', subtitle: 'by anthropic', baseShare: 6, color: '#6f61e8' },
      { id: 'gemini-2-5-pro', name: 'Gemini 2.5 Pro', subtitle: 'by google', baseShare: 5, color: '#ff6b4a' },
      { id: 'gpt-4-1-mini', name: 'GPT-4.1 Mini', subtitle: 'by openai', baseShare: 4, color: '#5b8e1d' },
      { id: 'claude-opus-4-5', name: 'Claude Opus 4.5', subtitle: 'by anthropic', baseShare: 3.5, color: '#d9a82f' },
      { id: 'grok-4-1-fast', name: 'Grok 4.1 Fast', subtitle: 'by x-ai', baseShare: 3, color: '#7f1d9e' },
    ], 2_360_000_000_000, 52, 1.8),
  };
};

const buildCategoriesChart = (): DistributionChartData => {
  return {
    title: 'Categories',
    subtitle: 'Compare models by usecase on OpenRouter',
    metric: 'tokens',
    weeks: createDistributionWeeks([
      { id: 'reasoning', name: 'Reasoning', subtitle: 'category', baseShare: 31, color: '#f062b0' },
      { id: 'chat', name: 'Chat', subtitle: 'category', baseShare: 18, color: '#4d90c6' },
      { id: 'coding', name: 'Coding', subtitle: 'category', baseShare: 12, color: '#08b9a7' },
      { id: 'vision', name: 'Vision', subtitle: 'category', baseShare: 9, color: '#ff6b4a' },
      { id: 'translation', name: 'Translation', subtitle: 'category', baseShare: 7, color: '#f7b32b' },
      { id: 'agentic', name: 'Agentic', subtitle: 'category', baseShare: 6, color: '#8bc34a' },
      { id: 'multimodal', name: 'Multimodal', subtitle: 'category', baseShare: 5.5, color: '#6f61e8' },
      { id: 'math', name: 'Math', subtitle: 'category', baseShare: 4.8, color: '#d9a82f' },
      { id: 'safety', name: 'Safety', subtitle: 'category', baseShare: 3.7, color: '#43b581' },
      { id: 'others', name: 'Others', subtitle: 'category', baseShare: 3, color: '#7f1d9e' },
    ], 1_050_000_000_000, 42, 2.1),
  };
};

const buildLanguagesChart = (): DistributionChartData => {
  return {
    title: 'Languages',
    subtitle: 'Compare models by natural language on OpenRouter',
    metric: 'tokens',
    weeks: createDistributionWeeks([
      { id: 'english', name: 'English', subtitle: 'language', baseShare: 41, color: '#f062b0' },
      { id: 'chinese', name: 'Chinese', subtitle: 'language', baseShare: 16, color: '#1d82e6' },
      { id: 'hindi', name: 'Hindi', subtitle: 'language', baseShare: 9, color: '#08b9a7' },
      { id: 'spanish', name: 'Spanish', subtitle: 'language', baseShare: 7, color: '#f7b32b' },
      { id: 'german', name: 'German', subtitle: 'language', baseShare: 6.4, color: '#ff6b4a' },
      { id: 'french', name: 'French', subtitle: 'language', baseShare: 5.8, color: '#8bc34a' },
      { id: 'japanese', name: 'Japanese', subtitle: 'language', baseShare: 5.3, color: '#43b581' },
      { id: 'korean', name: 'Korean', subtitle: 'language', baseShare: 3.8, color: '#6f61e8' },
      { id: 'arabic', name: 'Arabic', subtitle: 'language', baseShare: 2.9, color: '#d9a82f' },
      { id: 'others', name: 'Others', subtitle: 'language', baseShare: 2.8, color: '#7f1d9e' },
    ], 1_400_000_000_000, 28, 1.6),
  };
};

const buildProgrammingChart = (): DistributionChartData => {
  return {
    title: 'Programming',
    subtitle: 'Compare models by programming language on OpenRouter',
    metric: 'tokens',
    weeks: createDistributionWeeks([
      { id: 'python', name: 'Python', subtitle: 'programming', baseShare: 46, color: '#f062b0' },
      { id: 'typescript', name: 'TypeScript', subtitle: 'programming', baseShare: 13, color: '#1d82e6' },
      { id: 'javascript', name: 'JavaScript', subtitle: 'programming', baseShare: 11, color: '#08b9a7' },
      { id: 'java', name: 'Java', subtitle: 'programming', baseShare: 8.5, color: '#f7b32b' },
      { id: 'cpp', name: 'C++', subtitle: 'programming', baseShare: 7.5, color: '#ff6b4a' },
      { id: 'go', name: 'Go', subtitle: 'programming', baseShare: 5.1, color: '#8bc34a' },
      { id: 'rust', name: 'Rust', subtitle: 'programming', baseShare: 3.9, color: '#43b581' },
      { id: 'csharp', name: 'C#', subtitle: 'programming', baseShare: 2.8, color: '#6f61e8' },
      { id: 'php', name: 'PHP', subtitle: 'programming', baseShare: 1.7, color: '#d9a82f' },
      { id: 'others', name: 'Others', subtitle: 'programming', baseShare: 1.5, color: '#7f1d9e' },
    ], 820_000_000_000, 28, 1.5),
  };
};

const buildToolCallsChart = (): DistributionChartData => {
  return {
    title: 'Tool Calls',
    subtitle: 'Tool usage across models on OpenRouter',
    metric: 'calls',
    weeks: createDistributionWeeks([
      { id: 'minimax-m2-5', name: 'MiniMax M2.5', subtitle: 'by minimax', baseShare: 13.4, color: '#08b9a7' },
      { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', subtitle: 'by google', baseShare: 9.6, color: '#6f61e8' },
      { id: 'step-3-5', name: 'Step 3.5 Flash (free)', subtitle: 'by stepfun', baseShare: 7.4, color: '#c06ad6' },
      { id: 'gemini-2-5-flash', name: 'Gemini 2.5 Flash', subtitle: 'by google', baseShare: 5.2, color: '#1d82e6' },
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', subtitle: 'by anthropic', baseShare: 5.1, color: '#8bc34a' },
      { id: 'kimi-k2-5', name: 'Kimi K2.5', subtitle: 'by moonshotai', baseShare: 4.4, color: '#7f1d9e' },
      { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', subtitle: 'by anthropic', baseShare: 4.2, color: '#f7b32b' },
      { id: 'trinity-large-preview', name: 'Trinity Large Preview (free)', subtitle: 'by arcee-ai', baseShare: 3.5, color: '#4d90c6' },
      { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', subtitle: 'by anthropic', baseShare: 2.7, color: '#2ac4c4' },
      { id: 'others', name: 'Others', subtitle: 'by unknown', baseShare: 44.5, color: '#f062b0' },
    ], 191_000_000, 13, 2.2),
  };
};

const buildImagesChart = (): DistributionChartData => {
  return {
    title: 'Images',
    subtitle: 'Total images processed on OpenRouter',
    metric: 'images',
    weeks: createDistributionWeeks([
      { id: 'gemini-2-5-flash-lite', name: 'Gemini 2.5 Flash Lite', subtitle: 'by google', baseShare: 37.1, color: '#1d82e6' },
      { id: 'gpt-4-1-mini', name: 'GPT-4.1 Mini', subtitle: 'by openai', baseShare: 11.3, color: '#ff4d00' },
      { id: 'gemini-3-1-flash-preview', name: 'Gemini 3.1 Flash Preview', subtitle: 'by google', baseShare: 7.6, color: '#d9a82f' },
      { id: 'qwen3-vl-8b', name: 'Qwen3 VL 8B Instruct', subtitle: 'by qwen', baseShare: 7.3, color: '#43b581' },
      { id: 'gemini-2-5-flash', name: 'Gemini 2.5 Flash', subtitle: 'by google', baseShare: 5.6, color: '#f77f42' },
      { id: 'gemini-2-0-flash', name: 'Gemini 2.0 Flash', subtitle: 'by google', baseShare: 1.7, color: '#f7b32b' },
      { id: 'gemini-3-1-flash-lite-preview', name: 'Gemini 3.1 Flash Lite Preview', subtitle: 'by google', baseShare: 1.6, color: '#f5bf53' },
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', subtitle: 'by anthropic', baseShare: 1.6, color: '#08b9a7' },
      { id: 'gpt-5-mini', name: 'GPT-5 Mini', subtitle: 'by openai', baseShare: 1.4, color: '#ff6b4a' },
      { id: 'others', name: 'Others', subtitle: 'by unknown', baseShare: 25.0, color: '#f062b0' },
    ], 420_000_000, 13, 1.8),
  };
};

const ensureOverviewShape = (value: Partial<RankingsOverview> | undefined): RankingsOverview => {
  return {
    top_models_chart: value?.top_models_chart ?? buildMockChart(),
    market_share: value?.market_share ?? buildMockMarketShare(),
    benchmarks: value?.benchmarks ?? buildMockBenchmarks(),
    fastest_models: value?.fastest_models ?? buildMockFastestModels(),
    top_models: value?.top_models ?? buildTopModelsChart(),
    categories: value?.categories ?? buildCategoriesChart(),
    languages: value?.languages ?? buildLanguagesChart(),
    programming: value?.programming ?? buildProgrammingChart(),
    tool_calls: value?.tool_calls ?? buildToolCallsChart(),
    images: value?.images ?? buildImagesChart(),
    leaderboard: value?.leaderboard ?? buildMockLeaderboard('week'),
  };
};

export const rankingsService = {
  /**
   * Get complete rankings page data (chart + leaderboard)
   */
  async getRankingsOverview(): Promise<RankingsOverview> {
    try {
      const response = await apiClient.get('/rankings/');
      return ensureOverviewShape(response.data as Partial<RankingsOverview>);
    } catch (error) {
      console.warn('Rankings API unavailable, using fallback data.', error);
      return ensureOverviewShape(undefined);
    }
  },

  /**
   * Get chart data for Top Models stacked bar chart
   */
  async getTopModelsChart(weeks: number = 52): Promise<TopModelsChartData> {
    try {
      const response = await apiClient.get('/rankings/chart', {
        params: { weeks }
      });
      return response.data;
    } catch (error) {
      console.warn('Chart API unavailable, using fallback data.', error);
      return buildMockChart();
    }
  },

  /**
   * Get leaderboard for a specific period
   */
  async getLeaderboard(period: 'week' | 'month' | 'all' = 'week'): Promise<LeaderboardData> {
    try {
      const response = await apiClient.get('/rankings/leaderboard', {
        params: { period }
      });
      return response.data;
    } catch (error) {
      console.warn('Leaderboard API unavailable, using fallback data.', error);
      return buildMockLeaderboard(period);
    }
  },

  async getMarketShare(weeks: number = 52): Promise<MarketShareData> {
    try {
      const response = await apiClient.get('/rankings/market-share', {
        params: { weeks }
      });
      return response.data;
    } catch (error) {
      console.warn('Market share API unavailable, using fallback data.', error);
      return buildMockMarketShare();
    }
  },

  async getBenchmarks(): Promise<BenchmarksData> {
    try {
      const response = await apiClient.get('/rankings/benchmarks');
      return response.data;
    } catch (error) {
      console.warn('Benchmarks API unavailable, using fallback data.', error);
      return buildMockBenchmarks();
    }
  },

  async getFastestModels(): Promise<FastestModelsData> {
    try {
      const response = await apiClient.get('/rankings/fastest');
      return response.data;
    } catch (error) {
      console.warn('Fastest models API unavailable, using fallback data.', error);
      return buildMockFastestModels();
    }
  }
};
