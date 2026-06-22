import express from "express";
import {
  listDatabases,
  createDatabase,
  deleteDatabase,
} from "../controllers/databaseController.js";
import {
  listTables,
  createTable,
  deleteTable,
  createTableRaw,
  getTableRows,
  insertTableRow,
  updateTableRow,
  deleteTableRow,
  seedTable,
} from "../controllers/tableController.js";

import { runQuery } from "../controllers/queryController.js";

const router = express.Router();

// Database Level
router.get("/list", listDatabases);
router.post("/create", createDatabase);
router.delete("/delete", deleteDatabase);
router.post("/query", runQuery);

// Table Structure Level
router.get("/tables", listTables);
router.post("/tables/create", createTable);
router.delete("/tables/delete", deleteTable);
router.post("/tables/create-raw", createTableRaw);

// Rows CRUD Level
router.get("/tables/rows", getTableRows);
router.post("/tables/rows", insertTableRow);
router.put("/tables/rows", updateTableRow);
router.delete("/tables/rows", deleteTableRow);

// Seeding Mock Data
router.post("/tables/seed", seedTable);

export default router;
