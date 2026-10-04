import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Analyze from "./pages/Analyze";
import Result from "./pages/Result";

export default function App() {
  return (
    <>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/analyze" element={<ProtectedRoute><Analyze /></ProtectedRoute>} />
          <Route path="/result/:id" element={<ProtectedRoute><Result /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </>
  );
}
