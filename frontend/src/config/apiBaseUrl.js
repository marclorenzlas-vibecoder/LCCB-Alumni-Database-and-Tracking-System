/**
 * Centralized API Base URL configuration
 * Uses environment variables for easy deployment across environments
 */

// Determine if running in browser with network access (not localhost)
const isNetworkAccess = typeof window !== 'undefined' && 
  window.location.hostname !== 'localhost' && 
  window.location.hostname !== '127.0.0.1';

// Image base URL (for serving static files like profile pictures)
const getImageBaseUrl = () => {
  if (typeof window === 'undefined') return '';
  
  // If we have API base URL from env, derive image URL from it
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (apiBaseUrl) {
    return apiBaseUrl.replace(/\/api$/, '');
  }

  // Fallback: use current origin
  return window.location.origin;
};

const normalizeApiBase = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  let url = rawUrl.trim();
  if (!url) return null;

  url = url.replace(/\/$/, '');

  // Support legacy env values like .../api/auth by normalizing to .../api
  if (/\/api\/auth$/i.test(url)) {
    url = url.replace(/\/auth$/i, '');
  }

  // If someone sets only host (without /api), append /api
  if (!/\/api$/i.test(url)) {
    url = `${url}/api`;
  }

  return url;
};

// API Base URL with fallback logic
const getApiBaseUrl = () => {
  // Prefer explicit environment variables in all modes.
  // Support both VITE_API_BASE_URL and legacy VITE_API_URL.
  const envUrl = normalizeApiBase(import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL);
  if (envUrl) {
    return envUrl;
  }

  // Local development fallback should point to backend, not frontend origin.
  if (import.meta.env.DEV) {
    return 'http://localhost:5001/api';
  }

  // Fallback for hosted deployments without env config: assume same-origin API proxy
  if (typeof window !== 'undefined' && isNetworkAccess) {
    return `${window.location.origin}/api`;
  }

  if (typeof window !== 'undefined') {
    return 'http://localhost:5001/api';
  }

  return 'http://localhost:5001/api';
};

export const API_BASE_URL = getApiBaseUrl();
export const IMAGE_BASE_URL = getImageBaseUrl();

console.log('API Configuration:', {
  API_BASE_URL,
  IMAGE_BASE_URL,
  isNetworkAccess,
  environment: import.meta.env.MODE
});
