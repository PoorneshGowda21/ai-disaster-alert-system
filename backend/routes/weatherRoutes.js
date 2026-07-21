const express = require("express");
const weatherController = require("../controllers/weatherController");

const router = express.Router();

// Get weather indicators for a city
router.get("/:city", weatherController.getWeather);

module.exports = router;
