const express = require("express");
const chatController = require("../controllers/chatController");

const router = express.Router();

// Retrieve chat logs by city
router.get("/:city", chatController.getChatsByCity);

module.exports = router;
