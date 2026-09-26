const { dbQuery } = require('../config/db')

const portfolioModel = {
    async getRecordById(id, executingUserId) {
        const sql = 'SELECT * FROM `portfolio_cards` WHERE `id` = ? LIMIT 1'
        const rows = await dbQuery(sql, [id], executingUserId, `Fetch portfolio card ID: ${id}`)
        return rows[0] || null
    },

    async getRecordsList({ search, category, page, limit, sortBy, sortOrder }, executingUserId) {
        const offset = (page - 1) * limit
        const allowedSortCols = ['id', 'title', 'category', 'created_at']
        const safeSortBy = allowedSortCols.includes(sortBy) ? sortBy : 'id'
        const safeSortOrder = ['asc', 'desc'].includes(sortOrder.toLowerCase()) ? sortOrder : 'asc'

        let selectSql = 'SELECT * FROM `portfolio_cards` WHERE 1=1'
        const queryParams = []

        if (category) {
            selectSql += ' AND `category` = ?'
            queryParams.push(category)
        }

        if (search) {
            selectSql += ' AND (`title` LIKE ? OR `description` LIKE ?)'
            queryParams.push(`%${search}%`, `%${search}%`)
        }

        selectSql += ` ORDER BY ${safeSortBy} ${safeSortOrder} LIMIT ? OFFSET ?`
        const selectParams = [...queryParams, limit, offset]

        return dbQuery(selectSql, selectParams, executingUserId, `Fetch paginated portfolio cards`)
    },

    async countRecords({ search, category }, executingUserId) {
        let countSql = 'SELECT COUNT(*) as total FROM `portfolio_cards` WHERE 1=1'
        const queryParams = []

        if (category) {
            countSql += ' AND `category` = ?'
            queryParams.push(category)
        }

        if (search) {
            countSql += ' AND (`title` LIKE ? OR `description` LIKE ?)'
            queryParams.push(`%${search}%`, `%${search}%`)
        }

        const countRes = await dbQuery(countSql, queryParams, executingUserId, `Fetch portfolio cards count`)
        return countRes[0]?.total || 0
    },

    async getCategoriesSummary(executingUserId) {
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
        `
        return dbQuery(sql, [], executingUserId, 'Fetch portfolio categories summary')
    },

    async createRecord(fields, executingUserId) {
        const columns = Object.keys(fields)
        const placeholders = columns.map(() => '?').join(', ')
        const values = Object.values(fields)

        const sql = `INSERT INTO \`portfolio_cards\` (${columns.map(c => `\`${c}\``).join(', ')}) VALUES (${placeholders})`
        return dbQuery(sql, values, executingUserId, `Created portfolio card: "${fields.title}"`)
    },

    async updateRecord(id, fields, executingUserId) {
        const setClause = Object.keys(fields).map(c => `\`${c}\` = ?`).join(', ')
        const sql = `UPDATE \`portfolio_cards\` SET ${setClause} WHERE \`id\` = ?`
        const values = [...Object.values(fields), id]

        return dbQuery(sql, values, executingUserId, `Updated portfolio card ID: ${id}`)
    },

    async deleteRecord(id, executingUserId) {
        const sql = 'DELETE FROM `portfolio_cards` WHERE `id` = ?'
        return dbQuery(sql, [id], executingUserId, `Deleted portfolio card ID: ${id}`)
    },

    async updateRecordStatus(id, newStatus, executingUserId) {
        const sql = 'UPDATE `portfolio_cards` SET `switch_active` = ? WHERE `id` = ?'
        return dbQuery(sql, [newStatus, id], executingUserId, `Toggled active status of portfolio card ID: ${id} to ${newStatus}`)
    },

    async deleteRecords(ids, executingUserId) {
        if (!ids || ids.length === 0) return
        const placeholders = ids.map(() => '?').join(', ')
        const sql = `DELETE FROM \`portfolio_cards\` WHERE \`id\` IN (${placeholders})`
        return dbQuery(sql, ids, executingUserId, `Bulk deleted portfolio card IDs: ${ids.join(', ')}`)
    }
}

module.exports = portfolioModel
