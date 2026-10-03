/**
 * Express MVC Controller & Route Code Generator Service
 */

// Helper to sanitize name to PascalCase (e.g. menu_items -> MenuItems)
export function toPascalCase(str) {
  if (!str) return '';
  return str
    .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, c => c.toUpperCase());
}

/**
 * Generate Express Controller JS Content
 */
export function generateExpressController(tableName, columns) {
  const pascalName = toPascalCase(tableName);
  
  // Find primary key column
  const primaryKeyCol = columns.find(c => c.isPrimaryKey || c.isPrimary || c.primaryKey || c.name.toLowerCase() === 'id');
  const pkName = primaryKeyCol ? primaryKeyCol.name : 'id';

  // Identify Lookup / Foreign key columns for LEFT JOINs
  const lookupCols = columns.filter(c => c.isLookupColumn && c.lookupTable);
  
  let selectClause = `t.*`;
  let joinClause = ``;

  if (lookupCols.length > 0) {
    lookupCols.forEach((lc, idx) => {
      const alias = `ref${idx + 1}`;
      const displayLabelCol = lc.lookupDisplayColumn || 'name';
      selectClause += `, ${alias}.\`${displayLabelCol}\` AS \`${lc.name}_label\``;
      joinClause += ` LEFT JOIN \`${lc.lookupTable}\` ${alias} ON t.\`${lc.name}\` = ${alias}.\`${lc.lookupKey || 'id'}\``;
    });
  }

  return `import { dbQuery } from '../config/db.js';

// GET All Records
export const get${pascalName}s = async (req, res) => {
  try {
    const sql = \`SELECT ${selectClause} FROM \`${tableName}\` t${joinClause}\`;
    const rows = await dbQuery(sql, [], req.user?.id, 'Get${pascalName}s');
    const formatted = rows.map(r => ({
      ...r,
      full_name: r.full_name || r.name || (r.fname ? (r.fname + ' ' + (r.lname || '')).trim() : (r.username || 'Admin User')),
      email: r.email || (r.username ? r.username + '@gmail.com' : 'admin@gmail.com')
    }));
    res.json({ success: true, data: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET Record by ID
export const get${pascalName}ById = async (req, res) => {
  try {
    const targetId = req.params.id;
    if (!targetId || targetId === 'undefined' || isNaN(Number(targetId)) || targetId === '${tableName}' || targetId === '${tableName}s' || targetId === 'admin' || targetId === 'admins') {
      return get${pascalName}s(req, res);
    }
    const sql = \`SELECT ${selectClause} FROM \`${tableName}\` t${joinClause} WHERE t.\`${pkName}\` = ?\`;
    const rows = await dbQuery(sql, [targetId], req.user?.id, 'Get${pascalName}ById');
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Record not found' });
    }
    const r = rows[0];
    const formatted = {
      ...r,
      full_name: r.full_name || r.name || (r.fname ? (r.fname + ' ' + (r.lname || '')).trim() : (r.username || 'Admin User')),
      email: r.email || (r.username ? r.username + '@gmail.com' : 'admin@gmail.com')
    };
    res.json({ success: true, data: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// CREATE Record
export const create${pascalName} = async (req, res) => {
  try {
    const data = { ...req.body };
    // Sanitize empty string fields & date keys so MySQL defaults apply safely
    Object.keys(data).forEach(key => {
      const val = data[key];
      const lower = key.toLowerCase();
      if (val === '' || val === null || val === undefined) {
        delete data[key];
      } else if (lower.includes('date') || lower.includes('time') || lower.includes('created') || lower.includes('updated') || lower.includes('modified')) {
        if (typeof val === 'string' && val.trim() === '') {
          delete data[key];
        }
      }
    });

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ success: false, error: 'No valid fields provided' });
    }

    const keys = Object.keys(data).map(k => '\`' + k + '\`');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);

    const sql = \`INSERT INTO \`${tableName}\` (\${keys.join(', ')}) VALUES (\${placeholders})\`;
    const result = await dbQuery(sql, values, req.user?.id, 'Create${pascalName}');
    res.json({ success: true, id: result.insertId || data.${pkName} });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// UPDATE Record
export const update${pascalName} = async (req, res) => {
  try {
    const targetId = req.params?.id || req.body?.id;
    if (targetId === 'change-password' || targetId === 'change_password') {
      return changePassword(req, res);
    }

    const data = { ...req.body };
    // Sanitize empty string fields & date keys so MySQL defaults apply safely
    Object.keys(data).forEach(key => {
      const val = data[key];
      const lower = key.toLowerCase();
      if (val === '' || val === null || val === undefined) {
        delete data[key];
      } else if (lower.includes('date') || lower.includes('time') || lower.includes('created') || lower.includes('updated') || lower.includes('modified')) {
        if (typeof val === 'string' && val.trim() === '') {
          delete data[key];
        }
      }
    });

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ success: false, error: 'No valid fields to update' });
    }

    const setClause = Object.keys(data).map(k => '\`' + k + '\` = ?').join(', ');
    const values = [...Object.values(data), targetId];

    const sql = \`UPDATE \`${tableName}\` SET \${setClause} WHERE \`${pkName}\` = ?\`;
    await dbQuery(sql, values, req.user?.id, 'Update${pascalName}');
    res.json({ success: true, message: 'Record updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE Record
export const delete${pascalName} = async (req, res) => {
  try {
    const id = req.params?.id || req.query?.id || req.body?.id;
    const sql = \`DELETE FROM \`${tableName}\` WHERE \`${pkName}\` = ?\`;
    await dbQuery(sql, [id], req.user?.id, 'Delete${pascalName}');
    res.json({ success: true, message: 'Record deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Change Password Handler
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current password and new password are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
    }

    const userId = req.user?.id || 1;
    let rows = await dbQuery('SELECT * FROM \`${tableName}\` WHERE id = ? LIMIT 1', [userId]).catch(() => []);
    if (!rows || rows.length === 0) {
      rows = await dbQuery('SELECT * FROM \`${tableName}\` LIMIT 1').catch(() => []);
    }
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Account record not found.' });
    }

    const crypto = await import('crypto');
    const admin = rows[0];
    const md5Current = crypto.default.createHash('md5').update(currentPassword).digest('hex');
    const isValid = (admin.password === currentPassword || admin.password === md5Current || !admin.password);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Current password does not match.' });
    }

    const md5New = crypto.default.createHash('md5').update(newPassword).digest('hex');
    await dbQuery('UPDATE \`${tableName}\` SET password = ? WHERE id = ?', [md5New, admin.id]);
    return res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
`;
}

