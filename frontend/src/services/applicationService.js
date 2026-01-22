import axios from 'axios';

const API_URL = 'http://localhost:5001/api/applications';

const applicationService = {
  // Submit a job application
  applyToJob: async (jobId, alumniId, coverLetter = '', resumeUrl = '') => {
    try {
      const response = await axios.post(API_URL, {
        job_posting_id: jobId,
        applicant_id: alumniId,
        cover_letter: coverLetter,
        resume_url: resumeUrl
      });
      return response.data;
    } catch (error) {
      console.error('Error applying to job:', error);
      throw error;
    }
  },

  // Get all applications for a specific job (for employer)
  getJobApplications: async (jobId) => {
    try {
      const response = await axios.get(`${API_URL}/job/${jobId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching job applications:', error);
      throw error;
    }
  },

  // Get all applications by a specific alumni
  getAlumniApplications: async (alumniId) => {
    try {
      const response = await axios.get(`${API_URL}/alumni/${alumniId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching alumni applications:', error);
      throw error;
    }
  },

  // Get a specific application by ID
  getApplicationById: async (applicationId) => {
    try {
      const response = await axios.get(`${API_URL}/${applicationId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching application:', error);
      throw error;
    }
  },

  // Update application status (for employer)
  updateApplicationStatus: async (applicationId, status, notes = '') => {
    try {
      const response = await axios.patch(`${API_URL}/${applicationId}/status`, {
        status,
        notes
      });
      return response.data;
    } catch (error) {
      console.error('Error updating application status:', error);
      throw error;
    }
  },

  // Withdraw/delete an application
  withdrawApplication: async (applicationId) => {
    try {
      const response = await axios.delete(`${API_URL}/${applicationId}`);
      return response.data;
    } catch (error) {
      console.error('Error withdrawing application:', error);
      throw error;
    }
  },

  // Check if alumni has applied to a specific job
  checkApplication: async (jobId, alumniId) => {
    try {
      const response = await axios.get(`${API_URL}/check/${jobId}/${alumniId}`);
      return response.data;
    } catch (error) {
      console.error('Error checking application:', error);
      throw error;
    }
  }
};

export default applicationService;
