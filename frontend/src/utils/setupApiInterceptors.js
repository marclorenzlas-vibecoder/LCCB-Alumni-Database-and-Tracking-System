import axios from 'axios';
import { handleAccountBlocked, isAccountBlockedResponse } from './sessionGuard';

let installed = false;

export const setupApiInterceptors = () => {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = error?.response?.status;
      const data = error?.response?.data;
      if (isAccountBlockedResponse(status, data)) {
        handleAccountBlocked(data?.error);
      }
      return Promise.reject(error);
    }
  );

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);

    const requestUrl = typeof args[0] === 'string'
      ? args[0]
      : args[0]?.url || '';

    // Session guard handles this endpoint; avoid duplicate blocked handling.
    if (!requestUrl.includes('/auth/session-status') && response.status === 403) {
      try {
        const data = await response.clone().json();
        if (isAccountBlockedResponse(response.status, data)) {
          handleAccountBlocked(data?.error);
        }
      } catch {
        // ignore parse errors
      }
    }

    return response;
  };
};
