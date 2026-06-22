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
        \`created_databases\` TEXT,
        \`modified_on\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // If table is empty, insert default admin user
    const [userRows] = await connection.query("SELECT COUNT(*) as count FROM user_cred");
    if (userRows[0].count === 0) {
      // Default: admin / admin123
      await connection.execute(
        "INSERT INTO user_cred (username, pass_hash, name) VALUES (?, ?, ?)",
        ["admin", "admin123", "Administrator"]
      );

      // Auto-register current logging-in user if they are not 'admin'
      if (username !== "admin") {
        await connection.execute(
          "INSERT INTO user_cred (username, pass_hash, name) VALUES (?, ?, ?)",
          [username, pass_hash, username.split("@")[0]]
        );
      }
    }

    // 2. Query the database for the user
    const [rows] = await connection.execute(
      "SELECT * FROM user_cred WHERE username = ? LIMIT 1",
      [username]
    );

    // If user is not found but database is not empty, we auto-register them
    if (rows.length === 0) {
      await connection.execute(
        "INSERT INTO user_cred (username, pass_hash, name) VALUES (?, ?, ?)",
        [username, pass_hash, username.split("@")[0]]
      );
      
      await connection.end();
      return res.json({ success: true, username, name: username.split("@")[0] });
    }

    await connection.end();

    const user = rows[0];
    if (user.pass_hash === pass_hash) {
      return res.json({ success: true, username, name: user.name || "" });
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
