import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ecommerce_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export const dbQuery = async (sql, params = [], executingUserId = 0, actionName = 'Query') => {
  try {
    const [rows] = await pool.query(sql, params);
    return rows;
  } catch (err) {
    console.error(`[DB Query Error - ${actionName}]:`, err.message);
    throw err;
  }
};

export default pool;
