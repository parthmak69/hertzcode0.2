"use client";
"use strict";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import { databaseService } from "../../../services/databaseService";

const QUICK_PROMPT_PRESETS = [
  {
    title: "🛍️ Products",
    prompt: "create table products with id, name, sku, price decimal(10,2), description text, category_id int, stock int, image_url varchar(255), is_active boolean",
  },
  {
    title: "📦 Customer Orders",
    prompt: "create table orders with id, order_number varchar(50), customer_id int, total_amount decimal(10,2), payment_status varchar(50), shipping_address text, order_date datetime",
  },
  {
    title: "👤 User Profiles",
    prompt: "create table user_profiles with id, user_id int, full_name varchar(150), avatar_url varchar(255), phone varchar(30), bio text, city varchar(100)",
  },
  {
    title: "📝 Blog Articles",
    prompt: "create table blog_posts with id, title varchar(255), slug varchar(255), content text, author_id int, category varchar(100), views int, published_at datetime",
  },
  {
    title: "💬 Reviews & Ratings",
    prompt: "create table reviews with id, product_id int, user_id int, rating int, review_title varchar(200), review_text text, is_verified boolean, created_at datetime",
  },
];

export default function AiBuilderPage() {
  const { showToast } = useToast();
  const { currentUser, currentUserRole } = useAuth();
  const router = useRouter();

  const [databases, setDatabases] = useState([]);
  const [selectedDb, setSelectedDb] = useState("");
  const [dbTables, setDbTables] = useState([]);
  const [loadingTables, setLoadingTables] = useState(false);

  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSql, setGeneratedSql] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lastCreatedTable, setLastCreatedTable] = useState(null);

  // Load databases on mount
  useEffect(() => {
    const loadDbs = async () => {
      if (!currentUser) return;
      try {
        const data = await databaseService.getDatabases(currentUser, currentUserRole);
        if (data.success && Array.isArray(data.databases)) {
          const validDbs = data.databases;
          setDatabases(validDbs);
          if (validDbs.length > 0) {
            // Keep previous selected if valid, otherwise pick first
            setSelectedDb((prev) => (validDbs.some((d) => d.name === prev) ? prev : validDbs[0].name));
          }
        }
      } catch (err) {
        console.error("Failed to fetch databases for AI Builder:", err);
      }
    };
    loadDbs();
  }, [currentUser, currentUserRole]);

  // Load tables when selectedDb changes
  const fetchTablesForDb = async (dbName) => {
    if (!dbName) {
      setDbTables([]);
      return;
    }
    setLoadingTables(true);
    try {
      const data = await databaseService.getTables(dbName);
      if (data.success && Array.isArray(data.tables)) {
        setDbTables(data.tables);
      } else {
        setDbTables([]);
      }
    } catch (err) {
      console.error("Failed to load tables:", err);
      setDbTables([]);
    } finally {
      setLoadingTables(false);
    }
  };

  useEffect(() => {
    if (selectedDb) {
      fetchTablesForDb(selectedDb);
    }
  }, [selectedDb]);

  // Handle AI Generation
  const handleGenerate = async () => {
    if (!aiPrompt.trim()) {
      showToast("Please enter a prompt describing the table or schema to create.", "warning");
      return;
    }
    if (!selectedDb) {
      showToast("Please map a target database from the dropdown first.", "warning");
      return;
    }

    setIsGenerating(true);
    setLastCreatedTable(null);
    try {
      const schemaContext = dbTables.length > 0 ? `Existing tables: ${dbTables.map((t) => t.name).join(", ")}` : "No tables exist yet.";
      const data = await databaseService.generateSqlWithAi(aiPrompt, selectedDb, schemaContext);
      if (data && data.sql) {
        setGeneratedSql(data.sql);
        showToast("SQL Schema generated successfully!", "success");
      } else if (data && data.error) {
        showToast(`AI generation error: ${data.error}`, "error");
      } else {
        showToast("Failed to generate SQL structure. Please try a different prompt.", "error");
      }
    } catch (err) {
      showToast(err.message || "Failed to generate SQL schema", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy SQL to clipboard
  const handleCopy = () => {
    if (!generatedSql) return;
    navigator.clipboard.writeText(generatedSql);
    setCopied(true);
    showToast("SQL query copied to clipboard!", "info");
    setTimeout(() => setCopied(false), 2000);
  };

  // Execute / Create Table in Database
  const handleCreateTable = async () => {
    if (!selectedDb) {
      showToast("Please select a target database first.", "warning");
      return;
    }
    if (!generatedSql.trim()) {
      showToast("No generated SQL to execute. Please generate a schema first.", "warning");
      return;
    }

    // Extract table name
    let parsedTable = "new_table";
    if (selectedDb.startsWith("mongodb:")) {
      try {
        const parsed = JSON.parse(generatedSql);
        parsedTable = parsed.collectionName || "new_collection";
      } catch (e) {
        parsedTable = "new_collection";
      }
    } else {
      const match = generatedSql.match(/create\s+table\s+(?:if\s+not\s+exists\s+)?`?([a-zA-Z0-9_]+)`?/i);
      parsedTable = match ? match[1] : "new_table";
    }

    setIsExecuting(true);
    try {
      const data = await databaseService.createTableRaw(selectedDb, generatedSql);
      if (data.success) {
        showToast(`Table "${parsedTable}" successfully created in database "${selectedDb}"!`, "success");
        setLastCreatedTable(parsedTable);
        await fetchTablesForDb(selectedDb);
      } else {
        showToast(data.error || "Failed to create table in database", "error");
      }
    } catch (err) {
      showToast(err.message || "Failed to execute table creation", "error");
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* SUB NAV BAR BANNER */}
      <div
        style={{
          height: "40px",
          backgroundColor: "var(--primary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          color: "white",
          fontSize: "13px",
          fontWeight: "600",
          flexShrink: 0,
          boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
          </svg>
          <span style={{ fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.8px" }}>AI Schema & Table Builder</span>
        </div>
        <span style={{ color: "rgba(255,255,255,0.85)" }}>
          Mapped Database: <strong>{selectedDb || "None Selected"}</strong> {dbTables.length > 0 && `(${dbTables.length} tables)`}
        </span>
      </div>

      {/* MAIN CONTAINER */}
      <main style={{ flex: 1, padding: "24px", overflowY: "auto", backgroundColor: "var(--bg-primary)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.3fr", gap: "24px", alignItems: "start" }}>
          
          {/* ==================== LEFT COLUMN: MAPPING & PROMPTING ==================== */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            
            {/* Database Mapping Card */}
            <div
              style={{
                backgroundColor: "var(--bg-secondary)",
                border: "1.5px solid var(--border-color)",
                borderRadius: "10px",
                padding: "20px",
                boxShadow: "var(--shadow-md)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2.5">
                    <ellipse cx="12" cy="5" rx="9" ry="3" />
                    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                    <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
                  </svg>
                  Target Database Mapping
                </h3>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: "600",
                    padding: "3px 10px",
                    borderRadius: "12px",
                    backgroundColor: selectedDb?.startsWith("mongodb:") ? "rgba(16, 185, 129, 0.15)" : "rgba(14, 165, 233, 0.15)",
                    color: selectedDb?.startsWith("mongodb:") ? "#10b981" : "#0ea5e9",
                  }}
                >
                  {selectedDb?.startsWith("mongodb:") ? "MongoDB" : "MySQL / SQL"}
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted)" }}>
                  Choose Database to map generated schema to:
                </label>
                <select
                  value={selectedDb}
                  onChange={(e) => setSelectedDb(e.target.value)}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1.5px solid var(--border-color)",
                    backgroundColor: "var(--bg-primary)",
                    color: "var(--text-primary)",
                    fontSize: "14px",
                    fontWeight: "600",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  {databases.length === 0 ? (
                    <option value="">No databases available</option>
                  ) : (
                    databases.map((db) => (
                      <option key={db.name} value={db.name}>
                        {db.name} {db.tablesCount !== undefined ? `(${db.tablesCount} tables)` : ""}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Existing Tables List Indicator */}
              <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid var(--border-color)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "12.5px", fontWeight: "600", color: "var(--text-muted)" }}>
                    Existing Tables in {selectedDb}:
                  </span>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    {loadingTables ? "Loading..." : `${dbTables.length} tables found`}
                  </span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", maxHeight: "100px", overflowY: "auto" }}>
                  {dbTables.length === 0 ? (
                    <span style={{ fontSize: "12.5px", color: "var(--text-muted)", fontStyle: "italic" }}>
                      No tables found in this database yet.
                    </span>
                  ) : (
                    dbTables.map((t) => (
                      <span
                        key={t.name}
                        onClick={() => router.push(`/dashboard/db/${selectedDb}/${t.name}`)}
                        style={{
                          fontSize: "12px",
                          fontFamily: "monospace",
                          padding: "3px 8px",
                          borderRadius: "4px",
                          backgroundColor: "var(--bg-tertiary)",
                          color: "var(--text-primary)",
                          border: "1px solid var(--border-color)",
                          cursor: "pointer",
                        }}
                        title={`Click to view table "${t.name}"`}
                      >
                        {t.name}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Prompt Builder Card */}
            <div
              style={{
                backgroundColor: "var(--bg-secondary)",
                border: "1.5px solid var(--border-color)",
                borderRadius: "10px",
                padding: "20px",
                boxShadow: "var(--shadow-md)",
              }}
            >
              <h3 style={{ margin: "0 0 12px 0", fontSize: "16px", fontWeight: "700", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                Describe Your Table with Natural Language
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <textarea
                  rows={4}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. Create a products table with title, sku, price, category_id, description, stock_quantity, and image_url"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: "8px",
                    border: "1.5px solid var(--border-color)",
                    backgroundColor: "var(--bg-primary)",
                    color: "var(--text-primary)",
                    fontSize: "14px",
                    outline: "none",
                    resize: "vertical",
                    lineHeight: "1.5",
                  }}
                />

                {/* Quick Presets */}
                <div>
                  <div style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", marginBottom: "6px" }}>
                    Quick Templates:
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {QUICK_PROMPT_PRESETS.map((preset) => (
                      <button
                        key={preset.title}
                        type="button"
                        onClick={() => setAiPrompt(preset.prompt)}
                        style={{
                          background: "var(--bg-tertiary)",
                          border: "1px solid var(--border-color)",
                          color: "var(--text-primary)",
                          padding: "4px 10px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: "500",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {preset.title}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  style={{
                    marginTop: "8px",
                    backgroundColor: isGenerating ? "#64748b" : "#10b981",
                    color: "white",
                    border: "none",
                    padding: "12px 20px",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "700",
                    cursor: isGenerating ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    boxShadow: "0 4px 12px rgba(16, 185, 129, 0.25)",
                    transition: "all 0.2s ease",
                  }}
                >
                  {isGenerating ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 1s linear infinite" }}>
                        <line x1="12" y1="2" x2="12" y2="6" />
                        <line x1="12" y1="18" x2="12" y2="22" />
                        <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
                        <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
                        <line x1="2" y1="12" x2="6" y2="12" />
                        <line x1="18" y1="12" x2="22" y2="12" />
                        <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
                        <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
                      </svg>
                      Generating Schema with AI...
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                      </svg>
                      Generate Schema with AI
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* ==================== RIGHT COLUMN: SCHEMA PREVIEW & EXECUTION ==================== */}
          <div
            style={{
              backgroundColor: "var(--bg-secondary)",
              border: "1.5px solid var(--border-color)",
              borderRadius: "10px",
              padding: "20px",
              boxShadow: "var(--shadow-md)",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5">
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
                Generated SQL Schema Preview
              </h3>
              {generatedSql && (
                <button
                  type="button"
                  onClick={handleCopy}
                  style={{
                    background: "none",
                    border: "1px solid var(--border-color)",
                    borderRadius: "6px",
                    padding: "4px 10px",
                    color: "var(--text-muted)",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  {copied ? "✓ Copied" : "Copy SQL"}
                </button>
              )}
            </div>

            {/* Editable SQL Code Area */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "12.5px", fontWeight: "600", color: "var(--text-muted)" }}>
                SQL Definition (You can review or edit directly before running):
              </label>
              <textarea
                rows={12}
                value={generatedSql}
                onChange={(e) => setGeneratedSql(e.target.value)}
                placeholder="-- Generated SQL query will appear here. You can also type or paste custom CREATE TABLE queries directly."
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: "8px",
                  border: "1px solid #30363d",
                  backgroundColor: "#0d1117",
                  color: "#58a6ff",
                  fontFamily: "Consolas, 'Courier New', monospace",
                  fontSize: "13.5px",
                  outline: "none",
                  resize: "vertical",
                  lineHeight: "1.6",
                }}
              />
            </div>

            {/* Actions for generated SQL */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "8px" }}>
              <span style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>
                Target: <strong>{selectedDb || "None"}</strong>
              </span>

              <button
                type="button"
                onClick={handleCreateTable}
                disabled={isExecuting || !generatedSql.trim()}
                style={{
                  backgroundColor: !generatedSql.trim() || isExecuting ? "#64748b" : "#0284c7",
                  color: "white",
                  border: "none",
                  padding: "12px 24px",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "700",
                  cursor: !generatedSql.trim() || isExecuting ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 4px 12px rgba(2, 132, 199, 0.25)",
                  transition: "all 0.2s ease",
                }}
              >
                {isExecuting ? (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 1s linear infinite" }}>
                      <line x1="12" y1="2" x2="12" y2="6" />
                      <line x1="12" y1="18" x2="12" y2="22" />
                      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
                      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
                      <line x1="2" y1="12" x2="6" y2="12" />
                      <line x1="18" y1="12" x2="22" y2="12" />
                      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
                      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
                    </svg>
                    Creating Table in Database...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Add Table to Database ({selectedDb || "Select DB"})
                  </>
                )}
              </button>
            </div>

            {/* Success quick link after creation */}
            {lastCreatedTable && (
              <div
                style={{
                  padding: "12px 16px",
                  backgroundColor: "rgba(16, 185, 129, 0.12)",
                  border: "1.5px solid rgba(16, 185, 129, 0.3)",
                  borderRadius: "8px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#10b981", fontSize: "13.5px", fontWeight: "600" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Table <strong>&ldquo;{lastCreatedTable}&rdquo;</strong> is now active in <strong>{selectedDb}</strong>!
                </div>
                <button
                  type="button"
                  onClick={() => router.push(`/dashboard/db/${selectedDb}/${lastCreatedTable}`)}
                  style={{
                    backgroundColor: "#10b981",
                    color: "white",
                    border: "none",
                    padding: "6px 14px",
                    borderRadius: "6px",
                    fontSize: "12.5px",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  View Table Rows ➔
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
