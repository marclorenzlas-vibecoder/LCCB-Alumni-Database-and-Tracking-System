import apiClient from './apiClient';

export const donationService = {
  async getAll() {
    const response = await apiClient.get('/donations');
    return response.data;
  },

  async getByAlumni(alumniId) {
    const response = await apiClient.get(`/donations/alumni/${alumniId}`);
    return response.data;
  },

  async getWeeklyStatus(alumniId) {
    const response = await apiClient.get(`/donations/alumni/${alumniId}/weekly-status`);
    return response.data;
  },

  async createDonation(payload) {
    const response = await apiClient.post('/donations', payload, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  async updateDonation(donationId, payload) {
    const response = await apiClient.put(`/donations/${donationId}`, payload, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  async deleteDonation(donationId) {
    const response = await apiClient.delete(`/donations/${donationId}`);
    return response.data;
  },

  async contributeToDonation(donationId, payload) {
    const response = await apiClient.post(`/donations/${donationId}/contribute`, payload);
    return response.data;
  },

  async getContributions(campaignId) {
    const response = await apiClient.get(`/donations/${campaignId}/contributions`);
    return response.data;
  },

  async submitReceipt(campaignId, data = {}) {
    const response = await apiClient.post(`/donations/${campaignId}/submit-receipt`, data);
    return response.data;
  },

  async getReceiptStatus(campaignId) {
    const response = await apiClient.get(`/donations/${campaignId}/receipt-status`);
    return response.data;
  }
};
