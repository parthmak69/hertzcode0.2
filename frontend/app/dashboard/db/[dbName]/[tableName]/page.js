"use strict";
"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useToast } from "../../../../context/ToastContext";
export default function TableDetailPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const params = useParams();
  const dbName = params?.dbName;
  const tableName = params?.tableName;
  const [table, setTable] = useState(null);
  const [activeView, setActiveView] = useState("structure");
  const [fakerMockCount, setFakerMockCount] = useState(5);
  const [fakerMappings, setFakerMappings] = useState({});
  const [customValues, setCustomValues] = useState({});
  const [rows, setRows] = useState([]);
  const [fields, setFields] = useState([]);
  const [isLoadingRows, setIsLoadingRows] = useState(false);
  const fetchRows = async () => {
    setIsLoadingRows(true);
    try {
      const res = await fetch(`/api/database/tables/rows?dbName=${encodeURIComponent(dbName)}&tableName=${encodeURIComponent(tableName)}`);
      const data = await res.json();
      if (data.success) {
        setRows(data.rows || []);
        setFields(data.fields || []);
      }
    } catch (err) {
      console.error("Failed to fetch table rows:", err);
    } finally {
      setIsLoadingRows(false);
    }
  };
  const fetchTableDetails = async () => {
    if (!dbName || !tableName) return;
    try {
      const res = await fetch(`/api/database/tables?dbName=${encodeURIComponent(dbName)}`);
      const responseText = await res.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("Non-JSON table details:", responseText);
        showToast("Error loading table details", "error");
        router.push("/dashboard");
        return;
      }
      if (res.ok && data.success) {
        const found = data.tables.find((t) => t.name === tableName);
        if (found) {
          setTable(found);
        } else {
          showToast(`Table "${tableName}" not found.`, "error");
          router.push(`/dashboard/db/${dbName}`);
        }
      } else {
        showToast(data.error || "Access denied or database error.", "error");
        router.push("/dashboard");
      }
    } catch (err) {
      console.error("Failed to load table details:", err);
      showToast("Network error loading details", "error");
      router.push("/dashboard");
    }
  };
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTableDetails();
    if (activeView === "browse") {
      fetchRows();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbName, tableName, activeView]);
  const handleSeedTable = async () => {
    if (!dbName || !tableName || !table) return;
    try {
      const res = await fetch("/api/database/tables/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dbName,
          tableName,
          count: fakerMockCount,
          mappings: fakerMappings,
          customValues
        })
      });
      const responseText = await res.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (err) {
        console.error("Non-JSON response for table seeding:", responseText);
        showToast(`Server error (${res.status}): ${responseText.slice(0, 200) || "Empty response"}`, "error");
        return;
      }
      if (res.ok && data.success) {
        await fetchTableDetails();
        await fetchRows();
        setActiveView("browse");
        showToast(`Mock records inserted successfully for table: ${tableName}!`, "success");
      } else {
        showToast(`Failed to insert mock data: ${data.error || "Unknown error"}`, "error");
      }
    } catch (err) {
      console.error("Failed to seed table:", err);
      showToast(`Seeding error: ${err.message}`, "error");
    }
  };
  if (!table) {
    return <div style={{ padding: "24px", color: "var(--text-primary)" }}>
         Loading table details for &quot;{tableName}&quot;...
      </div>;
  }
  return <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      
      {
    /* SUB NAV BAR BANNER */
  }
      <div style={{ height: "40px", backgroundColor: "var(--bannerBg)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", color: "white", fontSize: "13px", fontWeight: "600", flexShrink: 0, boxShadow: "0 2px 6px rgba(0,0,0,0.05)" }}>
        <span style={{ fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.8px" }}>
          {dbName.startsWith('mongodb:') ? 'Collection Details' : 'Table Structure & Data'}
        </span>
        <span style={{ color: "rgba(255,255,255,0.8)" }}>Database Builder / {dbName} / {tableName}</span>
      </div>

      <main style={{ flex: 1, padding: "24px", overflowY: "auto", backgroundColor: "var(--bg-primary)" }}>
        <div style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "24px", boxShadow: "var(--shadow-md)" }}>
          
          <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button
    onClick={() => router.push(`/dashboard/db/${dbName}`)}
    style={{ background: "none", border: "none", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", color: "var(--text-muted)", fontWeight: "bold", fontSize: "14px", padding: 0 }}
  >
              ← Back to Tables
            </button>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
    onClick={() => setActiveView("structure")}
    style={{
      border: "none",
      padding: "6px 16px",
      borderRadius: "4px",
      fontWeight: "bold",
      fontSize: "13px",
      cursor: "pointer",
      backgroundColor: activeView === "structure" ? "#f59e0b" : "var(--bg-tertiary)",
      color: activeView === "structure" ? "#ffffff" : "var(--text-primary)",
      display: "inline-flex",
      alignItems: "center",
      gap: "6px"
    }}
  >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="9" y1="21" x2="9" y2="9" />
                </svg>
                Structure
              </button>
              <button
    onClick={() => setActiveView("browse")}
    style={{
      border: "none",
      padding: "6px 16px",
      borderRadius: "4px",
      fontWeight: "bold",
      fontSize: "13px",
      cursor: "pointer",
      backgroundColor: activeView === "browse" ? "#f59e0b" : "var(--bg-tertiary)",
      color: activeView === "browse" ? "#ffffff" : "var(--text-primary)",
      display: "inline-flex",
      alignItems: "center",
      gap: "6px"
    }}
  >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                Browse Data
              </button>
              <button
    onClick={() => setActiveView("seed")}
    style={{
      border: "none",
      padding: "6px 16px",
      borderRadius: "4px",
      fontWeight: "bold",
      fontSize: "13px",
      cursor: "pointer",
      backgroundColor: activeView === "seed" ? "#f59e0b" : "var(--bg-tertiary)",
      color: activeView === "seed" ? "#ffffff" : "var(--text-primary)",
      display: "inline-flex",
      alignItems: "center",
      gap: "6px"
    }}
  >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Insert Mock Data
              </button>
            </div>
          </div>

          {activeView === "structure" && <div>
              <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "var(--text-primary)", marginBottom: "20px" }}>
                 Columns/Schema of &quot;{table.name}&quot;:
              </h2>

              <div style={{ width: "100%", overflowX: "auto", border: "1px solid var(--border-color)", borderRadius: "8px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--border-color)", backgroundColor: "var(--bg-tertiary)" }}>
                      <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600 }}>Column Name</th>
                      <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600 }}>Type</th>
                      <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600 }}>Size</th>
                      <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600 }}>Index</th>
                      <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600 }}>Default</th>
                      <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600 }}>Comment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {table.idOption && <tr style={{ borderBottom: "1px solid var(--border-color)", opacity: 0.8 }}>
                        <td style={{ padding: "14px 16px", fontFamily: "monospace", color: "var(--text-primary)" }}>id (Auto)</td>
                        <td style={{ padding: "14px 16px", color: "var(--text-primary)" }}>INT</td>
                        <td style={{ padding: "14px 16px", color: "var(--text-primary)" }}>11</td>
                        <td style={{ padding: "14px 16px", color: "var(--text-primary)" }}>PRIMARY KEY</td>
                        <td style={{ padding: "14px 16px", color: "var(--text-primary)" }}>AUTO_INCREMENT</td>
                        <td style={{ padding: "14px 16px", color: "var(--text-muted)" }}>ID Auto Generated</td>
                      </tr>}

                    {table.columns.map((col, idx) => <tr key={idx} style={{ borderBottom: "1px solid var(--border-color)" }}>
                        <td style={{ padding: "14px 16px", fontFamily: "monospace", fontWeight: "bold", color: "var(--text-primary)" }}>
                          {col.name}
                        </td>
                        <td style={{ padding: "14px 16px", color: "var(--text-primary)" }}>{col.type}</td>
                        <td style={{ padding: "14px 16px", color: "var(--text-primary)" }}>{col.size || "---"}</td>
                        <td style={{ padding: "14px 16px", color: "var(--text-primary)" }}>{col.index}</td>
                        <td style={{ padding: "14px 16px", color: "var(--text-primary)" }}>{col.defaultValue}</td>
                        <td style={{ padding: "14px 16px", color: "var(--text-muted)" }}>{col.comment || "---"}</td>
                      </tr>)}

                    {table.createdOnOption && <tr style={{ borderBottom: "1px solid var(--border-color)", opacity: 0.8 }}>
                        <td style={{ padding: "14px 16px", fontFamily: "monospace", color: "var(--text-primary)" }}>createdOn</td>
                        <td style={{ padding: "14px 16px", color: "var(--text-primary)" }}>DATETIME</td>
                        <td style={{ padding: "14px 16px", color: "var(--text-primary)" }}>---</td>
                        <td style={{ padding: "14px 16px", color: "var(--text-primary)" }}>---</td>
                        <td style={{ padding: "14px 16px", color: "var(--text-primary)" }}>CURRENT_TIMESTAMP</td>
                        <td style={{ padding: "14px 16px", color: "var(--text-muted)" }}>Creation Timestamp</td>
                      </tr>}

                    {table.modifiedOnOption && <tr style={{ borderBottom: "1px solid var(--border-color)", opacity: 0.8 }}>
                        <td style={{ padding: "14px 16px", fontFamily: "monospace", color: "var(--text-primary)" }}>modifiedOn</td>
                        <td style={{ padding: "14px 16px", color: "var(--text-primary)" }}>DATETIME</td>
                        <td style={{ padding: "14px 16px", color: "var(--text-primary)" }}>---</td>
                        <td style={{ padding: "14px 16px", color: "var(--text-primary)" }}>---</td>
                        <td style={{ padding: "14px 16px", color: "var(--text-primary)" }}>ON UPDATE CURRENT_TIMESTAMP</td>
                        <td style={{ padding: "14px 16px", color: "var(--text-muted)" }}>Modification Timestamp</td>
                      </tr>}

                    {table.isDeletedOption && <tr style={{ borderBottom: "1px solid var(--border-color)", opacity: 0.8 }}>
                        <td style={{ padding: "14px 16px", fontFamily: "monospace", color: "var(--text-primary)" }}>isDeleted</td>
                        <td style={{ padding: "14px 16px", color: "var(--text-primary)" }}>TINYINT</td>
                        <td style={{ padding: "14px 16px", color: "var(--text-primary)" }}>1</td>
                        <td style={{ padding: "14px 16px", color: "var(--text-primary)" }}>---</td>
                        <td style={{ padding: "14px 16px", color: "var(--text-primary)" }}>0</td>
                        <td style={{ padding: "14px 16px", color: "var(--text-muted)" }}>Soft delete flag</td>
                      </tr>}
                  </tbody>
                </table>
              </div>
            </div>}

          {activeView === "browse" && <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "var(--text-primary)" }}>
                   Records in &quot;{table.name}&quot;:
                </h2>
                <button
    onClick={fetchRows}
    style={{ backgroundColor: "var(--bg-tertiary)", border: "1px solid var(--border-color)", color: "var(--text-primary)", padding: "6px 12px", borderRadius: "4px", cursor: "pointer", fontSize: "13px", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px" }}
  >
                  Refresh Data
                </button>
              </div>

              {isLoadingRows ? <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
                  Loading database records...
                </div> : rows.length === 0 ? <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", border: "1px dashed var(--border-color)", borderRadius: "8px" }}>
                  <p style={{ margin: "0 0 16px 0" }}>This {dbName.startsWith("mongodb:") ? "collection" : "table"} is currently empty.</p>
                  <button
    onClick={() => setActiveView("seed")}
    style={{ backgroundColor: "#10b981", color: "white", border: "none", padding: "10px 20px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "14px" }}
  >
                    Generate & Insert Mock Data
                  </button>
                </div> : <div style={{ width: "100%", overflowX: "auto", border: "1px solid var(--border-color)", borderRadius: "8px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid var(--border-color)", backgroundColor: "var(--bg-tertiary)" }}>
                        <th style={{ padding: "12px 16px", color: "var(--text-secondary)", fontWeight: 600, width: "60px" }}>#</th>
                        {fields.map((field) => <th key={field} style={{ padding: "12px 16px", color: "var(--text-secondary)", fontWeight: 600, fontFamily: "monospace" }}>
                            {field}
                          </th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, idx) => <tr key={row._id || idx} style={{ borderBottom: "1px solid var(--border-color)" }}>
                          <td style={{ padding: "12px 16px", color: "var(--text-muted)", fontSize: "13px" }}>{idx + 1}</td>
                          {fields.map((field) => {
    const val = row[field];
    let displayVal = "";
    if (val === null || val === void 0) {
      displayVal = "NULL";
    } else if (typeof val === "object") {
      displayVal = JSON.stringify(val);
    } else {
      displayVal = String(val);
    }
    return <td key={field} style={{
      padding: "12px 16px",
      color: val === null ? "var(--text-muted)" : "var(--text-primary)",
      fontStyle: val === null ? "italic" : "normal",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      maxWidth: "300px"
    }}>
                                {displayVal}
                              </td>;
  })}
                        </tr>)}
                    </tbody>
                  </table>
                </div>}
            </div>}

          {activeView === "seed" && <div>
              <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "var(--text-primary)", marginBottom: "20px" }}>
                 Database Faker / Mock entries config for &quot;{table.name}&quot;:
              </h2>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px", marginBottom: "24px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-muted)" }}>Total Mock Entries to Insert:</label>
                    <input
    type="number"
    value={fakerMockCount}
    onChange={(e) => setFakerMockCount(Number(e.target.value))}
    style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "14px", outline: "none" }}
  />
                  </div>

                  {table.columns.map((col, idx) => <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-muted)", fontFamily: "monospace" }}>{col.name}:</label>
                      <select
    value={fakerMappings[col.name] || "As Defined"}
    onChange={(e) => setFakerMappings({ ...fakerMappings, [col.name]: e.target.value })}
    style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "14px", outline: "none" }}
  >
                        <option value="As Defined">As Defined (Custom Entry)</option>
                        <option value="Description">Description / Paragraph</option>
                        <option value="Title">Title / Headline</option>
                        <option value="Address">Street Address</option>
                        <option value="Status">Status (active/pending/...)</option>
                        <option value="Role/Type">Role/Type (admin/user/...)</option>
                        <option value="Date">Date (YYYY-MM-DD)</option>
                        <option value="Full Name">Full Name</option>
                        <option value="Date of Birth">Date of Birth</option>
                        <option value="Indian Mobile">Indian Mobile</option>
                        <option value="Image URL">Image URL</option>
                        <option value="Email">Email</option>
                        <option value="Password">Password / Hash</option>
                        <option value="Website URL">Website Link</option>
                        <option value="Zip Code">Zip Code</option>
                        <option value="Company Name">Company Name</option>
                        <option value="Gender">Gender</option>
                        <option value="IP Address">IP Address</option>
                        <option value="Number">Number (Integer)</option>
                        <option value="Price">Price (Decimal)</option>
                      </select>
                      {(fakerMappings[col.name] === "As Defined" || !fakerMappings[col.name]) && <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "6px" }}>
                          <span style={{ fontSize: "11px", color: "#f59e0b", fontWeight: "600" }}>Custom Defined Entry:</span>
                          <input
    type="text"
    placeholder={`Type whatever you want to insert for ${col.name}...`}
    value={customValues[col.name] || ""}
    onChange={(e) => setCustomValues({ ...customValues, [col.name]: e.target.value })}
    style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #f59e0b", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "13px", outline: "none" }}
  />
                        </div>}
                    </div>)}
                </div>
                
                <div style={{ backgroundColor: "var(--bg-tertiary)", borderRadius: "8px", padding: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <h4 style={{ margin: 0, color: "var(--text-primary)", fontWeight: "bold" }}>Faker Config Notes:</h4>
                  <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.6" }}>
                    Easily populate your database with mock data. Choose correct field categories to generate dummy records.
                  </p>
                </div>
              </div>

              <button
    style={{ width: "100%", backgroundColor: "#10b981", color: "#ffffff", border: "none", padding: "14px 20px", borderRadius: "6px", fontWeight: "bold", fontSize: "15px", cursor: "pointer", boxShadow: "0 4px 6px rgba(16, 185, 129, 0.2)" }}
    onClick={handleSeedTable}
  >
                Insert Mock/Fake Data for &apos;{table.name}&apos; {dbName.startsWith("mongodb:") ? "collection" : "table"}
              </button>
            </div>}
        </div>
      </main>

    </div>;
}
