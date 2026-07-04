/**
 * client/src/pages/ReportForm.jsx
 * --------------------------------
 * Citizen disaster reporting form.
 *
 * Features:
 *  1. GPS auto-capture via browser Geolocation API
 *  2. Drag-and-drop / click photo upload with live preview
 *  3. Text description field
 *  4. Submits multipart/form-data to POST /api/reports
 *  5. Shows confidence breakdown on success
 */

import React, { useState, useEffect, useRef, useCallback } from "react";

const API_BASE = "/api";

export default function ReportForm() {
  // ── GPS ──────────────────────────────────────────────────────────────────
  const [coords, setCoords] = useState(null);
  const [gpsError, setGpsError] = useState("");
  const [gpsLoading, setGpsLoading] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser.");
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsLoading(false);
      },
      (err) => {
        setGpsError(`Location error: ${err.message}`);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, []);

  // ── Photo upload ──────────────────────────────────────────────────────────
  const [photo, setPhoto] = useState(null);         // File object
  const [photoPreview, setPhotoPreview] = useState(null); // Object URL
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  }, []);

  const handleFileChange = (e) => handleFile(e.target.files[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const removePhoto = () => {
    setPhoto(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Cleanup object URL on unmount
  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview); }, [photoPreview]);

  // ── Form state ────────────────────────────────────────────────────────────
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { success, message, report }
  const [error, setError] = useState("");

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);

    if (!description.trim()) {
      setError("Please describe the incident.");
      return;
    }
    if (!coords) {
      setError("GPS coordinates are required. Please allow location access.");
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("description", description.trim());
      formData.append("lat", coords.lat);
      formData.append("lng", coords.lng);
      if (photo) formData.append("photo", photo);

      const res = await fetch(`${API_BASE}/reports`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Submission failed");

      setResult(data);
      setDescription("");
      removePhoto();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="report-page">
      <div className="report-form-wrapper">
        {/* Header */}
        <div className="report-form-header">
          <h1>
            🚨 Report an&nbsp;
            <span style={{ color: "var(--accent-red)" }}>Incident</span>
          </h1>
          <p>
            Submit a geo-tagged disaster report. Our AI system will assess
            severity and alert dispatchers in real time.
          </p>
        </div>

        <div className="card">
          <form className="report-form" onSubmit={handleSubmit}>
            {/* ── GPS Widget ─────────────────────────────────────────── */}
            <div className="gps-widget">
              <span className="gps-widget__icon">
                {gpsLoading ? "⏳" : coords ? "📍" : "⚠️"}
              </span>
              <div className="gps-widget__info">
                <div className="gps-widget__title">
                  {gpsLoading
                    ? "Acquiring GPS…"
                    : coords
                    ? "Location Captured"
                    : "Location Unavailable"}
                </div>
                {coords ? (
                  <div className="gps-widget__coords">
                    {coords.lat.toFixed(6)}°N &nbsp;·&nbsp; {coords.lng.toFixed(6)}°E
                  </div>
                ) : gpsError ? (
                  <div className="gps-widget__status">{gpsError}</div>
                ) : (
                  <div className="gps-widget__status">Waiting for browser permission…</div>
                )}
              </div>
            </div>

            {/* ── Photo Upload ───────────────────────────────────────── */}
            <div className="field">
              <label className="field__label">Disaster Photo</label>

              {photoPreview ? (
                <div className="photo-preview">
                  <img src={photoPreview} alt="Preview of uploaded disaster photo" />
                  <button
                    type="button"
                    className="photo-preview__remove"
                    onClick={removePhoto}
                    aria-label="Remove photo"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div
                  className={`drop-zone${isDragOver ? " drop-zone--dragover" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  aria-label="Upload disaster photo"
                  onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="drop-zone__input"
                    onChange={handleFileChange}
                    tabIndex={-1}
                    id="photo-upload"
                  />
                  <span className="drop-zone__icon">📸</span>
                  <p className="drop-zone__text">
                    <strong>Click to upload</strong> or drag &amp; drop
                  </p>
                  <p className="drop-zone__hint">JPG, PNG, WEBP · max 10 MB</p>
                </div>
              )}
            </div>

            {/* ── Description ────────────────────────────────────────── */}
            <div className="field">
              <label className="field__label" htmlFor="description">
                Incident Description
              </label>
              <textarea
                id="description"
                className="field__textarea"
                placeholder="Describe what you're seeing — location details, severity, people affected…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={2000}
                required
              />
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "right" }}>
                {description.length} / 2000
              </span>
            </div>

            {/* ── Error ──────────────────────────────────────────────── */}
            {error && (
              <div className="submit-result submit-result--error">
                <div className="submit-result__heading">⚠️ Submission Error</div>
                {error}
              </div>
            )}

            {/* ── Success Result ─────────────────────────────────────── */}
            {result?.success && (
              <div className="submit-result submit-result--success">
                <div className="submit-result__heading">
                  {result.report?.status === "VERIFIED"
                    ? "✅ Report Verified & Dispatched!"
                    : "📋 Report Submitted — Under Review"}
                </div>
                <p>{result.message}</p>

                <div className="score-grid">
                  <div className="score-item">
                    <div className="score-item__label">Confidence</div>
                    <div className="score-item__value">
                      {((result.report?.confidenceScore ?? 0) * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="score-item">
                    <div className="score-item__label">CNN Score</div>
                    <div className="score-item__value">
                      {((result.report?.cnnScore ?? 0) * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="score-item">
                    <div className="score-item__label">Flood Zone</div>
                    <div className="score-item__value">
                      {result.report?.inFloodZone ? "YES ⚠️" : "NO"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Submit Button ──────────────────────────────────────── */}
            <button
              type="submit"
              className="btn btn--primary"
              disabled={submitting || gpsLoading || !coords}
              id="submit-report"
            >
              {submitting ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  Analysing &amp; Submitting…
                </>
              ) : (
                "🚀 Submit Disaster Report"
              )}
            </button>

            {!coords && !gpsLoading && (
              <p style={{ fontSize: "0.8rem", color: "var(--accent-amber)", textAlign: "center" }}>
                📡 Enable location access in your browser to submit a report.
              </p>
            )}
          </form>
        </div>

        {/* Info footer */}
        <p style={{ marginTop: "1.5rem", fontSize: "0.8125rem", color: "var(--text-muted)", textAlign: "center" }}>
          Reports are analysed using AI + weather data + geospatial flood zone mapping.
          Composite confidence ≥ 80% triggers automatic dispatch.
        </p>
      </div>
    </div>
  );
}
