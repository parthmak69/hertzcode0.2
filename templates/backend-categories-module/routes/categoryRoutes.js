const express = require('express')
const categoryController = require('../controllers/categoryController')
const checkAuth = require('../middleware/authMiddleware')
const uploadParser = require('../middleware/uploadMiddleware')

const router = express.Router()

router.use(checkAuth)

router.get('/api/admin/categories', categoryController.listCategories)
router.get('/api/admin/categories/:id', categoryController.getCategoryDetail)
router.post('/api/admin/categories', uploadParser, categoryController.createCategory)
router.put('/api/admin/categories/:id', uploadParser, categoryController.updateCategory)
router.delete('/api/admin/categories/:id', categoryController.deleteCategory)

module.exports = router
