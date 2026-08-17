"use strict";
"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useToast } from "../../../../context/ToastContext";
import { getProjectsForUser, saveProjectsForUser } from "../../../../utils/projectStorage";
import SchemaCard from "../../../../../components/cards/SchemaCard";
import { databaseService } from "../../../../../services/databaseService";
import { crudService } from "../../../../../services/crudService";

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
  const [currentUser, setCurrentUser] = useState("");
  const [userRole, setUserRole] = useState("user");
  const [dbTables, setDbTables] = useState([]);

  useEffect(() => {
    const user = localStorage.getItem("currentUser") || "";
    const role = localStorage.getItem("currentUserRole") || "user";
    setCurrentUser(user);
    setUserRole(role);

    const loadData = () => {
      const projs = getProjectsForUser(user, role);
      setAllProjects(projs);
      const foundProj = projs.find((p) => p.id === projectId);
      if (foundProj) {
        setProject(foundProj);
        const foundFile = foundProj.files.find((f) => f.id === fileId);
        if (foundFile) {
          setFile(foundFile);
        }
        databaseService.getTables(foundProj.databaseName)
          .then((data) => {
            if (data.success && data.tables) {
              setDbTables(data.tables.map((t) => t.name));
            }
          })
          .catch((err) => console.error("Failed to load tables list for dynamic lookup:", err));
      }
    };

    loadData();

    window.addEventListener('projects_synced', loadData);
    return () => {
      window.removeEventListener('projects_synced', loadData);
    };
  }, [projectId, fileId]);

  const saveFileChanges = (updatedFile) => {
    if (!project) return;
    const updatedFiles = project.files.map((f) => f.id === fileId ? updatedFile : f);
    const updatedProject = { ...project, files: updatedFiles };
    const updatedProjectsList = allProjects.map((p) => p.id === projectId ? updatedProject : p);
    setProject(updatedProject);
    setFile(updatedFile);
    setAllProjects(updatedProjectsList);
    saveProjectsForUser(updatedProjectsList, currentUser, userRole);
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

  const handleUpdateGlobalSetting = (key, value) =>{
       if (!file) return 
        const updateFile = {
          ...file,
          settings: {
            ...file.settings,
            [key]: value
          }
        }
        saveFileChanges(updateFile);
  };

  const generateOutputCode = () => {
    if (!file) return "";
    const lookupTables = file.columns.filter((c) => c.type === "select" && c.selectType === "table");
    return `'use client';

import React, { useState, useEffect } from 'react';

// Next.js Generated CRUD Component for module: ${file.name} (Table: ${file.tableName})
export default function ${file.name}CrudManager() {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({
${file.columns.map((c) => `    ${c.name}: ${c.type === "checkbox" ? "false" : "''"}`).join(",\n")}
  });

  // Dynamic dropdown list option states
${lookupTables.map((c) => `  const [${c.name}Options, set${c.name}Options] = useState<any[]>([]);`).join("\n")}

  useEffect(() => {
    console.log("Fetching data for table ${file.tableName}");
    // Fetch dynamic select dropdown lookup data
${lookupTables.map((c) => `    fetch(\`/api/${c.selectLookupTable}\`).then(res => res.json()).then(data => { if (data.success) { set${c.name}Options(data.data || []); } });`).join("\n")}
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
        if (c.selectType === "table") {
          return `        <div>
          <label className="block text-sm font-semibold mb-1">${c.name}</label>
          <select 
            className="w-full border rounded p-2" 
            value={form.${c.name}} 
            onChange={e => setForm({...form, ${c.name}: e.target.value})}
          >
            <option value="">Select option</option>
            {${c.name}Options.map((opt: any) => (
              <option key={opt.${c.selectLookupValue || "id"}} value={opt.${c.selectLookupValue || "id"}}>
                {opt.${c.selectLookupLabel || "name"} || opt.${c.selectLookupValue || "id"}}
              </option>
            ))}
          </select>
        </div>`;
        } else {
          return `        <div>
          <label className="block text-sm font-semibold mb-1">${c.name}</label>
          <select 
            className="w-full border rounded p-2" 
            value={form.${c.name}} 
            onChange={e => setForm({...form, ${c.name}: e.target.value})}
          >
            <option value="">Select option</option>
            ${(c.selectOptions || []).map(opt => `<option value="${opt}">${opt}</option>`).join('\n            ')}
          </select>
        </div>`;
        }
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
      const data = await crudService.generateCrud(project, file);
      showToast(`Changes saved successfully! Files successfully written to your local project directory.`, "success");
      router.push(`/dashboard/crud/${projectId}`);
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

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* SUB NAV BAR BANNER */}
      <div style={{ height: "40px", backgroundColor: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", color: "white", fontSize: "13px", fontWeight: "600", flexShrink: 0, boxShadow: "0 2px 6px rgba(0,0,0,0.05)" }}>
        <span style={{ fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.8px" }}>CRUD Builder Settings</span>
        <span style={{ color: "rgba(255,255,255,0.8)" }}>{project.name} / {file.name} / Settings</span>
      </div>

      <main style={{ flex: 1, padding: "24px", overflowY: "auto", backgroundColor: "var(--bg-primary)" }}>
        <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button
            onClick={() => router.push(`/dashboard/crud/${projectId}`)}
            style={{ background: "none", border: "none", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", color: "var(--text-muted)", fontWeight: "bold", fontSize: "14px", padding: 0 }}
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

        <h2 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "20px", fontWeight: "bold", color: "var(--text-primary)", marginBottom: "24px" }}>
          <span style={{ color: "#3b82f6", display: "flex", alignItems: "center" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </span>
          Edit <i>{project.name}</i> / {file.name} Settings:
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "1200px", margin: "0 auto" }}>
          {/* GLOBAL SETTINGS CARD */}
          <div
            style={{
              backgroundColor: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
              borderRadius: "10px",
              padding: "20px",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
              marginBottom: "10px"
            }}
          >
            <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: "bold", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
              <i className="fa-solid fa-gears" style={{ color: "#3b82f6" }}></i> Global Code Generation Settings
            </h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxWidth: "450px" }}>
              <label style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text-primary)" }}>API / UI Target:</label>
              <select
                value={file.settings.apiTarget || "admin"}
                onChange={(e) => handleUpdateGlobalSetting("apiTarget", e.target.value)}
                style={{ padding: "10px 12px", border: "1px solid var(--border-color)", borderRadius: "6px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", outline: "none", fontSize: "14px" }}
              >
                <option value="admin">Admin Panel Only (admin-panel & apiAdmin)</option>
                <option value="customer">Customer Website Only (website & apiCustomer)</option>
                <option value="both">Both Projects (Shared API & UI)</option>
              </select>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                Specifies where the generated UI components and API backend routes will be saved inside your root project folder.
              </span>
            </div>
          </div>

          {/* PREMIUM FEATURES CARD */}
          <div
            style={{
              backgroundColor: "var(--bg-secondary)",
              border: "1px solid var(--border-color)",
              borderRadius: "10px",
              padding: "20px",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
              marginBottom: "10px"
            }}
          >
            <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: "bold", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
              <i className="fa-solid fa-gem" style={{ color: "#8b5cf6" }}></i> Premium Admin Features
            </h3>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "20px", marginTop: "-10px" }}>
              Select which advanced features to map and generate for this CRUD component.
            </p>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "16px" }}>
              {[
                { key: "enableGrid", label: "Grid / Card View Layout", icon: "fa-grip" },
                { key: "enableMultipleImages", label: "Multiple Image Upload (Drag & Drop)", icon: "fa-images" },
                { key: "enableExportCsv", label: "Export to CSV / Excel", icon: "fa-file-csv" },
                { key: "enableKpiStats", label: "KPI Statistics Bar", icon: "fa-chart-line" },
                { key: "enableRealtimeSync", label: "Real-time Database Sync", icon: "fa-bolt" },
                { key: "enableAdvancedFilters", label: "Advanced Filters & Sorting", icon: "fa-filter" }
              ].map(feature => (
                <label key={feature.key} style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", padding: "12px", border: "1px solid var(--border-color)", borderRadius: "8px", backgroundColor: file.settings?.[feature.key] ? "rgba(139, 92, 246, 0.05)" : "transparent", transition: "all 0.2s" }}>
                  <input
                    type="checkbox"
                    checked={!!file.settings?.[feature.key]}
                    onChange={() => handleToggleSetting(feature.key)}
                    style={{ width: "16px", height: "16px", accentColor: "#8b5cf6", cursor: "pointer" }}
                  />
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <i className={`fa-solid ${feature.icon}`} style={{ color: file.settings?.[feature.key] ? "#8b5cf6" : "var(--text-muted)", width: "16px", textAlign: "center" }}></i>
                    <span style={{ fontSize: "13.5px", fontWeight: file.settings?.[feature.key] ? "600" : "500", color: file.settings?.[feature.key] ? "#8b5cf6" : "var(--text-primary)" }}>
                      {feature.label}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {file.columns
            .filter(col => !['id', 'created_at', 'updated_at', 'deleted_at', 'is_deleted', 'password'].includes(col.name.toLowerCase()))
            .map((col, idx) => (
            <SchemaCard
              key={col.id}
              col={col}
              idx={idx}
              project={project}
              dbTables={dbTables}
              handleRemoveColumn={handleRemoveColumn}
              handleUpdateColumnType={handleUpdateColumnType}
              handleUpdateColumnDetail={handleUpdateColumnDetail}
              getPlaceholderForCol={getPlaceholderForCol}
            />
          ))}

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
    </div>
  );
}
