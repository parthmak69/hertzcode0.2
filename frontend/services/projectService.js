"use strict";

import { api } from "./api";
import { getProjectsForUser, saveProjectsForUser, syncProjectsFromDb } from "../app/utils/projectStorage";

export const projectService = {
  // Directly fetch projects from MySQL database
  fetchProjectsFromDb: async (currentUser, userRole, includeDeleted = true) => {
    try {
      const endpoint = `/api/crud/projects?user=${encodeURIComponent(currentUser || "")}&role=${encodeURIComponent(userRole || "")}${includeDeleted ? '&includeDeleted=true' : ''}`;
      const data = await api.get(endpoint);
      if (data && data.success && Array.isArray(data.projects)) {
        syncProjectsFromDb(data.projects);
        return data.projects;
      }
    } catch (e) {
      console.error("Failed to fetch projects from database:", e);
    }
    return null;
  },

  // Directly save projects to MySQL database
  saveProjectsToDb: async (newProjects, currentUser, userRole) => {
    try {
      const endpoint = `/api/crud/projects?user=${encodeURIComponent(currentUser || "")}&role=${encodeURIComponent(userRole || "")}`;
      return await api.post(endpoint, { projects: newProjects });
    } catch (e) {
      console.error("Failed to save projects to database:", e);
      throw e;
    }
  },

  getProjects: (currentUser, userRole) => {
    return getProjectsForUser(currentUser, userRole);
  },

  saveProjects: (newProjects, currentUser, userRole) => {
    return saveProjectsForUser(newProjects, currentUser, userRole);
  },
};
