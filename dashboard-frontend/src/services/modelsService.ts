import apiClient from './apiClient';

export interface Company {
  id: string;
  name: string;
  website: string;
}

export interface Model {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  context_window: number;
  speed_rating: number;
  featured: boolean;
  logo_url: string | null;
  release_date: string | null;
  max_tokens: number;
  company_name: string;
  priority?: number;
  fallback_group?: string | null;
  is_active?: boolean;
}

export interface Provider {
  id: string;
  name: string;
  website: string;
}

export interface ModelProvider {
  id: string;
  providerId: string;
  providerName: string;
  providerWebsite: string;
  inputTokenCost: number;
  outputTokenCost: number;
}

export const ModelsService = {
  /**
   * Get all available models
   */
  getModels: async (): Promise<Model[]> => {
    try {
      const response = await apiClient.get('/models/');
      return response.data.models;
    } catch (error) {
      // Return sample data on failure
      return [
        {
          id: '1',
          name: 'GPT-4 Turbo',
          slug: 'gpt-4-turbo',
          description: 'Most capable GPT-4 model, optimized for speed.',
          context_window: 128000,
          speed_rating: 4.5,
          featured: true,
          logo_url: null,
          release_date: '2024-01-25',
          max_tokens: 4096,
          company_name: 'OpenAI',
        },
        {
          id: '2',
          name: 'Claude 3.5 Sonnet',
          slug: 'claude-3-5-sonnet',
          description: 'Most intelligent Claude model with vision capabilities.',
          context_window: 200000,
          speed_rating: 4.8,
          featured: true,
          logo_url: null,
          release_date: '2024-06-20',
          max_tokens: 8192,
          company_name: 'Anthropic',
        },
        {
          id: '3',
          name: 'Llama 3.1 405B',
          slug: 'llama-3-1-405b',
          description: 'Meta\'s largest open-source model.',
          context_window: 128000,
          speed_rating: 4.2,
          featured: false,
          logo_url: null,
          release_date: '2024-07-23',
          max_tokens: 4096,
          company_name: 'Meta',
        },
      ];
    }
  },


  /**
   * Get all providers
   */
  getProviders: async (): Promise<Provider[]> => {
    try {
      const response = await apiClient.get('/models/providers');
      return response.data.providers;
    } catch (error) {
      // Return sample data on failure
      return [
        {
          id: '1',
          name: 'OpenAI',
          website: 'https://openai.com',
        },
        {
          id: '2',
          name: 'Anthropic',
          website: 'https://anthropic.com',
        },
        {
          id: '3',
          name: 'Mistral AI',
          website: 'https://mistral.ai',
        },
        {
          id: '4',
          name: 'Meta',
          website: 'https://meta.com',
        },
      ];
    }
  },

  /**
   * Get providers for a specific model
   */
  getModelProviders: async (modelId: string): Promise<ModelProvider[]> => {
    try {
      const response = await apiClient.get(`/models/${modelId}/providers`);
      return response.data.providers;
    } catch (error) {
      // Return sample data on failure
      return [
        {
          id: '1',
          providerId: '1',
          providerName: 'OpenAI',
          providerWebsite: 'https://openai.com',
          inputTokenCost: 0.03,
          outputTokenCost: 0.06,
        },
        {
          id: '2',
          providerId: '2',
          providerName: 'Anthropic',
          providerWebsite: 'https://anthropic.com',
          inputTokenCost: 0.015,
          outputTokenCost: 0.075,
        },
      ];
    }
  },

  /**
   * Get model by slug
   */
  getModelBySlug: async (slug: string): Promise<ModelDetail> => {
    try {
      const response = await apiClient.get(`/models/${slug}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch model:', error);
      throw error;
    }
  },

  addModel: async (payload: {
    name: string;
    slug: string;
    company_name: string;
    description?: string;
    context_window?: number;
    max_tokens?: number;
    priority?: number;
    fallback_group?: string | null;
    capabilities?: string[];
    provider_id?: string;
    provider_model_id?: string;
    input_token_cost?: number;
    output_token_cost?: number;
    is_active?: boolean;
  }): Promise<Model> => {
    const response = await apiClient.post('/models/', payload);
    return response.data;
  },

  activateModel: async (modelId: string, isActive: boolean): Promise<Model> => {
    const response = await apiClient.patch(`/models/${modelId}/activate`, { is_active: isActive });
    return response.data;
  },

  updatePriority: async (modelId: string, priority: number): Promise<Model> => {
    const response = await apiClient.patch(`/models/${modelId}/priority`, { priority });
    return response.data;
  },

  updateFallbackGroup: async (modelId: string, fallback_group: string | null): Promise<Model> => {
    const response = await apiClient.patch(`/models/${modelId}/fallback`, { fallback_group });
    return response.data;
  },
};

export interface ParameterRange {
  min: number;
  max: number;
  default: number;
}

export interface ModelDetail extends Model {
  // Pricing
  input_cost_per_million: number;
  output_cost_per_million: number;
  
  // Capabilities
  capabilities: string[];
  
  // Parameters
  supported_parameters: Record<string, ParameterRange>;
  
  // Benchmarks
  benchmark_scores: Record<string, number>;
  
  // Extra
  category: string;
}

// ============== NEW INTERFACES FOR DETAIL PAGE ==============

export interface ProviderStats {
  id: string;
  name: string;
  region: string;
  latency: number;
  throughput: number;
  uptime: number;
  totalContext: string;
  maxOutput: string;
  inputPrice: number;
  outputPrice: number;
  inputPriceHigh?: number;
  outputPriceHigh?: number;
}

export interface PerformancePoint {
  date: string;
  value: number;
}

export interface PerformanceData {
  throughput: PerformancePoint[];
  latency: PerformancePoint[];
  uptimeHistory: PerformancePoint[];
}

export interface BenchmarkScore {
  name: string;
  score: number;
  category: string;
}

export interface ActivityRecord {
  date: string;
  requests: number;
  users?: number;
}

// ============== NEW API METHODS FOR DETAIL PAGE ==============

export const ModelDetailService = {
  /**
   * Get detailed provider stats for a model
   */
  getProviderStats: async (modelId: string): Promise<ProviderStats[]> => {
    try {
      const response = await apiClient.get(`/models/${modelId}/provider-stats`);
      return response.data.providers;
    } catch (error) {
      // Return sample data on failure
      return [
        {
          id: '1',
          name: 'OpenAI',
          region: 'US',
          latency: 108.2,
          throughput: 7,
          uptime: 99.9,
          totalContext: '1.05M',
          maxOutput: '128K',
          inputPrice: 30,
          outputPrice: 180,
          inputPriceHigh: 60,
          outputPriceHigh: 270,
        },
        {
          id: '2',
          name: 'Azure',
          region: 'EU',
          latency: 95.5,
          throughput: 8.2,
          uptime: 99.8,
          totalContext: '128K',
          maxOutput: '16K',
          inputPrice: 25,
          outputPrice: 150,
        },
      ];
    }
  },

  /**
   * Get performance metrics history for a model
   */
  getPerformanceData: async (modelId: string): Promise<PerformanceData> => {
    try {
      const response = await apiClient.get(`/models/${modelId}/performance`);
      return response.data;
    } catch (error) {
      // Return sample data on failure
      return {
        throughput: [
          { date: 'Mar 1', value: 6.5 },
          { date: 'Mar 2', value: 7.2 },
          { date: 'Mar 3', value: 6.8 },
          { date: 'Mar 4', value: 7.5 },
          { date: 'Mar 5', value: 7.0 },
          { date: 'Mar 6', value: 6.9 },
          { date: 'Mar 7', value: 7.1 },
        ],
        latency: [
          { date: 'Mar 1', value: 112 },
          { date: 'Mar 2', value: 108 },
          { date: 'Mar 3', value: 105 },
          { date: 'Mar 4', value: 110 },
          { date: 'Mar 5', value: 109 },
          { date: 'Mar 6', value: 107 },
          { date: 'Mar 7', value: 108 },
        ],
        uptimeHistory: [
          { date: 'Mar 1', value: 99.9 },
          { date: 'Mar 2', value: 100 },
          { date: 'Mar 3', value: 99.8 },
          { date: 'Mar 4', value: 99.9 },
          { date: 'Mar 5', value: 100 },
          { date: 'Mar 6', value: 99.7 },
          { date: 'Mar 7', value: 99.9 },
        ],
      };
    }
  },

  /**
   * Get benchmark scores for a model
   */
  getBenchmarks: async (modelId: string): Promise<Record<string, number>> => {
    try {
      const response = await apiClient.get(`/models/${modelId}/benchmarks`);
      return response.data.scores;
    } catch (error) {
      // Return sample data on failure
      return {
        'MMLU': 92.3,
        'GPQA': 78.4,
        'MATH': 85.2,
        'HumanEval': 94.1,
        'MGSM': 91.7,
      };
    }
  },

  /**
   * Get activity history for a model
   */
  getActivityHistory: async (modelId: string): Promise<ActivityRecord[]> => {
    try {
      const response = await apiClient.get(`/models/${modelId}/activity`);
      return response.data.activity;
    } catch (error) {
      // Return sample data on failure
      return [
        { date: '2026-03-10', requests: 125000, users: 3200 },
        { date: '2026-03-09', requests: 118000, users: 2950 },
        { date: '2026-03-08', requests: 132000, users: 3450 },
        { date: '2026-03-07', requests: 145000, users: 3800 },
        { date: '2026-03-06', requests: 98000, users: 2500 },
      ];
    }
  },

  /**
   * Get supported parameters for a model
   */
  getParameters: async (modelId: string): Promise<Record<string, ParameterRange>> => {
    try {
      const response = await apiClient.get(`/models/${modelId}/parameters`);
      return response.data.parameters;
    } catch (error) {
      // Return sample data on failure
      return {
        temperature: { min: 0, max: 2, default: 1 },
        top_p: { min: 0, max: 1, default: 1 },
        frequency_penalty: { min: -2, max: 2, default: 0 },
        presence_penalty: { min: -2, max: 2, default: 0 },
        max_tokens: { min: 1, max: 128000, default: 4096 },
      };
    }
  },
};

