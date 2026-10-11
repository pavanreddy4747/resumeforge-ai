import { useState } from "react";
import api from "../api";

function MiniScore({ title, fileName, result, winner }) {
  const color = result.score >= 75 ? "text-green-600" : result.score >= 50 ? "text-amber-500" : "text-red-600";
  return (
    <div className={`card text-center ${winner ? "ring-2 ring-green-400" : ""}`}>
      <p className="text-sm text-slate-500">{title}</p>
      <p className="font-semibold truncate" title={fileName}>{fileName}</p>
      <p className={`text-5xl font-extrabold my-3 ${color}`}>{result.score}</p>
      {winner && <p className="text-sm font-bold text-green-700 mb-2">🏆 Higher ATS score</p>}
      <p className="text-xs text-slate-500">
        Keywords {result.breakdown.keywordScore} · Sections {result.breakdown.sectionScore} · Format {result.breakdown.formatScore}
      </p>
      {result.confidence && (
        <p className="text-xs text-slate-500 mt-1">
          Likely range {result.confidence.low}{result.confidence.high !== result.confidence.low ? `–${result.confidence.high}` : ""}
        </p>
      )}
      {result.stuffing && (result.stuffing.flags?.length > 0 || result.stuffing.densityWarning) && (
        <p className="text-xs text-amber-700 mt-2">⚠️ Possible keyword stuffing</p>
      )}
    </div>
  );
}

export default function Compare() {
  const [fileA, setFileA] = useState(null);
  const [fileB, setFileB] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!fileA || !fileB) return setError("Please choose both PDF resumes");
    setBusy(true); setError(""); setResult(null);
    try {
      const fd = new FormData();
      fd.append("resumeA", fileA);
      fd.append("resumeB", fileB);
      fd.append("jobDescription", jobDescription);
      const { data } = await api.post("/analysis/compare", fd);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.message || "Comparison failed. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const fileInput = "block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 file:font-semibold hover:file:bg-indigo-100";
  const delta = result?.diff?.scoreDelta ?? 0;
  const changed = result ? result.diff.textDiff.filter((l) => l.type !== "same") : [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold mb-2">Compare two resumes</h1>
        <p className="text-slate-500">
          Upload two versions and one job description to see which one fits better and exactly what is different. Nothing is saved to your history.
        </p>
      </div>

      <form onSubmit={submit} className="card space-y-5">
        {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold mb-2">Resume A (PDF)</label>
            <input type="file" accept="application/pdf" onChange={(e) => setFileA(e.target.files[0])} className={fileInput} />
          </div>
          <div>
            <label className="block font-semibold mb-2">Resume B (PDF)</label>
            <input type="file" accept="application/pdf" onChange={(e) => setFileB(e.target.files[0])} className={fileInput} />
          </div>
        </div>
        <div>
          <label className="block font-semibold mb-2">Job description</label>
          <textarea className="input h-44" required minLength={50}
            placeholder="Paste the full job description here..."
            value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} />
        </div>
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? "Comparing... ⏳" : "Compare resumes ⚖️"}
        </button>
      </form>

      {result && (
        <>
          <div className="grid sm:grid-cols-2 gap-6">
            <MiniScore title="Resume A" fileName={result.resumeA.fileName} result={result.resumeA} winner={delta < 0} />
            <MiniScore title="Resume B" fileName={result.resumeB.fileName} result={result.resumeB} winner={delta > 0} />
          </div>

          <div className="card">
            <h2 className="font-bold mb-3">
              {delta === 0 ? "Both resumes score the same" : `Resume ${delta > 0 ? "B" : "A"} scores ${Math.abs(delta)} point(s) higher`}
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-semibold text-green-700 mb-2">Only Resume B matches</p>
                <div className="flex flex-wrap gap-2">
                  {result.diff.newlyMatchedKeywords.length === 0 && <span className="text-sm text-slate-400">none</span>}
                  {result.diff.newlyMatchedKeywords.map((k) => <span key={k} className="px-3 py-1 rounded-full bg-green-50 text-green-700 text-sm">{k}</span>)}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-indigo-700 mb-2">Only Resume A matches</p>
                <div className="flex flex-wrap gap-2">
                  {result.diff.newlyLostKeywords.length === 0 && <span className="text-sm text-slate-400">none</span>}
                  {result.diff.newlyLostKeywords.map((k) => <span key={k} className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-sm">{k}</span>)}
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="font-bold mb-3">Text differences (A → B)</h2>
            {changed.length === 0 ? (
              <p className="text-sm text-slate-500">The two resumes have identical text.</p>
            ) : (
              <div className="text-sm space-y-1 max-h-96 overflow-y-auto">
                {changed.map((l, i) => (
                  <div key={i} className={`px-3 py-1.5 rounded-lg ${l.type === "added" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
                    <span className="font-bold mr-2">{l.type === "added" ? "+ B only" : "− A only"}</span>{l.text}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
