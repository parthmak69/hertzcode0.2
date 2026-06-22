import mysql from "mysql2/promise";
import { MongoClient } from "mongodb";

const getDbConfig = () => ({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
});

const getMetaDbName = () => process.env.DB_NAME || "admin";
const getMongoUri = () => process.env.MONGO_URI || "mongodb://localhost:27017";

// TABLE SCHEMAS for default creation tables (Quick Tables option)
const TABLE_SCHEMAS = {
  admin: `
    CREATE TABLE \`admin\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`username\` VARCHAR(100) NOT NULL UNIQUE,
      \`password\` VARCHAR(255) NOT NULL,
      \`email\` VARCHAR(150) NOT NULL UNIQUE,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,
  blog: `
    CREATE TABLE \`blog\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`title\` VARCHAR(255) NOT NULL,
      \`slug\` VARCHAR(255) NOT NULL UNIQUE,
      \`content\` TEXT NOT NULL,
      \`status\` VARCHAR(50) DEFAULT 'draft',
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,
  blog_category: `
    CREATE TABLE \`blog_category\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`name\` VARCHAR(100) NOT NULL UNIQUE,
      \`slug\` VARCHAR(100) NOT NULL UNIQUE,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,
  blog_comments: `
    CREATE TABLE \`blog_comments\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`blog_id\` INT NOT NULL,
      \`author_name\` VARCHAR(100) NOT NULL,
      \`comment\` TEXT NOT NULL,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,
  cart: `
    CREATE TABLE \`cart\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`session_id\` VARCHAR(255) NOT NULL,
      \`product_id\` INT NOT NULL,
      \`quantity\` INT NOT NULL DEFAULT 1,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,
  contents: `
    CREATE TABLE \`contents\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`key\` VARCHAR(100) NOT NULL UNIQUE,
      \`value\` TEXT NOT NULL,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,
  customer: `
    CREATE TABLE \`customer\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`first_name\` VARCHAR(100) NOT NULL,
      \`last_name\` VARCHAR(100) NOT NULL,
      \`email\` VARCHAR(150) NOT NULL UNIQUE,
      \`phone\` VARCHAR(20),
      \`password\` VARCHAR(255) NOT NULL,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,
  faq: `
    CREATE TABLE \`faq\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`question\` TEXT NOT NULL,
      \`answer\` TEXT NOT NULL,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,
  home_slider: `
    CREATE TABLE \`home_slider\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`title\` VARCHAR(255),
      \`image_url\` VARCHAR(255) NOT NULL,
      \`link_url\` VARCHAR(255),
      \`sort_order\` INT DEFAULT 0
    );
  `,
  image_category: `
    CREATE TABLE \`image_category\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`name\` VARCHAR(100) NOT NULL UNIQUE,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,
  images: `
    CREATE TABLE \`images\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`category_id\` INT,
      \`image_url\` VARCHAR(255) NOT NULL,
      \`title\` VARCHAR(255),
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,
  login_activity: `
    CREATE TABLE \`login_activity\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`user_id\` INT,
      \`username\` VARCHAR(100),
      \`ip_address\` VARCHAR(45),
      \`user_agent\` TEXT,
      \`login_time\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,
  order_items: `
    CREATE TABLE \`order_items\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`order_id\` INT NOT NULL,
      \`product_id\` INT NOT NULL,
      \`quantity\` INT NOT NULL,
      \`price\` DECIMAL(10,2) NOT NULL
    );
  `,
  orders: `
    CREATE TABLE \`orders\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`customer_id\` INT NOT NULL,
      \`total_amount\` DECIMAL(10,2) NOT NULL,
      \`status\` VARCHAR(50) DEFAULT 'pending',
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,
  product: `
    CREATE TABLE \`product\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`name\` VARCHAR(255) NOT NULL,
      \`slug\` VARCHAR(255) NOT NULL UNIQUE,
      \`description\` TEXT,
      \`price\` DECIMAL(10,2) NOT NULL,
      \`stock\` INT NOT NULL DEFAULT 0,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,
  product_category: `
    CREATE TABLE \`product_category\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`name\` VARCHAR(100) NOT NULL UNIQUE,
      \`slug\` VARCHAR(100) NOT NULL UNIQUE,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,
  product_images: `
    CREATE TABLE \`product_images\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`product_id\` INT NOT NULL,
      \`image_url\` VARCHAR(255) NOT NULL,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,
  product_reviews: `
    CREATE TABLE \`product_reviews\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`product_id\` INT NOT NULL,
      \`customer_name\` VARCHAR(100) NOT NULL,
      \`rating\` INT NOT NULL,
      \`review_text\` TEXT,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,
  query_logger: `
    CREATE TABLE \`query_logger\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`query_text\` TEXT NOT NULL,
      \`execution_time_ms\` INT,
      \`logged_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,
  users: `
    CREATE TABLE \`users\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`username\` VARCHAR(100) NOT NULL UNIQUE,
      \`email\` VARCHAR(150) NOT NULL UNIQUE,
      \`password\` VARCHAR(255) NOT NULL,
      \`role\` VARCHAR(50) DEFAULT 'user',
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,
  video_category: `
    CREATE TABLE \`video_category\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`name\` VARCHAR(100) NOT NULL UNIQUE,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,
  videos: `
    CREATE TABLE \`videos\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`category_id\` INT,
      \`title\` VARCHAR(255) NOT NULL,
      \`video_url\` VARCHAR(255) NOT NULL,
      \`description\` TEXT,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,
  wishlist: `
    CREATE TABLE \`wishlist\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`customer_id\` INT NOT NULL,
      \`product_id\` INT NOT NULL,
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `
};

