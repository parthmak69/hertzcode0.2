"use strict";
import React from "react";

const SyncIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const DatabaseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
  </svg>
);

export default function DbRow({ db, idx, currentUser, activeTab, onNavigate, onDelete }) {
  const displayDbName = db.name.startsWith("mongodb:")
    ? db.name.replace("mongodb:", "")
    : db.name;

  return (
    <tr className="db-row" style={{ borderBottom: "1px solid var(--border-color)" }}>
      <td style={{ padding: "14px 16px", color: "var(--text-primary)" }}>{idx + 1}</td>
      <td style={{ padding: "14px 16px" }}>
        <button
          onClick={onNavigate}
          className="db-btn-link"
        >
          {displayDbName}
        </button>
      </td>
      <td style={{ padding: "14px 16px", color: "var(--text-primary)" }}>
        {db.owner || currentUser}
      </td>
      <td style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <button className="db-action-btn" title="Sync / Share">
            <SyncIcon />
          </button>
          <button
            className="db-action-btn"
            title={activeTab === "mongodb" ? "View Collections" : "View Tables"}
            onClick={onNavigate}
          >
            <DatabaseIcon />
          </button>
          <button
            className="db-action-btn delete"
            title="Delete Database"
            onClick={() => onDelete(db.id)}
          >
            <TrashIcon />
          </button>
        </div>
      </td>
    </tr>
  );
}
