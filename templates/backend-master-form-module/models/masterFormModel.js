const { dbQuery } = require('../config/db')

const masterFormModel = {
    async getRecordById(id, category, executingUserId) {
        const sql = category
            ? 'SELECT * FROM `master_form_inputs` WHERE `id` = ? AND `dropdown_selection` = ? LIMIT 1'
            : 'SELECT * FROM `master_form_inputs` WHERE `id` = ? LIMIT 1'
        const queryParams = category ? [id, category] : [id]

        const rows = await dbQuery(sql, queryParams, executingUserId, `Fetch single record ID: ${id}`)
        return rows[0] || null
    },

    async getRecordsList({ category, search, page, limit, sortBy, sortOrder }, executingUserId) {
        const offset = (page - 1) * limit
        const allowedSortCols = ['id', 'text_title', 'decimal_price', 'integer_qty', 'created_at']
        const safeSortBy = allowedSortCols.includes(sortBy) ? sortBy : 'id'
        const safeSortOrder = ['asc', 'desc'].includes(sortOrder.toLowerCase()) ? sortOrder : 'asc'

        let selectSql
        const queryParams = []

        if (category) {
            selectSql = 'SELECT * FROM `master_form_inputs` WHERE `dropdown_selection` = ?'
            queryParams.push(category)
        } else {
            selectSql = 'SELECT * FROM `master_form_inputs` WHERE 1=1'
        }

        if (search) {
            selectSql += ' AND (`text_title` LIKE ? OR `email` LIKE ? OR `phone` LIKE ?)'
            queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`)
        }

        selectSql += ` ORDER BY ${safeSortBy} ${safeSortOrder} LIMIT ? OFFSET ?`
        const selectParams = [...queryParams, limit, offset]

        return dbQuery(selectSql, selectParams, executingUserId, `Fetch paginated records`)
    },

    async countRecords({ category, search }, executingUserId) {
        let countSql
        const queryParams = []

        if (category) {
            countSql = 'SELECT COUNT(*) as total FROM `master_form_inputs` WHERE `dropdown_selection` = ?'
            queryParams.push(category)
        } else {
            countSql = 'SELECT COUNT(*) as total FROM `master_form_inputs` WHERE 1=1'
        }

        if (search) {
            countSql += ' AND (`text_title` LIKE ? OR `email` LIKE ? OR `phone` LIKE ?)'
            queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`)
        }

        const countRes = await dbQuery(countSql, queryParams, executingUserId, `Fetch record count`)
        return countRes[0]?.total || 0
    },

    async createRecord(fields, category, executingUserId) {
        const columns = Object.keys(fields)
        const placeholders = columns.map(() => '?').join(', ')
        const values = Object.values(fields)

        const sql = `INSERT INTO \`master_form_inputs\` (${columns.map(c => `\`${c}\``).join(', ')}) VALUES (${placeholders})`
        return dbQuery(sql, values, executingUserId, `Created ${category} record: "${fields.text_title}"`)
    },

    async updateRecord(id, fields, category, executingUserId) {
        const setClause = Object.keys(fields).map(c => `\`${c}\` = ?`).join(', ')

        let sql, values
        if (category) {
            sql = `UPDATE \`master_form_inputs\` SET ${setClause} WHERE \`id\` = ? AND \`dropdown_selection\` = ?`
            values = [...Object.values(fields), id, category]
        } else {
            sql = `UPDATE \`master_form_inputs\` SET ${setClause} WHERE \`id\` = ?`
            values = [...Object.values(fields), id]
        }

        return dbQuery(sql, values, executingUserId, `Updated record ID: ${id} ("${fields.text_title}")`)
    },

    async deleteRecord(id, category, executingUserId) {
        const sql = category
            ? 'DELETE FROM `master_form_inputs` WHERE `id` = ? AND `dropdown_selection` = ?'
            : 'DELETE FROM `master_form_inputs` WHERE `id` = ?'
        const queryParams = category ? [id, category] : [id]

        return dbQuery(sql, queryParams, executingUserId, `Deleted record ID: ${id}`)
    },

    async getRecordStatus(id, category) {
        const selectSql = category
            ? 'SELECT `switch_active` FROM `master_form_inputs` WHERE `id` = ? AND `dropdown_selection` = ? LIMIT 1'
            : 'SELECT `switch_active` FROM `master_form_inputs` WHERE `id` = ? LIMIT 1'
        const selectParams = category ? [id, category] : [id]

        const rows = await dbQuery(selectSql, selectParams)
        return rows[0] || null
    },

    async updateRecordStatus(id, newStatus, category, executingUserId) {
        const updateSql = category
            ? 'UPDATE `master_form_inputs` SET `switch_active` = ? WHERE `id` = ? AND `dropdown_selection` = ?'
            : 'UPDATE `master_form_inputs` SET `switch_active` = ? WHERE `id` = ?'
        const updateParams = category ? [newStatus, id, category] : [newStatus, id]

        return dbQuery(updateSql, updateParams, executingUserId, `Toggled active status of record ID: ${id} to ${newStatus}`)
    },

    async deleteRecords(ids, category, executingUserId) {
        if (!ids || ids.length === 0) return
        const placeholders = ids.map(() => '?').join(', ')
        const sql = category
            ? `DELETE FROM \`master_form_inputs\` WHERE \`id\` IN (${placeholders}) AND \`dropdown_selection\` = ?`
            : `DELETE FROM \`master_form_inputs\` WHERE \`id\` IN (${placeholders})`
        const queryParams = category ? [...ids, category] : ids

        return dbQuery(sql, queryParams, executingUserId, `Deleted record IDs: ${ids.join(', ')}`)
    }
}

module.exports = masterFormModel
