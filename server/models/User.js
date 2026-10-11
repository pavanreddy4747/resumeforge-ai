const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Password is optional now: Google-authenticated users have no local password.
    password: { type: String, minlength: 6, default: null },
    googleId: { type: String, default: null, index: true },
    authProvider: { type: String, enum: ["local", "google"], default: "local" },
    avatarUrl: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
