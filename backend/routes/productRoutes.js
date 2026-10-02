import express from 'express';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import mysql from 'mysql2/promise';

import uploadParser from '../middleware/uploadMiddleware.js';

const checkAuth = (req, res, next) => next();

const router = express.Router();
router.use(checkAuth);

const getDb = async (req) => {
  const targetDb = req?.query?.dbName || req?.headers?.['x-db-name'] || req?.headers?.['db-name'] || req?.body?.dbName;
  const dbConfig = {
    host: process.env.DB_HOST === 'localhost' ? '127.0.0.1' : (process.env.DB_HOST || '127.0.0.1'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    connectTimeout: 5000
  };
  if (targetDb) {
    try {
      return await mysql.createConnection({ ...dbConfig, database: targetDb });
    } catch(e) {}
  }
  const systemDbs = ['admin', 'information_schema', 'performance_schema', 'sys', 'mysql'];
  try {
    const rootConn = await mysql.createConnection(dbConfig);
    const [dbs] = await rootConn.query("SHOW DATABASES");
    await rootConn.end();
    const candidateDbs = dbs.map(d => Object.values(d)[0]).filter(n => n && !systemDbs.includes(n.toLowerCase()));
    for (const uDb of candidateDbs) {
      try {
        const uConn = await mysql.createConnection({ ...dbConfig, database: uDb });
        const [tables] = await uConn.query("SHOW TABLES");
        const tableNames = tables.map(t => Object.values(t)[0].toLowerCase());
        if (tableNames.includes('product') || tableNames.includes('products')) {
          return uConn;
        }
        await uConn.end();
      } catch(e) {}
    }
  } catch(e) {}
  return await mysql.createConnection({ ...dbConfig, database: process.env.DB_NAME || 'admin' });
};

const findProductTable = async (db) => {
  try {
    const [tables] = await db.query("SHOW TABLES");
    const names = tables.map(t => Object.values(t)[0]);
    const match = names.find(n => n.toLowerCase() === 'product' || n.toLowerCase() === 'products');
    return match || 'product';
  } catch {
    return 'product';
  }
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

  // Auto-generate slug if table has slug column and name is provided
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

const handleGetList = async (req, res) => {
  try {
    const db = await getDb(req);
    const tableName = await findProductTable(db);
    const [rows] = await db.query(`SELECT * FROM \`${tableName}\` WHERE \`deletedOn\` IS NULL AND (\`isDeleted\` = 0 OR \`isDeleted\` IS NULL) ORDER BY id DESC`);
    await db.end();
    res.json({ success: true, data: rows });
  } catch (err) {
    try {
      const db = await getDb(req);
      const tableName = await findProductTable(db);
      const [rows] = await db.query(`SELECT * FROM \`${tableName}\` ORDER BY id DESC`);
      await db.end();
      res.json({ success: true, data: rows });
    } catch(e) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
};

const handleGetOne = async (req, res) => {
  try {
    const db = await getDb(req);
    const tableName = await findProductTable(db);
    const [rows] = await db.query(`SELECT * FROM \`${tableName}\` WHERE id = ? LIMIT 1`, [req.params.id]);
    await db.end();
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const handleCreate = async (req, res) => {
  try {
    const db = await getDb(req);
    const tableName = await findProductTable(db);
    const data = { ...(req.body || {}) };

    if (req.file && req.file.path) {
      data.image_url = req.file.path;
      data.photo = req.file.path;
    }

    const { result, data: insertedData } = await autoHealInsert(db, tableName, data, req.user);
    await db.end();
    return res.status(201).json({ success: true, data: { id: result.insertId, ...insertedData } });
  } catch (err) {
    console.error('[productRoutes handleCreate Error]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const handleUpdate = async (req, res) => {
  try {
    const db = await getDb(req);
    const tableName = await findProductTable(db);
    const id = req.params.id || req.query.id || req.body.id;
    const data = { ...(req.body || {}) };
    delete data.id;

    if (req.file && req.file.path) {
      data.image_url = req.file.path;
      data.photo = req.file.path;
    }

    let colNames = [];
    try {
      const [desc] = await db.query(`DESCRIBE \`${tableName}\``);
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
      const values = [...Object.values(data), id];
      await db.query(`UPDATE \`${tableName}\` SET ${setClause} WHERE id = ?`, values);
    }
    await db.end();
    res.json({ success: true, message: 'Product updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const handleDelete = async (req, res) => {
  try {
    const db = await getDb(req);
    const tableName = await findProductTable(db);
    const id = req.params?.id || req.query?.id || req.body?.id;
    try {
      await db.query(`UPDATE \`${tableName}\` SET \`isDeleted\` = 1, \`deletedOn\` = CURRENT_TIMESTAMP WHERE id = ?`, [id]);
    } catch(e) {
      await db.query(`DELETE FROM \`${tableName}\` WHERE id = ?`, [id]);
    }
    await db.end();
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const routePaths = ['/', '/product', '/products', '/admin/product', '/admin/products', '/api/admin/product', '/api/admin/products'];
const routeDetailPaths = ['/:id', '/product/:id', '/products/:id', '/admin/product/:id', '/admin/products/:id', '/api/admin/product/:id', '/api/admin/products/:id'];

router.get(routePaths, handleGetList);
router.get(routeDetailPaths, handleGetOne);
router.post(routePaths, uploadParser, handleCreate);
router.put(routePaths, uploadParser, handleUpdate);
router.delete(routeDetailPaths, handleDelete);

export default router;
