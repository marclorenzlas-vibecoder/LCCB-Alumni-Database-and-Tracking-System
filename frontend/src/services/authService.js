import axios from 'axios';

const API_URL = 'http://localhost:5001/api/auth';

// Create an axios instance with default config
const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const authService = {
  register: async (userData) => {
    try {
      console.log('Registering user:', userData);
      const { username, email, password, level, course, batch, graduationYear } = userData;
      const response = await axiosInstance.post('/register', { username, email, password, level, course, batch, graduationYear });
      console.log('Registration response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Registration error:', error);
      if (axios.isAxiosError(error)) {
        // Log more detailed error information
        console.error('Error response:', error.response?.data);
        console.error('Error status:', error.response?.status);
        console.error('Error headers:', error.response?.headers);
        
        throw error.response?.data || new Error('Registration failed');
      }
      throw new Error('Registration failed');
    }
  },

  login: async (email, password) => {
    try {
      const response = await axiosInstance.post('/login', { email, password });
      
      // Store user token and info in localStorage
      if (response.data.token) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
        localStorage.setItem('token', response.data.token);
        
        // Set the token in axios default headers
        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
      }
      
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      if (axios.isAxiosError(error)) {
        throw error.response?.data || new Error('Login failed');
      }
      throw new Error('Login failed');
    }
  },

  // Teacher (Admin) endpoints
  registerTeacher: async (userData) => {
    try {
      const { username, email, password } = userData;
      const response = await axiosInstance.post('/register-teacher', { username, email, password });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw error.response?.data || new Error('Registration failed');
      }
      throw new Error('Registration failed');
    }
  },
  loginTeacher: async (email, password) => {
    try {
      const response = await axiosInstance.post('/login', { email, password });
      if (response.data.token) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
        localStorage.setItem('token', response.data.token);
        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
      }
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw error.response?.data || new Error('Login failed');
      }
      throw new Error('Login failed');
    }
  },

  logout: () => {
    // Check if user has rejected status before logging out
    const user = authService.getCurrentUser();
    if (user && user.approval_status === 'REJECTED') {
      // Delete rejected account from backend
      axiosInstance.post('/delete-rejected-account', { email: user.email })
        .catch(err => console.error('Error deleting rejected account:', err));
    }
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  // Delete rejected account after user acknowledges
  deleteRejectedAccount: async (email) => {
    try {
      await axiosInstance.post('/delete-rejected-account', { email });
    } catch (error) {
      console.error('Error deleting rejected account:', error);
    }
  },

  // Role helpers based on email domain
  isTeacher: () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return false;
    try {
      const user = JSON.parse(userStr);
      return typeof user.email === 'string' && user.email.endsWith('@lccbonline.com');
    } catch {
      return false;
    }
  },

  isAlumni: () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return false;
    try {
      const user = JSON.parse(userStr);
      return typeof user.email === 'string' && user.email.endsWith('@gmail.com');
    } catch {
      return false;
    }
  }
};
