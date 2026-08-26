import axios from 'axios';
import { API_BASE_URL } from '../config/apiBaseUrl';

const API_URL = `${API_BASE_URL}/applications`;

const normalizeToken = (value) => {
  if (!value || typeof value !== 'string') return null;

  let token = value.trim();
  token = token.replace(/^Bearer\s+/i, '').trim();
  token = token.replace(/^Bearer\s+/i, '').trim();
  token = token.replace(/^['\"]+|['\"]+$/g, '').trim();

  if (!token || token.toLowerCase() === 'undefined' || token.toLowerCase() === 'null') {
    return null;
  }

  return token;
};

const getAuthHeaders = () => {
  const storedToken = localStorage.getItem('token');
  const token = normalizeToken(storedToken);

  if (storedToken && token && storedToken !== token) {
    localStorage.setItem('token', token);
  }

  return token ? { Authorization: `Bearer ${token}` } : {};
};

const applicationService = {
  // Submit a job application
  applyToJob: async (jobId, alumniId, coverLetter = '', resumeUrl = '', resumeFiles = null, contactMethod = '', contactEmail = '', contactNumber = '') => {
    try {
      const headers = getAuthHeaders();
      const formData = new FormData();
      formData.append('job_posting_id', String(jobId));
      formData.append('applicant_id', String(alumniId));
      formData.append('cover_letter', coverLetter);

      if (resumeUrl) {
        formData.append('resume_url', resumeUrl);
      }

      if (resumeFiles) {
        // resumeFiles can be a single File or an array of Files
        if (Array.isArray(resumeFiles)) {
          resumeFiles.forEach((file) => {
            formData.append('resume_files[]', file);
          });
        } else {
          formData.append('resume_files[]', resumeFiles);
        }
      }

      if (contactMethod) formData.append('contact_method', contactMethod);
      if (contactEmail) formData.append('contact_email', contactEmail);
      if (contactNumber) formData.append('contact_number', contactNumber);

      const response = await axios.post(API_URL, formData, {
        headers: {
          ...headers
        }
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
      const response = await axios.get(`${API_URL}/job/${jobId}`, {
        headers: getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching job applications:', error);
      throw error;
    }
  },

  // Get all applications by a specific alumni
  getAlumniApplications: async (alumniId) => {
    try {
      const response = await axios.get(`${API_URL}/alumni/${alumniId}`, {
        headers: getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching alumni applications:', error);
      throw error;
    }
  },

  // Get a specific application by ID
  getApplicationById: async (applicationId) => {
    try {
      const response = await axios.get(`${API_URL}/${applicationId}`, {
        headers: getAuthHeaders()
      });
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
      }, {
        headers: getAuthHeaders()
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
      const response = await axios.delete(`${API_URL}/${applicationId}`, {
        headers: getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Error withdrawing application:', error);
      throw error;
    }
  },

  // Check if alumni has applied to a specific job
  checkApplication: async (jobId, alumniId) => {
    try {
      const response = await axios.get(`${API_URL}/check/${jobId}/${alumniId}`, {
        headers: getAuthHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Error checking application:', error);
      throw error;
    }
  }
};

export default applicationService;
