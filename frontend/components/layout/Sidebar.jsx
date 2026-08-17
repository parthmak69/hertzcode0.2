"use client";
"use strict";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const DatabaseIcon = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: active ? "#ffffff" : "rgba(255,255,255,0.7)" }}>
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
  </svg>
);

const CrudIcon = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: active ? "#ffffff" : "rgba(255,255,255,0.7)" }}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const TrashIcon = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: active ? "#ffffff" : "rgba(255,255,255,0.7)" }}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const AdminIcon = ({ active }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: active ? "#ffffff" : "rgba(255,255,255,0.7)" }}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export default function Sidebar({ sidebarOpen, currentUserRole }) {
  const pathname = usePathname();

  const isDbActive = pathname === "/dashboard" || pathname.startsWith("/dashboard/db");
  const isCrudActive = pathname.startsWith("/dashboard/crud") && !pathname.includes("/recycle-bin") && !pathname.includes("/admin");
  const isRecycleActive = pathname === "/dashboard/recycle-bin";
  const isAdminActive = pathname.startsWith("/dashboard/admin");

  return (
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
          className={`sidebar-link ${isDbActive ? "active" : ""}`}
        >
          <DatabaseIcon active={isDbActive} /> Database Builder
        </Link>
        
        <Link
          href="/dashboard/crud"
          className={`sidebar-link ${isCrudActive ? "active" : ""}`}
        >
          <CrudIcon active={isCrudActive} /> CRUD Builder
        </Link>
        


        {currentUserRole === "admin" && (
          <Link
            href="/dashboard/admin"
            className={`sidebar-link ${isAdminActive ? "active" : ""}`}
          >
            <AdminIcon active={isAdminActive} /> Admin Panel
          </Link>
        )}
      </nav>
    </aside>
  );
}
