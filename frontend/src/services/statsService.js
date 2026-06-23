import axios from 'axios';
import { API_BASE_URL } from '../config/apiBaseUrl';

const API_URL = `${API_BASE_URL}/stats`;

const statsService = {
  async getHomeStats() {
    const response = await axios.get(`${API_URL}/home`);
    return response.data;
  },

  async getHomeSnapshot() {
    const response = await axios.get(`${API_URL}/home-snapshot`);
    return response.data;
  },

  async getAdminStats() {
    const response = await axios.get(`${API_URL}/admin`);
    return response.data;
  }
};

export default statsService;
