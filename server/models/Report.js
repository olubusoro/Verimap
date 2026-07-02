/**
 * server/models/Report.js
 * -----------------------
 * Mongoose schema for a disaster report.
 *
 * The `location` field uses GeoJSON Point format so MongoDB can:
 *   - Store coordinates correctly
 *   - Run 2dsphere spatial queries (e.g. $geoWithin, $near)
 *
 * The `2dsphere` index enables the flood-zone geospatial lookup.
 */

const mongoose = require("mongoose");

const ReportSchema = new mongoose.Schema(
  {
    /** Free-text description of the disaster from the citizen */
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: 2000,
    },

    /** Relative path to the uploaded photo — e.g. /uploads/xyz.jpg */
    photo: {
      type: String,
      default: null,
    },

    /**
     * GeoJSON Point: { type: "Point", coordinates: [longitude, latitude] }
     * Note: GeoJSON uses [lng, lat] order (x, y).
     */
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },

    /** Confidence score (0–1) returned by the FastAPI MobileNetV2 service */
    cnnScore: { type: Number, default: 0, min: 0, max: 1 },

    /** Normalised precipitation score (0–1) from OpenWeatherMap */
    precipScore: { type: Number, default: 0, min: 0, max: 1 },

    /** Whether the report coordinates fall inside a pre-defined flood zone */
    inFloodZone: { type: Boolean, default: false },

    /** Composite confidence: 0.5*cnn + 0.3*precip + 0.2*zone */
    confidenceScore: { type: Number, default: 0, min: 0, max: 1 },

    /** ImageNet top label returned by the AI service */
    aiLabel: { type: String, default: "" },

    /** PENDING → being processed; VERIFIED → confidence ≥ 0.80 */
    status: {
      type: String,
      enum: ["PENDING", "VERIFIED"],
      default: "PENDING",
    },
  },
  {
    timestamps: true, // adds createdAt + updatedAt automatically
  }
);

// 2dsphere index required for geospatial queries
ReportSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Report", ReportSchema);
