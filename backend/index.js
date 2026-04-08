require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const axios = require("axios");
const pool = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Attach Socket.IO
const io = new Server(server, {
  cors: { origin: "*" },
});

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
});

// Health check
app.get("/", (req, res) => {
  res.send("Backend is running");
});

// ---------------- REPORTS ----------------

app.get("/reports", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM reports ORDER BY created_at DESC",
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Reports error:", err);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

app.post("/report", async (req, res) => {
  try {
    const { type, severity, description, latitude, longitude, city } = req.body;

    if (!city) {
      return res.status(400).json({ error: "City is required" });
    }

    const result = await pool.query(
      `INSERT INTO reports(type, severity, description, latitude, longitude, city)
       VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
      [type, severity, description, latitude, longitude, city],
    );

    io.emit("new-report", result.rows[0]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Insert report error:", err);
    res.status(500).json({ error: "Failed to save report" });
  }
});

// ---------------- ALERTS ----------------

app.get("/alerts", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM alerts ORDER BY sent_at DESC LIMIT 50",
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Alerts error:", err);
    res.status(500).json({ error: "Failed to fetch alerts" });
  }
});

// ---------------- AI RISK ----------------

app.post("/predict-risk", async (req, res) => {
  try {
    const { rainfall, city } = req.body;

    if (!city || rainfall === undefined) {
      return res.status(400).json({ error: "Rainfall and city required" });
    }

    const countResult = await pool.query(
      "SELECT COUNT(*) FROM reports WHERE city=$1",
      [city],
    );

    const reportsCount = Number(countResult.rows[0].count);

    const aiResponse = await axios.post(
      "http://localhost:5001/predict",
      {
        rainfall,
        reports: reportsCount,
      },
      { timeout: 5000 },
    );

    const risk = aiResponse.data.risk;

    // Auto-generate alert if HIGH risk
    if (risk === "HIGH") {
      await pool.query(
        `INSERT INTO alerts(area, level, reason)
         VALUES($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [
          city,
          "HIGH",
          `AI detected HIGH risk: ${reportsCount} reports + ${rainfall}mm rainfall`,
        ],
      ).catch(() => {}); // silent fail if ON CONFLICT not supported
    }

    res.json({
      city,
      rainfall,
      reports: reportsCount,
      risk,
    });
  } catch (err) {
    console.error("Predict-risk error:", err.message);
    res.status(500).json({ error: "Prediction failed" });
  }
});

// ---------------- SERVER START ----------------

server.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
