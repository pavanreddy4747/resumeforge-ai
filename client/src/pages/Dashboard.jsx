import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import api from "../api";

export default function Dashboard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () =>
    api.get("/analysis").then((r) => setItems(r.data)).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    if (!confirm("Delete this analysis?")) return;
    await api.delete(`/analysis/${id}`);
    load();
  };

  if (loading) return <div className="p-10 text-center">Loading...</div>;

  const chartData = [...items].reverse().map((a, i) => ({
    name: `#${i + 1}`, score: a.score,
  }));
  const avg = items.length ? Math.round(items.reduce((s, a) => s + a.score, 0) / items.length) : 0;
  const best = items.length ? Math.max(...items.map((a) => a.score)) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-extrabold">Your dashboard</h1>
        <Link to="/analyze" className="btn-primary">+ New analysis</Link>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card text-center"><p className="text-slate-500 text-sm">Analyses done</p><p className="text-3xl font-extrabold">{items.length}</p></div>
        <div className="card text-center"><p className="text-slate-500 text-sm">Average score</p><p className="text-3xl font-extrabold">{avg}</p></div>
        <div className="card text-center"><p className="text-slate-500 text-sm">Best score</p><p className="text-3xl font-extrabold text-green-600">{best}</p></div>
      </div>

      {items.length > 1 && (
        <div className="card">
          <h2 className="font-bold mb-3">📈 Score improvement over time</h2>
          <div className="h-64">
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
        </div>
      )}

      <div className="card">
        <h2 className="font-bold mb-3">History</h2>
        {items.length === 0 ? (
          <p className="text-slate-500">No analyses yet. Click "New analysis" to start.</p>
        ) : (
          <div className="divide-y">
            {items.map((a) => (
              <div key={a._id} className="py-3 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-semibold">{a.jobTitle}</p>
                  <p className="text-sm text-slate-500">
                    {a.fileName} · {new Date(a.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${a.score >= 75 ? "bg-green-100 text-green-700" : a.score >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                    {a.score}/100
                  </span>
                  <Link to={`/result/${a._id}`} className="btn-ghost !py-1.5 text-sm">View</Link>
                  <button onClick={() => remove(a._id)} className="text-red-600 text-sm font-semibold">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
