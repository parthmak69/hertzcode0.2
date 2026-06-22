"use strict";
"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
export default function CrudFilesListPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.projectId;
  const [project, setProject] = useState(null);
  const [allProjects, setAllProjects] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [fileName, setFileName] = useState("");
  const [tableName, setTableName] = useState("");
  const [availableTables, setAvailableTables] = useState([]);
  const [selectedImportTable, setSelectedImportTable] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);
  const fetchAvailableTables = async (dbName) => {
    try {
      const res = await fetch(`/api/database/tables?dbName=${encodeURIComponent(dbName)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.tables) {
          setAvailableTables(data.tables.map((t) => t.name));
        }
      }
    } catch (err) {
      console.error("Failed to fetch tables for import:", err);
    }
  };
  useEffect(() => {
    const stored = localStorage.getItem("crudProjects");
    if (stored) {
      try {
        const projs = JSON.parse(stored);
        setAllProjects(projs);
        const found = projs.find((p) => p.id === projectId);
        if (found) {
          setProject(found);
          if (found.databaseName) {
            fetchAvailableTables(found.databaseName);
          }
        }
      } catch (e) {
        console.error("Failed to parse crudProjects", e);
      }
    }
  }, [projectId]);
  const handleCreateFile = async (e) => {
    e.preventDefault();
    if (!project || !fileName.trim()) return;
    const formattedFileName = fileName.trim().toLowerCase().replace(/\s+/g, "_");
    const formattedTableName = tableName.trim().toLowerCase().replace(/\s+/g, "_") || selectedImportTable || formattedFileName;
    let columns = [];
    if (selectedImportTable) {
      try {
        const res = await fetch(`/api/database/tables?dbName=${encodeURIComponent(project.databaseName)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.tables) {
            const matchedTbl = data.tables.find((t) => t.name === selectedImportTable);
            if (matchedTbl && matchedTbl.columns) {
              columns = matchedTbl.columns.map((c) => {
                let mappedType = "text";
                const lowerType = c.type.toLowerCase();
                if (lowerType.includes("int") || lowerType.includes("decimal") || lowerType.includes("float")) {
                  mappedType = "number";
                } else if (lowerType.includes("date") || lowerType.includes("time")) {
                  mappedType = "date";
                } else if (lowerType.includes("text")) {
                  mappedType = "textarea";
                } else if (lowerType.includes("bit") || lowerType.includes("boolean")) {
                  mappedType = "checkbox";
                }
                return {
                  id: "col_" + Math.random().toString(36).substr(2, 9),
                  name: c.name,
                  type: mappedType,
                  isRequired: false,
                  isUnique: c.index === "UNIQUE",
                  isListCol: true,
                  isFormCol: true
                };
              });
            }
          }
        }
      } catch (err) {
        console.error("Failed to import table columns", err);
      }
    }
    const newFile = {
      id: "file_" + Date.now(),
      name: formattedFileName,
      tableName: formattedTableName,
      dbConnectCode: `// Connect to ${project.databaseName}`,
      createdAt: (/* @__PURE__ */ new Date()).toLocaleDateString(),
      columns: columns.length > 0 ? columns : [
        { id: "col_1", name: "title", type: "text", isRequired: true, isUnique: false, isListCol: true, isFormCol: true },
        { id: "col_2", name: "description", type: "textarea", isRequired: false, isUnique: false, isListCol: true, isFormCol: true }
      ],
      settings: {
        createUsingAi: false,
        showCreated: true,
        showModified: true,
        viewButton: true,
        editButton: true,
        duplicateButton: false,
        deleteButton: true,
        excelImport: true,
        excelExport: true,
        recycleBin: false
      }
    };
    const updatedFiles = [...project.files || [], newFile];
    const updatedProject = { ...project, files: updatedFiles };
    const updatedProjectsList = allProjects.map((p) => p.id === projectId ? updatedProject : p);
    setProject(updatedProject);
    setAllProjects(updatedProjectsList);
    localStorage.setItem("crudProjects", JSON.stringify(updatedProjectsList));
    setIsModalOpen(false);
    setFileName("");
    setTableName("");
    setSelectedImportTable("");
  };
  const confirmDeleteFile = (fileId, name) => {
    setFileToDelete({ id: fileId, name });
    setIsDeleteModalOpen(true);
  };
  const handleDeleteFile = () => {
    if (!project || !fileToDelete) return;
    const updatedFiles = project.files.filter((f) => f.id !== fileToDelete.id);
    const updatedProject = { ...project, files: updatedFiles };
    const updatedProjectsList = allProjects.map((p) => p.id === projectId ? updatedProject : p);
    setProject(updatedProject);
    setAllProjects(updatedProjectsList);
    localStorage.setItem("crudProjects", JSON.stringify(updatedProjectsList));
    setIsDeleteModalOpen(false);
    setFileToDelete(null);
  };
  if (!project) {
    return <div style={{ padding: "24px", color: "var(--text-primary)" }}>Loading project details...</div>;
  }
  return <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      
      {
    /* SUB NAV BAR BANNER */
  }
      <div style={{ height: "40px", backgroundColor: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", color: "white", fontSize: "13px", fontWeight: "600", flexShrink: 0, boxShadow: "0 2px 6px rgba(0,0,0,0.05)" }}>
        <span style={{ fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.8px" }}>CRUD Builder</span>
        <span style={{ color: "rgba(255,255,255,0.8)" }}>Project / {project.name}</span>
      </div>

      <main style={{ flex: 1, padding: "24px", overflowY: "auto", backgroundColor: "var(--bg-primary)" }}>
        <div style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "24px", boxShadow: "var(--shadow-md)" }}>
          
          <div style={{ marginBottom: "16px" }}>
            <button
    onClick={() => router.push("/dashboard/crud")}
    style={{ background: "none", border: "none", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", color: "var(--text-muted)", fontWeight: "bold", fontSize: "14px", padding: 0 }}
  >
              ← Back to Projects
            </button>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "16px", marginBottom: "20px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "var(--text-primary)" }}>Files in project &quot;{project.name}&quot;:</h2>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
    onClick={() => window.open(`/dashboard/crud/${projectId}/admin-portal/login`, "_blank")}
    style={{ backgroundColor: "#10b981", color: "white", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}
  >
                View Admin Panel
              </button>
              <button
    onClick={() => router.push(`/dashboard/crud/${projectId}/builder`)}
    style={{ backgroundColor: "var(--bg-tertiary)", border: "1px solid var(--border-color)", color: "var(--text-primary)", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}
  >
                Launch Advanced UI Builder
              </button>
              <button
    onClick={() => setIsModalOpen(true)}
    style={{ backgroundColor: "#3b82f6", color: "white", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}
  >
                Add CRUD File
              </button>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", fontSize: "14px", color: "var(--text-muted)" }}>
            <div>
              Show <select style={{ padding: "6px 12px", border: "1px solid var(--border-color)", borderRadius: "4px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)" }}><option>50</option></select> entries
            </div>
            <div>Search: <input type="text" style={{ padding: "6px 12px", border: "1px solid var(--border-color)", borderRadius: "4px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", outline: "none" }} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
          </div>

          <div style={{ width: "100%", overflowX: "auto", border: "1px solid var(--border-color)", borderRadius: "8px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border-color)", backgroundColor: "var(--bg-tertiary)" }}>
                  <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600, width: "80px" }}>Sr</th>
                  <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600 }}>File Name</th>
                  <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600 }}>Database Table</th>
                  <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600 }}>Created Date</th>
                  <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600, width: "180px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {!project.files || project.files.length === 0 ? <tr>
                    <td colSpan={5} style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)" }}>
                      No files created yet. Click &quot;Add CRUD File&quot; to start!
                    </td>
                  </tr> : project.files.filter((file) => file.name.toLowerCase().includes(searchQuery.toLowerCase())).map((file, idx) => <tr key={file.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                        <td style={{ padding: "14px 16px", color: "var(--text-primary)" }}>{idx + 1}</td>
                        <td style={{ padding: "14px 16px" }}>
                          <button
    onClick={() => router.push(`/dashboard/crud/${projectId}/${file.id}`)}
    style={{ background: "none", border: "none", color: "#0ea5e9", textDecoration: "underline", cursor: "pointer", fontSize: "14px", fontWeight: "500", padding: 0 }}
  >
                            {file.name}
                          </button>
                        </td>
                        <td style={{ padding: "14px 16px", color: "var(--text-primary)" }}>{file.tableName}</td>
                        <td style={{ padding: "14px 16px", color: "var(--text-primary)" }}>{file.createdAt}</td>
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button
    onClick={() => window.open(`/dashboard/crud/${projectId}/admin-portal/login`, "_blank")}
    style={{ border: "none", background: "none", cursor: "pointer", padding: "6px", color: "#10b981", display: "inline-flex", alignItems: "center", gap: "4px", fontWeight: "bold" }}
    title="View Branded Admin Portal"
  >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                              </svg>
                              View Admin Panel
                            </button>
                            <button
    onClick={() => router.push(`/dashboard/crud/${projectId}/${file.id}`)}
    style={{ border: "none", background: "none", cursor: "pointer", padding: "6px", color: "#f59e0b", display: "inline-flex", alignItems: "center", gap: "4px" }}
    title="Configure UI Builder"
  >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <circle cx="12" cy="12" r="3" />
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l-.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                              </svg>
                              Build UI
                            </button>
                             <button
    onClick={() => confirmDeleteFile(file.id, file.name)}
    style={{ border: "none", background: "none", cursor: "pointer", padding: "6px", color: "#ef4444", display: "inline-flex", alignItems: "center" }}
    title="Delete File"
  >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
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
    /* ==================== MODAL: ADD CRUD FILE ==================== */
  }
      {isModalOpen && <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1e3 }}>
          <div style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "8px", width: "600px", maxWidth: "90vw", boxShadow: "var(--shadow-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--border-color)" }}>
              <h3 style={{ fontWeight: "bold", fontSize: "16px", color: "var(--text-primary)" }}>Add CRUD File</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
            </div>
            <form onSubmit={handleCreateFile}>
              <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "18px" }}>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-muted)" }}>File / Module Name (e.g. Products):</label>
                  <input
    type="text"
    placeholder="Products"
    required
    value={fileName}
    onChange={(e) => setFileName(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
    style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border-color)", borderRadius: "6px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "14px", outline: "none" }}
  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-muted)" }}>Database Table Name:</label>
                  {availableTables.length > 0 ? <select
    value={tableName}
    required
    onChange={(e) => {
      const val = e.target.value;
      setTableName(val);
      setSelectedImportTable(val);
    }}
    style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border-color)", borderRadius: "6px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "14px", outline: "none" }}
  >
                      <option value="">-- Select Database Table --</option>
                      {availableTables.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select> : <input
    type="text"
    placeholder="product"
    value={tableName}
    onChange={(e) => setTableName(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
    style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border-color)", borderRadius: "6px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "14px", outline: "none" }}
  />}
                </div>

                {availableTables.length > 0 && <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-muted)" }}>Import Columns from Database Table:</label>
                    <select
    value={selectedImportTable}
    onChange={(e) => setSelectedImportTable(e.target.value)}
    style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border-color)", borderRadius: "6px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "14px", outline: "none" }}
  >
                      <option value="">-- Do Not Import (Create Sample Columns) --</option>
                      {availableTables.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>}

              </div>
              
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", padding: "16px 24px", borderTop: "1px solid var(--border-color)" }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", cursor: "pointer", fontSize: "14px" }}>Close</button>
                <button type="submit" style={{ padding: "8px 16px", borderRadius: "6px", border: "none", backgroundColor: "#3b82f6", color: "white", cursor: "pointer", fontSize: "14px", fontWeight: "bold" }}>Create File</button>
              </div>
            </form>
          </div>
        </div>}

      {/* ==================== MODAL: DELETE FILE CONFIRMATION ==================== */}
      {isDeleteModalOpen && fileToDelete && <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1e3 }}>
          <div style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "12px", width: "450px", maxWidth: "90vw", boxShadow: "var(--shadow-lg)", overflow: "hidden" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "30px 24px", textAlign: "center" }}>
              <div style={{ width: "56px", height: "56px", borderRadius: "50%", backgroundColor: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444", marginBottom: "20px" }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: "bold", color: "var(--text-primary)" }}>Delete CRUD File</h3>
              <p style={{ margin: 0, fontSize: "14px", color: "var(--text-muted)", lineHeight: "1.5" }}>
                Are you sure you want to delete the CRUD file <strong style={{ color: "var(--text-primary)" }}>{fileToDelete.name}</strong>? This action is permanent and all configurations for this file will be lost forever.
              </p>
            </div>
            
            <div style={{ display: "flex", borderTop: "1px solid var(--border-color)", backgroundColor: "var(--bg-tertiary)" }}>
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setFileToDelete(null);
                }}
                style={{ flex: 1, padding: "16px", background: "none", border: "none", borderRight: "1px solid var(--border-color)", cursor: "pointer", fontSize: "14px", fontWeight: "600", color: "var(--text-secondary)", outline: "none" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteFile}
                style={{ flex: 1, padding: "16px", background: "none", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: "bold", color: "#ef4444", outline: "none" }}
              >
                Delete File
              </button>
            </div>
          </div>
        </div>}

    </div>;
}
