import mysql from "mysql2/promise";
import { MongoClient } from "mongodb";

const getDbConfig = () => ({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
});

const getMetaDbName = () => process.env.DB_NAME || "admin";
const getMongoUri = () => process.env.MONGO_URI || "mongodb://localhost:27017";

// 1. LIST RECYCLED ITEMS
export const listRecycledItems = async (req, res) => {
  let connection;
  try {
    const { username } = req.query;
    if (!username) {
      return res.status(400).json({ success: false, error: "Username parameter is required." });
    }

    connection = await mysql.createConnection({
      ...getDbConfig(),
      database: getMetaDbName(),
    });

    // Check requester role
    const [userRows] = await connection.execute(
      "SELECT role FROM user_cred WHERE username = ? LIMIT 1",
      [username]
    );
    const userRole = userRows[0]?.role || "user";
    if (userRole !== "admin") {
      await connection.end();
      return res.status(403).json({ success: false, error: "Access denied. Admin role required." });
    }

    // Auto-create recycled_items if not exists
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS \`recycled_items\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`item_type\` VARCHAR(50) NOT NULL,
        \`item_name\` VARCHAR(100) NOT NULL,
        \`original_owner\` VARCHAR(100) NOT NULL,
        \`parent_context\` VARCHAR(100) DEFAULT '',
        \`metadata\` LONGTEXT DEFAULT NULL,
        \`deleted_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const [rows] = await connection.execute(
      "SELECT * FROM recycled_items ORDER BY deleted_at DESC"
    );

    await connection.end();
    return res.json({ success: true, items: rows });
  } catch (err) {
    if (connection) {
      try { await connection.end(); } catch (e) {}
    }
    console.error("List Recycled Items Error:", err);
    return res.status(500).json({ success: false, error: "Failed to list recycled items: " + err.message });
  }
};

// 2. RESTORE ITEM
export const restoreItem = async (req, res) => {
  let connection, targetConnection;
  try {
    const { id, username } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, error: "Item ID is required." });
    }

    connection = await mysql.createConnection({
      ...getDbConfig(),
      database: getMetaDbName(),
    });

    // Check requester role
    const [userRows] = await connection.execute(
      "SELECT role FROM user_cred WHERE username = ? LIMIT 1",
      [username]
    );
    const userRole = userRows[0]?.role || "user";
    if (userRole !== "admin") {
      await connection.end();
      return res.status(403).json({ success: false, error: "Access denied. Admin role required." });
    }

    // Fetch recycled item details
    const [rows] = await connection.execute(
      "SELECT * FROM recycled_items WHERE id = ? LIMIT 1",
      [id]
    );

    if (rows.length === 0) {
      await connection.end();
      return res.status(404).json({ success: false, error: "Item not found in Recycle Bin." });
    }

    const item = rows[0];
    const meta = item.metadata ? JSON.parse(item.metadata) : {};

    if (item.item_type === "database") {
      // Restore Database: add it back to active user's tracking
      const userToRestore = username || item.original_owner;
      const [userRows] = await connection.execute(
        "SELECT created_databases FROM user_cred WHERE username = ? LIMIT 1",
        [userToRestore]
      );

      if (userRows.length > 0) {
        const currentDbs = userRows[0].created_databases || "";
        const updatedDbs = currentDbs ? `${currentDbs},${item.item_name}` : item.item_name;
        await connection.execute(
          "UPDATE user_cred SET created_databases = ? WHERE username = ?",
          [updatedDbs, userToRestore]
        );
      }
    } else if (item.item_type === "table") {
      // Restore Table: rename physical table back to original name
      const isMongo = meta.isMongo;
      const physicalName = meta.physicalName;
      const originalName = item.item_name.trim().toLowerCase();
      const dbName = item.parent_context;

      if (isMongo) {
        const mongoDbName = dbName.replace("mongodb:", "");
        const client = new MongoClient(getMongoUri());
        await client.connect();
        const db = client.db(mongoDbName);
        await db.collection(physicalName).rename(originalName);
        await client.close();
      } else {
        targetConnection = await mysql.createConnection({
          ...getDbConfig(),
          database: dbName,
        });
        await targetConnection.execute(
          `RENAME TABLE \`${physicalName}\` TO \`${originalName}\``
        );
        await targetConnection.end();
        targetConnection = null;
      }
    }

    // Delete from recycled_items table
    await connection.execute("DELETE FROM recycled_items WHERE id = ?", [id]);
    await connection.end();

    return res.json({ success: true });
  } catch (err) {
    if (connection) {
      try { await connection.end(); } catch (e) {}
    }
    if (targetConnection) {
      try { await targetConnection.end(); } catch (e) {}
    }
    console.error("Restore Recycled Item Error:", err);
    return res.status(500).json({ success: false, error: "Failed to restore item: " + err.message });
  }
};

