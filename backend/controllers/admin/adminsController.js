import * as adminModel from '../../models/adminModel.js';

export const getAdmins = async (req, res) => {
  try {
    const isDeleted = req.query.deleted === 'true' || req.query.status === 'deleted' || req.query.isDeleted === '1';
    const data = await adminModel.getAllAdmins(req.user?.id || 1, isDeleted);
    return res.json({
      success: true,
      data,
      meta: {
        pagination: {
          totalItems: data.length,
          totalPages: 1,
          currentPage: 1,
          itemsPerPage: data.length || 10
        }
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getAdminById = async (req, res) => {
  try {
    const id = req.params.id || req.query.id;
    const data = await adminModel.getAdminById(id, req.user?.id || 1);
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const createAdmin = async (req, res) => {
  try {
    const newId = await adminModel.createAdmin(req.body, req.user?.id || 1);
    return res.status(201).json({ success: true, message: "Admin created", data: { id: newId } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const updateAdmin = async (req, res) => {
  try {
    const id = req.params.id || req.body.id;
    if (id === 'change-password' || id === 'change_password') {
      return changePassword(req, res);
    }
    if (req.body?.action === 'restore') {
      return restoreAdmin(req, res);
    }
    const isRemove = req.body.primaryImageAction === 'remove' || req.body.profile_image === '' || req.body.image_url === '';
    const profile_image = req.file ? req.file.path : (req.body.profile_image || req.body.image_url);
    const dataToUpdate = { ...req.body };
    if (isRemove) {
      dataToUpdate.profile_image = null;
      dataToUpdate.image_url = null;
    } else if (profile_image) {
      dataToUpdate.profile_image = profile_image;
    }
    
    await adminModel.updateAdmin(id, dataToUpdate, req.user?.id || 1);
    const updatedData = await adminModel.getAdminById(id, req.user?.id || 1);
    return res.json({ success: true, message: "Admin updated successfully", data: updatedData });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const deleteAdmin = async (req, res) => {
  try {
    const id = req.params.id || req.body.id;
    const permanent = req.query.permanent === 'true' || req.body?.permanent === true || req.body?.permanent === 'true';
    await adminModel.deleteAdmin(id, permanent, req.user?.id || 1);
    return res.json({
      success: true,
      message: permanent ? "Admin permanently deleted" : "Admin moved to trash successfully"
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const restoreAdmin = async (req, res) => {
  try {
    const id = req.params.id || req.body?.id;
    await adminModel.restoreAdmin(id, req.user?.id || 1);
    return res.json({ success: true, message: "Admin restored successfully" });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Current password and new password are required." });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "New password must be at least 6 characters." });
    }

    const userId = req.user?.id || 1;
    const result = await adminModel.changeAdminPassword(userId, currentPassword, newPassword);
    if (result.error) {
      return res.status(400).json({ success: false, message: result.error });
    }
    return res.json({ success: true, message: "Password changed successfully." });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const bulkDeleteAdmins = async (req, res) => {
  try {
    const ids = req.body?.ids || req.body?.selectedIds || [];
    const permanent = req.query?.permanent === 'true' || req.body?.permanent === true || req.body?.permanent === 'true';
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "No admin IDs provided for bulk delete" });
    }
    await adminModel.bulkDeleteAdmins(ids, permanent, req.user?.id || 1);
    return res.json({
      success: true,
      message: permanent ? "Admins permanently deleted" : "Admins moved to trash successfully"
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
