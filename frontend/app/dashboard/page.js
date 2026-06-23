"use strict";
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "../context/ToastContext";
const QUICK_TABLE_OPTIONS = [
  { id: "admin", name: "admin" },
  { id: "blog", name: "blog" },
  { id: "blog_category", name: "blog_category" },
  { id: "blog_comments", name: "blog_comments" },
  { id: "cart", name: "cart" },
  { id: "contents", name: "contents" },
  { id: "customer", name: "customer" },
  { id: "faq", name: "faq" },
  { id: "home_slider", name: "home_slider" },
  { id: "image_category", name: "image_category" },
  { id: "images", name: "images" },
  { id: "login_activity", name: "login_activity" },
  { id: "order_items", name: "order_items" },
  { id: "orders", name: "orders" },
  { id: "product", name: "product" },
  { id: "product_category", name: "product_category" },
  { id: "product_images", name: "product_images" },
  { id: "product_reviews", name: "product_reviews" },
  { id: "query_logger", name: "query_logger" },
  { id: "users", name: "users" },
  { id: "video_category", name: "video_category" },
  { id: "videos", name: "videos" },
  { id: "wishlist", name: "wishlist" }
];
const SyncIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
  </svg>;
const TrashIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>;
const DatabaseIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
  </svg>;
export default function DatabaseListPage() {
  const { showToast } = useToast();
  const [databases, setDatabases] = useState([]);
  const [dbSearchQuery, setDbSearchQuery] = useState("");
  const [currentUser, setCurrentUser] = useState("");
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const [newDbName, setNewDbName] = useState("");
  const [selectedQuickTables, setSelectedQuickTables] = useState(["admin", "login_activity", "query_logger"]);
  const [activeTab, setActiveTab] = useState("mysql");
  const router = useRouter();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [dbToDelete, setDbToDelete] = useState("");
  const [dbTypeStep, setDbTypeStep] = useState("select");
  const [isAiBuilderOpen, setIsAiBuilderOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("create table users with column name, email, password");
  const [aiGeneratedSql, setAiGeneratedSql] = useState("");
  const [aiGeneratedTableName, setAiGeneratedTableName] = useState("");
  const [aiGeneratedColumns, setAiGeneratedColumns] = useState([]);
  const handleGenerateSql = async () => {
    if (!aiPrompt.trim()) return;
    try {
      setAiGeneratedSql("Generating schema using Gemini AI...");
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ prompt: aiPrompt })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate query");
      }
      const sql = data.sql || "";
      setAiGeneratedSql(sql);
      const match = sql.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?/i);
      const tableName = match ? match[1] : "generated_table";
      setAiGeneratedTableName(tableName);
      const columnMatches = sql.matchAll(/^\s*`?(\w+)`?\s+\w+/gm);
      const columnsList = Array.from(columnMatches, (m) => m[1]).filter(
        (col) => !["create", "table", "primary", "key", "unique", "constraint", "foreign", "references"].includes(col.toLowerCase())
      );
      setAiGeneratedColumns(columnsList.length > 0 ? columnsList : ["id"]);
    } catch (err) {
      setAiGeneratedSql(`Error generating table structure: ${err.message}`);
    }
  };
  const handleExecuteSqlTable = () => {
    if (!aiGeneratedTableName) return;
    setIsAiBuilderOpen(false);
    setAiGeneratedSql("");
    setAiGeneratedTableName("");
    setAiGeneratedColumns([]);
  };
  const fetchDatabases = async (user) => {
    try {
      const res = await fetch(`/api/database/list?username=${encodeURIComponent(user)}`);
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("Non-JSON load db list:", text);
        return;
      }
      if (res.ok && data.success) {
        const localDbsRaw = localStorage.getItem("localDatabases") || "";
        const localDbs = localDbsRaw ? localDbsRaw.split(",").filter(Boolean) : [];
        const serverDbs = data.databases || [];
        const serverDbNames = serverDbs.map((db) => db.name);
        const merged = serverDbs.map((db) => ({
          id: db.name,
          name: db.name,
          tables: []
        }));
        for (const localDb of localDbs) {
          if (!serverDbNames.includes(localDb)) {
            merged.push({
              id: localDb,
              name: localDb,
              tables: []
            });
          }
        }
        setDatabases(merged);
      }
    } catch (err) {
      console.error("Failed to load databases:", err);
    }
  };
  useEffect(() => {
    const user = localStorage.getItem("currentUser") || localStorage.getItem("rememberedEmail") || "";
    setCurrentUser(user);
    if (user) {
      fetchDatabases(user);
    }
  }, []);
  const confirmDeleteDatabase = (dbId) => {
    setDbToDelete(dbId);
    setIsDeleteModalOpen(true);
  };
  const handleDeleteDatabase = async () => {
    if (!dbToDelete) return;
    try {
      const res = await fetch("/api/database/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dbName: dbToDelete, username: currentUser })
      });
      const responseText = await res.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (err) {
        console.error("Non-JSON response for database deletion:", responseText);
        showToast(`Server error (${res.status}): ${responseText.slice(0, 200) || "Empty response"}`, "error");
        return;
      }
      if (res.ok && data.success) {
        await fetchDatabases(currentUser);
        setIsDeleteModalOpen(false);
        showToast(`Database "${dbToDelete}" deleted successfully`, "success");
        setDbToDelete("");
      } else {
        showToast(data.error || "Failed to delete database", "error");
      }
    } catch (err) {
      console.error(err);
      showToast(err.message || "Failed to delete database", "error");
    }
  };
  const handleSaveDatabase = async (e) => {
    e.preventDefault();
    if (!newDbName.trim()) return;
    const formattedDbName = newDbName.trim().toLowerCase().replace(/\s+/g, "_");
    try {
      const res = await fetch("/api/database/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dbName: formattedDbName,
          tables: selectedQuickTables,
          username: currentUser,
          dbType: dbTypeStep === "sql" ? "sql" : "mongodb"
        })
      });
      const responseText = await res.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (err) {
        console.error("Non-JSON response for database creation:", responseText);
        showToast(`Server error (${res.status}): ${responseText.slice(0, 200) || "Empty response"}`, "error");
        return;
      }
      if (res.ok && data.success) {
        await fetchDatabases(currentUser);
        setIsDbModalOpen(false);
        setNewDbName("");
        showToast(`Database "${formattedDbName}" created successfully`, "success");
      } else {
        showToast(data.error || "Failed to create database", "error");
      }
    } catch (err) {
      console.error(err);
      showToast(err.message || "Failed to create database", "error");
    }
  };
  const toggleQuickTable = (tableId) => {
    if (selectedQuickTables.includes(tableId)) {
      setSelectedQuickTables(selectedQuickTables.filter((id) => id !== tableId));
    } else {
      setSelectedQuickTables([...selectedQuickTables, tableId]);
    }
  };
  const actBtnStyle = (hoverColor) => ({
    border: "none",
    background: "none",
    cursor: "pointer",
    padding: "6px",
    borderRadius: "4px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--text-muted)",
    transition: "all 0.15s ease",
    outline: "none"
  });
  return <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      
      {
    /* SUB NAV BAR BANNER */
  }
      <div style={{ height: "40px", backgroundColor: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", color: "white", fontSize: "13px", fontWeight: "600", flexShrink: 0, boxShadow: "0 2px 6px rgba(0,0,0,0.05)" }}>
        <span style={{ fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.8px" }}>Database Builder</span>
        <span style={{ color: "rgba(255,255,255,0.8)" }}>Database Builder</span>
      </div>

      <main style={{ flex: 1, padding: "24px", overflowY: "auto", backgroundColor: "var(--bg-primary)" }}>
        <div style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "24px", boxShadow: "var(--shadow-md)" }}>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "16px", marginBottom: "20px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "var(--text-primary)" }}>Databases:</h2>
            <button
    onClick={() => {
      setIsDbModalOpen(true);
      setDbTypeStep("select");
    }}
    style={{ backgroundColor: "#3b82f6", color: "white", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "bold", boxShadow: "0 4px 6px rgba(59, 130, 246, 0.2)" }}
  >
              Create Database
            </button>
          </div>

          {
    /* Database Tabs */
  }
          <div style={{ display: "flex", borderBottom: "1px solid var(--border-color)", marginBottom: "20px", gap: "8px" }}>
            <button
    onClick={() => setActiveTab("mysql")}
    style={{
      padding: "10px 20px",
      border: "none",
      background: "none",
      borderBottom: activeTab === "mysql" ? "3px solid #3b82f6" : "3px solid transparent",
      color: activeTab === "mysql" ? "var(--text-primary)" : "var(--text-muted)",
      fontWeight: "bold",
      cursor: "pointer",
      fontSize: "14px",
      transition: "all 0.15s",
      display: "flex",
      alignItems: "center",
      gap: "8px"
    }}
  >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <ellipse cx="12" cy="5" rx="9" ry="3" />
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
              </svg>
              MySQL Databases ({databases.filter((db) => !db.name.startsWith("mongodb:")).length})
            </button>
            <button
    onClick={() => setActiveTab("mongodb")}
    style={{
      padding: "10px 20px",
      border: "none",
      background: "none",
      borderBottom: activeTab === "mongodb" ? "3px solid #10b981" : "3px solid transparent",
      color: activeTab === "mongodb" ? "var(--text-primary)" : "var(--text-muted)",
      fontWeight: "bold",
      cursor: "pointer",
      fontSize: "14px",
      transition: "all 0.15s",
      display: "flex",
      alignItems: "center",
      gap: "8px"
    }}
  >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
              MongoDB Databases ({databases.filter((db) => db.name.startsWith("mongodb:")).length})
            </button>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", fontSize: "14px", color: "var(--text-muted)" }}>
            <div>
              Show <select style={{ padding: "6px 12px", border: "1px solid var(--border-color)", borderRadius: "4px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)" }}><option>50</option></select> entries
            </div>
            <div>
              Search:{" "}
              <input
    type="text"
    style={{ padding: "6px 12px", border: "1px solid var(--border-color)", borderRadius: "4px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", outline: "none" }}
    value={dbSearchQuery}
    onChange={(e) => setDbSearchQuery(e.target.value)}
  />
            </div>
          </div>

          <div style={{ width: "100%", overflowX: "auto", border: "1px solid var(--border-color)", borderRadius: "8px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border-color)", backgroundColor: "var(--bg-tertiary)" }}>
                  <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600, width: "80px" }}>Sr</th>
                  <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600 }}>Database Name</th>
                  <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600, width: "180px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {databases.filter((db) => {
    const matchesSearch = db.name.toLowerCase().includes(dbSearchQuery.toLowerCase());
    const matchesTab = activeTab === "mongodb" ? db.name.startsWith("mongodb:") : !db.name.startsWith("mongodb:");
    return matchesSearch && matchesTab;
  }).length === 0 ? <tr>
                    <td colSpan={3} style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)" }}>
                      No {activeTab === "mongodb" ? "MongoDB" : "MySQL"} databases found. Click "Create Database" to start!
                    </td>
                  </tr> : databases.filter((db) => {
    const matchesSearch = db.name.toLowerCase().includes(dbSearchQuery.toLowerCase());
    const matchesTab = activeTab === "mongodb" ? db.name.startsWith("mongodb:") : !db.name.startsWith("mongodb:");
    return matchesSearch && matchesTab;
  }).map((db, idx) => <tr key={db.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                        <td style={{ padding: "14px 16px", color: "var(--text-primary)" }}>{idx + 1}</td>
                        <td style={{ padding: "14px 16px" }}>
                          <button
    onClick={() => router.push(`/dashboard/db/${db.name}`)}
    style={{ background: "none", border: "none", color: "#0ea5e9", textDecoration: "underline", cursor: "pointer", fontSize: "14px", fontWeight: "500", padding: 0 }}
  >
                            {db.name.startsWith("mongodb:") ? db.name.replace("mongodb:", "") : db.name}
                          </button>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button style={actBtnStyle("#2563eb")} title="Sync / Share">
                              <SyncIcon />
                            </button>
                            <button style={actBtnStyle("#f59e0b")} title={activeTab === "mongodb" ? "View Collections" : "View Tables"} onClick={() => router.push(`/dashboard/db/${db.name}`)}>
                              <DatabaseIcon />
                            </button>
                            <button style={actBtnStyle("#ef4444")} title="Delete Database" onClick={() => confirmDeleteDatabase(db.id)}>
                              <TrashIcon />
                            </button>
                          </div>
                        </td>
                      </tr>)}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {
    /* ==================== MODAL: CREATE DATABASE ==================== */
  }
      {isDbModalOpen && <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1e3 }}>
          <div style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "8px", width: "720px", maxWidth: "90vw", boxShadow: "var(--shadow-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--border-color)" }}>
              <h3 style={{ fontWeight: "bold", fontSize: "16px", color: "var(--text-primary)" }}>
                {dbTypeStep === "select" ? "Create Database" : dbTypeStep === "sql" ? "Create SQL Database" : "Create MongoDB Database"}
              </h3>
              <button onClick={() => setIsDbModalOpen(false)} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
            </div>

            {dbTypeStep === "select" ? <div style={{ padding: "32px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: "24px" }}>
                <h4 style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-secondary)", margin: 0 }}>Select Database Engine</h4>
                <div style={{ display: "flex", gap: "20px", width: "100%" }}>
                  {
    /* SQL Card */
  }
                  <div
    onClick={() => setDbTypeStep("sql")}
    style={{
      flex: 1,
      padding: "24px",
      border: "2px solid #3b82f6",
      borderRadius: "12px",
      cursor: "pointer",
      backgroundColor: "rgba(59, 130, 246, 0.04)",
      transition: "all 0.2s",
      textAlign: "center",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "12px",
      boxShadow: "var(--shadow-sm)"
    }}
    onMouseOver={(e) => {
      e.currentTarget.style.transform = "translateY(-2px)";
      e.currentTarget.style.boxShadow = "0 8px 16px rgba(59, 130, 246, 0.15)";
    }}
    onMouseOut={(e) => {
      e.currentTarget.style.transform = "none";
      e.currentTarget.style.boxShadow = "var(--shadow-sm)";
    }}
  >
                    <div style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <ellipse cx="12" cy="5" rx="9" ry="3" />
                        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                        <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontWeight: "bold", fontSize: "16px", color: "var(--text-primary)", marginBottom: "4px" }}>SQL Database</div>
                      <div style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.4" }}>Create a relational MySQL database with customizable tables.</div>
                    </div>
                  </div>

                  {
    /* MongoDB Card */
  }
                  <div
    onClick={() => setDbTypeStep("mongo")}
    style={{
      flex: 1,
      padding: "24px",
      border: "2px solid #10b981",
      borderRadius: "12px",
      cursor: "pointer",
      backgroundColor: "rgba(16, 185, 129, 0.04)",
      transition: "all 0.2s",
      textAlign: "center",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "12px",
      boxShadow: "var(--shadow-sm)"
    }}
    onMouseOver={(e) => {
      e.currentTarget.style.transform = "translateY(-2px)";
      e.currentTarget.style.boxShadow = "0 8px 16px rgba(16, 185, 129, 0.15)";
    }}
    onMouseOut={(e) => {
      e.currentTarget.style.transform = "none";
      e.currentTarget.style.boxShadow = "var(--shadow-sm)";
    }}
  >
                    <div style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontWeight: "bold", fontSize: "16px", color: "var(--text-primary)", marginBottom: "4px" }}>MongoDB</div>
                      <div style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.4" }}>Create a NoSQL document database hosted on your cluster.</div>
                    </div>
                  </div>
                </div>
              </div> : <form onSubmit={handleSaveDatabase}>
                <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "18px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-muted)" }}>Database Name:</label>
                    <input
    type="text"
    placeholder="ecommerce"
    required
    value={newDbName}
    onChange={(e) => setNewDbName(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
    style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border-color)", borderRadius: "6px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "14px", outline: "none" }}
  />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <label style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-muted)" }}>
                      {dbTypeStep === "sql" ? "Add Quick Tables:" : "Add Quick Collections:"}
                    </label>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", border: "1px solid var(--border-color)", borderRadius: "6px", padding: "14px" }}>
                      {QUICK_TABLE_OPTIONS.map((opt) => <label key={opt.id} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", color: "var(--text-primary)" }}>
                          <input
    type="checkbox"
    checked={selectedQuickTables.includes(opt.id)}
    onChange={() => toggleQuickTable(opt.id)}
  />
                          {opt.name}
                        </label>)}
                    </div>
                  </div>
                </div>
                
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", padding: "16px 24px", borderTop: "1px solid var(--border-color)" }}>
                  <button type="button" onClick={() => setDbTypeStep("select")} style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", cursor: "pointer", fontSize: "14px" }}>Back</button>
                  <button type="submit" style={{ padding: "8px 16px", borderRadius: "6px", border: "none", backgroundColor: dbTypeStep === "sql" ? "#3b82f6" : "#10b981", color: "white", cursor: "pointer", fontSize: "14px", fontWeight: "bold" }}>Save changes</button>
                </div>
              </form>}
          </div>
        </div>}
      {
    /* Create Table using AI Modal */
  }
      {isAiBuilderOpen && <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1e3 }}>
          <div style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", width: "600px", maxWidth: "90vw", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #e2e8f0" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>Create Table using AI</h3>
              <button onClick={() => setIsAiBuilderOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "18px", fontWeight: 700 }}>×</button>
            </div>
            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "13.5px", fontWeight: 600, color: "#475569" }}>Add Prompt:</label>
                <textarea
    value={aiPrompt}
    onChange={(e) => setAiPrompt(e.target.value)}
    placeholder="e.g. create table users with column name, email, password"
    style={{
      width: "100%",
      height: "80px",
      padding: "10px 12px",
      fontSize: "13.5px",
      border: "1.5px solid #cbd5e1",
      borderRadius: "8px",
      outline: "none",
      backgroundColor: "#fafbfd",
      color: "#0f172a",
      resize: "vertical",
      boxSizing: "border-box"
    }}
  />
              </div>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <button
    onClick={handleGenerateSql}
    style={{
      backgroundColor: "#10b981",
      color: "white",
      border: "none",
      padding: "10px 24px",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: 700,
      boxShadow: "0 2px 8px rgba(16,185,129,0.3)"
    }}
  >
                  Generate
                </button>
              </div>

              {aiGeneratedSql && <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <label style={{ fontSize: "13.5px", fontWeight: 600, color: "#475569" }}>Generated SQL Query:</label>
                  <div style={{
    padding: "16px",
    backgroundColor: "#0d1117",
    borderRadius: "8px",
    border: "1px solid #30363d",
    overflowX: "auto",
    maxHeight: "200px"
  }}>
                    {aiGeneratedSql.split("\n").map((line, idx) => {
    const parts = line.split(/(\s+|,|\(|\))/);
    return <div key={idx} style={{ fontFamily: "monospace", fontSize: "13px", lineHeight: 1.5 }}>
                          {parts.map((part, pIdx) => {
      const lower = part.toLowerCase();
      let color = "#c9d1d9";
      if (["create", "table", "primary", "key", "auto_increment", "default", "not", "null"].includes(lower)) {
        color = "#ff7b72";
      } else if (["int", "varchar", "text", "timestamp", "decimal"].includes(lower)) {
        color = "#79c0ff";
      } else if (part.trim().startsWith("'") || part.trim().startsWith("`")) {
        color = "#a5d6ff";
      }
      return <span key={pIdx} style={{ color }}>{part}</span>;
    })}
                        </div>;
  })}
                  </div>
                  <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                    <button
    onClick={() => {
      navigator.clipboard.writeText(aiGeneratedSql).then(() => {
        showToast("SQL Query copied to clipboard!", "success");
      }).catch(() => {
        showToast("Failed to copy SQL Query to clipboard", "error");
      });
    }}
    style={{
      padding: "8px 16px",
      borderRadius: "6px",
      border: "1px solid #cbd5e1",
      backgroundColor: "transparent",
      color: "#475569",
      cursor: "pointer",
      fontSize: "13px"
    }}
  >
                      Copy SQL
                    </button>
                    <button
    onClick={handleExecuteSqlTable}
    style={{
      padding: "8px 16px",
      borderRadius: "6px",
      border: "none",
      backgroundColor: "#0284c7",
      color: "white",
      cursor: "pointer",
      fontSize: "13px",
      fontWeight: 700
    }}
  >
                      Run Query / Create Table
                    </button>
                  </div>
                </div>}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", padding: "14px 20px", borderTop: "1px solid #e2e8f0" }}>
              <button onClick={() => setIsAiBuilderOpen(false)} style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid #cbd5e1", backgroundColor: "transparent", color: "#475569", cursor: "pointer", fontSize: "13px" }}>Close</button>
            </div>
          </div>
        </div>}

      {/* ==================== MODAL: DELETE DATABASE CONFIRMATION ==================== */}
      {isDeleteModalOpen && <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1e3 }}>
          <div style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "12px", width: "450px", maxWidth: "90vw", boxShadow: "var(--shadow-lg)", overflow: "hidden" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "30px 24px", textAlign: "center" }}>
              <div style={{ width: "56px", height: "56px", borderRadius: "50%", backgroundColor: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444", marginBottom: "20px" }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: "bold", color: "var(--text-primary)" }}>Delete Database</h3>
              <p style={{ margin: 0, fontSize: "14px", color: "var(--text-muted)", lineHeight: "1.5" }}>
                Are you sure you want to delete the database <strong style={{ color: "var(--text-primary)" }}>{dbToDelete.startsWith("mongodb:") ? dbToDelete.replace("mongodb:", "") : dbToDelete}</strong>? This action is permanent and all tables/data inside it will be lost forever.
              </p>
            </div>
            
            <div style={{ display: "flex", borderTop: "1px solid var(--border-color)", backgroundColor: "var(--bg-tertiary)" }}>
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDbToDelete("");
                }}
                style={{ flex: 1, padding: "16px", background: "none", border: "none", borderRight: "1px solid var(--border-color)", cursor: "pointer", fontSize: "14px", fontWeight: "600", color: "var(--text-secondary)", outline: "none" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteDatabase}
                style={{ flex: 1, padding: "16px", background: "none", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: "bold", color: "#ef4444", outline: "none" }}
              >
                Delete Database
              </button>
            </div>
          </div>
        </div>}
    </div>;
}
