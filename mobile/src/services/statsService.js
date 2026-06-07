import apiClient from './apiClient';

export const statsService = {
  async getHomeStats() {
    const response = await apiClient.get('/stats/home');
    return response.data;
  }
};
