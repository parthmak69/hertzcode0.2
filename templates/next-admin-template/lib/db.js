import mysql from 'mysql2/promise'

// Initialize MySQL/MariaDB Connection Pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'test',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
})

/**
 * Executes a database query and automatically logs the execution to the `query_logger` table.
 * 
 * @param {string} sql - The raw SQL query string
 * @param {Array} params - Array of parameter bindings for prepared statement safety
 * @param {number} userID - The ID of the authenticated admin executing the action (defaults to 0)
 * @param {string} note - An optional operation note (e.g., 'Edit Product', 'Delete Admin')
 * @returns {Promise<any>} The query results (rows / metadata)
 */
export async function dbQuery(sql, params = [], userID = 0, note = null) {
    const [rows] = await pool.execute(sql, params)
    
    // Prevent logging the logging query itself to avoid infinite recursive loops
    const cleanSql = sql.trim().toLowerCase()
    if (!cleanSql.startsWith('insert into `query_logger`') && !cleanSql.startsWith('insert into query_logger')) {
        try {
            const loggedQueryText = sql + (params.length ? ` | Bindings: ${JSON.stringify(params)}` : '')
            await pool.execute(
                'INSERT INTO `query_logger` (`userID`, `query`, `note`) VALUES (?, ?, ?)',
                [userID || 0, loggedQueryText, note || 'API DB Operation']
            )
        } catch (logErr) {
            console.error('[DB Logger Error] Failed to write query log:', logErr)
        }
    }
    
    return rows
}
