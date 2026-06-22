import mysql from "mysql2/promise";
import { MongoClient } from "mongodb";

const getDbConfig = () => ({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
});

const getMongoUri = () => process.env.MONGO_URI || "mongodb://localhost:27017";

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
        error: "Database name and SQL/Mongo query are required.",
      });
    }

    const isMongo = dbName.startsWith("mongodb:");
    const mongoDbRealName = isMongo ? dbName.replace("mongodb:", "") : dbName;

    if (!validateName(mongoDbRealName)) {
      return res.status(400).json({ success: false, error: "Invalid database name." });
    }

    if (isMongo) {
      const client = new MongoClient(getMongoUri());
      await client.connect();
      const db = client.db(mongoDbRealName);

      // Match db.collection.method(args) pattern
      const queryMatch = sql.trim().match(/^(?:db\.)?(\w+)\.(\w+)\(([\s\S]*)\);?$/);
      if (!queryMatch) {
        await client.close();
        return res.status(400).json({
          success: false,
          error: "Invalid MongoDB query format. Use: db.collectionName.method(arguments). Example: db.users.find({})",
        });
      }

      const colName = queryMatch[1];
      const method = queryMatch[2];
      const argsRaw = queryMatch[3].trim();

      let args = [];
      if (argsRaw) {
        try {
          // Parse JS object arguments securely using eval-like wrapping
          args = eval(`[${argsRaw}]`);
        } catch (e) {
          try {
            args = [JSON.parse(argsRaw)];
          } catch (err) {
            await client.close();
            return res.status(400).json({
              success: false,
              error: "Failed to parse query arguments. Make sure it is valid JSON or JavaScript object format.",
            });
          }
        }
      }

      const collection = db.collection(colName);
      if (typeof collection[method] !== "function") {
        await client.close();
        return res.status(400).json({
          success: false,
          error: `Method '${method}' is not supported on MongoDB collections.`,
        });
      }

      let rows;
      let fields = [];

      if (method === "find") {
        const cursor = collection.find(args[0] || {}, args[1] || {});
        if (args[2]?.limit) {
          cursor.limit(args[2].limit);
        }
        rows = await cursor.toArray();
        if (rows.length > 0) {
          const keySet = new Set();
          for (const row of rows) {
            for (const key of Object.keys(row)) {
              if (key !== "_id") keySet.add(key);
            }
          }
          fields = Array.from(keySet);
        }
      } else {
        const result = await collection[method](...args);
        rows = result;
      }

      await client.close();
      return res.json({ success: true, rows, fields });
    } else {
      // MySQL raw query execution
      connection = await mysql.createConnection({
        ...getDbConfig(),
        database: dbName,
        multipleStatements: true,
      });

      const [rows, fields] = await connection.query(sql);
      await connection.end();

      return res.json({
        success: true,
        rows,
        fields: fields ? fields.map(f => f.name) : [],
      });
    }
  } catch (err) {
    if (connection) {
      try { await connection.end(); } catch (e) {}
    }
    console.error("Query Execution Error:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
