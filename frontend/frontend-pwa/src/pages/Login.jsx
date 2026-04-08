import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const API = "http://localhost:5000";

export default function Login() {
  const [mode, setMode]     = useState("login"); // "login" | "register"
  const [form, setForm]     = useState({ name: "", email: "", password: "" });
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const { login }           = useAuth();
  const navigate            = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
      const payload  = mode === "login"
        ? { email: form.email, password: form.password }
        : { name: form.name, email: form.email, password: form.password };

      const res = await axios.post(`${API}${endpoint}`, payload);
      login(res.data.token, res.data.user);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing-page">
      <div className="landing-bg" />
      <div className="landing-grid" />

      <nav className="navbar">
        <span className="navbar-brand">
          <span className="logo-icon">🛡️</span>
          DisasterWatch AI
        </span>
      </nav>

      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "40px 24px", position: "relative", zIndex: 1,
      }}>
        <div style={{
          width: "100%", maxWidth: "420px",
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "36px 32px",
          boxShadow: "var(--shadow)",
        }}>
          {/* Toggle */}
          <div style={{
            display: "flex", gap: "4px", marginBottom: "28px",
            background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "4px",
          }}>
            {["login", "register"].map((m) => (
              <button key={m} onClick={() => { setMode(m); setError(""); }}
                style={{
                  flex: 1, padding: "10px", border: "none", borderRadius: "6px", cursor: "pointer",
                  fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: "14px",
                  background: mode === m ? "var(--accent-blue)" : "transparent",
                  color: mode === m ? "white" : "var(--text-muted)",
                  transition: "all 0.2s",
                }}>
                {m === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          <h2 style={{ fontFamily: "Space Grotesk", fontSize: "22px", fontWeight: 700, marginBottom: "6px" }}>
            {mode === "login" ? "Welcome back" : "Create account"}
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "24px" }}>
            {mode === "login"
              ? "Sign in to submit disaster reports"
              : "Register to contribute to community safety"}
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {mode === "register" && (
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="input" name="name" placeholder="Your name"
                  value={form.name} onChange={handleChange} required />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="input" name="email" type="email" placeholder="you@email.com"
                value={form.email} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="input" name="password" type="password" placeholder="••••••••"
                value={form.password} onChange={handleChange} required minLength={6} />
            </div>

            {error && (
              <div style={{
                padding: "10px 14px", background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)", borderRadius: "6px",
                color: "var(--risk-high)", fontSize: "13px",
              }}>
                ⚠️ {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={loading}
              style={{ width: "100%", justifyContent: "center", marginTop: "4px", opacity: loading ? 0.7 : 1 }}>
              {loading
                ? <><span className="spinner" style={{ width: "16px", height: "16px", borderWidth: "2px" }} /> Processing...</>
                : mode === "login" ? "🔑 Sign In" : "🚀 Create Account"
              }
            </button>
          </form>

          <p style={{ textAlign: "center", marginTop: "20px", fontSize: "13px", color: "var(--text-muted)" }}>
            {mode === "login" ? "No account? " : "Already registered? "}
            <span style={{ color: "var(--accent-blue)", cursor: "pointer", fontWeight: 600 }}
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
              {mode === "login" ? "Register here" : "Sign in"}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
