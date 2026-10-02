import { dbQuery } from '../config/db.js'

const adminModel = {
    async ensureAdminTable(executingUserId = 0) {
        try {
            await dbQuery(`
                CREATE TABLE IF NOT EXISTS \`admin\` (
                    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                    \`username\` VARCHAR(255) DEFAULT 'admin',
                    \`email\` VARCHAR(255) DEFAULT 'admin@gmail.com',
                    \`name\` VARCHAR(255) DEFAULT 'Admin User',
                    \`full_name\` VARCHAR(255) DEFAULT 'Admin User',
                    \`password\` VARCHAR(255) NOT NULL,
                    \`phone\` VARCHAR(50) NULL,
                    \`role\` VARCHAR(50) DEFAULT 'admin',
                    \`profile_image\` VARCHAR(500) NULL,
                    \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
                    \`createdOn\` DATETIME DEFAULT CURRENT_TIMESTAMP,
                    \`isDeleted\` TINYINT(1) DEFAULT 0
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            `, [], executingUserId, 'Ensure admin table');

            const countRes = await dbQuery('SELECT COUNT(*) as total FROM `admin`', [], executingUserId, 'Check admin count').catch(() => []);
            if (!countRes[0] || countRes[0].total === 0) {
                const defaultHash = '0192023a7bbd73250516f069df18b500'; // md5('admin123')
                await dbQuery(
                    'INSERT INTO `admin` (`username`, `email`, `name`, `full_name`, `password`, `role`, `isDeleted`) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    ['admin', 'admin@gmail.com', 'Admin User', 'Admin User', defaultHash, 'admin', 0],
                    executingUserId,
                    'Seed default admin'
                ).catch(() => {});
            }

            try {
                const cols = await dbQuery("SHOW COLUMNS FROM `admin`", [], executingUserId, 'Check admin columns').catch(() => []);
                const existingCols = new Set((cols || []).map(c => c.Field || c.field || c.COLUMN_NAME));

                if (!existingCols.has('profile_image')) {
                    await dbQuery('ALTER TABLE `admin` ADD COLUMN `profile_image` VARCHAR(500) NULL', [], executingUserId, 'Add profile_image column').catch(() => {});
                }
                if (!existingCols.has('phone')) {
                    await dbQuery('ALTER TABLE `admin` ADD COLUMN `phone` VARCHAR(50) NULL', [], executingUserId, 'Add phone column').catch(() => {});
                }
                if (!existingCols.has('full_name')) {
                    await dbQuery('ALTER TABLE `admin` ADD COLUMN `full_name` VARCHAR(255) NULL', [], executingUserId, 'Add full_name column').catch(() => {});
                }
            } catch (e) {}
        } catch (err) {
            // Safe fallback
        }
    },

    async getAdminsList({ search, page, limit, sortBy, sortOrder, showDeleted }, executingUserId) {
        await this.ensureAdminTable(executingUserId);
        const offset = (page - 1) * limit
        const isDeletedVal = showDeleted ? 1 : 0

        const allowedSortCols = ['id', 'name', 'email', 'createdOn']
        const safeSortBy = allowedSortCols.includes(sortBy) ? sortBy : 'id'
        const safeSortOrder = ['asc', 'desc'].includes(sortOrder.toLowerCase()) ? sortOrder : 'asc'

        let selectSql = `SELECT \`id\`, \`name\` as \`full_name\`, \`username\`, \`email\`, \`phone\`, \`profile_image\`, \`createdOn\` as \`created_at\` FROM \`admin\` WHERE \`isDeleted\` = ${isDeletedVal}`
        const params = []

        if (search) {
            selectSql += ' AND (`name` LIKE ? OR `username` LIKE ? OR `email` LIKE ?)'
            params.push(`%${search}%`, `%${search}%`, `%${search}%`)
        }

        selectSql += ` ORDER BY ${safeSortBy} ${safeSortOrder} LIMIT ? OFFSET ?`
        const selectParams = [...params, limit, offset]

        return dbQuery(selectSql, selectParams, executingUserId, 'Fetch Admins List')
    },

    async countAdmins({ search, showDeleted }, executingUserId) {
        await this.ensureAdminTable(executingUserId);
        const isDeletedVal = showDeleted ? 1 : 0
        let countSql = `SELECT COUNT(*) as total FROM \`admin\` WHERE \`isDeleted\` = ${isDeletedVal}`
        const params = []

        if (search) {
            countSql += ' AND (`name` LIKE ? OR `username` LIKE ? OR `email` LIKE ?)'
            params.push(`%${search}%`, `%${search}%`, `%${search}%`)
        }

        const countRes = await dbQuery(countSql, params, executingUserId, 'Fetch Admins Count')
        return countRes[0]?.total || 0
    },

    async getAdminByUsername(identifier) {
        await this.ensureAdminTable();
        const clean = String(identifier || '').trim();
        if (!clean) return null;

        // 1. Direct query by username (present in all schemas)
        try {
            const rows = await dbQuery(
                'SELECT * FROM `admin` WHERE `username` = ? AND (`isDeleted` = 0 OR `isDeleted` IS NULL) LIMIT 1',
                [clean],
                0,
                'Admin Login Query by Username'
            );
            if (rows && rows.length > 0) return rows[0];
        } catch (e) {
            try {
                const rows = await dbQuery('SELECT * FROM `admin` WHERE `username` = ? LIMIT 1', [clean], 0, 'Admin Login by Username simple');
                if (rows && rows.length > 0) return rows[0];
            } catch (err) {}
        }

        // 2. Query by email (if email column exists)
        try {
            const rows = await dbQuery(
                'SELECT * FROM `admin` WHERE `email` = ? AND (`isDeleted` = 0 OR `isDeleted` IS NULL) LIMIT 1',
                [clean],
                0,
                'Admin Login Query by Email'
            );
            if (rows && rows.length > 0) return rows[0];
        } catch (e) {
            // Email column might not exist in some schemas, safe to ignore
        }

        // 3. Query by fname or name (if present)
        try {
            const rows = await dbQuery(
                'SELECT * FROM `admin` WHERE (`fname` = ? OR `name` = ?) AND (`isDeleted` = 0 OR `isDeleted` IS NULL) LIMIT 1',
                [clean, clean],
                0,
                'Admin Login Query by Name'
            );
            if (rows && rows.length > 0) return rows[0];
        } catch (e) {
            try {
                const rows = await dbQuery(
                    'SELECT * FROM `admin` WHERE `fname` = ? AND (`isDeleted` = 0 OR `isDeleted` IS NULL) LIMIT 1',
                    [clean],
                    0,
                    'Admin Login Query by fname'
                );
                if (rows && rows.length > 0) return rows[0];
            } catch (err) {}
        }

        // 4. Also check in `admins` table if plural table exists
        try {
            const rows = await dbQuery(
                'SELECT * FROM `admins` WHERE (`email` = ? OR `name` = ?) AND (`isDeleted` = 0 OR `isDeleted` IS NULL) LIMIT 1',
                [clean, clean],
                0,
                'Admins Plural Login Query'
            );
            if (rows && rows.length > 0) return rows[0];
        } catch (e) {}

        return null;
    },

    async getAdminByEmail(email) {
        return this.getAdminByUsername(email);
    },

    async getAdminById(id) {
        await this.ensureAdminTable();
        const rows = await dbQuery('SELECT * FROM `admin` WHERE `id` = ? LIMIT 1', [id])
        return rows[0] || null
    },

    async getActiveAdminByUsernameAndExcludeId(username, id) {
        try {
            const rows = await dbQuery(
                'SELECT `id` FROM `admin` WHERE `username` = ? AND `id` != ? AND (`isDeleted` = 0 OR `isDeleted` IS NULL)',
                [username, id]
            )
            return rows
        } catch {
            const rows = await dbQuery(
                'SELECT `id` FROM `admin` WHERE `username` = ? AND `id` != ?',
                [username, id]
            )
            return rows
        }
    },

    async getActiveAdminByUsername(username) {
        try {
            const rows = await dbQuery('SELECT `id` FROM `admin` WHERE `username` = ? AND (`isDeleted` = 0 OR `isDeleted` IS NULL)', [username])
            return rows
        } catch {
            const rows = await dbQuery('SELECT `id` FROM `admin` WHERE `username` = ?', [username])
            return rows
        }
    },

    async createAdmin({ name, email, passwordHash, phone }, executingUserId) {
        // Check if phone column exists — admins table may not have it
        let sql, params
        try {
            sql = 'INSERT INTO `admin` (`name`, `email`, `password`, `phone`) VALUES (?, ?, ?, ?)'
            params = [name, email, passwordHash, phone || null]
            return await dbQuery(sql, params, executingUserId, `Created admin account: ${name} (${email})`)
        } catch (err) {
            // Fallback: insert without phone column if it doesn't exist
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

        // Include phone if provided (even if empty string to clear the field)
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
            // Fallback: retry without phone column if it doesn't exist
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
