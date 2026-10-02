import { dbQuery } from '../config/db.js';

export const ensureProductsTable = async (executingUserId) => {
  try {
    await dbQuery(`
      CREATE TABLE IF NOT EXISTS \`products\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(255) NOT NULL,
        \`price\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        \`stock\` INT NOT NULL DEFAULT 0,
        \`isDeleted\` TINYINT(1) DEFAULT 0,
        \`deletedOn\` DATETIME DEFAULT NULL,
        \`is_deleted\` TINYINT(1) DEFAULT 0,
        \`deleted_at\` DATETIME DEFAULT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `, [], executingUserId, 'Create products table if not exists');

    // Auto-ensure columns exist if table was created previously without them
    try {
      await dbQuery('ALTER TABLE `products` ADD COLUMN `isDeleted` TINYINT(1) DEFAULT 0, ADD COLUMN `deletedOn` DATETIME DEFAULT NULL', [], executingUserId, 'Auto add deletedOn');
    } catch(e) {}
  } catch (e) {
    console.error('ensureProductsTable error:', e.message);
  }
};

export const getAllProducts = async (executingUserId) => {
  await ensureProductsTable(executingUserId);
  const sql = 'SELECT * FROM `products` WHERE `deleted_at` IS NULL AND (`is_deleted` = 0 OR `is_deleted` IS NULL) ORDER BY `id` DESC';
  return dbQuery(sql, [], executingUserId, 'Fetch all products');
};

export const getProductById = async (id, executingUserId) => {
  await ensureProductsTable(executingUserId);
  const sql = 'SELECT * FROM `products` WHERE `id` = ? LIMIT 1';
  const rows = await dbQuery(sql, [id], executingUserId, `Fetch product ID: ${id}`);
  return rows[0] || null;
};

export const createProduct = async (data, executingUserId) => {
  await ensureProductsTable(executingUserId);
  const columns = Object.keys(data);
  const placeholders = columns.map(() => '?').join(', ');
  const values = Object.values(data);
  const sql = `INSERT INTO \`products\` (${columns.map(c => `\`${c}\``).join(', ')}) VALUES (${placeholders})`;
  return dbQuery(sql, values, executingUserId, `Created product: "${data.name}"`);
};

export const updateProduct = async (id, data, executingUserId) => {
  await ensureProductsTable(executingUserId);
  const setClause = Object.keys(data).map(c => `\`${c}\` = ?`).join(', ');
  const sql = `UPDATE \`products\` SET ${setClause} WHERE \`id\` = ?`;
  const values = [...Object.values(data), id];
  return dbQuery(sql, values, executingUserId, `Updated product ID: ${id}`);
};

export const deleteProduct = async (id, executingUserId) => {
  await ensureProductsTable(executingUserId);
  const sql = 'UPDATE `products` SET `isDeleted` = 1, `deletedOn` = CURRENT_TIMESTAMP, `is_deleted` = 1, `deleted_at` = CURRENT_TIMESTAMP WHERE `id` = ?';
  return dbQuery(sql, [id], executingUserId, `Soft deleted product ID: ${id}`);
};

export default {
  ensureProductsTable,
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};
