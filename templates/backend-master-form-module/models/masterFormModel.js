import { dbQuery } from '../config/db.js';

export const ensureMasterFormTable = async (executingUserId = 1) => {
  try {
    await dbQuery(`
      CREATE TABLE IF NOT EXISTS \`master_form_inputs\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`text_title\` VARCHAR(255) NOT NULL,
        \`slug\` VARCHAR(255) NULL,
        \`email\` VARCHAR(255) NULL,
        \`password_hash\` VARCHAR(255) NULL,
        \`website_url\` VARCHAR(500) NULL,
        \`phone\` VARCHAR(50) NULL,
        \`integer_qty\` INT DEFAULT 1,
        \`decimal_price\` DECIMAL(10,2) DEFAULT 0.00,
        \`tax_percentage\` DECIMAL(5,2) DEFAULT 0.00,
        \`range_slider_value\` INT DEFAULT 50,
        \`short_notes\` TEXT NULL,
        \`rich_wysiwyg_content\` LONGTEXT NULL,
        \`dropdown_selection\` VARCHAR(100) DEFAULT 'grocery_staples',
        \`radio_selection\` VARCHAR(100) DEFAULT 'credit_card',
        \`checkbox_toggle\` TINYINT(1) DEFAULT 0,
        \`switch_active\` TINYINT(1) DEFAULT 1,
        \`date_picker\` DATE NULL,
        \`datetime_picker\` DATETIME NULL,
        \`time_picker\` TIME NULL,
        \`primary_image_url\` VARCHAR(500) NULL,
        \`document_file_url\` VARCHAR(500) NULL,
        \`gallery_images\` JSON NULL,
        \`multi_select_tags\` JSON NULL,
        \`json_metadata\` JSON NULL,
        \`repeater_data\` JSON NULL,
        \`created_by\` VARCHAR(255) NULL,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `, [], executingUserId, 'Ensure master_form_inputs table exists');
  } catch (e) {
    console.error('ensureMasterFormTable error:', e.message);
  }
};

