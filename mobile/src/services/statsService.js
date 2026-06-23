import apiClient from './apiClient';

export const statsService = {
  async getHomeStats() {
    const response = await apiClient.get('/stats/home');
    return response.data;
  },

  async getHomeSnapshot() {
    const response = await apiClient.get('/stats/home-snapshot');
    return response.data;
  }
};
