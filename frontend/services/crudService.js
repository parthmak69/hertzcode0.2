"use strict";

import { api } from "./api";

export const crudService = {
  generateCrud: async (project, file) => {
    return api.post("/api/crud/generate", { project, file });
  },
  initializeProject: async (project) => {
    return api.post("/api/crud/initialize", { project });
  },
  getSchemas: async (directory) => {
    return api.get(`/api/crud/schemas?directory=${encodeURIComponent(directory)}`);
  },
};
