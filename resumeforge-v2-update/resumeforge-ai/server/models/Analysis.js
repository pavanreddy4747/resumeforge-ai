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
