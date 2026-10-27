const express = require("express");
const mongoose = require("mongoose");
const { checkAI } = require("../utils/ai");
const { healthLimiter } = require("../middleware/limits");

const router = express.Router();

// Is the server up, and what is configured? (never reveals any secret value)
router.get("/", (req, res) => {
  res.json({
    ok: true,
    uptimeSeconds: Math.round(process.uptime()),
    database: mongoose.connection.readyState === 1 ? "connected" : "not connected",
    aiKeySet: Boolean(process.env.GEMINI_API_KEY),
    googleLoginConfigured: Boolean(process.env.GOOGLE_CLIENT_ID),
  });
});

// Makes one tiny real call to Gemini and reports the real error if it fails. Open it in a browser to diagnose the AI.
router.get("/ai", healthLimiter, async (req, res) => {
  try {
    res.json(await checkAI());
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
