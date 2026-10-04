import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(form.email, form.password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 card">
      <h1 className="text-2xl font-bold mb-1">Welcome back 👋</h1>
      <p className="text-slate-500 mb-6">Login to analyze your resume</p>
      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}
      <form onSubmit={submit} className="space-y-4">
        <input className="input" type="email" placeholder="Email" required
          value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="input" type="password" placeholder="Password" required
          value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? "Logging in..." : "Login"}
        </button>
      </form>
      <p className="text-sm text-center mt-4 text-slate-500">
        New here? <Link to="/register" className="text-indigo-600 font-semibold">Create account</Link>
      </p>
    </div>
  );
}
