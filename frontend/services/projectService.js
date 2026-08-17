"use strict";

import { getProjectsForUser, saveProjectsForUser } from "../app/utils/projectStorage";

export const projectService = {
  getProjects: (currentUser, userRole) => {
    return getProjectsForUser(currentUser, userRole);
  },
  saveProjects: (newProjects, currentUser, userRole) => {
    saveProjectsForUser(newProjects, currentUser, userRole);
  },
};
