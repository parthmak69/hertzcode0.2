import { dbQuery } from '../config/db.js';

export const ensureCategoriesTable = async (executingUserId) => {
  try {
    await dbQuery(`
      CREATE TABLE IF NOT EXISTS \`categories\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(255) NOT NULL,
        \`description\` TEXT NULL,
        \`parent_id\` INT NULL,
        \`image_url\` VARCHAR(500) NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `, [], executingUserId, 'Create categories table if not exists');
  } catch (e) {
    console.error('ensureCategoriesTable error:', e.message);
  }
};

export const getAllCategories = async (executingUserId) => {
  await ensureCategoriesTable(executingUserId);
  const sql = 'SELECT * FROM \`categories\` ORDER BY \`id\` ASC';
  return dbQuery(sql, [], executingUserId, 'Fetch all categories');
};

export const getCategoryById = async (id, executingUserId) => {
  await ensureCategoriesTable(executingUserId);
  const sql = 'SELECT * FROM \`categories\` WHERE \`id\` = ? LIMIT 1';
  const rows = await dbQuery(sql, [id], executingUserId, `Fetch category ID: ${id}`);
  return rows[0] || null;
};

export const createCategory = async (data, executingUserId) => {
  await ensureCategoriesTable(executingUserId);
  const columns = Object.keys(data);
  const placeholders = columns.map(() => '?').join(', ');
  const values = Object.values(data);
  const sql = `INSERT INTO \`categories\` (${columns.map(c => `\`${c}\``).join(', ')}) VALUES (${placeholders})`;
  return dbQuery(sql, values, executingUserId, `Created category: "${data.name}"`);
};

export const updateCategory = async (id, data, executingUserId) => {
  await ensureCategoriesTable(executingUserId);
  const setClause = Object.keys(data).map(c => `\`${c}\` = ?`).join(', ');
  const sql = `UPDATE \`categories\` SET ${setClause} WHERE \`id\` = ?`;
  const values = [...Object.values(data), id];
  return dbQuery(sql, values, executingUserId, `Updated category ID: ${id}`);
};

export const deleteCategory = async (id, executingUserId) => {
  await ensureCategoriesTable(executingUserId);
  const sql = 'DELETE FROM \`categories\` WHERE \`id\` = ?';
  return dbQuery(sql, [id], executingUserId, `Deleted category ID: ${id}`);
};
