const express = require('express')
const portfolioController = require('../controllers/portfolioController')
const checkAuth = require('../middleware/authMiddleware')
const uploadParser = require('../middleware/uploadMiddleware')

const router = express.Router()

router.use(checkAuth)

router.get('/api/admin/portfolio/categories-summary', portfolioController.getCategoriesSummary)
router.get('/api/admin/portfolio/:id', portfolioController.getRecordDetail)
router.get('/api/admin/portfolio', portfolioController.getRecordsList)
router.post('/api/admin/portfolio/bulk-delete', portfolioController.bulkDeleteRecords)
router.post('/api/admin/portfolio', uploadParser, portfolioController.createRecord)
router.put('/api/admin/portfolio/:id', uploadParser, portfolioController.updateRecord)
router.delete('/api/admin/portfolio/:id', portfolioController.deleteRecord)
router.patch('/api/admin/portfolio/:id', portfolioController.patchRecordStatus)

module.exports = router
