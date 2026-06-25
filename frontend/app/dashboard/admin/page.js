"use strict";
"use client";

import { useState, useEffect } from "react";
import { useToast } from "../../context/ToastContext";

export default function AdminPanelPage() {
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("user");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = async (adminUsername) => {
    if (!adminUsername) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/auth/users?requester=${encodeURIComponent(adminUsername)}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setUsers(data.users || []);
      } else {
        showToast(data.error || "Failed to load user list.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error connecting to server.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const user = localStorage.getItem("currentUser") || "";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentUser(user);
    if (user) {
      fetchUsers(user);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      showToast("Username and Password are required.", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          pass_hash: password.trim(),
          name: name.trim(),
          role,
          requester: currentUser,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`User "${username}" created successfully!`, "success");
        // Clear fields
        setUsername("");
        setPassword("");
        setName("");
        setRole("user");
        // Refresh table
        fetchUsers(currentUser);
      } else {
        showToast(data.error || "Failed to create user.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error creating user account.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* SUB NAV BAR BANNER */}
      <div style={{ height: "40px", backgroundColor: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", color: "white", fontSize: "13px", fontWeight: "600", flexShrink: 0, boxShadow: "0 2px 6px rgba(0,0,0,0.05)" }}>
        <span style={{ fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.8px" }}>Admin Panel</span>
        <span style={{ color: "rgba(255,255,255,0.8)" }}>User Credentials & Roles</span>
      </div>

      <main style={{ flex: 1, padding: "24px", overflowY: "auto", backgroundColor: "var(--bg-primary)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "350px 1fr", gap: "24px", alignItems: "start" }}>
          
          {/* CREATE USER CARD */}
          <div style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "10px", padding: "24px", boxShadow: "var(--shadow-md)" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: "bold", color: "var(--text-primary)", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
              Create New User
            </h3>
            
            <form onSubmit={handleCreateUser} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-muted)" }}>Username:</label>
                <input
                  type="text"
                  placeholder="e.g. employee@company.com"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border-color)", borderRadius: "6px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-muted)" }}>Password:</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border-color)", borderRadius: "6px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-muted)" }}>Full Name:</label>
                <input
                  type="text"
                  placeholder="e.g. Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border-color)", borderRadius: "6px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-muted)" }}>Role:</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border-color)", borderRadius: "6px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "14px", outline: "none" }}
                >
                  <option value="user">User (Restricted Access)</option>
                  <option value="admin">Admin (Full Access)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  backgroundColor: "#3b82f6",
                  color: "white",
                  border: "none",
                  padding: "12px",
                  borderRadius: "6px",
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  fontWeight: "bold",
                  marginTop: "8px",
                  boxShadow: "0 4px 6px rgba(59, 130, 246, 0.2)",
                  transition: "background-color 0.15s ease"
                }}
              >
                {isSubmitting ? "Creating User..." : "Create Account"}
              </button>
            </form>
          </div>

          {/* USERS LIST TABLE */}
          <div style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "10px", padding: "24px", boxShadow: "var(--shadow-md)" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: "bold", color: "var(--text-primary)", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
              Active User Registry
            </h3>

            {isLoading ? (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
                Loading user registry...
              </div>
            ) : (
              <div style={{ width: "100%", overflowX: "auto", border: "1px solid var(--border-color)", borderRadius: "8px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--border-color)", backgroundColor: "var(--bg-tertiary)" }}>
                      <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600, width: "70px" }}>Sr</th>
                      <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600 }}>Full Name</th>
                      <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600 }}>Username / Email</th>
                      <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600, width: "120px" }}>Role</th>
                      <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600, width: "180px" }}>Last Modified</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)" }}>
                          No users registered in the database.
                        </td>
                      </tr>
                    ) : (
                      users.map((u, idx) => (
                        <tr key={u.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                          <td style={{ padding: "14px 16px", color: "var(--text-primary)" }}>{idx + 1}</td>
                          <td style={{ padding: "14px 16px", color: "var(--text-primary)", fontWeight: "500" }}>{u.name}</td>
                          <td style={{ padding: "14px 16px", color: "var(--text-primary)" }}>{u.username}</td>
                          <td style={{ padding: "14px 16px" }}>
                            <span style={{
                              display: "inline-block",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              fontSize: "12px",
                              fontWeight: "bold",
                              textTransform: "uppercase",
                              backgroundColor: u.role === "admin" ? "rgba(59, 130, 246, 0.15)" : "rgba(100, 116, 139, 0.15)",
                              color: u.role === "admin" ? "#3b82f6" : "var(--text-secondary)"
                            }}>
                              {u.role || "user"}
                            </span>
                          </td>
                          <td style={{ padding: "14px 16px", color: "var(--text-primary)" }}>
                            {new Date(u.modified_on).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
