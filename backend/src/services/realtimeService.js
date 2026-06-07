const { WebSocketServer, WebSocket } = require('ws');

let wss = null;

function initRealtime(server) {
  if (wss) return wss;

  wss = new WebSocketServer({ server, path: '/realtime' });

  wss.on('connection', (socket) => {
    try {
      socket.send(JSON.stringify({
        event: 'realtime.connected',
        payload: { ok: true },
        timestamp: Date.now()
      }));
    } catch (err) {
      console.error('Realtime welcome send error:', err.message);
    }
  });

  return wss;
}

function broadcastUpdate(event, payload = {}) {
  if (!wss) return;

  const message = JSON.stringify({
    event,
    payload,
    timestamp: Date.now()
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
      } catch (err) {
        console.error('Realtime broadcast error:', err.message);
      }
    }
  });
}

module.exports = {
  initRealtime,
  broadcastUpdate
};
