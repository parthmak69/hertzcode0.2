"use strict";
"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useToast } from "../../../context/ToastContext";
const SyncIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
  </svg>;
const TrashIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>;
const EyeIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>;
export default function TablesListPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const params = useParams();
  const dbName = params?.dbName;
  const [currentUser, setCurrentUser] = useState("");
  const [tables, setTables] = useState([]);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isQueryModalOpen, setIsQueryModalOpen] = useState(false);
  const [sqlQuery, setSqlQuery] = useState("SELECT * FROM users LIMIT 10;");
  const [queryResult, setQueryResult] = useState(null);
  const [queryError, setQueryError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [entriesLimit, setEntriesLimit] = useState(50);
  const [aiPrompt, setAiPrompt] = useState("create table users with column name, email, password");
  const [aiGeneratedSql, setAiGeneratedSql] = useState("");
  const [newTableName, setNewTableName] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [tableToDelete, setTableToDelete] = useState("");
  const filteredTables = tables.filter((t) => t.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, entriesLimit);
  const [tableIdOption, setTableIdOption] = useState(true);
  const [tableCreatedOn, setTableCreatedOn] = useState(true);
  const [tableModifiedOn, setTableModifiedOn] = useState(true);
  const [tableIsDeleted, setTableIsDeleted] = useState(true);
  const [tableColumns, setTableColumns] = useState([
    { name: "", type: "VARCHAR", size: "100", index: "---", defaultValue: "NULL", comment: "" },
    { name: "", type: "VARCHAR", size: "100", index: "---", defaultValue: "NULL", comment: "" },
    { name: "", type: "VARCHAR", size: "100", index: "---", defaultValue: "NULL", comment: "" },
    { name: "", type: "VARCHAR", size: "100", index: "---", defaultValue: "NULL", comment: "" },
    { name: "", type: "VARCHAR", size: "100", index: "---", defaultValue: "NULL", comment: "" }
  ]);
  const fetchTables = async () => {
    if (!dbName) return;
    try {
      const res = await fetch(`/api/database/tables?dbName=${encodeURIComponent(dbName)}`);
      const responseText = await res.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("Non-JSON tables list:", responseText);
        showToast("Error loading tables list", "error");
        router.push("/dashboard");
        return;
      }
      if (res.ok && data.success) {
        setTables(data.tables || []);
      } else {
        showToast(data.error || "Access denied or database error.", "error");
        router.push("/dashboard");
      }
    } catch (err) {
      console.error("Failed to load tables:", err);
      showToast("Network error loading tables", "error");
      router.push("/dashboard");
    }
  };
  useEffect(() => {
    const user = localStorage.getItem("currentUser") || localStorage.getItem("rememberedEmail") || "";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentUser(user);
    fetchTables();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbName]);
  const getSuggestions = () => {
    if (!sqlQuery) return [];
    const words = sqlQuery.split(/[\s,();]+/);
    const lastWord = words[words.length - 1]?.toLowerCase() || "";
    if (lastWord.length < 2) return [];
    return tables.map((t) => t.name).filter((name) => name.toLowerCase().includes(lastWord) && name.toLowerCase() !== lastWord);
  };
  const handleApplySuggestion = (tableName) => {
    const words = sqlQuery.split(/([\s,();]+)/);
    let replaced = false;
    for (let i = words.length - 1; i >= 0; i--) {
      if (words[i].trim() && !replaced) {
        words[i] = tableName;
        replaced = true;
      }
    }
    setSqlQuery(words.join(""));
  };
  const confirmDeleteTable = (tableName) => {
    setTableToDelete(tableName);
    setIsDeleteModalOpen(true);
  };
  const handleDeleteTable = async () => {
    if (!tableToDelete) return;
    try {
      const res = await fetch("/api/database/tables/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dbName, tableName: tableToDelete, username: currentUser })
      });
      const responseText = await res.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (err) {
        console.error("Non-JSON response for table deletion:", responseText);
        showToast(`Server error (${res.status}): ${responseText.slice(0, 200) || "Empty response"}`, "error");
        return;
      }
      if (res.ok && data.success) {
        await fetchTables();
        setIsDeleteModalOpen(false);
        showToast(`Table "${tableToDelete}" deleted successfully`, "success");
        setTableToDelete("");
      } else {
        showToast(data.error || "Failed to delete table", "error");
      }
    } catch (err) {
      console.error(err);
      showToast(err.message || "Failed to delete table", "error");
    }
  };
  const handleSaveTable = async (e) => {
    e.preventDefault();
    if (!newTableName.trim() || !dbName) return;
    const formattedTableName = newTableName.trim().toLowerCase().replace(/\s+/g, "_");
    const finalCols = tableColumns.filter((c) => c.name.trim() !== "");
    try {
      const res = await fetch("/api/database/tables/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dbName,
          tableName: formattedTableName,
          columns: finalCols,
          idOption: tableIdOption,
          createdOnOption: tableCreatedOn,
          modifiedOnOption: tableModifiedOn,
          isDeletedOption: tableIsDeleted
        })
      });
      const responseText = await res.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (err) {
        console.error("Non-JSON response for table creation:", responseText);
        showToast(`Server error (${res.status}): ${responseText.slice(0, 200) || "Empty response"}`, "error");
        return;
      }
      if (res.ok && data.success) {
        await fetchTables();
        setIsTableModalOpen(false);
        setNewTableName("");
        setTableColumns([
          { name: "", type: "VARCHAR", size: "100", index: "---", defaultValue: "NULL", comment: "" },
          { name: "", type: "VARCHAR", size: "100", index: "---", defaultValue: "NULL", comment: "" },
          { name: "", type: "VARCHAR", size: "100", index: "---", defaultValue: "NULL", comment: "" },
          { name: "", type: "VARCHAR", size: "100", index: "---", defaultValue: "NULL", comment: "" },
          { name: "", type: "VARCHAR", size: "100", index: "---", defaultValue: "NULL", comment: "" }
        ]);
        showToast(`Table "${formattedTableName}" created successfully`, "success");
      } else {
        showToast(data.error || "Failed to create table", "error");
      }
    } catch (err) {
      console.error(err);
      showToast(err.message || "Failed to create table", "error");
    }
  };
  const handleGenerateSql = async () => {
    if (!aiPrompt.trim()) return;
    try {
      setAiGeneratedSql("Generating schema using Gemini AI...");
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ prompt: aiPrompt, dbName })
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || "Failed to generate query");
      }
      const data = await response.json();
      setAiGeneratedSql(data.sql || "");
    } catch (err) {
      setAiGeneratedSql(`Error generating table structure: ${err.message}`);
    }
  };
  const handleAddAiTableToDatabase = async () => {
    if (!dbName) return;
    let tblName = "generated_table";
    if (dbName.startsWith("mongodb:")) {
      try {
        const parsed = JSON.parse(aiGeneratedSql);
        tblName = parsed.collectionName || "generated_collection";
      } catch (e) {
        tblName = "generated_collection";
      }
    } else {
      const match = aiGeneratedSql.match(/create table\s+(?:if\s+not\s+exists\s+)?`?(\w+)`?/i);
      tblName = match ? match[1] : "generated_table";
    }
    try {
      const res = await fetch("/api/database/tables/create-raw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dbName, sql: aiGeneratedSql })
      });
      const responseText = await res.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (err) {
        console.error("Non-JSON raw table SQL response:", responseText);
        showToast(`Server error (${res.status}): ${responseText.slice(0, 200) || "Empty response"}`, "error");
        return;
      }
      if (res.ok && data.success) {
        await fetchTables();
        setIsAiModalOpen(false);
        setAiGeneratedSql("");
        showToast(`Table "${tblName}" created via AI successfully`, "success");
      } else {
        showToast(data.error || "Failed to create table via AI", "error");
      }
    } catch (err) {
      console.error(err);
      showToast(err.message || "Failed to create table via AI", "error");
    }
  };
  const handleAddTableColumnRow = () => {
    setTableColumns([
      ...tableColumns,
      { name: "", type: "VARCHAR", size: "100", index: "---", defaultValue: "NULL", comment: "" }
    ]);
  };
  const handleRemoveTableColumnRow = (index) => {
    setTableColumns(tableColumns.filter((_, idx) => idx !== index));
  };
  const handleExecuteQuery = async () => {
    try {
      setQueryError("");
      setQueryResult(null);
      const res = await fetch("/api/database/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dbName, sql: sqlQuery })
      });
      const data = await res.json();
      if (data.success) {
        setQueryResult(data);
        setQueryError("");
        fetchTables();
      } else {
        setQueryError(data.error || "Failed to run query.");
        setQueryResult(null);
      }
    } catch (err) {
      setQueryError(err.message || "An error occurred.");
      setQueryResult(null);
    }
  };
  const actBtnStyle = () => ({
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
      <div style={{ height: "40px", backgroundColor: "var(--bannerBg)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", color: "white", fontSize: "13px", fontWeight: "600", flexShrink: 0, boxShadow: "0 2px 6px rgba(0,0,0,0.05)" }}>
        <span style={{ fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.8px" }}>Tables</span>
        <span style={{ color: "rgba(255,255,255,0.8)" }}>Database Builder / {dbName}</span>
      </div>

      <main style={{ flex: 1, padding: "24px", overflowY: "auto", backgroundColor: "var(--bg-primary)" }}>
        <div style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "24px", boxShadow: "var(--shadow-md)" }}>
          
          <div style={{ marginBottom: "16px" }}>
            <button
    onClick={() => router.push("/dashboard")}
    style={{ background: "none", border: "none", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", color: "var(--text-muted)", fontWeight: "bold", fontSize: "14px", padding: 0 }}
  >
              ← Back to Databases
            </button>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "16px", marginBottom: "20px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "var(--text-primary)" }}>Tables in {dbName}:</h2>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
    onClick={() => setIsQueryModalOpen(true)}
    style={{ backgroundColor: "#ef4444", color: "white", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}
  >
                {dbName.startsWith("mongodb:") ? "Mongo Shell" : "SQL Query Editor"}
              </button>
              <button
    onClick={() => setIsAiModalOpen(true)}
    style={{ backgroundColor: "#10b981", color: "white", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}
  >
                AI Builder
              </button>
              <button
    onClick={() => setIsTableModalOpen(true)}
    style={{ backgroundColor: "#3b82f6", color: "white", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}
  >
                {dbName.startsWith("mongodb:") ? "Add Collection" : "Add Table"}
              </button>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", fontSize: "14px", color: "var(--text-muted)" }}>
            <div>
              Show <select
    value={entriesLimit}
    onChange={(e) => setEntriesLimit(Number(e.target.value))}
    style={{ padding: "6px 12px", border: "1px solid var(--border-color)", borderRadius: "4px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", outline: "none" }}
  >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select> entries
            </div>
            <div>
              Search:{" "}
              <input
    type="text"
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    style={{ padding: "6px 12px", border: "1px solid var(--border-color)", borderRadius: "4px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", outline: "none" }}
  />
            </div>
          </div>

          <div style={{ width: "100%", overflowX: "auto", border: "1px solid var(--border-color)", borderRadius: "8px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border-color)", backgroundColor: "var(--bg-tertiary)" }}>
                  <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600, width: "80px" }}>Sr</th>
                  <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600 }}>Table Name</th>
                  <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600, width: "120px" }}>Entries</th>
                  <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600, width: "180px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTables.length === 0 ? <tr>
                    <td colSpan={4} style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)" }}>
                      {tables.length === 0 ? "No tables created yet. Click 'Add Table' to build one!" : "No matching tables found."}
                    </td>
                  </tr> : filteredTables.map((table, idx) => <tr key={table.name} style={{ borderBottom: "1px solid var(--border-color)" }}>
                      <td style={{ padding: "14px 16px", color: "var(--text-primary)" }}>{idx + 1}</td>
                      <td style={{ padding: "14px 16px" }}>
                        <button
    onClick={() => router.push(`/dashboard/db/${dbName}/${table.name}`)}
    style={{ background: "none", border: "none", color: "#0ea5e9", textDecoration: "underline", cursor: "pointer", fontSize: "14px", fontWeight: "500", padding: 0 }}
  >
                          {table.name}
                        </button>
                      </td>
                      <td style={{ padding: "14px 16px", color: "var(--text-primary)" }}>{table.entriesCount}</td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button style={actBtnStyle()} title="Sync / Schema">
                            <SyncIcon />
                          </button>
                          <button style={actBtnStyle()} title="View Columns / Structure" onClick={() => router.push(`/dashboard/db/${dbName}/${table.name}`)}>
                            <EyeIcon />
                          </button>
                          <button style={actBtnStyle()} title="Delete Table" onClick={() => confirmDeleteTable(table.name)}>
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
    /* ==================== MODAL: CREATE TABLE ==================== */
  }
      {isTableModalOpen && <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1e3 }}>
          <div style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "8px", width: "1000px", maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto", boxShadow: "var(--shadow-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--border-color)" }}>
              <h3 style={{ fontWeight: "bold", fontSize: "16px", color: "var(--text-primary)" }}>Create Table</h3>
              <button onClick={() => setIsTableModalOpen(false)} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
            </div>
            <form onSubmit={handleSaveTable}>
              <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "18px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-muted)" }}>Table Name:</label>
                  <input
    type="text"
    placeholder="users"
    required
    value={newTableName}
    onChange={(e) => setNewTableName(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
    style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border-color)", borderRadius: "6px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "14px", outline: "none" }}
  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <label style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-muted)" }}>Add Columns:</label>
                  <div style={{ display: "flex", gap: "20px", fontSize: "13px", color: "var(--text-primary)" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                      <input type="checkbox" checked={tableIdOption} onChange={(e) => setTableIdOption(e.target.checked)} />
                      id
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                      <input type="checkbox" checked={tableCreatedOn} onChange={(e) => setTableCreatedOn(e.target.checked)} />
                      createdOn
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                      <input type="checkbox" checked={tableModifiedOn} onChange={(e) => setTableModifiedOn(e.target.checked)} />
                      modifiedOn
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                      <input type="checkbox" checked={tableIsDeleted} onChange={(e) => setTableIsDeleted(e.target.checked)} />
                      isDeleted
                    </label>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-muted)" }}>Add More Columns:</label>
                    <button
    type="button"
    onClick={handleAddTableColumnRow}
    style={{ width: "28px", height: "28px", borderRadius: "50%", border: "none", backgroundColor: "#3b82f6", color: "white", fontWeight: "bold", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
  >
                      +
                    </button>
                  </div>
                  <div style={{ width: "100%", overflowX: "auto", border: "1px solid var(--border-color)", borderRadius: "6px", padding: "14px", backgroundColor: "var(--bg-tertiary)" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", minWidth: "950px" }}>
                      {tableColumns.map((col, idx) => (
                        <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "8px", borderBottom: idx === tableColumns.length - 1 ? "none" : "1px solid var(--border-color)", paddingBottom: idx === tableColumns.length - 1 ? 0 : "12px", marginBottom: idx === tableColumns.length - 1 ? 0 : "4px" }}>
                          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                            <input
                              type="text"
                              placeholder="Column Name"
                              value={col.name}
                              onChange={(e) => {
                                const updated = [...tableColumns];
                                updated[idx].name = e.target.value.toLowerCase().replace(/\s+/g, "_");
                                setTableColumns(updated);
                              }}
                              style={{ flex: 2, minWidth: "130px", padding: "8px 10px", border: "1px solid var(--border-color)", borderRadius: "4px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "13px", outline: "none" }}
                            />

                            <select
                              value={col.type}
                              onChange={(e) => {
                                const updated = [...tableColumns];
                                updated[idx].type = e.target.value;
                                setTableColumns(updated);
                              }}
                              style={{ flex: 1.5, minWidth: "110px", padding: "8px 10px", border: "1px solid var(--border-color)", borderRadius: "4px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "13px", outline: "none" }}
                            >
                              <option value="VARCHAR">VARCHAR</option>
                              <option value="INT">INT</option>
                              <option value="TEXT">TEXT</option>
                              <option value="DATE">DATE</option>
                              <option value="DATETIME">DATETIME</option>
                              <option value="DECIMAL">DECIMAL</option>
                              <option value="TINYINT">TINYINT</option>
                            </select>

                            <input
                              type="text"
                              placeholder="Size"
                              value={col.size}
                              onChange={(e) => {
                                const updated = [...tableColumns];
                                updated[idx].size = e.target.value;
                                setTableColumns(updated);
                              }}
                              style={{ flex: 1, minWidth: "70px", padding: "8px 10px", border: "1px solid var(--border-color)", borderRadius: "4px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "13px", outline: "none" }}
                            />

                            <select
                              value={col.index}
                              onChange={(e) => {
                                const updated = [...tableColumns];
                                updated[idx].index = e.target.value;
                                setTableColumns(updated);
                              }}
                              style={{ flex: 1.5, minWidth: "100px", padding: "8px 10px", border: "1px solid var(--border-color)", borderRadius: "4px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "13px", outline: "none" }}
                            >
                              <option value="---">---</option>
                              <option value="PRIMARY KEY">PRIMARY KEY</option>
                              <option value="UNIQUE">UNIQUE</option>
                              <option value="INDEX">INDEX</option>
                            </select>

                            <select
                              value={col.defaultValue}
                              onChange={(e) => {
                                const updated = [...tableColumns];
                                updated[idx].defaultValue = e.target.value;
                                setTableColumns(updated);
                              }}
                              style={{ flex: 1.5, minWidth: "110px", padding: "8px 10px", border: "1px solid var(--border-color)", borderRadius: "4px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "13px", outline: "none" }}
                            >
                              <option value="NULL">NULL</option>
                              <option value="As Defined">As Defined</option>
                              <option value="CURRENT_TIMESTAMP">CURRENT_TIMESTAMP</option>
                            </select>

                            <input
                              type="text"
                              placeholder="Comment"
                              value={col.comment}
                              onChange={(e) => {
                                const updated = [...tableColumns];
                                updated[idx].comment = e.target.value;
                                setTableColumns(updated);
                              }}
                              style={{ flex: 2, minWidth: "130px", padding: "8px 10px", border: "1px solid var(--border-color)", borderRadius: "4px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "13px", outline: "none" }}
                            />

                            <button
                              type="button"
                              onClick={() => handleRemoveTableColumnRow(idx)}
                              style={{ width: "28px", height: "28px", border: "none", backgroundColor: "#ef4444", color: "white", fontWeight: "bold", fontSize: "14px", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
                            >
                              ✕
                            </button>
                          </div>
                          {col.defaultValue === "As Defined" && (
                            <div style={{ display: "flex", gap: "10px", alignItems: "center", paddingLeft: "4px" }}>
                              <span style={{ fontSize: "12.5px", color: "#eab308", fontWeight: "600" }}>Custom Default Value:</span>
                              <input
                                type="text"
                                placeholder="Enter default value (e.g. active, 100, N/A)"
                                value={col.customDefaultValue || ""}
                                onChange={(e) => {
                                  const updated = [...tableColumns];
                                  updated[idx].customDefaultValue = e.target.value;
                                  setTableColumns(updated);
                                }}
                                style={{
                                  width: "320px",
                                  padding: "6px 10px",
                                  border: "1.5px solid var(--border-color)",
                                  borderColor: "#eab308",
                                  borderRadius: "6px",
                                  backgroundColor: "var(--bg-secondary)",
                                  color: "var(--text-primary)",
                                  fontSize: "13px",
                                  outline: "none"
                                }}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", padding: "16px 24px", borderTop: "1px solid var(--border-color)" }}>
                <button type="button" onClick={() => setIsTableModalOpen(false)} style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", cursor: "pointer", fontSize: "14px" }}>Close</button>
                <button type="submit" style={{ padding: "8px 16px", borderRadius: "6px", border: "none", backgroundColor: "#3b82f6", color: "white", cursor: "pointer", fontSize: "14px", fontWeight: "bold" }}>Save changes</button>
              </div>
            </form>
          </div>
        </div>}

      {
    /* ==================== MODAL: CREATE TABLE USING AI ==================== */
  }
      {isAiModalOpen && <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1e3 }}>
          <div style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "8px", width: "820px", maxWidth: "95vw", boxShadow: "var(--shadow-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--border-color)" }}>
              <h3 style={{ fontWeight: "bold", fontSize: "16px", color: "var(--text-primary)" }}>Create Table using AI</h3>
              <button onClick={() => {
    setIsAiModalOpen(false);
    setAiGeneratedSql("");
  }} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
            </div>
            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "18px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-muted)" }}>Add Prompt:</label>
                <textarea
    rows={3}
    value={aiPrompt}
    onChange={(e) => setAiPrompt(e.target.value)}
    style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border-color)", borderRadius: "6px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "14px", outline: "none", resize: "vertical" }}
  />
              </div>

              <div style={{ display: "flex", justifyContent: "center" }}>
                <button
    type="button"
    onClick={handleGenerateSql}
    style={{ backgroundColor: "#10b981", color: "white", border: "none", padding: "10px 24px", borderRadius: "6px", cursor: "pointer", fontSize: "14px", fontWeight: "bold" }}
  >
                  Generate
                </button>
              </div>

              {aiGeneratedSql && <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <pre style={{
    backgroundColor: "#0d1117",
    color: "#c9d1d9",
    padding: "16px",
    borderRadius: "6px",
    fontSize: "13px",
    fontFamily: "Consolas, Monaco, monospace",
    overflowX: "auto",
    border: "1px solid #30363d",
    maxHeight: "260px"
  }}>
                    {aiGeneratedSql}
                  </pre>
                  
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <button
    type="button"
    onClick={handleAddAiTableToDatabase}
    style={{ backgroundColor: "#2563eb", color: "white", border: "none", padding: "12px 28px", borderRadius: "6px", cursor: "pointer", fontSize: "14px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "8px" }}
  >
                      Add in Database <span>➔</span>
                    </button>
                  </div>
                </div>}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", padding: "16px 24px", borderTop: "1px solid var(--border-color)" }}>
              <button
    type="button"
    onClick={() => {
      setIsAiModalOpen(false);
      setAiGeneratedSql("");
    }}
    style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", cursor: "pointer", fontSize: "14px" }}
  >
                Close
              </button>
            </div>
          </div>
        </div>}

      {
    /* ==================== MODAL: SQL QUERY EDITOR ==================== */
  }
      {isQueryModalOpen && <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1e3 }}>
          <div style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "12px", width: "900px", maxWidth: "95vw", maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: "1px solid var(--border-color)" }}>
              <h3 style={{ fontWeight: "bold", fontSize: "16px", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                SQL Query Editor ({dbName})
              </h3>
              <button onClick={() => {
    setIsQueryModalOpen(false);
    setQueryResult(null);
    setQueryError("");
  }} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
            </div>
            
            <div style={{ padding: "24px", flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-muted)" }}>Enter SQL Query:</label>
                <textarea
    rows={6}
    value={sqlQuery}
    onChange={(e) => setSqlQuery(e.target.value)}
    style={{
      width: "100%",
      padding: "12px",
      border: "1px solid var(--border-color)",
      borderRadius: "8px",
      backgroundColor: "#0d1117",
      color: "#c9d1d9",
      fontFamily: "Consolas, Monaco, monospace",
      fontSize: "14px",
      outline: "none",
      resize: "vertical",
      lineHeight: "1.5"
    }}
  />
                {(() => {
    const suggestions = getSuggestions();
    if (suggestions.length === 0) return null;
    return <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "6px", alignItems: "center" }}>
                      <span style={{ fontSize: "12.5px", color: "var(--text-secondary)", fontWeight: 600 }}>Autofill Table:</span>
                      {suggestions.map((s) => <button
      key={s}
      type="button"
      onClick={() => handleApplySuggestion(s)}
      style={{
        backgroundColor: "rgba(59, 130, 246, 0.15)",
        color: "#3b82f6",
        border: "1px solid rgba(59, 130, 246, 0.3)",
        padding: "4px 10px",
        borderRadius: "12px",
        fontSize: "12px",
        cursor: "pointer",
        fontWeight: "bold",
        transition: "all 0.15s"
      }}
      onMouseOver={(e) => e.currentTarget.style.backgroundColor = "rgba(59, 130, 246, 0.25)"}
      onMouseOut={(e) => e.currentTarget.style.backgroundColor = "rgba(59, 130, 246, 0.15)"}
    >
                          {s}
                        </button>)}
                    </div>;
  })()}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  Tip: Supports SELECT, INSERT, UPDATE, DELETE, etc.
                </span>
                <button
    type="button"
    onClick={handleExecuteQuery}
    style={{
      backgroundColor: "#ef4444",
      color: "white",
      border: "none",
      padding: "10px 24px",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: "bold",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      transition: "background-color 0.15s"
    }}
    onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#dc2626"}
    onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#ef4444"}
  >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  Run Query
                </button>
              </div>

              {
    /* Error Display */
  }
              {queryError && <div style={{
    padding: "12px 16px",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.2)",
    borderRadius: "6px",
    color: "#ef4444",
    fontSize: "13px",
    fontFamily: "Consolas, Monaco, monospace",
    whiteSpace: "pre-wrap"
  }}>
                  <strong>Error:</strong> {queryError}
                </div>}

              {
    /* Results Display */
  }
              {queryResult && <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
                  <h4 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>Query Results</h4>
                  
                  {Array.isArray(queryResult.rows) ? queryResult.rows.length === 0 ? <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", border: "1px solid var(--border-color)", borderRadius: "6px" }}>
                        Empty result set (0 rows returned)
                      </div> : <div style={{ width: "100%", overflowX: "auto", border: "1px solid var(--border-color)", borderRadius: "8px", maxHeight: "300px" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                          <thead>
                            <tr style={{ borderBottom: "2px solid var(--border-color)", backgroundColor: "var(--bg-tertiary)", position: "sticky", top: 0 }}>
                              {queryResult.fields?.map((field) => <th key={field} style={{ padding: "10px 12px", color: "var(--text-secondary)", fontWeight: 600 }}>{field}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {queryResult.rows.map((row, rIdx) => <tr key={rIdx} style={{ borderBottom: "1px solid var(--border-color)" }}>
                                {queryResult.fields?.map((field) => {
    const val = row[field];
    let displayVal = "";
    if (val === null) {
      displayVal = "NULL";
    } else if (typeof val === "object") {
      displayVal = JSON.stringify(val);
    } else {
      displayVal = String(val);
    }
    return <td key={field} style={{
      padding: "10px 12px",
      color: val === null ? "var(--text-muted)" : "var(--text-primary)",
      fontStyle: val === null ? "italic" : "normal",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      maxWidth: "250px"
    }}>
                                      {displayVal}
                                    </td>;
  })}
                              </tr>)}
                          </tbody>
                        </table>
                      </div> : (
    // In case of non-select queries (e.g. UPDATE, INSERT, DELETE, CREATE, DROP etc)
    <div style={{
      padding: "16px",
      backgroundColor: "var(--bg-tertiary)",
      border: "1px solid var(--border-color)",
      borderRadius: "6px",
      fontSize: "13px",
      color: "var(--text-secondary)"
    }}>
                      <div style={{ color: "#10b981", fontWeight: "bold", marginBottom: "8px" }}>Query executed successfully.</div>
                      <div style={{ fontFamily: "Consolas, Monaco, monospace" }}>
                        {JSON.stringify(queryResult.rows, null, 2)}
                      </div>
                    </div>
  )}
                </div>}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", padding: "16px 24px", borderTop: "1px solid var(--border-color)" }}>
              <button
    type="button"
    onClick={() => {
      setIsQueryModalOpen(false);
      setQueryResult(null);
      setQueryError("");
    }}
    style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", cursor: "pointer", fontSize: "14px" }}
  >
                Close
              </button>
            </div>
          </div>
        </div>}

      {/* ==================== MODAL: DELETE TABLE CONFIRMATION ==================== */}
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
              <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: "bold", color: "var(--text-primary)" }}>
                Delete {dbName.startsWith("mongodb:") ? "Collection" : "Table"}
              </h3>
              <p style={{ margin: 0, fontSize: "14px", color: "var(--text-muted)", lineHeight: "1.5" }}>
                Are you sure you want to delete the {dbName.startsWith("mongodb:") ? "collection" : "table"} <strong style={{ color: "var(--text-primary)" }}>{tableToDelete}</strong>? This action is permanent and all data inside it will be lost forever.
              </p>
            </div>
            
            <div style={{ display: "flex", borderTop: "1px solid var(--border-color)", backgroundColor: "var(--bg-tertiary)" }}>
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setTableToDelete("");
                }}
                style={{ flex: 1, padding: "16px", background: "none", border: "none", borderRight: "1px solid var(--border-color)", cursor: "pointer", fontSize: "14px", fontWeight: "600", color: "var(--text-secondary)", outline: "none" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteTable}
                style={{ flex: 1, padding: "16px", background: "none", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: "bold", color: "#ef4444", outline: "none" }}
              >
                Delete {dbName.startsWith("mongodb:") ? "Collection" : "Table"}
              </button>
            </div>
          </div>
        </div>}

    </div>;
}
