import mysql from "mysql2/promise";

// Helper to get raw database credentials from env
const getDbConfig = () => ({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
});

export const login = async (req, res) => {
  let connection;
  try {
    const { username, pass_hash } = req.body;

    if (!username || !pass_hash) {
      return res.status(400).json({ success: false, error: "Username and password are required." });
    }

    // 1. Establish connection to MySQL host without specifying database first
    connection = await mysql.createConnection(getDbConfig());

    // Auto-create database if it doesn't exist
    const dbName = process.env.DB_NAME || "admin";
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await connection.query(`USE \`${dbName}\``);

    // Auto-create user_cred table if it doesn't exist
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS \`user_cred\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`username\` VARCHAR(100) NOT NULL UNIQUE,
        \`pass_hash\` VARCHAR(255) NOT NULL,
        \`name\` VARCHAR(100) DEFAULT '',
        \`role\` VARCHAR(50) DEFAULT 'user',
        \`created_databases\` TEXT,
        \`modified_on\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Ensure role column exists (for existing tables)
    try {
      await connection.execute("ALTER TABLE `user_cred` ADD COLUMN `role` VARCHAR(50) DEFAULT 'user'");
    } catch (e) {
      // Column already exists, ignore error
    }

    // Auto-create recycled_items table if it doesn't exist
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

    // If table is empty, insert default admin user
    const [userRows] = await connection.query("SELECT COUNT(*) as count FROM user_cred");
    if (userRows[0].count === 0) {
      // Default: admin / admin123
      await connection.execute(
        "INSERT INTO user_cred (username, pass_hash, name, role) VALUES (?, ?, ?, ?)",
        ["admin", "admin123", "Administrator", "admin"]
      );
    } else {
      // Ensure 'admin' user is set to 'admin' role
      await connection.execute(
        "UPDATE user_cred SET role = 'admin' WHERE username = 'admin'"
      );
    }

    // 2. Query the database for the user
    const [rows] = await connection.execute(
      "SELECT * FROM user_cred WHERE username = ? LIMIT 1",
      [username]
    );

    // If user is not found, return 401 (Auto-registration is removed)
    if (rows.length === 0) {
      await connection.end();
      return res.status(401).json({ success: false, error: "Invalid username or password" });
    }

    await connection.end();

    const user = rows[0];
    if (user.pass_hash === pass_hash) {
      return res.json({ success: true, username, name: user.name || "", role: user.role || "user" });
    }

    return res.status(401).json({ success: false, error: "Invalid username or password" });
  } catch (err) {
    if (connection) {
      try { await connection.end(); } catch (e) {}
    }
    console.error("Login Error:", err);
    return res.status(500).json({
      success: false,
      error: "Database connection failed: " + err.message,
    });
  }
};

export const forgotPassword = async (req, res) => {
  let connection;
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ success: false, error: "Email and new password are required." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: "Password must be at least 6 characters." });
    }

    const dbName = process.env.DB_NAME || "admin";
    connection = await mysql.createConnection({
      ...getDbConfig(),
      database: dbName,
    });

    // Check if email exists
    const [rows] = await connection.execute(
      "SELECT * FROM user_cred WHERE username = ? LIMIT 1",
      [email]
    );

    if (rows.length === 0) {
      await connection.end();
      return res.status(404).json({ success: false, error: "No account found with this email." });
    }

    // Update password
    await connection.execute(
      "UPDATE user_cred SET pass_hash = ? WHERE username = ?",
      [newPassword, email]
    );

    await connection.end();
    return res.json({ success: true });
  } catch (err) {
    if (connection) {
      try { await connection.end(); } catch (e) {}
    }
    console.error("Forgot Password Error:", err);
    return res.status(500).json({ success: false, error: "Database error: " + err.message });
  }
};

export const listUsers = async (req, res) => {
  let connection;
  try {
    const { requester } = req.query;
    if (!requester) {
      return res.status(400).json({ success: false, error: "Requester username is required." });
    }

    const dbName = process.env.DB_NAME || "admin";
    connection = await mysql.createConnection({
      ...getDbConfig(),
      database: dbName,
    });

    // Check requester role
    const [reqRows] = await connection.execute(
      "SELECT role FROM user_cred WHERE username = ? LIMIT 1",
      [requester]
    );
    if (reqRows.length === 0 || reqRows[0].role !== "admin") {
      await connection.end();
      return res.status(403).json({ success: false, error: "Access denied. Admin role required." });
    }

    const [rows] = await connection.execute(
      "SELECT id, username, name, role, modified_on FROM user_cred ORDER BY id ASC"
    );
    await connection.end();
    return res.json({ success: true, users: rows });
  } catch (err) {
    if (connection) {
      try { await connection.end(); } catch (e) {}
    }
    console.error("List Users Error:", err);
    return res.status(500).json({ success: false, error: "Database error: " + err.message });
  }
};

export const createUser = async (req, res) => {
  let connection;
  try {
    const { username, pass_hash, name, role, requester } = req.body;
    if (!requester) {
      return res.status(400).json({ success: false, error: "Requester username is required." });
    }
    if (!username || !pass_hash) {
      return res.status(400).json({ success: false, error: "Username and password are required." });
    }

    const dbName = process.env.DB_NAME || "admin";
    connection = await mysql.createConnection({
      ...getDbConfig(),
      database: dbName,
    });

    // Check requester role
    const [reqRows] = await connection.execute(
      "SELECT role FROM user_cred WHERE username = ? LIMIT 1",
      [requester]
    );
    if (reqRows.length === 0 || reqRows[0].role !== "admin") {
      await connection.end();
      return res.status(403).json({ success: false, error: "Access denied. Admin role required." });
    }

    // Check if user already exists
    const [existing] = await connection.execute(
      "SELECT id FROM user_cred WHERE username = ? LIMIT 1",
      [username]
    );
    if (existing.length > 0) {
      await connection.end();
      return res.status(400).json({ success: false, error: "Username already exists." });
    }

    await connection.execute(
      "INSERT INTO user_cred (username, pass_hash, name, role) VALUES (?, ?, ?, ?)",
      [username, pass_hash, name || username.split("@")[0], role || "user"]
    );
    await connection.end();
    return res.json({ success: true });
  } catch (err) {
    if (connection) {
      try { await connection.end(); } catch (e) {}
    }
    console.error("Create User Error:", err);
    return res.status(500).json({ success: false, error: "Database error: " + err.message });
  }
};
