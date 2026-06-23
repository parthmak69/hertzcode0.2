"use strict";
"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useToast } from "../../../../../context/ToastContext";
export default function PortalDashboardPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const params = useParams();
  const projectId = params?.projectId;
  const [project, setProject] = useState(null);
  const [schemas, setSchemas] = useState([]);
  const [activeSchema, setActiveSchema] = useState(null);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSchemas, setIsLoadingSchemas] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showViewModal, setShowViewModal] = useState(null);
  useEffect(() => {
    const isLoggedIn = sessionStorage.getItem(`portal_logged_in_${projectId}`);
    if (isLoggedIn !== "true") {
      router.push(`/dashboard/crud/${projectId}/admin-portal/login`);
    }
  }, [projectId]);
  useEffect(() => {
    const stored = localStorage.getItem("crudProjects");
    if (stored) {
      try {
        const projs = JSON.parse(stored);
        const found = projs.find((p) => p.id === projectId);
        if (found) {
          setProject(found);
          loadSchemasFromDisk(found.directory);
        }
      } catch (e) {
        console.error("Failed to parse projects", e);
      }
    }
  }, [projectId]);
  const loadSchemasFromDisk = async (dirPath) => {
    setIsLoadingSchemas(true);
    try {
      const res = await fetch(`/api/crud/schemas?directory=${encodeURIComponent(dirPath)}`);
      const data = await res.json();
      if (data.success && data.schemas) {
        setSchemas(data.schemas);
        if (data.schemas.length > 0) {
          selectActiveSchema(data.schemas[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load JSON schemas:", err);
    } finally {
      setIsLoadingSchemas(false);
    }
  };
  const selectActiveSchema = (schema) => {
    setActiveSchema(schema);
    setEditingId(null);
    const initialForm = {};
    schema.columns.forEach((col) => {
      initialForm[col.name] = col.type === "checkbox" ? false : col.type === "number" ? 0 : "";
    });
    setForm(initialForm);
  };
  const fetchRecords = async () => {
    if (!project || !activeSchema) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/database/tables/rows?dbName=${encodeURIComponent(project.databaseName)}&tableName=${encodeURIComponent(activeSchema.tableName)}`
      );
      const data = await res.json();
      if (data.success) {
        let rows = data.rows || [];
        const orderKey = `custom_order_${projectId}_${activeSchema.tableName}`;
        const storedOrder = localStorage.getItem(orderKey);
        if (storedOrder) {
          const idOrder = JSON.parse(storedOrder);
          rows.sort((a, b) => {
            const aId = String(a._id || a.id);
            const bId = String(b._id || b.id);
            const aIndex = idOrder.indexOf(aId);
            const bIndex = idOrder.indexOf(bId);
            if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
            if (aIndex !== -1) return -1;
            if (bIndex !== -1) return 1;
            return 0;
          });
        }
        setItems(rows);
      }
    } catch (err) {
      console.error("Failed to load records:", err);
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    if (project && activeSchema) {
      fetchRecords();
    }
  }, [project, activeSchema]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!project || !activeSchema) return;
    const method = editingId ? "PUT" : "POST";
    const payload = {
      dbName: project.databaseName,
      tableName: activeSchema.tableName,
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
        activeSchema.columns.forEach((col) => {
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
    if (activeSchema) {
      activeSchema.columns.forEach((col) => {
        updatedForm[col.name] = item[col.name] !== void 0 ? item[col.name] : col.type === "checkbox" ? false : col.type === "number" ? 0 : "";
      });
      setForm(updatedForm);
    }
  };
  const handleDelete = async (id) => {
    if (!project || !activeSchema) return;
    if (!confirm("Are you sure you want to delete this record?")) return;
    try {
      const res = await fetch(
        `/api/database/tables/rows?dbName=${encodeURIComponent(project.databaseName)}&tableName=${encodeURIComponent(activeSchema.tableName)}&id=${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("Record deleted successfully", "success");
        fetchRecords();
      } else {
        showToast("Failed to delete: " + (data.error || "Unknown error"), "error");
      }
    } catch (err) {
      showToast("Error deleting: " + err.message, "error");
    }
  };
  const handleMoveToTop = (item) => {
    if (!activeSchema) return;
    const itemId = String(item._id || item.id);
    const allIds = items.map((x) => String(x._id || x.id));
    const filteredIds = allIds.filter((id) => id !== itemId);
    const newOrder = [itemId, ...filteredIds];
    const orderKey = `custom_order_${projectId}_${activeSchema.tableName}`;
    localStorage.setItem(orderKey, JSON.stringify(newOrder));
    const updatedItems = [...items];
    const itemIndex = updatedItems.findIndex((x) => String(x._id || x.id) === itemId);
    if (itemIndex > -1) {
      const [movedItem] = updatedItems.splice(itemIndex, 1);
      updatedItems.unshift(movedItem);
      setItems(updatedItems);
    }
  };
  const handleManualMoveToTop = () => {
    const keyword = prompt("Enter a keyword (e.g. 'umbrella') to move matching items to the top:");
    if (!keyword || !activeSchema) return;
    const lowerKeyword = keyword.toLowerCase().trim();
    const matched = [];
    const unmatched = [];
    items.forEach((item) => {
      const isMatch = Object.values(item).some(
        (val) => String(val).toLowerCase().includes(lowerKeyword)
      );
      if (isMatch) {
        matched.push(item);
      } else {
        unmatched.push(item);
      }
    });
    if (matched.length === 0) {
      showToast(`No records found matching '${keyword}'`, "warning");
      return;
    }
    const sortedItems = [...matched, ...unmatched];
    const orderKey = `custom_order_${projectId}_${activeSchema.tableName}`;
    const newOrder = sortedItems.map((x) => String(x._id || x.id));
    localStorage.setItem(orderKey, JSON.stringify(newOrder));
    setItems(sortedItems);
    showToast(`Moved ${matched.length} item(s) matching '${keyword}' to the top!`, "success");
  };
  const handleShuffle = () => {
    if (!activeSchema || items.length === 0) return;
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const orderKey = `custom_order_${projectId}_${activeSchema.tableName}`;
    const newOrder = shuffled.map((x) => String(x._id || x.id));
    localStorage.setItem(orderKey, JSON.stringify(newOrder));
    setItems(shuffled);
  };
  const handleLogout = () => {
    sessionStorage.removeItem(`portal_logged_in_${projectId}`);
    showToast("Admin Portal: Logged out successfully", "success");
    router.push(`/dashboard/crud/${projectId}/admin-portal/login`);
  };
  const isImageUrl = (colName, value) => {
    if (typeof value !== "string") return false;
    const lowerCol = colName.toLowerCase();
    const isImgCol = lowerCol.includes("image") || lowerCol.includes("avatar") || lowerCol.includes("photo") || lowerCol.includes("pic") || lowerCol.includes("thumbnail");
    const hasImgExtension = /\.(jpeg|jpg|gif|png|webp|svg)/i.test(value);
    const startsWithHttp = value.startsWith("http://") || value.startsWith("https://");
    const isPicsum = value.includes("picsum.photos");
    return isImgCol || startsWithHttp && (hasImgExtension || isPicsum);
  };
  const filteredItems = items.filter((item) => {
    return Object.values(item).some(
      (val) => String(val).toLowerCase().includes(searchQuery.toLowerCase())
    );
  });
  if (!project) {
    return <div style={styles.loading}>Loading Dashboard...</div>;
  }
  const isMongo = project.databaseName.toLowerCase().startsWith("mongodb:");
  return <div style={styles.container}>
      
      {
    /* Top Header */
  }
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logoCircle}>{project.name.slice(0, 2).toUpperCase()}</div>
          <span style={styles.portalTitle}>{project.name} Admin Panel</span>
        </div>
        <div style={styles.headerRight}>
          <span style={styles.userBadge}>Administrator</span>
          <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
          <button onClick={() => window.close()} style={styles.backBtn}>Exit Portal</button>
        </div>
      </header>

      {
    /* Main Body */
  }
      <div style={styles.body}>
        
        {
    /* Left Sidebar (Tables List) */
  }
        <aside style={styles.sidebar}>
          <div style={styles.sidebarTitle}>DATABASE MODULES</div>
          {isLoadingSchemas ? <div style={styles.sidebarLoading}>Loading modules...</div> : schemas.length === 0 ? <div style={styles.sidebarEmpty}>No schemas found. Please configure files & Save Settings in the builder first!</div> : <nav style={styles.nav}>
              {schemas.map((schema) => {
    const isActive = activeSchema?.id === schema.id;
    return <button
      key={schema.id}
      onClick={() => selectActiveSchema(schema)}
      style={{
        ...styles.navItem,
        backgroundColor: isActive ? "#3b82f6" : "transparent",
        color: isActive ? "#ffffff" : "#94a3b8",
        fontWeight: isActive ? "bold" : "normal"
      }}
    >
                    <span style={styles.navDot}>●</span>
                    {schema.name.toUpperCase()}
                  </button>;
  })}
            </nav>}
        </aside>

        {
    /* Content Area */
  }
        <main style={styles.content}>
          {activeSchema ? <div style={styles.contentGrid}>
              
              {
    /* Dynamic Action form */
  }
              <div style={styles.formCard}>
                <h3 style={styles.cardTitle}>
                  {editingId ? "Edit Record" : "Add New Record"}
                </h3>
                <form onSubmit={handleSubmit} style={styles.form}>
                  {activeSchema.columns.filter((c) => c.isFormCol !== false).map((col) => {
    if (col.type === "checkbox") {
      return <label key={col.id} style={styles.checkboxLabel}>
                          <input
        type="checkbox"
        checked={form[col.name] || false}
        onChange={(e) => setForm({ ...form, [col.name]: e.target.checked })}
        style={styles.checkbox}
      />
                          <span>{col.name}</span>
                        </label>;
    } else if (col.type === "textarea") {
      return <div key={col.id} style={styles.formGroup}>
                          <label style={styles.fieldLabel}>{col.name} {col.isRequired && "*"}</label>
                          <textarea
        rows={3}
        value={form[col.name] || ""}
        onChange={(e) => setForm({ ...form, [col.name]: e.target.value })}
        required={col.isRequired}
        style={styles.textarea}
      />
                        </div>;
    } else if (col.type === "select") {
      return <div key={col.id} style={styles.formGroup}>
                          <label style={styles.fieldLabel}>{col.name} {col.isRequired && "*"}</label>
                          <select
        value={form[col.name] || ""}
        onChange={(e) => setForm({ ...form, [col.name]: e.target.value })}
        required={col.isRequired}
        style={styles.select}
      >
                            <option value="">-- Select --</option>
                            {col.selectOptions?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        </div>;
    } else {
      return <div key={col.id} style={styles.formGroup}>
                          <label style={styles.fieldLabel}>{col.name} {col.isRequired && "*"}</label>
                          <input
        type={col.type === "number" ? "number" : col.type === "email" ? "email" : col.type === "date" ? "date" : "text"}
        value={form[col.name] || ""}
        onChange={(e) => setForm({ ...form, [col.name]: e.target.value })}
        required={col.isRequired}
        style={styles.input}
      />
                        </div>;
    }
  })}

                  <div style={styles.formActions}>
                    <button type="submit" style={styles.submitBtn}>
                      {editingId ? "Update" : "Save"}
                    </button>
                    {editingId && <button
    type="button"
    onClick={() => {
      setEditingId(null);
      const resetForm = {};
      activeSchema.columns.forEach((col) => {
        resetForm[col.name] = col.type === "checkbox" ? false : col.type === "number" ? 0 : "";
      });
      setForm(resetForm);
    }}
    style={styles.cancelBtn}
  >
                        Cancel
                      </button>}
                  </div>
                </form>
              </div>

              {
    /* Data Table display */
  }
              <div style={styles.tableCard}>
                <div style={styles.tableHeader}>
                  <h3 style={{ ...styles.cardTitle, margin: 0 }}>
                    Module Data: {activeSchema.name.toUpperCase()} ({items.length})
                  </h3>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <button
    onClick={handleManualMoveToTop}
    style={styles.manualBtn}
    title="Move items matching a keyword to top"
  >
                      🎯 Move Keyword to Top
                    </button>
                    <button
    onClick={handleShuffle}
    style={styles.shuffleBtn}
    title="Shuffle records order randomly"
  >
                      🔀 Shuffle Items
                    </button>
                    <button
    onClick={fetchRecords}
    style={styles.refreshBtn}
  >
                      ↻ Refresh
                    </button>
                    <input
    type="text"
    placeholder="Search this table..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    style={styles.searchBar}
  />
                  </div>
                </div>

                {isLoading ? <div style={styles.tableLoading}>Querying data rows from database...</div> : filteredItems.length === 0 ? <div style={styles.tableEmpty}>
                    This table has no records. Enter values in the form to populate!
                  </div> : <div style={styles.tableWrap}>
                    <table style={styles.table}>
                      <thead>
                        <tr style={styles.thRow}>
                          <th style={styles.th}>#</th>
                          <th style={styles.th}>{isMongo ? "_id" : "id"}</th>
                          {activeSchema.columns.filter((c) => c.isListCol !== false).map((col) => <th key={col.id} style={styles.th}>{col.name}</th>)}
                          <th style={styles.th}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredItems.map((item, idx) => <tr key={item._id || item.id || idx} style={styles.tr}>
                            <td style={styles.tdIndex}>{idx + 1}</td>
                            <td style={styles.tdId} title={String(item._id || item.id)}>
                              {String(item._id || item.id)}
                            </td>
                            {activeSchema.columns.filter((c) => c.isListCol !== false).map((col) => {
    const val = item[col.name];
    const isImg = isImageUrl(col.name, val);
    return <td key={col.id} style={styles.td}>
                                  {isImg ? <img
      src={String(val)}
      alt={col.name}
      style={styles.thumbnail}
      onError={(e) => {
        e.currentTarget.style.display = "none";
      }}
    /> : String(val !== void 0 && val !== null ? val : "")}
                                </td>;
  })}
                            <td style={styles.tdActions}>
                              <div style={styles.actionsBox}>
                                <button
    onClick={() => handleMoveToTop(item)}
    style={styles.topLink}
    title="Move this item to top"
  >
                                  ▲ Top
                                </button>
                                {activeSchema.settings.viewButton && <button onClick={() => setShowViewModal(item)} style={styles.viewLink}>View</button>}
                                {activeSchema.settings.editButton && <button onClick={() => handleEdit(item)} style={styles.editLink}>Edit</button>}
                                {activeSchema.settings.deleteButton && <button onClick={() => handleDelete(item._id || item.id)} style={styles.deleteLink}>Delete</button>}
                              </div>
                            </td>
                          </tr>)}
                      </tbody>
                    </table>
                  </div>}
              </div>

            </div> : <div style={styles.emptyWelcome}>
              <h3>Welcome to your project's Administration Portal!</h3>
              <p>Please configure tables and click "Save Settings" inside the CRUD builder to initialize pages.</p>
            </div>}
        </main>

      </div>

      {
    /* Details View Modal */
  }
      {showViewModal && activeSchema && <div style={styles.modalBg}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h4 style={{ margin: 0, fontWeight: "bold" }}>Record Detail Viewer</h4>
              <button onClick={() => setShowViewModal(null)} style={styles.modalClose}>✕</button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.modalRow}>
                <span style={styles.modalKey}>{isMongo ? "_id" : "id"}:</span>
                <span style={styles.modalVal}>{String(showViewModal._id || showViewModal.id)}</span>
              </div>
              {activeSchema.columns.map((col) => {
    const val = showViewModal[col.name];
    const isImg = isImageUrl(col.name, val);
    return <div key={col.id} style={styles.modalRow}>
                    <span style={styles.modalKey}>{col.name}:</span>
                    <span style={styles.modalVal}>
                      {isImg ? <img src={String(val)} alt={col.name} style={{ maxWidth: "100%", maxHeight: "180px", borderRadius: "4px", objectFit: "contain" }} /> : String(val !== void 0 && val !== null ? val : "")}
                    </span>
                  </div>;
  })}
            </div>
            <div style={styles.modalFooter}>
              <button onClick={() => setShowViewModal(null)} style={styles.modalCloseBtn}>Close</button>
            </div>
          </div>
        </div>}

    </div>;
}
const styles = {
  container: {
    position: "fixed",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    backgroundColor: "#0f172a",
    fontFamily: "system-ui, sans-serif",
    zIndex: 9999
  },
  loading: {
    color: "#94a3b8",
    padding: "40px",
    textAlign: "center",
    fontWeight: "bold",
    fontFamily: "system-ui, sans-serif"
  },
  header: {
    height: "60px",
    backgroundColor: "#1e293b",
    borderBottom: "1px solid #334155",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 24px",
    flexShrink: 0
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px"
  },
  logoCircle: {
    width: "36px",
    height: "36px",
    borderRadius: "8px",
    backgroundColor: "#3b82f6",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
    fontWeight: "bold"
  },
  portalTitle: {
    color: "#f8fafc",
    fontSize: "16px",
    fontWeight: "bold"
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "12px"
  },
  userBadge: {
    fontSize: "12px",
    backgroundColor: "#334155",
    color: "#94a3b8",
    padding: "4px 10px",
    borderRadius: "4px",
    fontWeight: "bold"
  },
  logoutBtn: {
    backgroundColor: "transparent",
    border: "1px solid #ef4444",
    color: "#ef4444",
    padding: "6px 12px",
    borderRadius: "6px",
    fontSize: "13px",
    cursor: "pointer",
    fontWeight: "600"
  },
  backBtn: {
    backgroundColor: "#3b82f6",
    color: "white",
    border: "none",
    padding: "6px 12px",
    borderRadius: "6px",
    fontSize: "13px",
    cursor: "pointer",
    fontWeight: "600"
  },
  body: {
    flex: 1,
    display: "flex",
    overflow: "hidden"
  },
  sidebar: {
    width: "260px",
    backgroundColor: "#0f172a",
    borderRight: "1px solid #334155",
    padding: "24px 16px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    flexShrink: 0,
    overflowY: "auto"
  },
  sidebarTitle: {
    fontSize: "11px",
    fontWeight: "bold",
    color: "#64748b",
    letterSpacing: "1px",
    marginBottom: "8px"
  },
  sidebarLoading: {
    color: "#64748b",
    fontSize: "13px"
  },
  sidebarEmpty: {
    color: "#64748b",
    fontSize: "12.5px",
    lineHeight: "1.6"
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: "6px"
  },
  navItem: {
    border: "none",
    width: "100%",
    padding: "10px 12px",
    borderRadius: "8px",
    cursor: "pointer",
    textAlign: "left",
    fontSize: "13.5px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    transition: "all 0.15s"
  },
  navDot: {
    fontSize: "8px"
  },
  content: {
    flex: 1,
    padding: "24px",
    overflowY: "auto",
    backgroundColor: "#0b0f19"
  },
  contentGrid: {
    display: "grid",
    gridTemplateColumns: "360px 1fr",
    gap: "24px",
    alignItems: "flex-start"
  },
  formCard: {
    backgroundColor: "#1e293b",
    border: "1px solid #334155",
    borderRadius: "10px",
    padding: "20px",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.2)"
  },
  cardTitle: {
    fontSize: "15px",
    fontWeight: "bold",
    color: "#f8fafc",
    marginBottom: "16px",
    borderBottom: "1px solid #334155",
    paddingBottom: "12px"
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "14px"
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px"
  },
  fieldLabel: {
    fontSize: "12px",
    fontWeight: "bold",
    color: "#94a3b8"
  },
  input: {
    padding: "8px 10px",
    backgroundColor: "#0f172a",
    border: "1px solid #475569",
    borderRadius: "6px",
    color: "#f8fafc",
    fontSize: "13.5px",
    outline: "none"
  },
  textarea: {
    padding: "8px 10px",
    backgroundColor: "#0f172a",
    border: "1px solid #475569",
    borderRadius: "6px",
    color: "#f8fafc",
    fontSize: "13.5px",
    outline: "none",
    resize: "vertical"
  },
  select: {
    padding: "8px 10px",
    backgroundColor: "#0f172a",
    border: "1px solid #475569",
    borderRadius: "6px",
    color: "#f8fafc",
    fontSize: "13.5px",
    outline: "none"
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
    color: "#f8fafc",
    fontSize: "13.5px",
    fontWeight: "600",
    padding: "4px 0"
  },
  checkbox: {
    width: "16px",
    height: "16px",
    accentColor: "#3b82f6"
  },
  formActions: {
    display: "flex",
    gap: "8px",
    marginTop: "8px"
  },
  submitBtn: {
    flex: 1,
    backgroundColor: "#3b82f6",
    color: "white",
    border: "none",
    padding: "10px",
    borderRadius: "6px",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "13.5px"
  },
  cancelBtn: {
    backgroundColor: "#475569",
    color: "white",
    border: "none",
    padding: "10px 14px",
    borderRadius: "6px",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "13.5px"
  },
  tableCard: {
    backgroundColor: "#1e293b",
    border: "1px solid #334155",
    borderRadius: "10px",
    padding: "20px",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.2)"
  },
  tableHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    gap: "16px"
  },
  searchBar: {
    width: "240px",
    padding: "8px 12px",
    backgroundColor: "#0f172a",
    border: "1px solid #475569",
    borderRadius: "6px",
    color: "#f8fafc",
    fontSize: "13px",
    outline: "none"
  },
  tableLoading: {
    padding: "40px",
    textAlign: "center",
    color: "#64748b",
    fontSize: "14px"
  },
  tableEmpty: {
    padding: "40px",
    textAlign: "center",
    color: "#64748b",
    fontSize: "14px",
    border: "1px dashed #334155",
    borderRadius: "6px"
  },
  tableWrap: {
    width: "100%",
    overflowX: "auto",
    border: "1px solid #334155",
    borderRadius: "8px"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
    fontSize: "13.5px"
  },
  thRow: {
    backgroundColor: "#0f172a",
    borderBottom: "2px solid #334155"
  },
  th: {
    padding: "12px 16px",
    color: "#94a3b8",
    fontWeight: "bold"
  },
  tr: {
    borderBottom: "1px solid #334155"
  },
  tdIndex: {
    padding: "12px 16px",
    color: "#64748b"
  },
  tdId: {
    padding: "12px 16px",
    color: "#f8fafc",
    fontFamily: "monospace",
    fontSize: "12px",
    maxWidth: "100px",
    overflow: "hidden",
    textOverflow: "ellipsis"
  },
  td: {
    padding: "12px 16px",
    color: "#e2e8f0",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "200px"
  },
  thumbnail: {
    maxHeight: "40px",
    maxWidth: "80px",
    borderRadius: "4px",
    objectFit: "contain",
    border: "1px solid #475569"
  },
  tdActions: {
    padding: "12px 16px"
  },
  actionsBox: {
    display: "flex",
    gap: "8px",
    alignItems: "center"
  },
  viewLink: {
    border: "none",
    background: "none",
    cursor: "pointer",
    color: "#3b82f6",
    fontWeight: "bold",
    padding: 0
  },
  editLink: {
    border: "none",
    background: "none",
    cursor: "pointer",
    color: "#d97706",
    fontWeight: "bold",
    padding: 0
  },
  deleteLink: {
    border: "none",
    background: "none",
    cursor: "pointer",
    color: "#ef4444",
    fontWeight: "bold",
    padding: 0
  },
  topLink: {
    border: "none",
    background: "none",
    cursor: "pointer",
    color: "#10b981",
    fontWeight: "bold",
    padding: 0,
    marginRight: "4px"
  },
  manualBtn: {
    backgroundColor: "#0ea5e9",
    border: "none",
    color: "white",
    padding: "8px 14px",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "bold",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    boxShadow: "0 2px 4px rgba(14, 165, 233, 0.2)"
  },
  shuffleBtn: {
    backgroundColor: "#8b5cf6",
    border: "none",
    color: "white",
    padding: "8px 14px",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "bold",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    boxShadow: "0 2px 4px rgba(139, 92, 246, 0.2)"
  },
  refreshBtn: {
    background: "none",
    border: "none",
    color: "#3b82f6",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "bold",
    display: "flex",
    alignItems: "center",
    gap: "4px"
  },
  emptyWelcome: {
    backgroundColor: "#1e293b",
    border: "1px solid #334155",
    borderRadius: "10px",
    padding: "40px",
    textAlign: "center",
    color: "#94a3b8"
  },
  modalBg: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1e3
  },
  modal: {
    backgroundColor: "#1e293b",
    border: "1px solid #334155",
    borderRadius: "12px",
    width: "480px",
    maxWidth: "90vw",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
    color: "#f8fafc"
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 20px",
    borderBottom: "1px solid #334155"
  },
  modalClose: {
    background: "none",
    border: "none",
    fontSize: "18px",
    cursor: "pointer",
    color: "#94a3b8"
  },
  modalBody: {
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    maxHeight: "400px",
    overflowY: "auto"
  },
  modalRow: {
    display: "flex",
    borderBottom: "1px solid #334155",
    paddingBottom: "8px"
  },
  modalKey: {
    flex: 1,
    fontWeight: "bold",
    fontSize: "12.5px",
    color: "#94a3b8"
  },
  modalVal: {
    flex: 2,
    fontSize: "13.5px",
    color: "#f8fafc"
  },
  modalFooter: {
    display: "flex",
    justifyContent: "flex-end",
    padding: "12px 20px",
    borderTop: "1px solid #334155"
  },
  modalCloseBtn: {
    backgroundColor: "#475569",
    color: "white",
    border: "none",
    padding: "6px 16px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "bold"
  }
};
