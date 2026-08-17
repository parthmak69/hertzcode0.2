"use strict";
import React from "react";

export default function MakeTableAiModal({
  isOpen,
  aiPrompt,
  setAiPrompt,
  onClose,
  onGenerate,
  aiGeneratedSql,
  onCopy,
  onExecute,
}) {
  if (!isOpen) return null;

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1e3 }}>
      <div style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "10px", width: "600px", maxWidth: "90vw", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--border-color)" }}>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>Create Table using AI</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "18px", fontWeight: 700 }}>×</button>
        </div>
        
        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text-muted)" }}>Add Prompt:</label>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="e.g. create table users with column name, email, password"
              style={{
                width: "100%",
                height: "80px",
                padding: "10px 12px",
                fontSize: "13.5px",
                border: "1.5px solid var(--border-color)",
                borderRadius: "8px",
                outline: "none",
                backgroundColor: "var(--bg-primary)",
                color: "var(--text-primary)",
                resize: "vertical",
                boxSizing: "border-box"
              }}
            />
          </div>
          
          <div style={{ display: "flex", justifyContent: "center" }}>
            <button
              onClick={onGenerate}
              style={{
                backgroundColor: "#10b981",
                color: "white",
                border: "none",
                padding: "10px 24px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: 700,
                boxShadow: "0 2px 8px rgba(16,185,129,0.3)"
              }}
            >
              Generate
            </button>
          </div>

          {aiGeneratedSql && (
            <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <label style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text-muted)" }}>Generated SQL Query:</label>
              <div style={{
                padding: "16px",
                backgroundColor: "#0d1117",
                borderRadius: "8px",
                border: "1px solid #30363d",
                overflowX: "auto",
                maxHeight: "200px"
              }}>
                {aiGeneratedSql.split("\n").map((line, idx) => {
                  const parts = line.split(/(\s+|,|\(|\))/);
                  return (
                    <div key={idx} style={{ fontFamily: "monospace", fontSize: "13px", lineHeight: 1.5 }}>
                      {parts.map((part, pIdx) => {
                        const lower = part.toLowerCase();
                        let color = "#c9d1d9";
                        if (["create", "table", "primary", "key", "auto_increment", "default", "not", "null"].includes(lower)) {
                          color = "#ff7b72";
                        } else if (["int", "varchar", "text", "timestamp", "decimal"].includes(lower)) {
                          color = "#79c0ff";
                        } else if (part.trim().startsWith("'") || part.trim().startsWith("`")) {
                          color = "#a5d6ff";
                        }
                        return <span key={pIdx} style={{ color }}>{part}</span>;
                      })}
                    </div>
                  );
                })}
              </div>
              
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  onClick={onCopy}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "6px",
                    border: "1px solid var(--border-color)",
                    backgroundColor: "transparent",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    fontSize: "13px"
                  }}
                >
                  Copy SQL
                </button>
                <button
                  onClick={onExecute}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "6px",
                    border: "none",
                    backgroundColor: "#0284c7",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: 700
                  }}
                >
                  Run Query / Create Table
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "14px 20px", borderTop: "1px solid var(--border-color)" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid var(--border-color)", backgroundColor: "transparent", color: "var(--text-muted)", cursor: "pointer", fontSize: "13px" }}>Close</button>
        </div>
      </div>
    </div>
  );
}
