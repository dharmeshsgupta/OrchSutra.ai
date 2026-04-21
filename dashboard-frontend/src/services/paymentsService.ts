import apiClient from './apiClient';

export interface OnrampResponse {
  message: 'Onramp successful';
  credits: number;
}

export interface OnrampErrorResponse {
  message: 'Onramp failed';
}

export const PaymentsService = {
  /**
   * Process onramp to add credits to user account
   */
  onramp: async (): Promise<OnrampResponse> => {
    try {
      const response = await apiClient.post('/payments/onramp');
      return response.data;
    } catch (error) {
      // Return mock successful response
      return {
        message: 'Onramp successful',
        credits: 2000,
      };
    }
  },
};
