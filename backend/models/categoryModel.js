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
        \`createdBy\` VARCHAR(255) NULL,
        \`createdOn\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`modifiedOn\` DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
        \`isDeleted\` TINYINT(1) DEFAULT 0,
        \`deletedOn\` DATETIME DEFAULT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `, [], executingUserId, 'Create categories table if not exists');

    // Seed initial categories if table is empty
    const checkRows = await dbQuery('SELECT COUNT(*) as cnt FROM `categories`', [], executingUserId, 'Check categories count');
    const count = checkRows[0]?.cnt || checkRows[0]?.['COUNT(*)'] || 0;
    if (count === 0) {
      await dbQuery(`
        INSERT INTO \`categories\` (\`name\`, \`description\`, \`parent_id\`, \`image_url\`) VALUES
        ('Electronics & Smart Devices', 'Latest smartphones, laptops, smartwatches, and consumer electronics.', NULL, 'https://images.unsplash.com/photo-1498049860654-af1a5c566876?auto=format&fit=crop&w=600&q=80'),
        ('Modern Home & Kitchen', 'Furniture, decor, kitchen tools, and smart home appliances.', NULL, 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=600&q=80'),
        ('Fashion & Urban Wear', 'Trending men and women clothing, footwear, and fashion accessories.', NULL, 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=600&q=80')
      `, [], executingUserId, 'Seed initial categories');
    }
  } catch (e) {
    console.error('ensureCategoriesTable error:', e.message);
  }
};

export const getAllCategories = async (executingUserId) => {
  await ensureCategoriesTable(executingUserId);
  try {
    const rows = await dbQuery('SELECT * FROM `categories` WHERE (`isDeleted` = 0 OR `isDeleted` IS NULL) AND `deletedOn` IS NULL ORDER BY `id` ASC', [], executingUserId, 'Fetch active categories');
    if (Array.isArray(rows) && rows.length > 0) return rows;
  } catch (e) {}

  return await dbQuery('SELECT * FROM `categories` ORDER BY `id` ASC', [], executingUserId, 'Fetch all categories fallback');
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
  try {
    const sql = 'UPDATE `categories` SET `isDeleted` = 1, `deletedOn` = CURRENT_TIMESTAMP WHERE `id` = ?';
    return await dbQuery(sql, [id], executingUserId, `Soft deleted category ID: ${id}`);
  } catch (e) {
    const sql = 'DELETE FROM `categories` WHERE `id` = ?';
    return await dbQuery(sql, [id], executingUserId, `Deleted category ID: ${id}`);
  }
};
