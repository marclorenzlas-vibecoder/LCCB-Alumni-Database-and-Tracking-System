import apiClient from './apiClient';

export const adminService = {
  async getPendingRegistrations() {
    const response = await apiClient.get('/auth/pending-registrations');
    return response.data;
  },

  async verifyStudentId(studentId) {
    const response = await apiClient.get(`/auth/verify-student-id/${studentId}`);
    return response.data;
  },

  async approveRegistration(id) {
    const response = await apiClient.post(`/auth/approve-registration/${id}`);
    return response.data;
  },

  async rejectRegistration(id, reason) {
    const response = await apiClient.post(`/auth/reject-registration/${id}`, { reason });
    return response.data;
  },

  async getOfficers(filters = {}) {
    const response = await apiClient.get('/officers', { params: filters });
    return response.data;
  },

  async getOfficerSummary() {
    const response = await apiClient.get('/officers/summary');
    return response.data;
  },

  async getBatchOfficers(batch) {
    const response = await apiClient.get(`/officers/batch/${batch}`);
    return response.data;
  },

  async assignOfficer(payload) {
    const response = await apiClient.post('/officers', payload);
    return response.data;
  },

  async updateOfficer(id, payload) {
    const response = await apiClient.put(`/officers/${id}`, payload);
    return response.data;
  },

  async removeOfficer(id) {
    const response = await apiClient.delete(`/officers/${id}`);
    return response.data;
  },

  async getTeachers() {
    const response = await apiClient.get('/auth/teachers');
    return response.data;
  },

  async registerTeacher(payload) {
    const response = await apiClient.post('/auth/register-teacher', payload);
    return response.data;
  },

  async deleteTeacher(id) {
    const response = await apiClient.delete(`/auth/teachers/${id}`);
    return response.data;
  }
};
