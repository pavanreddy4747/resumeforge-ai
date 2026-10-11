// Lightweight line-level diff (no external dependency) using LCS, good enough
// for comparing two resume text extractions line-by-line.

function splitLines(text) {
  return (text || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

function lcsTable(a, b) {
  const m = a.length, n = b.length;
  const table = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      table[i][j] = a[i - 1] === b[j - 1] ? table[i - 1][j - 1] + 1 : Math.max(table[i - 1][j], table[i][j - 1]);
    }
  }
  return table;
}

// Returns an array of { type: "same" | "added" | "removed", text } in order.
function diffLines(oldText, newText) {
  const a = splitLines(oldText);
  const b = splitLines(newText);
  const table = lcsTable(a, b);

  const result = [];
  let i = a.length, j = b.length;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      result.unshift({ type: "same", text: a[i - 1] });
      i--; j--;
    } else if (table[i - 1][j] >= table[i][j - 1]) {
      result.unshift({ type: "removed", text: a[i - 1] });
      i--;
    } else {
      result.unshift({ type: "added", text: b[j - 1] });
      j--;
    }
  }
  while (i > 0) { result.unshift({ type: "removed", text: a[i - 1] }); i--; }
  while (j > 0) { result.unshift({ type: "added", text: b[j - 1] }); j--; }

  return result;
}

// Summarize what changed between two analyses: keyword gains/losses and the score delta.
function summarizeAnalysisDiff(prevAnalysis, nextAnalysis) {
  const prevMatched = new Set(prevAnalysis.matchedKeywords || []);
  const nextMatched = new Set(nextAnalysis.matchedKeywords || []);

  const newlyMatched = [...nextMatched].filter((k) => !prevMatched.has(k));
  const newlyLost = [...prevMatched].filter((k) => !nextMatched.has(k));

  return {
    scoreDelta: nextAnalysis.score - prevAnalysis.score,
    newlyMatchedKeywords: newlyMatched,
    newlyLostKeywords: newlyLost,
    breakdownDelta: {
      keywordScore: nextAnalysis.breakdown.keywordScore - prevAnalysis.breakdown.keywordScore,
      sectionScore: nextAnalysis.breakdown.sectionScore - prevAnalysis.breakdown.sectionScore,
      formatScore: nextAnalysis.breakdown.formatScore - prevAnalysis.breakdown.formatScore,
    },
    textDiff: diffLines(prevAnalysis.resumeText, nextAnalysis.resumeText),
  };
}

module.exports = { diffLines, summarizeAnalysisDiff };
