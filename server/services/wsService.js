/**
 * server/services/wsService.js
 * ----------------------------
 * Thin wrapper around the `ws` WebSocketServer instance.
 *
 * Because index.js creates the WS server after the Express app is already
 * built, we use a module-level variable and a setter so other modules
 * (e.g. routes/reports.js) can call broadcast() without circular imports.
 *
 * broadcast() serialises an event + payload as JSON and sends it to every
 * currently connected dispatcher client.
 */

const WebSocket = require("ws");

/** @type {import('ws').WebSocketServer | null} */
let wss = null;

/**
 * Store the WebSocketServer instance created in index.js.
 * Must be called before any broadcast() calls.
 *
 * @param {import('ws').WebSocketServer} instance
 */
function setWss(instance) {
  wss = instance;
}

/**
 * Broadcast a typed event to all connected WebSocket clients.
 *
 * @param {string} event  - Event name, e.g. "new_verified_report"
 * @param {object} data   - Serialisable payload
 */
function broadcast(event, data) {
  if (!wss) {
    console.warn("[WS] broadcast() called before setWss()");
    return;
  }

  const message = JSON.stringify({ event, data });
  let sent = 0;

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
      sent++;
    }
  });

  console.log(`[WS] Broadcasted "${event}" to ${sent} client(s)`);
}

module.exports = { setWss, broadcast };
