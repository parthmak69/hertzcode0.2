"use client";
"use strict";

import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { projectService } from "../../services/projectService";

const ProjectContext = createContext();

export function ProjectProvider({ children }) {
  const { currentUser, currentUserRole } = useAuth();
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    if (currentUser) {
      const list = projectService.getProjects(currentUser, currentUserRole);
      setProjects(list);
    } else {
      setProjects([]);
    }
  }, [currentUser, currentUserRole]);

  const refreshProjects = () => {
    if (currentUser) {
      const list = projectService.getProjects(currentUser, currentUserRole);
      setProjects(list);
    }
  };

  const updateProjectsList = (newList) => {
    setProjects(newList);
    projectService.saveProjects(newList, currentUser, currentUserRole);
  };

  return (
    <ProjectContext.Provider
      value={{
        projects,
        refreshProjects,
        updateProjectsList,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjects() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProjects must be used within a ProjectProvider");
  }
  return context;
}
