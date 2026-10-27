const express = require("express");
const multer = require("multer");
const pdf = require("pdf-parse");
const auth = require("../middleware/auth");
const Analysis = require("../models/Analysis");
const { analyze } = require("../utils/scorer");
const { getAIFeedback } = require("../utils/ai");
const { summarizeAnalysisDiff } = require("../utils/diff");
const { planDelete } = require("../utils/lineage");
const { scanLimiter } = require("../middleware/limits");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      const err = new Error("Only PDF files are allowed");
      err.status = 400; // the user's mistake, not a server crash
      return cb(err);
    }
    cb(null, true);
  },
});

async function extractAndScore(file, jobDescription) {
  let parsed;
  try {
    // Pass an independent copy of the bytes. Small uploads are slices of Node's shared buffer pool, and the
    // PDF library underneath can read the whole shared block (mixing up files or failing with "bad XRef entry").
    parsed = await pdf(new Uint8Array(file.buffer));
  } catch (e) {
    console.error("PDF parse failed:", e.message);
    const err = new Error("We could not read this PDF. Try re-exporting it from Word or Google Docs as a text-based PDF.");
    err.status = 400;
    throw err;
  }
  const resumeText = (parsed.text || "").trim();
  if (resumeText.length < 100) {
    const err = new Error("Could not read text from this PDF. Make sure it is not a scanned image.");
    err.status = 400;
    throw err;
  }
  const result = analyze(resumeText, jobDescription);
  return { resumeText, result };
}

// Create analysis. Optionally pass `previousAnalysis` (an existing analysis id) to
// link this as the next version in a resume's revision history, which powers the
// dashboard's version diffing view.
router.post("/", auth, scanLimiter, upload.single("resume"), async (req, res) => {
  try {
    const { jobDescription, jobTitle, previousAnalysis } = req.body;
    if (!req.file) return res.status(400).json({ message: "Please upload a PDF resume" });
    if (!jobDescription || jobDescription.trim().length < 50)
      return res.status(400).json({ message: "Please paste a job description (min 50 characters)" });

    const { resumeText, result } = await extractAndScore(req.file, jobDescription);
    const aiFeedback = await getAIFeedback({
      resumeText,
      jobDescription,
      missingKeywords: result.missingKeywords,
      score: result.score,
    });

    // Resolve version lineage: if this continues an existing chain, inherit its lineageId
    // (or start one using the previous analysis's own id if it was the first version).
    let lineageId = null;
    let versionNumber = 1;
    let prevDoc = null;
    if (previousAnalysis) {
      prevDoc = await Analysis.findOne({ _id: previousAnalysis, user: req.userId });
      if (prevDoc) {
        lineageId = prevDoc.lineageId || prevDoc._id;
        versionNumber = (prevDoc.versionNumber || 1) + 1;
      }
    }

    const saved = await Analysis.create({
      user: req.userId,
      fileName: req.file.originalname,
      jobTitle: jobTitle?.trim() || "Untitled Role",
      jobDescription,
      resumeText,
      ...result,
      aiFeedback,
      lineageId,
      versionNumber,
      previousAnalysis: prevDoc ? prevDoc._id : null,
    });

    res.status(201).json(saved);
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || "Analysis failed" });
  }
});

// Compare two resumes against the SAME job description side-by-side without saving
// either as the user's canonical analysis — a quick "which version is better" check.
router.post(
  "/compare",
  auth,
  scanLimiter,
  upload.fields([{ name: "resumeA", maxCount: 1 }, { name: "resumeB", maxCount: 1 }]),
  async (req, res) => {
    try {
      const { jobDescription } = req.body;
      const fileA = req.files?.resumeA?.[0];
      const fileB = req.files?.resumeB?.[0];
      if (!fileA || !fileB)
        return res.status(400).json({ message: "Please upload two PDF resumes to compare" });
      if (!jobDescription || jobDescription.trim().length < 50)
        return res.status(400).json({ message: "Please paste a job description (min 50 characters)" });

      const [a, b] = await Promise.all([
        extractAndScore(fileA, jobDescription),
        extractAndScore(fileB, jobDescription),
      ]);

      const diff = summarizeAnalysisDiff(
        { ...a.result, resumeText: a.resumeText },
        { ...b.result, resumeText: b.resumeText }
      );

      res.json({
        resumeA: { fileName: fileA.originalname, ...a.result },
        resumeB: { fileName: fileB.originalname, ...b.result },
        diff,
      });
    } catch (err) {
      console.error(err);
      res.status(err.status || 500).json({ message: err.message || "Comparison failed" });
    }
  }
);

// History list (without heavy text fields)
router.get("/", auth, async (req, res) => {
  const list = await Analysis.find({ user: req.userId })
    .select("fileName jobTitle score createdAt breakdown lineageId versionNumber previousAnalysis")
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

// Diff this analysis against its immediate previous version in the lineage.
router.get("/:id/diff", auth, async (req, res) => {
  try {
    const current = await Analysis.findOne({ _id: req.params.id, user: req.userId });
    if (!current) return res.status(404).json({ message: "Analysis not found" });
    if (!current.previousAnalysis)
      return res.status(400).json({ message: "This is the first version \u2014 nothing to compare against" });

    const previous = await Analysis.findOne({ _id: current.previousAnalysis, user: req.userId });
    if (!previous) return res.status(404).json({ message: "Previous version not found" });

    const diff = summarizeAnalysisDiff(previous, current);
    res.json({
      previous: { id: previous._id, versionNumber: previous.versionNumber, score: previous.score, createdAt: previous.createdAt },
      current: { id: current._id, versionNumber: current.versionNumber, score: current.score, createdAt: current.createdAt },
      diff,
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "Invalid ID" });
  }
});

// All versions in the same lineage as this analysis, oldest first.
router.get("/:id/history", auth, async (req, res) => {
  try {
    const current = await Analysis.findOne({ _id: req.params.id, user: req.userId });
    if (!current) return res.status(404).json({ message: "Analysis not found" });

    const lineageId = current.lineageId || current._id;
    const versions = await Analysis.find({
      user: req.userId,
      $or: [{ _id: lineageId }, { lineageId }],
    })
      .select("fileName jobTitle score createdAt versionNumber breakdown")
      .sort({ versionNumber: 1 });

    res.json(versions);
  } catch (err) {
    res.status(400).json({ message: "Invalid ID" });
  }
});

// Delete. If this version sits inside a version chain, repair the chain first so the next version
// still has something valid to compare against.
router.delete("/:id", auth, async (req, res) => {
  try {
    const doc = await Analysis.findOne({ _id: req.params.id, user: req.userId }).select("_id lineageId");
    if (!doc) return res.status(404).json({ message: "Analysis not found" });

    const rootId = doc.lineageId || doc._id;
    const chain = await Analysis.find({ user: req.userId, $or: [{ _id: rootId }, { lineageId: rootId }] })
      .select("_id lineageId previousAnalysis versionNumber")
      .lean();
    const { updates } = planDelete(chain, doc._id);
    if (updates.length) {
      await Analysis.bulkWrite(updates.map((u) => ({ updateOne: { filter: { _id: u._id, user: req.userId }, update: { $set: u.set } } })));
    }
    await Analysis.deleteOne({ _id: doc._id, user: req.userId });
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "Invalid ID" });
  }
});

module.exports = router;
