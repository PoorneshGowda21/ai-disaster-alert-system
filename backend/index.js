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

// --------------------
// HTTP + Socket Server
// --------------------
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
});

// --------------------
// Health Check
// --------------------
app.get("/", (req, res) => {
  res.send("Backend is running!");
});

// --------------------
// REPORTS APIs
// --------------------
app.get("/reports", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM reports ORDER BY created_at DESC",
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching reports:", err);
    res.status(500).json({ error: "Error fetching reports" });
  }
});

app.post("/report", async (req, res) => {
  const { type, severity, description, latitude, longitude } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO reports(type, severity, description, latitude, longitude)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [type, severity, description, latitude, longitude],
    );

    // 🔥 Real-time update
    io.emit("new-report", result.rows[0]);

    res.json({
      message: "Report received",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("Error saving report:", err);
    res.status(500).json({ error: "Error saving report" });
  }
});

// --------------------
// AI PREDICTION API
// --------------------
app.post("/predict-risk", async (req, res) => {
  try {
    const { rainfall, area } = req.body;

    const reportsResult = await pool.query("SELECT COUNT(*) FROM reports");

    const reports = Number(reportsResult.rows[0].count);

    const response = await axios.post("http://model-service:5001/predict", {
      rainfall,
      reports,
    });

    const { risk } = response.data;

    await pool.query(
      "INSERT INTO predictions(area, rainfall, reports, risk) VALUES($1,$2,$3,$4)",
      [area || "Unknown", rainfall, reports, risk],
    );

    res.json({
      area,
      rainfall,
      reports,
      risk,
    });
  } catch (err) {
    console.error("Prediction error:", err.message);
    res.status(500).json({ error: "Prediction failed" });
  }
});


// --------------------
// START SERVER
// --------------------
server.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});


app.get("/alerts", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM alerts ORDER BY created_at DESC",
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching alerts:", err);
    res.status(500).json({ error: "Failed to fetch alerts" });
  }
});

