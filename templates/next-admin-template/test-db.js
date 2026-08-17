const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// Parse .env manually
const envPath = path.join(__dirname, '.env');
console.log('Reading .env from:', envPath);

let env = {};
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      env[key] = val;
    }
  });
} else {
  console.log('.env file not found!');
}

console.log('Database settings:', {
  host: env.DB_HOST || '127.0.0.1',
  port: env.DB_PORT || '3306',
  user: env.DB_USER || 'root',
  password: env.DB_PASSWORD ? '***' : '(empty)',
  database: env.DB_NAME || 'test'
});

async function run() {
  try {
    const connection = await mysql.createConnection({
      host: env.DB_HOST || '127.0.0.1',
      port: parseInt(env.DB_PORT || '3306'),
      user: env.DB_USER || 'root',
      password: env.DB_PASSWORD || '',
      database: env.DB_NAME || 'test'
    });
    console.log('\n✅ Successfully connected to the MySQL database!');
    const [rows] = await connection.execute('SHOW TABLES');
    console.log('Tables found in database:', rows.map(r => Object.values(r)[0]));
    await connection.end();
  } catch (err) {
    console.error('\n❌ Database connection failed!');
    console.error('Error Code:', err.code);
    console.error('Error Message:', err.message);
  }
}

run();
