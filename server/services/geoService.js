/**
 * server/services/geoService.js
 * ------------------------------
 * Uses MongoDB's 2dsphere geospatial query to determine whether a given
 * (lat, lng) coordinate falls inside any pre-defined Lagos flood zone polygon.
 *
 * The Zone documents are seeded at startup by seed/floodZones.js.
 * The `area` field on Zone holds a GeoJSON Polygon.
 *
 * $geoIntersects with a Point effectively checks "point in polygon" —
 * returns the first matching zone or null.
 */

const mongoose = require("mongoose");

// ---------------------------------------------------------------------------
// Zone model
// ---------------------------------------------------------------------------
const ZoneSchema = new mongoose.Schema({
  name: { type: String, required: true },
  /** GeoJSON Polygon geometry */
  area: {
    type: { type: String, enum: ["Polygon"], required: true },
    coordinates: { type: [[[Number]]], required: true },
  },
});

// 2dsphere index must exist for geospatial queries to work
ZoneSchema.index({ area: "2dsphere" });

// Use existing model or create it (prevents OverwriteModelError on hot reload)
const Zone = mongoose.models.Zone || mongoose.model("Zone", ZoneSchema);

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

/**
 * Returns true if the coordinate lies inside any seeded Lagos flood zone.
 *
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<boolean>}
 */
async function isInFloodZone(lat, lng) {
  try {
    const match = await Zone.findOne({
      area: {
        $geoIntersects: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat], // GeoJSON uses [lng, lat]
          },
        },
      },
    }).lean();

    const result = !!match;
    console.log(
      `[GEO] lat=${lat} lng=${lng} inFloodZone=${result}${result ? ` (${match.name})` : ""}`
    );
    return result;
  } catch (err) {
    console.warn("[GEO] Geospatial query failed:", err.message);
    return false;
  }
}

module.exports = { isInFloodZone, Zone };
