import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { setupApiInterceptors } from './utils/setupApiInterceptors'

const AUTH_STORAGE_KEYS = new Set(['token', 'user']);

if (typeof window !== 'undefined' && window.localStorage && window.sessionStorage) {
  const local = window.localStorage;
  const session = window.sessionStorage;

  if (!window.__tabScopedAuthPatched) {
    const storagePrototype = window.Storage && window.Storage.prototype;

    const installPrototypePatch = () => {
      if (!storagePrototype) return false;

      const originalGetItem = storagePrototype.getItem;
      const originalSetItem = storagePrototype.setItem;
      const originalRemoveItem = storagePrototype.removeItem;
      const originalClear = storagePrototype.clear;

      const isLocalAuthKey = (storage, key) => storage === local && AUTH_STORAGE_KEYS.has(String(key));

      AUTH_STORAGE_KEYS.forEach((key) => {
        const existingSessionValue = originalGetItem.call(session, key);
        const existingLocalValue = originalGetItem.call(local, key);
        if (!existingSessionValue && existingLocalValue) {
          originalSetItem.call(session, key, existingLocalValue);
        }
        if (existingLocalValue) {
          originalRemoveItem.call(local, key);
        }
      });

      storagePrototype.getItem = function getItem(key) {
        if (isLocalAuthKey(this, key)) {
          return originalGetItem.call(session, key);
        }
        return originalGetItem.call(this, key);
      };

      storagePrototype.setItem = function setItem(key, value) {
        if (isLocalAuthKey(this, key)) {
          originalSetItem.call(session, key, value);
          return;
        }
        originalSetItem.call(this, key, value);
      };

      storagePrototype.removeItem = function removeItem(key) {
        if (isLocalAuthKey(this, key)) {
          originalRemoveItem.call(session, key);
          return;
        }
        originalRemoveItem.call(this, key);
      };

      storagePrototype.clear = function clear() {
        if (this === local) {
          AUTH_STORAGE_KEYS.forEach((key) => originalRemoveItem.call(session, key));
        }
        originalClear.call(this);
      };

      return true;
    };

    const installInstancePatch = () => {
      const originalGetItem = local.getItem.bind(local);
      const originalSetItem = local.setItem.bind(local);
      const originalRemoveItem = local.removeItem.bind(local);
      const originalClear = local.clear.bind(local);

      AUTH_STORAGE_KEYS.forEach((key) => {
        const existingSessionValue = session.getItem(key);
        const existingLocalValue = originalGetItem(key);
        if (!existingSessionValue && existingLocalValue) {
          session.setItem(key, existingLocalValue);
        }
        if (existingLocalValue) {
          originalRemoveItem(key);
        }
      });

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
    };

    try {
      if (!installPrototypePatch()) {
        installInstancePatch();
      }
    } catch {
      installInstancePatch();
    }

    window.__tabScopedAuthPatched = true;
  }
}

setupApiInterceptors()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
