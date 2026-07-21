const rateLimit = require("express-rate-limit");

// General API rate limiter (100 requests per 15 mins)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, 
  message: {
    status: "fail",
    message: "Too many requests from this IP, please try again after 15 minutes."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limiter for submitting disaster reports (10 reports per 5 mins)
const reportLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10,
  message: {
    status: "fail",
    message: "Too many incident reports submitted from this IP. Please try again after 5 minutes."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { apiLimiter, reportLimiter };
