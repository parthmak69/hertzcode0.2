"use strict";
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useToast } from "../../../../../context/ToastContext";

export default function PortalLoginPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const params = useParams();
  const projectId = params?.projectId;

  const [project, setProject] = useState(null);
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    let foundProj = null;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith("crudProjects_") || key === "crudProjects")) {
        try {
          const list = JSON.parse(localStorage.getItem(key)) || [];
          const found = list.find((p) => p.id === projectId);
          if (found) {
            foundProj = found;
            break;
          }
        } catch (e) {
          console.error("Failed to parse " + key, e);
        }
      }
    }
    if (foundProj) {
      setProject(foundProj);
    }
  }, [projectId]);

  const handleLogin = (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    setTimeout(() => {
      if (username === "admin" && password === "admin123") {
        sessionStorage.setItem(`portal_logged_in_${projectId}`, "true");
        showToast("Admin Portal: Logged in successfully!", "success");
        router.push(`/dashboard/crud/${projectId}/admin-portal/dashboard`);
      } else {
        setError("Invalid username or password. Use default credentials: admin / admin123");
        showToast("Invalid credentials!", "error");
        setLoading(false);
      }
    }, 600);
  };

  if (!project) {
    return <div className="p-10 text-slate-500 text-center font-bold">Loading Branded Portal...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6" style={{ backgroundColor: '#f8fafc' }}>
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
          {/* Top Accent Bar */}
          <div className="h-1.5 w-full bg-blue-600" />

          <div className="p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-blue-50 flex items-center justify-center">
                <span className="text-2xl font-extrabold text-blue-600">
                  {project.name ? project.name.slice(0, 2).toUpperCase() : 'N'}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900">
                {project.name} Admin Panel
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Sign in to access the dashboard
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Error */}
              {error && (
                <div className="px-4 py-3 rounded-lg text-sm bg-red-50 border border-red-200 text-red-600 text-center">
                  {error}
                </div>
              )}

              {/* Username */}
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-900">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition"
                  placeholder="admin"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-900">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
                  >
                    <span className="text-xs font-bold">{showPassword ? 'HIDE' : 'SHOW'}</span>
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-600"
                />
                <span className="text-sm text-slate-700">Remember me</span>
              </label>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-semibold bg-blue-600 text-white cursor-pointer hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          Premium Admin Panel · Internal Preview
        </p>
      </div>
    </div>
  );
}
