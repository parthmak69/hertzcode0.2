"use client";
"use strict";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getProjectsForUser, saveProjectsForUser } from "../../utils/projectStorage";
import { databaseService } from "../../../services/databaseService";
import { crudService } from "../../../services/crudService";
export default function CrudProjectsListPage() {
  const [projects, setProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [directory, setDirectory] = useState("");
  const [databaseName, setDatabaseName] = useState("");
  const [connectFolder, setConnectFolder] = useState("lib");
  const [userDatabases, setUserDatabases] = useState([]);
  const router = useRouter();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [currentUser, setCurrentUser] = useState("");
  const [userRole, setUserRole] = useState("user");
  useEffect(() => {
    const user = localStorage.getItem("currentUser") || localStorage.getItem("rememberedEmail") || "";
    const role = localStorage.getItem("currentUserRole") || "user";
    setCurrentUser(user);
    setUserRole(role);

    const list = getProjectsForUser(user, role);
    setProjects(list);

    if (user) {
      databaseService.getDatabases(user).then((data) => {
        if (data.success && data.databases) {
          const dbNames = data.databases.map((db) => db.name).filter((name) => !name.startsWith("mongodb:"));
          setUserDatabases(dbNames);
          if (dbNames.length > 0) {
            setDatabaseName(dbNames[0]);
          }
        }
      }).catch((err) => console.error("Failed to load user databases for CRUD builder:", err));
    }

    const handleSync = () => {
      const refreshedList = getProjectsForUser(user, role);
      setProjects(refreshedList);
    };
    window.addEventListener('projects_synced', handleSync);
    return () => {
      window.removeEventListener('projects_synced', handleSync);
    };
  }, []);

  const saveProjects = (newProjects) => {
    setProjects(newProjects);
    saveProjectsForUser(newProjects, currentUser, userRole);
  };
  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!projectName.trim()) return;
    const formattedProjName = projectName.trim().toLowerCase().replace(/[\s-]+/g, "_");
    const newProject = {
      id: "proj_" + Date.now(),
      name: formattedProjName,
      directory: directory || `C:/CRUD/${formattedProjName}`,
      databaseName,
      connectFolder,
      owner: currentUser,
      files: []
    };
    saveProjects([...projects, newProject]);
    setIsModalOpen(false);
    setProjectName("");
    setDirectory("");
    setDatabaseName("");
    setConnectFolder("lib");
    
    // Call the backend to initialize the boilerplate immediately
    try {
      await crudService.initializeProject(newProject);
      console.log("Project boilerplate initialized successfully.");
    } catch (err) {
      console.error("Failed to initialize project boilerplate:", err);
      alert("Project created, but failed to initialize boilerplate. You may need to generate a CRUD file first.");
    }
  };
  const confirmDeleteProject = (id, name) => {
    setProjectToDelete({ id, name });
    setIsDeleteModalOpen(true);
  };
  const handleDeleteProject = () => {
    if (!projectToDelete) return;
    const updated = projects.map((p) => {
      if (p.id === projectToDelete.id) {
        return { ...p, isDeleted: true, deletedAt: Date.now() };
      }
      return p;
    });
    saveProjects(updated);
    setIsDeleteModalOpen(false);
    setProjectToDelete(null);
  };
  return <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      
      {
    /* SUB NAV BAR BANNER */
  }
      <div style={{ height: "40px", backgroundColor: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", color: "white", fontSize: "13px", fontWeight: "600", flexShrink: 0, boxShadow: "0 2px 6px rgba(0,0,0,0.05)" }}>
        <span style={{ fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.8px" }}>CRUD Builder</span>
        <span style={{ color: "rgba(255,255,255,0.8)" }}>Projects List</span>
      </div>

      <main style={{ flex: 1, padding: "24px", overflowY: "auto", backgroundColor: "var(--bg-primary)" }}>
        <div style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "24px", boxShadow: "var(--shadow-md)" }}>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "16px", marginBottom: "20px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "var(--text-primary)" }}>CRUD Projects:</h2>
            <button
    onClick={() => setIsModalOpen(true)}
    style={{ backgroundColor: "#3b82f6", color: "white", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "bold", boxShadow: "0 4px 6px rgba(59, 130, 246, 0.2)" }}
  >
              Create Project
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
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
  />
            </div>
          </div>

          <div style={{ width: "100%", overflowX: "auto", border: "1px solid var(--border-color)", borderRadius: "8px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border-color)", backgroundColor: "var(--bg-tertiary)" }}>
                  <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600, width: "80px" }}>Sr</th>
                  <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600 }}>Project Name</th>
                  <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600 }}>Directory Path</th>
                  <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600 }}>Database</th>
                  <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600, width: "120px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.filter((p) => !p.isDeleted).length === 0 ? <tr>
                    <td colSpan={5} style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)" }}>No CRUD projects found. Click &quot;Create Project&quot; to start!</td>
                  </tr> : projects.filter((p) => !p.isDeleted && p.name.toLowerCase().includes(searchQuery.toLowerCase())).map((p, idx) => <tr key={p.id} className="db-row" style={{ borderBottom: "1px solid var(--border-color)" }}>
                        <td style={{ padding: "14px 16px", color: "var(--text-primary)" }}>{idx + 1}</td>
                        <td style={{ padding: "14px 16px" }}>
                          <button
                            onClick={() => router.push(`/dashboard/crud/${p.id}`)}
                            className="db-btn-link"
                          >
                            {p.name}
                          </button>
                        </td>
                        <td style={{ padding: "14px 16px", color: "var(--text-primary)", fontFamily: "monospace", fontSize: "14px" }}>{p.directory}</td>
                        <td style={{ padding: "14px 16px", color: "var(--text-primary)" }}>{p.databaseName || "None"}</td>
                                <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button
                              onClick={() => router.push(`/dashboard/crud/${p.id}`)}
                              className="db-action-btn"
                              title="View Files"
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => confirmDeleteProject(p.id, p.name)}
                              className="db-action-btn delete"
                              title="Delete Project"
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
    /* ==================== MODAL: CREATE PROJECT ==================== */
  }
      {isModalOpen && <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1e3 }}>
          <div style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "8px", width: "600px", maxWidth: "90vw", boxShadow: "var(--shadow-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--border-color)" }}>
              <h3 style={{ fontWeight: "bold", fontSize: "16px", color: "var(--text-primary)" }}>Create CRUD Project</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
            </div>
            <form onSubmit={handleCreateProject}>
              <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "18px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-muted)" }}>Project Name:</label>
                  <input
    type="text"
    placeholder="MyEcommerceApp"
    required
    value={projectName}
    onChange={(e) => setProjectName(e.target.value)}
    style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border-color)", borderRadius: "6px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-muted)" }}>Local Directory Path:</label>
                  <input
    type="text"
    placeholder="C:/Users/YourName/Desktop/my_project"
    value={directory}
    onChange={(e) => setDirectory(e.target.value.replace(/\\/g, "/"))}
    style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border-color)", borderRadius: "6px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "14px", outline: "none", boxSizing: "border-box", fontFamily: "monospace" }}
  />
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", opacity: 0.7 }}>Use full path e.g. C:/Users/Faizan/Desktop/my_project (folder will be auto-created)</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-muted)" }}>Target Database Name:</label>
                  {userDatabases.length === 0 ? <input
    type="text"
    placeholder="ecommerce"
    value={databaseName}
    onChange={(e) => setDatabaseName(e.target.value.toLowerCase().replace(/[\s-]+/g, "_"))}
    style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border-color)", borderRadius: "6px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
  /> : <select
    value={databaseName}
    onChange={(e) => setDatabaseName(e.target.value)}
    style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border-color)", borderRadius: "6px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
  >
                      {userDatabases.map((db) => <option key={db} value={db}>
                          {db.startsWith("mongodb:") ? `${db.replace("mongodb:", "")} (MongoDB)` : `${db} (MySQL)`}
                        </option>)}
                    </select>}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {/* <label style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-muted)" }}>DB Connection Folder:</label> */}
                  {/* <input
    type="text"
    placeholder="lib"
    value={connectFolder}
    onChange={(e) => setConnectFolder(e.target.value)}
    style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border-color)", borderRadius: "6px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
  /> */}
                </div>
              </div>
              
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", padding: "16px 24px", borderTop: "1px solid var(--border-color)" }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", cursor: "pointer", fontSize: "14px" }}>Close</button>
                <button type="submit" style={{ padding: "8px 16px", borderRadius: "6px", border: "none", backgroundColor: "#3b82f6", color: "white", cursor: "pointer", fontSize: "14px", fontWeight: "bold" }}>Create Project</button>
              </div>
            </form>
          </div>
        </div>}

      {/* ==================== MODAL: DELETE PROJECT CONFIRMATION ==================== */}
      {isDeleteModalOpen && projectToDelete && <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1e3 }}>
          <div style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "12px", width: "450px", maxWidth: "90vw", boxShadow: "var(--shadow-lg)", overflow: "hidden" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "30px 24px", textAlign: "center" }}>
              <div style={{ width: "56px", height: "56px", borderRadius: "50%", backgroundColor: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444", marginBottom: "20px" }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: "bold", color: "var(--text-primary)" }}>Delete CRUD Project</h3>
              <p style={{ margin: 0, fontSize: "14px", color: "var(--text-muted)", lineHeight: "1.5" }}>
                Are you sure you want to delete the CRUD project <strong style={{ color: "var(--text-primary)" }}>{projectToDelete.name}</strong>? This action is permanent and all files and configurations inside it will be lost forever.
              </p>
            </div>
            
            <div style={{ display: "flex", borderTop: "1px solid var(--border-color)", backgroundColor: "var(--bg-tertiary)" }}>
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setProjectToDelete(null);
                }}
                style={{ flex: 1, padding: "16px", background: "none", border: "none", borderRight: "1px solid var(--border-color)", cursor: "pointer", fontSize: "14px", fontWeight: "600", color: "var(--text-secondary)", outline: "none" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteProject}
                style={{ flex: 1, padding: "16px", background: "none", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: "bold", color: "#ef4444", outline: "none" }}
              >
                Delete Project
              </button>
            </div>
          </div>
        </div>}

    </div>;
}
