"use strict";
import React from "react";

export default function DataGrid({
  filteredItems,
  isLoading,
  isMongo,
  file,
  fetchRecords,
  searchQuery,
  setSearchQuery,
  setShowViewModal,
  handleEdit,
  handleDelete,
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "var(--text-primary)", margin: 0 }}>
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
          style={{ width: "250px", padding: "8px 12px", border: "1px solid var(--border-color)", borderRadius: "6px", fontSize: "13px", outline: "none", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)" }}
        />
      </div>

      {isLoading ? (
        <div style={{ padding: "60px", textAlign: "center", color: "var(--text-muted)" }}>
          Fetching live table records from database...
        </div>
      ) : filteredItems.length === 0 ? (
        <div style={{ padding: "60px", textAlign: "center", color: "var(--text-muted)", border: "1px dashed var(--border-color)", borderRadius: "8px" }}>
          No records found in database table. Use the left form to add your first record!
        </div>
      ) : (
        <div style={{ width: "100%", overflowX: "auto", border: "1px solid var(--border-color)", borderRadius: "8px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13.5px" }}>
            <thead>
              <tr style={{ backgroundColor: "var(--bg-primary)", borderBottom: "2px solid var(--border-color)" }}>
                <th style={{ padding: "12px 16px", color: "var(--text-muted)", fontWeight: "bold", width: "50px" }}>#</th>
                <th style={{ padding: "12px 16px", color: "var(--text-muted)", fontWeight: "bold", fontFamily: "monospace" }}>
                  {isMongo ? "_id" : "id"}
                </th>
                {file.columns.filter((c) => c.isListCol !== false).map((col) => (
                  <th key={col.id} style={{ padding: "12px 16px", color: "var(--text-muted)", fontWeight: "bold", fontFamily: "monospace" }}>
                    {col.name}
                  </th>
                ))}
                <th style={{ padding: "12px 16px", color: "var(--text-muted)", fontWeight: "bold", width: "140px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item, idx) => (
                <tr key={item._id || item.id || idx} style={{ borderBottom: "1px solid var(--border-color)" }}>
                  <td style={{ padding: "12px 16px", color: "var(--text-muted)" }}>{idx + 1}</td>
                  <td style={{ padding: "12px 16px", color: "var(--text-primary)", fontFamily: "monospace", fontSize: "12px", maxWidth: "100px", overflow: "hidden", textOverflow: "ellipsis" }} title={String(item._id || item.id)}>
                    {String(item._id || item.id)}
                  </td>
                  {file.columns.filter((c) => c.isListCol !== false).map((col) => {
                    const val = item[col.name];
                    let displayVal = "";
                    if (val === null || val === undefined) {
                      displayVal = "NULL";
                    } else if (typeof val === "object") {
                      displayVal = JSON.stringify(val);
                    } else {
                      displayVal = String(val);
                    }
                    return (
                      <td key={col.id} style={{
                        padding: "12px 16px",
                        color: val === null || val === undefined ? "var(--text-muted)" : "var(--text-secondary)",
                        fontStyle: val === null || val === undefined ? "italic" : "normal",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: "200px"
                      }}>
                        {displayVal}
                      </td>
                    );
                  })}
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: "8px" }}>
                      {file.settings.viewButton && (
                        <button
                          onClick={() => setShowViewModal(item)}
                          style={{ border: "none", background: "none", cursor: "pointer", color: "#3b82f6", fontWeight: "bold", padding: 0 }}
                        >
                          View
                        </button>
                      )}
                      {file.settings.editButton && (
                        <button
                          onClick={() => handleEdit(item)}
                          style={{ border: "none", background: "none", cursor: "pointer", color: "#d97706", fontWeight: "bold", padding: 0 }}
                        >
                          Edit
                        </button>
                      )}
                      {file.settings.deleteButton && (
                        <button
                          onClick={() => handleDelete(item._id || item.id)}
                          style={{ border: "none", background: "none", cursor: "pointer", color: "#ef4444", fontWeight: "bold", padding: 0 }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
