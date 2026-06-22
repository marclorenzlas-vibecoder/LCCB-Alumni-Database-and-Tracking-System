import apiClient from './apiClient';

export const communityService = {
  async getAllAlumni() {
    const response = await apiClient.get('/alumni');
    return response.data;
  },

  async getAlumniById(alumniId) {
    const response = await apiClient.get(`/alumni/${alumniId}`);
    return response.data;
  },

  async updateAlumni(alumniId, payload) {
    const response = await apiClient.put(`/alumni/${alumniId}`, payload);
    return response.data;
  },

  async getAchievements(alumniId) {
    if (alumniId) {
      const response = await apiClient.get(`/achievements/alumni/${alumniId}`);
      return response.data;
    }
    const response = await apiClient.get('/achievements');
    return response.data;
  },

  async getAchievementById(achievementId) {
    const response = await apiClient.get(`/achievements/${achievementId}`);
    return response.data;
  },

  async getCareers(alumniId) {
    if (alumniId) {
      const response = await apiClient.get(`/careers/alumni/${alumniId}`);
      return response.data;
    }
    const response = await apiClient.get('/careers');
    return response.data;
  },

  async createCareer(payload) {
    const response = await apiClient.post('/careers', payload);
    return response.data;
  },

  async createAchievement(formData) {
    const response = await apiClient.post('/achievements', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  async updateAchievement(achievementId, formData) {
    const response = await apiClient.put(`/achievements/${achievementId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  async deleteAchievement(achievementId) {
    const response = await apiClient.delete(`/achievements/${achievementId}`);
    return response.data;
  }
};
