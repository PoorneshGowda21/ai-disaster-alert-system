require("dotenv").config(); // MUST be first

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const pool = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.send("Backend is running!");
});

// CREATE report
app.post("/report", async (req, res) => {
  const { type, severity, description, latitude, longitude } = req.body;

  try {
    const result = await pool.query(
      `
      INSERT INTO reports(type, severity, description, latitude, longitude)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING *
      `,
      [type, severity, description, latitude, longitude]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error saving report:", err);
    res.status(500).json({ error: "Error saving report" });
  }
});

// ✅ READ reports (DAY 5 API)
app.get("/reports", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM reports ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching reports:", err);
    res.status(500).json({ error: "Error fetching reports" });
  }
});

// Call ML model
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

app.listen(process.env.PORT || 5000, () => {
  console.log(`Server running on http://localhost:${process.env.PORT || 5000}`);
});
