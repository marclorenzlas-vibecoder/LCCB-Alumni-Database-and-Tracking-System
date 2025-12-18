import axios from 'axios';

const API_URL = 'http://localhost:5001/api/auth';

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  course: string;
  batch: string;
  graduation: string;
}

export const authService = {
  register: async (userData: RegisterData) => {
    try {
      console.log('Registering user:', userData);
      const response = await axios.post(`${API_URL}/register`, userData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
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

  login: async (email: string, password: string) => {
    try {
      const response = await axios.post(`${API_URL}/login`, { email, password });
      
      // Store user token and info in localStorage
      if (response.data.token) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
        localStorage.setItem('token', response.data.token);
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

  loginTeacher: async (email: string, password: string) => {
    try {
      const response = await axios.post(`${API_URL}/login`, { email, password });
      
      // Store user token and info in localStorage
      if (response.data.token) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
        localStorage.setItem('token', response.data.token);
      }
      
      return response.data;
    } catch (error) {
      console.error('Teacher login error:', error);
      if (axios.isAxiosError(error)) {
        throw error.response?.data || new Error('Login failed');
      }
      throw new Error('Login failed');
    }
  },

  logout: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  isTeacher: () => {
    const user = authService.getCurrentUser();
    if (!user || !user.email) return false;
    return user.email.endsWith('@lccbonline.com');
  },

  isAlumni: () => {
    const user = authService.getCurrentUser();
    if (!user || !user.email) return false;
    return user.email.endsWith('@gmail.com');
  }
};
