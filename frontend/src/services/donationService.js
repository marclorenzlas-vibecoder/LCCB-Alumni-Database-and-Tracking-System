import axios from 'axios';

const API_URL = 'http://localhost:5001/api/donations';

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

  // Create new donation
  createDonation: async (donationData) => {
    if (donationData instanceof FormData) {
      const response = await axios.post(API_URL, donationData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    }
    const response = await axios.post(API_URL, donationData);
    return response.data;
  },

  // Update donation
  updateDonation: async (id, donationData) => {
    if (donationData instanceof FormData) {
      const response = await axios.put(`${API_URL}/${id}`, donationData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    }
    const response = await axios.put(`${API_URL}/${id}`, donationData);
    return response.data;
  },

  // Delete donation
  deleteDonation: async (id) => {
    const response = await axios.delete(`${API_URL}/${id}`);
    return response.data;
  }
};

export default donationService;
