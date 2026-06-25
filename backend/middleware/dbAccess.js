import mysql from "mysql2/promise";

const getDbConfig = () => ({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
});

const getMetaDbName = () => process.env.DB_NAME || "admin";

export const checkDatabaseAccess = async (req, res, next) => {
  // Bypass checks for list, create, and recycle-bin routes
  if (
    req.path === "/list" ||
    req.path === "/create" ||
    req.path.startsWith("/recycle-bin")
  ) {
    return next();
  }

  const dbName = req.query.dbName || req.body.dbName;
  if (!dbName) {
    return next();
  }

  const username = req.headers["x-user-username"] || req.query.username || req.body.username;
  if (!username) {
    return res.status(401).json({
      success: false,
      error: "Authentication required. Username not provided.",
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
    if (user.role === "admin") {
      return next(); // Admin has access to all databases
    }

    // Normal user: check if the database is in their created_databases list
    const dbString = user.created_databases || "";
    const dbNames = dbString
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);

    const cleanDbName = dbName.startsWith("mongodb:")
      ? dbName.replace("mongodb:", "")
      : dbName;

    const hasAccess = dbNames.some((d) => {
      const cleanD = d.startsWith("mongodb:") ? d.replace("mongodb:", "") : d;
      return cleanD === cleanDbName;
    });

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: `Access denied. You do not own the database '${cleanDbName}'.`,
      });
    }

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
