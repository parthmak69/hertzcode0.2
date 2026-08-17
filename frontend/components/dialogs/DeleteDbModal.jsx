"use strict";
import React from "react";

export default function DeleteDbModal({ isOpen, dbToDelete, onClose, onConfirm }) {
  if (!isOpen) return null;

  const displayDbName = dbToDelete.startsWith("mongodb:")
    ? dbToDelete.replace("mongodb:", "")
    : dbToDelete;

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1e3 }}>
      <div style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "12px", width: "450px", maxWidth: "90vw", boxShadow: "var(--shadow-lg)", overflow: "hidden" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "30px 24px", textAlign: "center" }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "50%", backgroundColor: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444", marginBottom: "20px" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: "bold", color: "var(--text-primary)" }}>Delete Database</h3>
          <p style={{ margin: 0, fontSize: "14px", color: "var(--text-muted)", lineHeight: "1.5" }}>
            Are you sure you want to delete the database <strong style={{ color: "var(--text-primary)" }}>{displayDbName}</strong>? This action is permanent and all tables/data inside it will be lost forever.
          </p>
        </div>
        
        <div style={{ display: "flex", borderTop: "1px solid var(--border-color)", backgroundColor: "var(--bg-tertiary)" }}>
          <button
            type="button"
            onClick={onClose}
            style={{ flex: 1, padding: "16px", background: "none", border: "none", borderRight: "1px solid var(--border-color)", cursor: "pointer", fontSize: "14px", fontWeight: "600", color: "var(--text-secondary)", outline: "none" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{ flex: 1, padding: "16px", background: "none", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: "bold", color: "#ef4444", outline: "none" }}
          >
            Delete Database
          </button>
        </div>
      </div>
    </div>
  );
}
