import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import api from "../api";

function ScoreRing({ score }) {
  const color = score >= 75 ? "#16a34a" : score >= 50 ? "#f59e0b" : "#dc2626";
  const r = 60;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative w-40 h-40 mx-auto">
      <svg viewBox="0 0 150 150" className="w-full h-full -rotate-90">
        <circle cx="75" cy="75" r={r} stroke="#e2e8f0" strokeWidth="12" fill="none" />
        <circle cx="75" cy="75" r={r} stroke={color} strokeWidth="12" fill="none"
          strokeLinecap="round" strokeDasharray={c}
          strokeDashoffset={c - (score / 100) * c} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-extrabold" style={{ color }}>{score}</span>
        <span className="text-xs text-slate-500">out of 100</span>
      </div>
    </div>
  );
}

// Shows only what changed between two versions, hides the unchanged lines behind a count.
function TextDiff({ lines }) {
  const changed = lines.filter((l) => l.type !== "same");
  const same = lines.length - changed.length;
  if (changed.length === 0) return <p className="text-sm text-slate-500">No text changes detected.</p>;
  return (
    <div className="text-sm space-y-1">
      {changed.map((l, i) => (
        <div key={i}
          className={`px-3 py-1.5 rounded-lg ${l.type === "added" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800 line-through decoration-red-300"}`}>
          <span className="font-bold mr-2">{l.type === "added" ? "+" : "−"}</span>{l.text}
        </div>
      ))}
      <p className="text-xs text-slate-400 pt-1">{same} unchanged line(s) hidden</p>
    </div>
  );
}

