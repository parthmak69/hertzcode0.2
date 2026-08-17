"use strict";
import React, { useState } from "react";

export default function SchemaCard({
  col,
  idx,
  project,
  dbTables,
  handleRemoveColumn,
  handleUpdateColumnType,
  handleUpdateColumnDetail,
  getPlaceholderForCol,
}) {
  const isMongoDb = project.databaseName.toLowerCase().includes("mongodb:");
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div
      style={{
        backgroundColor: "var(--bg-secondary)",
        border: "1px solid var(--border-color)",
        borderRadius: "10px",
        overflow: "hidden",
        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)"
      }}
    >
      {/* Header bar */}
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
            SQL Column
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

      {/* Form fields */}
      <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Row 1 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted)" }}>Input Type</label>
            <select
              value={col.type}
              onChange={(e) => handleUpdateColumnType(col.id, e.target.value)}
              style={{ padding: "8px 10px", border: "1px solid var(--border-color)", borderRadius: "6px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", outline: "none", fontSize: "13.5px" }}
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
            <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted)" }}>Label / Column Name:</label>
            <input
              type="text"
              value={col.name}
              onChange={(e) => {
                handleUpdateColumnDetail(col.id, { name: e.target.value.toLowerCase().replace(/[\s-]+/g, "_") });
              }}
              style={{ padding: "8px 10px", border: "1px solid var(--border-color)", borderRadius: "6px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", outline: "none", fontSize: "13.5px" }}
            />
          </div>

          {showAdvanced && (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted)" }}>Class:</label>
                <input
                  type="text"
                  value={col.className !== undefined ? col.className : "col-sm-12 col-md-6 col-lg-6 col-xl-6"}
                  onChange={(e) => handleUpdateColumnDetail(col.id, { className: e.target.value })}
                  style={{ padding: "8px 10px", border: "1px solid var(--border-color)", borderRadius: "6px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", outline: "none", fontSize: "13.5px" }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted)" }}>Pattern (RegEx):</label>
                <div style={{ display: "flex", gap: "4px" }}>
                  <input
                    type="text"
                    value={col.pattern || ""}
                    onChange={(e) => handleUpdateColumnDetail(col.id, { pattern: e.target.value })}
                    placeholder={col.type === "email" ? "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$" : "no pattern"}
                    style={{ flex: 1, padding: "8px 10px", border: "1px solid var(--border-color)", borderRadius: "6px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", outline: "none", fontSize: "13.5px" }}
                  />
                  <button type="button" style={{ border: "1px solid var(--border-color)", backgroundColor: "var(--bg-tertiary)", color: "var(--text-primary)", width: "32px", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "help" }} title="Helper tooltip info">i</button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Advanced Settings Toggle Button */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "-8px" }}>
          <button 
            type="button" 
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{ background: "none", border: "none", color: "#3b82f6", fontSize: "12.5px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
          >
            {showAdvanced ? "Hide Advanced Settings ▲" : "Show Advanced Settings ▼"}
          </button>
        </div>

        {/* Row 2 (Advanced Settings) */}
        {showAdvanced && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted)" }}>Maxlength (Chars):</label>
            <input
              type="number"
              value={col.maxLength !== undefined ? col.maxLength : ""}
              onChange={(e) => handleUpdateColumnDetail(col.id, { maxLength: e.target.value ? parseInt(e.target.value) || undefined : undefined })}
              placeholder={col.type === "textarea" ? "2000" : "100"}
              style={{ padding: "8px 10px", border: "1px solid var(--border-color)", borderRadius: "6px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", outline: "none", fontSize: "13.5px" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted)" }}>Default Value:</label>
            <input
              type="text"
              value={col.defaultValue || ""}
              onChange={(e) => handleUpdateColumnDetail(col.id, { defaultValue: e.target.value })}
              placeholder="NULL"
              style={{ padding: "8px 10px", border: "1px solid var(--border-color)", borderRadius: "6px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", outline: "none", fontSize: "13.5px" }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted)" }}>Placeholder:</label>
            <input
              type="text"
              value={col.placeholder || ""}
              onChange={(e) => handleUpdateColumnDetail(col.id, { placeholder: e.target.value })}
              placeholder={getPlaceholderForCol(col.name)}
              style={{ padding: "8px 10px", border: "1px solid var(--border-color)", borderRadius: "6px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", outline: "none", fontSize: "13.5px" }}
            />
          </div>
        </div>
        )}

        {/* Dropdown settings if type is select */}
        {col.type === "select" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "16px", border: "1px solid var(--border-color)", borderRadius: "8px", backgroundColor: "var(--bg-primary)", marginTop: "6px" }}>
            <div style={{ fontSize: "12.5px", fontWeight: "bold", color: "var(--text-muted)", textTransform: "uppercase" }}>
              Dropdown Select Datasource Settings:
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted)" }}>Datasource Type:</label>
                <select 
                  value={col.selectType || "static"} 
                  onChange={(e) => handleUpdateColumnDetail(col.id, { selectType: e.target.value })}
                  style={{ padding: "8px 10px", border: "1px solid var(--border-color)", borderRadius: "6px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", outline: "none", fontSize: "13.5px" }}
                >
                  <option value="static">Static List (Custom options)</option>
                  <option value="table">Database Table Lookup (Dynamic)</option>
                </select>
              </div>

              {(col.selectType === "static" || !col.selectType) && (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted)" }}>Static Options (comma separated):</label>
                  <input 
                    type="text" 
                    placeholder="Option A, Option B, Option C"
                    value={Array.isArray(col.selectOptions) ? col.selectOptions.join(", ") : ""} 
                    onChange={(e) => {
                      const arr = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
                      handleUpdateColumnDetail(col.id, { selectOptions: arr });
                    }} 
                    style={{ padding: "8px 10px", border: "1px solid var(--border-color)", borderRadius: "6px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", outline: "none", fontSize: "13.5px" }}
                  />
                </div>
              )}
            </div>

            {col.selectType === "table" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginTop: "6px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted)" }}>Lookup Table:</label>
                  <select 
                    value={col.selectLookupTable || ""} 
                    onChange={(e) => handleUpdateColumnDetail(col.id, { selectLookupTable: e.target.value })}
                    style={{ padding: "8px 10px", border: "1px solid var(--border-color)", borderRadius: "6px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", outline: "none", fontSize: "13.5px" }}
                  >
                    <option value="">-- Select Table --</option>
                    {dbTables.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted)" }}>Value Field:</label>
                  <input 
                    type="text" 
                    value={col.selectLookupValue || "id"} 
                    placeholder="e.g. id"
                    onChange={(e) => handleUpdateColumnDetail(col.id, { selectLookupValue: e.target.value })} 
                    style={{ padding: "8px 10px", border: "1px solid var(--border-color)", borderRadius: "6px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", outline: "none", fontSize: "13.5px" }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted)" }}>Label Field:</label>
                  <input 
                    type="text" 
                    value={col.selectLookupLabel || "name"} 
                    placeholder="e.g. name"
                    onChange={(e) => handleUpdateColumnDetail(col.id, { selectLookupLabel: e.target.value })} 
                    style={{ padding: "8px 10px", border: "1px solid var(--border-color)", borderRadius: "6px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", outline: "none", fontSize: "13.5px" }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Flags row */}
        <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "14px", marginTop: "6px" }}>
          <div style={{ fontSize: "12px", fontWeight: "bold", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "10px" }}>
            Flags for {col.name}:
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "24px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13.5px", fontWeight: 600, color: "var(--text-primary)" }}>
              <input
                type="checkbox"
                checked={col.isRequired || false}
                onChange={(e) => handleUpdateColumnDetail(col.id, { isRequired: e.target.checked })}
                style={{ width: "16px", height: "16px", accentColor: "#3b82f6", cursor: "pointer" }}
              />
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: "var(--text-muted)" }}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Required
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13.5px", fontWeight: 600, color: "var(--text-primary)" }}>
              <input
                type="checkbox"
                checked={col.isFormCol !== false}
                onChange={(e) => handleUpdateColumnDetail(col.id, { isFormCol: e.target.checked })}
                style={{ width: "16px", height: "16px", accentColor: "#3b82f6", cursor: "pointer" }}
              />
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: "var(--text-muted)" }}>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              In Form
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13.5px", fontWeight: 600, color: "var(--text-primary)" }}>
              <input
                type="checkbox"
                checked={col.isListCol !== false}
                onChange={(e) => handleUpdateColumnDetail(col.id, { isListCol: e.target.checked })}
                style={{ width: "16px", height: "16px", accentColor: "#3b82f6", cursor: "pointer" }}
              />
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: "var(--text-muted)" }}>
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="21" x2="9" y2="9" />
              </svg>
              In Table List
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
