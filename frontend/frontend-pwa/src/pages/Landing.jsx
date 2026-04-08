import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Landing() {
  const [city, setCity] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const goToMap = () => {
    const trimmed = city.trim();
    if (!trimmed) {
      setError("Please enter a city or area name.");
      return;
    }
    setError("");
    navigate("/map", { state: { city: trimmed } });
  };

  const handleKey = (e) => {
    if (e.key === "Enter") goToMap();
  };

  return (
    <div className="landing-page">
      <div className="landing-bg" />
      <div className="landing-grid" />

      {/* Navbar */}
      <nav className="navbar">
        <span className="navbar-brand">
          <span className="logo-icon">🛡️</span>
          DisasterWatch AI
        </span>
        <div className="navbar-links">
          <button className="btn btn-ghost" style={{ padding: "8px 16px", fontSize: "13px" }}
            onClick={() => navigate("/admin")}>
            Admin Dashboard
          </button>
        </div>
      </nav>

      {/* Hero */}
      <main className="landing-hero">
        <div className="hero-badge">
          <span>⚡</span>
          <span>AI-Powered • Real-Time • Community-Driven</span>
        </div>

        <h1 className="hero-title">
          Community Disaster<br />
          <span className="gradient-text">Alert System</span>
        </h1>

        <p className="hero-subtitle">
          Enter your city to view live disaster reports, AI-predicted risk levels,
          and real-time community alerts on an interactive map.
        </p>

        <div className="search-box">
          <input
            id="city-search"
            className="input"
            placeholder="Enter city (e.g., Mysuru, Bangalore...)"
            value={city}
            onChange={(e) => { setCity(e.target.value); setError(""); }}
            onKeyDown={handleKey}
            autoFocus
          />
          <button id="view-map-btn" className="btn btn-primary" onClick={goToMap}>
            🗺️ View Map
          </button>
        </div>

        {error && (
          <p style={{ color: "var(--risk-high)", fontSize: "13px", marginTop: "-16px" }}>
            ⚠️ {error}
          </p>
        )}

        {/* Stats */}
        <div className="hero-stats">
          {[
            { value: "AI", label: "Risk Engine" },
            { value: "Live", label: "Community Data" },
            { value: "OSM", label: "Map Coverage" },
          ].map((s) => (
            <div key={s.label} className="stat-item">
              <span className="stat-value">{s.value}</span>
              <span className="stat-label">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Feature cards */}
        <div className="feature-cards">
          {[
            { icon: "🤖", title: "AI Risk Prediction", desc: "Decision tree model predicts LOW / MODERATE / HIGH risk based on rainfall & reports." },
            { icon: "📍", title: "Live Map", desc: "Interactive Leaflet map navigates to any city instantly via geocoding." },
            { icon: "📢", title: "Community Reports", desc: "Submit incidents in real-time. Reports appear on the map instantly." },
            { icon: "🚨", title: "Smart Alerts", desc: "HIGH risk predictions auto-generate alerts visible in Admin dashboard." },
          ].map((f) => (
            <div key={f.title} className="feature-card">
              <div className="icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
