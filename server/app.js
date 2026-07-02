/**
 * server/app.js
 * -------------
 * Express application configuration.
 * Handles CORS, JSON body parsing, static file serving for uploaded
 * photos, and mounts the /api/reports router.
 */

const express = require("express");
const cors = require("cors");
const path = require("path");

const reportRoutes = require("./routes/reports");

const app = express();

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000"],
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images as static files
// e.g. GET /uploads/1234567890-photo.jpg
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/reports", reportRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "verimap-server" });
});

// 404 fallback
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

module.exports = app;
