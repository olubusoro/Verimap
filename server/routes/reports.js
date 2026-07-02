/**
 * server/routes/reports.js
 * ------------------------
 * The core API router for VeriMap.
 */

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const Report = require("../models/Report");
const { analyzeImage } = require("../services/aiService");
const { getPrecipitation } = require("../services/weatherService");
const { isInFloodZone } = require("../services/geoService");
const { broadcast } = require("../services/wsService");

const router = express.Router();

// ── Multer storage configuration ─────────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, "../uploads");

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are accepted"));
    }
  },
});

// ── POST /api/reports ─────────────────────────────────────────────────────────
router.post("/", upload.single("photo"), async (req, res) => {
  try {
    const { description, lat, lng } = req.body;

    if (!description || !lat || !lng) {
      return res.status(400).json({
        error: "description, lat, and lng are all required",
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: "lat and lng must be valid numbers" });
    }

    // ── 1. Persist initial PENDING report ──────────────────────────────────
    const report = new Report({
      description,
      photo: req.file ? `/uploads/${req.file.filename}` : null,
      location: {
        type: "Point",
        coordinates: [longitude, latitude], // GeoJSON: [lng, lat]
      },
      status: "PENDING",
    });
    await report.save();
    console.log(`[REPORT] Saved PENDING report ${report._id}`);

    // ── 2. Run all three scoring signals in parallel ────────────────────────
    const [cnnResult, precipResult, zoneResult] = await Promise.allSettled([
      req.file ? analyzeImage(req.file.path) : Promise.resolve({ cnnScore: 0, aiLabel: "unknown" }),
      getPrecipitation(latitude, longitude),
      isInFloodZone(latitude, longitude),
    ]);

    // Extract the new object from the AI service
    const aiData = cnnResult.status === "fulfilled" ? cnnResult.value : { cnnScore: 0, aiLabel: "unknown" };
    const cnnScore = aiData.cnnScore;
    const aiLabel = aiData.aiLabel;

    const precipScore = precipResult.status === "fulfilled" ? precipResult.value : 0;
    const inFloodZone = zoneResult.status === "fulfilled" ? zoneResult.value : false;

    // ── 3. Composite confidence score (DYNAMIC RUBRIC) ─────────────────────
    let confidenceScore = 0;

    if (aiLabel === "flood") {
      // FLOOD RUBRIC: 50% AI + 30% Rain + 20% Map Zone
      // Note: precipScore is assumed to be 0-1, just like cnnScore.
      confidenceScore = (0.5 * cnnScore) + (0.3 * precipScore) + (0.2 * (inFloodZone ? 1 : 0));
      
    } else if (aiLabel === "collapsed_building") {
      // BUILDING RUBRIC: Ignore Rain and Flood Zones!
      // 90% AI + 10% base points just for having valid GPS coordinates
      confidenceScore = (0.9 * cnnScore) + 0.10;
      
    } else {
      // DEFAULT RUBRIC
      confidenceScore = 0.5 * cnnScore;
    }

    // Cap the score at 1.0 (100%) so it doesn't break the UI
    confidenceScore = Math.min(1, Math.max(0, confidenceScore));

    const status = confidenceScore >= 0.8 ? "VERIFIED" : "PENDING";

    // ── 4. Update report in DB ─────────────────────────────────────────────
    report.cnnScore = parseFloat(cnnScore.toFixed(4));
    report.precipScore = parseFloat(precipScore.toFixed(4));
    report.inFloodZone = inFloodZone;
    report.confidenceScore = parseFloat(confidenceScore.toFixed(4));
    report.status = status;
    await report.save();

    console.log(
      `[REPORT] ${report._id} → cnn=${cnnScore.toFixed(3)} label=${aiLabel} ` +
        `precip=${precipScore.toFixed(3)} zone=${inFloodZone} ` +
        `composite=${confidenceScore.toFixed(3)} → ${status}`
    );

    // ── 5. WebSocket broadcast ─────────────────────────────────────────────
    broadcast("new_report", report.toObject());
    if (status === "VERIFIED") {
      broadcast("new_verified_report", report.toObject());
    }

    // ── 6. Respond to citizen ──────────────────────────────────────────────
    return res.status(201).json({
      success: true,
      message:
        status === "VERIFIED"
          ? "Your report has been VERIFIED and dispatched."
          : "Report received. Under review.",
      report: {
        id: report._id,
        status: report.status,
        confidenceScore: report.confidenceScore,
        cnnScore: report.cnnScore,
        precipScore: report.precipScore,
        inFloodZone: report.inFloodZone,
      },
    });
  } catch (err) {
    console.error("[REPORT] Submission error:", err);
    return res.status(500).json({ error: "Server error: " + err.message });
  }
});

// ── GET /api/reports ──────────────────────────────────────────────────────────
router.get("/", async (_req, res) => {
  try {
    const reports = await Report.find({})
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();
    return res.json(reports);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/reports/:id ──────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const report = await Report.findById(req.params.id).lean();
    if (!report) return res.status(404).json({ error: "Report not found" });
    return res.json(report);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;