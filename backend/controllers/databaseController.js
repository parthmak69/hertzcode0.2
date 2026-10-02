import mysql from "mysql2/promise";

const getDbConfig = () => ({
  host: process.env.DB_HOST || "127.0.0.1",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
});

const getMetaDbName = () => process.env.DB_NAME || "admin";

// TABLE SCHEMAS for default creation tables (Quick Tables option)
const TABLE_SCHEMAS = {
  admin: `
    CREATE TABLE IF NOT EXISTS \`admin\` (
      \`id\` int(11) UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,
      \`fname\` varchar(50) DEFAULT NULL,
      \`lname\` varchar(50) DEFAULT NULL,
      \`username\` varchar(100) DEFAULT NULL,
      \`password\` varchar(50) DEFAULT NULL,
      \`role\` bit(1) NOT NULL DEFAULT b'0' COMMENT '{"0":"Admin","1":"User"}',
      \`secureKey\` varchar(100) DEFAULT NULL,
      \`createdBy\` varchar(255) DEFAULT NULL,
      \`createdOn\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`modifiedOn\` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      \`isDeleted\` tinyint(1) DEFAULT 0,
      \`deletedOn\` datetime DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ALTER TABLE \`admin\` ADD UNIQUE KEY \`username\` (\`username\`);
    INSERT INTO \`admin\` (\`fname\`, \`lname\`, \`username\`, \`password\`, \`role\`, \`secureKey\`) VALUES ('Admin', 'User', 'admin', 'admin123', b'1', NULL);
  `,
  blog: `
    CREATE TABLE IF NOT EXISTS \`blog\` (
      \`id\` int(11) UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,
      \`title\` text DEFAULT NULL,
      \`slug\` text DEFAULT NULL,
      \`content\` text DEFAULT NULL,
      \`blogPhoto\` text DEFAULT NULL,
      \`categoryID\` int(11) UNSIGNED DEFAULT NULL,
      \`views\` int(11) UNSIGNED NOT NULL DEFAULT 0,
      \`createdBy\` varchar(255) DEFAULT NULL,
      \`createdOn\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`modifiedOn\` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      \`isDeleted\` tinyint(1) DEFAULT 0,
      \`deletedOn\` datetime DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ALTER TABLE \`blog\` ADD KEY \`blogCategory_id\` (\`categoryID\`);
  `,
  blog_category: `
    CREATE TABLE IF NOT EXISTS \`blog_category\` (
      \`id\` int(11) UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,
      \`categoryName\` varchar(20) CHARACTER SET latin1 DEFAULT NULL,
      \`createdBy\` varchar(255) DEFAULT NULL,
      \`createdOn\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`modifiedOn\` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      \`isDeleted\` tinyint(1) DEFAULT 0,
      \`deletedOn\` datetime DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `,
  blog_comments: `
    CREATE TABLE IF NOT EXISTS \`blog_comments\` (
      \`id\` int(11) UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,
      \`blogID\` int(11) UNSIGNED DEFAULT NULL,
      \`customerID\` int(11) UNSIGNED DEFAULT NULL,
      \`comment\` text DEFAULT NULL,
      \`createdBy\` varchar(255) DEFAULT NULL,
      \`createdOn\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`modifiedOn\` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      \`isDeleted\` tinyint(1) DEFAULT 0,
      \`deletedOn\` datetime DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ALTER TABLE \`blog_comments\` ADD KEY \`blog_id\` (\`blogID\`), ADD KEY \`customer_id\` (\`customerID\`);
  `,
  cart: `
    CREATE TABLE IF NOT EXISTS \`cart\` (
      \`id\` int(11) UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,
      \`customerID\` int(11) UNSIGNED DEFAULT NULL,
      \`productID\` int(11) UNSIGNED DEFAULT NULL,
      \`quantity\` int(11) UNSIGNED NOT NULL DEFAULT 1,
      \`createdBy\` varchar(255) DEFAULT NULL,
      \`createdOn\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`modifiedOn\` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      \`isDeleted\` tinyint(1) DEFAULT 0,
      \`deletedOn\` datetime DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ALTER TABLE \`cart\` ADD KEY \`customer_id\` (\`customerID\`), ADD KEY \`product_id\` (\`productID\`);
  `,
  categories: `
    CREATE TABLE IF NOT EXISTS \`categories\` (
      \`id\` int(11) UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,
      \`name\` varchar(100) NOT NULL,
      \`description\` text DEFAULT NULL,
      \`parent_id\` int(11) UNSIGNED DEFAULT NULL,
      \`image_url\` text DEFAULT NULL,
      \`createdBy\` varchar(255) DEFAULT NULL,
      \`createdOn\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`modifiedOn\` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      \`isDeleted\` tinyint(1) DEFAULT 0,
      \`deletedOn\` datetime DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `,
  contents: `
    CREATE TABLE IF NOT EXISTS \`contents\` (
      \`id\` int(11) UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,
      \`title\` varchar(50) NOT NULL,
      \`contents\` longtext NOT NULL,
      \`createdBy\` varchar(255) DEFAULT NULL,
      \`createdOn\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`modifiedOn\` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      \`isDeleted\` tinyint(1) DEFAULT 0,
      \`deletedOn\` datetime DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    INSERT INTO \`contents\` (\`title\`, \`contents\`, \`createdBy\`, \`createdOn\`, \`modifiedOn\`, \`deletedOn\`) VALUES
    ('Privacy Policy', '', NULL, CURRENT_TIMESTAMP, NULL, NULL),
    ('Terms and Conditions', '', NULL, CURRENT_TIMESTAMP, NULL, NULL),
    ('Cancellation Policy', '', NULL, CURRENT_TIMESTAMP, NULL, NULL),
    ('Return Policy', '', NULL, CURRENT_TIMESTAMP, NULL, NULL);
  `,
  customer: `
    CREATE TABLE IF NOT EXISTS \`customer\` (
      \`id\` int(11) UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,
      \`fname\` varchar(50) DEFAULT NULL,
      \`lname\` varchar(50) DEFAULT NULL,
      \`contact\` varchar(15) DEFAULT NULL,
      \`email\` varchar(50) DEFAULT NULL,
      \`password\` varchar(50) DEFAULT NULL,
      \`status\` bit(1) NOT NULL DEFAULT b'0',
      \`googleOauthId\` varchar(255) DEFAULT NULL,
      \`isGoogleLogin\` bit(1) NOT NULL DEFAULT b'0',
      \`createdBy\` varchar(255) DEFAULT NULL,
      \`createdOn\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`modifiedOn\` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      \`isDeleted\` tinyint(1) DEFAULT 0,
      \`deletedOn\` datetime DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=latin1;
    ALTER TABLE \`customer\` ADD UNIQUE KEY \`email\` (\`email\`), ADD UNIQUE KEY \`contact\` (\`contact\`);
  `,
  faq: `
    CREATE TABLE IF NOT EXISTS \`faq\` (
      \`id\` int(11) UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,
      \`question\` text NOT NULL,
      \`answer\` text NOT NULL,
      \`createdBy\` varchar(255) DEFAULT NULL,
      \`createdOn\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`modifiedOn\` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      \`isDeleted\` tinyint(1) DEFAULT 0,
      \`deletedOn\` datetime DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `,
  home_slider: `
    CREATE TABLE IF NOT EXISTS \`home_slider\` (
      \`id\` int(11) UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,
      \`alignment\` tinyint(1) UNSIGNED NOT NULL DEFAULT 1 COMMENT '{"1":"Left","2":"Center","3":"Right"}',
      \`image\` text DEFAULT NULL,
      \`title\` varchar(25) DEFAULT NULL,
      \`subTitle\` varchar(50) DEFAULT NULL,
      \`link\` varchar(199) DEFAULT NULL,
      \`createdBy\` varchar(255) DEFAULT NULL,
      \`createdOn\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`modifiedOn\` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      \`isDeleted\` tinyint(1) DEFAULT 0,
      \`deletedOn\` datetime DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `,
  image_category: `
    CREATE TABLE IF NOT EXISTS \`image_category\` (
      \`id\` int(11) UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,
      \`name\` varchar(100) NOT NULL,
      \`image\` varchar(100) NOT NULL,
      \`createdBy\` varchar(255) DEFAULT NULL,
      \`createdOn\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`modifiedOn\` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      \`isDeleted\` tinyint(1) DEFAULT 0,
      \`deletedOn\` datetime DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `,
  images: `
    CREATE TABLE IF NOT EXISTS \`images\` (
      \`id\` int(11) UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,
      \`image\` varchar(100) NOT NULL,
      \`category\` int(11) UNSIGNED NOT NULL,
      \`date\` datetime NOT NULL,
      \`createdBy\` varchar(255) DEFAULT NULL,
      \`createdOn\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`modifiedOn\` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      \`isDeleted\` tinyint(1) DEFAULT 0,
      \`deletedOn\` datetime DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `,
  login_activity: `
    CREATE TABLE IF NOT EXISTS \`login_activity\` (
      \`id\` int(11) UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,
      \`loginRole\` int(11) UNSIGNED DEFAULT NULL,
      \`loginID\` int(11) UNSIGNED DEFAULT NULL,
      \`IPAddress\` varchar(150) DEFAULT NULL,
      \`browser\` varchar(30) DEFAULT NULL,
      \`os\` varchar(30) DEFAULT NULL,
      \`datetime\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`logoutTime\` datetime DEFAULT NULL,
      \`remarks\` varchar(80) NOT NULL,
      \`createdBy\` varchar(255) DEFAULT NULL,
      \`createdOn\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`modifiedOn\` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      \`isDeleted\` tinyint(1) DEFAULT 0,
      \`deletedOn\` datetime DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `,
  orders: `
    CREATE TABLE IF NOT EXISTS \`orders\` (
      \`id\` int(11) UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,
      \`customer_id\` int(11) UNSIGNED DEFAULT NULL,
      \`customer_name\` varchar(255) NOT NULL,
      \`customer_email\` varchar(255) DEFAULT NULL,
      \`customer_phone\` varchar(50) DEFAULT NULL,
      \`shipping_address\` text DEFAULT NULL,
      \`total_amount\` decimal(10,2) NOT NULL DEFAULT 0.00,
      \`payment_method\` varchar(50) DEFAULT 'COD',
      \`status\` varchar(50) DEFAULT 'Pending',
      \`createdBy\` varchar(255) DEFAULT NULL,
      \`createdOn\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`modifiedOn\` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      \`isDeleted\` tinyint(1) DEFAULT 0,
      \`deletedOn\` datetime DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ALTER TABLE \`orders\` ADD KEY \`idx_customer_id\` (\`customer_id\`);
  `,
  order_items: `
    CREATE TABLE IF NOT EXISTS \`order_items\` (
      \`id\` int(11) UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,
      \`order_id\` int(11) UNSIGNED NOT NULL,
      \`product_id\` int(11) UNSIGNED NOT NULL,
      \`quantity\` int(11) UNSIGNED NOT NULL DEFAULT 1,
      \`unit_price\` decimal(10,2) NOT NULL DEFAULT 0.00,
      \`createdBy\` varchar(255) DEFAULT NULL,
      \`createdOn\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`modifiedOn\` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      \`isDeleted\` tinyint(1) DEFAULT 0,
      \`deletedOn\` datetime DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ALTER TABLE \`order_items\` ADD KEY \`orders_id\` (\`order_id\`), ADD KEY \`product_id\` (\`product_id\`);
  `,
  product: `
    CREATE TABLE IF NOT EXISTS \`product\` (
      \`id\` int(11) UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,
      \`name\` varchar(100) NOT NULL,
      \`parent\` int(11) UNSIGNED DEFAULT NULL,
      \`slug\` varchar(199) NOT NULL,
      \`metaTitle\` text DEFAULT NULL,
      \`metaDescription\` text DEFAULT NULL,
      \`metaKeywords\` text DEFAULT NULL,
      \`categoryID\` int(11) UNSIGNED DEFAULT NULL,
      \`categoryLevel\` varchar(50) DEFAULT NULL,
      \`price\` decimal(10,2) NOT NULL DEFAULT 0.00,
      \`photo\` text DEFAULT NULL,
      \`description\` text DEFAULT NULL,
      \`createdBy\` varchar(255) DEFAULT NULL,
      \`createdOn\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`modifiedOn\` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      \`isDeleted\` tinyint(1) DEFAULT 0,
      \`deletedOn\` datetime DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ALTER TABLE \`product\` ADD UNIQUE KEY \`slug\` (\`slug\`) USING BTREE, ADD KEY \`subcategory_id\` (\`categoryLevel\`), ADD KEY \`category_id\` (\`categoryID\`);
  `,
  product_category: `
    CREATE TABLE IF NOT EXISTS \`product_category\` (
      \`id\` int(11) UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,
      \`categoryName\` varchar(20) DEFAULT NULL,
      \`slug\` varchar(30) DEFAULT NULL,
      \`CGSTPercent\` decimal(4,2) DEFAULT NULL,
      \`SGSTPercent\` decimal(4,2) DEFAULT NULL,
      \`HSNCode\` varchar(10) DEFAULT NULL,
      \`parentID\` int(11) UNSIGNED DEFAULT NULL,
      \`level\` tinyint(1) NOT NULL COMMENT '{"1":"Level 1", "2":"Level 2", "3":"Level 3"}',
      \`isActive\` bit(1) NOT NULL DEFAULT b'0' COMMENT '{"0":"Inactive","1":"Active"}',
      \`createdBy\` int(11) UNSIGNED DEFAULT NULL,
      \`createdOn\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`modifiedOn\` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      \`isDeleted\` tinyint(1) DEFAULT 0,
      \`deletedOn\` datetime DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=latin1;
    ALTER TABLE \`product_category\` ADD UNIQUE KEY \`slug\` (\`slug\`) USING BTREE, ADD UNIQUE KEY \`categoryName\` (\`categoryName\`);
  `,
  product_images: `
    CREATE TABLE IF NOT EXISTS \`product_images\` (
      \`id\` int(11) UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,
      \`productID\` int(11) UNSIGNED NOT NULL,
      \`videoURL\` text DEFAULT NULL,
      \`imageURL\` text NOT NULL,
      \`width\` bigint(10) NOT NULL,
      \`height\` bigint(10) NOT NULL,
      \`createdBy\` int(11) UNSIGNED DEFAULT NULL,
      \`createdOn\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`modifiedOn\` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      \`isDeleted\` tinyint(1) DEFAULT 0,
      \`deletedOn\` datetime DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `,
  product_reviews: `
    CREATE TABLE IF NOT EXISTS \`product_reviews\` (
      \`id\` int(11) UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,
      \`productID\` int(11) UNSIGNED NOT NULL,
      \`videoURL\` text DEFAULT NULL,
      \`imageURL\` text NOT NULL,
      \`width\` bigint(10) NOT NULL,
      \`height\` bigint(10) NOT NULL,
      \`createdBy\` int(11) UNSIGNED DEFAULT NULL,
      \`createdOn\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`modifiedOn\` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      \`isDeleted\` tinyint(1) DEFAULT 0,
      \`deletedOn\` datetime DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `,
  query_logger: `
    CREATE TABLE IF NOT EXISTS \`query_logger\` (
      \`id\` int(11) UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,
      \`query\` text NOT NULL,
      \`link\` varchar(200) NOT NULL,
      \`accountID\` varchar(20) NOT NULL,
      \`createdBy\` int(11) UNSIGNED DEFAULT NULL,
      \`createdOn\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `,
  users: `
    CREATE TABLE IF NOT EXISTS \`users\` (
      \`id\` int(11) UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,
      \`fname\` varchar(50) DEFAULT NULL,
      \`lname\` varchar(50) DEFAULT NULL,
      \`contact\` varchar(15) DEFAULT NULL,
      \`email\` varchar(50) DEFAULT NULL,
      \`password\` varchar(50) DEFAULT NULL,
      \`status\` bit(1) NOT NULL DEFAULT b'0',
      \`googleOauthId\` varchar(255) DEFAULT NULL,
      \`isGoogleLogin\` bit(1) NOT NULL DEFAULT b'0',
      \`createdBy\` int(11) UNSIGNED DEFAULT NULL,
      \`createdOn\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`modifiedOn\` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      \`isDeleted\` tinyint(1) DEFAULT 0,
      \`deletedOn\` datetime DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=latin1;
    ALTER TABLE \`users\` ADD UNIQUE KEY \`email\` (\`email\`), ADD UNIQUE KEY \`contact\` (\`contact\`);
  `,
  video_category: `
    CREATE TABLE IF NOT EXISTS \`video_category\` (
      \`id\` int(11) UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,
      \`category\` varchar(100) NOT NULL,
      \`createdBy\` int(11) UNSIGNED DEFAULT NULL,
      \`createdOn\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`modifiedOn\` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      \`isDeleted\` tinyint(1) DEFAULT 0,
      \`deletedOn\` datetime DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `,
  videos: `
    CREATE TABLE IF NOT EXISTS \`videos\` (
      \`id\` int(11) UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,
      \`title\` varchar(200) NOT NULL,
      \`videos\` varchar(100) NOT NULL,
      \`category\` int(11) UNSIGNED NOT NULL,
      \`date\` datetime NOT NULL,
      \`createdBy\` int(11) UNSIGNED DEFAULT NULL,
      \`createdOn\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`modifiedOn\` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      \`deletedOn\` datetime DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `,
  wishlist: `
    CREATE TABLE IF NOT EXISTS \`wishlist\` (
      \`id\` int(11) UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,
      \`customer_id\` int(11) UNSIGNED NOT NULL,
      \`product_id\` int(11) UNSIGNED NOT NULL,
      \`size\` varchar(5) DEFAULT NULL,
      \`createdBy\` int(11) UNSIGNED DEFAULT NULL,
      \`createdOn\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`modifiedOn\` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      \`deletedOn\` datetime DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ALTER TABLE \`wishlist\` ADD KEY \`customer_id\` (\`customer_id\`), ADD KEY \`product_id\` (\`product_id\`);
  `
};

