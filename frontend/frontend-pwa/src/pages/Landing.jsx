import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Landing() {
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const goToMap = () => {
    const trimmedCity = city.trim();
    const trimmedDistrict = district.trim();
    if (!trimmedCity) {
      setError("Please enter a city or area name.");
      return;
    }
    setError("");
    navigate("/map", { state: { city: trimmedCity, district: trimmedDistrict } });
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

        <div className="search-box" style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%", maxWidth: "500px", padding: "10px", background: "none", border: "none" }}>
          <div style={{ display: "flex", gap: "8px", width: "100%" }}>
            <input
              id="city-search"
              className="input"
              placeholder="City / Area (e.g., Gokulam)"
              value={city}
              onChange={(e) => { setCity(e.target.value); setError(""); }}
              onKeyDown={handleKey}
              autoFocus
              style={{ flex: 1 }}
            />
            <input
              id="district-search"
              className="input"
              placeholder="District / City (e.g., Mysuru)"
              value={district}
              onChange={(e) => { setDistrict(e.target.value); setError(""); }}
              onKeyDown={handleKey}
              style={{ flex: 1 }}
            />
          </div>
          <button id="view-map-btn" className="btn btn-primary" onClick={goToMap} style={{ width: "100%", justifyContent: "center" }}>
            🗺️ View Map Location
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

        {/* Developer / Portfolio Section */}
        <div className="developer-section glass" style={{
          marginTop: "48px",
          padding: "24px",
          maxWidth: "700px",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          alignItems: "center",
          textAlign: "center",
          animation: "fadeUp 0.8s ease forwards",
          border: "1px solid rgba(79, 142, 247, 0.2)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "28px" }}>🚀</span>
            <h3 style={{ fontSize: "18px", fontWeight: "700", letterSpacing: "0.5px" }}>Developer Portfolio Specs</h3>
          </div>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.5" }}>
            This application is a full-featured showcase of MERN Stack principles. It integrates Leaflet GIS mapping, dynamic weather geocoding APIs, Mongoose data models, real-time Socket.io push broadcasts, and Vercel serverless configurations.
          </p>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
            <a href="https://github.com/PoorneshGowda21/ai-disaster-alert-system" target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ padding: "8px 16px", fontSize: "12.5px" }}>
              💻 GitHub Project
            </a>
            <a href="https://github.com/PoorneshGowda21" target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ padding: "8px 16px", fontSize: "12.5px" }}>
              📄 View Resume / Profile
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
