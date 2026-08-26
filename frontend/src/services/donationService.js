import axios from 'axios';
import { API_BASE_URL } from '../config/apiBaseUrl';

// API URL for donation endpoints
const API_URL = `${API_BASE_URL}/donations`;

console.log('Donation Service API URL:', API_URL);

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };
};

const donationService = {
  // Get all donations
  getAllDonations: async () => {
    const response = await axios.get(API_URL);
    return response.data;
  },

  // Get all donations for an alumni
  getDonationsByAlumni: async (alumniId) => {
    const response = await axios.get(`${API_URL}/alumni/${alumniId}`);
    return response.data;
  },

  // Check weekly donation status for an alumni
  getWeeklyStatus: async (alumniId) => {
    const response = await axios.get(`${API_URL}/alumni/${alumniId}/weekly-status`);
    return response.data;
  },

  // Create new donation (requires authentication)
  createDonation: async (donationData) => {
    const token = localStorage.getItem('token');
    
    if (donationData instanceof FormData) {
      const response = await axios.post(API_URL, donationData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    }
    const response = await axios.post(API_URL, donationData, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  },

  // Update donation (requires authentication)
  updateDonation: async (id, donationData) => {
    const token = localStorage.getItem('token');
    
    if (donationData instanceof FormData) {
      const response = await axios.put(`${API_URL}/${id}`, donationData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data;
    }
    const response = await axios.put(`${API_URL}/${id}`, donationData, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  },

  // Contribute to an existing donation campaign
  contributeToDonation: async (id, donationData) => {
    const token = localStorage.getItem('token');
    const response = await axios.post(`${API_URL}/${id}/contribute`, donationData, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  },

  // Delete donation (requires authentication)
  deleteDonation: async (id) => {
    const token = localStorage.getItem('token');
    const response = await axios.delete(`${API_URL}/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  }
};

export default donationService;
