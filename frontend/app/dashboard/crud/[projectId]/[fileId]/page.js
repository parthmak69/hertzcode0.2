"use strict";
"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useToast } from "../../../../context/ToastContext";
export default function CrudUiConfigPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const params = useParams();
  const projectId = params?.projectId;
  const fileId = params?.fileId;
  const [project, setProject] = useState(null);
  const [allProjects, setAllProjects] = useState([]);
  const [file, setFile] = useState(null);
  const [codeCopied, setCodeCopied] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem("crudProjects");
    if (stored) {
      try {
        const projs = JSON.parse(stored);
        setAllProjects(projs);
        const foundProj = projs.find((p) => p.id === projectId);
        if (foundProj) {
          setProject(foundProj);
          const foundFile = foundProj.files.find((f) => f.id === fileId);
          if (foundFile) {
            setFile(foundFile);
          }
        }
      } catch (e) {
        console.error("Failed to parse projects", e);
      }
    }
  }, [projectId, fileId]);
  const saveFileChanges = (updatedFile) => {
    if (!project) return;
    const updatedFiles = project.files.map((f) => f.id === fileId ? updatedFile : f);
    const updatedProject = { ...project, files: updatedFiles };
    const updatedProjectsList = allProjects.map((p) => p.id === projectId ? updatedProject : p);
    setProject(updatedProject);
    setFile(updatedFile);
    setAllProjects(updatedProjectsList);
    localStorage.setItem("crudProjects", JSON.stringify(updatedProjectsList));
  };
  const handleToggleSetting = (key) => {
    if (!file) return;
    const updatedFile = {
      ...file,
      settings: {
        ...file.settings,
        [key]: !file.settings[key]
      }
    };
    saveFileChanges(updatedFile);
  };
  const handleUpdateColumnDetail = (colId, details) => {
    if (!file) return;
    const updatedCols = file.columns.map((c) => c.id === colId ? { ...c, ...details } : c);
    saveFileChanges({ ...file, columns: updatedCols });
  };
  const handleUpdateColumnType = (colId, type) => {
    handleUpdateColumnDetail(colId, { type });
  };
  const handleAddColumn = () => {
    if (!file) return;
    const newCol = {
      id: "col_" + Date.now(),
      name: "new_column",
      type: "text",
      isRequired: false,
      isUnique: false,
      isListCol: true,
      isFormCol: true
    };
    saveFileChanges({ ...file, columns: [...file.columns, newCol] });
  };
  const handleRemoveColumn = (colId) => {
    if (!file) return;
    const updatedCols = file.columns.filter((c) => c.id !== colId);
    saveFileChanges({ ...file, columns: updatedCols });
  };
  const handleUpdateSettingValue = (colId, key, value) => {
    handleUpdateColumnDetail(colId, { [key]: value });
  };
  const generateOutputCode = () => {
    if (!file) return "";
    return `'use client';

import React, { useState, useEffect } from 'react';

// Next.js Generated CRUD Component for module: ${file.name} (Table: ${file.tableName})
export default function ${file.name}CrudManager() {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({
${file.columns.map((c) => `    ${c.name}: ${c.type === "checkbox" ? "false" : "''"}`).join(",\n")}
  });

  useEffect(() => {
    console.log("Fetching data for table ${file.tableName}");
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Saving item:", form);
    alert("Saved Successfully (Next.js Generated output template)");
  };

  return (
    <div className="p-6 bg-white dark:bg-slate-900 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">${file.name} CRUD Administration</h2>
      
      <form onSubmit={handleSave} className="space-y-4 max-w-lg mb-8">
${file.columns.filter((c) => c.isFormCol !== false).map((c) => {
      if (c.type === "checkbox") {
        return `        <label className="flex items-center gap-2">
          <input 
            type="checkbox" 
            checked={form.${c.name}} 
            onChange={e => setForm({...form, ${c.name}: e.target.checked})} 
          />
          <span>${c.name}</span>
        </label>`;
      } else if (c.type === "textarea") {
        return `        <div>
          <label className="block text-sm font-semibold mb-1">${c.name}</label>
          <textarea 
            className="w-full border rounded p-2" 
            value={form.${c.name}} 
            onChange={e => setForm({...form, ${c.name}: e.target.value})}
          />
        </div>`;
      } else if (c.type === "select") {
        return `        <div>
          <label className="block text-sm font-semibold mb-1">${c.name}</label>
          <select 
            className="w-full border rounded p-2" 
            value={form.${c.name}} 
            onChange={e => setForm({...form, ${c.name}: e.target.value})}
          >
            <option value="">Select option</option>
            <option value="option1">Option 1</option>
            <option value="option2">Option 2</option>
          </select>
        </div>`;
      } else if (c.type === "editor") {
        return `        <div>
          <label className="block text-sm font-semibold mb-1">${c.name}</label>
          <div className="border rounded p-2 min-h-[150px] bg-slate-50">Rich Text Editor placeholder</div>
        </div>`;
      } else {
        return `        <div>
          <label className="block text-sm font-semibold mb-1">${c.name}</label>
          <input 
            type="${c.type === "number" ? "number" : c.type === "email" ? "email" : c.type === "date" ? "date" : c.type === "password" ? "password" : c.type === "url" ? "url" : c.type === "tel" ? "tel" : c.type === "time" ? "time" : c.type === "datetime-local" ? "datetime-local" : c.type === "color" ? "color" : c.type === "range" ? "range" : c.type === "file" ? "file" : c.type === "hidden" ? "hidden" : "text"}"
            className="w-full border rounded p-2" 
            value={form.${c.name}} 
            onChange={e => setForm({...form, ${c.name}: e.target.value})}
            required={${c.isRequired}}
          />
        </div>`;
      }
    }).join("\n")}
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded font-bold">
          Save Record
        </button>
      </form>

      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b bg-slate-100 dark:bg-slate-800 text-sm">
${file.columns.filter((c) => c.isListCol !== false).map((c) => `            <th className="p-3 font-semibold">${c.name}</th>`).join("\n")}
            <th className="p-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
${file.columns.filter((c) => c.isListCol !== false).map((c) => `            <td className="p-3">Sample ${c.name}</td>`).join("\n")}
            <td className="p-3 flex gap-2">
              ${file.settings.viewButton ? '<button className="text-blue-500 hover:underline text-sm">View</button>' : ""}
              ${file.settings.editButton ? '<button className="text-yellow-500 hover:underline text-sm">Edit</button>' : ""}
              ${file.settings.deleteButton ? '<button className="text-red-500 hover:underline text-sm">Delete</button>' : ""}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}`;
  };
  const handleCopyCode = () => {
    navigator.clipboard.writeText(generateOutputCode());
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2e3);
  };
  const handleSaveSettings = async () => {
    if (!project || !file) return;
    try {
      const res = await fetch("/api/crud/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project, file })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Changes saved successfully! Files successfully written to your local project directory.`, "success");
        router.push(`/dashboard/crud/${projectId}`);
      } else {
        showToast("Warning: Settings saved locally in browser, but failed to write to local directory: " + (data.error || "Unknown write error"), "warning");
        router.push(`/dashboard/crud/${projectId}`);
      }
    } catch (err) {
      showToast("Warning: Settings saved locally in browser, but failed to call file writer API: " + err.message, "warning");
      router.push(`/dashboard/crud/${projectId}`);
    }
  };
  if (!project || !file) {
    return <div style={{ padding: "24px", color: "var(--text-primary)" }}>Loading Config details...</div>;
  }
  const getPlaceholderForCol = (colName) => {
    const dbName = project.databaseName.toLowerCase();
    const colNameLower = colName.toLowerCase();
    if (dbName.includes("ecommerce") || dbName.includes("shop") || dbName.includes("cart")) {
      if (colNameLower.includes("price")) return "e.g. 29.99";
      if (colNameLower.includes("sku")) return "e.g. PROD-100-BLUE";
      if (colNameLower.includes("stock") || colNameLower.includes("qty")) return "e.g. 150";
      if (colNameLower.includes("desc")) return "Product description and specs";
    }
    if (colNameLower.includes("cgst")) return "e.g. 9%";
    if (colNameLower.includes("sgst")) return "e.g. 9%";
    if (colNameLower.includes("gst")) return "e.g. 18%";
    return "Enter value";
  };
  return <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      
      {
    /* SUB NAV BAR BANNER */
  }
      <div style={{ height: "40px", backgroundColor: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", color: "white", fontSize: "13px", fontWeight: "600", flexShrink: 0, boxShadow: "0 2px 6px rgba(0,0,0,0.05)" }}>
        <span style={{ fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.8px" }}>CRUD Builder Settings</span>
        <span style={{ color: "rgba(255,255,255,0.8)" }}>{project.name} / {file.name} / Settings</span>
      </div>

      <main style={{ flex: 1, padding: "24px", overflowY: "auto", backgroundColor: "#f8fafc" }}>
        
        <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button
    onClick={() => router.push(`/dashboard/crud/${projectId}`)}
    style={{ background: "none", border: "none", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", color: "#64748b", fontWeight: "bold", fontSize: "14px", padding: 0 }}
  >
            ← Back to File List
          </button>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
    onClick={handleAddColumn}
    style={{ backgroundColor: "#10b981", color: "white", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}
  >
              + Add Column
            </button>
            <button
    onClick={handleCopyCode}
    style={{ backgroundColor: "#3b82f6", color: "white", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}
  >
              {codeCopied ? "Copied! \u2713" : "View / Copy Code"}
            </button>
          </div>
        </div>

        <h2 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "20px", fontWeight: "bold", color: "#0f172a", marginBottom: "24px" }}>
          <span style={{ color: "#3b82f6", display: "flex", alignItems: "center" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </span>
          Edit <i>{project.name}</i> / {file.name} Settings:
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "1200px", margin: "0 auto" }}>
          
          {file.columns.map((col, idx) => {
    return <div
      key={col.id}
      style={{
        backgroundColor: "white",
        border: "1px solid #e2e8f0",
        borderRadius: "10px",
        overflow: "hidden",
        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)"
      }}
    >
                {
      /* Header bar */
    }
                <div style={{
      backgroundColor: "#3b82f6",
      color: "white",
      padding: "12px 20px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }}>
                  <span style={{ fontWeight: "bold", fontSize: "14.5px" }}>
                    {idx + 1}. Column Name: <span style={{ fontFamily: "monospace", textDecoration: "underline" }}>{col.name}</span>
                  </span>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <span style={{ fontSize: "11px", backgroundColor: "rgba(255,255,255,0.2)", padding: "3px 8px", borderRadius: "4px", fontWeight: "bold" }}>
                      {project.databaseName.toLowerCase().includes("mongodb:") ? "NoSQL Document Field" : "SQL Column"}
                    </span>
                    <button
      onClick={() => handleRemoveColumn(col.id)}
      style={{ background: "none", border: "none", color: "#ff8a8a", cursor: "pointer", fontWeight: "bold", fontSize: "14px" }}
      title="Remove Column"
    >
                      ✕ Remove
                    </button>
                  </div>
                </div>

                {
      /* Form fields */
    }
                <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
                  
                  {
      /* Row 1 */
    }
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569" }}>Input Type</label>
                      <select
      value={col.type}
      onChange={(e) => handleUpdateColumnType(col.id, e.target.value)}
      style={{ padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", backgroundColor: "white", color: "#0f172a", outline: "none", fontSize: "13.5px" }}
    >
                        <option value="text">Textbox</option>
                        <option value="password">Password</option>
                        <option value="number">Number</option>
                        <option value="email">Email</option>
                        <option value="url">URL / Link</option>
                        <option value="tel">Phone Number</option>
                        <option value="date">Date picker</option>
                        <option value="time">Time picker</option>
                        <option value="datetime-local">Date & Time picker</option>
                        <option value="color">Color Picker</option>
                        <option value="range">Range / Slider</option>
                        <option value="file">File Upload</option>
                        <option value="select">Dropdown Select</option>
                        <option value="radio">Radio Buttons</option>
                        <option value="checkbox">Checkbox / Toggle</option>
                        <option value="textarea">Textarea</option>
                        <option value="editor">Rich Text Editor</option>
                        <option value="hidden">Hidden Field</option>
                      </select>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569" }}>Label / Column Name:</label>
                      <input
      type="text"
      value={col.name}
      onChange={(e) => {
        handleUpdateColumnDetail(col.id, { name: e.target.value });
      }}
      onBlur={(e) => {
        handleUpdateColumnDetail(col.id, { name: e.target.value.toLowerCase().trim().replace(/\s+/g, "_") });
      }}
      style={{ padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", backgroundColor: "white", color: "#0f172a", outline: "none", fontSize: "13.5px" }}
    />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569" }}>Class:</label>
                      <input
      type="text"
      value={col.className !== void 0 ? col.className : "col-sm-12 col-md-6 col-lg-6 col-xl-6"}
      onChange={(e) => handleUpdateColumnDetail(col.id, { className: e.target.value })}
      style={{ padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", backgroundColor: "white", color: "#0f172a", outline: "none", fontSize: "13.5px" }}
    />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569" }}>Pattern (RegEx):</label>
                      <div style={{ display: "flex", gap: "4px" }}>
                        <input
      type="text"
      value={col.pattern || ""}
      onChange={(e) => handleUpdateColumnDetail(col.id, { pattern: e.target.value })}
      placeholder={col.type === "email" ? "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$" : "no pattern"}
      style={{ flex: 1, padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", backgroundColor: "white", color: "#0f172a", outline: "none", fontSize: "13.5px" }}
    />
                        <button type="button" style={{ border: "1px solid #cbd5e1", backgroundColor: "#f1f5f9", width: "32px", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "help" }} title="Helper tooltip info">i</button>
                      </div>
                    </div>

                  </div>

                  {
      /* Row 2 */
    }
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569" }}>Maxlength (Chars):</label>
                      <input
      type="number"
      value={col.maxLength !== void 0 ? col.maxLength : ""}
      onChange={(e) => handleUpdateColumnDetail(col.id, { maxLength: e.target.value ? parseInt(e.target.value) || void 0 : void 0 })}
      placeholder={col.type === "textarea" ? "2000" : "100"}
      style={{ padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", backgroundColor: "white", color: "#0f172a", outline: "none", fontSize: "13.5px" }}
    />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569" }}>Default Value:</label>
                      <input
      type="text"
      value={col.defaultValue || ""}
      onChange={(e) => handleUpdateColumnDetail(col.id, { defaultValue: e.target.value })}
      placeholder="NULL"
      style={{ padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", backgroundColor: "white", color: "#0f172a", outline: "none", fontSize: "13.5px" }}
    />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={{ fontSize: "13px", fontWeight: 600, color: "#475569" }}>Placeholder:</label>
                      <input
      type="text"
      value={col.placeholder || ""}
      onChange={(e) => handleUpdateColumnDetail(col.id, { placeholder: e.target.value })}
      placeholder={getPlaceholderForCol(col.name)}
      style={{ padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", backgroundColor: "white", color: "#0f172a", outline: "none", fontSize: "13.5px" }}
    />
                    </div>

                  </div>

                  {
      /* Flags row */
    }
                  <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "14px", marginTop: "6px" }}>
                    <div style={{ fontSize: "12px", fontWeight: "bold", color: "#64748b", textTransform: "uppercase", marginBottom: "10px" }}>
                      Flags for {col.name}:
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "16px" }}>
                      
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <label style={{ fontSize: "12.5px", fontWeight: 600, color: "#475569", display: "flex", alignItems: "center", gap: "4px" }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                          Required:
                        </label>
                        <select
      value={col.isRequired ? "Yes" : "No"}
      onChange={(e) => handleUpdateColumnDetail(col.id, { isRequired: e.target.value === "Yes" })}
      style={{ padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px", outline: "none" }}
    >
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <label style={{ fontSize: "12.5px", fontWeight: 600, color: "#475569", display: "flex", alignItems: "center", gap: "4px" }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                          In Add Form:
                        </label>
                        <select
      value={col.isFormCol !== false ? "Yes" : "No"}
      onChange={(e) => handleUpdateColumnDetail(col.id, { isFormCol: e.target.value === "Yes" })}
      style={{ padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px", outline: "none" }}
    >
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <label style={{ fontSize: "12.5px", fontWeight: 600, color: "#475569", display: "flex", alignItems: "center", gap: "4px" }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                          In Edit Form:
                        </label>
                        <select
      defaultValue="Yes"
      style={{ padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px", outline: "none" }}
    >
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <label style={{ fontSize: "12.5px", fontWeight: 600, color: "#475569", display: "flex", alignItems: "center", gap: "4px" }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <line x1="3" y1="9" x2="21" y2="9" />
                            <line x1="9" y1="21" x2="9" y2="9" />
                          </svg>
                          In Tables:
                        </label>
                        <select
      value={col.isListCol !== false ? "Yes" : "No"}
      onChange={(e) => handleUpdateColumnDetail(col.id, { isListCol: e.target.value === "Yes" })}
      style={{ padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px", outline: "none" }}
    >
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <label style={{ fontSize: "12.5px", fontWeight: 600, color: "#475569", display: "flex", alignItems: "center", gap: "4px" }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                          In View Page:
                        </label>
                        <select
      defaultValue="Yes"
      style={{ padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px", outline: "none" }}
    >
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </div>

                    </div>

                  </div>

                </div>
              </div>;
  })}

          <div style={{ display: "flex", justifyContent: "center", marginTop: "10px", marginBottom: "30px" }}>
            <button
    onClick={handleSaveSettings}
    style={{
      backgroundColor: "#10b981",
      color: "white",
      border: "none",
      padding: "12px 40px",
      borderRadius: "8px",
      fontSize: "15.5px",
      fontWeight: "bold",
      cursor: "pointer",
      boxShadow: "0 4px 6px -1px rgb(16 185 129 / 0.3)",
      display: "inline-flex",
      alignItems: "center",
      gap: "8px"
    }}
  >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="19 21 17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              Save Settings
            </button>
          </div>

        </div>

      </main>

    </div>;
}
