"use strict";
"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useToast } from "../../../../../context/ToastContext";
export default function CrudLiveAdminPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const params = useParams();
  const projectId = params?.projectId;
  const fileId = params?.fileId;
  const [project, setProject] = useState(null);
  const [file, setFile] = useState(null);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showViewModal, setShowViewModal] = useState(null);
  useEffect(() => {
    const stored = localStorage.getItem("crudProjects");
    if (stored) {
      try {
        const projs = JSON.parse(stored);
        const foundProj = projs.find((p) => p.id === projectId);
        if (foundProj) {
          setProject(foundProj);
          const foundFile = foundProj.files.find((f) => f.id === fileId);
          if (foundFile) {
            setFile(foundFile);
            const initialForm = {};
            foundFile.columns.forEach((col) => {
              initialForm[col.name] = col.type === "checkbox" ? false : col.type === "number" ? 0 : "";
            });
            setForm(initialForm);
          }
        }
      } catch (e) {
        console.error("Failed to parse projects", e);
      }
    }
  }, [projectId, fileId]);
  const fetchRecords = async () => {
    if (!project || !file) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/database/tables/rows?dbName=${encodeURIComponent(project.databaseName)}&tableName=${encodeURIComponent(file.tableName)}`
      );
      const data = await res.json();
      if (data.success) {
        setItems(data.rows || []);
      } else {
        console.error("Error fetching records:", data.error);
      }
    } catch (err) {
      console.error("Network error fetching records:", err);
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    if (project && file) {
      fetchRecords();
    }
  }, [project, file]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!project || !file) return;
    const method = editingId ? "PUT" : "POST";
    const payload = {
      dbName: project.databaseName,
      tableName: file.tableName,
      id: editingId,
      record: form
    };
    try {
      const res = await fetch("/api/database/tables/rows", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(editingId ? "Record updated successfully!" : "Record inserted successfully!", "success");
        const resetForm = {};
        file.columns.forEach((col) => {
          resetForm[col.name] = col.type === "checkbox" ? false : col.type === "number" ? 0 : "";
        });
        setForm(resetForm);
        setEditingId(null);
        fetchRecords();
      } else {
        showToast("Failed to save record: " + (data.error || "Unknown error"), "error");
      }
    } catch (err) {
      showToast("Error saving record: " + err.message, "error");
    }
  };
  const handleEdit = (item) => {
    setEditingId(item.id || item._id);
    const updatedForm = {};
    if (file) {
      file.columns.forEach((col) => {
        updatedForm[col.name] = item[col.name] !== void 0 ? item[col.name] : col.type === "checkbox" ? false : col.type === "number" ? 0 : "";
      });
      setForm(updatedForm);
    }
  };
  const handleDelete = async (id) => {
    if (!project || !file) return;
    if (!confirm("Are you sure you want to delete this record?")) return;
    try {
      const res = await fetch(
        `/api/database/tables/rows?dbName=${encodeURIComponent(project.databaseName)}&tableName=${encodeURIComponent(file.tableName)}&id=${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("Record deleted successfully", "success");
        fetchRecords();
      } else {
        showToast("Failed to delete record: " + (data.error || "Unknown error"), "error");
      }
    } catch (err) {
      showToast("Error deleting record: " + err.message, "error");
    }
  };
  const filteredItems = items.filter((item) => {
    return Object.values(item).some(
      (val) => String(val).toLowerCase().includes(searchQuery.toLowerCase())
    );
  });
  if (!project || !file) {
    return <div style={{ padding: "24px", color: "var(--text-primary)" }}>Loading Live Admin Panel...</div>;
  }
  const isMongo = project.databaseName.toLowerCase().startsWith("mongodb:");
  return <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      
      {
    /* SUB NAV BAR BANNER */
  }
      <div style={{ height: "40px", backgroundColor: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", color: "white", fontSize: "13px", fontWeight: "600", flexShrink: 0, boxShadow: "0 2px 6px rgba(0,0,0,0.05)" }}>
        <span style={{ fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.8px", display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#10b981" }} />
          Live Admin Panel: {file.name}
        </span>
        <span style={{ color: "rgba(255,255,255,0.8)" }}>
          Generated for project: {project.name} · Database: {project.databaseName}
        </span>
      </div>

      <main style={{ flex: 1, padding: "24px", overflowY: "auto", backgroundColor: "#f8fafc" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "1280px", margin: "0 auto" }}>
          
          {
    /* Header Action bar */
  }
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button
    onClick={() => router.push(`/dashboard/crud/${projectId}`)}
    style={{ background: "none", border: "none", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", color: "#64748b", fontWeight: "bold", fontSize: "14px", padding: 0 }}
  >
              ← Back to Project Files
            </button>
            <span style={{ fontSize: "13px", color: "#64748b", fontWeight: "bold", padding: "4px 10px", backgroundColor: "#e2e8f0", borderRadius: "6px" }}>
              Connected to: {isMongo ? "MongoDB" : "MySQL"} ({file.tableName})
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "350px 1fr", gap: "24px", alignItems: "flex-start" }}>
            
            {
    /* 1. Dynamic Form Panel */
  }
            <div style={{ backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "20px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#0f172a", borderBottom: "1px solid #f1f5f9", paddingBottom: "12px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "6px" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                {editingId ? "Edit Record" : "Create New Record"}
              </h3>

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {file.columns.filter((c) => c.isFormCol !== false).map((col) => {
    if (col.type === "checkbox") {
      return <label key={col.id} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", padding: "4px 0" }}>
                        <input
        type="checkbox"
        checked={form[col.name] || false}
        onChange={(e) => setForm({ ...form, [col.name]: e.target.checked })}
        style={{ width: "16px", height: "16px", accentColor: "#3b82f6" }}
      />
                        <span style={{ fontSize: "13.5px", fontWeight: "600", color: "#334155" }}>{col.name}</span>
                      </label>;
    } else if (col.type === "textarea") {
      return <div key={col.id} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <label style={{ fontSize: "13px", fontWeight: "600", color: "#475569" }}>
                          {col.name} {col.isRequired && <span style={{ color: "#ef4444" }}>*</span>}
                        </label>
                        <textarea
        rows={4}
        value={form[col.name] || ""}
        onChange={(e) => setForm({ ...form, [col.name]: e.target.value })}
        required={col.isRequired}
        style={{ padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13.5px", outline: "none", resize: "vertical" }}
      />
                      </div>;
    } else if (col.type === "select") {
      return <div key={col.id} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <label style={{ fontSize: "13px", fontWeight: "600", color: "#475569" }}>
                          {col.name} {col.isRequired && <span style={{ color: "#ef4444" }}>*</span>}
                        </label>
                        <select
        value={form[col.name] || ""}
        onChange={(e) => setForm({ ...form, [col.name]: e.target.value })}
        required={col.isRequired}
        style={{ padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", backgroundColor: "white", fontSize: "13.5px", outline: "none" }}
      >
                          <option value="">-- Select Option --</option>
                          {col.selectOptions?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </div>;
    } else {
      return <div key={col.id} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <label style={{ fontSize: "13px", fontWeight: "600", color: "#475569" }}>
                          {col.name} {col.isRequired && <span style={{ color: "#ef4444" }}>*</span>}
                        </label>
                        <input
        type={col.type === "number" ? "number" : col.type === "email" ? "email" : col.type === "date" ? "date" : "text"}
        value={form[col.name] || ""}
        onChange={(e) => setForm({ ...form, [col.name]: e.target.value })}
        required={col.isRequired}
        style={{ padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13.5px", outline: "none" }}
      />
                      </div>;
    }
  })}

                <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                  <button
    type="submit"
    style={{ flex: 1, backgroundColor: "#3b82f6", color: "white", border: "none", padding: "10px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", fontSize: "14px" }}
  >
                    {editingId ? "Update Record" : "Save Record"}
                  </button>
                  {editingId && <button
    type="button"
    onClick={() => {
      setEditingId(null);
      const resetForm = {};
      file.columns.forEach((col) => {
        resetForm[col.name] = col.type === "checkbox" ? false : col.type === "number" ? 0 : "";
      });
      setForm(resetForm);
    }}
    style={{ backgroundColor: "#64748b", color: "white", border: "none", padding: "10px 14px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", fontSize: "14px" }}
  >
                      Cancel
                    </button>}
                </div>
              </form>
            </div>

            {
    /* 2. Live Data Grid Table */
  }
            <div style={{ backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "20px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)" }}>
              
              {
    /* Search & Statistics */
  }
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", gap: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#0f172a", margin: 0 }}>
                    Live Table Rows ({filteredItems.length})
                  </h3>
                  <button
    onClick={fetchRecords}
    style={{ background: "none", border: "none", color: "#3b82f6", cursor: "pointer", fontSize: "12.5px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "4px" }}
  >
                    ↻ Refresh
                  </button>
                </div>
                <input
    type="text"
    placeholder="Search records..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    style={{ width: "250px", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px", outline: "none" }}
  />
              </div>

              {isLoading ? <div style={{ padding: "60px", textAlign: "center", color: "#64748b" }}>
                  Fetching live table records from database...
                </div> : filteredItems.length === 0 ? <div style={{ padding: "60px", textAlign: "center", color: "#64748b", border: "1px dashed #e2e8f0", borderRadius: "8px" }}>
                  No records found in database table. Use the left form to add your first record!
                </div> : <div style={{ width: "100%", overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13.5px" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                        <th style={{ padding: "12px 16px", color: "#475569", fontWeight: "bold", width: "50px" }}>#</th>
                        {
    /* Always show primary key / ID field */
  }
                        <th style={{ padding: "12px 16px", color: "#475569", fontWeight: "bold", fontFamily: "monospace" }}>
                          {isMongo ? "_id" : "id"}
                        </th>
                        {file.columns.filter((c) => c.isListCol !== false).map((col) => <th key={col.id} style={{ padding: "12px 16px", color: "#475569", fontWeight: "bold", fontFamily: "monospace" }}>
                            {col.name}
                          </th>)}
                        <th style={{ padding: "12px 16px", color: "#475569", fontWeight: "bold", width: "140px" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map((item, idx) => <tr key={item._id || item.id || idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                          <td style={{ padding: "12px 16px", color: "#64748b" }}>{idx + 1}</td>
                          <td style={{ padding: "12px 16px", color: "#0f172a", fontFamily: "monospace", fontSize: "12px", maxWidth: "100px", overflow: "hidden", textOverflow: "ellipsis" }} title={String(item._id || item.id)}>
                            {String(item._id || item.id)}
                          </td>
                          {file.columns.filter((c) => c.isListCol !== false).map((col) => {
    const val = item[col.name];
    let displayVal = "";
    if (val === null || val === void 0) {
      displayVal = "NULL";
    } else if (typeof val === "object") {
      displayVal = JSON.stringify(val);
    } else {
      displayVal = String(val);
    }
    return <td key={col.id} style={{
      padding: "12px 16px",
      color: val === null ? "#94a3b8" : "#334155",
      fontStyle: val === null ? "italic" : "normal",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      maxWidth: "200px"
    }}>
                                {displayVal}
                              </td>;
  })}
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ display: "flex", gap: "8px" }}>
                              {file.settings.viewButton && <button
    onClick={() => setShowViewModal(item)}
    style={{ border: "none", background: "none", cursor: "pointer", color: "#3b82f6", fontWeight: "bold", padding: 0 }}
  >
                                  View
                                </button>}
                              {file.settings.editButton && <button
    onClick={() => handleEdit(item)}
    style={{ border: "none", background: "none", cursor: "pointer", color: "#d97706", fontWeight: "bold", padding: 0 }}
  >
                                  Edit
                                </button>}
                              {file.settings.deleteButton && <button
    onClick={() => handleDelete(item._id || item.id)}
    style={{ border: "none", background: "none", cursor: "pointer", color: "#ef4444", fontWeight: "bold", padding: 0 }}
  >
                                  Delete
                                </button>}
                            </div>
                          </td>
                        </tr>)}
                    </tbody>
                  </table>
                </div>}
            </div>

          </div>

        </div>
      </main>

      {
    /* View Details Modal */
  }
      {showViewModal && <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1e3 }}>
          <div style={{ backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "10px", width: "500px", maxWidth: "90vw", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #e2e8f0" }}>
              <h3 style={{ fontWeight: "bold", fontSize: "15px", color: "#0f172a" }}>Record Details</h3>
              <button onClick={() => setShowViewModal(null)} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#64748b" }}>✕</button>
            </div>
            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
                <span style={{ flex: 1, fontWeight: "bold", fontSize: "13px", color: "#475569" }}>{isMongo ? "_id" : "id"}:</span>
                <span style={{ flex: 2, fontSize: "13.5px", fontFamily: "monospace" }}>{String(showViewModal._id || showViewModal.id)}</span>
              </div>
              {file.columns.map((col) => <div key={col.id} style={{ display: "flex", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
                  <span style={{ flex: 1, fontWeight: "bold", fontSize: "13px", color: "#475569" }}>{col.name}:</span>
                  <span style={{ flex: 2, fontSize: "13.5px", color: "#334155" }}>
                    {String(showViewModal[col.name] !== void 0 ? showViewModal[col.name] : "")}
                  </span>
                </div>)}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 20px", borderTop: "1px solid #e2e8f0" }}>
              <button onClick={() => setShowViewModal(null)} style={{ backgroundColor: "#64748b", color: "white", border: "none", padding: "6px 16px", borderRadius: "4px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}>
                Close
              </button>
            </div>
          </div>
        </div>}

    </div>;
}
