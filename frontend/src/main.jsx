import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { setupApiInterceptors } from './utils/setupApiInterceptors'

setupApiInterceptors()

const AUTH_STORAGE_KEYS = new Set(['token', 'user']);

if (typeof window !== 'undefined' && window.localStorage && window.sessionStorage) {
  const local = window.localStorage;
  const session = window.sessionStorage;

  if (!window.__tabScopedAuthPatched) {
    const originalGetItem = local.getItem.bind(local);
    const originalSetItem = local.setItem.bind(local);
    const originalRemoveItem = local.removeItem.bind(local);
    const originalClear = local.clear.bind(local);

    local.getItem = (key) => {
      if (AUTH_STORAGE_KEYS.has(String(key))) {
        return session.getItem(key);
      }
      return originalGetItem(key);
    };

    local.setItem = (key, value) => {
      if (AUTH_STORAGE_KEYS.has(String(key))) {
        session.setItem(key, value);
        return;
      }
      originalSetItem(key, value);
    };

    local.removeItem = (key) => {
      if (AUTH_STORAGE_KEYS.has(String(key))) {
        session.removeItem(key);
        return;
      }
      originalRemoveItem(key);
    };

    local.clear = () => {
      session.removeItem('token');
      session.removeItem('user');
      originalClear();
    };

    window.__tabScopedAuthPatched = true;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
