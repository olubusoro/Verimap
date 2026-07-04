/**
 * client/src/pages/Dashboard.jsx
 * --------------------------------
 * Dispatcher dashboard with a full-screen Leaflet map of Lagos.
 *
 * Features:
 *  - Fetches all reports on mount via GET /api/reports
 *  - WebSocket connection: new_report events add pins in real time
 *  - Red CircleMarker = VERIFIED, Yellow = PENDING
 *  - Clicking a pin opens a popup with photo, scores, description
 *  - Sidebar list mirrors all reports; clicking a list item flies the map
 *    to that pin and opens its popup
 *  - Header shows live counts + WebSocket connection status
 */

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useWebSocket } from "../hooks/useWebSocket";
import MapPin from "../components/MapPin";

// Lagos centre coordinates
const LAGOS_CENTER = [6.5244, 3.3792];
const DEFAULT_ZOOM = 12;

const API_BASE = "/api";

// ── FlyTo helper (child of MapContainer so it can call useMap) ────────────────
function FlyToReport({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      const [lng, lat] = target.location.coordinates;
      map.flyTo([lat, lng], 15, { duration: 1.2 });
    }
  }, [target, map]);
  return null;
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [flyTarget, setFlyTarget] = useState(null);
  const markerRefs = useRef({});

  // ── Fetch all reports on mount ────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/reports`);
        const data = await res.json();
        setReports(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch reports:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── WebSocket: handle incoming messages ───────────────────────────────────
  const handleWsMessage = useCallback((event, data) => {
    if (event === "new_report" || event === "new_verified_report") {
      setReports((prev) => {
        // Avoid duplicates — update if already exists, else prepend
        const idx = prev.findIndex((r) => r._id === data._id);
        if (idx !== -1) {
          const updated = [...prev];
          updated[idx] = data;
          return updated;
        }
        return [data, ...prev];
      });
    }
  }, []);

  const { isConnected } = useWebSocket(handleWsMessage);

  // ── Derived counts ─────────────────────────────────────────────────────────
  const verifiedCount = reports.filter((r) => r.status === "VERIFIED").length;
  const pendingCount = reports.filter((r) => r.status === "PENDING").length;

  // ── Marker style ───────────────────────────────────────────────────────────
  const markerOptions = (status) =>
    status === "VERIFIED"
      ? {
          color: "#ef4444",
          fillColor: "#ef4444",
          fillOpacity: 0.85,
          weight: 2,
          radius: 10,
        }
      : {
          color: "#f59e0b",
          fillColor: "#f59e0b",
          fillOpacity: 0.75,
          weight: 2,
          radius: 7,
        };

  // ── Click sidebar item → fly to map pin ───────────────────────────────────
  const handleSidebarClick = (report) => {
    setFlyTarget(report);
    // Open the popup after a short delay (fly animation)
    setTimeout(() => {
      const ref = markerRefs.current[report._id];
      if (ref) ref.openPopup();
    }, 1300);
  };

  return (
    <div className="dashboard">
      {/* ── Header ── */}
      <div className="dashboard__header">
        <div className="dashboard__title">🗺️ Lagos Disaster Intelligence Map</div>

        <div className="dashboard__stats">
          <div className="stat-chip stat-chip--red">
            <span className="stat-chip__dot" />
            {verifiedCount} Verified
          </div>
          <div className="stat-chip stat-chip--amber">
            <span className="stat-chip__dot" />
            {pendingCount} Pending
          </div>
          <div className="stat-chip">
            📋 {reports.length} Total
          </div>
        </div>

        <div className={`ws-indicator${isConnected ? " ws-indicator--connected" : ""}`}>
          <span className="ws-indicator__dot" />
          {isConnected ? "Live" : "Reconnecting…"}
        </div>
      </div>

      {/* ── Map + Sidebar ── */}
      <div className="dashboard__body">
        {/* Map */}
        <div className="dashboard__map-container">
          {loading && (
            <div className="map-overlay">
              <span className="map-overlay__text">Loading map data…</span>
            </div>
          )}

          <MapContainer
            center={LAGOS_CENTER}
            zoom={DEFAULT_ZOOM}
            className="leaflet-map"
            zoomControl={true}
            scrollWheelZoom={true}
          >
            {/* Dark tile layer from CartoDB */}
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />

            {/* FlyTo on sidebar click */}
            <FlyToReport target={flyTarget} />

            {/* Report markers */}
            {reports.map((report) => {
              const [lng, lat] = report.location?.coordinates ?? [0, 0];
              if (!lat || !lng) return null;

              return (
                <CircleMarker
                  key={report._id}
                  center={[lat, lng]}
                  {...markerOptions(report.status)}
                  ref={(el) => {
                    if (el) markerRefs.current[report._id] = el;
                  }}
                  eventHandlers={{
                    click: () => setFlyTarget(null), // reset so FlyToReport doesn't re-fire
                  }}
                >
                  <Popup maxWidth={340} minWidth={280}>
                    <MapPin report={report} />
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>

        {/* Sidebar */}
        <div className="dashboard__sidebar">
          <div className="sidebar__header">
            <div className="sidebar__title">Recent Reports</div>
            <div className="sidebar__count">{reports.length}</div>
          </div>

          <div className="sidebar__list">
            {reports.length === 0 ? (
              <div className="empty-state">
                <span className="empty-state__icon">🔍</span>
                <p>No reports yet. Submit the first one!</p>
              </div>
            ) : (
              reports.map((report) => (
                <div
                  key={report._id}
                  className={`report-card report-card--${report.status.toLowerCase()}`}
                  onClick={() => handleSidebarClick(report)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && handleSidebarClick(report)}
                  aria-label={`View report: ${report.description}`}
                >
                  <div className="report-card__top">
                    <span
                      className={`badge ${
                        report.status === "VERIFIED"
                          ? "badge--verified"
                          : "badge--pending"
                      }`}
                    >
                      <span className="badge--dot" />
                      {report.status}
                    </span>
                    {report.inFloodZone && (
                      <span style={{ fontSize: "0.75rem", color: "var(--accent-red)" }}>
                        ⚠️ Flood Zone
                      </span>
                    )}
                  </div>

                  <p className="report-card__desc">{report.description}</p>

                  <div className="report-card__meta">
                    <span className="report-card__score">
                      {((report.confidenceScore ?? 0) * 100).toFixed(1)}% confidence
                    </span>
                    <span className="report-card__time">
                      {report.createdAt
                        ? new Date(report.createdAt).toLocaleTimeString("en-NG", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