export default function Result() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [diff, setDiff] = useState(null);
  const [openKeyword, setOpenKeyword] = useState(null);

  useEffect(() => {
    setData(null); setHistory([]); setDiff(null); setOpenKeyword(null); setError("");
    api.get(`/analysis/${id}`)
      .then((r) => {
        setData(r.data);
        api.get(`/analysis/${id}/history`).then((h) => setHistory(h.data)).catch(() => {});
        if (r.data.previousAnalysis) {
          api.get(`/analysis/${id}/diff`).then((d) => setDiff(d.data)).catch(() => {});
        }
      })
      .catch(() => setError("Could not load this analysis"));
  }, [id]);

  if (error) return <div className="card text-red-600">{error}</div>;
  if (!data) return <div className="p-10 text-center">Loading...</div>;

  const label = data.score >= 75 ? "Strong match 🎉" : data.score >= 50 ? "Decent, needs work 🔧" : "Needs major improvement ⚠️";
  const radar = [
    { metric: "Keywords", value: data.breakdown.keywordScore },
    { metric: "Sections", value: data.breakdown.sectionScore },
    { metric: "Formatting", value: data.breakdown.formatScore },
  ];
  const ai = data.aiFeedback || {};
  const aiWorked = ai.source === "gemini";
  const sectionLabels = {
    hasSummary: "Summary", hasSkills: "Skills", hasExperience: "Experience",
    hasEducation: "Education", hasProjects: "Projects", hasContact: "Contact info",
  };
  const evidenceMap = {};
  (Array.isArray(data.evidence) ? data.evidence : []).forEach((e) => { evidenceMap[e.keyword] = e.hits || []; });
  const stuffing = data.stuffing;
  const conf = data.confidence;
  const chartData = history.map((h) => ({ name: `v${h.versionNumber || 1}`, score: h.score }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">
            {data.jobTitle}
            {data.versionNumber > 1 && (
              <span className="ml-3 align-middle text-sm px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">
                version {data.versionNumber}
              </span>
            )}
          </h1>
          <p className="text-slate-500 text-sm">{data.fileName}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => window.print()} className="btn-ghost">Download report (PDF)</button>
          <Link to={`/analyze?previous=${data._id}`} className="btn-ghost">Improve &amp; re-scan</Link>
          <Link to="/analyze" className="btn-primary">Analyze another</Link>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="card text-center">
          <ScoreRing score={data.score} />
          <p className="font-bold mt-3">{label}</p>
          {conf && (
            <div className="mt-3 text-sm">
              <p className="font-semibold text-slate-700">
                Likely range: {conf.low}{conf.high !== conf.low ? `–${conf.high}` : ""}
              </p>
              <p className="text-xs text-slate-500 mt-1">{conf.note}</p>
            </div>
          )}
        </div>
        <div className="card md:col-span-2">
          <h2 className="font-bold mb-2">Score breakdown</h2>
          <div className="h-52">
            <ResponsiveContainer>
              <RadarChart data={radar}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" />
                <Radar dataKey="value" stroke="#4f46e5" fill="#6366f1" fillOpacity={0.5} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-slate-500">
            Score = keywords 60% + sections 20% + formatting 20%. Keywords {data.breakdown.keywordScore}, sections {data.breakdown.sectionScore}, formatting {data.breakdown.formatScore}.
          </p>
        </div>
      </div>

      {/* Honest AI status: never show fallback tips as if the AI wrote them */}
      {aiWorked ? (
        ai.summary && (
          <div className="card">
            <h2 className="font-bold mb-2">🤖 AI assessment</h2>
            <p className="text-slate-700">{ai.summary}</p>
          </div>
        )
      ) : (
        <div className="card bg-amber-50 border-amber-200">
          <h2 className="font-bold mb-1 text-amber-800">⚠️ AI feedback unavailable for this scan</h2>
          <p className="text-sm text-amber-800">
            The AI service did not respond, so you are seeing basic rule-based tips below instead. Your score above is not affected, because it is calculated by our own scoring engine.
          </p>
          {ai.fallbackReason && (
            <details className="mt-2 text-xs text-amber-700">
              <summary className="cursor-pointer">Technical detail</summary>
              <p className="mt-1 break-words">{ai.fallbackReason}</p>
            </details>
          )}
        </div>
      )}

      {/* Overfitting / keyword stuffing detector */}
      {stuffing && (
        <div className={`card ${stuffing.flags?.length || stuffing.densityWarning ? "border-amber-300 bg-amber-50" : ""}`}>
          <h2 className="font-bold mb-2">🧪 Readability check (keyword stuffing)</h2>
          {stuffing.flags?.length || stuffing.densityWarning ? (
            <>
              <p className="text-sm text-amber-800 mb-3">
                A high ATS score can still read badly to a human recruiter. {stuffing.densityWarning
                  ? `${stuffing.keywordDensity}% of your words are matched keywords, which is unusually dense. `
                  : ""}
                Consider using these terms inside real sentences about what you built.
              </p>
              <ul className="space-y-2 text-sm">
                {stuffing.flags.map((f, i) => (
                  <li key={i} className="p-3 rounded-xl bg-white border border-amber-200">{f.reason}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-green-700">
              ✅ No keyword stuffing detected. Keyword density is {stuffing.keywordDensity}% and your keywords appear in natural sentences.
            </p>
          )}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-bold mb-1 text-green-700">✅ Matched keywords ({data.matchedKeywords.length})</h2>
          <p className="text-xs text-slate-500 mb-3">Click a keyword to see where in your resume we found it.</p>
          <div className="flex flex-wrap gap-2">
            {data.matchedKeywords.map((k) => (
              <button key={k} type="button" onClick={() => setOpenKeyword(openKeyword === k ? null : k)}
                className={`px-3 py-1 rounded-full text-sm border ${openKeyword === k ? "bg-green-600 text-white border-green-600" : "bg-green-50 text-green-700 border-green-100 hover:bg-green-100"}`}>
                {k}
              </button>
            ))}
          </div>
          {openKeyword && (
            <div className="mt-4 p-3 rounded-xl bg-slate-50 text-sm">
              <p className="font-semibold mb-2">“{openKeyword}” found in:</p>
              {(evidenceMap[openKeyword] || []).length === 0 ? (
                <p className="text-slate-500">No line details stored for this scan.</p>
              ) : (
                <ul className="space-y-1">
                  {evidenceMap[openKeyword].map((h, i) => (
                    <li key={i} className="text-slate-700"><span className="text-slate-400 mr-2">line {h.lineNumber}</span>{h.snippet}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        <div className="card">
          <h2 className="font-bold mb-3 text-red-700">❌ Missing keywords ({data.missingKeywords.length})</h2>
          <div className="flex flex-wrap gap-2">
            {data.missingKeywords.map((k) => (
              <span key={k} className="px-3 py-1 rounded-full bg-red-50 text-red-700 text-sm">{k}</span>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-3">Only add a missing keyword if it is true for you and you can show it in a real project or role.</p>
        </div>
      </div>

      <div className="card">
        <h2 className="font-bold mb-3">📋 Section check</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Object.entries(data.sections).map(([key, ok]) => (
            <div key={key} className={`p-3 rounded-xl text-sm font-semibold ${ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {ok ? "✔" : "✘"} {sectionLabels[key]}
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {ai.strengths?.length > 0 && (
          <div className="card">
            <h2 className="font-bold mb-3">💪 Strengths</h2>
            <ul className="list-disc pl-5 space-y-1">{ai.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
          </div>
        )}
        {ai.improvements?.length > 0 && (
          <div className="card">
            <h2 className="font-bold mb-3">🔧 Improvements</h2>
            <ul className="list-disc pl-5 space-y-1">{ai.improvements.map((s, i) => <li key={i}>{s}</li>)}</ul>
          </div>
        )}
      </div>

      {ai.rewrittenBullets?.length > 0 && (
        <div className="card">
          <h2 className="font-bold mb-1">✍️ AI-rewritten bullet points</h2>
          <p className="text-xs text-slate-500 mb-3">Check every number is true for you before using these.</p>
          <ul className="space-y-3">
            {ai.rewrittenBullets.map((b, i) => (
              <li key={i} className="p-3 bg-indigo-50 rounded-xl text-slate-800">{b}</li>
            ))}
          </ul>
        </div>
      )}

      {ai.skillGapAdvice?.length > 0 && (
        <div className="card">
          <h2 className="font-bold mb-3">🎯 Skill gap advice</h2>
          <ul className="list-disc pl-5 space-y-1">{ai.skillGapAdvice.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>
      )}

      {/* Version history + what changed */}
      {history.length > 1 && (
        <div className="card">
          <h2 className="font-bold mb-3">📈 Version history</h2>
          <div className="h-52">
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="#4f46e5" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {history.map((h) => (
              <Link key={h._id} to={`/result/${h._id}`}
                className={`px-3 py-1 rounded-full text-sm border ${h._id === data._id ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"}`}>
                v{h.versionNumber || 1} · {h.score}
              </Link>
            ))}
          </div>
        </div>
      )}

      {diff && (
        <div className="card">
          <h2 className="font-bold mb-1">🔍 What changed since version {diff.previous.versionNumber}</h2>
          <p className="text-sm mb-4">
            Score {diff.previous.score} → {diff.current.score}{" "}
            <span className={`font-bold ${diff.diff.scoreDelta >= 0 ? "text-green-600" : "text-red-600"}`}>
              ({diff.diff.scoreDelta >= 0 ? "+" : ""}{diff.diff.scoreDelta})
            </span>
          </p>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm font-semibold text-green-700 mb-2">Keywords gained</p>
              <div className="flex flex-wrap gap-2">
                {diff.diff.newlyMatchedKeywords.length === 0 && <span className="text-sm text-slate-400">none</span>}
                {diff.diff.newlyMatchedKeywords.map((k) => <span key={k} className="px-3 py-1 rounded-full bg-green-50 text-green-700 text-sm">{k}</span>)}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-red-700 mb-2">Keywords lost</p>
              <div className="flex flex-wrap gap-2">
                {diff.diff.newlyLostKeywords.length === 0 && <span className="text-sm text-slate-400">none</span>}
                {diff.diff.newlyLostKeywords.map((k) => <span key={k} className="px-3 py-1 rounded-full bg-red-50 text-red-700 text-sm">{k}</span>)}
              </div>
            </div>
          </div>
          <p className="text-sm font-semibold mb-2">Resume text changes</p>
          <TextDiff lines={diff.diff.textDiff} />
        </div>
      )}
    </div>
  );
}
