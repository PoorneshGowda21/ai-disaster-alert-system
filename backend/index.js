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

// Socket connection
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
});

// Test route
app.get("/", (req, res) => {
  res.send("Backend is running!");
});

// GET reports
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

// POST report
app.post("/report", async (req, res) => {
  const { type, severity, description, latitude, longitude } = req.body;

  try {
    const q = `
      INSERT INTO reports(type, severity, description, latitude, longitude)
      VALUES($1,$2,$3,$4,$5)
      RETURNING *
    `;
    const values = [type, severity, description, latitude, longitude];
    const result = await pool.query(q, values);

    // 🔥 EMIT REAL-TIME EVENT
    io.emit("new-report", result.rows[0]);

    res.json({
      message: "Report received",
      data: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error saving report" });
  }
});

// Model service call
app.get("/risk", async (req, res) => {
  try {
    const response = await axios.post("http://model-service:5001/predict", {
      area: "Bangalore",
    });
    res.json(response.data);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error contacting model");
  }
});

// ✅ IMPORTANT: Use server.listen (NOT app.listen)
server.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
