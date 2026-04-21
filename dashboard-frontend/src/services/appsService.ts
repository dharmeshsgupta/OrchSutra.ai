import apiClient from './apiClient';

export interface AppSummary {
  id: string;
  name: string;
  subtitle: string;
  tokens: string;
  rank: string;
  activeSince: string;
  modelsUsed: number;
  categories: string[];
  icon: string;
  accent: string;
  officialUrl: string;
}

export interface TrendingApp {
  id: string;
  name: string;
  volume: string;
  growth: string;
  icon: string;
}

export interface LeaderboardApp {
  id: string;
  name: string;
  subtitle: string;
  tokens: string;
  icon: string;
}

export interface GlobalRankingApp extends LeaderboardApp {
  tags?: string[];
}

export interface UsageSlice {
  model: string;
  provider: string;
  tokens: number;
  color: string;
}

export interface DailyUsage {
  date: string;
  slices: UsageSlice[];
}

export interface AppModelUsage {
  model: string;
  provider: string;
  tokens: string;
}

export interface AppDetail extends AppSummary {
  usage: DailyUsage[];
  topModels: AppModelUsage[];
}

export interface AppsOverview {
  mostPopular: AppSummary[];
  trending: TrendingApp[];
  topCodingAgents: LeaderboardApp[];
  topProductivity: LeaderboardApp[];
  topCreative: LeaderboardApp[];
  topEntertainment: LeaderboardApp[];
  globalRanking: GlobalRankingApp[];
}

