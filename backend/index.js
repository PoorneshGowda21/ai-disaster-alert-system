require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const axios = require("axios");
const mongoose = require("mongoose");
const connectDB = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

// Connect MongoDB
connectDB();

// ──── Mongoose Schemas ────

const reportSchema = new mongoose.Schema({
  type: String,
  severity: String,
  description: String,
  latitude: Number,
  longitude: Number,
  city: String,
  created_at: { type: Date, default: Date.now },
});

const alertSchema = new mongoose.Schema({
  area: String,
  level: String,
  reason: String,
  sent_at: { type: Date, default: Date.now },
});

const Report = mongoose.model("Report", reportSchema);
const Alert = mongoose.model("Alert", alertSchema);

// ──── Socket.io ────
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
});

// ──── Health check ────
app.get("/", (req, res) => res.send("Backend is running ✅"));

// ──── REPORTS ────

app.get("/reports", async (req, res) => {
  try {
    const reports = await Report.find().sort({ created_at: -1 });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

app.post("/report", async (req, res) => {
  try {
    const { type, severity, description, latitude, longitude, city } = req.body;
    if (!city) return res.status(400).json({ error: "City is required" });

    const report = await Report.create({
      type, severity, description,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      city,
    });

    io.emit("new-report", report);
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: "Failed to save report" });
  }
});

// ──── ALERTS ────

app.get("/alerts", async (req, res) => {
  try {
    const alerts = await Alert.find().sort({ sent_at: -1 }).limit(50);
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch alerts" });
  }
});

// ──── AI RISK ────

app.post("/predict-risk", async (req, res) => {
  try {
    const { rainfall, city } = req.body;
    if (!city || rainfall === undefined)
      return res.status(400).json({ error: "Rainfall and city required" });

    const reportsCount = await Report.countDocuments({ city });

    let risk = "LOW";
    try {
      const aiResponse = await axios.post(
        "http://localhost:5001/predict",
        { rainfall, reports: reportsCount },
        { timeout: 5000 }
      );
      risk = aiResponse.data.risk;
    } catch {
      // AI model not running — simple fallback logic
      if (rainfall > 80 || reportsCount > 5) risk = "HIGH";
      else if (rainfall > 40 || reportsCount > 2) risk = "MODERATE";
      else risk = "LOW";
    }

    // Auto-store alert if HIGH
    if (risk === "HIGH") {
      await Alert.create({
        area: city,
        level: "HIGH",
        reason: `AI detected HIGH risk: ${reportsCount} reports + ${rainfall}mm rainfall`,
      });
    }

    res.json({ city, rainfall, reports: reportsCount, risk });
  } catch (err) {
    console.error("Predict-risk error:", err.message);
    res.status(500).json({ error: "Prediction failed" });
  }
});

// ──── START ────
server.listen(5000, () => console.log("🚀 Server running on http://localhost:5000"));
