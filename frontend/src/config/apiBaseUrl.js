/**
 * Centralized API Base URL configuration
 * Uses environment variables for easy deployment across environments
 */

// Determine if running in browser with network access (not localhost)
const isNetworkAccess = typeof window !== 'undefined' && 
  window.location.hostname !== 'localhost' && 
  window.location.hostname !== '127.0.0.1';

// Image base URL (for serving static files like profile pictures)
// Derived from API_BASE_URL to ensure consistency (e.g., localhost:5001 during local dev)
const deriveImageBaseUrl = (apiUrl) => {
  if (!apiUrl) return '';
  return apiUrl.replace(/\/api$/, '');
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
  let envUrl = normalizeApiBase(import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL);
  
  if (envUrl) {
    // If we are on the network (not localhost), and envUrl points to localhost, 
    // rewrite it to use the current window's hostname so network devices can reach it!
    if (typeof window !== 'undefined' && isNetworkAccess && envUrl.includes('localhost')) {
      envUrl = envUrl.replace('localhost', window.location.hostname);
    }
    return envUrl;
  }

  // Local development fallback should point to backend, not frontend origin.
  if (import.meta.env.DEV) {
    if (typeof window !== 'undefined' && isNetworkAccess) {
      return `http://${window.location.hostname}:5001/api`;
    }
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
export const IMAGE_BASE_URL = deriveImageBaseUrl(API_BASE_URL);

console.log('API Configuration:', {
  API_BASE_URL,
  IMAGE_BASE_URL,
  isNetworkAccess,
  environment: import.meta.env.MODE
});


export const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('data:')) return path; // for base64
  if (path.startsWith('blob:')) return path; // for Object URLs
  if (path.startsWith('file:') || path.includes('fakepath') || /^[a-zA-Z]:\\/.test(path)) return ''; // Sanitize bad db values
  if (path.startsWith('/')) return `${IMAGE_BASE_URL}${path}`;
  return `${IMAGE_BASE_URL}/${path}`;
};
