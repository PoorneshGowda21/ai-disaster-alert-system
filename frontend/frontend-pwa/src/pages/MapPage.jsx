import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import MapView from "../components/MapView";

const API = "http://localhost:5000";

export default function MapPage() {
  const routerLocation = useLocation();
  const navigate = useNavigate();

  const city = routerLocation.state?.city;

  // 🚨 Redirect if no city
  useEffect(() => {
    if (!city) navigate("/");
  }, [city, navigate]);

  const [reports, setReports] = useState([]);
  const [risk, setRisk] = useState(null);
  const [riskLoading, setRiskLoading] = useState(true);
  const [center, setCenter] = useState([12.9716, 77.5946]);
  const [mapLoading, setMapLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Report form state
  const [form, setForm] = useState({
    type: "",
    severity: "",
    description: "",
    latitude: "",
    longitude: "",
    city: city || "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formOpen, setFormOpen] = useState(true);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // 🔹 Geocode city → coordinates
  useEffect(() => {
    if (!city) return;
    setMapLoading(true);
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}&limit=1`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          setCenter([lat, lon]);
          // Auto-fill lat/lon in form
          setForm((prev) => ({ ...prev, latitude: lat.toFixed(4), longitude: lon.toFixed(4) }));
        } else {
          showToast("City not found on map — showing default view.", "error");
        }
      })
      .catch(() => showToast("Geocoding failed.", "error"))
      .finally(() => setMapLoading(false));
  }, [city]);

  // 🔹 Load reports
  const loadReports = useCallback(() => {
    axios
      .get(`${API}/reports`)
      .then((res) => setReports(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => { loadReports(); }, [loadReports]);

  // 🔹 AI prediction — re-runs when city OR reports change
  useEffect(() => {
    if (!city) return;
    setRiskLoading(true);

    // Dynamic rainfall based on city name (demo variation) + report count
    const cityHash = city.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const baseRainfall = 20 + (cityHash % 80); // 20–99mm based on city
    const reportBonus  = reports.filter(r => r.city?.toLowerCase() === city.toLowerCase()).length * 10;
    const rainfall = Math.min(baseRainfall + reportBonus, 120);

    axios
      .post(`${API}/predict-risk`, { rainfall, city })
      .then((res) => setRisk(res.data.risk))
      .catch(() => setRisk(null))
      .finally(() => setRiskLoading(false));
  }, [city, reports]);


  // 🔹 Submit report
  const handleSubmit = async () => {
    if (!form.type || !form.severity) {
      showToast("Please fill Type and Severity.", "error");
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API}/report`, { ...form, city });
      showToast("✅ Report submitted successfully!");
      setForm({ type: "", severity: "", description: "", latitude: center[0].toFixed(4), longitude: center[1].toFixed(4), city: city || "" });
      loadReports();
    } catch {
      showToast("Failed to submit report.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const riskClass = risk === "HIGH" ? "high" : risk === "MODERATE" ? "mod" : "low";
  const riskIcon  = risk === "HIGH" ? "🔴" : risk === "MODERATE" ? "🟠" : risk === "LOW" ? "🟢" : "⏳";
  const riskLabel = risk || "Loading...";

  if (!city) return null;

  return (
    <div className="map-page">
      {/* Navbar */}
      <nav className="navbar">
        <span className="navbar-brand">
          <span className="logo-icon">🛡️</span>
          DisasterWatch AI
        </span>
        <div className="navbar-links">
          <button className="btn btn-ghost" style={{ padding: "7px 14px", fontSize: "13px" }}
            onClick={() => navigate("/")}>
            ← Back
          </button>
          <button className="btn btn-ghost" style={{ padding: "7px 14px", fontSize: "13px" }}
            onClick={() => navigate("/admin")}>
            Admin
          </button>
        </div>
      </nav>

      {/* Main layout */}
      <div className="map-layout">
        {/* ── Sidebar ── */}
        <aside className="map-sidebar">
          {/* Header */}
          <div className="sidebar-header">
            <div className="sidebar-title">
              📍 {city}
            </div>
            <div className="city-label">
              <span className="dot" />
              Live monitoring active
            </div>
          </div>

          {/* Risk Banner */}
          <div className={`risk-banner ${riskLoading ? "low" : riskClass}`}>
            <span className="risk-icon">{riskLoading ? "⏳" : riskIcon}</span>
            <div className="risk-info">
              <div className="label">AI Risk Level</div>
              <div className="value">{riskLoading ? "Analyzing..." : riskLabel}</div>
            </div>
          </div>

          {/* Sidebar scrollable */}
          <div className="sidebar-content">

            {/* Report form section */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                <div className="section-title">📋 Submit Incident</div>
                <button
                  style={{ fontSize: "11px", cursor: "pointer", background: "none", border: "none", color: "var(--text-muted)" }}
                  onClick={() => setFormOpen(!formOpen)}
                >
                  {formOpen ? "▲ Hide" : "▼ Show"}
                </button>
              </div>

              {formOpen && (
                <div className="report-form">
                  <div className="form-group">
                    <label className="form-label">Incident Type *</label>
                    <select
                      className="input"
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                    >
                      <option value="">Select type...</option>
                      <option>Flood</option>
                      <option>Fire</option>
                      <option>Landslide</option>
                      <option>Earthquake</option>
                      <option>Storm</option>
                      <option>Other</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Severity *</label>
                    <select
                      className="input"
                      value={form.severity}
                      onChange={(e) => setForm({ ...form, severity: e.target.value })}
                    >
                      <option value="">Select severity...</option>
                      <option>Low</option>
                      <option>Moderate</option>
                      <option>High</option>
                      <option>Critical</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <input
                      className="input"
                      placeholder="What happened? (optional)"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Latitude</label>
                      <input
                        className="input"
                        placeholder="12.9716"
                        value={form.latitude}
                        onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Longitude</label>
                      <input
                        className="input"
                        placeholder="77.5946"
                        value={form.longitude}
                        onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                      />
                    </div>
                  </div>

                  <button
                    className="submit-btn"
                    onClick={handleSubmit}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner" style={{ width: "16px", height: "16px", borderWidth: "2px" }} />
                        Submitting...
                      </>
                    ) : (
                      <>📤 Submit Report</>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Recent reports list */}
            <div>
              <div className="section-title">🗂️ Recent Reports ({reports.length})</div>
              {reports.length === 0 ? (
                <div className="empty-state" style={{ padding: "20px 0" }}>
                  <span className="empty-icon">📭</span>
                  <p>No reports yet for this area</p>
                </div>
              ) : (
                reports.slice(0, 8).map((r) => (
                  <div key={r.id} className="report-row">
                    <span className="report-type">
                      {r.type === "Flood" ? "🌊" : r.type === "Fire" ? "🔥" : r.type === "Landslide" ? "⛰️" : r.type === "Earthquake" ? "🌍" : r.type === "Storm" ? "🌪️" : "⚠️"}
                      {" "}{r.type}
                    </span>
                    <span className="report-details">
                      {r.city && <><strong>{r.city}</strong> · </>}
                      {r.severity} · {r.description || "No description"}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* AI explanation */}
            <div style={{
              padding: "14px",
              background: "rgba(79,142,247,0.06)",
              border: "1px solid rgba(79,142,247,0.15)",
              borderRadius: "8px",
              fontSize: "12px",
              color: "var(--text-muted)",
              lineHeight: "1.6",
            }}>
              <strong style={{ color: "var(--accent-blue)" }}>🤖 AI Model Info</strong><br />
              Risk is predicted using a Decision Tree model trained on rainfall data and community report count.
              Current rainfall input: <strong style={{ color: "var(--text-primary)" }}>40mm</strong>.
            </div>
          </div>
        </aside>

        {/* ── Map ── */}
        <div className="map-container">
          {mapLoading && (
            <div className="map-overlay-loading">
              <div className="spinner" style={{ width: "36px", height: "36px", borderWidth: "4px" }} />
              <span>Locating {city} on map...</span>
            </div>
          )}
          <MapView reports={reports} center={center} />
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
