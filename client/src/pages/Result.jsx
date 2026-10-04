import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from "recharts";
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

export default function Result() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/analysis/${id}`)
      .then((r) => setData(r.data))
      .catch(() => setError("Could not load this analysis"));
  }, [id]);

  if (error) return <div className="card text-red-600">{error}</div>;
  if (!data) return <div className="p-10 text-center">Loading...</div>;

  const label = data.score >= 75 ? "Excellent match 🎉" : data.score >= 50 ? "Decent, needs work 🔧" : "Needs major improvement ⚠️";
  const radar = [
    { metric: "Keywords", value: data.breakdown.keywordScore },
    { metric: "Sections", value: data.breakdown.sectionScore },
    { metric: "Formatting", value: data.breakdown.formatScore },
  ];
  const ai = data.aiFeedback || {};
  const sectionLabels = {
    hasSummary: "Summary", hasSkills: "Skills", hasExperience: "Experience",
    hasEducation: "Education", hasProjects: "Projects", hasContact: "Contact info",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">{data.jobTitle}</h1>
          <p className="text-slate-500 text-sm">{data.fileName}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="btn-ghost">Download report (PDF)</button>
          <Link to="/analyze" className="btn-primary">Analyze another</Link>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="card text-center">
          <ScoreRing score={data.score} />
          <p className="font-bold mt-3">{label}</p>
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
        </div>
      </div>

      {ai.summary && (
        <div className="card">
          <h2 className="font-bold mb-2">🤖 AI assessment</h2>
          <p className="text-slate-700">{ai.summary}</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-bold mb-3 text-green-700">✅ Matched keywords ({data.matchedKeywords.length})</h2>
          <div className="flex flex-wrap gap-2">
            {data.matchedKeywords.map((k) => (
              <span key={k} className="px-3 py-1 rounded-full bg-green-50 text-green-700 text-sm">{k}</span>
            ))}
          </div>
        </div>
        <div className="card">
          <h2 className="font-bold mb-3 text-red-700">❌ Missing keywords ({data.missingKeywords.length})</h2>
          <div className="flex flex-wrap gap-2">
            {data.missingKeywords.map((k) => (
              <span key={k} className="px-3 py-1 rounded-full bg-red-50 text-red-700 text-sm">{k}</span>
            ))}
          </div>
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
          <h2 className="font-bold mb-3">✍️ AI-rewritten bullet points</h2>
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
    </div>
  );
}
