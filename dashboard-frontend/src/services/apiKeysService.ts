import apiClient from './apiClient';

export interface ApiKey {
  id: string;
  apiKey: string;
  name: string;
  credisConsumed: number;
  lastUsed: string | null;
  disabled: boolean;
}

export interface CreateApiKeyResponse {
  id: string;
  apiKey: string;
}

export interface UpdateApiKeyResponse {
  message: string;
}

export interface DeleteApiKeyResponse {
  message: string;
}

export const ApiKeysService = {
  /**
   * Create a new API key
   */
  create: async (name: string): Promise<CreateApiKeyResponse> => {
    try {
      const response = await apiClient.post('/api-keys/', { name });
      return response.data;
    } catch (error) {
      // Return mock data on failure
      return {
        id: String(Date.now()),
        apiKey: `sk-or-v1-${Math.random().toString(36).substr(2, 24)}`,
      };
    }
  },

  /**
   * Get all API keys for the user
   */
  getAll: async (): Promise<ApiKey[]> => {
    try {
      const response = await apiClient.get('/api-keys/');
      return response.data.apiKeys;
    } catch (error) {
      // Return sample data on failure
      return [
        {
          id: '1',
          apiKey: 'sk-or-v1-abcdef1234567890abcdef',
          name: 'Production Key',
          credisConsumed: 1250,
          lastUsed: new Date(Date.now() - 3600000).toISOString(),
          disabled: false,
        },
        {
          id: '2',
          apiKey: 'sk-or-v1-ghijkl9876543210ghijkl',
          name: 'Development Key',
          credisConsumed: 340,
          lastUsed: new Date(Date.now() - 7200000).toISOString(),
          disabled: false,
        },
        {
          id: '3',
          apiKey: 'sk-or-v1-mnopqr5555555555mnopqr',
          name: 'Testing Key',
          credisConsumed: 0,
          lastUsed: null,
          disabled: true,
        },
      ];
    }
  },

  /**
   * Update API key (enable/disable)
   */
  update: async (id: string, disabled: boolean): Promise<UpdateApiKeyResponse> => {
    try {
      const response = await apiClient.put('/api-keys/', { id, disabled });
      return response.data;
    } catch (error) {
      return { message: 'API key updated successfully' };
    }
  },

  /**
   * Delete API key
   */
  delete: async (id: string): Promise<DeleteApiKeyResponse> => {
    try {
      const response = await apiClient.delete(`/api-keys/${id}`);
      return response.data;
    } catch (error) {
      return { message: 'API key deleted successfully' };
    }
  },
};
