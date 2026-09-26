const adminModel = require('../models/adminModel')
const { verifyPassword, hashPassword } = require('../utils/authHelper')

const adminController = {
    // PUT /api/admin/change-password
    async changePassword(req, res) {
        const executingUserId = req.user.id
        try {
            const { currentPassword, newPassword } = req.body
            if (!currentPassword || !newPassword) {
                return res.status(400).json({ success: false, message: 'Current password and new password are required.' })
            }

            if (newPassword.length < 6) {
                return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' })
            }

            const currentHash = await adminModel.getAdminPasswordHash(executingUserId)
            if (!currentHash) {
                return res.status(404).json({ success: false, message: 'Admin account not found.' })
            }

            const isMatch = verifyPassword(currentPassword, currentHash)
            if (!isMatch) {
                return res.status(400).json({ success: false, message: 'Current password is incorrect.' })
            }

            const newHash = hashPassword(newPassword)
            await adminModel.updateAdminPassword(executingUserId, newHash, executingUserId)

            return res.json({ success: true, message: 'Password changed successfully.' })
        } catch (err) {
            console.error('[Change Password API Error]', err)
            return res.status(500).json({ success: false, message: 'Internal server error.' })
        }
    },

    // GET /api/admin/admins
    async getAdmins(req, res) {
        const executingUserId = req.user.id
        try {
            const page = parseInt(req.query.page || '1')
            const limit = parseInt(req.query.limit || '10')
            const sortBy = req.query.sort_by || 'id'
            const sortOrder = req.query.sort_order || 'asc'
            const search = req.query.search || ''
            const showDeleted = req.query.deleted === 'true'

            const totalItems = await adminModel.countAdmins({ search, showDeleted }, executingUserId)
            const totalPages = Math.ceil(totalItems / limit)

            const rows = await adminModel.getAdminsList({ search, page, limit, sortBy, sortOrder, showDeleted }, executingUserId)

            return res.json({
                success: true,
                data: rows,
                meta: {
                    pagination: { totalItems, totalPages, currentPage: page, itemsPerPage: limit }
                }
            })
        } catch (err) {
            console.error('[Admins GET API Error]', err)
            return res.status(500).json({ success: false, message: 'Internal server error while fetching admins.' })
        }
    },

    // POST /api/admin/admins
    async createAdmin(req, res) {
        const executingUserId = req.user.id
        try {
            const { full_name, email, password, phone } = req.body
            if (!full_name || !email || !password) {
                return res.status(400).json({ success: false, message: 'Full name, email, and password are required.' })
            }

            const existing = await adminModel.getActiveAdminByEmail(email)
            if (existing && existing.length > 0) {
                return res.status(400).json({ success: false, message: 'An admin with this email already exists.' })
            }

            const pwdHash = hashPassword(password)
            const insertRes = await adminModel.createAdmin({ name: full_name, email, passwordHash: pwdHash, phone }, executingUserId)

            return res.json({
                success: true,
                message: 'Admin account created successfully.',
                data: { id: insertRes.insertId }
            })
        } catch (err) {
            console.error('[Admins POST API Error]', err)
            return res.status(500).json({ success: false, message: 'Internal server error while registering admin.' })
        }
    },

    // GET /api/admin/admins/:id
    async getAdminById(req, res) {
        try {
            const { id } = req.params
            const admin = await adminModel.getAdminById(id)
            if (!admin) {
                return res.status(404).json({ success: false, message: 'Admin not found.' })
            }

            return res.json({
                success: true,
                data: {
                    id: admin.id,
                    full_name: admin.name ?? admin.full_name ?? '',
                    name: admin.name ?? admin.full_name ?? '',
                    email: admin.email,
                    phone: admin.phone ?? '-',
                    profile_image: admin.profile_image || '',
                    isDeleted: admin.isDeleted ?? 0,
                    isActive: (admin.isDeleted ?? 0) === 0,
                    created_at: admin.createdOn ?? admin.created_at ?? admin.createdAt
                }
            })
        } catch (err) {
            console.error('[Admin GET API Error]', err)
            return res.status(500).json({ success: false, message: 'Internal server error while fetching admin.' })
        }
    },

    // PUT /api/admin/admins/:id
    async updateAdmin(req, res) {
        const executingUserId = req.user.id
        try {
            const { id } = req.params
            const { full_name, email, password, phone } = req.body

            if (!full_name || !email) {
                return res.status(400).json({ success: false, message: 'Full name and email are required.' })
            }

            const existing = await adminModel.getActiveAdminByEmailAndExcludeId(email, id)
            if (existing && existing.length > 0) {
                return res.status(400).json({ success: false, message: 'This email is already in use by another admin.' })
            }

            const passwordHash = password ? hashPassword(password) : null
            let profile_image = req.body.primary_image_url !== undefined ? req.body.primary_image_url : undefined
            if (req.body.primaryImageAction === 'remove') {
                profile_image = ''
            }

            await adminModel.updateAdmin(id, { name: full_name, email, phone, passwordHash, profile_image }, executingUserId)

            return res.json({ success: true, message: 'Admin updated successfully.' })
        } catch (err) {
            console.error('[Admin PUT API Error]', err)
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ success: false, message: 'This email is already in use by another admin.' })
            }
            return res.status(500).json({ success: false, message: 'Internal server error while updating admin.' })
        }
    },

    // DELETE /api/admin/admins/:id
    async deleteAdmin(req, res) {
        const executingUserId = req.user.id
        try {
            const { id } = req.params
            const permanent = req.query.permanent === 'true'

            if (permanent) {
                await adminModel.permanentlyDeleteAdmin(id, executingUserId)
            } else {
                await adminModel.softDeleteAdmin(id, executingUserId)
            }

            return res.json({
                success: true,
                message: permanent ? 'Admin permanently deleted.' : 'Admin deleted successfully.'
            })
        } catch (err) {
            console.error('[Admin DELETE API Error]', err)
            return res.status(500).json({ success: false, message: 'Internal server error while deleting admin.' })
        }
    },

    // PATCH /api/admin/admins/:id
    async restoreAdmin(req, res) {
        const executingUserId = req.user.id
        try {
            const { id } = req.params
            const { action } = req.body

            if (action === 'restore') {
                await adminModel.restoreAdmin(id, executingUserId)
                return res.json({ success: true, message: 'Admin restored successfully.' })
            }

            return res.status(400).json({ success: false, message: 'Invalid action.' })
        } catch (err) {
            console.error('[Admin PATCH API Error]', err)
            return res.status(500).json({ success: false, message: 'Internal server error while updating admin.' })
        }
    },

    async bulkDeleteAdmins(req, res) {
        const executingUserId = req.user.id
        try {
            const { ids } = req.body
            const permanent = req.query.permanent === 'true'

            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({ success: false, message: 'No admin IDs provided for deletion.' })
            }

            if (permanent) {
                await adminModel.permanentlyDeleteAdmins(ids, executingUserId)
            } else {
                await adminModel.softDeleteAdmins(ids, executingUserId)
            }

            return res.json({
                success: true,
                message: permanent ? 'Admins permanently deleted.' : 'Admins deleted successfully.'
            })
        } catch (err) {
            console.error('[Admins Bulk DELETE API Error]', err)
            return res.status(500).json({ success: false, message: 'Internal server error while bulk deleting admins.' })
        }
    }
}

module.exports = adminController
