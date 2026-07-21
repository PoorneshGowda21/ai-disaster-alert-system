const express = require("express");
const predictionController = require("../controllers/predictionController");

const router = express.Router();

// Predict disaster risks
router.post("/", predictionController.predictRisk);

module.exports = router;
