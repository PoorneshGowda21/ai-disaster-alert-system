import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { useAuth } from "../context/AuthContext";
import MapView from "../components/MapView";
import { saveOfflineReport, getOfflineReports, deleteOfflineReport } from "../utils/indexedDbHelper";

const API = "http://localhost:5000";
const socket = io(API, { autoConnect: true });

export default function MapPage() {
  const routerLocation = useLocation();
  const navigate = useNavigate();
  const { token, user, isLoggedIn, logout } = useAuth();

  const city = routerLocation.state?.city;

  // 🚨 Redirect if no city
  useEffect(() => {
    if (!city) navigate("/");
  }, [city, navigate]);

  const [reports, setReports] = useState([]);
  const [nearbyFilter, setNearbyFilter] = useState(false);
  const [risk, setRisk] = useState(null);
  const [riskLoading, setRiskLoading] = useState(true);
  const [center, setCenter] = useState([12.9716, 77.5946]);
  const [mapLoading, setMapLoading] = useState(true);
  const [toast, setToast] = useState(null);
  
  // Real-time Chat & PWA Sync State
  const [activeTab, setActiveTab] = useState("incidents"); // "incidents" | "chat"
  const [chatMessages, setChatMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");

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
    const url = nearbyFilter
      ? `${API}/reports/nearby?lat=${center[0]}&lng=${center[1]}&radius=10`
      : `${API}/reports`;

    axios
      .get(url)
      .then((res) => setReports(res.data))
      .catch(() => {});
  }, [nearbyFilter, center]);

  useEffect(() => { loadReports(); }, [loadReports]);

  // ✅ Socket.io — real-time new reports
  useEffect(() => {
    socket.on("new-report", (report) => {
      setReports((prev) => [report, ...prev]);
    });
    socket.on("new-alert", (alert) => {
      showToast(`🚨 HIGH ALERT in ${alert.area}!`, "error");
    });
    return () => {
      socket.off("new-report");
      socket.off("new-alert");
    };
  }, []);

  // ✅ Sync Offline Reports when connection is restored
  const syncOfflineReports = useCallback(async () => {
    try {
      const offlineReports = await getOfflineReports();
      if (offlineReports.length === 0) return;

      showToast(`⚡ Syncing ${offlineReports.length} offline report(s)...`, "info");
      
      const config = {};
      if (token) {
        config.headers = { Authorization: `Bearer ${token}` };
      }

      for (const report of offlineReports) {
        const { id, ...payload } = report;
        await axios.post(`${API}/report`, payload, config);
        await deleteOfflineReport(id);
      }

      showToast("⚡ All offline reports successfully synced!", "success");
      loadReports();
    } catch (err) {
      console.error("Offline sync failed:", err.message);
    }
  }, [token, loadReports]);

  // Hook network status listeners
  useEffect(() => {
    window.addEventListener("online", syncOfflineReports);
    if (navigator.onLine) {
      syncOfflineReports();
    }
    return () => {
      window.removeEventListener("online", syncOfflineReports);
    };
  }, [syncOfflineReports]);

  // ✅ Fetch Chat History log on load
  useEffect(() => {
    if (!city) return;
    axios
      .get(`${API}/chats/${city}`)
      .then((res) => setChatMessages(res.data))
      .catch(() => {});
  }, [city]);

  // ✅ Join/Leave Socket Chat Room
  useEffect(() => {
    if (!city) return;
    socket.emit("join-city-room", city);

    socket.on("incoming-chat-msg", (message) => {
      setChatMessages((prev) => [...prev, message]);
    });

    return () => {
      socket.emit("leave-city-room", city);
      socket.off("incoming-chat-msg");
    };
  }, [city]);

  // Handle message submission
  const handleSendChat = () => {
    const trimmed = newMsg.trim();
    if (!trimmed) return;

    const payload = {
      city,
      sender: user?.name || "Anonymous",
      message: trimmed,
    };

    socket.emit("send-chat-msg", payload);
    setNewMsg("");
  };

  // ✅ AI prediction using REAL rainfall from Open-Meteo
  useEffect(() => {
    if (!city) return;
    setRiskLoading(true);
    // /predict-risk now fetches real rainfall internally via Open-Meteo
    axios
      .post(`${API}/predict-risk`, { city })
      .then((res) => setRisk(res.data.risk))
      .catch(() => setRisk(null))
      .finally(() => setRiskLoading(false));
  }, [city, reports]);


  // ✅ Submit report — public with offline-first local queue
  const handleSubmit = async () => {
    if (!form.type || !form.severity) {
      showToast("Please fill Type and Severity.", "error");
      return;
    }
    setSubmitting(true);

    // If browser is offline, store draft in IndexedDB
    if (!navigator.onLine) {
      try {
        const offlinePayload = {
          ...form,
          city,
          submittedBy: user ? user.name : "Anonymous",
          created_at: new Date().toISOString(),
        };
        await saveOfflineReport(offlinePayload);
        showToast("⚠️ Offline: Saved report locally. Will sync when online.", "error");
        setForm({ type: "", severity: "", description: "", latitude: center[0].toFixed(4), longitude: center[1].toFixed(4), city: city || "" });
      } catch (err) {
        showToast("Failed to save report locally.", "error");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    try {
      const config = {};
      if (token) {
        config.headers = { Authorization: `Bearer ${token}` };
      }
      await axios.post(
        `${API}/report`,
        { ...form, city },
        config
      );
      showToast("✅ Report submitted successfully!");
      setForm({ type: "", severity: "", description: "", latitude: center[0].toFixed(4), longitude: center[1].toFixed(4), city: city || "" });
      // No need to call loadReports() — socket.io updates it instantly
    } catch (err) {
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

            {/* Tab Selector Buttons */}
            <div style={{
              display: "flex",
              borderBottom: "1px solid var(--border)",
              marginBottom: "16px",
            }}>
              <button
                onClick={() => setActiveTab("incidents")}
                style={{
                  flex: 1,
                  padding: "10px 4px",
                  background: "none",
                  border: "none",
                  borderBottom: activeTab === "incidents" ? "2px solid var(--accent-blue)" : "none",
                  color: activeTab === "incidents" ? "var(--text-primary)" : "var(--text-muted)",
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                📋 Incidents ({reports.length})
              </button>
              <button
                onClick={() => setActiveTab("chat")}
                style={{
                  flex: 1,
                  padding: "10px 4px",
                  background: "none",
                  border: "none",
                  borderBottom: activeTab === "chat" ? "2px solid var(--accent-blue)" : "none",
                  color: activeTab === "chat" ? "var(--text-primary)" : "var(--text-muted)",
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                💬 Geo-Chat ({chatMessages.length})
              </button>
            </div>

            {activeTab === "incidents" ? (
              <>
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
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                    <div className="section-title" style={{ marginBottom: 0 }}>🗂️ Reports ({reports.length})</div>
                    <label style={{
                      fontSize: "11px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      userSelect: "none"
                    }}>
                      <input
                        type="checkbox"
                        checked={nearbyFilter}
                        onChange={(e) => setNearbyFilter(e.target.checked)}
                        style={{ cursor: "pointer" }}
                      />
                      📍 Nearby (10km)
                    </label>
                  </div>
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
              </>
            ) : (
              /* Chat Room Panel */
              <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: "350px", justifyContent: "space-between" }}>
                {/* Messages Area */}
                <div style={{
                  flex: 1,
                  overflowY: "auto",
                  maxHeight: "280px",
                  marginBottom: "12px",
                  paddingRight: "4px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}>
                  {chatMessages.length === 0 ? (
                    <div className="empty-state" style={{ margin: "auto 0", padding: "20px 0" }}>
                      <span className="empty-icon">💬</span>
                      <p style={{ fontSize: "12px" }}>No messages yet in {city}.<br />Start the discussion!</p>
                    </div>
                  ) : (
                    chatMessages.map((m) => {
                      const isMe = user && m.sender === user.name;
                      return (
                        <div key={m._id || m.id || Math.random()} style={{
                          background: isMe ? "rgba(79,142,247,0.12)" : "rgba(255,255,255,0.03)",
                          border: isMe ? "1px solid rgba(79,142,247,0.2)" : "1px solid var(--border)",
                          borderRadius: "8px",
                          padding: "8px 10px",
                          alignSelf: isMe ? "flex-end" : "flex-start",
                          maxWidth: "85%",
                        }}>
                          <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: "8px",
                            marginBottom: "3px",
                            fontSize: "10px",
                          }}>
                            <strong style={{ color: isMe ? "var(--accent-blue)" : "var(--text-primary)" }}>
                              {m.sender}
                            </strong>
                            <span style={{ color: "var(--text-muted)" }}>
                              {new Date(m.createdAt || m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div style={{ fontSize: "12px", color: "var(--text-secondary)", wordBreak: "break-word" }}>
                            {m.message}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Chat Input Row */}
                <div style={{ display: "flex", gap: "6px", borderTop: "1px solid var(--border)", paddingTop: "12px" }}>
                  <input
                    className="input"
                    placeholder={isLoggedIn ? "Type a message..." : "Login to join the live chat..."}
                    value={newMsg}
                    onChange={(e) => setNewMsg(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSendChat(); }}
                    style={{ flex: 1, fontSize: "13px" }}
                    disabled={!isLoggedIn}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={handleSendChat}
                    style={{ padding: "8px 12px", fontSize: "13px" }}
                    disabled={!isLoggedIn}
                  >
                    Send
                  </button>
                </div>
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
