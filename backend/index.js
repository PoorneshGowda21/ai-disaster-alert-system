require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const axios = require("axios");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json());

// Rewrite /api prefix to make it compatible with Vercel and local deployments
app.use((req, res, next) => {
  if (req.url.startsWith("/api")) {
    req.url = req.url.substring(4);
    if (req.url === "") req.url = "/";
  }
  next();
});

const JWT_SECRET = process.env.JWT_SECRET || "disasterwatch_secret";

// ──── Database (optional) ────
const { connectDB, mongoose } = require("./db");
const User = require("./models/User");
const Report = require("./models/Report");
const Alert = require("./models/Alert");
const HelpRequest = require("./models/HelpRequest");
const Checklist = require("./models/Checklist");

const MODEL_SERVICE_URL = process.env.MODEL_SERVICE_URL || "http://localhost:5001";

// ──── In-Memory Storage (fallback) ────
let reports = [];
let alerts = [];
let users = [];
let helpRequests = [];
let checklists = [];
let nextId = { report: 1, alert: 1, user: 1, helpRequest: 1 };

connectDB().then((ok) => {
  if (!ok) console.log("📦 Running with in-memory storage fallback");
  // Optional admin seeding (set SEED_ADMIN=true and ADMIN_EMAIL/ADMIN_PASS env vars)
  (async () => {
    if (process.env.SEED_ADMIN === "true") {
      const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
      const adminPass = process.env.ADMIN_PASS || "password";
      const adminName = process.env.ADMIN_NAME || "Admin";
      if (ok) {
        const exists = await User.findOne({ email: adminEmail });
        if (!exists) {
          const hashed = await bcrypt.hash(adminPass, 10);
          await User.create({
            name: adminName,
            email: adminEmail,
            password: hashed,
            role: "admin",
          });
          console.log("✅ Admin seeded:", adminEmail);
        }
      } else {
        if (!users.find((u) => u.email === adminEmail)) {
          const hashed = await bcrypt.hash(adminPass, 10);
          users.push({
            id: nextId.user++,
            name: adminName,
            email: adminEmail,
            password: hashed,
            role: "admin",
          });
          console.log("✅ In-memory admin seeded:", adminEmail);
        }
      }
    }
  })();
});

const useDB = () => mongoose.connection.readyState === 1;

// ──── Socket.io ────
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
io.on("connection", (socket) => {
  console.log("🔌 Client connected:", socket.id);
  socket.on("disconnect", () =>
    console.log("🔌 Client disconnected:", socket.id),
  );
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

// Role requirement middleware
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "No token provided" });
    if (!req.user.role || req.user.role !== role)
      return res.status(403).json({ error: "Forbidden" });
    next();
  };
}

// ──── Health ────
app.get("/", (req, res) => res.send("✅ DisasterWatch AI backend running"));

// ══════════════════════════════════════
//  MODEL SERVICE PROXY
// ══════════════════════════════════════
app.post("/model/predict", async (req, res) => {
  try {
    const body = req.body || {};
    const modelResp = await axios.post(`${MODEL_SERVICE_URL}/predict`, body, { timeout: 5000 });
    return res.json(modelResp.data);
  } catch (err) {
    console.error("Model proxy error:", err.message);
    const status = err.response?.status || 502;
    const data = err.response?.data || { error: "Model service unavailable" };
    return res.status(status).json(data);
  }
});

// ══════════════════════════════════════
//  AUTH ROUTES
// ══════════════════════════════════════

// POST /auth/register
app.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res
        .status(400)
        .json({ error: "Name, email and password required" });
    if (useDB()) {
      const exists = await User.findOne({ email });
      if (exists)
        return res.status(409).json({ error: "Email already registered" });
      const hashed = await bcrypt.hash(password, 10);
      const user = await User.create({
        name,
        email,
        password: hashed,
        role: "user",
      });
      const token = jwt.sign(
        { id: user._id, name: user.name, role: user.role },
        JWT_SECRET,
        { expiresIn: "7d" },
      );
      return res.json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    }

    if (users.find((u) => u.email === email))
      return res.status(409).json({ error: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);
    const user = {
      id: nextId.user++,
      name,
      email,
      password: hashed,
      role: "user",
    };
    users.push(user);

    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" },
    );
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Registration failed" });
  }
});

