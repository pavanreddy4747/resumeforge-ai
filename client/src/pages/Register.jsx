import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await register(form.name, form.email, form.password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 card">
      <h1 className="text-2xl font-bold mb-1">Create your account 🚀</h1>
      <p className="text-slate-500 mb-6">Start beating the ATS in seconds</p>
      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>}
      <form onSubmit={submit} className="space-y-4">
        <input className="input" placeholder="Full name" required
          value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="input" type="email" placeholder="Email" required
          value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="input" type="password" placeholder="Password (min 6 chars)" required
          value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? "Creating..." : "Sign up"}
        </button>
      </form>
      <p className="text-sm text-center mt-4 text-slate-500">
        Already have an account? <Link to="/login" className="text-indigo-600 font-semibold">Login</Link>
      </p>
    </div>
  );
}
