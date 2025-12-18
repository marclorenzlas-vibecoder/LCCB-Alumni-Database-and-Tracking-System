import axios from 'axios';

const API_URL = 'http://localhost:5001/api/officers';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };
};

const officerService = {
  // Get all officers for a specific batch
  getOfficersByBatch: async (batch) => {
    const response = await axios.get(`${API_URL}/batch/${batch}`);
    return response.data;
  },

  // Get all officers with optional filters
  getAllOfficers: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.batch) params.append('batch', filters.batch);
    if (filters.position) params.append('position', filters.position);
    
    const response = await axios.get(`${API_URL}?${params.toString()}`);
    return response.data;
  },

  // Get summary of all batches with officer counts
  getOfficersSummary: async () => {
    const response = await axios.get(`${API_URL}/summary`);
    return response.data;
  },

  // Assign a new officer (Teacher only)
  assignOfficer: async (data) => {
    const response = await axios.post(API_URL, data, getAuthHeaders());
    return response.data;
  },

  // Update an officer (Teacher only)
  updateOfficer: async (id, data) => {
    const response = await axios.put(`${API_URL}/${id}`, data, getAuthHeaders());
    return response.data;
  },

  // Remove an officer (Teacher only)
  removeOfficer: async (id) => {
    const response = await axios.delete(`${API_URL}/${id}`, getAuthHeaders());
    return response.data;
  }
};

export default officerService;
