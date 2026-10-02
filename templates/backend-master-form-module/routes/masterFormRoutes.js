import express from 'express';
import masterFormController from '../controllers/masterFormController.js';
import checkAuth from '../middleware/authMiddleware.js';
import uploadParser from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.use(checkAuth);

router.get('/api/admin/:endpoint/:id', masterFormController.getRecordDetail);
router.get('/api/admin/:endpoint', masterFormController.getRecordsList);
router.post('/api/admin/:endpoint/bulk-delete', masterFormController.bulkDeleteRecords);
router.post('/api/admin/:endpoint', uploadParser, masterFormController.createRecord);
router.put('/api/admin/:endpoint/:id', uploadParser, masterFormController.updateRecord);
router.delete('/api/admin/:endpoint/:id', masterFormController.deleteRecord);
router.patch('/api/admin/:endpoint/:id', masterFormController.patchRecordStatus);

export default router;

