import { dbQuery } from '../config/db.js'

const adminModel = {
    async getAdminsList({ search, page, limit, sortBy, sortOrder, showDeleted }, executingUserId) {
        const offset = (page - 1) * limit
        const isDeletedVal = showDeleted ? 1 : 0

        const allowedSortCols = ['id', 'name', 'email', 'createdOn']
        const safeSortBy = allowedSortCols.includes(sortBy) ? sortBy : 'id'
        const safeSortOrder = ['asc', 'desc'].includes(sortOrder.toLowerCase()) ? sortOrder : 'asc'

        let selectSql = `SELECT \`id\`, \`fname\` as \`full_name\`, \`username\`, \`createdOn\` as \`created_at\` FROM \`admin\` WHERE \`isDeleted\` = ${isDeletedVal}`
        const params = []

        if (search) {
            selectSql += ' AND (`fname` LIKE ? OR `username` LIKE ?)'
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
            countSql += ' AND (`fname` LIKE ? OR `username` LIKE ?)'
            params.push(`%${search}%`, `%${search}%`)
        }

        const countRes = await dbQuery(countSql, params, executingUserId, 'Fetch Admins Count')
        return countRes[0]?.total || 0
    },

    async getAdminByUsername(username) {
        // Query active admin from DB matching username
        const rows = await dbQuery(
            'SELECT * FROM `admin` WHERE `username` = ? AND `deletedOn` IS NULL LIMIT 1',
            [username],
            0,
            'Admin Login Query'
        )
        return rows[0] || null
    },

    async getAdminById(id) {
        const rows = await dbQuery('SELECT * FROM `admin` WHERE `id` = ? LIMIT 1', [id])
        return rows[0] || null
    },

    async getActiveAdminByUsernameAndExcludeId(username, id) {
        const rows = await dbQuery(
            'SELECT `id` FROM `admin` WHERE `username` = ? AND `id` != ? AND `deletedOn` IS NULL',
            [username, id]
        )
        return rows
    },

    async getActiveAdminByUsername(username) {
        const rows = await dbQuery('SELECT `id` FROM `admin` WHERE `username` = ? AND `deletedOn` IS NULL', [username])
        return rows
    },

    async createAdmin({ name, email, passwordHash, phone }, executingUserId) {
        // Check if phone column exists — admins table may not have it
        let sql, params
        try {
            sql = 'INSERT INTO `admins` (`name`, `email`, `password`, `phone`) VALUES (?, ?, ?, ?)'
            params = [name, email, passwordHash, phone || null]
            return await dbQuery(sql, params, executingUserId, `Created admin account: ${name} (${email})`)
        } catch (err) {
            // Fallback: insert without phone column if it doesn't exist
            if (err.code === 'ER_BAD_FIELD_ERROR' || (err.message && err.message.includes('Unknown column'))) {
                sql = 'INSERT INTO `admins` (`name`, `email`, `password`) VALUES (?, ?, ?)'
                params = [name, email, passwordHash]
                return dbQuery(sql, params, executingUserId, `Created admin account: ${name} (${email})`)
            }
            throw err
        }
    },

    async updateAdmin(id, { name, email, phone, passwordHash, profile_image }, executingUserId) {
        let updateSql = 'UPDATE `admins` SET `name` = ?, `email` = ?'
        const queryParams = [name, email]

        // Include phone if provided (even if empty string to clear the field)
        if (phone !== undefined) {
            updateSql += ', `phone` = ?'
            queryParams.push(phone || null)
        }

        if (passwordHash) {
            updateSql += ', `password` = ?'
            queryParams.push(passwordHash)
        }

        if (profile_image !== undefined) {
            updateSql += ', `profile_image` = ?'
            queryParams.push(profile_image || null)
        }

        updateSql += ' WHERE `id` = ? AND `isDeleted` = 0'
        queryParams.push(id)

        try {
            return await dbQuery(updateSql, queryParams, executingUserId, `Updated admin details for user ID: ${id}`)
        } catch (err) {
            // Fallback: retry without phone column if it doesn't exist
            if (phone !== undefined && (err.code === 'ER_BAD_FIELD_ERROR' || (err.message && err.message.includes('Unknown column')))) {
                let fallbackSql = 'UPDATE `admins` SET `name` = ?, `email` = ?'
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
            'UPDATE `admins` SET `isDeleted` = 1 WHERE `id` = ?',
            [id],
            executingUserId,
            `Soft-deleted admin user record ID: ${id}`
        )
    },

    async permanentlyDeleteAdmin(id, executingUserId) {
        await dbQuery(
            'DELETE FROM `admins` WHERE `id` = ?',
            [id],
            executingUserId,
            `Permanently deleted admin user record ID: ${id}`
        )
        return dbQuery('ALTER TABLE `admins` AUTO_INCREMENT = 1', [], executingUserId, 'Reset admin auto-increment pointer')
    },

    async restoreAdmin(id, executingUserId) {
        return dbQuery(
            'UPDATE `admins` SET `isDeleted` = 0 WHERE `id` = ?',
            [id],
            executingUserId,
            `Restored admin user record ID: ${id}`
        )
    },

    async getAdminPasswordHash(id) {
        const rows = await dbQuery('SELECT `password` FROM `admins` WHERE `id` = ? AND `isDeleted` = 0 LIMIT 1', [id])
        return rows[0] ? rows[0].password : null
    },

    async updateAdminPassword(id, passwordHash, executingUserId) {
        return dbQuery(
            'UPDATE `admins` SET `password` = ? WHERE `id` = ? AND `isDeleted` = 0',
            [passwordHash, id],
            executingUserId,
            `Admin ID ${id} changed their password`
        )
    },

    async storePasswordResetOtp({ adminId, email, otp, expiresAt }, executingUserId) {
        // Schema auto-creation (development-only fallback helper)
        await dbQuery(
            `CREATE TABLE IF NOT EXISTS \`admin_password_resets\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`admin_id\` INT NOT NULL,
                \`email\` VARCHAR(255) NOT NULL,
                \`otp\` VARCHAR(10) NOT NULL,
                \`expires_at\` DATETIME NOT NULL,
                \`used\` TINYINT(1) DEFAULT 0,
                \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
            )`
        )

        await dbQuery('UPDATE `admin_password_resets` SET `used` = 1 WHERE `email` = ?', [email])
        return dbQuery(
            'INSERT INTO `admin_password_resets` (`admin_id`, `email`, `otp`, `expires_at`) VALUES (?, ?, ?, ?)',
            [adminId, email, otp, expiresAt],
            executingUserId,
            `Password reset OTP generated for admin: ${email}`
        )
    },

    async getValidPasswordResetOtp(email, otp) {
        const rows = await dbQuery(
            `SELECT * FROM \`admin_password_resets\`
             WHERE \`email\` = ? AND \`otp\` = ? AND \`used\` = 0 AND \`expires_at\` > NOW()
             ORDER BY \`id\` DESC LIMIT 1`,
            [email, String(otp)]
        )
        return rows[0] || null
    },

    async markPasswordResetOtpUsed(id) {
        return dbQuery('UPDATE `admin_password_resets` SET `used` = 1 WHERE `id` = ?', [id])
    },

    async softDeleteAdmins(ids, executingUserId) {
        if (!ids || ids.length === 0) return
        const placeholders = ids.map(() => '?').join(', ')
        return dbQuery(
            `UPDATE \`admins\` SET \`isDeleted\` = 1 WHERE \`id\` IN (${placeholders})`,
            ids,
            executingUserId,
            `Soft-deleted admin user record IDs: ${ids.join(', ')}`
        )
    },

    async permanentlyDeleteAdmins(ids, executingUserId) {
        if (!ids || ids.length === 0) return
        const placeholders = ids.map(() => '?').join(', ')
        await dbQuery(
            `DELETE FROM \`admins\` WHERE \`id\` IN (${placeholders})`,
            ids,
            executingUserId,
            `Permanently deleted admin user record IDs: ${ids.join(', ')}`
        )
        return dbQuery('ALTER TABLE `admins` AUTO_INCREMENT = 1', [], executingUserId, 'Reset admin auto-increment pointer')
    }
}

export default adminModel
