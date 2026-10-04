require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));

app.get("/", (req, res) => res.json({ message: "ResumeForge AI API running" }));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/analysis", require("./routes/analysis"));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(err.status || 500).json({ message: err.message || "Server error" });
});

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("DB connection failed:", err.message);
    process.exit(1);
  });
