import { dbQuery } from '../config/db.js';

export const ensurePortfolioTables = async (executingUserId) => {
  try {
    await dbQuery(`
      CREATE TABLE IF NOT EXISTS \`portfolio_cards\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`title\` VARCHAR(255) NOT NULL,
        \`description\` TEXT NULL,
        \`category\` VARCHAR(255) NULL DEFAULT 'Development',
        \`button_link\` VARCHAR(500) NULL,
        \`image_url\` VARCHAR(500) NULL,
        \`switch_active\` TINYINT(1) DEFAULT 1,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `, [], executingUserId, 'Create portfolio_cards table if not exists');

    await dbQuery(`
      CREATE TABLE IF NOT EXISTS \`portfolio_categories\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(255) NOT NULL UNIQUE,
        \`image_url\` VARCHAR(500) NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `, [], executingUserId, 'Create portfolio_categories table if not exists');

    // Auto-seed default categories if table is empty
    const catCount = await dbQuery('SELECT COUNT(*) as count FROM `portfolio_categories`', [], executingUserId, 'Check categories count');
    if (catCount && catCount[0] && (catCount[0].count === 0 || catCount[0].count === '0')) {
      const defaultCats = [
        ['Development', 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=600&q=80'],
        ['Design', 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=600&q=80'],
        ['Marketing', 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80'],
        ['Productivity', 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&w=600&q=80']
      ];
      for (const [cName, cImg] of defaultCats) {
        await dbQuery('INSERT IGNORE INTO `portfolio_categories` (`name`, `image_url`) VALUES (?, ?)', [cName, cImg], executingUserId, `Seed category: ${cName}`).catch(() => null);
      }
    }

    // Auto-seed default portfolio cards if table is empty
    const cardCount = await dbQuery('SELECT COUNT(*) as count FROM `portfolio_cards`', [], executingUserId, 'Check cards count');
    if (cardCount && cardCount[0] && (cardCount[0].count === 0 || cardCount[0].count === '0')) {
      const defaultCards = [
        ['NextGen AI Analytics Platform', 'Cloud-native analytics dashboard offering real-time streaming queries, interactive visual charts, and automated alerts.', 'Development', 'https://github.com/example/ai-analytics', 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80', 1],
        ['Fintech Crypto Mobile Wallet', 'Non-custodial crypto wallet interface featuring biometrics authentication, hardware keys support, and instant swaps.', 'Development', 'https://github.com/example/crypto-wallet', 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80', 1],
        ['NeoBrutalism Design System UI Kit', 'Award-winning design tokens, accessible components, and Figma UI kit tailored for modern SaaS startups.', 'Design', 'https://dribbble.com/example-neobrutalism', 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80', 1],
        ['OmniChannel Marketing Growth Suite', 'Campaign automation engine with multivariate A/B testing and AI copy generation.', 'Marketing', 'https://example.com/growth-suite', 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80', 1],
        ['ZenTask Agile Productivity Workspace', 'Collaborative sprint management tool combining Kanban boards, Gantt charts, and calendar timelines.', 'Productivity', 'https://example.com/zentask', 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&w=800&q=80', 1],
        ['Luxury Retail Brand Identity', 'Comprehensive visual branding including packaging typography, spatial design, and social media templates.', 'Design', 'https://behance.net/example-luxury-brand', 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80', 1]
      ];
      for (const card of defaultCards) {
        await dbQuery(
          'INSERT INTO `portfolio_cards` (`title`, `description`, `category`, `button_link`, `image_url`, `switch_active`) VALUES (?, ?, ?, ?, ?, ?)',
          card,
          executingUserId,
          `Seed portfolio card: ${card[0]}`
        ).catch(() => null);
      }
    }
  } catch (e) {
    console.error('ensurePortfolioTables error:', e.message);
  }
};

export const listPortfolioCategories = async (executingUserId) => {
  await ensurePortfolioTables(executingUserId);
  const sql = 'SELECT * FROM \`portfolio_categories\` ORDER BY \`id\` ASC';
  return dbQuery(sql, [], executingUserId, 'List all portfolio categories');
};

export const createPortfolioCategory = async (fields, executingUserId) => {
  await ensurePortfolioTables(executingUserId);
  const columns = Object.keys(fields);
  const placeholders = columns.map(() => '?').join(', ');
  const values = Object.values(fields);
  const sql = `INSERT INTO \`portfolio_categories\` (${columns.map(c => `\`${c}\``).join(', ')}) VALUES (${placeholders})`;
  return dbQuery(sql, values, executingUserId, `Created portfolio category: "${fields.name}"`);
};

export const deletePortfolioCategory = async (id, executingUserId) => {
  await ensurePortfolioTables(executingUserId);
  const sql = 'DELETE FROM \`portfolio_categories\` WHERE \`id\` = ?';
  return dbQuery(sql, [id], executingUserId, `Deleted portfolio category ID: ${id}`);
};

export const getRecordById = async (id, executingUserId) => {
  await ensurePortfolioTables(executingUserId);
  const sql = 'SELECT * FROM \`portfolio_cards\` WHERE \`id\` = ? LIMIT 1';
  const rows = await dbQuery(sql, [id], executingUserId, `Fetch portfolio card ID: ${id}`);
  return rows[0] || null;
};

export const getRecordsList = async ({ search, category, page, limit, sortBy, sortOrder }, executingUserId) => {
  await ensurePortfolioTables(executingUserId);
  const pLimit = limit || 10;
  const pPage = page || 1;
  const offset = (pPage - 1) * pLimit;
  const allowedSortCols = ['id', 'title', 'category', 'created_at'];
  const safeSortBy = allowedSortCols.includes(sortBy) ? sortBy : 'id';
  const safeSortOrder = ['asc', 'desc'].includes(sortOrder ? sortOrder.toLowerCase() : '') ? sortOrder : 'asc';

  let selectSql = 'SELECT * FROM \`portfolio_cards\` WHERE 1=1';
  const queryParams = [];

  if (category) {
    selectSql += ' AND \`category\` = ?';
    queryParams.push(category);
  }

  if (search) {
    selectSql += ' AND (\`title\` LIKE ? OR \`description\` LIKE ?)';
    queryParams.push(`%${search}%`, `%${search}%`);
  }

  selectSql += ` ORDER BY ${safeSortBy} ${safeSortOrder} LIMIT ? OFFSET ?`;
  const selectParams = [...queryParams, pLimit, offset];

  return dbQuery(selectSql, selectParams, executingUserId, 'Fetch paginated portfolio cards');
};

export const countRecords = async ({ search, category }, executingUserId) => {
  await ensurePortfolioTables(executingUserId);
  let countSql = 'SELECT COUNT(*) as total FROM \`portfolio_cards\` WHERE 1=1';
  const queryParams = [];

  if (category) {
    countSql += ' AND \`category\` = ?';
    queryParams.push(category);
  }

  if (search) {
    countSql += ' AND (\`title\` LIKE ? OR \`description\` LIKE ?)';
    queryParams.push(`%${search}%`, `%${search}%`);
  }

  const countRes = await dbQuery(countSql, queryParams, executingUserId, 'Fetch portfolio cards count');
  return countRes[0]?.total || 0;
};

export const getCategoriesSummary = async (executingUserId) => {
  await ensurePortfolioTables(executingUserId);
  const sql = `
    SELECT 
      c.category,
      COUNT(p.id) as count,
      (SELECT image_url FROM \`portfolio_cards\` WHERE \`category\` = c.category AND \`image_url\` IS NOT NULL AND \`image_url\` != '' LIMIT 1) as cover_image
    FROM (
      SELECT 'Development' as category UNION ALL
      SELECT 'Design' UNION ALL
      SELECT 'Marketing' UNION ALL
      SELECT 'Productivity' UNION ALL
      SELECT 'Others'
    ) c
    LEFT JOIN \`portfolio_cards\` p ON p.category = c.category
    GROUP BY c.category
  `;
  return dbQuery(sql, [], executingUserId, 'Fetch portfolio categories summary');
};

export const createRecord = async (fields, executingUserId) => {
  await ensurePortfolioTables(executingUserId);
  const columns = Object.keys(fields);
  const placeholders = columns.map(() => '?').join(', ');
  const values = Object.values(fields);
  const sql = `INSERT INTO \`portfolio_cards\` (${columns.map(c => `\`${c}\``).join(', ')}) VALUES (${placeholders})`;
  return dbQuery(sql, values, executingUserId, `Created portfolio card: "${fields.title}"`);
};

export const updateRecord = async (id, fields, executingUserId) => {
  await ensurePortfolioTables(executingUserId);
  const setClause = Object.keys(fields).map(c => `\`${c}\` = ?`).join(', ');
  const sql = `UPDATE \`portfolio_cards\` SET ${setClause} WHERE \`id\` = ?`;
  const values = [...Object.values(data || fields), id];
  return dbQuery(sql, values, executingUserId, `Updated portfolio card ID: ${id}`);
};

export const deleteRecord = async (id, executingUserId) => {
  await ensurePortfolioTables(executingUserId);
  const sql = 'DELETE FROM \`portfolio_cards\` WHERE \`id\` = ?';
  return dbQuery(sql, [id], executingUserId, `Deleted portfolio card ID: ${id}`);
};

export const updateRecordStatus = async (id, newStatus, executingUserId) => {
  await ensurePortfolioTables(executingUserId);
  const sql = 'UPDATE \`portfolio_cards\` SET \`switch_active\` = ? WHERE \`id\` = ?';
  return dbQuery(sql, [newStatus, id], executingUserId, `Toggled active status of portfolio card ID: ${id}`);
};

export const deleteRecords = async (ids, executingUserId) => {
  await ensurePortfolioTables(executingUserId);
  if (!ids || ids.length === 0) return;
  const placeholders = ids.map(() => '?').join(', ');
  const sql = `DELETE FROM \`portfolio_cards\` WHERE \`id\` IN (${placeholders})`;
  return dbQuery(sql, ids, executingUserId, `Bulk deleted portfolio card IDs: ${ids.join(', ')}`);
};
