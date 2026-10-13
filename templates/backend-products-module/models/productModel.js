import { dbQuery } from '../config/db.js';

export const ensureProductsTable = async (executingUserId) => {
  try {
    await dbQuery(`
      CREATE TABLE IF NOT EXISTS \`products\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(255) NOT NULL,
        \`price\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        \`stock\` INT NOT NULL DEFAULT 0,
        \`image_url\` VARCHAR(500) DEFAULT NULL,
        \`photo\` VARCHAR(500) DEFAULT NULL,
        \`description\` TEXT DEFAULT NULL,
        \`isDeleted\` TINYINT(1) DEFAULT 0,
        \`deletedOn\` DATETIME DEFAULT NULL,
        \`is_deleted\` TINYINT(1) DEFAULT 0,
        \`deleted_at\` DATETIME DEFAULT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `, [], executingUserId, 'Create products table if not exists');

    // Auto-ensure columns exist if table was created previously without them
    try {
      await dbQuery('ALTER TABLE `products` ADD COLUMN `image_url` VARCHAR(500) DEFAULT NULL, ADD COLUMN `photo` VARCHAR(500) DEFAULT NULL, ADD COLUMN `description` TEXT DEFAULT NULL, ADD COLUMN `isDeleted` TINYINT(1) DEFAULT 0, ADD COLUMN `deletedOn` DATETIME DEFAULT NULL', [], executingUserId, 'Auto add columns');
    } catch(e) {}

    // Seed realistic faker products if table is empty
    const countRes = await dbQuery('SELECT COUNT(*) as count FROM `products`', [], executingUserId, 'Check products count').catch(() => []);
    const count = countRes[0]?.count || countRes[0]?.['COUNT(*)'] || 0;
    if (count === 0) {
      const seedProducts = [
        ['Sony WH-1000XM5 Wireless Headphones', 399.99, 45, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80', 'Industry-leading noise cancellation with two processors and 8 microphones for exceptional sound clarity and hands-free calling.'],
        ['Apple Watch Series 9 GPS 45mm', 429.00, 28, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80', 'Advanced health sensors, Always-On Retina display, crash detection, and water resistance up to 50 meters.'],
        ['Logitech MX Master 3S Wireless Mouse', 99.99, 60, 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=600&q=80', 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=600&q=80', 'Ergonomic performance mouse with quiet clicks, 8K DPI any-surface tracking, and ultra-fast MagSpeed scrolling.'],
        ['Nike Air Max 270 React Sneakers', 159.50, 35, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80', 'Iconic Max Air 270 unit delivers all-day comfort with lightweight foam cushioning and contemporary street style.'],
        ['Keychron Q1 Pro Custom Mechanical Keyboard', 198.00, 18, 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80', 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80', 'Full metal 75% layout keyboard with wireless Bluetooth 5.1 connectivity, hot-swappable switches, and QMK/VIA support.'],
        ['Minimalist Ceramic Coffee Mug (Set of 2)', 34.00, 72, 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80', 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80', 'Handcrafted stoneware ceramic mugs with ergonomic handle and heat-retaining matte glazed finish.']
      ];

      for (const p of seedProducts) {
        await dbQuery(
          'INSERT INTO `products` (`name`, `price`, `stock`, `image_url`, `photo`, `description`) VALUES (?, ?, ?, ?, ?, ?)',
          p,
          executingUserId,
          'Seed faker product'
        ).catch(() => {});
      }
    }
  } catch (e) {
    console.error('ensureProductsTable error:', e.message);
  }
};

export const getAllProducts = async (executingUserId) => {
  await ensureProductsTable(executingUserId);
  const sql = 'SELECT * FROM `products` WHERE (`deleted_at` IS NULL OR `deleted_at` = "") AND (`deletedOn` IS NULL OR `deletedOn` = "") AND (`is_deleted` = 0 OR `is_deleted` IS NULL) AND (`isDeleted` = 0 OR `isDeleted` IS NULL) AND `name` IS NOT NULL AND `name` != "" ORDER BY `id` DESC';
  let rows = await dbQuery(sql, [], executingUserId, 'Fetch all products').catch(() => []);
  if (!rows || rows.length === 0) {
    const seedProducts = [
      ['Sony WH-1000XM5 Wireless Headphones', 399.99, 45, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80', 'Industry-leading noise cancellation with two processors and 8 microphones for exceptional sound clarity and hands-free calling.'],
      ['Apple Watch Series 9 GPS 45mm', 429.00, 28, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80', 'Advanced health sensors, Always-On Retina display, crash detection, and water resistance up to 50 meters.'],
      ['Logitech MX Master 3S Wireless Mouse', 99.99, 60, 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=600&q=80', 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=600&q=80', 'Ergonomic performance mouse with quiet clicks, 8K DPI any-surface tracking, and ultra-fast MagSpeed scrolling.'],
      ['Nike Air Max 270 React Sneakers', 159.50, 35, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80', 'Iconic Max Air 270 unit delivers all-day comfort with lightweight foam cushioning and contemporary street style.'],
      ['Keychron Q1 Pro Custom Mechanical Keyboard', 198.00, 18, 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80', 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80', 'Full metal 75% layout keyboard with wireless Bluetooth 5.1 connectivity, hot-swappable switches, and QMK/VIA support.'],
      ['Minimalist Ceramic Coffee Mug (Set of 2)', 34.00, 72, 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80', 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80', 'Handcrafted stoneware ceramic mugs with ergonomic handle and heat-retaining matte glazed finish.']
    ];
    for (const p of seedProducts) {
      await dbQuery(
        'INSERT INTO `products` (`name`, `price`, `stock`, `image_url`, `photo`, `description`) VALUES (?, ?, ?, ?, ?, ?)',
        p,
        executingUserId,
        'Seed faker product'
      ).catch(() => {});
    }
    rows = await dbQuery(sql, [], executingUserId, 'Fetch all products after reseed').catch(() => []);
  }
  return rows || [];
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
