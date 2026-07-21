const express = require("express");
const reportController = require("../controllers/reportController");
const { optionalAuth } = require("../middleware/auth");
const { reportLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

// Fetch reports
router.get("/", reportController.getReports);

// Geospatial query reports (e.g. /api/reports/nearby?lat=12.97&lng=77.59&radius=10)
router.get("/nearby", reportController.getNearbyReports);

// Submit new report (Public with rate limiter, logs credentials if logged in)
router.post("/", reportLimiter, optionalAuth, reportController.createReport);

module.exports = router;
