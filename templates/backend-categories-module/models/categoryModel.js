import { dbQuery } from '../config/db.js';

export const ensureCategoriesTable = async (executingUserId) => {
  try {
    await dbQuery(`
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
        \`deletedOn\` DATETIME DEFAULT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `, [], executingUserId, 'Create categories table if not exists');

    // Auto-ensure columns exist if table was created previously without them
    try {
      await dbQuery('ALTER TABLE `categories` ADD COLUMN `image_url` VARCHAR(500) DEFAULT NULL, ADD COLUMN `photo` VARCHAR(500) DEFAULT NULL, ADD COLUMN `slug` VARCHAR(255) DEFAULT NULL, ADD COLUMN `description` TEXT DEFAULT NULL, ADD COLUMN `parent_id` INT DEFAULT NULL, ADD COLUMN `isDeleted` TINYINT(1) DEFAULT 0, ADD COLUMN `deletedOn` DATETIME DEFAULT NULL', [], executingUserId, 'Auto add columns');
    } catch(e) {}

    // Seed realistic faker categories if table is empty
    const countRes = await dbQuery('SELECT COUNT(*) as count FROM `categories`', [], executingUserId, 'Check categories count').catch(() => []);
    const count = countRes[0]?.count || countRes[0]?.['COUNT(*)'] || 0;
    if (count === 0) {
      const seedCategories = [
        ['Electronics & Smart Devices', 'electronics-smart-devices', 'Latest smartphones, laptops, smartwatches, and consumer electronics.', null, 'https://images.unsplash.com/photo-1498049860654-af1a5c566876?auto=format&fit=crop&w=600&q=80', 'https://images.unsplash.com/photo-1498049860654-af1a5c566876?auto=format&fit=crop&w=600&q=80'],
        ['Modern Home & Kitchen', 'modern-home-kitchen', 'Furniture, decor, kitchen tools, and smart home appliances.', null, 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=600&q=80', 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=600&q=80'],
        ['Fashion & Urban Wear', 'fashion-urban-wear', 'Trending men and women clothing, footwear, and fashion accessories.', null, 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=600&q=80', 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=600&q=80']
      ];

      for (const c of seedCategories) {
        await dbQuery(
          'INSERT INTO `categories` (`name`, `slug`, `description`, `parent_id`, `image_url`, `photo`) VALUES (?, ?, ?, ?, ?, ?)',
          c,
          executingUserId,
          'Seed faker category'
        ).catch(() => {});
      }
    }
  } catch (e) {
    console.error('ensureCategoriesTable error:', e.message);
  }
};

export const getAllCategories = async (executingUserId) => {
  await ensureCategoriesTable(executingUserId);
  const sql = 'SELECT * FROM `categories` WHERE (`deletedOn` IS NULL OR `deletedOn` = "") AND (`isDeleted` = 0 OR `isDeleted` IS NULL) AND `name` IS NOT NULL AND `name` != "" ORDER BY `id` ASC';
  let rows = await dbQuery(sql, [], executingUserId, 'Fetch all categories').catch(() => []);
  if (!rows || rows.length === 0) {
    const seedCategories = [
      ['Electronics & Smart Devices', 'electronics-smart-devices', 'Latest smartphones, laptops, smartwatches, and consumer electronics.', null, 'https://images.unsplash.com/photo-1498049860654-af1a5c566876?auto=format&fit=crop&w=600&q=80', 'https://images.unsplash.com/photo-1498049860654-af1a5c566876?auto=format&fit=crop&w=600&q=80'],
      ['Modern Home & Kitchen', 'modern-home-kitchen', 'Furniture, decor, kitchen tools, and smart home appliances.', null, 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=600&q=80', 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=600&q=80'],
      ['Fashion & Urban Wear', 'fashion-urban-wear', 'Trending men and women clothing, footwear, and fashion accessories.', null, 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=600&q=80', 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=600&q=80']
    ];
    for (const c of seedCategories) {
      await dbQuery(
        'INSERT INTO `categories` (`name`, `slug`, `description`, `parent_id`, `image_url`, `photo`) VALUES (?, ?, ?, ?, ?, ?)',
        c,
        executingUserId,
        'Seed faker category'
      ).catch(() => {});
    }
    rows = await dbQuery(sql, [], executingUserId, 'Fetch all categories after reseed').catch(() => []);
  }
  return rows || [];
};

export const getCategoryById = async (id, executingUserId) => {
  await ensureCategoriesTable(executingUserId);
  const sql = 'SELECT * FROM `categories` WHERE `id` = ? LIMIT 1';
  const rows = await dbQuery(sql, [id], executingUserId, `Fetch category ID: ${id}`);
  return rows[0] || null;
};

export const createCategory = async (data, executingUserId) => {
  await ensureCategoriesTable(executingUserId);
  if (data.name && !data.slug) {
    data.slug = data.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now();
  }
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
