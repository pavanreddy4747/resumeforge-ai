const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const auth = require("../middleware/auth");

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  avatarUrl: user.avatarUrl || null,
  authProvider: user.authProvider,
});

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields are required" });
    if (password.length < 6)
      return res.status(400).json({ message: "Password must be at least 6 characters" });

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ message: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed, authProvider: "local" });

    res.status(201).json({ token: signToken(user._id), user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ message: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password are required" });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });
    if (!user.password)
      return res.status(400).json({ message: "This account uses Google Sign-In. Please continue with Google." });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ message: "Invalid credentials" });

    res.json({ token: signToken(user._id), user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ message: "Login failed" });
  }
});

// Google OAuth: frontend sends the ID token obtained from Google Identity Services.
// We verify it server-side, then find-or-create the user and issue our own JWT,
// so the rest of the app (including file upload auth) keeps working exactly the same way.
router.post("/google", async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ message: "Missing Google credential" });
    if (!process.env.GOOGLE_CLIENT_ID)
      return res.status(500).json({ message: "Google Sign-In is not configured on the server" });

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(400).json({ message: "Could not verify Google account" });
    }

    let user = await User.findOne({ email: payload.email.toLowerCase() });
    if (user) {
      // Existing local account signing in with Google for the first time: link it.
      if (!user.googleId) {
        user.googleId = payload.sub;
        user.authProvider = user.password ? user.authProvider : "google";
        user.avatarUrl = user.avatarUrl || payload.picture || null;
        await user.save();
      }
    } else {
      user = await User.create({
        name: payload.name || payload.email.split("@")[0],
        email: payload.email.toLowerCase(),
        googleId: payload.sub,
        authProvider: "google",
        avatarUrl: payload.picture || null,
      });
    }

    res.json({ token: signToken(user._id), user: publicUser(user) });
  } catch (err) {
    console.error("Google auth failed:", err.message);
    res.status(401).json({ message: "Google authentication failed" });
  }
});

router.get("/me", auth, async (req, res) => {
  const user = await User.findById(req.userId).select("-password");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json({ user: publicUser(user) });
});

module.exports = router;