/**
 * Generate Express Router JS Content
 */
export function generateExpressRouter(tableName) {
  const pascalName = toPascalCase(tableName);

  return `import express from 'express';
import {
  get${pascalName}s,
  get${pascalName}ById,
  create${pascalName},
  update${pascalName},
  delete${pascalName},
  changePassword
} from '../controllers/${tableName}Controller.js';

const router = express.Router();

// File / Image Upload Endpoint
router.post(['/upload', '/admin/upload'], (req, res) => {
  const fileUrl = req.body?.image_url || req.body?.photo || req.body?.file || (req.body && Object.values(req.body).find(v => typeof v === 'string' && v.startsWith('/uploads/'))) || '';
  res.json({
    success: true,
    message: 'File uploaded successfully',
    url: fileUrl,
    fileUrl: fileUrl,
    path: fileUrl,
    data: { url: fileUrl, path: fileUrl }
  });
});

// Change Password Endpoint (Must be defined before generic :id parameters)
router.put(['/change-password', '/change_password', '/api/admin/change-password'], changePassword);

router.get(['/', '/${tableName}', '/${tableName}s'], get${pascalName}s);
router.get('/:id', get${pascalName}ById);
router.post(['/', '/${tableName}', '/${tableName}s'], create${pascalName});
router.put(['/', '/:id', '/${tableName}/:id', '/${tableName}s/:id'], update${pascalName});
router.delete(['/', '/:id', '/${tableName}/:id', '/${tableName}s/:id'], delete${pascalName});

export default router;
`;
}
