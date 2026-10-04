const mongoose = require("mongoose");

const analysisSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
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
    aiFeedback: {
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