const fallbackOverview: AppsOverview = {
  mostPopular: [
    {
      id: 'openclaw',
      name: 'OpenClaw',
      subtitle: 'The AI that actually does things',
      tokens: '12.9T',
      rank: '#1',
      activeSince: 'Jan 2026',
      modelsUsed: 348,
      categories: ['#1 in Productivity', '#1 in Personal Agents'],
      icon: '🦀',
      accent: '#8bb8ff',
      officialUrl: 'https://openclaw.ai/',
    },
    {
      id: 'kilo-code',
      name: 'Kilo Code',
      subtitle: 'AI coding agent for VS Code',
      tokens: '5.12T',
      rank: '#2',
      activeSince: 'Apr 2025',
      modelsUsed: 337,
      categories: ['#1 in Coding Agents', '#1 in CLI Agents'],
      icon: '⌘',
      accent: '#c6a0ff',
      officialUrl: 'https://kilocode.ai/',
    },
    {
      id: 'blackboxai',
      name: 'BLACKBOXAI',
      subtitle: 'AI agent for builders',
      tokens: '1.72T',
      rank: '#13',
      activeSince: 'Sep 2025',
      modelsUsed: 309,
      categories: ['#3 in Cloud Agents', '#6 in CLI Agents'],
      icon: '⬢',
      accent: '#95d8a5',
      officialUrl: 'https://www.blackbox.ai/',
    },
    {
      id: 'claude-code',
      name: 'Claude Code',
      subtitle: 'The AI for problem solvers',
      tokens: '1.48T',
      rank: '#3',
      activeSince: 'Dec 2025',
      modelsUsed: 245,
      categories: ['#2 in Coding Agents', '#2 in CLI Agents'],
      icon: '✺',
      accent: '#f0c59f',
      officialUrl: 'https://claude.ai/',
    },
  ],
  trending: [
    { id: 'openclaw', name: 'OpenClaw', volume: '4.73T', growth: '+73%', icon: '🦀' },
    { id: 'claude-code', name: 'Claude Code', volume: '596B', growth: '+101%', icon: '✺' },
    { id: 'hermes-agent', name: 'Hermes Agent', volume: '96.6B', growth: '+496%', icon: '🛰' },
    { id: 'nbc-cdd', name: 'NBC CDD Review Agent', volume: '68.4B', growth: '+1758%', icon: '🧿' },
    { id: 'studs', name: 'Studs.gg', volume: '27.1B', growth: '+100%', icon: '🟦' },
    { id: 'janitor-ai', name: 'Janitor AI', volume: '237B', growth: '+7%', icon: '🧼' },
  ],
  topCodingAgents: [
    { id: 'kilo-code', name: 'Kilo Code', subtitle: 'AI coding agent for VS Code', tokens: '182B tokens', icon: '⌘' },
    { id: 'claude-code', name: 'Claude Code', subtitle: 'The AI for problem solvers', tokens: '90.9B tokens', icon: '✺' },
    { id: 'cline', name: 'Cline', subtitle: 'Autonomous coding agent right in your IDE', tokens: '59.5B tokens', icon: '⚙' },
    { id: 'roo-code', name: 'Roo Code', subtitle: 'Open-source coding assistant', tokens: '43.1B tokens', icon: '🦘' },
    { id: 'continue', name: 'Continue', subtitle: 'Code with custom AI workflows', tokens: '31.8B tokens', icon: '▶' },
  ],
  topProductivity: [
    { id: 'openclaw', name: 'OpenClaw', subtitle: 'The AI that actually does things', tokens: '711B tokens', icon: '🦀' },
    { id: 'hermes-agent', name: 'Hermes Agent', subtitle: 'hermes-agent.nousresearch.com', tokens: '12.7B tokens', icon: '🛰' },
    { id: 'open-webui', name: 'Open WebUI', subtitle: 'Extensible, self-hosted AI interface', tokens: '4.44B tokens', icon: '◉' },
    { id: 'gobi', name: 'Gobi', subtitle: 'Workspace automations with AI', tokens: '2.36B tokens', icon: '🏔' },
    { id: 'janitor-ai', name: 'Janitor AI', subtitle: 'Conversational productivity co-pilot', tokens: '1.08B tokens', icon: '🧼' },
  ],
  topCreative: [
    { id: 'descript', name: 'Descript', subtitle: 'AI Video & Podcast Editor', tokens: '38B tokens', icon: '🎞' },
    { id: 'vidmuse', name: 'VidMuse', subtitle: 'Generate music videos, shorts, and more', tokens: '3.85B tokens', icon: '🎵' },
    { id: 'novelcrafter', name: 'novelcrafter', subtitle: 'Personal novel writing toolbox', tokens: '830M tokens', icon: '📓' },
    { id: 'coffeecat', name: 'CoffeeCat AI Image Generator', subtitle: 'www.coffeecat.ai', tokens: '598M tokens', icon: '🐱' },
    { id: 'fish-audio', name: 'Fish Audio', subtitle: 'Realistic AI voice generator', tokens: '484M tokens', icon: '🎤' },
  ],
  topEntertainment: [
    { id: 'janitor-ai', name: 'Janitor AI', subtitle: 'Character chat and creation', tokens: '28.5B tokens', icon: '🧼' },
    { id: 'isekai-zero', name: 'ISEKAI ZERO', subtitle: 'AI adventures and roleplay', tokens: '22.8B tokens', icon: '🗺' },
    { id: 'sillytavern', name: 'SillyTavern', subtitle: 'LLM frontend for power users', tokens: '6.94B tokens', icon: '🎭' },
    { id: 'hammerai', name: 'HammerAI', subtitle: 'Chat with AI characters for free', tokens: '6B tokens', icon: '🔨' },
    { id: 'chub-ai', name: 'Chub AI', subtitle: 'GenAI for everyone', tokens: '4.05B tokens', icon: '💬' },
  ],
  globalRanking: [
    { id: 'openclaw', name: 'OpenClaw', subtitle: 'The AI that actually does things', tokens: '711B tokens', icon: '🦀', tags: ['Personal Agents'] },
    { id: 'kilo-code', name: 'Kilo Code', subtitle: 'AI coding agent for VS Code', tokens: '182B tokens', icon: '⌘', tags: ['CLI Agents', 'IDE Extensions'] },
    { id: 'claude-code', name: 'Claude Code', subtitle: 'The AI for problem solvers', tokens: '90.9B tokens', icon: '✺', tags: ['CLI Agents'] },
    { id: 'cline', name: 'Cline', subtitle: 'Autonomous coding agent right in your IDE', tokens: '59.5B tokens', icon: '⚙', tags: ['IDE Extensions', 'CLI Agents'] },
    { id: 'descript', name: 'Descript', subtitle: 'AI video and podcast editor', tokens: '38B tokens', icon: '🎞', tags: ['Video Generation'] },
    { id: 'nbc-cdd', name: 'NBC CDD Review Analysis', subtitle: 'Compliance review assistant', tokens: '37.1B tokens', icon: '🧿', tags: ['Compliance'] },
    { id: 'blackboxai', name: 'BLACKBOXAI', subtitle: 'AI agent for builders', tokens: '10.1B tokens', icon: '⬢', tags: ['Cloud Agents', 'IDE Extensions'] },
    { id: 'lemonade', name: 'Lemonade', subtitle: 'The AI tool for Roblox games', tokens: '9.86B tokens', icon: '🍋', tags: ['Programming App'] },
    { id: 'agent-zero', name: 'Agent Zero', subtitle: 'Build autonomous AI agents', tokens: '7.33B tokens', icon: '🅰', tags: ['Cloud Agents'] },
    { id: 'sillytavern', name: 'SillyTavern', subtitle: 'LLM frontend for power users', tokens: '6.94B tokens', icon: '🎭', tags: ['Roleplay'] },
    { id: 'hammerai', name: 'HammerAI', subtitle: 'Chat with AI characters for free', tokens: '6B tokens', icon: '🔨', tags: ['Roleplay'] },
    { id: 'openhands', name: 'OpenHands', subtitle: 'Open-source coding assistant', tokens: '5.56B tokens', icon: '👐', tags: ['Coding Agents'] },
  ],
};

