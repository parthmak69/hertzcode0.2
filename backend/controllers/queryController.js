import mysql from "mysql2/promise";

const getDbConfig = () => ({
  host: process.env.DB_HOST || "127.0.0.1",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
});

const validateName = (name) => {
  const pattern = /^[a-z0-9_]+$/;
  return pattern.test(name.trim().toLowerCase());
};

const FORBIDDEN_DATABASES = ["mysql", "information_schema", "performance_schema", "sys"];

const DANGEROUS_PATTERNS = [
  /\bDROP\s+DATABASE\b/i,
  /\bSHUTDOWN\b/i,
  /\bGRANT\b/i,
  /\bREVOKE\b/i,
  /\b(CREATE|ALTER|DROP)\s+USER\b/i,
  /\b(FROM|INTO|UPDATE|JOIN)\s+`?mysql`?\./i,
];

export const runQuery = async (req, res) => {
  let connection;
  try {
    const dbName = (req.body.dbName || "").trim();
    const rawSql = (req.body.sql || req.body.query || "").trim();

    if (!dbName || !rawSql) {
      return res.status(400).json({
        success: false,
        error: "Database name and SQL query are required.",
      });
    }

    if (dbName.startsWith("mongodb:")) {
      return res.status(400).json({ success: false, error: "MongoDB is not supported." });
    }

    if (!validateName(dbName)) {
      return res.status(400).json({ success: false, error: "Invalid database name." });
    }

    if (FORBIDDEN_DATABASES.includes(dbName.toLowerCase())) {
      return res.status(403).json({ success: false, error: "Access to system databases is prohibited." });
    }

    // Strip SQL comments before analyzing command intent
    const cleanSql = rawSql.replace(/\/\*[\s\S]*?\*\/|--.*$/gm, "").trim();

    // Block dangerous destructive and privilege-escalating commands
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(cleanSql)) {
        return res.status(403).json({
          success: false,
          error: "Operation blocked: This SQL statement contains restricted server commands. Database drops must be performed through the project manager.",
        });
      }
    }

    // MySQL query execution
    connection = await mysql.createConnection({
      ...getDbConfig(),
      database: dbName,
      multipleStatements: true,
    });

    const [rows, fields] = await connection.query(rawSql);

    // Automatic audit logging if query_logger table exists in this database
    try {
      const [tables] = await connection.query("SHOW TABLES LIKE 'query_logger'");
      if (tables.length > 0) {
        const executor = req.user?.username || req.headers["x-user-username"] || "admin";
        await connection.query(
          "INSERT INTO `query_logger` (`query`, `link`, `accountID`) VALUES (?, ?, ?)",
          [rawSql, "Hertzcoder Query Terminal", executor]
        );
      }
    } catch (logErr) {
      console.warn("Audit logging failed:", logErr.message);
    }

    return res.json({
      success: true,
      rows,
      fields: fields ? fields.map(f => f.name) : [],
    });
  } catch (err) {
    console.error("Query Execution Error:", err);
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    if (connection) {
      try { await connection.end(); } catch (e) {}
    }
  }
};
