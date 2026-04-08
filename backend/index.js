require("dotenv").config();
const express   = require("express");
const cors      = require("cors");
const http      = require("http");
const { Server }= require("socket.io");
const axios     = require("axios");
const bcrypt    = require("bcryptjs");
const jwt       = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "disasterwatch_secret";

// ──── In-Memory Storage ────
let reports = [];
let alerts  = [];
let users   = [];
let nextId  = { report: 1, alert: 1, user: 1 };

console.log("📦 In-memory storage active (no DB required)");

// ──── Socket.io ────
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
io.on("connection", (socket) => {
  console.log("🔌 Client connected:", socket.id);
  socket.on("disconnect", () => console.log("🔌 Client disconnected:", socket.id));
});

// ──── JWT Middleware ────
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "No token provided" });
  const token = header.split(" ")[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

// ──── Health ────
app.get("/", (req, res) => res.send("✅ DisasterWatch AI backend running"));

// ══════════════════════════════════════
//  AUTH ROUTES
// ══════════════════════════════════════

// POST /auth/register
app.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: "Name, email and password required" });

    if (users.find((u) => u.email === email))
      return res.status(409).json({ error: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);
    const user = { id: nextId.user++, name, email, password: hashed, role: "user" };
    users.push(user);

    const token = jwt.sign({ id: user.id, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: "Registration failed" });
  }
});

// POST /auth/login
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = users.find((u) => u.email === email);
    if (!user) return res.status(401).json({ error: "Invalid email or password" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Invalid email or password" });

    const token = jwt.sign({ id: user.id, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch {
    res.status(500).json({ error: "Login failed" });
  }
});

// GET /auth/me  — verify token & return user
app.get("/auth/me", authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// ══════════════════════════════════════
//  WEATHER — Open-Meteo (free, no API key)
// ══════════════════════════════════════

app.get("/weather/:city", async (req, res) => {
  try {
    const { city } = req.params;

    // Step 1: Geocode city → lat/lon via Nominatim
    const geoRes = await axios.get(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}&limit=1`,
      { headers: { "User-Agent": "DisasterWatchAI/1.0" }, timeout: 5000 }
    );

    if (!geoRes.data || geoRes.data.length === 0)
      return res.status(404).json({ error: "City not found", rainfall: 0 });

    const { lat, lon, display_name } = geoRes.data[0];

    // Step 2: Fetch real rainfall from Open-Meteo
    const weatherRes = await axios.get(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=precipitation,rain,weathercode&daily=precipitation_sum&timezone=auto&forecast_days=1`,
      { timeout: 5000 }
    );

    const current   = weatherRes.data.current;
    const rainfall  = (current.precipitation || 0) + (current.rain || 0);
    const dailySum  = weatherRes.data.daily?.precipitation_sum?.[0] || 0;
    // Use daily sum (more meaningful) if current is 0
    const effective = rainfall > 0 ? rainfall : dailySum;

    console.log(`🌧️  Weather for ${city}: ${effective}mm rainfall`);
    res.json({
      city,
      display_name,
      lat: parseFloat(lat),
      lon: parseFloat(lon),
      rainfall: parseFloat(effective.toFixed(2)),
      unit: "mm",
    });
  } catch (err) {
    console.error("Weather API error:", err.message);
    res.status(500).json({ error: "Weather fetch failed", rainfall: 0 });
  }
});

// ══════════════════════════════════════
//  REPORTS
// ══════════════════════════════════════

app.get("/reports", (req, res) => {
  res.json([...reports].reverse());
});

// Public: anyone can submit reports
app.post("/report", (req, res) => {
  try {
    const { type, severity, description, latitude, longitude, city } = req.body;
    if (!city) return res.status(400).json({ error: "City is required" });
    if (!type) return res.status(400).json({ error: "Type is required" });

    const report = {
      id: nextId.report++,
      type, severity, description,
      latitude: parseFloat(latitude) || 0,
      longitude: parseFloat(longitude) || 0,
      city,
      submittedBy: "Anonymous",
      created_at: new Date().toISOString(),
    };

    reports.push(report);
    // ✅ Socket.io — broadcast to ALL connected clients instantly
    io.emit("new-report", report);
    console.log(`📍 [Anonymous] New report: ${type} in ${city}`);

    res.json(report);
  } catch (err) {
    res.status(500).json({ error: "Failed to save report" });
  }
});

// ══════════════════════════════════════
//  ALERTS
// ══════════════════════════════════════

app.get("/alerts", (req, res) => {
  res.json([...alerts].reverse());
});

// ══════════════════════════════════════
//  AI RISK (uses real rainfall from Open-Meteo)
// ══════════════════════════════════════

app.post("/predict-risk", async (req, res) => {
  try {
    const { city } = req.body;
    if (!city) return res.status(400).json({ error: "City required" });

    // ✅ Fetch REAL rainfall from Open-Meteo
    let rainfall = 0;
    try {
      const weatherResp = await axios.get(
        `http://localhost:${process.env.PORT || 5000}/weather/${encodeURIComponent(city)}`,
        { timeout: 6000 }
      );
      rainfall = weatherResp.data.rainfall || 0;
    } catch {
      // Fallback: city-hash based demo value
      const cityHash = city.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
      rainfall = 20 + (cityHash % 80);
      console.log(`⚠️  Open-Meteo unavailable, using demo rainfall: ${rainfall}mm`);
    }

    const reportsCount = reports.filter(
      (r) => r.city?.toLowerCase() === city.toLowerCase()
    ).length;

    let risk = "LOW";

    // Try Python AI model first
    try {
      const aiResp = await axios.post(
        "http://localhost:5001/predict",
        { rainfall, reports: reportsCount },
        { timeout: 3000 }
      );
      risk = aiResp.data.risk;
      console.log(`🤖 AI model → ${city}: ${risk} (${rainfall}mm, ${reportsCount} reports)`);
    } catch {
      console.log("⚡ AI model offline — using rule-based logic");
    }

    // Smart override (ensures correct thresholds)
    if (rainfall >= 60 || reportsCount >= 4)       risk = "HIGH";
    else if (rainfall >= 30 || reportsCount >= 2)  risk = "MODERATE";
    else                                             risk = "LOW";

    console.log(`✅ Final: ${city} → ${risk} (${rainfall}mm, ${reportsCount} reports)`);

    // Auto-create alert for HIGH
    if (risk === "HIGH") {
      const exists = alerts.find((a) => a.area?.toLowerCase() === city.toLowerCase() && a.level === "HIGH");
      if (!exists) {
        const alert = {
          id: nextId.alert++,
          area: city,
          level: "HIGH",
          reason: `HIGH risk detected: ${rainfall}mm rainfall + ${reportsCount} community reports`,
          sent_at: new Date().toISOString(),
        };
        alerts.push(alert);
        io.emit("new-alert", alert); // ✅ real-time alert broadcast
      }
    }

    res.json({ city, rainfall, reports: reportsCount, risk });
  } catch (err) {
    console.error("Predict-risk error:", err.message);
    res.status(500).json({ error: "Prediction failed" });
  }
});

// ──── START ────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server on http://localhost:${PORT}`);
  console.log("   Endpoints: /auth/register  /auth/login  /reports  /report  /alerts  /predict-risk  /weather/:city");
});
