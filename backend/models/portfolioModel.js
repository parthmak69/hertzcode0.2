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
