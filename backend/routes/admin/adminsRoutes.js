import express from 'express';
import * as adminsController from '../../controllers/admin/adminsController.js';
import uploadParser from '../../middleware/uploadMiddleware.js';

const router = express.Router();

router.put(['/change-password', '/change_password'], adminsController.changePassword);
router.post(['/bulk-delete', '/bulk_delete'], adminsController.bulkDeleteAdmins);

router.post(['/:id/restore', '/restore/:id'], adminsController.restoreAdmin);
router.patch(['/:id/restore', '/restore/:id'], adminsController.restoreAdmin);

router.get('/', adminsController.getAdmins);
router.get('/:id', adminsController.getAdminById);
router.put('/:id', uploadParser, adminsController.updateAdmin);
router.post('/', uploadParser, adminsController.createAdmin);
router.delete('/:id', adminsController.deleteAdmin);
router.patch('/:id', adminsController.restoreAdmin);

export default router;
