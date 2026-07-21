const jwt = require("jsonwebtoken");
const User = require("../models/User");
const AppError = require("../utils/AppError");

const authMiddleware = async (req, res, next) => {
  try {
    // 1) Verify authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(new AppError("No authentication token provided. Please log in.", 401));
    }

    // 2) Verify token signature
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "disasterwatch_secret");

    // 3) Check if user still exists in database
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next(new AppError("The user belonging to this token no longer exists.", 401));
    }

    // 4) Grant access and attach user to request object
    req.user = currentUser;
    next();
  } catch (err) {
    next(err); // Forward JWT validation errors to global handler
  }
};

// Role-based Access Control (RBAC) middleware generator
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError("You do not have permission to perform this action.", 403));
    }
    next();
  };
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "disasterwatch_secret");
      const currentUser = await User.findById(decoded.id);
      if (currentUser) {
        req.user = currentUser;
      }
    }
    next();
  } catch (err) {
    // Gracefully fallback to anonymous if token is invalid or expired
    next();
  }
};

module.exports = { authMiddleware, authorize, optionalAuth };
