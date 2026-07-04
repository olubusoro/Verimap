/**
 * client/src/components/MapPin.jsx
 * ---------------------------------
 * Renders the Leaflet popup content for a single disaster report.
 * Used by Dashboard.jsx inside a react-leaflet <Popup>.
 *
 * Shows:
 *  - Photo thumbnail (or placeholder icon)
 *  - Status badge (VERIFIED / PENDING)
 *  - Description text
 *  - GPS coordinates
 *  - Composite, CNN, precipitation, and flood-zone scores
 *  - Submission timestamp
 */

import React from "react";

/**
 * @param {{ report: object }} props
 */
export default function MapPin({ report }) {
  const {
    description,
    photo,
    location,
    confidenceScore = 0,
    cnnScore = 0,
    precipScore = 0,
    inFloodZone = false,
    status,
    createdAt,
  } = report;

  const [lng, lat] = location?.coordinates ?? [0, 0];
  const isVerified = status === "VERIFIED";

  const formattedTime = createdAt
    ? new Date(createdAt).toLocaleString("en-NG", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Unknown time";

  return (
    <div className="map-popup">
      {/* Photo */}
      {photo ? (
        <img
          src={photo}
          alt="Disaster report photo"
          className="map-popup__photo"
          onError={(e) => {
            e.target.style.display = "none";
          }}
        />
      ) : (
        <div className="map-popup__no-photo">📷</div>
      )}

      <div className="map-popup__body">
        {/* Status + Time */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className={`badge ${isVerified ? "badge--verified" : "badge--pending"}`}>
            <span className="badge--dot" />
            {status}
          </span>
          <span className="map-popup__coords">{formattedTime}</span>
        </div>

        {/* Description */}
        <p className="map-popup__desc">{description}</p>

        {/* Coordinates */}
        <p className="map-popup__coords">
          📍 {lat.toFixed(5)}°N, {lng.toFixed(5)}°E
        </p>

        {/* Scores */}
        <div className="map-popup__scores">
          <div className="map-popup__score-item">
            <div className="map-popup__score-label">Confidence</div>
            <div
              className="map-popup__score-value"
              style={{ color: isVerified ? "#f87171" : "#fcd34d" }}
            >
              {(confidenceScore * 100).toFixed(1)}%
            </div>
          </div>

          <div className="map-popup__score-item">
            <div className="map-popup__score-label">CNN Score</div>
            <div className="map-popup__score-value">
              {(cnnScore * 100).toFixed(1)}%
            </div>
          </div>

          <div className="map-popup__score-item">
            <div className="map-popup__score-label">Precip.</div>
            <div className="map-popup__score-value">
              {(precipScore * 100).toFixed(1)}%
            </div>
          </div>

          <div className="map-popup__score-item">
            <div className="map-popup__score-label">Flood Zone</div>
            <div
              className="map-popup__score-value"
              style={{ color: inFloodZone ? "#f87171" : "#94a3b8" }}
            >
              {inFloodZone ? "YES ⚠️" : "NO"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
