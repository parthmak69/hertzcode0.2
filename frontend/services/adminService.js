"use strict";

import { api } from "./api";

export const adminService = {
  getRecycledItems: async (username) => {
    return api.get(`/api/database/recycle-bin/list?username=${encodeURIComponent(username)}`);
  },
  restoreRecycledItem: async (id, username) => {
    return api.post("/api/database/recycle-bin/restore", { id, username });
  },
  permanentlyDeleteRecycledItem: async (id, username) => {
    return api.post("/api/database/recycle-bin/permanent-delete", { id, username });
  },
};
