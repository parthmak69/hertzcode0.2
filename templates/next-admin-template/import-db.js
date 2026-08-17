const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// Parse .env manually
const envPath = path.join(__dirname, '.env');
let env = {};
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      env[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
  });
}

async function run() {
  try {
    const connection = await mysql.createConnection({
      host: env.DB_HOST || '127.0.0.1',
      port: parseInt(env.DB_PORT || '3306'),
      user: env.DB_USER || 'root',
      password: env.DB_PASSWORD || '',
      database: env.DB_NAME || 'test',
      multipleStatements: true
    });
    
    console.log('Reading test.sql...');
    const sqlPath = path.join(__dirname, 'test.sql');
    if (!fs.existsSync(sqlPath)) {
      throw new Error('test.sql not found!');
    }
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Importing test.sql into database:', env.DB_NAME);
    await connection.query(sql);
    console.log('\n✅ Import successful! All tables and default admin user created.');
    
    const [rows] = await connection.execute('SHOW TABLES');
    console.log('Current tables in database:', rows.map(r => Object.values(r)[0]));
    
    await connection.end();
  } catch (err) {
    console.error('\n❌ Import failed!');
    console.error(err.message);
  }
}
run();
