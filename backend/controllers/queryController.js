import mysql from "mysql2/promise";

const getDbConfig = () => ({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
});

const validateName = (name) => {
  const pattern = /^[a-z0-9_]+$/;
  return pattern.test(name.trim().toLowerCase());
};

export const runQuery = async (req, res) => {
  let connection;
  try {
    const { dbName, sql } = req.body;

    if (!dbName || !sql) {
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

    // MySQL raw query execution
    connection = await mysql.createConnection({
      ...getDbConfig(),
      database: dbName,
      multipleStatements: true,
    });

    const [rows, fields] = await connection.query(sql);

    // Automatic audit logging if query_logger table exists in this database
    try {
      const [tables] = await connection.query("SHOW TABLES LIKE 'query_logger'");
      if (tables.length > 0) {
        await connection.query(
          "INSERT INTO `query_logger` (`query`, `link`, `accountID`) VALUES (?, ?, ?)",
          [sql, "Hertzcoder Query Terminal", "admin"]
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
