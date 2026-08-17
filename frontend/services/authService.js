"use strict";

import { api } from "./api";

export const authService = {
  login: async (username, password) => {
    return api.post("/api/auth/login", { username, pass_hash: password });
  },
  signup: async (username, name, password) => {
    return api.post("/api/auth/signup", { username, name, pass_hash: password });
  },
  forgotPassword: async (email, newPassword) => {
    return api.post("/api/auth/forgot-password", { email, newPassword });
  },
};
