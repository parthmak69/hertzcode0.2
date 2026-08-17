"use strict";
import React from "react";

export default function ViewDetailsModal({ showViewModal, onClose, isMongo, columns }) {
  if (!showViewModal) return null;

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1e3 }}>
      <div style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "10px", width: "500px", maxWidth: "90vw", boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--border-color)" }}>
          <h3 style={{ fontWeight: "bold", fontSize: "15px", color: "var(--text-primary)" }}>Record Details</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
        </div>
        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px" }}>
            <span style={{ flex: 1, fontWeight: "bold", fontSize: "13px", color: "var(--text-muted)" }}>{isMongo ? "_id" : "id"}:</span>
            <span style={{ flex: 2, fontSize: "13.5px", fontFamily: "monospace", color: "var(--text-primary)" }}>{String(showViewModal._id || showViewModal.id)}</span>
          </div>
          {columns.map((col) => (
            <div key={col.id} style={{ display: "flex", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px" }}>
              <span style={{ flex: 1, fontWeight: "bold", fontSize: "13px", color: "var(--text-muted)" }}>{col.name}:</span>
              <span style={{ flex: 2, fontSize: "13.5px", color: "var(--text-primary)" }}>
                {String(showViewModal[col.name] !== undefined && showViewModal[col.name] !== null ? showViewModal[col.name] : "")}
              </span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 20px", borderTop: "1px solid var(--border-color)" }}>
          <button onClick={onClose} style={{ backgroundColor: "#64748b", color: "white", border: "none", padding: "6px 16px", borderRadius: "4px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
