import { dbQuery } from '../config/db.js';

const adminModel = {
    async getAdminsList({ search, page, limit, sortBy, sortOrder, showDeleted }, executingUserId) {
        const offset = (page - 1) * limit
        const isDeletedVal = showDeleted ? 1 : 0

        const allowedSortCols = ['id', 'name', 'email', 'createdOn']
        const safeSortBy = allowedSortCols.includes(sortBy) ? sortBy : 'id'
        const safeSortOrder = ['asc', 'desc'].includes(sortOrder.toLowerCase()) ? sortOrder : 'asc'

        let selectSql = `SELECT \`id\`, \`name\` as \`full_name\`, \`email\`, \`phone\`, \`profile_image\`, \`createdOn\` as \`created_at\` FROM \`admin\` WHERE \`isDeleted\` = ${isDeletedVal}`
        const params = []

        if (search) {
            selectSql += ' AND (`name` LIKE ? OR `email` LIKE ?)'
            params.push(`%${search}%`, `%${search}%`)
        }

        selectSql += ` ORDER BY ${safeSortBy} ${safeSortOrder} LIMIT ? OFFSET ?`
        const selectParams = [...params, limit, offset]

        return dbQuery(selectSql, selectParams, executingUserId, 'Fetch Admins List')
    },

    async countAdmins({ search, showDeleted }, executingUserId) {
        const isDeletedVal = showDeleted ? 1 : 0
        let countSql = `SELECT COUNT(*) as total FROM \`admin\` WHERE \`isDeleted\` = ${isDeletedVal}`
        const params = []

        if (search) {
            countSql += ' AND (`name` LIKE ? OR `email` LIKE ?)'
            params.push(`%${search}%`, `%${search}%`)
        }

        const countRes = await dbQuery(countSql, params, executingUserId, 'Fetch Admins Count')
        return countRes[0]?.total || 0
    },

    async getAdminByEmail(email) {
        const rows = await dbQuery(
            'SELECT * FROM `admin` WHERE `email` = ? AND `isDeleted` = 0 LIMIT 1',
            [email],
            0,
            'Admin Login Query'
        )
        return rows[0] || null
    },

    async getAdminById(id) {
        const rows = await dbQuery('SELECT * FROM `admin` WHERE `id` = ? LIMIT 1', [id])
        return rows[0] || null
    },

    async getActiveAdminByEmailAndExcludeId(email, id) {
        const rows = await dbQuery(
            'SELECT `id` FROM `admin` WHERE `email` = ? AND `id` != ? AND `isDeleted` = 0',
            [email, id]
        )
        return rows
    },

    async getActiveAdminByEmail(email) {
        const rows = await dbQuery('SELECT `id` FROM `admin` WHERE `email` = ? AND `isDeleted` = 0', [email])
        return rows
    },

    async createAdmin({ name, email, passwordHash, phone }, executingUserId) {
        let sql, params
        try {
            sql = 'INSERT INTO `admin` (`name`, `email`, `password`, `phone`) VALUES (?, ?, ?, ?)'
            params = [name, email, passwordHash, phone || null]
            return await dbQuery(sql, params, executingUserId, `Created admin account: ${name} (${email})`)
        } catch (err) {
            if (err.code === 'ER_BAD_FIELD_ERROR' || (err.message && err.message.includes('Unknown column'))) {
                sql = 'INSERT INTO `admin` (`name`, `email`, `password`) VALUES (?, ?, ?)'
                params = [name, email, passwordHash]
                return dbQuery(sql, params, executingUserId, `Created admin account: ${name} (${email})`)
            }
            throw err
        }
    },

    async updateAdmin(id, { name, email, phone, passwordHash, profile_image, primaryImageAction }, executingUserId) {
        let updateSql = 'UPDATE `admin` SET `name` = ?, `email` = ?'
        const queryParams = [name, email]

        if (phone !== undefined) {
            updateSql += ', `phone` = ?'
            queryParams.push(phone || null)
        }

        if (passwordHash) {
            updateSql += ', `password` = ?'
            queryParams.push(passwordHash)
        }

        if (primaryImageAction === 'remove') {
            updateSql += ', `profile_image` = NULL'
        } else if (profile_image !== undefined) {
            updateSql += ', `profile_image` = ?'
            queryParams.push(profile_image || null)
        }

        updateSql += ' WHERE `id` = ? AND `isDeleted` = 0'
        queryParams.push(id)

        try {
            return await dbQuery(updateSql, queryParams, executingUserId, `Updated admin details for user ID: ${id}`)
        } catch (err) {
            if (phone !== undefined && (err.code === 'ER_BAD_FIELD_ERROR' || (err.message && err.message.includes('Unknown column')))) {
                let fallbackSql = 'UPDATE `admin` SET `name` = ?, `email` = ?'
                const fallbackParams = [name, email]
                if (passwordHash) {
                    fallbackSql += ', `password` = ?'
                    fallbackParams.push(passwordHash)
                }
                fallbackSql += ' WHERE `id` = ? AND `isDeleted` = 0'
                fallbackParams.push(id)
                return dbQuery(fallbackSql, fallbackParams, executingUserId, `Updated admin details for user ID: ${id}`)
            }
            throw err
        }
    },

    async softDeleteAdmin(id, executingUserId) {
        return dbQuery(
            'UPDATE `admin` SET `isDeleted` = 1 WHERE `id` = ?',
            [id],
            executingUserId,
            `Soft-deleted admin user record ID: ${id}`
        )
    },

    async permanentlyDeleteAdmin(id, executingUserId) {
        await dbQuery(
            'DELETE FROM `admin` WHERE `id` = ?',
            [id],
            executingUserId,
            `Permanently deleted admin user record ID: ${id}`
        )
        return dbQuery('ALTER TABLE `admin` AUTO_INCREMENT = 1', [], executingUserId, 'Reset admin auto-increment pointer')
    },

    async restoreAdmin(id, executingUserId) {
        return dbQuery(
            'UPDATE `admin` SET `isDeleted` = 0 WHERE `id` = ?',
            [id],
            executingUserId,
            `Restored admin user record ID: ${id}`
        )
    },

    async getAdminPasswordHash(id) {
        const rows = await dbQuery('SELECT `password` FROM `admin` WHERE `id` = ? AND `isDeleted` = 0 LIMIT 1', [id])
        return rows[0] ? rows[0].password : null
    },

    async updateAdminPassword(id, passwordHash, executingUserId) {
        return dbQuery(
            'UPDATE `admin` SET `password` = ? WHERE `id` = ? AND `isDeleted` = 0',
            [passwordHash, id],
            executingUserId,
            `Admin ID ${id} changed their password`
        )
    },

    async softDeleteAdmins(ids, executingUserId) {
        if (!ids || ids.length === 0) return
        const placeholders = ids.map(() => '?').join(', ')
        return dbQuery(
            `UPDATE \`admin\` SET \`isDeleted\` = 1 WHERE \`id\` IN (${placeholders})`,
            ids,
            executingUserId,
            `Soft-deleted admin user record IDs: ${ids.join(', ')}`
        )
    },

    async permanentlyDeleteAdmins(ids, executingUserId) {
        if (!ids || ids.length === 0) return
        const placeholders = ids.map(() => '?').join(', ')
        await dbQuery(
            `DELETE FROM \`admin\` WHERE \`id\` IN (${placeholders})`,
            ids,
            executingUserId,
            `Permanently deleted admin user record IDs: ${ids.join(', ')}`
        )
        return dbQuery('ALTER TABLE `admin` AUTO_INCREMENT = 1', [], executingUserId, 'Reset admin auto-increment pointer')
    }
}

export default adminModel

