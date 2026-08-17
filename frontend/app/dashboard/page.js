"use client";
"use strict";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "../context/ToastContext";
import DeleteDbModal from "../../components/dialogs/DeleteDbModal";
import MakeTableAiModal from "../../components/dialogs/MakeTableAiModal";
import DbRow from "../../components/cards/DbRow";
import { databaseService } from "../../services/databaseService";
import { useDatabases } from "../context/DatabaseContext";
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
export default function DatabaseListPage() {
  const { showToast } = useToast();
  const { databases, refreshDatabases } = useDatabases();
  const [dbSearchQuery, setDbSearchQuery] = useState("");
  const [currentUser, setCurrentUser] = useState("");
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const [newDbName, setNewDbName] = useState("");
  const [selectedQuickTables, setSelectedQuickTables] = useState(["admin", "login_activity", "query_logger"]);
  const [activeTab, setActiveTab] = useState("mysql");
  const router = useRouter();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [dbToDelete, setDbToDelete] = useState("");
  const [dbTypeStep, setDbTypeStep] = useState("sql");
  const [isAiBuilderOpen, setIsAiBuilderOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("create table users with column name, email, password");
  const [aiGeneratedSql, setAiGeneratedSql] = useState("");
  const [aiGeneratedTableName, setAiGeneratedTableName] = useState("");
  const [aiGeneratedColumns, setAiGeneratedColumns] = useState([]);
  const handleGenerateSql = async () => {
    if (!aiPrompt.trim()) return;
    try {
      setAiGeneratedSql("Generating schema using Gemini AI...");
      const data = await databaseService.generateSqlWithAi(aiPrompt);
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
  useEffect(() => {
    const user = localStorage.getItem("currentUser") || localStorage.getItem("rememberedEmail") || "";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentUser(user);
    if (user) {
      refreshDatabases();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const confirmDeleteDatabase = (dbId) => {
    setDbToDelete(dbId);
    setIsDeleteModalOpen(true);
  };
  const handleDeleteDatabase = async () => {
    if (!dbToDelete) return;
    try {
      const data = await databaseService.deleteDatabase(dbToDelete, currentUser);
      if (data.success) {
        await refreshDatabases();
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
    const formattedDbName = newDbName.trim().toLowerCase().replace(/[\s-]+/g, "_");
    try {
      const data = await databaseService.createDatabase(formattedDbName, dbTypeStep === "sql" ? "sql" : "mongodb", selectedQuickTables, currentUser);
      if (data.success) {
        await refreshDatabases();
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
  const getTabStyle = (tabId) => ({
    border: "none",
    background: "none",
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: "bold",
    cursor: "pointer",
    color: activeTab === tabId ? "#3b82f6" : "var(--text-secondary)",
    borderBottom: activeTab === tabId ? "3px solid #3b82f6" : "none",
    outline: "none",
    transition: "all 0.15s ease",
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
      setDbTypeStep("sql");
    }}
    style={{ backgroundColor: "#3b82f6", color: "white", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "bold", boxShadow: "0 4px 6px rgba(59, 130, 246, 0.2)" }}
  >
              Create Database
            </button>
          </div>

          <h2 style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-muted)", marginBottom: "20px", marginTop: "10px" }}>
            MySQL / SQL Databases
          </h2>

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
                  <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600, width: "120px" }}>Username</th>
                  <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600, width: "180px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {databases.filter((db) => {
                  const matchesSearch = db.name.toLowerCase().includes(dbSearchQuery.toLowerCase());
                  const isMongoDb = db.name.startsWith("mongodb:");
                  const matchesTab = activeTab === "mysql" ? !isMongoDb : isMongoDb;
                  return matchesSearch && matchesTab;
                }).length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)" }}>
                      {activeTab === "mysql"
                        ? 'No SQL databases found. Click "Create Database" to start!'
                        : 'No MongoDB databases found. Click "Create Database" to start!'}
                    </td>
                  </tr>
                ) : (
                  databases.filter((db) => {
                    const matchesSearch = db.name.toLowerCase().includes(dbSearchQuery.toLowerCase());
                    const isMongoDb = db.name.startsWith("mongodb:");
                    const matchesTab = activeTab === "mysql" ? !isMongoDb : isMongoDb;
                    return matchesSearch && matchesTab;
                  }).map((db, idx) => (
                    <DbRow
                      key={db.id}
                      db={db}
                      idx={idx}
                      currentUser={currentUser}
                      activeTab={activeTab}
                      onNavigate={() => router.push(`/dashboard/db/${db.name}`)}
                      onDelete={confirmDeleteDatabase}
                    />
                  ))
                )}
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
                Create New Database
              </h3>
              <button onClick={() => setIsDbModalOpen(false)} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
            </div>

            <form onSubmit={handleSaveDatabase}>
              <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "18px" }}>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-muted)" }}>Database Name:</label>
                  <input
                    type="text"
                    placeholder="ecommerce"
                    required
                    value={newDbName}
                    onChange={(e) => setNewDbName(e.target.value.toLowerCase().replace(/[\s-]+/g, "_"))}
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border-color)", borderRadius: "6px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "14px", outline: "none" }}
                  />
                </div>


                {dbTypeStep === "sql" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <label style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-muted)" }}>
                      Add Quick Tables:
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
                )}
              </div>
              
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", padding: "16px 24px", borderTop: "1px solid var(--border-color)" }}>
                <button type="button" onClick={() => setIsDbModalOpen(false)} style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", cursor: "pointer", fontSize: "14px" }}>Cancel</button>
                <button type="submit" style={{ padding: "8px 16px", borderRadius: "6px", border: "none", backgroundColor: "#3b82f6", color: "white", cursor: "pointer", fontSize: "14px", fontWeight: "bold" }}>Save changes</button>
              </div>
            </form>
          </div>
        </div>}
      {
    /* Create Table using AI Modal */
  }
      <MakeTableAiModal
        isOpen={isAiBuilderOpen}
        aiPrompt={aiPrompt}
        setAiPrompt={setAiPrompt}
        onClose={() => setIsAiBuilderOpen(false)}
        onGenerate={handleGenerateSql}
        aiGeneratedSql={aiGeneratedSql}
        onCopy={() => {
          navigator.clipboard.writeText(aiGeneratedSql).then(() => {
            showToast("SQL Query copied to clipboard!", "success");
          }).catch(() => {
            showToast("Failed to copy SQL Query to clipboard", "error");
          });
        }}
        onExecute={handleExecuteSqlTable}
      />

      <DeleteDbModal
        isOpen={isDeleteModalOpen}
        dbToDelete={dbToDelete}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDbToDelete("");
        }}
        onConfirm={handleDeleteDatabase}
      />
    </div>;
}
