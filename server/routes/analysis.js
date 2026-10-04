const express = require("express");
const multer = require("multer");
const pdf = require("pdf-parse");
const auth = require("../middleware/auth");
const Analysis = require("../models/Analysis");
const { analyze } = require("../utils/scorer");
const { getAIFeedback } = require("../utils/ai");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF files are allowed"));
    }
    cb(null, true);
  },
});

// Create analysis
router.post("/", auth, upload.single("resume"), async (req, res) => {
  try {
    const { jobDescription, jobTitle } = req.body;
    if (!req.file) return res.status(400).json({ message: "Please upload a PDF resume" });
    if (!jobDescription || jobDescription.trim().length < 50)
      return res.status(400).json({ message: "Please paste a job description (min 50 characters)" });

    const parsed = await pdf(req.file.buffer);
    const resumeText = (parsed.text || "").trim();
    if (resumeText.length < 100)
      return res.status(400).json({
        message: "Could not read text from this PDF. Make sure it is not a scanned image.",
      });

    const result = analyze(resumeText, jobDescription);
    const aiFeedback = await getAIFeedback({
      resumeText,
      jobDescription,
      missingKeywords: result.missingKeywords,
      score: result.score,
    });

    const saved = await Analysis.create({
      user: req.userId,
      fileName: req.file.originalname,
      jobTitle: jobTitle?.trim() || "Untitled Role",
      jobDescription,
      resumeText,
      ...result,
      aiFeedback,
    });

    res.status(201).json(saved);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || "Analysis failed" });
  }
});

// History list (without heavy text fields)
router.get("/", auth, async (req, res) => {
  const list = await Analysis.find({ user: req.userId })
    .select("fileName jobTitle score createdAt breakdown")
    .sort({ createdAt: -1 });
  res.json(list);
});

// Single analysis
router.get("/:id", auth, async (req, res) => {
  try {
    const item = await Analysis.findOne({ _id: req.params.id, user: req.userId });
    if (!item) return res.status(404).json({ message: "Analysis not found" });
    res.json(item);
  } catch {
    res.status(400).json({ message: "Invalid ID" });
  }
});

// Delete
router.delete("/:id", auth, async (req, res) => {
  try {
    await Analysis.deleteOne({ _id: req.params.id, user: req.userId });
    res.json({ message: "Deleted" });
  } catch {
    res.status(400).json({ message: "Invalid ID" });
  }
});

module.exports = router;
