import { API_BASE_URL } from '../config/apiBaseUrl';
import { authService } from '../services/authService';

export const BLOCKED_MESSAGE =
  'Your account has been blocked. Please contact the administrator for assistance.';

const POLL_INTERVAL_MS = 30000;

let pollTimer = null;
let guardActive = false;
let checkInFlight = null;
let blockedHandled = false;

export const handleAccountBlocked = (message = BLOCKED_MESSAGE) => {
  if (blockedHandled) return;
  blockedHandled = true;

  stopSessionGuard();

  try {
    sessionStorage.setItem('auth_blocked_message', message);
  } catch {
    // ignore
  }

  try {
    authService.logout();
  } catch {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  try {
    window.dispatchEvent(new Event('logout'));
  } catch {
    // ignore
  }

  window.location.replace('/login');
};

export const checkSessionStatus = async () => {
  if (blockedHandled) {
    return { ok: false, blocked: true };
  }

  const token = localStorage.getItem('token');
  const user = authService.getCurrentUser();

  if (!token || !user?.id) {
    return { ok: true, blocked: false };
  }

  if (checkInFlight) {
    return checkInFlight;
  }

  checkInFlight = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/session-status`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });

      if (response.status === 403) {
        const data = await response.json().catch(() => ({}));
        if (data?.code === 'ACCOUNT_BLOCKED') {
          handleAccountBlocked(data.error || BLOCKED_MESSAGE);
          return { ok: false, blocked: true };
        }
      }

      if (!response.ok) {
        return { ok: false, blocked: false };
      }

      const data = await response.json().catch(() => ({}));
      if (data?.is_blocked === true) {
        handleAccountBlocked(BLOCKED_MESSAGE);
        return { ok: false, blocked: true };
      }

      // Only sync block flag into stored user — never replace full user (preserves alumni, etc.).
      if (user?.is_blocked === true && data?.is_blocked === false) {
        const nextUser = { ...user, is_blocked: false };
        localStorage.setItem('user', JSON.stringify(nextUser));
        window.dispatchEvent(new CustomEvent('auth-user-updated', { detail: nextUser }));
      }

      return { ok: true, blocked: false };
    } catch {
      return { ok: false, blocked: false };
    } finally {
      checkInFlight = null;
    }
  })();

  return checkInFlight;
};

export const startSessionGuard = () => {
  if (guardActive) return;
  guardActive = true;
  blockedHandled = false;

  checkSessionStatus();

  pollTimer = window.setInterval(() => {
    checkSessionStatus();
  }, POLL_INTERVAL_MS);

  const onVisible = () => {
    if (document.visibilityState === 'visible') {
      checkSessionStatus();
    }
  };

  document.addEventListener('visibilitychange', onVisible);

  startSessionGuard._cleanup = () => {
    document.removeEventListener('visibilitychange', onVisible);
  };
};

export const stopSessionGuard = () => {
  guardActive = false;

  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }

  if (typeof startSessionGuard._cleanup === 'function') {
    startSessionGuard._cleanup();
    startSessionGuard._cleanup = null;
  }
};

export const isAccountBlockedResponse = (status, data) =>
  status === 403 && data?.code === 'ACCOUNT_BLOCKED';
