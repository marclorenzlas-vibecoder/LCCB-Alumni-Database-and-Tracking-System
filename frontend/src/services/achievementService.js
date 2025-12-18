import axios from 'axios';

const API_URL = 'http://localhost:5001/api/achievements';

const achievementService = {
  // Get all achievements
  getAllAchievements: async () => {
    const response = await axios.get(API_URL);
    return response.data;
  },

  // Get all achievements for an alumni
  getAchievementsByAlumni: async (alumniId) => {
    const response = await axios.get(`${API_URL}/alumni/${alumniId}`);
    return response.data;
  },

  // Create new achievement
  createAchievement: async (achievementData) => {
    // If achievementData is a FormData (has an image), send as multipart/form-data
    if (achievementData instanceof FormData) {
      const response = await axios.post(API_URL, achievementData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    }
    const response = await axios.post(API_URL, achievementData);
    return response.data;
  },

  // Update achievement
  updateAchievement: async (id, achievementData) => {
    // If achievementData is a FormData (has an image), send as multipart/form-data
    if (achievementData instanceof FormData) {
      const response = await axios.put(`${API_URL}/${id}`, achievementData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    }
    const response = await axios.put(`${API_URL}/${id}`, achievementData);
    return response.data;
  },

  // Delete achievement
  deleteAchievement: async (id) => {
    const response = await axios.delete(`${API_URL}/${id}`);
    return response.data;
  }
};

export default achievementService;
