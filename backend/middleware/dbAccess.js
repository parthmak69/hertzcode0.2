import mysql from "mysql2/promise";
import { verifyToken } from "../utils/authHelper.js";

const getDbConfig = () => ({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
});

const getMetaDbName = () => process.env.DB_NAME || "admin";
const FORBIDDEN_DATABASES = ["mysql", "information_schema", "performance_schema", "sys"];

export const checkDatabaseAccess = async (req, res, next) => {
  const dbName = req.query.dbName || req.body.dbName;

  // Protect system databases against direct access
  if (dbName && FORBIDDEN_DATABASES.includes(dbName.trim().toLowerCase())) {
    return res.status(403).json({
      success: false,
      error: `Access denied. '${dbName}' is a protected system database.`,
    });
  }

  // Bypass checks for generic discovery / creation routes
  if (
    req.path === "/list" ||
    req.path === "/create" ||
    req.path.startsWith("/recycle-bin")
  ) {
    return next();
  }

  if (!dbName) {
    return next();
  }

  // 1. Verify identity via JWT token first (if provided)
  const authUser = verifyToken(req);
  if (authUser && authUser.role === "admin") {
    req.user = authUser;
    return next(); // Authenticated admin has access to all databases
  }

  // 2. Identify requesting username
  let username = authUser ? authUser.username : null;
  if (!username) {
    username = req.headers["x-user-username"] || req.query.username || req.body.username;
  }

  // If no username and no auth token, reject unauthenticated request
  if (!username) {
    return res.status(401).json({
      success: false,
      error: "Authentication required. Please log in or provide valid credentials.",
    });
  }

  // For raw SQL query terminal (/query), enforce signed JWT token for admin privilege to prevent unauthenticated injection
  if (req.path === "/query" && !authUser) {
    return res.status(401).json({
      success: false,
      error: "Authentication required. Admin query terminal requires a valid authorization token.",
    });
  }

  let connection;
  try {
    connection = await mysql.createConnection({
      ...getDbConfig(),
      database: getMetaDbName(),
    });

    const [rows] = await connection.execute(
      "SELECT role, created_databases FROM user_cred WHERE username = ? LIMIT 1",
      [username]
    );

    await connection.end();
    connection = null;

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: "Invalid user credentials.",
      });
    }

    const user = rows[0];

    // Admin role has access to databases for management & table browsing
    if (user.role === "admin") {
      req.user = authUser || { username: user.username, role: user.role };
      return next();
    }

    // Normal user: check if the database is in their created_databases list
    const dbString = user.created_databases || "";
    const dbNames = dbString
      .split(",")
      .map((name) => name.trim().toLowerCase())
      .filter(Boolean);

    const hasAccess = dbNames.includes(dbName.trim().toLowerCase());

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: `Access denied. You do not own the database '${dbName}'.`,
      });
    }

    req.user = user;
    next();
  } catch (err) {
    if (connection) {
      try {
        await connection.end();
      } catch (e) {}
    }
    console.error("checkDatabaseAccess error:", err);
    return res.status(500).json({
      success: false,
      error: "Database access verification failed: " + err.message,
    });
  }
};

