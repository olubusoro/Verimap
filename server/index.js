/**
 * server/index.js
 * ---------------
 * Application entry point.
 * - Creates an HTTP server from the Express app
 * - Attaches a WebSocket server (ws) to the same HTTP server so both
 *   REST and WebSocket traffic share one port
 * - Connects to MongoDB, runs the flood-zone seed, then starts listening
 */

require("dotenv").config();
const http = require("http");
const { WebSocketServer } = require("ws");
const mongoose = require("mongoose");

const app = require("./app");
const { setWss } = require("./services/wsService");
const seedFloodZones = require("./seed/floodZones");

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/verimap";

// ── HTTP + WebSocket server ──────────────────────────────────────────────────
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Store the WS server instance so other modules can broadcast
setWss(wss);

wss.on("connection", (ws, req) => {
  const ip = req.socket.remoteAddress;
  console.log(`[WS] Dispatcher connected from ${ip}`);

  ws.on("close", () => console.log(`[WS] Dispatcher ${ip} disconnected`));
  ws.on("error", (err) => console.error(`[WS] Error from ${ip}:`, err.message));
});

// ── MongoDB ──────────────────────────────────────────────────────────────────
mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log("[DB] MongoDB connected →", MONGO_URI);
    await seedFloodZones();

    server.listen(PORT, () => {
      console.log(`[SERVER] VeriMap running on http://localhost:${PORT}`);
      console.log(`[SERVER] WebSocket available on ws://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("[DB] Connection failed:", err.message);
    process.exit(1);
  });