// POST /auth/login
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (useDB()) {
      const user = await User.findOne({ email });
      if (!user)
        return res.status(401).json({ error: "Invalid email or password" });
      const valid = await bcrypt.compare(password, user.password);
      if (!valid)
        return res.status(401).json({ error: "Invalid email or password" });
      const token = jwt.sign(
        { id: user._id, name: user.name, role: user.role },
        JWT_SECRET,
        { expiresIn: "7d" },
      );
      return res.json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    }

    const user = users.find((u) => u.email === email);
    if (!user)
      return res.status(401).json({ error: "Invalid email or password" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.status(401).json({ error: "Invalid email or password" });

    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" },
    );
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch {
    res.status(500).json({ error: "Login failed" });
  }
});

// GET /auth/me  — verify token & return user
app.get("/auth/me", authMiddleware, (req, res) => {
  (async () => {
    if (useDB()) {
      try {
        const user = await User.findById(req.user.id).select(
          "_id name email role",
        );
        return res.json({
          user: user
            ? {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
              }
            : req.user,
        });
      } catch (e) {
        return res.json({ user: req.user });
      }
    }
    res.json({ user: req.user });
  })();
});

// ══════════════════════════════════════
//  ADMIN ROUTES (role-based)
// ══════════════════════════════════════

// GET /admin/users — list users (admin only)
app.get("/admin/users", authMiddleware, requireRole("admin"), (req, res) => {
  (async () => {
    if (useDB()) {
      const list = await User.find()
        .select("_id name email role createdAt")
        .lean();
      return res.json(
        list.map((u) => ({
          id: u._id,
          name: u.name,
          email: u.email,
          role: u.role,
          createdAt: u.createdAt,
        })),
      );
    }
    return res.json(
      users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
      })),
    );
  })();
});

// DELETE /admin/user/:id — remove a user (admin only)
app.delete(
  "/admin/user/:id",
  authMiddleware,
  requireRole("admin"),
  (req, res) => {
    (async () => {
      const { id } = req.params;
      if (useDB()) {
        try {
          await User.findByIdAndDelete(id);
          return res.json({ ok: true });
        } catch (e) {
          return res.status(400).json({ error: "Delete failed" });
        }
      }
      const idx = users.findIndex((u) => String(u.id) === String(id));
      if (idx === -1) return res.status(404).json({ error: "User not found" });
      users.splice(idx, 1);
      res.json({ ok: true });
    })();
  },
);

// ══════════════════════════════════════
//  WEATHER — Open-Meteo (free, no API key)
// ══════════════════════════════════════

app.get("/weather/:city", async (req, res) => {
  try {
    const { city } = req.params;

    // Step 1: Geocode city → lat/lon via Nominatim
    const geoRes = await axios.get(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}&limit=1`,
      { headers: { "User-Agent": "DisasterWatchAI/1.0" }, timeout: 5000 },
    );

    if (!geoRes.data || geoRes.data.length === 0)
      return res.status(404).json({ error: "City not found", rainfall: 0 });

    const { lat, lon, display_name } = geoRes.data[0];

    // Step 2: Fetch real rainfall from Open-Meteo
    const weatherRes = await axios.get(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=precipitation,rain,weathercode&daily=precipitation_sum&timezone=auto&forecast_days=1`,
      { timeout: 5000 },
    );

    const current = weatherRes.data.current;
    const rainfall = (current.precipitation || 0) + (current.rain || 0);
    const dailySum = weatherRes.data.daily?.precipitation_sum?.[0] || 0;
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
  (async () => {
    if (useDB()) {
      const list = await Report.find()
        .sort({ created_at: -1 })
        .limit(200)
        .lean();
      return res.json(list);
    }
    res.json([...reports].reverse());
  })();
});

