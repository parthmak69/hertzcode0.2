import express from 'express';
import mysql from 'mysql2/promise';
import uploadParser from '../middleware/uploadMiddleware.js';

const router = express.Router();

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
        if (tableNames.includes('categories') || tableNames.includes('category') || tableNames.includes('product_category')) {
          return uConn;
        }
        await uConn.end();
      } catch(e) {}
    }
  } catch(e) {}
  return await mysql.createConnection({ ...dbConfig, database: process.env.DB_NAME || 'admin' });
};

const findCategoryTable = async (db) => {
  try {
    const [tables] = await db.query("SHOW TABLES");
    const names = tables.map(t => Object.values(t)[0]);
    const match = names.find(n => {
      const lower = n.toLowerCase();
      return lower === 'categories' || lower === 'category' || lower === 'product_category';
    });
    if (match) return match;
    
    // Auto-create categories table if not found
    await db.query(`
      CREATE TABLE IF NOT EXISTS \`categories\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(255) NOT NULL,
        \`slug\` VARCHAR(255) DEFAULT NULL,
        \`description\` TEXT DEFAULT NULL,
        \`parent_id\` INT DEFAULT NULL,
        \`image_url\` VARCHAR(500) DEFAULT NULL,
        \`photo\` VARCHAR(500) DEFAULT NULL,
        \`createdBy\` VARCHAR(255) DEFAULT NULL,
        \`createdOn\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`modifiedOn\` DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
        \`isDeleted\` TINYINT(1) DEFAULT 0,
        \`deletedOn\` DATETIME DEFAULT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    return 'categories';
  } catch {
    return 'categories';
  }
};

const ensureSeedCategories = async (db, tableName, userContext = null) => {
  try {
    // Ensure table has all necessary columns
    try {
      const colDefs = [
        'ADD COLUMN `description` TEXT NULL',
        'ADD COLUMN `parent_id` INT NULL',
        'ADD COLUMN `image_url` VARCHAR(500) NULL',
        'ADD COLUMN `photo` VARCHAR(500) NULL',
        'ADD COLUMN `slug` VARCHAR(255) NULL',
        'ADD COLUMN `isDeleted` TINYINT(1) DEFAULT 0',
        'ADD COLUMN `deletedOn` DATETIME NULL'
      ];
      for (const cd of colDefs) {
        await db.query(`ALTER TABLE \`${tableName}\` ${cd}`).catch(() => {});
      }
    } catch (e) {}

    const seedCategories = [
      { name: 'Electronics & Smart Devices', slug: 'electronics-smart-devices', description: 'Latest smartphones, laptops, smartwatches, and consumer electronics.', image_url: 'https://images.unsplash.com/photo-1498049860654-af1a5c566876?auto=format&fit=crop&w=600&q=80', photo: 'https://images.unsplash.com/photo-1498049860654-af1a5c566876?auto=format&fit=crop&w=600&q=80', parent_id: null },
      { name: 'Modern Home & Kitchen', slug: 'modern-home-kitchen', description: 'Furniture, decor, kitchen tools, and smart home appliances.', image_url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=600&q=80', photo: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=600&q=80', parent_id: null },
      { name: 'Fashion & Urban Wear', slug: 'fashion-urban-wear', description: 'Trending men and women clothing, footwear, and fashion accessories.', image_url: 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=600&q=80', photo: 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=600&q=80', parent_id: null }
    ];

    for (let i = 0; i < seedCategories.length; i++) {
      const item = { ...seedCategories[i] };
      item.slug = item.slug + '-' + (Date.now() + i);
      try {
        await autoHealInsert(db, tableName, item, userContext);
      } catch (err) {
        console.warn(`[Seed category insert warning for ${item.name}]:`, err.message);
      }
    }
  } catch (err) {
    console.warn('[ensureSeedCategories Error]:', err.message);
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

  if (data.name && colNames.some(c => c.toLowerCase() === 'slug')) {
    const slugCol = colNames.find(c => c.toLowerCase() === 'slug');
    if (!data[slugCol]) {
      data[slugCol] = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now();
    }
  }

  if (colNames && colNames.length > 0) {
    const validColMap = new Map(colNames.map(c => [c.toLowerCase(), c]));
    const cleanData = {};
    for (const [k, v] of Object.entries(data)) {
      const matchCol = validColMap.get(k.toLowerCase());
      if (matchCol && v !== null && v !== undefined && v !== 'null' && v !== 'undefined') {
        cleanData[matchCol] = v;
      }
    }
    const incomingImg = data.image_url || data.photo || data.image;
    if (incomingImg) {
      if (!cleanData.image_url && validColMap.has('image_url')) cleanData[validColMap.get('image_url')] = incomingImg;
      if (!cleanData.photo && validColMap.has('photo')) cleanData[validColMap.get('photo')] = incomingImg;
    }
    for (const k of Object.keys(data)) {
      delete data[k];
    }
    Object.assign(data, cleanData);
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
          if (badCol.toLowerCase() === 'slug') {
            data[badCol] = (data.name || 'category').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now();
          } else {
            delete data[badCol];
          }
          let alterSql = `ALTER TABLE \`${tableName}\` MODIFY COLUMN \`${badCol}\` VARCHAR(255) NULL DEFAULT NULL`;
          try {
            await db.query(alterSql);
          } catch (alterErr) {
            console.warn(`[Category Alter Warning] ${alterErr.message}`);
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
    const tableName = await findCategoryTable(db);
    
    let hasDeletedOn = false;
    try {
      const [cols] = await db.query(`SHOW COLUMNS FROM \`${tableName}\``);
      hasDeletedOn = (cols || []).some(c => (c.Field || '').toLowerCase() === 'deletedon');
    } catch(e) {}
    const softDelClause = hasDeletedOn ? "(`deletedOn` IS NULL OR `deletedOn` = '') AND " : "";

    let [rows] = await db.query(
      `SELECT * FROM \`${tableName}\` WHERE ${softDelClause}(\`isDeleted\` = 0 OR \`isDeleted\` IS NULL) AND \`name\` IS NOT NULL AND \`name\` != '' ORDER BY id ASC`
    ).catch(() => [[]]);

    if (!rows || rows.length === 0) {
      await ensureSeedCategories(db, tableName, req.user);
      const [newRows] = await db.query(
        `SELECT * FROM \`${tableName}\` WHERE ${softDelClause}(\`isDeleted\` = 0 OR \`isDeleted\` IS NULL) AND \`name\` IS NOT NULL AND \`name\` != '' ORDER BY id ASC`
      ).catch(() => [[]]);
      rows = newRows || [];
    }

    // If query has parentId and it is not 'all', filter by parentId
    const parentIdParam = req.query.parentId || req.query.parent_id;
    if (parentIdParam && parentIdParam !== 'all') {
      if (parentIdParam === 'null' || parentIdParam === 'root') {
        rows = rows.filter(r => !r.parent_id && !r.parentId);
      } else {
        const pidNum = parseInt(parentIdParam);
        rows = rows.filter(r => (r.parent_id === pidNum || r.parentId === pidNum));
      }
    }

    await db.end();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const handleGetOne = async (req, res) => {
  try {
    const db = await getDb(req);
    const tableName = await findCategoryTable(db);
    const [rows] = await db.query(`SELECT * FROM \`${tableName}\` WHERE id = ? LIMIT 1`, [req.params.id]);
    await db.end();
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const handleCreate = async (req, res) => {
  try {
    const db = await getDb(req);
    const tableName = await findCategoryTable(db);
    const data = { ...(req.body || {}) };

    const imgUrl = req.uploadedUrl || req.fileUrl || (req.file && (req.file.path || req.file.savedUrl)) || (req.files && req.files.length > 0 ? req.files[0].savedUrl : '') || data.primary_image_url || data.image_url || data.photo || data.image;
    if (imgUrl) {
      data.image_url = imgUrl;
      data.photo = imgUrl;
    }

    // Normalize parentId
    const rawPid = data.parentId !== undefined ? data.parentId : data.parent_id;
    if (rawPid === 'null' || rawPid === '' || rawPid === null || rawPid === undefined) {
      data.parent_id = null;
    } else {
      data.parent_id = parseInt(rawPid);
    }
    delete data.parentId;
    delete data.primaryImageAction;

    if (data.name && !data.slug) {
      data.slug = data.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now();
    }

    const { result, data: insertedData } = await autoHealInsert(db, tableName, data, req.user);
    await db.end();
    return res.status(201).json({ success: true, data: { id: result.insertId, ...insertedData } });
  } catch (err) {
    console.error('[categoryRoutes handleCreate Error]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const handleUpdate = async (req, res) => {
  try {
    const db = await getDb(req);
    const tableName = await findCategoryTable(db);
    const id = req.params.id || req.query.id || req.body.id;
    const data = { ...(req.body || {}) };
    delete data.id;

    if (data.primaryImageAction === 'remove') {
      data.image_url = '';
      data.photo = '';
    } else {
      const imgUrl = req.uploadedUrl || req.fileUrl || (req.file && (req.file.path || req.file.savedUrl)) || (req.files && req.files.length > 0 ? req.files[0].savedUrl : '') || data.primary_image_url || data.image_url || data.photo || data.image;
      if (imgUrl) {
        data.image_url = imgUrl;
        data.photo = imgUrl;
      }
    }

    const rawPid = data.parentId !== undefined ? data.parentId : data.parent_id;
    if (rawPid === 'null' || rawPid === '' || rawPid === null) {
      data.parent_id = null;
    } else if (rawPid !== undefined) {
      data.parent_id = parseInt(rawPid);
    }
    delete data.parentId;
    delete data.primaryImageAction;

    let colNames = [];
    try {
      const [desc] = await db.query(`DESCRIBE \`${tableName}\``);
      colNames = desc.map(c => c.Field);
    } catch (e) {}

    let finalData = data;
    if (colNames.length > 0) {
      const validColMap = new Map(colNames.map(c => [c.toLowerCase(), c]));
      const cleanData = {};
      for (const [k, v] of Object.entries(data)) {
        const matchCol = validColMap.get(k.toLowerCase());
        if (matchCol && v !== undefined && v !== 'undefined') {
          cleanData[matchCol] = (v === 'null') ? null : v;
        }
      }
      finalData = cleanData;
    }

    const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
    if (colNames.some(c => c.toLowerCase() === 'modifiedon')) finalData.modifiedOn = nowStr;

    const keys = Object.keys(finalData);
    if (keys.length > 0) {
      const setClause = keys.map(k => `\`${k}\` = ?`).join(', ');
      const values = [...Object.values(finalData), id];
      await db.query(`UPDATE \`${tableName}\` SET ${setClause} WHERE id = ?`, values);
    }
    await db.end();
    res.json({ success: true, message: 'Category updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const handleDelete = async (req, res) => {
  try {
    const db = await getDb(req);
    const tableName = await findCategoryTable(db);
    const id = req.params?.id || req.query?.id || req.body?.id;
    try {
      await db.query(`UPDATE \`${tableName}\` SET \`isDeleted\` = 1, \`deletedOn\` = CURRENT_TIMESTAMP WHERE id = ?`, [id]);
    } catch(e) {
      await db.query(`DELETE FROM \`${tableName}\` WHERE id = ?`, [id]);
    }
    await db.end();
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const handleSeedDemo = async (req, res) => {
  try {
    const db = await getDb(req);
    const tableName = await findCategoryTable(db);
    await ensureSeedCategories(db, tableName, req.user);
    const [rows] = await db.query(
      `SELECT * FROM \`${tableName}\` WHERE (\`deletedOn\` IS NULL OR \`deletedOn\` = '') AND (\`isDeleted\` = 0 OR \`isDeleted\` IS NULL) AND \`name\` IS NOT NULL AND \`name\` != '' ORDER BY id ASC`
    ).catch(() => [[]]);
    await db.end();
    res.json({ success: true, message: 'Demo faker categories loaded successfully', data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const seedPaths = ['/seed', '/seed-demo', '/fake-data', '/demo-data'];
const routePaths = ['/', '/category', '/categories', '/cateogerie', '/cateogeries', '/admin/category', '/admin/categories', '/api/admin/category', '/api/admin/categories'];
const routeDetailPaths = ['/:id', '/category/:id', '/categories/:id', '/cateogerie/:id', '/cateogeries/:id', '/admin/category/:id', '/admin/categories/:id', '/api/admin/category/:id', '/api/admin/categories/:id'];

router.get(seedPaths, handleSeedDemo);
router.post(seedPaths, handleSeedDemo);
router.get(routePaths, handleGetList);
router.get(routeDetailPaths, handleGetOne);
router.post(routePaths, uploadParser, handleCreate);
router.put([...routePaths, ...routeDetailPaths], uploadParser, handleUpdate);
router.patch([...routePaths, ...routeDetailPaths], uploadParser, handleUpdate);
router.delete([...routePaths, ...routeDetailPaths], handleDelete);

export default router;
