"use strict";
"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useToast } from "../../../../context/ToastContext";
export default function AdvancedCrudBuilder() {
  const { showToast } = useToast();
  const router = useRouter();
  const params = useParams();
  const projectId = params?.projectId;
  const [project, setProject] = useState(null);
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState("");
  const [columnsMap, setColumnsMap] = useState({});
  const [projectConfig, setProjectConfig] = useState({});
  const [selectedFieldName, setSelectedFieldName] = useState("");
  const [activeTab, setActiveTab] = useState("List");
  useEffect(() => {
    const stored = localStorage.getItem("crudProjects");
    if (stored) {
      try {
        const projs = JSON.parse(stored);
        const foundProj = projs.find((p) => p.id === projectId);
        if (foundProj) {
          setProject(foundProj);
          fetchDatabaseTables(foundProj.databaseName);
        }
      } catch (e) {
        console.error("Failed to parse projects", e);
      }
    }
  }, [projectId]);
  const fetchDatabaseTables = async (dbName) => {
    try {
      const res = await fetch(`/api/database/tables?dbName=${encodeURIComponent(dbName)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.tables) {
          const tableNames = data.tables.map((t) => t.name);
          setTables(tableNames);
          const initialConfigs = {};
          const map = {};
          for (const tbl of tableNames) {
            const matchedTbl = data.tables.find((t) => t.name === tbl);
            if (matchedTbl && matchedTbl.columns) {
              const cols = matchedTbl.columns.map((c) => ({
                Field: c.name,
                Type: c.type
              }));
              map[tbl] = cols;
              initialConfigs[tbl] = generateDefaultTableConfig(tbl, cols);
            }
          }
          setColumnsMap(map);
          setProjectConfig(initialConfigs);
          if (tableNames.length > 0) {
            setSelectedTable(tableNames[0]);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch tables/columns for builder:", err);
    }
  };
  const generateDefaultTableConfig = (tableName, cols) => {
    const list_view = [];
    const create_form = [];
    const edit_form = [];
    const detail_view = [];
    cols.forEach((col, idx) => {
      const name = col.Field;
      const type = col.Type.toLowerCase();
      const isNum = type.includes("int") || type.includes("decimal") || type.includes("float") || type.includes("double");
      const isDate = type.includes("date") || type.includes("time") || type.includes("timestamp");
      const isText = type.includes("text");
      list_view.push({
        fieldName: name,
        show: true,
        label: name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, " "),
        width: "auto",
        align: "left",
        sortable: true,
        searchable: !isDate,
        filterable: isDate || name.includes("status"),
        filterType: isDate ? "date range" : name.includes("status") ? "dropdown" : "text",
        displayFormat: "raw",
        truncateLength: 100
      });
      let widgetType = "text";
      if (isNum) widgetType = "number";
      else if (isDate) widgetType = "date picker";
      else if (isText) widgetType = "textarea";
      else if (name.includes("status") || name.includes("role")) widgetType = "select";
      else if (name.includes("image") || name.includes("avatar") || name.includes("pic")) widgetType = "image uploader";
      else if (name.includes("file") || name.includes("pdf") || name.includes("doc")) widgetType = "file uploader";
      else if (name.includes("is_") || name.includes("has_") || name.includes("active") || type.includes("tinyint")) widgetType = "toggle";
      create_form.push({
        fieldName: name,
        show: true,
        widgetType,
        label: name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, " "),
        placeholder: `Enter ${name.replace(/_/g, " ")}`,
        helpText: "",
        defaultValue: "",
        required: false,
        validationRules: [],
        readOnly: false,
        order: idx + 1,
        section: "General Info",
        conditionalVisibility: []
      });
      edit_form.push({
        fieldName: name,
        show: true,
        widgetType,
        label: name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, " "),
        placeholder: `Enter ${name.replace(/_/g, " ")}`,
        helpText: "",
        defaultValue: "",
        required: false,
        validationRules: [],
        readOnly: false,
        order: idx + 1,
        section: "General Info",
        conditionalVisibility: [],
        editable: true
      });
      let detailFormat = "raw";
      if (name.includes("image") || name.includes("avatar") || name.includes("pic")) detailFormat = "full image";
      else if (name.includes("email")) detailFormat = "email link";
      else if (name.includes("phone") || name.includes("tel")) detailFormat = "phone link";
      else if (isDate) detailFormat = "formatted date";
      else if (isText) detailFormat = "rendered html";
      detail_view.push({
        fieldName: name,
        show: true,
        label: name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, " "),
        displayFormat: detailFormat,
        layout: "half",
        section: "Summary Details",
        copyToClipboard: name.includes("id") || name.includes("key") || name.includes("token")
      });
    });
    return {
      tableName,
      sections: ["General Info", "Summary Details"],
      list_view,
      create_form,
      edit_form,
      detail_view
    };
  };
  const currentTableConfig = projectConfig[selectedTable];
  const activeColumns = columnsMap[selectedTable] || [];
  const currentFieldConfig = currentTableConfig ? {
    List: currentTableConfig.list_view.find((f) => f.fieldName === selectedFieldName),
    Create: currentTableConfig.create_form.find((f) => f.fieldName === selectedFieldName),
    Edit: currentTableConfig.edit_form.find((f) => f.fieldName === selectedFieldName),
    Detail: currentTableConfig.detail_view.find((f) => f.fieldName === selectedFieldName)
  } : null;
  const updateFieldSetting = (tab, key, value) => {
    if (!currentTableConfig || !selectedFieldName) return;
    let updatedTableConfig = { ...currentTableConfig };
    if (tab === "List") {
      updatedTableConfig.list_view = currentTableConfig.list_view.map(
        (f) => f.fieldName === selectedFieldName ? { ...f, [key]: value } : f
      );
    } else if (tab === "Create") {
      updatedTableConfig.create_form = currentTableConfig.create_form.map(
        (f) => f.fieldName === selectedFieldName ? { ...f, [key]: value } : f
      );
    } else if (tab === "Edit") {
      updatedTableConfig.edit_form = currentTableConfig.edit_form.map(
        (f) => f.fieldName === selectedFieldName ? { ...f, [key]: value } : f
      );
    } else if (tab === "Detail") {
      updatedTableConfig.detail_view = currentTableConfig.detail_view.map(
        (f) => f.fieldName === selectedFieldName ? { ...f, [key]: value } : f
      );
    }
    setProjectConfig({
      ...projectConfig,
      [selectedTable]: updatedTableConfig
    });
  };
  const handleCopyCreateToEdit = () => {
    if (!currentTableConfig || !selectedFieldName) return;
    const createConfig = currentTableConfig.create_form.find((f) => f.fieldName === selectedFieldName);
    if (!createConfig) return;
    const updatedTableConfig = { ...currentTableConfig };
    updatedTableConfig.edit_form = currentTableConfig.edit_form.map(
      (f) => f.fieldName === selectedFieldName ? { ...f, ...createConfig, editable: f.editable ?? true } : f
    );
    setProjectConfig({
      ...projectConfig,
      [selectedTable]: updatedTableConfig
    });
    showToast("Create Form settings copied to Edit Form!", "success");
  };
  const handleResetTabToDefault = () => {
    if (!currentTableConfig || !selectedFieldName) return;
    const defaults = generateDefaultTableConfig(selectedTable, activeColumns);
    const updatedTableConfig = { ...currentTableConfig };
    if (activeTab === "List") {
      const def = defaults.list_view.find((f) => f.fieldName === selectedFieldName);
      updatedTableConfig.list_view = currentTableConfig.list_view.map((f) => f.fieldName === selectedFieldName ? def : f);
    } else if (activeTab === "Create") {
      const def = defaults.create_form.find((f) => f.fieldName === selectedFieldName);
      updatedTableConfig.create_form = currentTableConfig.create_form.map((f) => f.fieldName === selectedFieldName ? def : f);
    } else if (activeTab === "Edit") {
      const def = defaults.edit_form.find((f) => f.fieldName === selectedFieldName);
      updatedTableConfig.edit_form = currentTableConfig.edit_form.map((f) => f.fieldName === selectedFieldName ? def : f);
    } else if (activeTab === "Detail") {
      const def = defaults.detail_view.find((f) => f.fieldName === selectedFieldName);
      updatedTableConfig.detail_view = currentTableConfig.detail_view.map((f) => f.fieldName === selectedFieldName ? def : f);
    }
    setProjectConfig({
      ...projectConfig,
      [selectedTable]: updatedTableConfig
    });
  };
  const handleExportJson = () => {
    const configArray = Object.values(projectConfig);
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(configArray, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${project?.name || "project"}_crud_config.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };
  const handleImportJson = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result);
        if (Array.isArray(parsed)) {
          const newConfig = {};
          const newTables = [];
          const newColumnsMap = {};
          parsed.forEach((tableConf) => {
            if (tableConf.tableName) {
              newConfig[tableConf.tableName] = tableConf;
              newTables.push(tableConf.tableName);
              const fields = tableConf.list_view || [];
              newColumnsMap[tableConf.tableName] = fields.map((f) => ({
                Field: f.fieldName,
                Type: "VARCHAR"
                // Default type since JSON holds UI behavioral config
              }));
            }
          });
          if (newTables.length > 0) {
            setProjectConfig(newConfig);
            setTables(newTables);
            setColumnsMap(newColumnsMap);
            setSelectedTable(newTables[0]);
            setSelectedFieldName("");
            showToast("CRUD JSON Configuration imported successfully! UI behaviour maps updated.", "success");
          } else {
            showToast("Invalid config format: no valid tables found.", "error");
          }
        } else {
          showToast("Expected a JSON array containing table configurations.", "error");
        }
      } catch (err) {
        showToast("Failed to parse JSON configuration file: " + err.message, "error");
      }
    };
    reader.readAsText(file);
  };
  const handleAddSection = (sectionName) => {
    if (!sectionName.trim() || !currentTableConfig) return;
    if (currentTableConfig.sections.includes(sectionName.trim())) return;
    const updated = { ...currentTableConfig, sections: [...currentTableConfig.sections, sectionName.trim()] };
    setProjectConfig({ ...projectConfig, [selectedTable]: updated });
  };
  const renderLivePreview = () => {
    if (!selectedFieldName || !currentFieldConfig) {
      return <div style={{ color: "var(--text-muted)", fontSize: "13px", textAlign: "center", padding: "20px" }}>Select a field to preview</div>;
    }
    if (activeTab === "List") {
      const cfg = currentFieldConfig.List;
      if (!cfg || !cfg.show) return <div style={{ color: "var(--text-muted)", fontSize: "13px" }}>(Hidden Column)</div>;
      return <div style={{ padding: "10px", backgroundColor: "var(--bg-secondary)", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "bold", borderBottom: "1px solid var(--border-color)", paddingBottom: "4px", marginBottom: "8px", textAlign: cfg.align }}>
            {cfg.label} {cfg.sortable && "\u21C5"}
          </div>
          <div style={{ textAlign: cfg.align, fontSize: "13.5px", color: "var(--text-primary)" }}>
            {cfg.displayFormat === "badge" && <span style={{ backgroundColor: "#bae6fd", color: "#0369a1", padding: "2px 8px", borderRadius: "12px", fontSize: "11.5px", fontWeight: "bold" }}>Active Badge</span>}
            {cfg.displayFormat === "thumbnail" && <div style={{ width: "40px", height: "40px", backgroundColor: "#e2e8f0", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "#64748b" }}>Image</div>}
            {cfg.displayFormat === "currency" && "$120.00"}
            {cfg.displayFormat === "percentage" && "85%"}
            {cfg.displayFormat === "relative date" && "2 days ago"}
            {cfg.displayFormat === "raw" && "Sample Value text here..."}
          </div>
        </div>;
    }
    if (activeTab === "Create" || activeTab === "Edit") {
      const cfg = activeTab === "Create" ? currentFieldConfig.Create : currentFieldConfig.Edit;
      if (!cfg || !cfg.show) return <div style={{ color: "var(--text-muted)", fontSize: "13px" }}>(Hidden Field)</div>;
      return <div style={{ display: "flex", flexDirection: "column", gap: "4px", padding: "10px", backgroundColor: "var(--bg-secondary)", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
          <label style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-primary)" }}>
            {cfg.label} {cfg.required && <span style={{ color: "#ef4444" }}>*</span>}
          </label>
          
          {cfg.widgetType === "text" && <input type="text" placeholder={cfg.placeholder} defaultValue={cfg.defaultValue} disabled={cfg.readOnly} style={{ padding: "6px 10px", fontSize: "13px", borderRadius: "4px", border: "1px solid var(--border-color)", outline: "none", width: "100%", boxSizing: "border-box" }} />}
          {cfg.widgetType === "number" && <input type="number" placeholder={cfg.placeholder} defaultValue={cfg.defaultValue} disabled={cfg.readOnly} style={{ padding: "6px 10px", fontSize: "13px", borderRadius: "4px", border: "1px solid var(--border-color)", outline: "none", width: "100%", boxSizing: "border-box" }} />}
          {cfg.widgetType === "textarea" && <textarea placeholder={cfg.placeholder} defaultValue={cfg.defaultValue} disabled={cfg.readOnly} rows={2} style={{ padding: "6px 10px", fontSize: "13px", borderRadius: "4px", border: "1px solid var(--border-color)", outline: "none", width: "100%", boxSizing: "border-box", resize: "vertical" }} />}
          {cfg.widgetType === "toggle" && <div style={{ display: "flex", alignItems: "center", height: "28px" }}>
              <div style={{ width: "36px", height: "20px", borderRadius: "10px", backgroundColor: "#3b82f6", position: "relative" }}>
                <div style={{ width: "16px", height: "16px", borderRadius: "50%", backgroundColor: "white", position: "absolute", top: "2px", left: "18px" }} />
              </div>
            </div>}
          {cfg.widgetType === "checkbox" && <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}><input type="checkbox" defaultChecked /> Confirm option</label>}
          {cfg.widgetType === "date picker" && <input type="date" disabled={cfg.readOnly} style={{ padding: "6px 10px", fontSize: "13px", borderRadius: "4px", border: "1px solid var(--border-color)", outline: "none", width: "100%", boxSizing: "border-box" }} />}
          {cfg.widgetType === "select" && <select disabled={cfg.readOnly} style={{ padding: "6px 10px", fontSize: "13px", borderRadius: "4px", border: "1px solid var(--border-color)", backgroundColor: "white", width: "100%" }}>
              <option>-- Choose value --</option>
              <option>Option A</option>
              <option>Option B</option>
            </select>}
          {cfg.widgetType === "color picker" && <input type="color" defaultValue="#3b82f6" style={{ width: "40px", height: "30px", border: "none", cursor: "pointer" }} />}
          {cfg.widgetType === "hidden" && <div style={{ fontSize: "12px", color: "var(--text-muted)", fontStyle: "italic" }}>(Hidden input field container)</div>}
          
          {cfg.helpText && <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{cfg.helpText}</span>}
        </div>;
    }
    if (activeTab === "Detail") {
      const cfg = currentFieldConfig.Detail;
      if (!cfg || !cfg.show) return <div style={{ color: "var(--text-muted)", fontSize: "13px" }}>(Hidden Column)</div>;
      return <div style={{ padding: "10px", backgroundColor: "var(--bg-secondary)", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "bold", marginBottom: "2px" }}>{cfg.label}:</div>
          <div style={{ fontSize: "13.5px", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
            {cfg.displayFormat === "badge" && <span style={{ backgroundColor: "#e0f2fe", color: "#0369a1", padding: "2px 8px", borderRadius: "12px", fontSize: "11.5px", fontWeight: "bold" }}>Sample Badge</span>}
            {cfg.displayFormat === "email link" && <a href="mailto:email@example.com" style={{ color: "#3b82f6", textDecoration: "underline" }}>email@example.com</a>}
            {cfg.displayFormat === "phone link" && <a href="tel:+919876543210" style={{ color: "#3b82f6", textDecoration: "underline" }}>+91 98765 43210</a>}
            {cfg.displayFormat === "full image" && <div style={{ width: "100%", height: "80px", backgroundColor: "#f1f5f9", border: "1px dashed var(--border-color)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", color: "#64748b" }}>Full Width Image Box</div>}
            {cfg.displayFormat === "raw" && "Raw Value Text..."}
            
            {cfg.copyToClipboard && <button style={{ border: "1px solid var(--border-color)", backgroundColor: "white", padding: "2px 6px", borderRadius: "4px", fontSize: "10px", cursor: "pointer" }}>Copy</button>}
          </div>
        </div>;
    }
    return null;
  };
  if (!project) {
    return <div style={{ padding: "24px", color: "var(--text-primary)" }}>Loading CRUD details...</div>;
  }
  return <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", backgroundColor: "var(--bg-primary)" }}>
      {
    /* SUB NAV BAR BANNER */
  }
      <div style={{ height: "50px", backgroundColor: "#1e293b", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", color: "white", fontSize: "14px", fontWeight: "600", flexShrink: 0, boxShadow: "0 2px 6px rgba(0,0,0,0.1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={() => router.push(`/dashboard/crud/${projectId}`)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "16px", cursor: "pointer", fontWeight: "bold" }}>←</button>
          <span style={{ fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.8px" }}>Advanced CRUD Builder Workspace</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ color: "#94a3b8", fontSize: "13px" }}>Database: <b>{project.databaseName}</b></span>
          <button
    onClick={handleExportJson}
    style={{ backgroundColor: "#10b981", color: "white", border: "none", padding: "6px 16px", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}
  >
            Export JSON Schema
          </button>
          <label
    style={{ backgroundColor: "#3b82f6", color: "white", padding: "6px 16px", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "bold", display: "inline-block" }}
  >
            Import JSON Config
            <input
    type="file"
    accept=".json"
    onChange={handleImportJson}
    style={{ display: "none" }}
  />
          </label>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {
    /* COLUMN 1: LEFT SIDEBAR (Tables List) */
  }
        <aside style={{ width: "260px", borderRight: "1px solid var(--border-color)", backgroundColor: "var(--bg-secondary)", overflowY: "auto", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: "16px", borderBottom: "1px solid var(--border-color)", fontSize: "12px", fontWeight: "bold", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px" }}>
            Tables in database
          </div>
          <div style={{ display: "flex", flexDirection: "column", padding: "8px" }}>
            {tables.map((tbl) => <button
    key={tbl}
    onClick={() => {
      setSelectedTable(tbl);
      setSelectedFieldName("");
    }}
    style={{
      textAlign: "left",
      padding: "10px 14px",
      borderRadius: "6px",
      border: "none",
      fontSize: "13.5px",
      fontWeight: selectedTable === tbl ? "bold" : "normal",
      backgroundColor: selectedTable === tbl ? "rgba(59, 130, 246, 0.08)" : "transparent",
      color: selectedTable === tbl ? "#3b82f6" : "var(--text-primary)",
      cursor: "pointer",
      marginBottom: "2px",
      display: "flex",
      alignItems: "center",
      gap: "8px"
    }}
  >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
                {tbl}
              </button>)}
          </div>
        </aside>

        {
    /* COLUMN 2: CENTER PANEL (Field List & Sections Manager) */
  }
        <main style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: "20px", borderRight: "1px solid var(--border-color)" }}>
          {selectedTable ? <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ fontSize: "18px", fontWeight: "bold", color: "var(--text-primary)", margin: 0 }}>
                  Fields in <i>{selectedTable}</i>
                </h2>
                
                {
    /* Custom Section Creator */
  }
                <div style={{ display: "flex", gap: "6px" }}>
                  <input
    type="text"
    id="newSectionInput"
    placeholder="New Form Section..."
    style={{ padding: "6px 10px", fontSize: "13px", borderRadius: "6px", border: "1px solid var(--border-color)", outline: "none", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)" }}
    onKeyDown={(e) => {
      if (e.key === "Enter") {
        handleAddSection(e.currentTarget.value);
        e.currentTarget.value = "";
      }
    }}
  />
                  <button
    onClick={() => {
      const input = document.getElementById("newSectionInput");
      if (input) {
        handleAddSection(input.value);
        input.value = "";
      }
    }}
    style={{ backgroundColor: "#3b82f6", color: "white", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}
  >
                    + Add
                  </button>
                </div>
              </div>

              {
    /* Sections Display */
  }
              {currentTableConfig && currentTableConfig.sections.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", padding: "12px", backgroundColor: "var(--bg-tertiary)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "bold", textTransform: "uppercase", display: "flex", alignItems: "center", marginRight: "6px" }}>Defined Sections:</span>
                  {currentTableConfig.sections.map((sec) => <span key={sec} style={{ fontSize: "12px", backgroundColor: "rgba(59,130,246,0.1)", color: "#3b82f6", padding: "3px 8px", borderRadius: "4px", fontWeight: "500" }}>
                      {sec}
                    </span>)}
                </div>}

              {
    /* Fields List Table */
  }
              <div style={{ border: "1px solid var(--border-color)", borderRadius: "8px", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13.5px" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--border-color)", backgroundColor: "var(--bg-tertiary)" }}>
                      <th style={{ padding: "12px 16px", color: "var(--text-secondary)", fontWeight: 600 }}>Field (Database Column)</th>
                      <th style={{ padding: "12px 16px", color: "var(--text-secondary)", fontWeight: 600 }}>Type</th>
                      <th style={{ padding: "12px 16px", color: "var(--text-secondary)", fontWeight: 600 }}>Configs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeColumns.map((col) => {
    const isSelected = selectedFieldName === col.Field;
    const isShownInList = currentTableConfig?.list_view.find((f) => f.fieldName === col.Field)?.show ?? true;
    const isShownInCreate = currentTableConfig?.create_form.find((f) => f.fieldName === col.Field)?.show ?? true;
    const isShownInEdit = currentTableConfig?.edit_form.find((f) => f.fieldName === col.Field)?.show ?? true;
    const isShownInDetail = currentTableConfig?.detail_view.find((f) => f.fieldName === col.Field)?.show ?? true;
    return <tr
      key={col.Field}
      onClick={() => setSelectedFieldName(col.Field)}
      style={{
        borderBottom: "1px solid var(--border-color)",
        backgroundColor: isSelected ? "rgba(59, 130, 246, 0.04)" : "transparent",
        cursor: "pointer",
        transition: "background-color 0.1s"
      }}
    >
                          <td style={{ padding: "14px 16px", fontFamily: "monospace", fontWeight: "bold", color: isSelected ? "#3b82f6" : "var(--text-primary)" }}>
                            {col.Field}
                          </td>
                          <td style={{ padding: "14px 16px", color: "var(--text-muted)" }}>{col.Type}</td>
                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ display: "flex", gap: "4px" }}>
                              <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", backgroundColor: isShownInList ? "#10b981" : "#ef4444", color: "white", fontWeight: "bold" }}>List</span>
                              <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", backgroundColor: isShownInCreate ? "#10b981" : "#ef4444", color: "white", fontWeight: "bold" }}>Create</span>
                              <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", backgroundColor: isShownInEdit ? "#10b981" : "#ef4444", color: "white", fontWeight: "bold" }}>Edit</span>
                              <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", backgroundColor: isShownInDetail ? "#10b981" : "#ef4444", color: "white", fontWeight: "bold" }}>Detail</span>
                            </div>
                          </td>
                        </tr>;
  })}
                  </tbody>
                </table>
              </div>
            </> : <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
              Select a table from the sidebar to configure fields.
            </div>}
        </main>

        {
    /* COLUMN 3: RIGHT PANEL (Field Changer & Preview panel) */
  }
        <aside style={{ width: "450px", borderLeft: "1px solid var(--border-color)", backgroundColor: "var(--bg-secondary)", overflowY: "auto", flexShrink: 0, display: "flex", flexDirection: "column" }}>
          {selectedFieldName && currentTableConfig ? <>
              {
    /* Tabs Switcher */
  }
              <div style={{ display: "flex", borderBottom: "1px solid var(--border-color)", backgroundColor: "var(--bg-tertiary)" }}>
                {["List", "Create", "Edit", "Detail"].map((tab) => <button
    key={tab}
    onClick={() => setActiveTab(tab)}
    style={{
      flex: 1,
      padding: "12px 0",
      border: "none",
      backgroundColor: "transparent",
      borderBottom: activeTab === tab ? "3px solid #3b82f6" : "3px solid transparent",
      color: activeTab === tab ? "#3b82f6" : "var(--text-muted)",
      fontWeight: "bold",
      fontSize: "13px",
      cursor: "pointer",
      transition: "all 0.15s"
    }}
  >
                    {tab} View
                  </button>)}
              </div>

              {
    /* Settings Form Panel */
  }
              <div style={{ flex: 1, padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "10px" }}>
                  <span style={{ fontSize: "14.5px", fontWeight: "bold", color: "var(--text-primary)", fontFamily: "monospace" }}>
                    Configure: {selectedFieldName}
                  </span>
                  
                  <div style={{ display: "flex", gap: "8px" }}>
                    {activeTab === "Edit" && <button
    onClick={handleCopyCreateToEdit}
    style={{ border: "1px solid #cbd5e1", backgroundColor: "white", color: "#475569", fontSize: "11px", padding: "3px 8px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
    title="Copy all Create settings to Edit"
  >
                        Copy Create Settings
                      </button>}
                    <button
    onClick={handleResetTabToDefault}
    style={{ border: "1px solid #fca5a5", backgroundColor: "#fef2f2", color: "#ef4444", fontSize: "11px", padding: "3px 8px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
  >
                      Reset to Default
                    </button>
                  </div>
                </div>

                {
    /* -------------------- TAB: LIST VIEW -------------------- */
  }
                {activeTab === "List" && currentFieldConfig?.List && <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13.5px", fontWeight: 600, color: "var(--text-primary)" }}>
                      <input type="checkbox" checked={currentFieldConfig.List.show} onChange={(e) => updateFieldSetting("List", "show", e.target.checked)} />
                      Show Column in Table List
                    </label>

                    <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                      <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted)" }}>Display Column Label:</label>
                      <input type="text" value={currentFieldConfig.List.label} onChange={(e) => updateFieldSetting("List", "label", e.target.value)} style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "13.5px", outline: "none" }} />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                        <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted)" }}>Column Width (e.g. 150px):</label>
                        <input type="text" value={currentFieldConfig.List.width} onChange={(e) => updateFieldSetting("List", "width", e.target.value)} style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "13.5px", outline: "none" }} />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                        <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted)" }}>Alignment:</label>
                        <select value={currentFieldConfig.List.align} onChange={(e) => updateFieldSetting("List", "align", e.target.value)} style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "13.5px", outline: "none" }}>
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--text-primary)" }}>
                        <input type="checkbox" checked={currentFieldConfig.List.sortable} onChange={(e) => updateFieldSetting("List", "sortable", e.target.checked)} />
                        Sortable Column
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--text-primary)" }}>
                        <input type="checkbox" checked={currentFieldConfig.List.searchable} onChange={(e) => updateFieldSetting("List", "searchable", e.target.checked)} />
                        Searchable Field
                      </label>
                    </div>

                    <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "14px", display: "flex", flexDirection: "column", gap: "14px" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                        <input type="checkbox" checked={currentFieldConfig.List.filterable} onChange={(e) => updateFieldSetting("List", "filterable", e.target.checked)} />
                        Enable Filter Sidebar Options
                      </label>
                      
                      {currentFieldConfig.List.filterable && <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                          <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted)" }}>Filter Selector Type:</label>
                          <select value={currentFieldConfig.List.filterType} onChange={(e) => updateFieldSetting("List", "filterType", e.target.value)} style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "13.5px", outline: "none" }}>
                            <option value="text">Text Box</option>
                            <option value="date range">Date Range Picker</option>
                            <option value="dropdown">Dropdown Options</option>
                            <option value="boolean">Boolean (Yes/No)</option>
                          </select>
                        </div>}
                    </div>

                    <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "14px", display: "flex", flexDirection: "column", gap: "12px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                        <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted)" }}>Display Value Format:</label>
                        <select value={currentFieldConfig.List.displayFormat} onChange={(e) => updateFieldSetting("List", "displayFormat", e.target.value)} style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "13.5px", outline: "none" }}>
                          <option value="raw">Raw Value (Text/Integer)</option>
                          <option value="badge">Badge Status Marker</option>
                          <option value="thumbnail">Mini Image Thumbnail</option>
                          <option value="relative date">Relative Date (e.g. 2 days ago)</option>
                          <option value="formatted number">Formatted Number</option>
                          <option value="currency">Currency format ($)</option>
                          <option value="percentage">Percentage (%)</option>
                          <option value="relation label">Foreign Key Relation Label</option>
                        </select>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                        <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted)" }}>Max Truncate Character Length:</label>
                        <input type="number" value={currentFieldConfig.List.truncateLength} onChange={(e) => updateFieldSetting("List", "truncateLength", Number(e.target.value))} style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "13.5px", outline: "none" }} />
                      </div>
                    </div>
                  </div>}

                {
    /* -------------------- TAB: CREATE & EDIT FORM -------------------- */
  }
                {(activeTab === "Create" || activeTab === "Edit") && (activeTab === "Create" ? currentFieldConfig?.Create : currentFieldConfig?.Edit) && <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    {(() => {
    if (!currentFieldConfig) return null;
    const cfg = activeTab === "Create" ? currentFieldConfig.Create : currentFieldConfig.Edit;
    return <>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                              <input type="checkbox" checked={cfg.show} onChange={(e) => updateFieldSetting(activeTab, "show", e.target.checked)} />
                              Show Field in Form
                            </label>
                            
                            {activeTab === "Edit" && <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                                <input type="checkbox" checked={cfg.editable} onChange={(e) => updateFieldSetting("Edit", "editable", e.target.checked)} />
                                Editable (Unlock field)
                              </label>}
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                            <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted)" }}>Form Widget Type:</label>
                            <select value={cfg.widgetType} onChange={(e) => updateFieldSetting(activeTab, "widgetType", e.target.value)} style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "13.5px", outline: "none" }}>
                              <option value="text">Single Line Text input</option>
                              <option value="textarea">Textarea Box</option>
                              <option value="rich text">Rich Text HTML Editor</option>
                              <option value="number">Numeric Decimal Input</option>
                              <option value="select">Dropdown option selector</option>
                              <option value="multi-select">Multi-select options dropdown</option>
                              <option value="searchable select">Searchable Select option</option>
                              <option value="date picker">Date picker</option>
                              <option value="time picker">Time selector</option>
                              <option value="datetime picker">Date & Time picker</option>
                              <option value="file uploader">General File Uploader</option>
                              <option value="image uploader">Direct Image Uploader</option>
                              <option value="toggle">Toggle Slider Switch</option>
                              <option value="checkbox">Standard Checkbox</option>
                              <option value="color picker">Hex Color Picker</option>
                              <option value="slug">URL Slug generator</option>
                              <option value="hidden">Hidden Input element</option>
                            </select>
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                            <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted)" }}>Form Label Title:</label>
                            <input type="text" value={cfg.label} onChange={(e) => updateFieldSetting(activeTab, "label", e.target.value)} style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "13.5px", outline: "none" }} />
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                              <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted)" }}>Placeholder Text:</label>
                              <input type="text" value={cfg.placeholder} onChange={(e) => updateFieldSetting(activeTab, "placeholder", e.target.value)} style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "13.5px", outline: "none" }} />
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                              <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted)" }}>Default Value:</label>
                              <input type="text" value={cfg.defaultValue} onChange={(e) => updateFieldSetting(activeTab, "defaultValue", e.target.value)} style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "13.5px", outline: "none" }} />
                            </div>
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                            <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted)" }}>Help Subtitle/Helper Text:</label>
                            <input type="text" value={cfg.helpText} onChange={(e) => updateFieldSetting(activeTab, "helpText", e.target.value)} style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "13.5px", outline: "none" }} />
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                              <label style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-muted)" }}>Section:</label>
                              <select value={cfg.section} onChange={(e) => updateFieldSetting(activeTab, "section", e.target.value)} style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "13px", outline: "none" }}>
                                {currentTableConfig.sections.map((s) => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                              <label style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-muted)" }}>Order Position:</label>
                              <input type="number" value={cfg.order} onChange={(e) => updateFieldSetting(activeTab, "order", Number(e.target.value))} style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "13px", outline: "none" }} />
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: "5px", paddingBottom: "6px" }}>
                              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13.5px", fontWeight: 600, color: "var(--text-primary)" }}>
                                <input type="checkbox" checked={cfg.required} onChange={(e) => updateFieldSetting(activeTab, "required", e.target.checked)} />
                                Required
                              </label>
                            </div>
                          </div>

                          {
      /* Validation Rules Section */
    }
                          <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "14px" }}>
                            <h4 style={{ margin: "0 0 10px 0", fontSize: "13px", fontWeight: "bold", color: "var(--text-primary)" }}>Form Validation Rules:</h4>
                            
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "10px" }}>
                              {cfg.validationRules.map((rule, rIdx) => <div key={rIdx} style={{ display: "flex", gap: "6px", alignItems: "center", backgroundColor: "var(--bg-tertiary)", padding: "8px", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
                                  <span style={{ fontSize: "12px", fontWeight: "bold", textTransform: "capitalize", color: "#3b82f6" }}>{rule.type}</span>
                                  <span style={{ fontSize: "12px", color: "var(--text-primary)" }}>value: "{rule.value}"</span>
                                  
                                  <button
      onClick={() => {
        const updated = cfg.validationRules.filter((_, i) => i !== rIdx);
        updateFieldSetting(activeTab, "validationRules", updated);
      }}
      style={{ marginLeft: "auto", border: "none", background: "none", color: "#ef4444", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}
    >
                                    ✕
                                  </button>
                                </div>)}
                            </div>

                            {
      /* Add Rule Form */
    }
                            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                              <select id="newRuleType" style={{ padding: "6px", fontSize: "12px", borderRadius: "4px", border: "1px solid var(--border-color)", backgroundColor: "white" }}>
                                <option value="min length">Min Length</option>
                                <option value="max length">Max Length</option>
                                <option value="min value">Min Value</option>
                                <option value="max value">Max Value</option>
                                <option value="regex">RegEx Match</option>
                              </select>
                              <input type="text" id="newRuleVal" placeholder="Value..." style={{ flex: 1, padding: "6px", fontSize: "12px", borderRadius: "4px", border: "1px solid var(--border-color)" }} />
                              <input type="text" id="newRuleMsg" placeholder="Error Message..." style={{ flex: 1.5, padding: "6px", fontSize: "12px", borderRadius: "4px", border: "1px solid var(--border-color)" }} />
                              <button
      onClick={() => {
        const selectEl = document.getElementById("newRuleType");
        const valEl = document.getElementById("newRuleVal");
        const msgEl = document.getElementById("newRuleMsg");
        if (selectEl && valEl.value.trim()) {
          const newRule = {
            type: selectEl.value,
            value: valEl.value.trim(),
            message: msgEl.value.trim() || "Invalid input value."
          };
          updateFieldSetting(activeTab, "validationRules", [...cfg.validationRules, newRule]);
          valEl.value = "";
          msgEl.value = "";
        }
      }}
      style={{ backgroundColor: "#3b82f6", color: "white", border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "pointer", fontSize: "11px", fontWeight: "bold" }}
    >
                                + Add Rule
                              </button>
                            </div>
                          </div>

                          {
      /* Conditional Visibility Rules */
    }
                          <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "14px" }}>
                            <h4 style={{ margin: "0 0 10px 0", fontSize: "13px", fontWeight: "bold", color: "var(--text-primary)" }}>Conditional Visibility Rules:</h4>
                            
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "10px" }}>
                              {cfg.conditionalVisibility.map((rule, rIdx) => <div key={rIdx} style={{ display: "flex", gap: "6px", alignItems: "center", backgroundColor: "var(--bg-tertiary)", padding: "8px", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
                                  <span style={{ fontSize: "12px", color: "var(--text-primary)" }}>
                                    Show if <b>{rule.targetField}</b> {rule.operator.replace("_", " ")} <b>"{rule.value}"</b>
                                  </span>
                                  
                                  <button
      onClick={() => {
        const updated = cfg.conditionalVisibility.filter((_, i) => i !== rIdx);
        updateFieldSetting(activeTab, "conditionalVisibility", updated);
      }}
      style={{ marginLeft: "auto", border: "none", background: "none", color: "#ef4444", fontSize: "12px", fontWeight: "bold", cursor: "pointer" }}
    >
                                    ✕
                                  </button>
                                </div>)}
                            </div>

                            {
      /* Add Visibility Rule Form */
    }
                            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                              <select id="visTarget" style={{ padding: "6px", fontSize: "11px", borderRadius: "4px", border: "1px solid var(--border-color)", backgroundColor: "white" }}>
                                {activeColumns.filter((c) => c.Field !== selectedFieldName).map((c) => <option key={c.Field} value={c.Field}>{c.Field}</option>)}
                              </select>
                              <select id="visOp" style={{ padding: "6px", fontSize: "11px", borderRadius: "4px", border: "1px solid var(--border-color)", backgroundColor: "white" }}>
                                <option value="equals">Equals</option>
                                <option value="not equals">Not Equals</option>
                                <option value="contains">Contains</option>
                              </select>
                              <input type="text" id="visVal" placeholder="Value..." style={{ flex: 1, padding: "6px", fontSize: "11px", borderRadius: "4px", border: "1px solid var(--border-color)" }} />
                              <button
      onClick={() => {
        const targetEl = document.getElementById("visTarget");
        const opEl = document.getElementById("visOp");
        const valEl = document.getElementById("visVal");
        if (targetEl && valEl.value.trim()) {
          const newRule = {
            targetField: targetEl.value,
            operator: opEl.value,
            value: valEl.value.trim()
          };
          updateFieldSetting(activeTab, "conditionalVisibility", [...cfg.conditionalVisibility, newRule]);
          valEl.value = "";
        }
      }}
      style={{ backgroundColor: "#3b82f6", color: "white", border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "pointer", fontSize: "11px", fontWeight: "bold" }}
    >
                                + Add Condition
                              </button>
                            </div>
                          </div>
                        </>;
  })()}
                  </div>}

                {
    /* -------------------- TAB: DETAIL VIEW -------------------- */
  }
                {activeTab === "Detail" && currentFieldConfig?.Detail && <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13.5px", fontWeight: 600, color: "var(--text-primary)" }}>
                      <input type="checkbox" checked={currentFieldConfig.Detail.show} onChange={(e) => updateFieldSetting("Detail", "show", e.target.checked)} />
                      Show Field on Detail Page
                    </label>

                    <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                      <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted)" }}>Display Detail Label:</label>
                      <input type="text" value={currentFieldConfig.Detail.label} onChange={(e) => updateFieldSetting("Detail", "label", e.target.value)} style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "13.5px", outline: "none" }} />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                      <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted)" }}>Display Formatting Style:</label>
                      <select value={currentFieldConfig.Detail.displayFormat} onChange={(e) => updateFieldSetting("Detail", "displayFormat", e.target.value)} style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "13.5px", outline: "none" }}>
                        <option value="raw">Raw Value (Text/HTML safe)</option>
                        <option value="full image">Full Rendered Image Box</option>
                        <option value="email link">Clickable Mailto: Link</option>
                        <option value="phone link">Clickable Phone Call: Link</option>
                        <option value="rendered html">Rendered HTML rich text</option>
                        <option value="file download">File Attachment Download Anchor</option>
                        <option value="formatted date">Formatted Date String</option>
                        <option value="badge">Badge Pill</option>
                      </select>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                        <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted)" }}>Layout grid width:</label>
                        <select value={currentFieldConfig.Detail.layout} onChange={(e) => updateFieldSetting("Detail", "layout", e.target.value)} style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "13.5px", outline: "none" }}>
                          <option value="half">Half width column (col-md-6)</option>
                          <option value="full">Full width row (col-md-12)</option>
                        </select>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                        <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted)" }}>Page Section Container:</label>
                        <select value={currentFieldConfig.Detail.section} onChange={(e) => updateFieldSetting("Detail", "section", e.target.value)} style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "13.5px", outline: "none" }}>
                          {currentTableConfig.sections.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>

                    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--text-primary)", marginTop: "8px" }}>
                      <input type="checkbox" checked={currentFieldConfig.Detail.copyToClipboard} onChange={(e) => updateFieldSetting("Detail", "copyToClipboard", e.target.checked)} />
                      Include "Copy to Clipboard" quick button
                    </label>
                  </div>}

                {
    /* Live Preview Section */
  }
                <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "16px", marginTop: "auto" }}>
                  <div style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "8px", display: "flex", alignItems: "center", gap: "4px" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    Live UI Preview ({activeTab} Context)
                  </div>
                  {renderLivePreview()}
                </div>

              </div>
            </> : <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "14px", padding: "24px", textAlign: "center" }}>
              Select a field from the center panel to begin configuring its Field Changer properties.
            </div>}
        </aside>
      </div>
    </div>;
}