const fallbackDetails: Record<string, AppDetail> = {
  openclaw: {
    ...fallbackOverview.mostPopular[0],
    usage: [
      { date: '19 Feb', slices: [
        { model: 'Step 3.5 Flash', provider: 'stepfun', tokens: 42, color: '#0ea5e9' },
        { model: 'MiniMax M2.5', provider: 'minimax', tokens: 75, color: '#14b8a6' },
        { model: 'Claude Sonnet 4.5', provider: 'anthropic', tokens: 58, color: '#f59e0b' },
      ] },
      { date: '24 Feb', slices: [
        { model: 'Step 3.5 Flash', provider: 'stepfun', tokens: 48, color: '#0ea5e9' },
        { model: 'MiniMax M2.5', provider: 'minimax', tokens: 79, color: '#14b8a6' },
        { model: 'Claude Sonnet 4.5', provider: 'anthropic', tokens: 62, color: '#f59e0b' },
      ] },
      { date: '01 Mar', slices: [
        { model: 'Step 3.5 Flash', provider: 'stepfun', tokens: 55, color: '#0ea5e9' },
        { model: 'MiniMax M2.5', provider: 'minimax', tokens: 88, color: '#14b8a6' },
        { model: 'Claude Sonnet 4.5', provider: 'anthropic', tokens: 66, color: '#f59e0b' },
      ] },
      { date: '06 Mar', slices: [
        { model: 'Step 3.5 Flash', provider: 'stepfun', tokens: 61, color: '#0ea5e9' },
        { model: 'MiniMax M2.5', provider: 'minimax', tokens: 94, color: '#14b8a6' },
        { model: 'Claude Sonnet 4.5', provider: 'anthropic', tokens: 73, color: '#f59e0b' },
      ] },
      { date: '11 Mar', slices: [
        { model: 'Step 3.5 Flash', provider: 'stepfun', tokens: 78, color: '#0ea5e9' },
        { model: 'MiniMax M2.5', provider: 'minimax', tokens: 118, color: '#14b8a6' },
        { model: 'Claude Sonnet 4.5', provider: 'anthropic', tokens: 92, color: '#f59e0b' },
      ] },
      { date: '16 Mar', slices: [
        { model: 'Step 3.5 Flash', provider: 'stepfun', tokens: 96, color: '#0ea5e9' },
        { model: 'MiniMax M2.5', provider: 'minimax', tokens: 143, color: '#14b8a6' },
        { model: 'Claude Sonnet 4.5', provider: 'anthropic', tokens: 111, color: '#f59e0b' },
      ] },
      { date: '20 Mar', slices: [
        { model: 'Step 3.5 Flash', provider: 'stepfun', tokens: 106, color: '#0ea5e9' },
        { model: 'MiniMax M2.5', provider: 'minimax', tokens: 172, color: '#14b8a6' },
        { model: 'Claude Sonnet 4.5', provider: 'anthropic', tokens: 134, color: '#f59e0b' },
      ] },
    ],
    topModels: [
      { model: 'Step 3.5 Flash', provider: 'stepfun', tokens: '2.29T tokens' },
      { model: 'MiniMax M2.5', provider: 'minimax', tokens: '1.29T tokens' },
      { model: 'Claude Sonnet 4.5', provider: 'anthropic', tokens: '794B tokens' },
      { model: 'Gemini 3.1 Pro', provider: 'google', tokens: '402B tokens' },
    ],
  },
};

const overviewFromDetail = (detail: AppDetail): AppDetail => ({ ...detail });

const API_NOTE =
  'Python TODO: implement backend endpoints GET /apps and GET /apps/:id to make this fully internet-driven with your own ingestion logic.';

export const appsService = {
  async getOverview(): Promise<AppsOverview> {
    try {
      const response = await apiClient.get('/apps');
      return response.data as AppsOverview;
    } catch {
      console.warn(API_NOTE);
      return fallbackOverview;
    }
  },

  async getAppDetail(appId: string): Promise<AppDetail | null> {
    try {
      const response = await apiClient.get(`/apps/${appId}`);
      return response.data as AppDetail;
    } catch {
      console.warn(API_NOTE);
      if (fallbackDetails[appId]) {
        return overviewFromDetail(fallbackDetails[appId]);
      }
      const fromOverview = fallbackOverview.mostPopular.find((item) => item.id === appId);
      if (!fromOverview) return null;
      return {
        ...fromOverview,
        usage: fallbackDetails.openclaw.usage,
        topModels: fallbackDetails.openclaw.topModels,
      };
    }
  },
};
