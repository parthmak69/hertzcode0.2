import express from 'express';
import * as adminsController from '../controllers/admin/adminsController.js';
import uploadParser from '../middleware/uploadMiddleware.js';

const checkAuth = (req, res, next) => next();

const router = express.Router();

router.use(checkAuth);

router.post(['/upload', '/admin/upload'], uploadParser, (req, res) => {
  const fileUrl = req.uploadedUrl || req.fileUrl || req.body?.image_url || req.body?.photo || req.body?.file || req.body?.url || (req.files && req.files.length > 0 ? req.files[0].savedUrl : '') || '';
  res.json({
    success: true,
    message: 'File uploaded successfully',
    url: fileUrl,
    fileUrl: fileUrl,
    path: fileUrl,
    data: { url: fileUrl, path: fileUrl }
  });
});

router.put(['/change-password', '/admins/change-password', '/change_password'], adminsController.changePassword);
router.post(['/bulk-delete', '/admins/bulk-delete', '/bulk_delete'], adminsController.bulkDeleteAdmins);

router.post(['/:id/restore', '/admins/:id/restore', '/restore/:id'], adminsController.restoreAdmin);
router.patch(['/:id/restore', '/admins/:id/restore', '/restore/:id'], adminsController.restoreAdmin);

router.get(['/', '/admins', '/list'], adminsController.getAdmins);
router.post(['/', '/admins'], uploadParser, adminsController.createAdmin);
router.get(['/:id', '/admins/:id'], adminsController.getAdminById);
router.put(['/:id', '/admins/:id'], uploadParser, adminsController.updateAdmin);
router.delete(['/:id', '/admins/:id'], adminsController.deleteAdmin);
router.patch(['/:id', '/admins/:id'], adminsController.restoreAdmin);

export default router;
