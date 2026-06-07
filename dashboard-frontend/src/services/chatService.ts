import apiClient from './apiClient';

export interface ChatMessagePayload {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatResponseMetadata {
  requested_model_id: string;
  actual_model_id?: string;
  provider_used?: string;
  fallback_used: boolean;
  fallback_reason?: string;
  latency_ms?: number;
}

export interface ChatResponse {
  content: string;
  metadata: ChatResponseMetadata;
  usage: Record<string, unknown>;
  raw: Record<string, unknown>;
}

export interface ChatRequest {
  messages: ChatMessagePayload[];
  selected_model_id: string;
  auto_switch: boolean;
  fallback_candidates?: string[];
  parameters?: Record<string, unknown>;
}

export interface ChatModelOption {
  id: string;
  name: string;
  provider_name: string;
  provider_model_id: string;
  description?: string;
  is_default: boolean;
  is_active: boolean;
}

export const ChatService = {
  sendChat: async (payload: ChatRequest): Promise<ChatResponse> => {
    const response = await apiClient.post('/chat/completions', payload, {
      timeout: 120000,
    });
    return response.data;
  },

  getModelOptions: async (): Promise<ChatModelOption[]> => {
    const response = await apiClient.get('/chat/model-options');
    return response.data.models ?? [];
  },
};