export const listDatabases = async (req, res) => {
  let userDbConnection, adminConnection;
  try {
    const { username } = req.query;

    if (!username) {
      return res.json({ success: true, databases: [] });
    }

    userDbConnection = await mysql.createConnection({
      ...getDbConfig(),
      database: getMetaDbName(),
    });

    const [rows] = await userDbConnection.execute(
      "SELECT created_databases FROM user_cred WHERE username = ? LIMIT 1",
      [username]
    );

    await userDbConnection.end();
    userDbConnection = null;

    if (rows.length === 0) {
      return res.json({ success: true, databases: [] });
    }

    const dbString = rows[0].created_databases || "";
    const dbNames = dbString ? dbString.split(",").map(name => name.trim()).filter(Boolean) : [];

    const databasesList = [];
    adminConnection = await mysql.createConnection(getDbConfig());

    for (const dbName of dbNames) {
      if (dbName.startsWith("mongodb:")) {
        const mongoDbRealName = dbName.replace("mongodb:", "");
        try {
          const client = new MongoClient(getMongoUri());
          await client.connect();

          const adminDb = client.db().admin();
          const dbsInfo = await adminDb.listDatabases();
          const dbExists = dbsInfo.databases.some(d => d.name === mongoDbRealName);

          if (!dbExists) {
            await client.close();
            // Stale MongoDB database cleanup
            const cleanConnection = await mysql.createConnection({
              ...getDbConfig(),
              database: getMetaDbName(),
            });
            const [userRows] = await cleanConnection.execute(
              "SELECT created_databases FROM user_cred WHERE username = ? LIMIT 1",
              [username]
            );
            if (userRows.length > 0) {
              const currentDbs = userRows[0].created_databases || "";
              const updatedList = currentDbs
                .split(",")
                .map(n => n.trim())
                .filter(n => n !== dbName)
                .join(",");
              await cleanConnection.execute(
                "UPDATE user_cred SET created_databases = ? WHERE username = ?",
                [updatedList || null, username]
              );
            }
            await cleanConnection.end();
            continue;
          }

          const db = client.db(mongoDbRealName);
          const collections = await db.listCollections().toArray();
          await client.close();

          databasesList.push({
            id: "mongo_" + dbName,
            name: dbName,
            displayName: mongoDbRealName,
            type: "mongodb",
            createdDate: "Mongo DB",
            tablesCount: collections.length,
          });
        } catch (err) {
          databasesList.push({
            id: "mongo_" + dbName,
            name: dbName,
            displayName: mongoDbRealName,
            type: "mongodb",
            createdDate: "Mongo DB",
            tablesCount: 0,
          });
        }
      } else {
        try {
          const [tables] = await adminConnection.query(`SHOW TABLES FROM \`${dbName}\``);
          databasesList.push({
            id: "sql_" + dbName,
            name: dbName,
            displayName: dbName,
            type: "sql",
            createdDate: "Local DB",
            tablesCount: tables.length,
          });
        } catch (err) {
          const notExists = err.code === "ER_BAD_DB_ERROR" || err.errno === 1049 || String(err).includes("database does not exist");
          if (!notExists) {
            databasesList.push({
              id: "sql_" + dbName,
              name: dbName,
              displayName: dbName,
              type: "sql",
              createdDate: "Local DB",
              tablesCount: 0,
            });
          } else {
            // Stale SQL database cleanup
            try {
              const cleanConnection = await mysql.createConnection({
                ...getDbConfig(),
                database: getMetaDbName(),
              });
              const [userRows] = await cleanConnection.execute(
                "SELECT created_databases FROM user_cred WHERE username = ? LIMIT 1",
                [username]
              );
              if (userRows.length > 0) {
                const currentDbs = userRows[0].created_databases || "";
                const updatedList = currentDbs
                  .split(",")
                  .map(n => n.trim())
                  .filter(n => n !== dbName && n !== `mongodb:${dbName}`)
                  .join(",");
                await cleanConnection.execute(
                  "UPDATE user_cred SET created_databases = ? WHERE username = ?",
                  [updatedList || null, username]
                );
              }
              await cleanConnection.end();
            } catch (cleanupErr) {
              console.error("Cleanup error:", cleanupErr);
            }
          }
        }
      }
    }

    await adminConnection.end();
    return res.json({ success: true, databases: databasesList });
  } catch (err) {
    if (userDbConnection) {
      try { await userDbConnection.end(); } catch (e) {}
    }
    if (adminConnection) {
      try { await adminConnection.end(); } catch (e) {}
    }
    console.error("List Databases Error:", err);
    return res.status(500).json({ success: false, error: "Failed to list databases: " + err.message });
  }
};