// Public: anyone can submit reports
app.post("/report", (req, res) => {
  try {
    const { type, severity, description, latitude, longitude, city } = req.body;
    if (!city) return res.status(400).json({ error: "City is required" });
    if (!type) return res.status(400).json({ error: "Type is required" });
    (async () => {
      if (useDB()) {
        const doc = await Report.create({
          type,
          severity,
          description,
          latitude: parseFloat(latitude) || 0,
          longitude: parseFloat(longitude) || 0,
          city,
          submittedBy: "Anonymous",
        });
        io.emit("new-report", doc);
        console.log(`📍 [Anonymous] New report: ${type} in ${city}`);
        return res.json(doc);
      }

      const report = {
        id: nextId.report++,
        type,
        severity,
        description,
        latitude: parseFloat(latitude) || 0,
        longitude: parseFloat(longitude) || 0,
        city,
        submittedBy: "Anonymous",
        created_at: new Date().toISOString(),
      };

      reports.push(report);
      io.emit("new-report", report);
      console.log(`📍 [Anonymous] New report: ${type} in ${city}`);
      return res.json(report);
    })();
  } catch (err) {
    res.status(500).json({ error: "Failed to save report" });
  }
});

// ══════════════════════════════════════
//  ALERTS
// ══════════════════════════════════════

app.get("/alerts", (req, res) => {
  (async () => {
    if (useDB()) {
      const list = await Alert.find().sort({ sent_at: -1 }).limit(200).lean();
      return res.json(list);
    }
    res.json([...alerts].reverse());
  })();
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
        { timeout: 6000 },
      );
      rainfall = weatherResp.data.rainfall || 0;
    } catch {
      // Fallback: city-hash based demo value
      const cityHash = city.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
      rainfall = 20 + (cityHash % 80);
      console.log(
        `⚠️  Open-Meteo unavailable, using demo rainfall: ${rainfall}mm`,
      );
    }

    let reportsCount = 0;
    if (useDB()) {
      reportsCount = await Report.countDocuments({
        city: new RegExp(`^${city}$`, "i"),
      });
    } else {
      reportsCount = reports.filter(
        (r) => r.city?.toLowerCase() === city.toLowerCase(),
      ).length;
    }

    let risk = "LOW";

    // Try Python AI model first via model-service proxy
    try {
      const aiResp = await axios.post(
        `${MODEL_SERVICE_URL}/predict`,
        { rainfall, reports: reportsCount },
        { timeout: 3000 },
      );
      risk = aiResp.data.risk;
      console.log(
        `🤖 AI model → ${city}: ${risk} (${rainfall}mm, ${reportsCount} reports)`,
      );
    } catch (err) {
      console.log("⚡ AI model offline — using rule-based logic", err.message);
    }

    // Smart override (ensures correct thresholds)
    if (rainfall >= 60 || reportsCount >= 4) risk = "HIGH";
    else if (rainfall >= 30 || reportsCount >= 2) risk = "MODERATE";
    else risk = "LOW";

    console.log(
      `✅ Final: ${city} → ${risk} (${rainfall}mm, ${reportsCount} reports)`,
    );

    // Auto-create alert for HIGH
    if (risk === "HIGH") {
      if (useDB()) {
        const exists = await Alert.findOne({
          area: new RegExp(`^${city}$`, "i"),
          level: "HIGH",
        });
        if (!exists) {
          const alert = await Alert.create({
            area: city,
            level: "HIGH",
            reason: `HIGH risk detected: ${rainfall}mm rainfall + ${reportsCount} community reports`,
          });
          io.emit("new-alert", alert);
        }
      } else {
        const exists = alerts.find(
          (a) =>
            a.area?.toLowerCase() === city.toLowerCase() && a.level === "HIGH",
        );
        if (!exists) {
          const alert = {
            id: nextId.alert++,
            area: city,
            level: "HIGH",
            reason: `HIGH risk detected: ${rainfall}mm rainfall + ${reportsCount} community reports`,
            sent_at: new Date().toISOString(),
          };
          alerts.push(alert);
          io.emit("new-alert", alert);
        }
      }
    }

    res.json({ city, rainfall, reports: reportsCount, risk });
  } catch (err) {
    console.error("Predict-risk error:", err.message);
    res.status(500).json({ error: "Prediction failed" });
  }
});

// ══════════════════════════════════════
//  COMMUNITY HELP BOARD ROUTES
// ══════════════════════════════════════

