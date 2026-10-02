import { dbQuery } from '../config/db.js';
import crypto from 'crypto';

export const ensureAdminTable = async (executingUserId = 1) => {
  try {
    await dbQuery(`
      CREATE TABLE IF NOT EXISTS \`admin\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`username\` VARCHAR(255) DEFAULT 'admin',
        \`name\` VARCHAR(255) DEFAULT 'Admin User',
        \`full_name\` VARCHAR(255) DEFAULT 'Admin User',
        \`email\` VARCHAR(255) DEFAULT 'admin@gmail.com',
        \`password\` VARCHAR(255) NULL,
        \`phone\` VARCHAR(50) NULL,
        \`role\` VARCHAR(50) DEFAULT 'admin',
        \`profile_image\` VARCHAR(500) NULL,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`isDeleted\` TINYINT(1) DEFAULT 0
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `, [], executingUserId, 'Ensure admin table exists');

    const check = await dbQuery('SELECT COUNT(*) as count FROM `admin`', [], executingUserId, 'Check admin count').catch(() => []);
    if (check[0]?.count === 0) {
      const defaultHash = '0192023a7bbd73250516f069df18b500'; // md5('admin123')
      await dbQuery(
        'INSERT INTO `admin` (`username`, `email`, `name`, `full_name`, `password`, `role`, `isDeleted`) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['admin', 'admin@gmail.com', 'Admin User', 'Admin User', defaultHash, 'admin', 0],
        executingUserId,
        'Insert default admin user'
      ).catch(() => {});
    }

    try {
      const cols = await dbQuery("SHOW COLUMNS FROM `admin`", [], executingUserId, 'Check admin columns').catch(() => []);
      const existingCols = new Set((cols || []).map(c => c.Field || c.field || c.COLUMN_NAME));

      if (!existingCols.has('profile_image')) {
        await dbQuery('ALTER TABLE `admin` ADD COLUMN `profile_image` VARCHAR(500) NULL', [], executingUserId, 'Add profile_image column').catch(() => {});
      }
      if (!existingCols.has('phone')) {
        await dbQuery('ALTER TABLE `admin` ADD COLUMN `phone` VARCHAR(50) NULL', [], executingUserId, 'Add phone column').catch(() => {});
      }
      if (!existingCols.has('full_name')) {
        await dbQuery('ALTER TABLE `admin` ADD COLUMN `full_name` VARCHAR(255) NULL', [], executingUserId, 'Add full_name column').catch(() => {});
      }
    } catch (e) {}
  } catch (e) {
    console.error('[adminModel] ensureAdminTable error:', e.message);
  }
};

export const getAllAdmins = async (executingUserId = 1, showDeleted = false) => {
  await ensureAdminTable(executingUserId);
  try {
    const isDeletedCondition = showDeleted ? '`isDeleted` = 1' : '(`isDeleted` = 0 OR `isDeleted` IS NULL)';
    const orderBy = showDeleted ? '`id` DESC' : '`id` ASC';
    let rows = await dbQuery(`SELECT * FROM \`admin\` WHERE ${isDeletedCondition} ORDER BY ${orderBy}`, [], executingUserId, 'Fetch all admins');
    if (Array.isArray(rows)) {
      return rows.map(r => ({
        ...r,
        full_name: r.full_name || r.name || (r.fname ? (r.fname + ' ' + (r.lname || '')).trim() : (r.username || 'Admin User')),
        email: r.email || (r.username ? r.username + '@gmail.com' : 'admin@gmail.com'),
        profile_image: r.profile_image || r.image_url || r.avatar || r.image || ''
      }));
    }
  } catch (e) {}

  if (showDeleted) return [];

  try {
    let rows = await dbQuery('SELECT id, username, role FROM user_cred', [], executingUserId, 'Fetch user_cred admins');
    if (Array.isArray(rows) && rows.length > 0) {
      return rows.map(r => ({
        id: r.id,
        name: r.username || 'Admin User',
        full_name: r.username || 'Admin User',
        username: r.username || 'admin',
        email: `${r.username || 'admin'}@gmail.com`,
        role: r.role || 'admin',
      }));
    }
  } catch (e) {}

  return [{
    id: 1,
    name: 'Admin User',
    full_name: 'Admin User',
    username: 'admin',
    email: 'admin@gmail.com',
    role: 'admin'
  }];
};

export const getAdminById = async (id, executingUserId = 1) => {
  await ensureAdminTable(executingUserId);
  try {
    const rows = await dbQuery('SELECT * FROM `admin` WHERE `id` = ? LIMIT 1', [id], executingUserId, `Fetch admin ID ${id}`);
    if (rows && rows.length > 0) {
      const r = rows[0];
      return {
        id: r.id,
        name: r.name || r.full_name || r.username || 'Admin User',
        full_name: r.full_name || r.name || r.username || 'Admin User',
        username: r.username || r.name || 'admin',
        email: r.email || 'admin@gmail.com',
        phone: r.phone || '',
        role: r.role || 'admin',
        profile_image: r.profile_image || ''
      };
    }
  } catch (e) {}

  try {
    const rows = await dbQuery('SELECT id, username, role FROM user_cred WHERE id = ? OR username = ? LIMIT 1', [id, id], executingUserId, `Fetch user_cred ID ${id}`);
    if (rows && rows.length > 0) {
      const r = rows[0];
      return {
        id: r.id,
        name: r.username,
        full_name: r.username,
        username: r.username,
        email: `${r.username}@hertzcode.com`,
        phone: '',
        role: r.role || 'admin',
        profile_image: ''
      };
    }
  } catch (e) {}

  return {
    id: parseInt(id) || 1,
    name: 'Admin User',
    full_name: 'Admin User',
    username: 'admin',
    email: 'admin@hertzcode.com',
    phone: '',
    role: 'admin',
    profile_image: ''
  };
};

