import axios from 'axios';
import { API_BASE_URL } from '../config/apiBaseUrl';

const API_URL = `${API_BASE_URL}/achievements`;

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const achievementService = {
  // Get all achievements
  getAllAchievements: async () => {
    const response = await axios.get(API_URL, { headers: getAuthHeaders() });
    return response.data;
  },

  // Get all achievements for an alumni
  getAchievementsByAlumni: async (alumniId) => {
    const response = await axios.get(`${API_URL}/alumni/${alumniId}`, { headers: getAuthHeaders() });
    return response.data;
  },

  // Create new achievement
  createAchievement: async (achievementData) => {
    if (achievementData instanceof FormData) {
      const response = await axios.post(API_URL, achievementData, {
        headers: { 'Content-Type': 'multipart/form-data', ...getAuthHeaders() }
      });
      return response.data;
    }
    const response = await axios.post(API_URL, achievementData, { headers: getAuthHeaders() });
    return response.data;
  },

  // Update achievement
  updateAchievement: async (id, achievementData) => {
    if (achievementData instanceof FormData) {
      const response = await axios.put(`${API_URL}/${id}`, achievementData, {
        headers: { 'Content-Type': 'multipart/form-data', ...getAuthHeaders() }
      });
      return response.data;
    }
    const response = await axios.put(`${API_URL}/${id}`, achievementData, { headers: getAuthHeaders() });
    return response.data;
  },

  // Delete achievement
  deleteAchievement: async (id) => {
    const response = await axios.delete(`${API_URL}/${id}`, { headers: getAuthHeaders() });
    return response.data;
  }
};

export default achievementService;
