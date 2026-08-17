import { api } from "./api";

export const userService = {
  getCurrentUser: () => {
    if (typeof window !== "undefined") {
      return {
        username: localStorage.getItem("currentUser") || "",
        name: localStorage.getItem("currentUserName") || "",
        role: localStorage.getItem("currentUserRole") || "user",
      };
    }
    return { username: "", name: "", role: "user" };
  },
  getUsersList: async (requester) => {
    return api.get(`/api/auth/users?requester=${encodeURIComponent(requester)}`);
  },
  createUser: async (username, password, name, role, requester) => {
    return api.post("/api/auth/users", { username, pass_hash: password, name, role, requester });
  },
  deleteUser: async (userId, requester) => {
    return api.delete(`/api/auth/users?id=${encodeURIComponent(userId)}&requester=${encodeURIComponent(requester)}`)
  },
  updateUser: async (id, username, password, name, role, requester) => {
    return api.put("/api/auth/users", { id, username, password, name, role, requester });
  },
};