const masterFormModel = {
  async getRecordById(id, category, executingUserId = 1) {
    await ensureMasterFormTable(executingUserId);
    const sql = category
      ? 'SELECT * FROM `master_form_inputs` WHERE `id` = ? AND `dropdown_selection` = ? LIMIT 1'
      : 'SELECT * FROM `master_form_inputs` WHERE `id` = ? LIMIT 1';
    const queryParams = category ? [id, category] : [id];

    const rows = await dbQuery(sql, queryParams, executingUserId, `Fetch single record ID: ${id}`);
    return rows[0] || null;
  },

  async getRecordsList({ category, search, page = 1, limit = 10, sortBy = 'id', sortOrder = 'asc' }, executingUserId = 1) {
    await ensureMasterFormTable(executingUserId);
    const safePage = Math.max(1, parseInt(page) || 1);
    const safeLimit = Math.max(1, Math.min(500, parseInt(limit) || 10));
    const offset = (safePage - 1) * safeLimit;

    const allowedSortCols = ['id', 'text_title', 'decimal_price', 'integer_qty', 'range_slider_value', 'created_at', 'updated_at'];
    const safeSortBy = allowedSortCols.includes(sortBy) ? sortBy : 'id';
    const safeSortOrder = ['asc', 'desc'].includes(String(sortOrder).toLowerCase()) ? sortOrder : 'asc';

    let selectSql = 'SELECT * FROM `master_form_inputs` WHERE 1=1';
    const queryParams = [];

    if (category) {
      selectSql += ' AND `dropdown_selection` = ?';
      queryParams.push(category);
    }

    if (search && search.trim()) {
      selectSql += ' AND (`text_title` LIKE ? OR `email` LIKE ? OR `phone` LIKE ? OR `slug` LIKE ?)';
      queryParams.push(`%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`);
    }

    selectSql += ` ORDER BY \`${safeSortBy}\` ${safeSortOrder} LIMIT ${safeLimit} OFFSET ${offset}`;

    try {
      return await dbQuery(selectSql, queryParams, executingUserId, 'Fetch paginated master_form_inputs');
    } catch (err) {
      console.warn('[masterFormModel getRecordsList fallback]:', err.message);
      return await dbQuery('SELECT * FROM `master_form_inputs` ORDER BY `id` ASC LIMIT ? OFFSET ?', [safeLimit, offset], executingUserId, 'Fallback fetch');
    }
  },

  async countRecords({ category, search }, executingUserId = 1) {
    await ensureMasterFormTable(executingUserId);
    let countSql = 'SELECT COUNT(*) as total FROM `master_form_inputs` WHERE 1=1';
    const queryParams = [];

    if (category) {
      countSql += ' AND `dropdown_selection` = ?';
      queryParams.push(category);
    }

    if (search && search.trim()) {
      countSql += ' AND (`text_title` LIKE ? OR `email` LIKE ? OR `phone` LIKE ? OR `slug` LIKE ?)';
      queryParams.push(`%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`);
    }

    try {
      const countRes = await dbQuery(countSql, queryParams, executingUserId, 'Fetch master_form_inputs count');
      return countRes[0]?.total || countRes[0]?.['COUNT(*)'] || 0;
    } catch (err) {
      const countRes = await dbQuery('SELECT COUNT(*) as total FROM `master_form_inputs`', [], executingUserId, 'Fallback count');
      return countRes[0]?.total || countRes[0]?.['COUNT(*)'] || 0;
    }
  },

  async createRecord(fields, category, executingUserId = 1) {
    await ensureMasterFormTable(executingUserId);
    const cleanFields = { ...fields };
    if (category && !cleanFields.dropdown_selection) {
      cleanFields.dropdown_selection = category;
    }

    // Auto-serialize JSON fields
    ['gallery_images', 'multi_select_tags', 'json_metadata', 'repeater_data'].forEach(jsonKey => {
      if (cleanFields[jsonKey] !== undefined && typeof cleanFields[jsonKey] === 'object' && cleanFields[jsonKey] !== null) {
        cleanFields[jsonKey] = JSON.stringify(cleanFields[jsonKey]);
      }
    });

    const columns = Object.keys(cleanFields);
    const placeholders = columns.map(() => '?').join(', ');
    const values = Object.values(cleanFields);

    const sql = `INSERT INTO \`master_form_inputs\` (${columns.map(c => `\`${c}\``).join(', ')}) VALUES (${placeholders})`;
    return dbQuery(sql, values, executingUserId, `Created record: "${cleanFields.text_title}"`);
  },

  async updateRecord(id, fields, category, executingUserId = 1) {
    await ensureMasterFormTable(executingUserId);
    const cleanFields = { ...fields };

    // Auto-serialize JSON fields
    ['gallery_images', 'multi_select_tags', 'json_metadata', 'repeater_data'].forEach(jsonKey => {
      if (cleanFields[jsonKey] !== undefined && typeof cleanFields[jsonKey] === 'object' && cleanFields[jsonKey] !== null) {
        cleanFields[jsonKey] = JSON.stringify(cleanFields[jsonKey]);
      }
    });

    const setClause = Object.keys(cleanFields).map(c => `\`${c}\` = ?`).join(', ');

    let sql, values;
    if (category) {
      sql = `UPDATE \`master_form_inputs\` SET ${setClause} WHERE \`id\` = ? AND \`dropdown_selection\` = ?`;
      values = [...Object.values(cleanFields), id, category];
    } else {
      sql = `UPDATE \`master_form_inputs\` SET ${setClause} WHERE \`id\` = ?`;
      values = [...Object.values(cleanFields), id];
    }

    return dbQuery(sql, values, executingUserId, `Updated record ID: ${id}`);
  },

  async deleteRecord(id, category, executingUserId = 1) {
    await ensureMasterFormTable(executingUserId);
    try {
      const sql = category
        ? 'DELETE FROM `master_form_inputs` WHERE `id` = ? AND `dropdown_selection` = ?'
        : 'DELETE FROM `master_form_inputs` WHERE `id` = ?';
      const queryParams = category ? [id, category] : [id];
      return await dbQuery(sql, queryParams, executingUserId, `Deleted record ID: ${id}`);
    } catch (e) {
      console.error('deleteRecord error:', e.message);
      throw e;
    }
  },

  async getRecordStatus(id, category) {
    const selectSql = category
      ? 'SELECT `switch_active` FROM `master_form_inputs` WHERE `id` = ? AND `dropdown_selection` = ? LIMIT 1'
      : 'SELECT `switch_active` FROM `master_form_inputs` WHERE `id` = ? LIMIT 1';
    const selectParams = category ? [id, category] : [id];

    const rows = await dbQuery(selectSql, selectParams);
    return rows[0] || null;
  },

  async updateRecordStatus(id, newStatus, category, executingUserId = 1) {
    await ensureMasterFormTable(executingUserId);
    const updateSql = category
      ? 'UPDATE `master_form_inputs` SET `switch_active` = ? WHERE `id` = ? AND `dropdown_selection` = ?'
      : 'UPDATE `master_form_inputs` SET `switch_active` = ? WHERE `id` = ?';
    const updateParams = category ? [newStatus, id, category] : [newStatus, id];

    return dbQuery(updateSql, updateParams, executingUserId, `Toggled active status of record ID: ${id}`);
  },

  async deleteRecords(ids, category, executingUserId = 1) {
    if (!ids || ids.length === 0) return;
    await ensureMasterFormTable(executingUserId);
    const placeholders = ids.map(() => '?').join(', ');
    const sql = category
      ? `DELETE FROM \`master_form_inputs\` WHERE \`id\` IN (${placeholders}) AND \`dropdown_selection\` = ?`
      : `DELETE FROM \`master_form_inputs\` WHERE \`id\` IN (${placeholders})`;
    const queryParams = category ? [...ids, category] : ids;

    return dbQuery(sql, queryParams, executingUserId, `Bulk deleted record IDs: ${ids.join(', ')}`);
  }
};

export default masterFormModel;
