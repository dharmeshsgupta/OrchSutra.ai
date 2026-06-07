import axios from 'axios';

const ROUTER_API_BASE_URL = import.meta.env.VITE_ROUTER_API_URL || 'http://localhost:3000';

export type PieSlice = {
  name: string;
  value: number;
};

export type ParameterMetrics = {
  average: number | null;
  by_model: PieSlice[];
  by_provider: PieSlice[];
  buckets: PieSlice[];
};

export type SamplingMetricsResponse = {
  range: string;
  totals: {
    requests: number;
    input_tokens: number;
    output_tokens: number;
  };
  metrics: Record<string, ParameterMetrics>;
};

export const SamplingMetricsService = {
  getSamplingMetrics: async (range: string): Promise<SamplingMetricsResponse> => {
    const response = await axios.get(`${ROUTER_API_BASE_URL}/metrics/llm-sampling`, {
      params: { range },
    });
    return response.data;
  },
};
