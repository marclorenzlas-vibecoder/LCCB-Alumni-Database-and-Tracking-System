import axios from 'axios';

const API_URL = 'http://localhost:5001/api/careers';
const JOB_API_URL = 'http://localhost:5001/api/jobs';

const careerService = {
  // Get all career entries
  getAllCareers: async () => {
    const response = await axios.get(API_URL);
    return response.data;
  },

  // Get all career entries for an alumni
  getCareersByAlumni: async (alumniId) => {
    const response = await axios.get(`${API_URL}/alumni/${alumniId}`);
    return response.data;
  },

  // Create new career entry
  createCareer: async (careerData) => {
    const response = await axios.post(API_URL, careerData);
    return response.data;
  },

  // Update career entry
  updateCareer: async (id, careerData) => {
    const response = await axios.put(`${API_URL}/${id}`, careerData);
    return response.data;
  },

  // Delete career entry
  deleteCareer: async (id) => {
    const response = await axios.delete(`${API_URL}/${id}`);
    return response.data;
  },

  // Job Postings API
  getAllJobs: async () => {
    const response = await axios.get(JOB_API_URL);
    return response.data;
  },

  getJobById: async (id) => {
    const response = await axios.get(`${JOB_API_URL}/${id}`);
    return response.data;
  },

  createJob: async (jobData) => {
    const response = await axios.post(JOB_API_URL, jobData);
    return response.data;
  },

  updateJob: async (id, jobData) => {
    const response = await axios.put(`${JOB_API_URL}/${id}`, jobData);
    return response.data;
  },

  deleteJob: async (id) => {
    const response = await axios.delete(`${JOB_API_URL}/${id}`);
    return response.data;
  }
};

export default careerService;
