"use strict";
"use client";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "../context/ToastContext";
const DatabaseIcon = ({ active }) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: active ? "#ffffff" : "rgba(255,255,255,0.7)" }}>
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
  </svg>;
const CrudIcon = ({ active }) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: active ? "#ffffff" : "rgba(255,255,255,0.7)" }}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>;
export default function DashboardLayout({ children }) {
  const { showToast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [logoSrc, setLogoSrc] = useState("/logo.png");
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [userNameLetter, setUserNameLetter] = useState("A");
  const [authorized, setAuthorized] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const handleSignOut = () => {
    localStorage.removeItem("currentUser");
    showToast("Logged out successfully", "success");
    router.push("/");
  };
  useEffect(() => {
    const user = localStorage.getItem("currentUser");
    if (!user) {
      router.push("/");
    } else {
      setAuthorized(true);
    }
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    setIsDark(savedTheme === "dark");
    const storedName = localStorage.getItem("currentUserName");
    if (storedName) {
      setUserNameLetter(storedName.trim().charAt(0) || "A");
    }
  }, [router]);
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
    onClick={handleSignOut}
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
        
        {
    /* ==================== COLLAPSIBLE SIDEBAR ==================== */
  }
        <aside style={{
    width: sidebarOpen ? "260px" : "0px",
    opacity: sidebarOpen ? 1 : 0,
    background: "var(--sidebar-gradient)",
    display: "flex",
    flexDirection: "column",
    padding: sidebarOpen ? "24px 0 16px 0" : "24px 0 16px 0",
    flexShrink: 0,
    borderRight: sidebarOpen ? "1.5px solid var(--border-color)" : "none",
    boxShadow: sidebarOpen ? "2px 0 8px rgba(14, 165, 233, 0.04)" : "none",
    position: "relative",
    height: "100%",
    overflowX: "hidden",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
  }}>
          <nav style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "0 16px", width: "228px" }}>
            <Link
    href="/dashboard"
    style={{
      display: "flex",
      alignItems: "center",
      gap: "12px",
      padding: "14px 18px",
      border: "none",
      borderRadius: "8px",
      width: "100%",
      textDecoration: "none",
      cursor: "pointer",
      fontSize: "14px",
      background: isDbActive ? "rgba(255, 255, 255, 0.18)" : "transparent",
      color: "#ffffff",
      fontWeight: isDbActive ? "700" : "500",
      fontFamily: "'Segoe UI', sans-serif",
      transition: "all 0.2s",
      boxShadow: isDbActive ? "0 4px 12px rgba(14, 165, 233, 0.2)" : "none"
    }}
  >
              <DatabaseIcon active={isDbActive} /> Database Builder
            </Link>
            
            <Link
    href="/dashboard/crud"
    style={{
      display: "flex",
      alignItems: "center",
      gap: "12px",
      padding: "14px 18px",
      border: "none",
      borderRadius: "8px",
      width: "100%",
      textDecoration: "none",
      cursor: "pointer",
      fontSize: "14px",
      background: isCrudActive ? "rgba(255, 255, 255, 0.18)" : "transparent",
      color: "#ffffff",
      fontWeight: isCrudActive ? "700" : "500",
      fontFamily: "'Segoe UI', sans-serif",
      transition: "all 0.2s",
      boxShadow: isCrudActive ? "0 4px 12px rgba(14, 165, 233, 0.2)" : "none"
    }}
  >
              <CrudIcon active={isCrudActive} /> CRUD Builder
            </Link>
          </nav>
        </aside>

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