const removeStaleDatabase = async (dbNameToRemove) => {
  let connection;
  try {
    connection = await mysql.createConnection({
      ...getDbConfig(),
      database: getMetaDbName(),
    });
    const [users] = await connection.execute("SELECT username, created_databases FROM user_cred");
    for (const u of users) {
      if (u.created_databases) {
        const dbs = u.created_databases.split(",").map(n => n.trim()).filter(Boolean);
        const cleanDbNameToRemove = dbNameToRemove.startsWith("mongodb:") ? dbNameToRemove.replace("mongodb:", "") : dbNameToRemove;
        const updatedDbs = dbs.filter(n => {
          const cleanN = n.startsWith("mongodb:") ? n.replace("mongodb:", "") : n;
          return cleanN !== cleanDbNameToRemove;
        });
        if (dbs.length !== updatedDbs.length) {
          await connection.execute(
            "UPDATE user_cred SET created_databases = ? WHERE username = ?",
            [updatedDbs.join(",") || null, u.username]
          );
        }
      }
    }
  } catch (err) {
    console.error("Failed to remove stale database:", err);
  } finally {
    if (connection) {
      try { await connection.end(); } catch (e) { }
    }
  }
};

export const listDatabases = async (req, res) => {
  let metaConnection, adminConnection;
  try {
    const username = req.query.username || req.headers["x-user-name"] || "admin";
    const dbToOwnerMap = {};
    const dbNamesSet = new Set();
    const systemDbs = ["admin", "information_schema", "performance_schema", "sys", "mysql"];

    adminConnection = await mysql.createConnection(getDbConfig());

    // 1. Discover all live databases from MySQL instance
    const [allDbs] = await adminConnection.query("SHOW DATABASES");
    for (const dbObj of allDbs) {
      const liveDbName = Object.values(dbObj)[0];
      if (liveDbName && !systemDbs.includes(liveDbName.toLowerCase())) {
        dbNamesSet.add(liveDbName);
        dbToOwnerMap[liveDbName] = username;
      }
    }

    // 2. Query meta database (user_cred and hertz_projects) for owners and additional tracking
    try {
      metaConnection = await mysql.createConnection({
        ...getDbConfig(),
        database: getMetaDbName(),
      });

      // Tracked databases from user_cred
      const [userRows] = await metaConnection.execute(
        "SELECT role, created_databases FROM user_cred WHERE username = ? LIMIT 1",
        [username]
      );

      if (userRows.length > 0) {
        const userRole = userRows[0].role;
        if (userRole === "admin") {
          const [allUsers] = await metaConnection.execute(
            "SELECT username, created_databases FROM user_cred"
          );
          for (const row of allUsers) {
            if (row.created_databases) {
              const names = row.created_databases.split(",").map(n => n.trim()).filter(Boolean);
              for (const name of names) {
                if (!systemDbs.includes(name.toLowerCase())) {
                  dbToOwnerMap[name] = row.username;
                  dbNamesSet.add(name);
                }
              }
            }
          }
        }
      }

      // Tracked active databases from hertz_projects
      const [projRows] = await metaConnection.execute(
        "SELECT databaseName, owner FROM `hertz_projects` WHERE `isDeleted` = 0"
      );
      for (const p of projRows) {
        if (p.databaseName && !systemDbs.includes(p.databaseName.toLowerCase())) {
          dbNamesSet.add(p.databaseName);
          if (p.owner) {
            dbToOwnerMap[p.databaseName] = p.owner;
          }
        }
      }
    } catch (e) {
      console.warn("[listDatabases] Meta DB discovery notice:", e.message);
    } finally {
      if (metaConnection) {
        try { await metaConnection.end(); } catch (e) { }
      }
    }

    // 3. Build final databases list with live table counts
    const databasesList = [];
    for (const dbName of dbNamesSet) {
      if (systemDbs.includes(dbName.toLowerCase())) continue;

      let tablesCount = 0;
      try {
        const [tables] = await adminConnection.query(`SHOW TABLES FROM \`${dbName}\``);
        tablesCount = tables.length;
      } catch (err) {
        // Even if physical database is not created yet or empty, keep it listed with 0 tables
        tablesCount = 0;
      }

      databasesList.push({
        id: "sql_" + dbName,
        name: dbName,
        displayName: dbName,
        type: "sql",
        createdDate: "Local DB",
        tablesCount: tablesCount,
        owner: dbToOwnerMap[dbName] || username,
      });
    }

    await adminConnection.end();
    return res.json({ success: true, databases: databasesList });
  } catch (err) {
    if (metaConnection) { try { await metaConnection.end(); } catch (e) { } }
    if (adminConnection) { try { await adminConnection.end(); } catch (e) { } }
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

    if (dbType === "mongodb") {
      return res.status(400).json({ success: false, error: "MongoDB database creation is disabled. SQL only." });
    }

    const trimmedName = dbName.trim().toLowerCase();
    const validPattern = /^[a-z0-9_]+$/;
    if (!validPattern.test(trimmedName)) {
      return res.status(400).json({
        success: false,
        error: "Invalid database name format. Use only lowercase letters, numbers, and underscores.",
      });
    }

    const finalDbTrackingName = trimmedName;

    // Check if there is a soft-deleted database with the same name in the Recycle Bin
    let metaCheckConn;
    try {
      metaCheckConn = await mysql.createConnection({
        ...getDbConfig(),
        database: getMetaDbName(),
      });
      // Auto-create recycled_items if not exists
      await metaCheckConn.execute(`
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

      const [recycledRows] = await metaCheckConn.execute(
        "SELECT id FROM recycled_items WHERE item_type = 'database' AND item_name = ? LIMIT 1",
        [finalDbTrackingName]
      );

      if (recycledRows.length > 0) {
        const recycledId = recycledRows[0].id;
        // 1. Physically drop the old database to allow clean recreation
        let dropMySQLConn;
        try {
          dropMySQLConn = await mysql.createConnection(getDbConfig());
          await dropMySQLConn.execute(`DROP DATABASE IF EXISTS \`${trimmedName}\``);
        } catch (e) {
          console.warn("Failed to drop stale MySQL database during recreation", e);
        } finally {
          if (dropMySQLConn) {
            try { await dropMySQLConn.end(); } catch (e) { }
          }
        }

        // 2. Remove the row from recycled_items
        await metaCheckConn.execute("DELETE FROM recycled_items WHERE id = ?", [recycledId]);
      }
    } catch (e) {
      console.error("Failed to query/clean recycle bin during db creation", e);
    } finally {
      if (metaCheckConn) {
        try { await metaCheckConn.end(); } catch (e) { }
      }
    }

    connection = await mysql.createConnection(getDbConfig());
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${trimmedName}\``);
    await connection.query(`USE \`${trimmedName}\``);

    if (Array.isArray(tables) && tables.length > 0) {
      for (const colName of tables) {
        const schemaQuery = TABLE_SCHEMAS[colName];
        if (schemaQuery) {
          const queries = schemaQuery.split(";").map(q => q.trim()).filter(q => q.length > 0);
          for (const q of queries) {
            await connection.query(q);
          }
        }
      }
    }
    await connection.end();
    connection = null;

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
      try { await connection.end(); } catch (e) { }
    }
    if (userConn) {
      try { await userConn.end(); } catch (e) { }
    }
    console.error("Create Database Error:", err);
    return res.status(500).json({ success: false, error: "Failed to create database: " + err.message });
  }
};