export const updateAdmin = async (id, data, executingUserId = 1) => {
  await ensureAdminTable(executingUserId);
  try {
    const fields = [];
    const values = [];
    if (data.full_name || data.name) {
      fields.push('`name` = ?', '`full_name` = ?');
      values.push(data.full_name || data.name, data.full_name || data.name);
    }
    if (data.email) {
      fields.push('`email` = ?');
      values.push(data.email);
    }
    if (data.phone !== undefined) {
      fields.push('`phone` = ?');
      values.push(data.phone || null);
    }
    if (data.primaryImageAction === 'remove') {
      fields.push('`profile_image` = ?');
      values.push(null);
    } else if (data.profile_image !== undefined) {
      fields.push('`profile_image` = ?');
      values.push(data.profile_image || null);
    }
    if (fields.length > 0) {
      values.push(id);
      const sql = `UPDATE \`admin\` SET ${fields.join(', ')} WHERE \`id\` = ?`;
      await dbQuery(sql, values, executingUserId, `Update admin ID ${id}`);
    }
    return true;
  } catch (e) {
    console.error('[adminModel] updateAdmin error:', e.message);
    return false;
  }
};

export const createAdmin = async (data, executingUserId = 1) => {
  await ensureAdminTable(executingUserId);
  try {
    const name = data.full_name || data.name || 'New Admin';
    const email = data.email || 'admin@hertzcode.com';
    const username = data.username || email.split('@')[0];
    const sql = 'INSERT INTO `admin` (`name`, `full_name`, `username`, `email`, `phone`, `role`) VALUES (?, ?, ?, ?, ?, ?)';
    const res = await dbQuery(sql, [name, name, username, email, data.phone || '', data.role || 'admin'], executingUserId, 'Create admin');
    return res.insertId || 1;
  } catch (e) {
    return 1;
  }
};

export const deleteAdmin = async (id, permanent = false, executingUserId = 1) => {
  await ensureAdminTable(executingUserId);
  try {
    if (permanent) {
      await dbQuery('DELETE FROM `admin` WHERE `id` = ?', [id], executingUserId, `Permanently delete admin ID ${id}`);
    } else {
      await dbQuery('UPDATE `admin` SET `isDeleted` = 1 WHERE `id` = ?', [id], executingUserId, `Soft delete admin ID ${id}`);
    }
  } catch (e) {
    console.error('[adminModel] deleteAdmin error:', e.message);
  }
  return true;
};

export const restoreAdmin = async (id, executingUserId = 1) => {
  await ensureAdminTable(executingUserId);
  try {
    await dbQuery('UPDATE `admin` SET `isDeleted` = 0 WHERE `id` = ?', [id], executingUserId, `Restore admin ID ${id}`);
  } catch (e) {
    console.error('[adminModel] restoreAdmin error:', e.message);
  }
  return true;
};

export const bulkDeleteAdmins = async (ids, permanent = false, executingUserId = 1) => {
  await ensureAdminTable(executingUserId);
  if (!Array.isArray(ids) || ids.length === 0) return true;
  try {
    const placeholders = ids.map(() => '?').join(', ');
    if (permanent) {
      await dbQuery(`DELETE FROM \`admin\` WHERE \`id\` IN (${placeholders})`, ids, executingUserId, `Permanently bulk delete admin IDs: ${ids.join(', ')}`);
    } else {
      await dbQuery(`UPDATE \`admin\` SET \`isDeleted\` = 1 WHERE \`id\` IN (${placeholders})`, ids, executingUserId, `Soft bulk delete admin IDs: ${ids.join(', ')}`);
    }
  } catch (e) {
    console.error('[adminModel] bulkDeleteAdmins error:', e.message);
  }
  return true;
};

export const changeAdminPassword = async (userId, currentPassword, newPassword) => {
  await ensureAdminTable(1);
  try {
    let rows = await dbQuery('SELECT * FROM `admin` WHERE `id` = ? LIMIT 1', [userId]).catch(() => []);
    if (!rows || rows.length === 0) {
      rows = await dbQuery("SELECT * FROM `admin` WHERE `username` = 'admin' OR `email` = 'admin@gmail.com' LIMIT 1").catch(() => []);
    }
    if (!rows || rows.length === 0) {
      rows = await dbQuery('SELECT * FROM `admin` LIMIT 1').catch(() => []);
    }
    if (!rows || rows.length === 0) {
      return { error: 'Admin account not found.' };
    }

    const admin = rows[0];
    const md5Current = crypto.createHash('md5').update(currentPassword).digest('hex');
    const isValid = (admin.password === currentPassword || admin.password === md5Current || !admin.password);
    if (!isValid) {
      return { error: 'Current password is incorrect.' };
    }

    const md5New = crypto.createHash('md5').update(newPassword).digest('hex');
    await dbQuery('UPDATE `admin` SET `password` = ? WHERE `id` = ?', [md5New, admin.id]);
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
};
