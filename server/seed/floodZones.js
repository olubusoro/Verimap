/**
 * server/seed/floodZones.js
 * -------------------------
 * Seeds pre-defined high-risk Lagos flood zone polygons into MongoDB.
 * Called once at startup; skips seeding if documents already exist.
 *
 * Polygons are approximate GeoJSON boundaries for historically flood-prone
 * areas in Lagos State, Nigeria.
 *
 * Sources / references:
 *   - Lagos State Emergency Management Agency (LASEMA) risk maps
 *   - Nigerian Hydrological Services Agency (NIHSA) flood advisories
 */

const { Zone } = require("../services/geoService");

/**
 * GeoJSON Polygon coordinates follow the Right-Hand Rule:
 * exterior rings are counter-clockwise.
 * All coordinates are [longitude, latitude].
 */
const LAGOS_FLOOD_ZONES = [
  {
    name: "Lagos Island / Eko Atlantic Coastal Zone",
    area: {
      type: "Polygon",
      coordinates: [
        [
          [3.3600, 6.4350],
          [3.4300, 6.4350],
          [3.4300, 6.4750],
          [3.3600, 6.4750],
          [3.3600, 6.4350],
        ],
      ],
    },
  },
  {
    name: "Surulere / Orile Agege Flood Basin",
    area: {
      type: "Polygon",
      coordinates: [
        [
          [3.3400, 6.4850],
          [3.3950, 6.4850],
          [3.3950, 6.5300],
          [3.3400, 6.5300],
          [3.3400, 6.4850],
        ],
      ],
    },
  },
  {
    name: "Badagry Creek / Festac Low-Lying Zone",
    area: {
      type: "Polygon",
      coordinates: [
        [
          [3.2300, 6.4350],
          [3.3200, 6.4350],
          [3.3200, 6.4800],
          [3.2300, 6.4800],
          [3.2300, 6.4350],
        ],
      ],
    },
  },
  {
    name: "Lekki Peninsula / Ajah Flood Zone",
    area: {
      type: "Polygon",
      coordinates: [
        [
          [3.5200, 6.4300],
          [3.6500, 6.4300],
          [3.6500, 6.4700],
          [3.5200, 6.4700],
          [3.5200, 6.4300],
        ],
      ],
    },
  },
  {
    name: "Ikorodu / Sagamu Expressway Flood Plain",
    area: {
      type: "Polygon",
      coordinates: [
        [
          [3.4900, 6.5700],
          [3.5800, 6.5700],
          [3.5800, 6.6300],
          [3.4900, 6.6300],
          [3.4900, 6.5700],
        ],
      ],
    },
  },
];

/**
 * Idempotent seed function — safe to call on every server start.
 */
async function seedFloodZones() {
  try {
    const count = await Zone.countDocuments();

    if (count > 0) {
      console.log(`[SEED] Flood zones already present (${count} zones) — skipping.`);
      return;
    }

    // Ensure 2dsphere index exists before inserting
    await Zone.collection.createIndex({ area: "2dsphere" });

    const result = await Zone.insertMany(LAGOS_FLOOD_ZONES);
    console.log(`[SEED] Inserted ${result.length} Lagos flood zone(s) into MongoDB.`);
  } catch (err) {
    console.warn("[SEED] Flood zone seeding failed:", err.message);
  }
}

module.exports = seedFloodZones;
