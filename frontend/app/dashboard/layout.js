"use client";
"use strict";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import axios from "axios";
import Link from "next/link";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../../components/layout/Sidebar";
export default function DashboardLayout({ children }) {
  const { showToast } = useToast();
  const { currentUser, currentUserRole, currentUserName, authorized, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [logoSrc, setLogoSrc] = useState("/logo.png");
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const userNameLetter = currentUserName ? (currentUserName.trim().charAt(0) || "A") : "A";

  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async function (url, options = {}) {
      const user = localStorage.getItem("currentUser") || "";
      if (user && typeof url === "string" && url.includes("/api/")) {
        options.headers = {
          ...options.headers,
          "x-user-username": user,
        };
      }
      return originalFetch(url, options);
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  useEffect(() => {
    if (authorized && currentUserRole !== "admin") {
      if (pathname === "/dashboard/recycle-bin" || pathname.startsWith("/dashboard/admin")) {
        showToast("Access denied. Only administrators can access this page.", "error");
        router.push("/dashboard");
      }
    }
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    setIsDark(savedTheme === "dark");
  }, [authorized, currentUserRole, pathname, router, showToast]);

  // Global projects database sync on mount
  useEffect(() => {
    if (authorized && currentUser) {
      axios.get(`/api/crud/projects?user=${currentUser}&role=${currentUserRole}`)
        .then(response => {
          const data = response.data;
          if (data.success && Array.isArray(data.projects)) {
            const userKey = currentUserRole === 'admin' ? 'admin' : currentUser;
            localStorage.setItem(`crudProjects_${userKey}`, JSON.stringify(data.projects));
            // Trigger state reload event in active page views
            window.dispatchEvent(new Event('projects_synced'));
          }
        })
        .catch(err => console.error("Database projects sync failed:", err));
    }
  }, [authorized, currentUser, currentUserRole]);
  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    document.documentElement.setAttribute("data-theme", nextDark ? "dark" : "light");
    localStorage.setItem("theme", nextDark ? "dark" : "light");
  };
  useEffect(() => {
    const img = new window.Image();
    img.src = "/logo.png";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          if (r > 240 && g > 240 && b > 240) {
            data[i + 3] = 0;
          }
        }
        ctx.putImageData(imgData, 0, 0);
        setLogoSrc(canvas.toDataURL());
      }
    };
  }, []);
  const isDbActive = pathname === "/dashboard" || pathname.startsWith("/dashboard/db");
  const isCrudActive = pathname.startsWith("/dashboard/crud");
  const isRecycleActive = pathname === "/dashboard/recycle-bin";
  const isAdminActive = pathname.startsWith("/dashboard/admin");
  const isPortal = pathname?.includes("/admin-portal");
  if (!authorized) {
    return <div style={{ display: "flex", height: "100vh", width: "100vw", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", backgroundColor: "#fafbfd", color: "#0f172a" }}>
      Loading Dashboard...
    </div>;
  }
  if (isPortal) {
    return <>{children}</>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", width: "100vw", overflow: "hidden", fontFamily: "'Outfit', 'Inter', sans-serif", backgroundColor: "var(--bg-primary)" }}>
      
      {
    /* ==================== CLEAN TOP HEADER PANEL ==================== */
  }
      <header style={{
    height: "75px",
    backgroundColor: "var(--bg-secondary)",
    borderBottom: "1.5px solid var(--border-color)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 24px",
    flexShrink: 0,
    zIndex: 100,
    boxShadow: "0 4px 20px rgba(14, 165, 233, 0.08)"
  }}>
        {
    /* Toggle Button & Logo */
  }
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          {
    /* Hamburger 3-line Menu Button */
  }
          <button
    onClick={() => setSidebarOpen(!sidebarOpen)}
    style={{
      background: "none",
      border: "none",
      cursor: "pointer",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      width: "22px",
      height: "16px",
      padding: 0,
      outline: "none",
      color: "var(--text-primary)"
    }}
    title="Toggle Menu"
  >
            <span style={{ width: "100%", height: "2.5px", backgroundColor: "currentColor", borderRadius: "2px", transition: "all 0.2s", transform: sidebarOpen ? "rotate(45deg) translate(5px, 5px)" : "none" }} />
            <span style={{ width: "100%", height: "2.5px", backgroundColor: "currentColor", borderRadius: "2px", transition: "all 0.2s", opacity: sidebarOpen ? 0 : 1 }} />
            <span style={{ width: "100%", height: "2.5px", backgroundColor: "currentColor", borderRadius: "2px", transition: "all 0.2s", transform: sidebarOpen ? "rotate(-45deg) translate(5px, -5px)" : "none" }} />
          </button>

          {
    /* Logo */
  }
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <img src={logoSrc} alt="Hertzcoder Logo" style={{ height: "44px", objectFit: "contain" }} />
          </div>
        </div>

        {
    /* Right side controls */
  }
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          {
    /* Theme Toggle Button */
  }
          <div style={{ display: "flex", alignItems: "center", cursor: "pointer" }} onClick={toggleTheme}>
            {isDark ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "6px", color: "#f59e0b" }}>
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg> : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "6px", color: "#0284c7" }}>
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>}
            <div style={{ width: "36px", height: "20px", borderRadius: "10px", position: "relative", backgroundColor: isDark ? "#0ea5e9" : "#bae6fd" }}>
              <div style={{ width: "16px", height: "16px", borderRadius: "50%", backgroundColor: "white", position: "absolute", top: "2px", left: isDark ? "18px" : "2px", transition: "left 0.2s" }} />
            </div>
          </div>

          {/* Recycle Bin (Admin Only) */}
          {currentUserRole === "admin" && (
            <button
              onClick={() => router.push("/dashboard/recycle-bin")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "8px",
                borderRadius: "50%",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: pathname === "/dashboard/recycle-bin" ? "#ef4444" : "var(--text-muted)",
                backgroundColor: pathname === "/dashboard/recycle-bin" ? "rgba(239, 68, 68, 0.08)" : "transparent",
                transition: "all 0.2s ease",
                outline: "none"
              }}
              onMouseOver={(e) => {
                if (pathname !== "/dashboard/recycle-bin") {
                  e.currentTarget.style.backgroundColor = "rgba(14, 165, 233, 0.08)";
                  e.currentTarget.style.color = "var(--primary)";
                }
              }}
              onMouseOut={(e) => {
                if (pathname !== "/dashboard/recycle-bin") {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "var(--text-muted)";
                }
              }}
              title="Recycle Bin"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          )}

          {
    /* User profile with dropdown */
  }
          <div style={{ position: "relative" }}>
            <div
    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
    style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "#0ea5e9", backgroundImage: "linear-gradient(135deg, #38bdf8, #0284c7)", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff", fontWeight: "bold", fontSize: "15px", cursor: "pointer", textTransform: "uppercase" }}
  >
              {userNameLetter}
            </div>
            
            {userDropdownOpen && <div style={{
    position: "absolute",
    top: "46px",
    right: 0,
    backgroundColor: "var(--bg-secondary)",
    border: "1px solid var(--border-color)",
    borderRadius: "8px",
    boxShadow: "var(--shadow-lg)",
    padding: "8px 0",
    minWidth: "150px",
    zIndex: 200
  }}>
                <button
    onClick={signOut}
    style={{
      width: "100%",
      background: "none",
      border: "none",
      textAlign: "left",
      padding: "10px 16px",
      fontSize: "14px",
      color: "#ef4444",
      cursor: "pointer",
      fontWeight: "600",
      display: "flex",
      alignItems: "center",
      gap: "10px",
      outline: "none"
    }}
  >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Sign Out
                </button>
              </div>}
          </div>
        </div>
      </header>

      {
    /* ==================== MAIN WORKSPACE ==================== */
  }
      <div style={{ display: "flex", flex: 1, overflow: "hidden", width: "100%", height: "calc(100vh - 75px)" }}>
        
        <Sidebar sidebarOpen={sidebarOpen} currentUserRole={currentUserRole} />

        {
    /* ==================== CONTENT INNER PORTAL ==================== */
  }
        <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
