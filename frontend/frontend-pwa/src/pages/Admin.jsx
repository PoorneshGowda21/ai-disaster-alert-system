import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API = "http://localhost:5000";

export default function Admin() {
  const [reports, setReports] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/reports`).then((r) => setReports(r.data)).catch(() => {}),
      axios.get(`${API}/alerts`).then((r) => setAlerts(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const highRisk = reports.filter(
    (r) => r.severity === "High" || r.severity === "Critical"
  ).length;

  return (
    <div className="admin-page">
      {/* Navbar */}
      <nav className="navbar">
        <span className="navbar-brand">
          <span className="logo-icon">🛡️</span>
          DisasterWatch AI
        </span>
        <div className="navbar-links">
          <button className="btn btn-ghost" style={{ padding: "7px 14px", fontSize: "13px" }}
            onClick={() => navigate("/")}>
            ← Home
          </button>
        </div>
      </nav>

      <div className="admin-topbar">
        <div>
          <h1>Admin Dashboard</h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
            System monitoring · real-time community reports &amp; AI alerts
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{
            width: "8px", height: "8px", borderRadius: "50%",
            background: "var(--risk-low)",
            boxShadow: "0 0 6px var(--risk-low)",
            display: "inline-block",
          }} />
          <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>Live</span>
        </div>
      </div>

      <div className="admin-content">
        {/* Stats Grid */}
        <div className="stats-grid">
          {[
            { icon: "📋", label: "Total Reports", value: reports.length },
            { icon: "🚨", label: "AI Alerts", value: alerts.length },
            { icon: "🔴", label: "High / Critical", value: highRisk },
            { icon: "📍", label: "Cities Covered", value: [...new Set(reports.map((r) => r.city).filter(Boolean))].length },
          ].map((s) => (
            <div key={s.label} className="stat-card fade-up">
              <div className="stat-icon">{s.icon}</div>
              <div className="stat-num">{loading ? "—" : s.value}</div>
              <div className="stat-desc">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Alerts */}
        <div className="section-card fade-up">
          <div className="section-card-header">
            <h2>🚨 AI-Generated Alerts</h2>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              {alerts.length} alert{alerts.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="section-card-body">
            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "24px" }}>
                <div className="spinner" />
              </div>
            ) : alerts.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">✅</span>
                <p>No alerts generated yet. System is monitoring...</p>
              </div>
            ) : (
              alerts.map((a) => (
                <div key={a.id} className="alert-item">
                  <span className="alert-icon">🔴</span>
                  <div className="alert-body">
                    <div className="alert-header">
                      <span className="alert-area">{a.area}</span>
                      <span className="risk-badge risk-high">{a.level}</span>
                    </div>
                    <div className="alert-reason">{a.reason}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Reports Table */}
        <div className="section-card fade-up">
          <div className="section-card-header">
            <h2>📋 All Incident Reports</h2>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              {reports.length} report{reports.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="section-card-body">
            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "24px" }}>
                <div className="spinner" />
              </div>
            ) : reports.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📭</span>
                <p>No reports yet. Submit one from the Map page.</p>
              </div>
            ) : (
              reports.map((r) => (
                <div key={r.id} className="report-row">
                  <span className="report-type">
                    {r.type === "Flood" ? "🌊" : r.type === "Fire" ? "🔥" : r.type === "Landslide" ? "⛰️" : r.type === "Earthquake" ? "🌍" : r.type === "Storm" ? "🌪️" : "⚠️"}
                    {" "}<strong>{r.type || "—"}</strong>
                  </span>
                  <span className="report-details">
                    {r.city && <strong style={{ color: "var(--text-primary)" }}>{r.city} </strong>}
                    · Severity: {r.severity || "—"}
                    {r.description ? ` · ${r.description}` : ""}
                  </span>
                  <span className="risk-badge" style={{
                    background: r.severity === "Critical" || r.severity === "High"
                      ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)",
                    color: r.severity === "Critical" || r.severity === "High"
                      ? "var(--risk-high)" : "var(--risk-mod)",
                    border: "none",
                    fontSize: "11px",
                    whiteSpace: "nowrap",
                  }}>
                    {r.severity || "—"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "12px", marginTop: "24px" }}>
          AI Disaster Alert System · Decision Tree Model · Powered by OpenStreetMap
        </div>
      </div>
    </div>
  );
}
