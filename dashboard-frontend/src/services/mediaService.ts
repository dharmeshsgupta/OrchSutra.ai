import apiClient from './apiClient';

export interface GenerateImageRequest {
  prompt: string;
  model?: string;
  size?: string;
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
  response_format?: 'b64_json' | 'url';
}

export interface GenerateImageResponse {
  model: string;
  provider: string;
  mime_type: string;
  b64_json?: string;
  url?: string;
}

export interface AnalyzeImageRequest {
  image_data_url: string;
  file_name?: string;
  prompt?: string;
  model?: string;
}

export interface AnalyzeImageResponse {
  model: string;
  provider: string;
  analysis: string;
}

export interface GenerateAudioRequest {
  text: string;
  model?: string;
  voice?: string;
  format?: 'mp3' | 'wav' | 'opus' | 'aac' | 'flac' | 'pcm';
  speed?: number;
}

export interface GenerateAudioResponse {
  model: string;
  provider: string;
  mime_type: string;
  b64_audio: string;
}

export interface TTSAgentProfile {
  id: string;
  name: string;
  language_code: string;
  voice_id: string;
  emotion: string;
  provider: string;
  is_active: boolean;
}

export interface CreateTTSAgentRequest {
  name: string;
  language_code: string;
  voice_id: string;
  emotion?: string;
}

export interface GenerateTTSFromAgentRequest {
  agent_id: string;
  text: string;
}

export interface GenerateTTSFromAgentResponse {
  message_id: string;
  agent_id: string;
  agent_name: string;
  text: string;
  audio_url: string;
  mime_type: string;
}

export const MediaService = {
  generateImage: async (payload: GenerateImageRequest): Promise<GenerateImageResponse> => {
    const response = await apiClient.post('/media/image/generate', payload, {
      timeout: 120000,
    });
    return response.data;
  },

  generateAudio: async (payload: GenerateAudioRequest): Promise<GenerateAudioResponse> => {
    const response = await apiClient.post('/media/audio/generate', payload, {
      timeout: 120000,
    });
    return response.data;
  },

  listTTSAgents: async (): Promise<TTSAgentProfile[]> => {
    const response = await apiClient.get('/media/tts/agents');
    return response.data;
  },

  createTTSAgent: async (payload: CreateTTSAgentRequest): Promise<TTSAgentProfile> => {
    const response = await apiClient.post('/media/tts/agents', payload);
    return response.data;
  },

  generateFromTTSAgent: async (payload: GenerateTTSFromAgentRequest): Promise<GenerateTTSFromAgentResponse> => {
    const response = await apiClient.post('/media/tts/generate', payload, {
      timeout: 120000,
    });
    return response.data;
  },

  analyzeImage: async (payload: AnalyzeImageRequest): Promise<AnalyzeImageResponse> => {
    const response = await apiClient.post('/media/image/analyze', payload, {
      timeout: 120000,
    });
    return response.data;
  },
};
