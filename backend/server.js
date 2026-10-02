import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import fs from "fs";
import { pathToFileURL } from "url";
import mysql from "mysql2/promise";

import authRoutes from "./routes/authRoutes.js";
import databaseRoutes from "./routes/databaseRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import crudRoutes from "./routes/crudRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import adminsRoutes from "./routes/admin/adminsRoutes.js";
import uploadParser from "./middleware/uploadMiddleware.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded image and file assets
app.use('/uploads', express.static(path.resolve('./public/uploads')));
app.use('/public/uploads', express.static(path.resolve('./public/uploads')));
app.use(express.static(path.resolve('./public')));

// Decode dbName parameter middleware
app.use((req, res, next) => {
  if (req.query && req.query.dbName) {
    req.query.dbName = decodeURIComponent(req.query.dbName);
  }
  if (req.body && req.body.dbName) {
    req.body.dbName = decodeURIComponent(req.body.dbName);
  }
  next();
});

// Robust binary multipart parser middleware for FormData & image uploads
app.use((req, res, next) => {
  if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
    const contentType = req.headers['content-type'];
    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    const boundary = boundaryMatch ? (boundaryMatch[1] || boundaryMatch[2]) : null;

    let chunks = [];
    req.on('data', chunk => { chunks.push(chunk); });
    req.on('end', () => {
      try {
        const buffer = Buffer.concat(chunks);
        const bodyObj = { ...(req.body || {}) };
        if (boundary) {
          const boundaryBuf = Buffer.from('--' + boundary);
          let startPos = 0;
          
          while (startPos < buffer.length) {
            const nextBoundaryPos = buffer.indexOf(boundaryBuf, startPos);
            if (nextBoundaryPos === -1) break;
            
            const partBuf = buffer.slice(startPos, nextBoundaryPos);
            startPos = nextBoundaryPos + boundaryBuf.length;
            
            const headerEndDelimiter = Buffer.from([13, 10, 13, 10]);
            const headerEndIndex = partBuf.indexOf(headerEndDelimiter);
            if (headerEndIndex !== -1) {
              const headerText = partBuf.slice(0, headerEndIndex).toString('utf8');
              let contentBuf = partBuf.slice(headerEndIndex + 4);
              
              if (contentBuf.length >= 2 && contentBuf[contentBuf.length - 2] === 13 && contentBuf[contentBuf.length - 1] === 10) {
                contentBuf = contentBuf.slice(0, contentBuf.length - 2);
              }
              
              const nameMatch = headerText.match(/name="([^"]+)"/i);
              const filenameMatch = headerText.match(/filename="([^"]+)"/i);
              
              if (nameMatch) {
                const fieldName = nameMatch[1];
                if (filenameMatch && filenameMatch[1] && contentBuf.length > 0) {
                  const rawFilename = path.basename(filenameMatch[1]);
                  const uploadsDir = path.resolve('./public/uploads');
                  if (!fs.existsSync(uploadsDir)) {
                    fs.mkdirSync(uploadsDir, { recursive: true });
                  }
                  const safeName = `${Date.now()}_${rawFilename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
                  const savePath = path.join(uploadsDir, safeName);
                  fs.writeFileSync(savePath, contentBuf);
                  
                  const fileUrl = `/uploads/${safeName}`;
                  bodyObj[fieldName] = fileUrl;
                  if (fieldName === 'primary_image_file' || fieldName.includes('image') || fieldName.includes('photo') || fieldName.includes('avatar') || fieldName.includes('file')) {
                    bodyObj['image_url'] = fileUrl;
                    bodyObj['photo'] = fileUrl;
                    bodyObj['profile_image'] = fileUrl;
                    bodyObj['image'] = fileUrl;
                  }
                } else if (!filenameMatch) {
                  bodyObj[fieldName] = contentBuf.toString('utf8').trim();
                }
              }
            }
          }
        }
        req.body = bodyObj;
      } catch (e) {
        console.error('[Multipart Parse Error]', e);
      }
      next();
    });
  } else {
    next();
  }
});

// Testing fake-data generator endpoint used by Admin templates
app.get(['/testing/fake-data', '/api/testing/fake-data'], (req, res) => {
  const type = req.query.type || 'category';
  const fakeCategories = [
    { name: 'Electronics & Smart Devices', description: 'Latest smartphones, laptops, smartwatches, and consumer electronics.', image_url: 'https://images.unsplash.com/photo-1498049860654-af1a5c566876?auto=format&fit=crop&w=600&q=80' },
    { name: 'Modern Home & Kitchen', description: 'Furniture, decor, kitchen tools, and smart home appliances.', image_url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=600&q=80' },
    { name: 'Fashion & Urban Wear', description: 'Trending men and women clothing, footwear, and fashion accessories.', image_url: 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=600&q=80' }
  ];
  const randomCat = fakeCategories[Math.floor(Math.random() * fakeCategories.length)];
  res.json({ success: true, data: type === 'category' ? randomCat : randomCat });
});

// Storage quota status endpoint used by Admin templates
app.get(['/admin/storage/status', '/api/admin/storage/status', '/api/storage/status'], (req, res) => {
  res.json({ success: true, data: { usedMb: 15, totalMb: 1000 } });
});

// Standalone Upload Endpoint for image & file uploads
app.post(['/admin/upload', '/api/admin/upload', '/api/upload', '/upload', '/api/apiAdmin/upload'], uploadParser, (req, res) => {
  const fileUrl = req.uploadedUrl || req.fileUrl || req.body?.image_url || req.body?.photo || req.body?.file || req.body?.url || (req.files && req.files.length > 0 ? req.files[0].savedUrl : '') || '';
  res.json({
    success: true,
    message: 'File uploaded successfully',
    url: fileUrl,
    fileUrl: fileUrl,
    path: fileUrl,
    data: { url: fileUrl, path: fileUrl }
  });
});

// Core Builder API Routes
app.use(["/api/auth", "/auth", "/api/auth/admin", "/auth/admin"], authRoutes);
app.use("/api/database", databaseRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/crud", crudRoutes);

// Admin Profile & User Management Routes
app.use(["/admin/admins", "/api/admin/admins", "/api/admins"], adminsRoutes);
app.use(["/admin/admin", "/api/admin/admin", "/api/admin"], adminRoutes);

// Helper to get MySQL Connection for Dynamic Table CRUD (supports dynamic DB discovery)
const getDynamicDbConnection = async (reqOrDbName) => {
  let targetDb = typeof reqOrDbName === 'string'
    ? reqOrDbName
    : (reqOrDbName?.query?.dbName || reqOrDbName?.headers?.['x-db-name'] || reqOrDbName?.headers?.['db-name'] || reqOrDbName?.body?.dbName);

  const dbConfig = {
    host: process.env.DB_HOST === 'localhost' ? '127.0.0.1' : (process.env.DB_HOST || '127.0.0.1'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    connectTimeout: 5000
  };

  if (targetDb) {
    try {
      return await mysql.createConnection({ ...dbConfig, database: targetDb });
    } catch (err) {}
  }

  const systemDbs = ['admin', 'information_schema', 'performance_schema', 'sys', 'mysql'];
  let candidateDbs = [];
  try {
    const rootConn = await mysql.createConnection(dbConfig);
    const [dbs] = await rootConn.query('SHOW DATABASES');
    await rootConn.end();
    candidateDbs = dbs
      .map(d => Object.values(d)[0])
      .filter(name => name && !systemDbs.includes(name.toLowerCase()));
  } catch (e) {}

  const rawTable = typeof reqOrDbName === 'object' ? reqOrDbName?.params?.tableName : null;

  for (const dbName of candidateDbs) {
    try {
      const conn = await mysql.createConnection({ ...dbConfig, database: dbName });
      if (rawTable) {
        const [tables] = await conn.query('SHOW TABLES');
        const singularRaw = rawTable.toLowerCase().endsWith('s') ? rawTable.toLowerCase().slice(0, -1) : rawTable.toLowerCase();
        const pluralRaw = rawTable.toLowerCase().endsWith('s') ? rawTable.toLowerCase() : rawTable.toLowerCase() + 's';
        if (tableNames.some(t => {
          const lowerT = t.toLowerCase();
          return lowerT === rawTable.toLowerCase() || lowerT === singularRaw || lowerT === pluralRaw;
        })) {
          return conn;
        }
        await conn.end();
      } else {
        return conn;
      }
    } catch (e) {}
  }

  return await mysql.createConnection({ ...dbConfig, database: process.env.DB_NAME || 'admin' });
};

async function autoHealInsert(db, tableName, initialData, userContext = null) {
  const data = { ...initialData };
  delete data.id;

  let colNames = [];
  try {
    const [desc] = await db.query(`DESCRIBE \`${tableName}\``);
    colNames = desc.map(c => c.Field);
  } catch (e) {}

  const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const activeUser = userContext?.id || userContext?.username || userContext?.email || 1;

  colNames.forEach(col => {
    const lower = col.toLowerCase();
    if (lower === 'createdon' || lower === 'created_on' || lower === 'createdat' || lower === 'created_at') {
      if (!data[col] || data[col] === 'null' || data[col] === 'undefined') data[col] = nowStr;
    }
    if (lower === 'modifiedon' || lower === 'modified_on' || lower === 'updatedon' || lower === 'updated_on' || lower === 'updatedat' || lower === 'updated_at') {
      if (!data[col] || data[col] === 'null' || data[col] === 'undefined') data[col] = nowStr;
    }
    if (lower === 'createdby' || lower === 'created_by') {
      if (!data[col] || data[col] === 'null' || data[col] === 'undefined') data[col] = activeUser;
    }
    if (lower === 'modifiedby' || lower === 'modified_by' || lower === 'updatedby' || lower === 'updated_by') {
      if (!data[col] || data[col] === 'null' || data[col] === 'undefined') data[col] = activeUser;
    }
  });

  if (data.name && colNames.some(c => c.toLowerCase() === 'slug')) {
    const slugCol = colNames.find(c => c.toLowerCase() === 'slug');
    if (!data[slugCol]) {
      data[slugCol] = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now();
    }
  }

  for (const k of Object.keys(data)) {
    if (data[k] === null || data[k] === undefined || data[k] === 'null' || data[k] === 'undefined') {
      delete data[k];
    }
  }

  let attempts = 0;
  while (attempts < 5) {
    attempts++;
    try {
      const keys = Object.keys(data);
      if (keys.length === 0) {
        const [result] = await db.query(`INSERT INTO \`${tableName}\` () VALUES ()`);
        return { result, data };
      }
      const fields = keys.map(k => `\`${k}\``).join(', ');
      const placeholders = keys.map(() => '?').join(', ');
      const values = Object.values(data);
      const [result] = await db.query(`INSERT INTO \`${tableName}\` (${fields}) VALUES (${placeholders})`, values);
      return { result, data };
    } catch (dbErr) {
      const isNullOrDefaultErr = dbErr.code === 'ER_NO_DEFAULT_FOR_FIELD' ||
        dbErr.code === 'ER_BAD_NULL_ERROR' ||
        dbErr.errno === 1364 ||
        dbErr.errno === 1048 ||
        (dbErr.message && (dbErr.message.includes('cannot be null') || dbErr.message.includes("doesn't have a default value")));

      if (isNullOrDefaultErr) {
        const colMatch = dbErr.message ? dbErr.message.match(/Field '([^']+)'|Column '([^']+)'/i) : null;
        const badCol = colMatch ? (colMatch[1] || colMatch[2]) : null;
        
        if (badCol) {
          delete data[badCol];
          let alterSql = `ALTER TABLE \`${tableName}\` MODIFY COLUMN \`${badCol}\` VARCHAR(255) NULL DEFAULT NULL`;
          if (badCol.toLowerCase().includes('date') || badCol.toLowerCase().includes('time') || badCol.toLowerCase().includes('created') || badCol.toLowerCase().includes('updated') || badCol.toLowerCase().includes('modified')) {
            alterSql = `ALTER TABLE \`${tableName}\` MODIFY COLUMN \`${badCol}\` DATETIME NULL DEFAULT CURRENT_TIMESTAMP`;
          }
          try {
            await db.query(alterSql);
          } catch (alterErr) {
            console.warn(`[Auto-Heal Alter Warning] ${alterErr.message}`);
          }
          continue;
        }
      }
      throw dbErr;
    }
  }
  throw new Error('Auto-heal insert failed after maximum retries');
}

// Dynamic MVC Routes Autoloader
export async function loadMvcRoutes() {
  const targets = ['.', 'admin', 'customer'];
  const ignoredSystemFiles = ['crudRoutes.js', 'authRoutes.js', 'aiRoutes.js', 'databaseRoutes.js'];
  
  for (const target of targets) {
    const targetDir = target === '.' ? path.resolve('./routes') : path.resolve('./routes/' + target);
    if (fs.existsSync(targetDir)) {
      const files = fs.readdirSync(targetDir);
      for (const file of files) {
        if (file.endsWith('Routes.js') && !ignoredSystemFiles.includes(file)) {
          const tableName = file.replace('Routes.js', '');
          const routePath = path.join(targetDir, file);
          const fileUrl = pathToFileURL(routePath).href;
          
          try {
            const imported = await import(fileUrl + '?t=' + Date.now());
            const router = imported.default || imported;
            if (!router) continue;

            const apiPrefix = target === 'admin' ? 'apiAdmin' : 'apiCustomer';
            const singularName = tableName.endsWith('s') ? tableName.slice(0, -1) : tableName;
            const pluralName = tableName.endsWith('s') ? tableName : tableName + 's';
            const aliases = new Set([tableName, singularName, pluralName]);

            const lowerTable = tableName.toLowerCase();
            if (lowerTable.includes('cat') || lowerTable.includes('categor') || lowerTable.includes('cateoger')) {
              aliases.add('category');
              aliases.add('categories');
              aliases.add('cateogerie');
              aliases.add('cateogeries');
              aliases.add('product_category');
              aliases.add('product_categories');
              aliases.add('product_categorys');
            }
            if (lowerTable.includes('product')) {
              aliases.add('product');
              aliases.add('products');
            }
            if (lowerTable.includes('portfolio')) {
              aliases.add('portfolio');
              aliases.add('portfolios');
              aliases.add('portfolio-categories');
              aliases.add('portfolio_categories');
            }
            if (lowerTable.includes('admin')) {
              aliases.add('admin');
              aliases.add('admins');
              aliases.add('user');
              aliases.add('users');
            }
            if (lowerTable.includes('master') || lowerTable.includes('form')) {
              aliases.add('master-form');
              aliases.add('master_form');
              aliases.add('masterform');
              aliases.add('forms');
            }

            aliases.forEach(name => {
              app.use('/api/' + apiPrefix + '/' + name, router);
              app.use('/api/admin/' + name, router);
              app.use('/admin/' + name, router);
              app.use('/api/' + name, router);
            });
            console.log('[MVC ROUTE] Registered ' + file + ' (aliases: ' + Array.from(aliases).join(', ') + ')');
          } catch (err) {
            console.error('[MVC ROUTE ERROR] Failed to load ' + file + ':', err.message);
          }
        }
      }
    }
  }
}
global.loadMvcRoutes = loadMvcRoutes;

  // Register Fallback Dynamic Router for any MySQL Table (product, products, etc.)
  const registerFallbackRouter = () => {
    app.all(['/api/apiAdmin/:tableName*', '/api/apiCustomer/:tableName*', '/api/admin/:tableName*', '/admin/:tableName*', '/api/:tableName*'], async (req, res, next) => {
      if (res.headersSent) return;
      const rawTable = req.params.tableName;
      const excludedNames = ['upload', 'auth', 'testing', 'storage', 'database', 'crud', 'ai', 'admin', 'admins', 'category', 'categories', 'product', 'products', 'portfolio', 'portfolios', 'order', 'orders', 'user', 'users', 'master-form', 'forms'];
      if (!rawTable || excludedNames.includes(rawTable.toLowerCase())) {
        return next();
      }
      
      try {
        const connection = await getDynamicDbConnection(req);

        let matchedTable = rawTable;
        try {
          const [dbTables] = await connection.query("SHOW TABLES");
          const existingTableNames = dbTables.map(t => Object.values(t)[0]);
          const found = existingTableNames.find(t => 
            t.toLowerCase() === rawTable.toLowerCase() ||
            t.toLowerCase() === (rawTable + 's').toLowerCase() ||
            (rawTable.toLowerCase().endsWith('s') && t.toLowerCase() === rawTable.toLowerCase().slice(0, -1))
          );
          if (found) matchedTable = found;
        } catch (e) {}

        const method = req.method.toUpperCase();
        const pathParts = req.path.split('/').filter(Boolean);
        const possibleId = pathParts[pathParts.length - 1];
        const isChangePassword = req.path.includes('change-password') || req.path.includes('change_password') || possibleId === 'change-password' || possibleId === 'change_password';

        if (isChangePassword && (method === 'PUT' || method === 'POST')) {
          const { currentPassword, newPassword } = req.body || {};
          if (!currentPassword || !newPassword) {
            await connection.end();
            return res.status(400).json({ success: false, message: 'Current password and new password are required.' });
          }
          if (newPassword.length < 6) {
            await connection.end();
            return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
          }

          let [admins] = await connection.query("SELECT * FROM \`" + matchedTable + "\` WHERE (isDeleted = 0 OR isDeleted IS NULL) ORDER BY id ASC LIMIT 1").catch(() => [[]]);
          if (!admins || admins.length === 0) {
            [admins] = await connection.query("SELECT * FROM \`" + matchedTable + "\` LIMIT 1").catch(() => [[]]);
          }
          if (!admins || admins.length === 0) {
            await connection.end();
            return res.status(404).json({ success: false, message: 'Admin record not found.' });
          }

          const admin = admins[0];
          const crypto = await import('crypto');
          const md5Current = crypto.default.createHash('md5').update(currentPassword).digest('hex');
          const isValid = (admin.password === currentPassword || admin.password === md5Current || !admin.password);
          if (!isValid) {
            await connection.end();
            return res.status(400).json({ success: false, message: 'Current password does not match.' });
          }

          const md5New = crypto.default.createHash('md5').update(newPassword).digest('hex');
          await connection.query("UPDATE \`" + matchedTable + "\` SET password = ? WHERE id = ?", [md5New, admin.id]);
          await connection.end();
          return res.json({ success: true, message: 'Password changed successfully.' });
        }

        const isIdNum = !isNaN(possibleId) ? parseInt(possibleId) : null;
        const targetId = isIdNum || req.body?.id || req.query?.id;

        if (method === 'GET') {
          if (targetId && !isChangePassword) {
            const [rows] = await connection.query(`SELECT * FROM \`${matchedTable}\` WHERE id = ? LIMIT 1`, [targetId]);
            await connection.end();
            if (rows.length === 0) return res.status(404).json({ success: false, message: 'Record not found' });
            return res.json({ success: true, data: rows[0] });
          } else {
            const [rows] = await connection.query(`SELECT * FROM \`${matchedTable}\` ORDER BY id DESC`);
            await connection.end();
            return res.json({ success: true, data: rows });
          }
        } else if (method === 'POST') {
          const data = { ...(req.body || {}) };
          const { result, data: insertedData } = await autoHealInsert(connection, matchedTable, data, req.user);
          await connection.end();
          return res.status(201).json({ success: true, data: { id: result.insertId, ...insertedData } });
        } else if (method === 'PUT' || method === 'PATCH') {
          if (!targetId || isChangePassword) {
            await connection.end();
            return res.status(400).json({ success: false, message: 'Missing record ID for update' });
          }
          const data = { ...(req.body || {}) };
          delete data.id;

          let colNames = [];
          try {
            const [desc] = await connection.query(`DESCRIBE \`${matchedTable}\``);
            colNames = desc.map(c => c.Field);
          } catch (e) {}

          const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
          const activeUser = req.user?.id || req.user?.username || req.user?.email || 1;

          colNames.forEach(col => {
            const lower = col.toLowerCase();
            if (lower === 'modifiedon' || lower === 'modified_on' || lower === 'updatedon' || lower === 'updated_on' || lower === 'updatedat' || lower === 'updated_at') {
              data[col] = nowStr;
            }
            if (lower === 'modifiedby' || lower === 'modified_by' || lower === 'updatedby' || lower === 'updated_by') {
              data[col] = activeUser;
            }
          });
          const keys = Object.keys(data);
          if (keys.length > 0) {
            const setClause = keys.map(k => `\`${k}\` = ?`).join(', ');
            const values = [...Object.values(data), targetId];
            await connection.query(`UPDATE \`${matchedTable}\` SET ${setClause} WHERE id = ?`, values);
          }
          await connection.end();
          return res.json({ success: true, message: 'Record updated successfully' });
        } else if (method === 'DELETE') {
          if (!targetId) {
            await connection.end();
            return res.status(400).json({ success: false, message: 'Missing record ID for deletion' });
          }
          await connection.query(`DELETE FROM \`${matchedTable}\` WHERE id = ?`, [targetId]);
          await connection.end();
          return res.json({ success: true, message: 'Record deleted successfully' });
        }
        await connection.end();
        return next();
      } catch (err) {
        console.error('[Dynamic CRUD Route Error]', err);
        return res.status(500).json({ success: false, message: err.message });
      }
    });
  };


app.get("/", async (req, res) => {
  res.send("Hertzcode Express MVC Server is running");
});

async function startServer() {
  await loadMvcRoutes();
  registerFallbackRouter();
  app.listen(PORT, () => {
    console.log(`Hertzcode backend server running at http://localhost:${PORT}`);
  });
}

startServer();