// GET /help-requests/:city — Fetch help requests for a city
app.get("/help-requests/:city", async (req, res) => {
  try {
    const { city } = req.params;
    if (useDB()) {
      const list = await HelpRequest.find({ city: new RegExp(`^${city}$`, "i") }).sort({ createdAt: -1 });
      return res.json(list);
    }
    const list = helpRequests.filter(h => h.city?.toLowerCase() === city.toLowerCase());
    res.json([...list].reverse());
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch help requests" });
  }
});

// POST /help-request — Create a help request/offer
app.post("/help-request", async (req, res) => {
  try {
    const { type, category, title, description, city, latitude, longitude, contactName, contactPhone } = req.body;
    if (!type || !category || !title || !description || !city || !latitude || !longitude || !contactName || !contactPhone) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (useDB()) {
      const request = await HelpRequest.create({
        type, category, title, description, city,
        latitude: parseFloat(latitude), longitude: parseFloat(longitude),
        contactName, contactPhone
      });
      io.emit("new-help-request", request);
      return res.json(request);
    }

    // In-memory fallback
    if (!nextId.helpRequest) nextId.helpRequest = 1;
    const request = {
      id: nextId.helpRequest++,
      type, category, title, description, city,
      latitude: parseFloat(latitude), longitude: parseFloat(longitude),
      contactName, contactPhone,
      status: "open",
      createdAt: new Date().toISOString()
    };
    helpRequests.push(request);
    io.emit("new-help-request", request);
    res.json(request);
  } catch (err) {
    res.status(500).json({ error: "Failed to create help request" });
  }
});

// PUT /help-request/:id/resolve — Mark a help request as resolved
app.put("/help-request/:id/resolve", async (req, res) => {
  try {
    const { id } = req.params;
    if (useDB()) {
      const request = await HelpRequest.findByIdAndUpdate(id, { status: "resolved" }, { new: true });
      if (!request) return res.status(404).json({ error: "Help request not found" });
      io.emit("resolve-help-request", request);
      return res.json(request);
    }

    const request = helpRequests.find(h => String(h.id) === String(id));
    if (!request) return res.status(404).json({ error: "Help request not found" });
    request.status = "resolved";
    io.emit("resolve-help-request", request);
    res.json(request);
  } catch (err) {
    res.status(500).json({ error: "Failed to resolve help request" });
  }
});

// ══════════════════════════════════════
//  EMERGENCY PLANNER CHECKLIST ROUTES
// ══════════════════════════════════════

// GET /checklists — Fetch user's checklist (authenticated)
app.get("/checklists", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    if (useDB()) {
      let checklist = await Checklist.findOne({ userId });
      if (!checklist) {
        checklist = { userId, items: [] };
      }
      return res.json(checklist);
    }

    let checklist = checklists.find(c => String(c.userId) === String(userId));
    if (!checklist) {
      checklist = { userId, items: [] };
    }
    res.json(checklist);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch checklist" });
  }
});

// POST /checklists — Save/update user's checklist (authenticated)
app.post("/checklists", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: "Items must be an array" });
    }

    if (useDB()) {
      let checklist = await Checklist.findOne({ userId });
      if (checklist) {
        checklist.items = items;
        checklist.updatedAt = new Date();
        await checklist.save();
      } else {
        checklist = await Checklist.create({ userId, items });
      }
      return res.json(checklist);
    }

    // In-memory fallback
    if (!nextId.checklist) nextId.checklist = 1;
    let checklist = checklists.find(c => String(c.userId) === String(userId));
    if (checklist) {
      checklist.items = items;
      checklist.updatedAt = new Date().toISOString();
    } else {
      checklist = {
        id: nextId.checklist++,
        userId,
        items,
        updatedAt: new Date().toISOString()
      };
      checklists.push(checklist);
    }
    res.json(checklist);
  } catch (err) {
    res.status(500).json({ error: "Failed to save checklist" });
  }
});

// ──── START ────
if (process.env.VERCEL !== "1") {
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`🚀 Server on http://localhost:${PORT}`);
    console.log(
      "   Endpoints: /auth/register  /auth/login  /reports  /report  /alerts  /predict-risk  /weather/:city  /help-requests/:city  /checklists",
    );
  });
}

module.exports = app;
