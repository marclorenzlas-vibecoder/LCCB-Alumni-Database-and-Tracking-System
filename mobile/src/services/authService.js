import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient, { registerAuthTokenGetter } from './apiClient';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

const authApi = {
  login: (payload) => apiClient.post('/auth/login', payload),
  register: (payload) => apiClient.post('/auth/register', payload),
  registerTeacher: (payload) => apiClient.post('/auth/register-teacher', payload),
  updateProfile: (userId, payload, multipart = false) =>
    apiClient.put(`/auth/profile/${userId}`, payload, multipart ? {
      headers: { 'Content-Type': 'multipart/form-data' }
    } : undefined),
  changePassword: (userId, payload) => apiClient.put(`/auth/change-password/${userId}`, payload),
  getUser: (userId) => apiClient.get(`/auth/profile/${userId}`)
};

registerAuthTokenGetter(async () => AsyncStorage.getItem(TOKEN_KEY));

export const authService = {
  async login(email, password) {
    const response = await authApi.login({ email, password });
    const { token, user } = response.data;

    if (token) {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    }

    if (user) {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    }

    return response.data;
  },

  async register(payload) {
    const response = await authApi.register(payload);
    return response.data;
  },

  async registerTeacher(payload) {
    const response = await authApi.registerTeacher(payload);
    return response.data;
  },

  async updateProfile(userId, payload, multipart = false) {
    const response = await authApi.updateProfile(userId, payload, multipart);
    if (response.data?.user) {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.data.user));
    }
    return response.data;
  },

  async changePassword(userId, payload) {
    const response = await authApi.changePassword(userId, payload);
    return response.data;
  },

  async getToken() {
    return AsyncStorage.getItem(TOKEN_KEY);
  },

  async saveUser(user) {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  async getCurrentUser() {
    const user = await AsyncStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  },

  async getUser(userId) {
    const response = await authApi.getUser(userId);
    return response.data;
  },

  async loadSession() {
    const [token, user] = await Promise.all([
      AsyncStorage.getItem(TOKEN_KEY),
      AsyncStorage.getItem(USER_KEY)
    ]);

    return {
      token,
      user: user ? JSON.parse(user) : null
    };
  },

  async logout() {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore network/logout endpoint failures and clear local session anyway.
    }

    await Promise.all([
      AsyncStorage.removeItem(TOKEN_KEY),
      AsyncStorage.removeItem(USER_KEY)
    ]);
  }
};
