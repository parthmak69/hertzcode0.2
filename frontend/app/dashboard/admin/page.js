
"use client";
"use strict";

import { useState, useEffect } from "react";
import { useToast } from "../../context/ToastContext";
import { userService } from "../../../services/userService";

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
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editId, setEditId] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("user");
  const [isUpdating, setIsUpdating] = useState(false);



  const fetchUsers = async (adminUsername) => {
    if (!adminUsername) return;
    setIsLoading(true);
    try {
      const data = await userService.getUsersList(adminUsername);
      if (data.success) {
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
      const data = await userService.createUser(
        username.trim(),
        password.trim(),
        name.trim(),
        role,
        currentUser
      );

      if (data.success) {
        showToast(`User "${username}" created successfully!`, "success");
        // Clear fields & close modal
        setUsername("");
        setPassword("");
        setName("");
        setRole("user");
        setIsAddUserModalOpen(false);
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

  const handleDeleteUser = (userId, userEmail) => {
    if (userEmail === currentUser) {
      showToast("You cannot delete your own account.", "warning");
      return;
    }
    setUserToDelete({ id: userId, username: userEmail });
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      const data = await userService.deleteUser(userToDelete.id, currentUser);
      if (data.success) {
        showToast(`User "${userToDelete.username}" deleted successfully.`, "success");
        setIsDeleteModalOpen(false);
        setUserToDelete(null);
        fetchUsers(currentUser);
      } else {
        showToast(data.error || "Failed to delete user.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error deleting user.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditClick = (user) => {
    setEditId(user.id);
    setEditUsername(user.username);
    setEditName(user.name || "");
    setEditRole(user.role || "user");
    setEditPassword(""); // Reset password input
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editUsername.trim()) {
      showToast("Username / Email is required.", "warning");
      return;
    }
    setIsUpdating(true);
    try {
      const data = await userService.updateUser(
        editId,
        editUsername.trim(),
        editPassword.trim() || undefined,
        editName.trim(),
        editRole,
        currentUser
      );
      if (data.success) {
        showToast("User details updated successfully!", "success");
        setIsEditModalOpen(false);
        fetchUsers(currentUser);
      } else {
        showToast(data.error || "Failed to update user details.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error updating user details.", "error");
    } finally {
      setIsUpdating(false);
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
        
        {/* USERS LIST CARD */}
        <div style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "10px", padding: "24px", boxShadow: "var(--shadow-md)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "16px", marginBottom: "20px" }}>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "bold", color: "var(--text-primary)" }}>
              Active User Registry
            </h3>
            <button
              onClick={() => setIsAddUserModalOpen(true)}
              style={{
                backgroundColor: "#3b82f6",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: "bold",
                boxShadow: "0 4px 6px rgba(59, 130, 246, 0.2)"
              }}
            >
              Add User
            </button>
          </div>

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
                    <th style={{ padding: "14px 16px", color: "var(--text-secondary)", fontWeight: 600, width: "100px", textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: "30px", textAlign: "center", color: "var(--text-muted)" }}>
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
                        <td style={{ padding: "14px 16px", textAlign: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                            <button
                              onClick={() => handleEditClick(u)}
                              title={`Edit ${u.username}`}
                              style={{
                                backgroundColor: "transparent",
                                color: "#3b82f6",
                                border: "none",
                                padding: "6px 8px",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontSize: "15px",
                                transition: "all 0.2s",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center"
                              }}
                              onMouseOver={(e) => { 
                                e.currentTarget.style.backgroundColor = "#dbeafe"; 
                                e.currentTarget.style.color = "#2563eb";
                              }}
                              onMouseOut={(e) => { 
                                e.currentTarget.style.backgroundColor = "transparent"; 
                                e.currentTarget.style.color = "#3b82f6";
                              }}
                            >
                              <i className="fa-solid fa-pen-to-square"></i>
                            </button>

                            {u.username !== currentUser ? (
                              <button
                                onClick={() => handleDeleteUser(u.id, u.username)}
                                title={`Delete ${u.username}`}
                                style={{
                                  backgroundColor: "transparent",
                                  color: "#ef4444",
                                  border: "none",
                                  padding: "6px 8px",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                  fontSize: "15px",
                                  transition: "all 0.2s",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center"
                                }}
                                onMouseOver={(e) => { 
                                  e.currentTarget.style.backgroundColor = "#fee2e2"; 
                                  e.currentTarget.style.color = "#dc2626";
                                }}
                                onMouseOut={(e) => { 
                                  e.currentTarget.style.backgroundColor = "transparent"; 
                                  e.currentTarget.style.color = "#ef4444";
                                }}
                              >
                                <i className="fa-solid fa-trash-can"></i>
                              </button>
                            ) : (
                              <span style={{ width: "31px", display: "inline-block" }}></span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}

                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* ==================== MODAL: CREATE USER ==================== */}
      {isAddUserModalOpen && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "8px", width: "500px", maxWidth: "90vw", boxShadow: "var(--shadow-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--border-color)" }}>
              <h3 style={{ fontWeight: "bold", fontSize: "16px", color: "var(--text-primary)", margin: 0 }}>
                Create New User
              </h3>
              <button 
                onClick={() => {
                  setIsAddUserModalOpen(false);
                  setUsername("");
                  setPassword("");
                  setName("");
                  setRole("user");
                }} 
                style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "var(--text-muted)" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser}>
              <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "18px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-muted)" }}>Username / Email:</label>
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
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", padding: "16px 24px", borderTop: "1px solid var(--border-color)" }}>
                <button 
                  type="button" 
                  onClick={() => {
                    setIsAddUserModalOpen(false);
                    setUsername("");
                    setPassword("");
                    setName("");
                    setRole("user");
                  }} 
                  style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", cursor: "pointer", fontSize: "14px" }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  style={{ padding: "8px 16px", borderRadius: "6px", border: "none", backgroundColor: "#3b82f6", color: "white", cursor: isSubmitting ? "not-allowed" : "pointer", fontSize: "14px", fontWeight: "bold" }}
                >
                  {isSubmitting ? "Creating User..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: CONFIRM DELETE ==================== */}
      {isDeleteModalOpen && userToDelete && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "8px", width: "420px", maxWidth: "90vw", boxShadow: "var(--shadow-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--border-color)" }}>
              <h3 style={{ fontWeight: "bold", fontSize: "15px", color: "#ef4444", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <i className="fa-solid fa-triangle-exclamation"></i> Delete User Account
              </h3>
              <button 
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setUserToDelete(null);
                }} 
                style={{ background: "none", border: "none", fontSize: "16px", cursor: "pointer", color: "var(--text-muted)" }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: "20px", fontSize: "14px", color: "var(--text-primary)" }}>
              <p style={{ margin: "0 0 12px 0" }}>
                Are you sure you want to permanently delete the user account:
              </p>
              <div style={{ backgroundColor: "var(--bg-tertiary)", padding: "12px", borderRadius: "6px", border: "1px solid var(--border-color)", marginBottom: "8px" }}>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600 }}>USERNAME / EMAIL</div>
                <div style={{ fontWeight: "bold", color: "var(--text-primary)", fontSize: "14px", marginTop: "2px" }}>{userToDelete.username}</div>
              </div>
              <p style={{ color: "#ef4444", fontSize: "12px", margin: "12px 0 0 0", display: "flex", alignItems: "center", gap: "4px" }}>
                <i className="fa-solid fa-circle-info"></i> This action cannot be undone.
              </p>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", padding: "14px 20px", borderTop: "1px solid var(--border-color)" }}>
              <button 
                type="button" 
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setUserToDelete(null);
                }} 
                style={{ padding: "8px 14px", borderRadius: "6px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", cursor: "pointer", fontSize: "13px" }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                style={{ padding: "8px 14px", borderRadius: "6px", border: "none", backgroundColor: "#ef4444", color: "white", cursor: isDeleting ? "not-allowed" : "pointer", fontSize: "13px", fontWeight: "bold" }}
              >
                {isDeleting ? "Deleting..." : "Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL: EDIT USER ==================== */}
      {isEditModalOpen && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "8px", width: "500px", maxWidth: "90vw", boxShadow: "var(--shadow-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--border-color)" }}>
              <h3 style={{ fontWeight: "bold", fontSize: "16px", color: "var(--text-primary)", margin: 0 }}>
                Edit User Details
              </h3>
              <button 
                onClick={() => {
                  setIsEditModalOpen(false);
                }} 
                style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "var(--text-muted)" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateUser}>
              <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "18px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-muted)" }}>Username / Email:</label>
                  <input
                    type="text"
                    placeholder="e.g. employee@company.com"
                    required
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border-color)", borderRadius: "6px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-muted)" }}>New Password:</label>
                  <input
                    type="password"
                    placeholder="Leave blank to keep existing password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border-color)", borderRadius: "6px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-muted)" }}>Full Name:</label>
                  <input
                    type="text"
                    placeholder="e.g. Jane Doe"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border-color)", borderRadius: "6px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-muted)" }}>Role:</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    disabled={editUsername === currentUser}
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border-color)", borderRadius: "6px", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "14px", outline: "none" }}
                  >
                    <option value="user">User (Restricted Access)</option>
                    <option value="admin">Admin (Full Access)</option>
                  </select>
                  {editUsername === currentUser && (
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", fontStyle: "italic" }}>
                      You cannot revoke your own admin access.
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", padding: "16px 24px", borderTop: "1px solid var(--border-color)" }}>
                <button 
                  type="button" 
                  onClick={() => {
                    setIsEditModalOpen(false);
                  }} 
                  style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)", cursor: "pointer", fontSize: "14px" }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isUpdating}
                  style={{ padding: "8px 16px", borderRadius: "6px", border: "none", backgroundColor: "#3b82f6", color: "white", cursor: isUpdating ? "not-allowed" : "pointer", fontSize: "14px", fontWeight: "bold" }}
                >
                  {isUpdating ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
