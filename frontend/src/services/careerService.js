import axios from 'axios';
import { API_BASE_URL } from '../config/apiBaseUrl';

const API_URL = `${API_BASE_URL}/careers`;
const JOB_API_URL = `${API_BASE_URL}/jobs`;

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const careerService = {
  // Get all career entries
  getAllCareers: async () => {
    const response = await axios.get(API_URL, { headers: getAuthHeaders() });
    return response.data;
  },

  // Get all career entries for an alumni
  getCareersByAlumni: async (alumniId) => {
    const response = await axios.get(`${API_URL}/alumni/${alumniId}`, { headers: getAuthHeaders() });
    return response.data;
  },

  // Create new career entry
  createCareer: async (careerData) => {
    const response = await axios.post(API_URL, careerData, { headers: getAuthHeaders() });
    return response.data;
  },

  // Update career entry
  updateCareer: async (id, careerData) => {
    const response = await axios.put(`${API_URL}/${id}`, careerData, { headers: getAuthHeaders() });
    return response.data;
  },

  reviewCareerMatch: async (id, reviewData) => {
    const response = await axios.patch(`${API_URL}/${id}/review`, reviewData, { headers: getAuthHeaders() });
    return response.data;
  },

  // Delete career entry
  deleteCareer: async (id) => {
    const response = await axios.delete(`${API_URL}/${id}`, { headers: getAuthHeaders() });
    return response.data;
  },

  // Job Postings API
  getAllJobs: async () => {
    const response = await axios.get(JOB_API_URL, { headers: getAuthHeaders() });
    return response.data;
  },

  getJobById: async (id) => {
    const response = await axios.get(`${JOB_API_URL}/${id}`, { headers: getAuthHeaders() });
    return response.data;
  },

  createJob: async (jobData) => {
    const response = await axios.post(JOB_API_URL, jobData, { headers: getAuthHeaders() });
    return response.data;
  },

  updateJob: async (id, jobData) => {
    const response = await axios.put(`${JOB_API_URL}/${id}`, jobData, { headers: getAuthHeaders() });
    return response.data;
  },

  deleteJob: async (id) => {
    const response = await axios.delete(`${JOB_API_URL}/${id}`, { headers: getAuthHeaders() });
    return response.data;
  }
};

export default careerService;
