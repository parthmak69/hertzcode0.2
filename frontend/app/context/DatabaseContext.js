"use client";
"use strict";

import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { databaseService } from "../../services/databaseService";

const DatabaseContext = createContext();

export function DatabaseProvider({ children }) {
  const { currentUser, currentUserRole } = useAuth();
  const [databases, setDatabases] = useState([]);
  const [activeDatabase, setActiveDatabase] = useState(null);

  const fetchDatabasesList = async (user, role) => {
    if (!user) return;
    try {
      const data = await databaseService.getDatabases(user, role);
      if (data.success) {
        const serverDbs = data.databases || [];
        const merged = serverDbs.map((db) => ({
          id: db.name,
          name: db.name,
          owner: db.owner,
          tablesCount: db.tablesCount,
          tables: [],
        }));
        setDatabases(merged);
      }
    } catch (err) {
      console.error("Failed to load databases list from Context:", err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchDatabasesList(currentUser, currentUserRole);
    } else {
      setDatabases([]);
      setActiveDatabase(null);
    }
  }, [currentUser, currentUserRole]); // eslint-disable-next-line react-hooks/exhaustive-deps

  return (
    <DatabaseContext.Provider
      value={{
        databases,
        activeDatabase,
        setActiveDatabase,
        refreshDatabases: () => fetchDatabasesList(currentUser),
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabases() {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error("useDatabases must be used within a DatabaseProvider");
  }
  return context;
}