export const createDatabase = async (req, res) => {
  let connection, userConn;
  try {
    const { dbName, tables, username, dbType } = req.body;

    if (!dbName) {
      return res.status(400).json({ success: false, error: "Database name is required." });
    }

    const trimmedName = dbName.trim().toLowerCase();
    const validPattern = /^[a-z0-9_]+$/;
    if (!validPattern.test(trimmedName)) {
      return res.status(400).json({
        success: false,
        error: "Invalid database name format. Use only lowercase letters, numbers, and underscores.",
      });
    }

    const isMongo = dbType === "mongodb";
    const finalDbTrackingName = isMongo ? `mongodb:${trimmedName}` : trimmedName;

    if (isMongo) {
      const client = new MongoClient(getMongoUri());
      await client.connect();
      const db = client.db(trimmedName);

      if (Array.isArray(tables) && tables.length > 0) {
        for (const colName of tables) {
          const col = db.collection(colName);
          await col.insertOne({
            created_at: new Date(),
            description: `Auto-generated MongoDB collection for ${colName}`,
          });
        }
      } else {
        await db.collection("init").insertOne({ initialized: true, timestamp: new Date() });
      }
      await client.close();
    } else {
      connection = await mysql.createConnection(getDbConfig());
      await connection.execute(`CREATE DATABASE \`${trimmedName}\``);
      await connection.query(`USE \`${trimmedName}\``);

      if (Array.isArray(tables) && tables.length > 0) {
        for (const colName of tables) {
          const schemaQuery = TABLE_SCHEMAS[colName];
          if (schemaQuery) {
            await connection.execute(schemaQuery);
          }
        }
      }
      await connection.end();
      connection = null;
    }

    // Assign DB ownership
    if (username) {
      userConn = await mysql.createConnection({
        ...getDbConfig(),
        database: getMetaDbName(),
      });

      const [rows] = await userConn.execute(
        "SELECT created_databases FROM user_cred WHERE username = ? LIMIT 1",
        [username]
      );

      if (rows.length > 0) {
        const currentDbs = rows[0].created_databases || "";
        const updatedDbs = currentDbs ? `${currentDbs},${finalDbTrackingName}` : finalDbTrackingName;
        await userConn.execute(
          "UPDATE user_cred SET created_databases = ? WHERE username = ?",
          [updatedDbs, username]
        );
      }
      await userConn.end();
      userConn = null;
    }

    return res.json({ success: true });
  } catch (err) {
    if (connection) {
      try { await connection.end(); } catch (e) {}
    }
    if (userConn) {
      try { await userConn.end(); } catch (e) {}
    }
    console.error("Create Database Error:", err);
    return res.status(500).json({ success: false, error: "Failed to create database: " + err.message });
  }
};

export const deleteDatabase = async (req, res) => {
  let connection, userConn;
  try {
    const { dbName, username } = req.body;

    if (!dbName) {
      return res.status(400).json({ success: false, error: "Database name is required." });
    }

    const isMongo = dbName.startsWith("mongodb:");
    const mongoDbRealName = isMongo ? dbName.replace("mongodb:", "") : dbName;
    const trimmedName = mongoDbRealName.trim().toLowerCase();

    const validPattern = /^[a-z0-9_]+$/;
    if (!validPattern.test(trimmedName)) {
      return res.status(400).json({ success: false, error: "Invalid database name." });
    }

    if (isMongo) {
      const client = new MongoClient(getMongoUri());
      await client.connect();
      const db = client.db(trimmedName);
      await db.dropDatabase();
      await client.close();
    } else {
      connection = await mysql.createConnection(getDbConfig());
      await connection.execute(`DROP DATABASE IF EXISTS \`${trimmedName}\``);
      await connection.end();
      connection = null;
    }

    // Remove from user ownership tracking
    if (username) {
      userConn = await mysql.createConnection({
        ...getDbConfig(),
        database: getMetaDbName(),
      });

      const [rows] = await userConn.execute(
        "SELECT created_databases FROM user_cred WHERE username = ? LIMIT 1",
        [username]
      );

      if (rows.length > 0) {
        const currentDbs = rows[0].created_databases || "";
        const updatedDbs = currentDbs
          .split(",")
          .map(d => d.trim())
          .filter(d => d && d !== dbName)
          .join(",");

        await userConn.execute(
          "UPDATE user_cred SET created_databases = ? WHERE username = ?",
          [updatedDbs || null, username]
        );
      }
      await userConn.end();
      userConn = null;
    }

    return res.json({ success: true });
  } catch (err) {
    if (connection) {
      try { await connection.end(); } catch (e) {}
    }
    if (userConn) {
      try { await userConn.end(); } catch (e) {}
    }
    console.error("Delete Database Error:", err);
    return res.status(500).json({ success: false, error: "Failed to delete database: " + err.message });
  }
};
