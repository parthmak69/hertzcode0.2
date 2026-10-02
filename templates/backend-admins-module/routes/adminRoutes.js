import express from 'express';
import * as adminController from '../controllers/adminController.js';
import checkAuth from '../middleware/authMiddleware.js';
import uploadParser from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.use(checkAuth);

router.post(['/upload', '/admin/upload'], uploadParser, (req, res) => {
  const fileUrl = req.uploadedUrl || req.fileUrl || req.body?.image_url || req.body?.photo || req.body?.file || req.body?.fileUrl || req.body?.url || (req.body && Object.values(req.body).find(v => typeof v === 'string' && v.startsWith('/uploads/'))) || '';
  res.json({
    success: true,
    message: 'File uploaded successfully',
    url: fileUrl,
    fileUrl: fileUrl,
    path: fileUrl,
    data: { url: fileUrl, path: fileUrl }
  });
});

router.put(['/change-password', '/api/admin/change-password'], adminController.changePassword);
router.post(['/bulk-delete', '/admins/bulk-delete', '/api/admin/admins/bulk-delete', '/bulk_delete'], adminController.bulkDeleteAdmins);

router.post(['/:id/restore', '/admins/:id/restore', '/api/admin/admins/:id/restore', '/restore/:id'], adminController.restoreAdmin);
router.patch(['/:id/restore', '/admins/:id/restore', '/api/admin/admins/:id/restore', '/restore/:id'], adminController.restoreAdmin);

router.get(['/', '/admins', '/api/admin/admins'], adminController.getAdmins);
router.post(['/', '/admins', '/api/admin/admins'], uploadParser, adminController.createAdmin);
router.get(['/:id', '/admins/:id', '/api/admin/admins/:id'], adminController.getAdminById);
router.put(['/:id', '/admins/:id', '/api/admin/admins/:id'], uploadParser, adminController.updateAdmin);
router.delete(['/:id', '/admins/:id', '/api/admin/admins/:id'], adminController.deleteAdmin);
router.patch(['/:id', '/admins/:id', '/api/admin/admins/:id'], adminController.restoreAdmin);

export default router;

