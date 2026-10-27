const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { apiLimiter, authLimiter } = require("./middleware/limits");

// Builds the Express app without connecting to the database or listening, so tests can use it directly.
function createApp() {
  const app = express();
  app.set("trust proxy", 1); // Render sits behind a proxy; needed for correct per-IP rate limiting
  app.use(helmet());
  app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
  app.use(express.json({ limit: "2mb" }));
  app.use("/api", apiLimiter);

  app.get("/", (req, res) => res.json({ message: "ResumeForge AI API running" }));
  app.use("/api/health", require("./routes/health"));
  app.use(["/api/auth/login", "/api/auth/register", "/api/auth/google"], authLimiter);
  app.use("/api/auth", require("./routes/auth"));
  app.use("/api/analysis", require("./routes/analysis"));

  // Global error handler
  app.use((err, req, res, next) => {
    console.error(err.message);
    // Multer errors (file too big, wrong type) are the user's mistake, not a server crash
    const status = err.status || (err.code === "LIMIT_FILE_SIZE" || err.code === "LIMIT_UNEXPECTED_FILE" ? 400 : 500);
    const message = err.code === "LIMIT_FILE_SIZE" ? "That file is too large. The limit is 3 MB." : err.message || "Server error";
    res.status(status).json({ message });
  });
  return app;
}

module.exports = { createApp };
