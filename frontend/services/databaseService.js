"use strict";

import { api } from "./api";

export const databaseService = {
  getDatabases: async (username) => {
    return api.get(`/api/database/list?username=${encodeURIComponent(username)}`);
  },
  createDatabase: async (dbName, dbType, tables = [], username = "") => {
    return api.post("/api/database/create", { dbName, dbType, tables, username });
  },
  deleteDatabase: async (dbName, username = "") => {
    return api.delete("/api/database/delete", { dbName, username });
  },
  runQuery: async (dbName, query) => {
    return api.post("/api/database/query", { dbName, query });
  },
  getTables: async (dbName) => {
    return api.get(`/api/database/tables?dbName=${encodeURIComponent(dbName)}`);
  },
  createTable: async (dbName, tableName, columns = [], options = {}) => {
    return api.post("/api/database/tables/create", { dbName, tableName, columns, ...options });
  },
  deleteTable: async (dbName, tableName, username = "") => {
    return api.delete("/api/database/tables/delete", { dbName, tableName, username });
  },
  createTableRaw: async (dbName, sql) => {
    return api.post("/api/database/tables/create-raw", { dbName, sql });
  },
  getTableRows: async (dbName, tableName) => {
    return api.get(`/api/database/tables/rows?dbName=${encodeURIComponent(dbName)}&tableName=${encodeURIComponent(tableName)}`);
  },
  insertTableRow: async (dbName, tableName, record, username = "") => {
    return api.post("/api/database/tables/rows", { dbName, tableName, record, username });
  },
  updateTableRow: async (dbName, tableName, id, record, username = "") => {
    return api.put("/api/database/tables/rows", { dbName, tableName, id, record, username });
  },
  deleteTableRow: async (dbName, tableName, id, username = "") => {
    return api.delete(`/api/database/tables/rows?dbName=${encodeURIComponent(dbName)}&tableName=${encodeURIComponent(tableName)}&id=${encodeURIComponent(id)}${username ? `&username=${encodeURIComponent(username)}` : ""}`);
  },
  seedTable: async (dbName, tableName, count, mappings = {}, customValues = {}) => {
    return api.post("/api/database/tables/seed", { dbName, tableName, count, mappings, customValues });
  },
  generateSqlWithAi: async (prompt, dbName = "") => {
    return api.post("/api/ai", { prompt, dbName });
  },
};
