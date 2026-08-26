import { API_ORIGIN } from '../config/api';

const wsUrl = `${API_ORIGIN.replace(/^http/, 'ws')}/realtime`;

let socket = null;
let reconnectTimer = null;
const listeners = new Map();

const emitLocal = (event, payload) => {
  const set = listeners.get(event);
  if (set) {
    set.forEach((handler) => {
      try {
        handler(payload);
      } catch (error) {
        console.error('Realtime handler error:', error);
      }
    });
  }
};

const connect = () => {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  socket = new WebSocket(wsUrl);

  socket.onmessage = (message) => {
    try {
      const parsed = JSON.parse(message.data);
      if (parsed?.event) {
        emitLocal(parsed.event, parsed.payload || {});
      }
    } catch (error) {
      console.error('Realtime parse error:', error);
    }
  };

  socket.onclose = () => {
    reconnectTimer = setTimeout(connect, 1500);
  };

  socket.onerror = () => {
    if (socket) {
      socket.close();
    }
  };
};

const subscribe = (event, handler) => {
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  listeners.get(event).add(handler);
  connect();

  return () => {
    const set = listeners.get(event);
    if (!set) return;
    set.delete(handler);
  };
};

export const realtimeClient = {
  connect,
  subscribe
};
