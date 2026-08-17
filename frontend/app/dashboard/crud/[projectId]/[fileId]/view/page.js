"use strict";
"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useToast } from "../../../../../context/ToastContext";
import { getProjectsForUser } from "../../../../../utils/projectStorage";
import ViewDetailsModal from "../../../../../components/dialogs/ViewDetailsModal";
import DataGrid from "../../../../../components/tables/DataGrid";
import { databaseService } from "../../../../../../services/databaseService";

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
    const user = localStorage.getItem("currentUser") || "";
    const role = localStorage.getItem("currentUserRole") || "user";
    const projs = getProjectsForUser(user, role);
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
  }, [projectId, fileId]);

  const fetchRecords = async () => {
    if (!project || !file) return;
    setIsLoading(true);
    try {
      const data = await databaseService.getTableRows(project.databaseName, file.tableName);
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
    try {
      const data = editingId
        ? await databaseService.updateTableRow(project.databaseName, file.tableName, editingId, form)
        : await databaseService.insertTableRow(project.databaseName, file.tableName, form);
      if (data.success) {
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
        updatedForm[col.name] = item[col.name] !== undefined ? item[col.name] : col.type === "checkbox" ? false : col.type === "number" ? 0 : "";
      });
      setForm(updatedForm);
    }
  };

  const handleDelete = async (id) => {
    if (!project || !file) return;
    if (!confirm("Are you sure you want to delete this record?")) return;
    try {
      const data = await databaseService.deleteTableRow(project.databaseName, file.tableName, id);
      if (data.success) {
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

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* SUB NAV BAR BANNER */}
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
          {/* Header Action bar */}
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
            {/* 1. Dynamic Form Panel */}
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
                    return (
                      <label key={col.id} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", padding: "4px 0" }}>
                        <input
                          type="checkbox"
                          checked={form[col.name] || false}
                          onChange={(e) => setForm({ ...form, [col.name]: e.target.checked })}
                          style={{ width: "16px", height: "16px", accentColor: "#3b82f6" }}
                        />
                        <span style={{ fontSize: "13.5px", fontWeight: "600", color: "#334155" }}>{col.name}</span>
                      </label>
                    );
                  } else if (col.type === "textarea") {
                    return (
                      <div key={col.id} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
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
                      </div>
                    );
                  } else if (col.type === "select") {
                    return (
                      <div key={col.id} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
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
                          {col.selectOptions?.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    );
                  } else {
                    return (
                      <div key={col.id} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
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
                      </div>
                    );
                  }
                })}

                <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                  <button
                    type="submit"
                    style={{ flex: 1, backgroundColor: "#3b82f6", color: "white", border: "none", padding: "10px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", fontSize: "14px" }}
                  >
                    {editingId ? "Update Record" : "Save Record"}
                  </button>
                  {editingId && (
                    <button
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
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* 2. Live Data Grid Table */}
            <div style={{ backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "20px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)" }}>
              <DataGrid
                filteredItems={filteredItems}
                isLoading={isLoading}
                isMongo={isMongo}
                file={file}
                fetchRecords={fetchRecords}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                setShowViewModal={setShowViewModal}
                handleEdit={handleEdit}
                handleDelete={handleDelete}
              />
            </div>
          </div>
        </div>
      </main>

      {/* View Details Modal */}
      <ViewDetailsModal
        showViewModal={showViewModal}
        onClose={() => setShowViewModal(null)}
        isMongo={isMongo}
        columns={file.columns}
      />
    </div>
  );
}
