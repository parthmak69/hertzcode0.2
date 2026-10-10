import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const dbHost = process.env.DB_HOST === 'localhost' ? '127.0.0.1' : (process.env.DB_HOST || '127.0.0.1');
const dbUser = process.env.DB_USER || 'root';
const dbPassword = process.env.DB_PASSWORD || '';
const primaryDbName = process.env.DB_NAME || 'admin';
const systemDbs = ['admin', 'information_schema', 'performance_schema', 'sys', 'mysql'];

// Cache of dynamic connection pools by database name
const poolsMap = new Map();

export const getDbPool = (dbName = primaryDbName) => {
  const target = dbName || primaryDbName;
  if (!poolsMap.has(target)) {
    const pool = mysql.createPool({
      host: dbHost,
      user: dbUser,
      password: dbPassword,
      database: target,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    poolsMap.set(target, pool);
  }
  return poolsMap.get(target);
};

// Discover active non-system user databases from MySQL instance
export const discoverUserDatabases = async () => {
  const dbsSet = new Set(['ecommerce_db']);
  try {
    const defaultPool = getDbPool(primaryDbName);
    const [rows] = await defaultPool.query('SHOW DATABASES');
    rows.forEach(r => {
      const val = Object.values(r)[0];
      if (val && !systemDbs.includes(val.toLowerCase())) {
        dbsSet.add(val);
      }
    });
  } catch (e) {
    console.warn('[discoverUserDatabases warning]:', e.message);
  }
  return Array.from(dbsSet);
};

export const dbQuery = async (sql, params = [], executingUserId = 0, actionName = 'Query', targetDbName = null) => {
  // If explicit target database specified, query that pool directly
  if (targetDbName) {
    const pool = getDbPool(targetDbName);
    const [rows] = await pool.query(sql, params);
    return rows;
  }

  // System/meta tables belong strictly to the primary metadata database (admin)
  const isMetaTableQuery = /hertz_projects|user_cred|recycled_items/i.test(sql);
  if (isMetaTableQuery) {
    const primaryPool = getDbPool(primaryDbName);
    const [rows] = await primaryPool.query(sql, params);
    return rows;
  }

  const userDbs = await discoverUserDatabases();

  // For SELECT / READ queries: check active user project databases first
  if (sql.trim().toUpperCase().startsWith('SELECT')) {
    for (const dbName of userDbs) {
      try {
        const userPool = getDbPool(dbName);
        const [userRows] = await userPool.query(sql, params);
        if (Array.isArray(userRows) && userRows.length > 0) {
          return userRows;
        }
      } catch (e) {
        console.warn(`[dbQuery SELECT warning on ${dbName}]:`, e.message);
      }
    }
  } else {
    // For WRITE / CUD queries (INSERT, UPDATE, DELETE, CREATE): execute on active user project databases first
    for (const dbName of userDbs) {
      try {
        const userPool = getDbPool(dbName);
        const [result] = await userPool.query(sql, params);
        return result;
      } catch (e) {
        console.warn(`[dbQuery CUD warning on ${dbName}]:`, e.message);
      }
    }
  }

  // Fallback to Primary Pool (admin) if no user database matched
  const primaryPool = getDbPool(primaryDbName);
  try {
    const [rows] = await primaryPool.query(sql, params);
    return rows;
  } catch (primaryErr) {
    console.error(`[DB Query Error - ${actionName}]:`, primaryErr.message);
    throw primaryErr;
  }
};

export default getDbPool(primaryDbName);
