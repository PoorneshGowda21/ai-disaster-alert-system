import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { useAuth } from "../context/AuthContext";
import MapView from "../components/MapView";
import { generateRiskReportPDF } from "../utils/pdfGenerator";

const API = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin);
const socket = io(API, { autoConnect: true });

export default function MapPage() {
  const routerLocation = useLocation();
  const navigate = useNavigate();
  const { token, user, isLoggedIn, logout } = useAuth();

  const rawCity = routerLocation.state?.city;
  const rawDistrict = routerLocation.state?.district;
  const city = rawDistrict ? `${rawCity}, ${rawDistrict}` : rawCity;

  // 🚨 Redirect if no city
  useEffect(() => {
    if (!rawCity) navigate("/");
  }, [rawCity, navigate]);

  const [reports, setReports] = useState([]);
  const [risk, setRisk] = useState(null);
  const [rainfallVal, setRainfallVal] = useState(40);
  const [riskLoading, setRiskLoading] = useState(true);
  const [center, setCenter] = useState([12.9716, 77.5946]);
  const [mapLoading, setMapLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Tabs state: incidents, help, checklist
  const [activeTab, setActiveTab] = useState("incidents");

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

  // Help Board States
  const [helpRequests, setHelpRequests] = useState([]);
  const [helpForm, setHelpForm] = useState({
    type: "request",
    category: "water",
    title: "",
    description: "",
    contactName: "",
    contactPhone: "",
    latitude: "",
    longitude: "",
  });
  const [helpSubmitting, setHelpSubmitting] = useState(false);

  // Checklist States
  const [checklistItems, setChecklistItems] = useState([]);
  const [checklistLoading, setChecklistLoading] = useState(false);

  const getDefaultChecklist = useCallback(() => {
    return [
      { text: "Prepare emergency water (4 liters per person per day)", checked: false },
      { text: "Pack a 3-day supply of non-perishable food items", checked: false },
      { text: "Assemble first aid kit (essential drugs, bandages, sanitizers)", checked: false },
      { text: "Locate nearest emergency shelter & map evacuation route", checked: false },
      { text: "Keep fully charged power banks & emergency flashlight", checked: false },
      { text: "Secure vital personal documents in a waterproof bag", checked: false },
    ];
  }, []);

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
          setHelpForm((prev) => ({ ...prev, latitude: lat.toFixed(4), longitude: lon.toFixed(4) }));
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

  // 🔹 Load help requests
  const loadHelpRequests = useCallback(() => {
    axios
      .get(`${API}/help-requests/${city}`)
      .then((res) => setHelpRequests(res.data))
      .catch(() => {});
  }, [city]);

  useEffect(() => {
    loadReports();
    loadHelpRequests();
  }, [loadReports, loadHelpRequests]);

  // ✅ Socket.io — real-time updates
  useEffect(() => {
    socket.on("new-report", (report) => {
      setReports((prev) => [report, ...prev]);
    });
    socket.on("new-alert", (alert) => {
      showToast(`🚨 HIGH ALERT in ${alert.area}!`, "error");
    });
    socket.on("new-help-request", (reqItem) => {
      if (reqItem.city?.toLowerCase() === city?.toLowerCase()) {
        setHelpRequests((prev) => [reqItem, ...prev]);
      }
    });
    socket.on("resolve-help-request", (reqItem) => {
      setHelpRequests((prev) =>
        prev.map((h) => ((h._id === reqItem._id || h.id === reqItem.id) ? { ...h, status: "resolved" } : h))
      );
    });

    return () => {
      socket.off("new-report");
      socket.off("new-alert");
      socket.off("new-help-request");
      socket.off("resolve-help-request");
    };
  }, [city]);

  // ✅ AI prediction using REAL rainfall from Open-Meteo
  useEffect(() => {
    if (!city) return;
    setRiskLoading(true);
    axios
      .post(`${API}/predict-risk`, { city })
      .then((res) => {
        setRisk(res.data.risk);
        setRainfallVal(res.data.rainfall || 0);
      })
      .catch(() => setRisk(null))
      .finally(() => setRiskLoading(false));
  }, [city, reports]);

  // ✅ Load checklist (MERN Database Sync)
  useEffect(() => {
    if (isLoggedIn && token) {
      setChecklistLoading(true);
      axios
        .get(`${API}/checklists`, { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => {
          if (res.data && res.data.items && res.data.items.length > 0) {
            setChecklistItems(res.data.items);
          } else {
            setChecklistItems(getDefaultChecklist());
          }
        })
        .catch(() => setChecklistItems(getDefaultChecklist()))
        .finally(() => setChecklistLoading(false));
    } else {
      // Local storage fallback
      const saved = localStorage.getItem(`checklist_${city}`);
      if (saved) {
        setChecklistItems(JSON.parse(saved));
      } else {
        setChecklistItems(getDefaultChecklist());
      }
    }
  }, [isLoggedIn, token, city, getDefaultChecklist]);

  // Toggle checklist item
  const handleToggleChecklist = (index) => {
    const updated = [...checklistItems];
    updated[index].checked = !updated[index].checked;
    setChecklistItems(updated);
    if (!isLoggedIn) {
      localStorage.setItem(`checklist_${city}`, JSON.stringify(updated));
    }
  };

  // Sync checklist to Database (MERN feature)
  const handleSaveChecklist = async () => {
    if (!isLoggedIn) {
      showToast("Please log in to save your checklist to the database.", "error");
      return;
    }
    try {
      await axios.post(
        `${API}/checklists`,
        { items: checklistItems },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast("✓ Checklist successfully synced to cloud!");
    } catch (err) {
      showToast("Failed to save checklist.", "error");
    }
  };

  // ✅ Submit report — public without login
  const handleSubmit = async () => {
    if (!form.type || !form.severity) {
      showToast("Please fill Type and Severity.", "error");
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(
        `${API}/report`,
        { ...form, city }
      );
      showToast("✅ Report submitted successfully!");
      setForm({ type: "", severity: "", description: "", latitude: center[0].toFixed(4), longitude: center[1].toFixed(4), city: city || "" });
    } catch (err) {
      showToast("Failed to submit report.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ Submit help request/offer
  const handleHelpSubmit = async () => {
    if (!helpForm.title || !helpForm.description || !helpForm.contactName || !helpForm.contactPhone) {
      showToast("Please fill all contact and request details.", "error");
      return;
    }
    setHelpSubmitting(true);
    try {
      await axios.post(
        `${API}/help-request`,
        {
          ...helpForm,
          city,
          latitude: parseFloat(helpForm.latitude) || center[0],
          longitude: parseFloat(helpForm.longitude) || center[1]
        }
      );
      showToast("✓ Help request published successfully!");
      setHelpForm({
        type: "request",
        category: "water",
        title: "",
        description: "",
        contactName: "",
        contactPhone: "",
        latitude: center[0].toFixed(4),
        longitude: center[1].toFixed(4)
      });
    } catch (err) {
      showToast("Failed to post help request.", "error");
    } finally {
      setHelpSubmitting(false);
    }
  };

  // ✅ Resolve help request
  const handleResolveHelp = async (id) => {
    try {
      await axios.put(`${API}/help-request/${id}/resolve`);
      showToast("✓ Item marked as resolved!");
    } catch (err) {
      showToast("Failed to resolve aid post.", "error");
    }
  };

  // ✅ PDF Risk Report Download
  const handleDownloadPDF = () => {
    generateRiskReportPDF({
      city,
      risk,
      rainfall: rainfallVal,
      lat: center[0],
      lon: center[1],
      reports: reports
    });
    showToast("📥 PDF Assessment downloading...");
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
          {isLoggedIn ? (
            <>
              <span style={{ fontSize: "13px", color: "var(--text-muted)", padding: "0 4px" }}>
                👤 {user?.name}
              </span>
              <button className="btn btn-ghost" style={{ padding: "7px 14px", fontSize: "13px", color: "var(--risk-high)" }}
                onClick={() => { logout(); navigate("/login"); }}>
                Logout
              </button>
            </>
          ) : (
            <button className="btn btn-primary" style={{ padding: "7px 14px", fontSize: "13px" }}
              onClick={() => navigate("/login")}>
              🔑 Login
            </button>
          )}
        </div>
      </nav>

      {/* Main layout */}
      <div className="map-layout">
        {/* ── Sidebar ── */}
        <aside className="map-sidebar">
          {/* Header */}
          <div className="sidebar-header">
            <div className="sidebar-title" style={{ fontSize: "18px", fontWeight: "700" }}>
              📍 {rawCity}{rawDistrict ? `, ${rawDistrict}` : ""}
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
            {!riskLoading && risk && (
              <button
                className="btn btn-ghost"
                onClick={handleDownloadPDF}
                style={{
                  marginLeft: "auto",
                  padding: "6px 10px",
                  fontSize: "11px",
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "#fff"
                }}
                title="Download Risk PDF"
              >
                📄 PDF
              </button>
            )}
          </div>

          {/* Tab Selection */}
          <div style={{ display: "flex", gap: "4px", padding: "0 14px 10px 14px", borderBottom: "1px solid var(--border)" }}>
            <button
              className={`btn ${activeTab === "incidents" ? "btn-primary" : "btn-ghost"}`}
              style={{ flex: 1, padding: "8px", fontSize: "11px", borderRadius: "6px", justifyContent: "center" }}
              onClick={() => setActiveTab("incidents")}
            >
              📋 Incidents
            </button>
            <button
              className={`btn ${activeTab === "help" ? "btn-primary" : "btn-ghost"}`}
              style={{ flex: 1, padding: "8px", fontSize: "11px", borderRadius: "6px", justifyContent: "center" }}
              onClick={() => setActiveTab("help")}
            >
              🤝 Aid Board
            </button>
            <button
              className={`btn ${activeTab === "checklist" ? "btn-primary" : "btn-ghost"}`}
              style={{ flex: 1, padding: "8px", fontSize: "11px", borderRadius: "6px", justifyContent: "center" }}
              onClick={() => setActiveTab("checklist")}
            >
              🛡️ Safety Plan
            </button>
          </div>

          {/* Sidebar scrollable */}
          <div className="sidebar-content">
            {activeTab === "incidents" && (
              <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
                      <div key={r.id || r._id} className="report-row">
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
                  Current rainfall input: <strong style={{ color: "var(--text-primary)" }}>{rainfallVal}mm</strong>.
                </div>
              </div>
            )}

            {activeTab === "help" && (
              <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Submit Aid Request Form */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                    <div className="section-title">🤝 Post Aid Request / Offer</div>
                  </div>

                  <div className="report-form" style={{ background: "rgba(255,255,255,0.01)", border: "1px solid var(--border)", padding: "12px", borderRadius: "8px" }}>
                    <div className="form-group">
                      <label className="form-label">Post Type *</label>
                      <select
                        className="input"
                        value={helpForm.type}
                        onChange={(e) => setHelpForm({ ...helpForm, type: e.target.value })}
                      >
                        <option value="request">🤝 Requesting Aid</option>
                        <option value="offer">🎁 Offering Aid / Resource</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Category *</label>
                      <select
                        className="input"
                        value={helpForm.category}
                        onChange={(e) => setHelpForm({ ...helpForm, category: e.target.value })}
                      >
                        <option value="water">💧 Clean Water</option>
                        <option value="food">🍞 Food Supply</option>
                        <option value="medical">💊 First Aid / Medical</option>
                        <option value="shelter">🏠 Safe Shelter</option>
                        <option value="utility">🔌 Utility / Power / Tools</option>
                        <option value="other">❓ Other Help</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Title *</label>
                      <input
                        className="input"
                        placeholder="e.g. Need drinking water for 3 families"
                        value={helpForm.title}
                        onChange={(e) => setHelpForm({ ...helpForm, title: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Description *</label>
                      <textarea
                        className="input"
                        style={{ height: "60px", resize: "none", padding: "8px 12px" }}
                        placeholder="Provide details about needs or resources..."
                        value={helpForm.description}
                        onChange={(e) => setHelpForm({ ...helpForm, description: e.target.value })}
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Contact Name *</label>
                        <input
                          className="input"
                          placeholder="Name"
                          value={helpForm.contactName}
                          onChange={(e) => setHelpForm({ ...helpForm, contactName: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Phone *</label>
                        <input
                          className="input"
                          placeholder="Phone number"
                          value={helpForm.contactPhone}
                          onChange={(e) => setHelpForm({ ...helpForm, contactPhone: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Latitude</label>
                        <input
                          className="input"
                          placeholder="12.9716"
                          value={helpForm.latitude}
                          onChange={(e) => setHelpForm({ ...helpForm, latitude: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Longitude</label>
                        <input
                          className="input"
                          placeholder="77.5946"
                          value={helpForm.longitude}
                          onChange={(e) => setHelpForm({ ...helpForm, longitude: e.target.value })}
                        />
                      </div>
                    </div>

                    <button
                      className="submit-btn"
                      onClick={handleHelpSubmit}
                      disabled={helpSubmitting}
                      style={{ background: helpForm.type === 'request' ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'linear-gradient(135deg, #10b981, #059669)', marginTop: "6px" }}
                    >
                      {helpSubmitting ? "Submitting..." : "📤 Post to Aid Map"}
                    </button>
                  </div>
                </div>

                {/* Aid List */}
                <div>
                  <div className="section-title">📍 Active Support Items ({helpRequests.filter(h => h.status !== 'resolved').length})</div>
                  {helpRequests.filter(h => h.status !== 'resolved').length === 0 ? (
                    <div className="empty-state" style={{ padding: "15px 0" }}>
                      <span className="empty-icon">🤝</span>
                      <p>No open help posts in this area.</p>
                    </div>
                  ) : (
                    helpRequests.filter(h => h.status !== 'resolved').slice(0, 6).map((h) => (
                      <div key={h.id || h._id} className="report-row" style={{ borderLeft: `3px solid ${h.type === 'request' ? '#6366f1' : '#10b981'}` }}>
                        <span className="report-type" style={{ color: h.type === 'request' ? '#a5b4fc' : '#6ee7b7' }}>
                          {h.type === "request" ? "🤝 Request" : "🎁 Offer"} ({h.category})
                        </span>
                        <span className="report-details">
                          <strong>{h.title}</strong> · {h.description} <br />
                          <span style={{ fontSize: "10px", color: "var(--text-muted)", display: "block", marginTop: "2px" }}>
                            Contact: {h.contactName} ({h.contactPhone})
                          </span>
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === "checklist" && (
              <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div className="section-title">🛡️ Safety Planner</div>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: "4px 8px", fontSize: "11px" }}
                    onClick={handleSaveChecklist}
                  >
                    💾 Sync
                  </button>
                </div>
                
                {!isLoggedIn && (
                  <p style={{ fontSize: "11px", color: "var(--risk-mod)", margin: "-8px 0 4px 0" }}>
                    ⚠️ Log in to sync your checklist to the database.
                  </p>
                )}

                {checklistLoading ? (
                  <div style={{ display: "flex", justifyContent: "center", padding: "20px 0" }}>
                    <span className="spinner" />
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {checklistItems.map((item, idx) => (
                      <label
                        key={idx}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "10px",
                          padding: "10px",
                          background: item.checked ? "rgba(16,185,129,0.06)" : "rgba(255,255,255,0.02)",
                          border: `1px solid ${item.checked ? "rgba(16,185,129,0.2)" : "var(--border)"}`,
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontSize: "12.5px",
                          transition: "all 0.2s ease"
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={() => handleToggleChecklist(idx)}
                          style={{ marginTop: "4px", cursor: "pointer" }}
                        />
                        <span style={{ color: item.checked ? "var(--text-muted)" : "var(--text-primary)", textDecoration: item.checked ? "line-through" : "none" }}>
                          {item.text}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
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
          <MapView reports={reports} helpRequests={helpRequests} onResolveHelp={handleResolveHelp} center={center} cityName={rawCity} />
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
