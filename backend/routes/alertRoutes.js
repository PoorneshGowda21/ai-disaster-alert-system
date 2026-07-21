const express = require("express");
const alertController = require("../controllers/alertController");

const router = express.Router();

// Get list of alerts
router.get("/", alertController.getAlerts);

module.exports = router;
