const rateLimit = require("express-rate-limit");

const apiLimiter = rateLimit({
  windowMs: 2 * 60 * 1000,
  max: 20,
  message: "Too many requests from this IP, please try again after 2 minutes",
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 2 * 60 * 1000,
  max: 20,
  message:
    "Too many login/signup attempts from this IP, please try again after 2 minutes",
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { apiLimiter, authLimiter };
