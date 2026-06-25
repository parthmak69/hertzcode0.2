"use strict";
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "../../context/ToastContext";
import { getProjectsForUser, saveProjectsForUser } from "../../utils/projectStorage";

export default function RecycleBinPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState("");
  const [activeTab, setActiveTab] = useState("databases");
  
  // Backend recycled items (databases, tables)
  const [recycledDbs, setRecycledDbs] = useState([]);
  const [recycledTables, setRecycledTables] = useState([]);

  // Local recycled items (projects, files)
  const [recycledProjects, setRecycledProjects] = useState([]);
  const [recycledFiles, setRecycledFiles] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null); // { id, name, type, parentProjectName, parentProjectId }

  const loadRecycledItems = async (user) => {
    if (!user) return;
    setIsLoading(true);
    try {
      // 1. Load SQL/NoSQL databases & tables from backend
      const res = await fetch(`/api/database/recycle-bin/list?username=${encodeURIComponent(user)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.items) {
          setRecycledDbs(data.items.filter((item) => item.item_type === "database"));
          setRecycledTables(data.items.filter((item) => item.item_type === "table"));
        }
      }

      // 2. Load projects and files from localStorage
      const role = localStorage.getItem("currentUserRole") || "user";
      const projs = getProjectsForUser(user, role);
      
      // Recycled Projects
      const delProjects = projs.filter((p) => p.isDeleted);
      setRecycledProjects(delProjects);

      // Recycled Files (file.isDeleted === true, but parent project is active)
      const delFiles = [];
      projs.forEach((p) => {
        if (!p.isDeleted && Array.isArray(p.files)) {
          p.files.forEach((f) => {
            if (f.isDeleted) {
              delFiles.push({
                ...f,
                projectName: p.name,
                projectId: p.id,
              });
            }
          });
        }
      });
      setRecycledFiles(delFiles);
    } catch (err) {
      console.error("Failed to load recycled items:", err);
      showToast("Failed to load items from Recycle Bin.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const user = localStorage.getItem("currentUser") || localStorage.getItem("rememberedEmail") || "";
    setCurrentUser(user);
    if (user) {
      loadRecycledItems(user);
    }
  }, []);

  const handleRestore = async (item) => {
    try {
      if (item.type === "database" || item.type === "table") {
        const res = await fetch("/api/database/recycle-bin/restore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.id, username: currentUser }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showToast(`Restored "${item.name}" successfully!`, "success");
          loadRecycledItems(currentUser);
        } else {
          showToast(data.error || `Failed to restore ${item.type}`, "error");
        }
      } else if (item.type === "project") {
        const role = localStorage.getItem("currentUserRole") || "user";
        const projs = getProjectsForUser(currentUser, role);
        const updated = projs.map((p) => {
          if (p.id === item.id) {
            return { ...p, isDeleted: false, deletedAt: null };
          }
          return p;
        });
        saveProjectsForUser(updated, currentUser, role);
        showToast(`Restored CRUD project "${item.name}" successfully!`, "success");
        loadRecycledItems(currentUser);
      } else if (item.type === "file") {
        const role = localStorage.getItem("currentUserRole") || "user";
        const projs = getProjectsForUser(currentUser, role);
        const updated = projs.map((p) => {
          if (p.id === item.parentProjectId) {
            const updatedFiles = p.files.map((f) => {
              if (f.id === item.id) {
                return { ...f, isDeleted: false, deletedAt: null };
              }
              return f;
            });
            return { ...p, files: updatedFiles };
          }
          return p;
        });
        saveProjectsForUser(updated, currentUser, role);
        showToast(`Restored file "${item.name}" successfully!`, "success");
        loadRecycledItems(currentUser);
      }
    } catch (err) {
      console.error(err);
      showToast("Error restoring item.", "error");
    }
  };

  const confirmPermanentDelete = (id, name, type, parentProjectName = "", parentProjectId = "") => {
    if (currentUser !== "admin") {
      showToast("Only administrators are authorized to permanently delete items.", "warning");
      return;
    }
    setItemToDelete({ id, name, type, parentProjectName, parentProjectId });
    setIsDeleteModalOpen(true);
  };

  const handlePermanentDelete = async () => {
    if (!itemToDelete) return;
    try {
      if (itemToDelete.type === "database" || itemToDelete.type === "table") {
        const res = await fetch("/api/database/recycle-bin/permanent-delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: itemToDelete.id, username: currentUser }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showToast(`Permanently deleted ${itemToDelete.type} "${itemToDelete.name}"!`, "success");
          loadRecycledItems(currentUser);
        } else {
          showToast(data.error || "Failed to permanently delete item", "error");
        }
      } else if (itemToDelete.type === "project") {
        const role = localStorage.getItem("currentUserRole") || "user";
        const projs = getProjectsForUser(currentUser, role);
        const updated = projs.filter((p) => p.id !== itemToDelete.id);
        saveProjectsForUser(updated, currentUser, role);
        showToast(`Permanently deleted project "${itemToDelete.name}"!`, "success");
        loadRecycledItems(currentUser);
      } else if (itemToDelete.type === "file") {
        const role = localStorage.getItem("currentUserRole") || "user";
        const projs = getProjectsForUser(currentUser, role);
        const updated = projs.map((p) => {
          if (p.id === itemToDelete.parentProjectId) {
            const updatedFiles = p.files.filter((f) => f.id !== itemToDelete.id);
            return { ...p, files: updatedFiles };
          }
          return p;
        });
        saveProjectsForUser(updated, currentUser, role);
        showToast(`Permanently deleted file "${itemToDelete.name}"!`, "success");
        loadRecycledItems(currentUser);
      }
    } catch (err) {
      console.error(err);
      showToast("Error deleting item permanently.", "error");
    } finally {
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  const renderDatabases = () => (
    <div style={{ width: "100%", overflowX: "auto", border: "1px solid var(--border-color)", borderRadius: "8px" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid var(--border-color)", backgroundColor: "var(--bg-tertiary)" }}>
            <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600, width: "80px" }}>Sr</th>
            <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600 }}>Database Name</th>
            <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600, width: "160px" }}>Original Owner</th>
            <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600, width: "180px" }}>Deleted At</th>
            <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600, width: "220px" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {recycledDbs.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)" }}>
                No databases in Recycle Bin.
              </td>
            </tr>
          ) : (
            recycledDbs.map((item, idx) => (
              <tr key={item.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                <td style={{ padding: "14px 16px", color: "var(--text-primary)" }}>{idx + 1}</td>
                <td style={{ padding: "14px 16px", color: "var(--text-primary)", fontWeight: "bold" }}>
                  {item.item_name.startsWith("mongodb:") ? `${item.item_name.replace("mongodb:", "")} (MongoDB)` : `${item.item_name} (SQL)`}
                </td>
                <td style={{ padding: "14px 16px", color: "var(--text-primary)" }}>{item.original_owner}</td>
                <td style={{ padding: "14px 16px", color: "var(--text-primary)" }}>
                  {new Date(item.deleted_at).toLocaleString()}
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => handleRestore({ id: item.id, name: item.item_name, type: "database" })}
                      style={{ backgroundColor: "#10b981", color: "white", border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => confirmPermanentDelete(item.id, item.item_name, "database")}
                      disabled={currentUser !== "admin"}
                      style={{
                        backgroundColor: currentUser === "admin" ? "#ef4444" : "var(--bg-tertiary)",
                        color: currentUser === "admin" ? "white" : "var(--text-muted)",
                        border: "none",
                        padding: "6px 12px",
                        borderRadius: "4px",
                        cursor: currentUser === "admin" ? "pointer" : "not-allowed",
                        fontSize: "12px",
                        fontWeight: "bold",
                      }}
                      title={currentUser !== "admin" ? "Only administrator can permanently delete" : "Delete permanently"}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  const renderTables = () => (
    <div style={{ width: "100%", overflowX: "auto", border: "1px solid var(--border-color)", borderRadius: "8px" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid var(--border-color)", backgroundColor: "var(--bg-tertiary)" }}>
            <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600, width: "80px" }}>Sr</th>
            <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600 }}>Table Name</th>
            <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600 }}>Parent DB</th>
            <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600, width: "160px" }}>Original Owner</th>
            <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600, width: "180px" }}>Deleted At</th>
            <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600, width: "220px" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {recycledTables.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)" }}>
                No tables in Recycle Bin.
              </td>
            </tr>
          ) : (
            recycledTables.map((item, idx) => (
              <tr key={item.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                <td style={{ padding: "14px 16px", color: "var(--text-primary)" }}>{idx + 1}</td>
                <td style={{ padding: "14px 16px", color: "var(--text-primary)", fontWeight: "bold" }}>{item.item_name}</td>
                <td style={{ padding: "14px 16px", color: "var(--text-primary)" }}>{item.parent_context}</td>
                <td style={{ padding: "14px 16px", color: "var(--text-primary)" }}>{item.original_owner}</td>
                <td style={{ padding: "14px 16px", color: "var(--text-primary)" }}>
                  {new Date(item.deleted_at).toLocaleString()}
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => handleRestore({ id: item.id, name: item.item_name, type: "table" })}
                      style={{ backgroundColor: "#10b981", color: "white", border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => confirmPermanentDelete(item.id, item.item_name, "table")}
                      disabled={currentUser !== "admin"}
                      style={{
                        backgroundColor: currentUser === "admin" ? "#ef4444" : "var(--bg-tertiary)",
                        color: currentUser === "admin" ? "white" : "var(--text-muted)",
                        border: "none",
                        padding: "6px 12px",
                        borderRadius: "4px",
                        cursor: currentUser === "admin" ? "pointer" : "not-allowed",
                        fontSize: "12px",
                        fontWeight: "bold",
                      }}
                      title={currentUser !== "admin" ? "Only administrator can permanently delete" : "Delete permanently"}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  const renderProjects = () => (
    <div style={{ width: "100%", overflowX: "auto", border: "1px solid var(--border-color)", borderRadius: "8px" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid var(--border-color)", backgroundColor: "var(--bg-tertiary)" }}>
            <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600, width: "80px" }}>Sr</th>
            <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600 }}>Project Name</th>
            <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600 }}>Directory</th>
            <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600, width: "180px" }}>Deleted At</th>
            <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600, width: "220px" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {recycledProjects.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)" }}>
                No CRUD projects in Recycle Bin.
              </td>
            </tr>
          ) : (
            recycledProjects.map((item, idx) => (
              <tr key={item.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                <td style={{ padding: "14px 16px", color: "var(--text-primary)" }}>{idx + 1}</td>
                <td style={{ padding: "14px 16px", color: "var(--text-primary)", fontWeight: "bold" }}>{item.name}</td>
                <td style={{ padding: "14px 16px", color: "var(--text-primary)", fontFamily: "monospace", fontSize: "12px" }}>{item.directory}</td>
                <td style={{ padding: "14px 16px", color: "var(--text-primary)" }}>
                  {item.deletedAt ? new Date(item.deletedAt).toLocaleString() : "Unknown"}
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => handleRestore({ id: item.id, name: item.name, type: "project" })}
                      style={{ backgroundColor: "#10b981", color: "white", border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => confirmPermanentDelete(item.id, item.name, "project")}
                      disabled={currentUser !== "admin"}
                      style={{
                        backgroundColor: currentUser === "admin" ? "#ef4444" : "var(--bg-tertiary)",
                        color: currentUser === "admin" ? "white" : "var(--text-muted)",
                        border: "none",
                        padding: "6px 12px",
                        borderRadius: "4px",
                        cursor: currentUser === "admin" ? "pointer" : "not-allowed",
                        fontSize: "12px",
                        fontWeight: "bold",
                      }}
                      title={currentUser !== "admin" ? "Only administrator can permanently delete" : "Delete permanently"}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  const renderFiles = () => (
    <div style={{ width: "100%", overflowX: "auto", border: "1px solid var(--border-color)", borderRadius: "8px" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid var(--border-color)", backgroundColor: "var(--bg-tertiary)" }}>
            <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600, width: "80px" }}>Sr</th>
            <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600 }}>File Name</th>
            <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600 }}>Parent Project</th>
            <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600, width: "180px" }}>Deleted At</th>
            <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600, width: "220px" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {recycledFiles.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)" }}>
                No CRUD files in Recycle Bin.
              </td>
            </tr>
          ) : (
            recycledFiles.map((item, idx) => (
              <tr key={item.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                <td style={{ padding: "14px 16px", color: "var(--text-primary)" }}>{idx + 1}</td>
                <td style={{ padding: "14px 16px", color: "var(--text-primary)", fontWeight: "bold" }}>{item.name}</td>
                <td style={{ padding: "14px 16px", color: "var(--text-primary)" }}>{item.projectName}</td>
                <td style={{ padding: "14px 16px", color: "var(--text-primary)" }}>
                  {item.deletedAt ? new Date(item.deletedAt).toLocaleString() : "Unknown"}
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => handleRestore({ id: item.id, name: item.name, type: "file", parentProjectId: item.projectId })}
                      style={{ backgroundColor: "#10b981", color: "white", border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => confirmPermanentDelete(item.id, item.name, "file", item.projectName, item.projectId)}
                      disabled={currentUser !== "admin"}
                      style={{
                        backgroundColor: currentUser === "admin" ? "#ef4444" : "var(--bg-tertiary)",
                        color: currentUser === "admin" ? "white" : "var(--text-muted)",
                        border: "none",
                        padding: "6px 12px",
                        borderRadius: "4px",
                        cursor: currentUser === "admin" ? "pointer" : "not-allowed",
                        fontSize: "12px",
                        fontWeight: "bold",
                      }}
                      title={currentUser !== "admin" ? "Only administrator can permanently delete" : "Delete permanently"}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

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

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* SUB NAV BAR BANNER */}
      <div style={{ height: "40px", backgroundColor: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", color: "white", fontSize: "13px", fontWeight: "600", flexShrink: 0, boxShadow: "0 2px 6px rgba(0,0,0,0.05)" }}>
        <span style={{ fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.8px" }}>Recycle Bin</span>
        <span style={{ color: "rgba(255,255,255,0.8)" }}>Restore or Erase Deleted Assets</span>
      </div>

      <main style={{ flex: 1, padding: "24px", overflowY: "auto", backgroundColor: "var(--bg-primary)" }}>
        <div style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "24px", boxShadow: "var(--shadow-md)" }}>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "16px", marginBottom: "20px" }}>
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "var(--text-primary)", margin: 0 }}>Recycle Bin</h2>
              <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "4px 0 0 0" }}>
                Databases, tables, projects, and files can be restored here. Only <strong>admin</strong> can permanently delete.
              </p>
            </div>
            {currentUser !== "admin" && (
              <span style={{ fontSize: "12px", color: "#eab308", backgroundColor: "rgba(234, 179, 8, 0.1)", border: "1px solid rgba(234, 179, 8, 0.2)", padding: "6px 12px", borderRadius: "6px", fontWeight: "600" }}>
                ⚠️ Logged in as regular user (Permanent delete disabled)
              </span>
            )}
          </div>

          {/* Navigation Tabs */}
          <div style={{ display: "flex", borderBottom: "1.5px solid var(--border-color)", marginBottom: "24px", gap: "10px" }}>
            <button onClick={() => setActiveTab("databases")} style={getTabStyle("databases")}>
              Databases ({recycledDbs.length})
            </button>
            <button onClick={() => setActiveTab("tables")} style={getTabStyle("tables")}>
              Tables ({recycledTables.length})
            </button>
            <button onClick={() => setActiveTab("projects")} style={getTabStyle("projects")}>
              CRUD Projects ({recycledProjects.length})
            </button>
            <button onClick={() => setActiveTab("files")} style={getTabStyle("files")}>
              CRUD Files ({recycledFiles.length})
            </button>
          </div>

          {isLoading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
              Loading deleted items...
            </div>
          ) : (
            <>
              {activeTab === "databases" && renderDatabases()}
              {activeTab === "tables" && renderTables()}
              {activeTab === "projects" && renderProjects()}
              {activeTab === "files" && renderFiles()}
            </>
          )}

        </div>
      </main>

      {/* ==================== MODAL: CONFIRM PERMANENT DELETE ==================== */}
      {isDeleteModalOpen && itemToDelete && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "12px", width: "450px", maxWidth: "90vw", boxShadow: "var(--shadow-lg)", overflow: "hidden" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "30px 24px", textAlign: "center" }}>
              <div style={{ width: "56px", height: "56px", borderRadius: "50%", backgroundColor: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444", marginBottom: "20px" }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: "bold", color: "var(--text-primary)" }}>Permanent Deletion</h3>
              <p style={{ margin: 0, fontSize: "14px", color: "var(--text-muted)", lineHeight: "1.5" }}>
                Are you sure you want to permanently delete the {itemToDelete.type} <strong style={{ color: "var(--text-primary)" }}>{itemToDelete.name}</strong>?
                <br />
                <span style={{ color: "#ef4444", fontWeight: "bold" }}>This action is irreversible and all associated data will be lost forever.</span>
              </p>
            </div>
            
            <div style={{ display: "flex", borderTop: "1px solid var(--border-color)", backgroundColor: "var(--bg-tertiary)" }}>
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setItemToDelete(null);
                }}
                style={{ flex: 1, padding: "16px", background: "none", border: "none", borderRight: "1px solid var(--border-color)", cursor: "pointer", fontSize: "14px", fontWeight: "600", color: "var(--text-secondary)", outline: "none" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePermanentDelete}
                style={{ flex: 1, padding: "16px", background: "none", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: "bold", color: "#ef4444", outline: "none" }}
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
