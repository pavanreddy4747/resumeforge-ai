const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

const build = (windowMs, max, message, extra = {}) =>
  rateLimit({ windowMs, max, standardHeaders: true, legacyHeaders: false, message: { message }, ...extra });

// Blunt flood guard for the whole API (generous: a whole college can share one IP address).
const apiLimiter = build(15 * 60 * 1000, 2000, "Too many requests. Please slow down and try again shortly.");

// Wrong-password guessing. Only FAILED attempts count, so normal logins never use up the budget.
const authLimiter = build(15 * 60 * 1000, 50, "Too many failed attempts. Please wait a few minutes and try again.", { skipSuccessfulRequests: true });

// Scans use CPU and your free AI quota. Limited per logged-in user (falls back to IP).
const scanLimiter = build(
  60 * 60 * 1000,
  Number(process.env.SCAN_LIMIT_PER_HOUR) || 30,
  "Scan limit reached for this hour. Please try again later.",
  { keyGenerator: (req) => (req.userId ? `user:${req.userId}` : ipKeyGenerator(req.ip)) }
);

// The AI health page makes a real call to Gemini, so it is tightly limited.
const healthLimiter = build(60 * 60 * 1000, 20, "Health check limit reached. Try again later.");

module.exports = { apiLimiter, authLimiter, scanLimiter, healthLimiter };
