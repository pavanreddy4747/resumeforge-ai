const mongoose = require("mongoose");

const analysisSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // Version history / diffing: analyses can be grouped into a "resume lineage"
    // so the dashboard can show score movement across edits of the same target role.
    lineageId: { type: mongoose.Schema.Types.ObjectId, default: null }, // null = first version, else points to the first analysis in the chain
    versionNumber: { type: Number, default: 1 },
    previousAnalysis: { type: mongoose.Schema.Types.ObjectId, ref: "Analysis", default: null },

    fileName: String,
    jobTitle: { type: String, default: "Untitled Role" },
    jobDescription: String,
    resumeText: String,
    score: Number,
    breakdown: {
      keywordScore: Number,
      sectionScore: Number,
      formatScore: Number,
      bulletScore: Number, // null when the resume has fewer than 3 detectable bullets
    },
    matchedKeywords: [String],
    missingKeywords: [String],
    sections: {
      hasSummary: Boolean,
      hasSkills: Boolean,
      hasExperience: Boolean,
      hasEducation: Boolean,
      hasProjects: Boolean,
      hasContact: Boolean,
    },

    // Explainability: which resume lines produced each matched keyword hit
    evidence: [
      {
        _id: false,
        keyword: String,
        hits: [{ _id: false, lineNumber: Number, snippet: String }],
      },
    ],

    // Skill-level detail (v3): is each skill proven or only listed, required or nice-to-have, and what is it worth?
    skills: {
      mode: { type: String, enum: ["skills", "generic"], default: "skills" },
      note: String,
      matched: [
        { _id: false, skill: String, category: String, required: Boolean, status: String, hits: Number },
      ],
      missing: [
        { _id: false, skill: String, category: String, required: Boolean, pointsIfListed: Number, pointsIfProven: Number },
      ],
      unproven: [
        { _id: false, skill: String, category: String, required: Boolean, pointsIfShown: Number },
      ],
    },

    // Bullet-point quality check
    bullets: {
      checked: Number,
      strong: Number,
      bulletScore: Number,
      flagged: [{ _id: false, text: String, issues: [String] }],
    },

    // Overfitting / keyword-stuffing detector
    stuffing: {
      flags: [
        {
          keyword: String,
          occurrences: Number,
          reason: String,
        },
      ],
      keywordDensity: Number,
      densityWarning: Boolean,
    },

    // Honest confidence range instead of a single falsely-precise score
    confidence: {
      low: Number,
      high: Number,
      note: String,
    },

    aiFeedback: {
      source: { type: String, enum: ["gemini", "fallback"], default: "fallback" },
      model: String,
      fallbackReason: String,
      summary: String,
      strengths: [String],
      improvements: [String],
      rewrittenBullets: [String],
      skillGapAdvice: [String],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Analysis", analysisSchema);
