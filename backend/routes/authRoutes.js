const express = require("express");
const authController = require("../controllers/authController");
const { authMiddleware } = require("../middleware/auth");
const { apiLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

// Public Auth Endpoints (Protected by Rate Limiter)
router.post("/register", apiLimiter, authController.register);
router.post("/login", apiLimiter, authController.login);

// Token Verification Route
router.get("/me", authMiddleware, authController.getMe);

module.exports = router;
