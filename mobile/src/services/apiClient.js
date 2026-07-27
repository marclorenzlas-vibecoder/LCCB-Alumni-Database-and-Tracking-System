import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

let getToken = null;
let onAuthError = null;

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

export const registerAuthTokenGetter = (fn) => {
  getToken = fn;
};

export const registerAuthErrorHandler = (fn) => {
  onAuthError = fn;
};

apiClient.interceptors.request.use(async (config) => {
  if (!getToken) return config;

  const token = normalizeToken(await getToken());
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const responseData = error?.response?.data || {};
    const serverMessage = responseData.error || responseData.message || '';
    const responseCode = responseData.code || '';
    const isExpiredToken =
      status === 401 ||
      (status === 403 && /invalid|expired|token/i.test(serverMessage));
    const isBlockedAccount = status === 403 && responseCode === 'ACCOUNT_BLOCKED';

    if (isExpiredToken || isBlockedAccount) {
      console.warn('[apiClient] auth error received:', status, serverMessage);
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);
      if (onAuthError) {
        onAuthError(isBlockedAccount ? serverMessage : 'Your session has expired. Please log in again.');
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
