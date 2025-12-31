const express = require("express");
const cors = require("cors");
const pool = require("./db"); // IMPORTANT

const app = express();
app.use(cors());
app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.send("Backend is running!");
});

// Report API
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
    res.json({ message: "Report received", data: result.rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error saving report" });
  }
});

// START SERVER (keep at bottom)
app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
