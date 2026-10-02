import adminModel from '../models/adminModel.js';
import { hashPassword, verifyPassword } from '../utils/authHelper.js';

export async function changePassword(req, res) {
    const executingUserId = req.user?.id || 1
    try {
        const { currentPassword, newPassword } = req.body
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Current password and new password are required.' })
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' })
        }

        const storedHash = await adminModel.getAdminPasswordHash(executingUserId);
        if (storedHash && !verifyPassword(currentPassword, storedHash)) {
            return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
        }

        const newHash = hashPassword(newPassword);
        await adminModel.updateAdminPassword(executingUserId, newHash, executingUserId);

        return res.json({ success: true, message: 'Password changed successfully.' })
    } catch (err) {
        console.error('[Change Password API Error]', err)
        return res.status(500).json({ success: false, message: 'Internal server error.' })
    }
}

export async function getAdmins(req, res) {
    try {
        const executingUserId = req.user?.id || 1;
        const showDeleted = req.query.deleted === 'true' || req.query.status === 'deleted' || req.query.isDeleted === '1';
        const search = req.query.search || '';
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const sortBy = req.query.sort_by || 'id';
        const sortOrder = req.query.sort_order || 'asc';

        const rows = await adminModel.getAdminsList({ search, page, limit, sortBy, sortOrder, showDeleted }, executingUserId);
        const total = await adminModel.countAdmins({ search, showDeleted }, executingUserId);

        return res.json({
            success: true,
            data: rows,
            meta: {
                pagination: {
                    totalItems: total,
                    totalPages: Math.ceil(total / limit) || 1,
                    currentPage: page,
                    itemsPerPage: limit
                }
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}

export async function createAdmin(req, res) {
    try {
        const executingUserId = req.user?.id || 1;
        const { full_name, name, email, phone, password, role } = req.body;
        const adminName = full_name || name || 'New Admin';
        const passwordHash = password ? hashPassword(password) : hashPassword('admin123');
        const profile_image = req.body.profile_image || req.body.primary_image_url || '';

        const result = await adminModel.createAdmin({
            name: adminName,
            email,
            phone,
            passwordHash,
            role: role || 'admin',
            profile_image
        }, executingUserId);

        return res.status(201).json({ success: true, message: 'Admin account created successfully.', data: { id: result.insertId || result } });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}

export async function getAdminById(req, res) {
    const { id } = req.params;
    if (id === 'change-password' || id === 'change_password') {
        return res.status(400).json({ success: false, message: 'Invalid admin ID' });
    }
    try {
        const admin = await adminModel.getAdminById(id);
        if (!admin) {
            return res.status(404).json({ success: false, message: 'Admin not found.' });
        }
        return res.json({ success: true, data: admin });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}

export async function updateAdmin(req, res) {
    const { id } = req.params;
    if (id === 'change-password' || id === 'change_password') {
        return changePassword(req, res);
    }
    if (req.body?.action === 'restore') {
        return restoreAdmin(req, res);
    }
    try {
        const executingUserId = req.user?.id || 1;
        const { full_name, name, email, phone, password, primaryImageAction } = req.body;
        const adminName = full_name || name;
        const passwordHash = password ? hashPassword(password) : undefined;
        const profile_image = req.body.profile_image || req.body.primary_image_url;

        await adminModel.updateAdmin(id, {
            name: adminName,
            email,
            phone,
            passwordHash,
            profile_image,
            primaryImageAction
        }, executingUserId);

        return res.json({ success: true, message: 'Admin updated successfully.' });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}

export async function deleteAdmin(req, res) {
    try {
        const { id } = req.params;
        const executingUserId = req.user?.id || 1;
        const permanent = req.query.permanent === 'true' || req.body?.permanent === true || req.body?.permanent === 'true';

        if (permanent) {
            await adminModel.permanentlyDeleteAdmin(id, executingUserId);
            return res.json({ success: true, message: 'Admin permanently deleted.' });
        } else {
            await adminModel.softDeleteAdmin(id, executingUserId);
            return res.json({ success: true, message: 'Admin moved to trash.' });
        }
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}

export async function restoreAdmin(req, res) {
    try {
        const id = req.params.id || req.body?.id;
        const executingUserId = req.user?.id || 1;
        await adminModel.restoreAdmin(id, executingUserId);
        return res.json({ success: true, message: 'Admin restored successfully.' });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}

export async function bulkDeleteAdmins(req, res) {
    try {
        const executingUserId = req.user?.id || 1;
        const ids = req.body?.ids || req.body?.selectedIds || [];
        const permanent = req.query?.permanent === 'true' || req.body?.permanent === true || req.body?.permanent === 'true';

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, message: 'No admin IDs provided.' });
        }

        if (permanent) {
            await adminModel.permanentlyDeleteAdmins(ids, executingUserId);
            return res.json({ success: true, message: 'Admins permanently deleted.' });
        } else {
            await adminModel.softDeleteAdmins(ids, executingUserId);
            return res.json({ success: true, message: 'Admins moved to trash.' });
        }
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
}

const adminController = {
    changePassword,
    getAdmins,
    createAdmin,
    getAdminById,
    updateAdmin,
    deleteAdmin,
    restoreAdmin,
    bulkDeleteAdmins
};

export default adminController;
