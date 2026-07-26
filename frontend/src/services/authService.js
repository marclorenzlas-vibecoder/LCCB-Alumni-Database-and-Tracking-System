import axios from 'axios';
import { API_BASE_URL } from '../config/apiBaseUrl';

// API URL for auth endpoints
const API_URL = `${API_BASE_URL}/auth`;

console.log('Auth Service API URL:', API_URL);

// Create an axios instance with default config
const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

const normalizeEmail = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : value);

const getAuthError = (error, fallbackMessage) => {
  if (!axios.isAxiosError(error)) {
    return new Error(fallbackMessage);
  }

  if (!error.response) {
    return new Error('Network error: XAMPP may be off or the backend is unreachable. Please start XAMPP and try again.');
  }

  return error.response.data || new Error(fallbackMessage);
};

const notifyAuthUserUpdated = (user) => {
  try {
    window.dispatchEvent(new CustomEvent('auth-user-updated', { detail: user }));
  } catch (error) {
    console.warn('Unable to dispatch auth-user-updated event:', error);
  }
};

export const authService = {
  register: async (userData) => {
    try {
      console.log('Registering user:', userData);
      const { username, email, password, level, course, batch, graduationYear, firstName, lastName, studentId, contactNumber } = userData;
      const normalizedEmail = normalizeEmail(email);
      const response = await axiosInstance.post('/register', { 
        username, 
        email: normalizedEmail, 
        password, 
        level, 
        course, 
        batch, 
        graduationYear,
        firstName,
        lastName,
        studentId,
        contactNumber
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
      }

      throw getAuthError(error, 'Registration failed');
    }
  },

  login: async (email, password) => {
    try {
      const response = await axiosInstance.post('/login', { email: normalizeEmail(email), password });
      
      // Store user token and info in localStorage
      if (response.data.token) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
        localStorage.setItem('token', response.data.token);
        
        // Set the token in axios default headers
        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        notifyAuthUserUpdated(response.data.user);
      }
      
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw getAuthError(error, 'Login failed');
    }
  },

  // Teacher (Admin) endpoints
  registerTeacher: async (userData) => {
    try {
      const { username, email, password } = userData;
      const response = await axiosInstance.post('/register-teacher', { username, email: normalizeEmail(email), password });
      return response.data;
    } catch (error) {
      throw getAuthError(error, 'Registration failed');
    }
  },
  loginTeacher: async (email, password) => {
    try {
      const response = await axiosInstance.post('/login', { email: normalizeEmail(email), password });
      if (response.data.token) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
        localStorage.setItem('token', response.data.token);
        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        notifyAuthUserUpdated(response.data.user);
      }
      return response.data;
    } catch (error) {
      throw getAuthError(error, 'Login failed');
    }
  },

  logout: async ({ clearLocalSession = true } = {}) => {
    const token = localStorage.getItem('token');
    const user = authService.getCurrentUser();

    try {
      await axiosInstance.post('/logout', {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
    } catch {
      // Logging out locally should still work if the backend is unavailable.
    }

    if (user && user.approval_status === 'REJECTED') {
      try {
        await axiosInstance.post('/delete-rejected-account', { email: user.email });
      } catch (err) {
        console.error('Error deleting rejected account:', err);
      }
    }

    if (clearLocalSession) {
      authService.clearLocalSession();
    }
  },

  clearLocalSession: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  isLoggedIn: () => {
    const user = authService.getCurrentUser();
    const token = localStorage.getItem('token');
    return !!(user && token);
  },

  getRole: () => {
    const user = authService.getCurrentUser();
    if (!user) return null;
    
    // Check if user has role property
    if (user.role) {
      return user.role.toLowerCase();
    }
    
    // Fallback to email-based role detection
    if (typeof user.email === 'string') {
      if (user.email.endsWith('@lccbonline.com')) return 'teacher';
      if (user.email.endsWith('@gmail.com')) return 'alumni';
    }
    
    return null;
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
  // Teachers have @lccbonline.com emails
  // Alumni have @gmail.com emails
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
