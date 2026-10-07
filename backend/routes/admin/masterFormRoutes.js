import express from 'express';
import masterFormController from '../../controllers/masterFormController.js';
import uploadParser from '../../middleware/uploadMiddleware.js';

const checkAuth = (req, res, next) => next();

const router = express.Router();
router.use(checkAuth);

// Bulk Import & Bulk Delete
router.post(['/bulk-import', '/bulk_import', '/master-form/bulk-import', '/master_form/bulk-import', '/admin/master-form/bulk-import', '/api/admin/master-form/bulk-import'], masterFormController.bulkImportRecords);
router.post(['/bulk-delete', '/bulk_delete', '/master-form/bulk-delete', '/master_form/bulk-delete', '/admin/master-form/bulk-delete', '/api/admin/master-form/bulk-delete'], masterFormController.bulkDeleteRecords);

// Read / Detail
router.get(['/', '/master-form', '/master_form', '/master_form_inputs', '/admin/master-form', '/api/admin/master-form'], masterFormController.getRecordsList);
router.get(['/:id', '/master-form/:id', '/master_form/:id', '/master_form_inputs/:id', '/admin/master-form/:id', '/api/admin/master-form/:id'], masterFormController.getRecordDetail);

// Create
router.post(['/', '/master-form', '/master_form', '/master_form_inputs', '/admin/master-form', '/api/admin/master-form'], uploadParser, masterFormController.createRecord);

// Update
router.put(['/', '/:id', '/master-form/:id', '/master_form/:id', '/master_form_inputs/:id', '/admin/master-form/:id', '/api/admin/master-form/:id'], uploadParser, masterFormController.updateRecord);

// Delete
router.delete(['/', '/:id', '/master-form/:id', '/master_form/:id', '/master_form_inputs/:id', '/admin/master-form/:id', '/api/admin/master-form/:id'], masterFormController.deleteRecord);

// Status Toggle
router.patch(['/:id', '/:id/status', '/master-form/:id/status', '/master_form/:id/status', '/admin/master-form/:id/status', '/api/admin/master-form/:id/status'], masterFormController.patchRecordStatus);

// Wildcard Fallback for sub-endpoints
router.get(['/:endpoint/:id'], masterFormController.getRecordDetail);
router.get(['/:endpoint'], masterFormController.getRecordsList);
router.post(['/:endpoint'], uploadParser, masterFormController.createRecord);
router.put(['/:endpoint/:id'], uploadParser, masterFormController.updateRecord);
router.delete(['/:endpoint/:id'], masterFormController.deleteRecord);
router.patch(['/:endpoint/:id'], masterFormController.patchRecordStatus);

export default router;