// 3. PERMANENT DELETE (ADMIN ONLY)
export const permanentDeleteItem = async (req, res) => {
  let connection, targetConnection;
  try {
    const { id, username } = req.body;

    connection = await mysql.createConnection({
      ...getDbConfig(),
      database: getMetaDbName(),
    });

    // Check requester role
    const [userRows] = await connection.execute(
      "SELECT role FROM user_cred WHERE username = ? LIMIT 1",
      [username]
    );
    const userRole = userRows[0]?.role || "user";
    if (userRole !== "admin") {
      await connection.end();
      return res.status(403).json({ success: false, error: "Only administrators are authorized to permanently delete items." });
    }

    const [rows] = await connection.execute(
      "SELECT * FROM recycled_items WHERE id = ? LIMIT 1",
      [id]
    );

    if (rows.length === 0) {
      await connection.end();
      return res.status(404).json({ success: false, error: "Item not found in Recycle Bin." });
    }

    const item = rows[0];
    const meta = item.metadata ? JSON.parse(item.metadata) : {};

    if (item.item_type === "database") {
      const isMongo = meta.isMongo;
      const rawDbName = isMongo ? item.item_name.replace("mongodb:", "") : item.item_name;
      const cleanDbName = rawDbName.trim().toLowerCase();

      if (isMongo) {
        const client = new MongoClient(getMongoUri());
        await client.connect();
        const db = client.db(cleanDbName);
        await db.dropDatabase();
        await client.close();
      } else {
        targetConnection = await mysql.createConnection(getDbConfig());
        await targetConnection.execute(`DROP DATABASE IF EXISTS \`${cleanDbName}\``);
        await targetConnection.end();
        targetConnection = null;
      }
    } else if (item.item_type === "table") {
      const isMongo = meta.isMongo;
      const physicalName = meta.physicalName;
      const dbName = item.parent_context;

      if (isMongo) {
        const mongoDbName = dbName.replace("mongodb:", "");
        const client = new MongoClient(getMongoUri());
        await client.connect();
        const db = client.db(mongoDbName);
        await db.collection(physicalName).drop();
        await client.close();
      } else {
        targetConnection = await mysql.createConnection({
          ...getDbConfig(),
          database: dbName,
        });
        await targetConnection.execute(`DROP TABLE IF EXISTS \`${physicalName}\``);
        await targetConnection.end();
        targetConnection = null;
      }
    }

    // Delete row from recycled_items
    await connection.execute("DELETE FROM recycled_items WHERE id = ?", [id]);
    await connection.end();

    return res.json({ success: true });
  } catch (err) {
    if (connection) {
      try { await connection.end(); } catch (e) {}
    }
    if (targetConnection) {
      try { await targetConnection.end(); } catch (e) {}
    }
    console.error("Permanent Delete Recycled Item Error:", err);
    return res.status(500).json({ success: false, error: "Failed to permanently delete item: " + err.message });
  }
};