export const deleteDatabase = async (req, res) => {
  let userConn;
  try {
    const { dbName, username } = req.body;

    if (!dbName) {
      return res.status(400).json({ success: false, error: "Database name is required." });
    }

    if (dbName.startsWith("mongodb:")) {
      // Just drop the entry from user registry for legacy cleanups
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
    }

    const trimmedName = dbName.trim().toLowerCase();
    const validPattern = /^[a-z0-9_]+$/;
    if (!validPattern.test(trimmedName)) {
      return res.status(400).json({ success: false, error: "Invalid database name." });
    }

    // Soft delete: Insert into recycled_items in the meta database
    if (username) {
      userConn = await mysql.createConnection({
        ...getDbConfig(),
        database: getMetaDbName(),
      });

      // Auto-create recycled_items if not exists
      await userConn.execute(`
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

      // 1. Record database in recycled_items
      await userConn.execute(
        "INSERT INTO recycled_items (item_type, item_name, original_owner, metadata) VALUES (?, ?, ?, ?)",
        ["database", dbName, username, JSON.stringify({ isMongo: false })]
      );

      // 2. Mark project database as deleted in hertz_projects
      try {
        await userConn.execute(
          "UPDATE `hertz_projects` SET `isDeleted` = 1, `deletedAt` = ? WHERE `databaseName` = ? OR `name` = ?",
          [Date.now(), dbName, dbName]
        );
      } catch (e) {
        console.warn("[deleteDatabase] hertz_projects update notice:", e.message);
      }

      // 3. Remove database from the user's active tracking list in user_cred
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
    if (userConn) {
      try { await userConn.end(); } catch (e) { }
    }
    console.error("Delete Database Error:", err);
    return res.status(500).json({ success: false, error: "Failed to delete database: " + err.message });
  }
};
