const express = require('express')
const masterFormController = require('../controllers/masterFormController')
const checkAuth = require('../middleware/authMiddleware')
const uploadParser = require('../middleware/uploadMiddleware')

const router = express.Router()

router.use(checkAuth)

router.get('/api/admin/:endpoint/:id', masterFormController.getRecordDetail)
router.get('/api/admin/:endpoint', masterFormController.getRecordsList)
router.post('/api/admin/:endpoint/bulk-delete', masterFormController.bulkDeleteRecords)
router.post('/api/admin/:endpoint', uploadParser, masterFormController.createRecord)
router.put('/api/admin/:endpoint/:id', uploadParser, masterFormController.updateRecord)
router.delete('/api/admin/:endpoint/:id', masterFormController.deleteRecord)
router.patch('/api/admin/:endpoint/:id', masterFormController.patchRecordStatus)

module.exports = router
