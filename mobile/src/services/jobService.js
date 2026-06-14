import apiClient from './apiClient';

export const jobService = {
  async getAllJobs() {
    const response = await apiClient.get('/jobs');
    return response.data;
  },

  async getJobById(jobId) {
    const response = await apiClient.get(`/jobs/${jobId}`);
    return response.data;
  },

  async applyToJob(payload) {
    const isFormData = payload instanceof FormData;
    const response = await apiClient.post('/applications', payload, isFormData ? {
      headers: { 'Content-Type': 'multipart/form-data' }
    } : undefined);
    return response.data;
  },

  async getApplicationsByAlumni(alumniId) {
    const response = await apiClient.get(`/applications/alumni/${alumniId}`);
    return response.data;
  },

  async checkApplication(jobId, alumniId) {
    const response = await apiClient.get(`/applications/check/${jobId}/${alumniId}`);
    return response.data;
  },

  async withdrawApplication(applicationId) {
    const response = await apiClient.delete(`/applications/${applicationId}`);
    return response.data;
  },

  async createJob(payload) {
    const response = await apiClient.post('/jobs', payload);
    return response.data;
  },

  async updateJob(jobId, payload) {
    const response = await apiClient.put(`/jobs/${jobId}`, payload);
    return response.data;
  },

  async deleteJob(jobId) {
    const response = await apiClient.delete(`/jobs/${jobId}`);
    return response.data;
  },

  async getJobApplications(jobId) {
    const response = await apiClient.get(`/applications/job/${jobId}`);
    return response.data;
  },

  async updateApplicationStatus(applicationId, status, notes = '') {
    const response = await apiClient.patch(`/applications/${applicationId}/status`, {
      status,
      notes
    });
    return response.data;
  }
};
