import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="text-xl font-extrabold text-indigo-600">
          ⚡ ResumeForge <span className="text-slate-800">AI</span>
        </Link>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link to="/analyze" className="text-sm font-semibold hover:text-indigo-600">
                New Analysis
              </Link>
              <Link to="/" className="text-sm font-semibold hover:text-indigo-600">
                Dashboard
              </Link>
              <span className="hidden sm:inline text-sm text-slate-500">Hi, {user.name}</span>
              <button
                className="btn-ghost text-sm !py-1.5"
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost text-sm !py-1.5">Login</Link>
              <Link to="/register" className="btn-primary text-sm !py-1.5">Sign up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
