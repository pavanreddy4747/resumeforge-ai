import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api";

export default function Analyze() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [file, setFile] = useState(null);
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [previousAnalysis, setPreviousAnalysis] = useState(params.get("previous") || "");
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Past scans for the "new version of..." dropdown
  useEffect(() => {
    api.get("/analysis").then((r) => setHistory(r.data)).catch(() => {});
  }, []);

  // When re-scanning an earlier analysis, pre-fill its job title and description
  useEffect(() => {
    if (!previousAnalysis) return;
    api
      .get(`/analysis/${previousAnalysis}`)
      .then((r) => {
        setJobTitle((t) => t || r.data.jobTitle || "");
        setJobDescription((d) => d || r.data.jobDescription || "");
      })
      .catch(() => {});
  }, [previousAnalysis]);

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return setError("Please choose a PDF resume");
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("resume", file);
      fd.append("jobTitle", jobTitle);
      fd.append("jobDescription", jobDescription);
      if (previousAnalysis) fd.append("previousAnalysis", previousAnalysis);
      const { data } = await api.post("/analysis", fd);
      navigate(`/result/${data._id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Analysis failed. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-2">Analyze your resume</h1>
      <p className="text-slate-500 mb-6">
        Upload your resume and paste the job description. Get your ATS score in seconds.
      </p>
      <form onSubmit={submit} className="card space-y-5">
        {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}

        {history.length > 0 && (
          <div>
            <label className="block font-semibold mb-2">
              Is this an improved version of an earlier scan? <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <select className="input" value={previousAnalysis} onChange={(e) => setPreviousAnalysis(e.target.value)}>
              <option value="">No, this is a new resume / new job</option>
              {history.map((h) => (
                <option key={h._id} value={h._id}>
                  {h.jobTitle} — v{h.versionNumber || 1} — {h.score}/100 — {new Date(h.createdAt).toLocaleDateString()}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              Linking it lets you see exactly what changed and whether your score improved because of it.
            </p>
          </div>
        )}

        <div>
          <label className="block font-semibold mb-2">1. Job title (optional)</label>
          <input className="input" placeholder="e.g. Full Stack Developer Intern"
            value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
        </div>

        <div>
          <label className="block font-semibold mb-2">2. Upload resume (PDF, max 3MB)</label>
          <input type="file" accept="application/pdf"
            onChange={(e) => setFile(e.target.files[0])}
            className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 file:font-semibold hover:file:bg-indigo-100" />
          {file && <p className="text-sm text-slate-500 mt-1">Selected: {file.name}</p>}
        </div>

        <div>
          <label className="block font-semibold mb-2">3. Paste job description</label>
          <textarea className="input h-56" required minLength={50}
            placeholder="Paste the full job description here..."
            value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} />
        </div>

        <button className="btn-primary w-full text-lg" disabled={busy}>
          {busy ? "Analyzing... this can take up to a minute the first time ⏳" : "Analyze my resume ⚡"}
        </button>
      </form>
    </div>
  );
}
