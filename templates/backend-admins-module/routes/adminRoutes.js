const express = require('express')
const adminController = require('../controllers/adminController')
const checkAuth = require('../middleware/authMiddleware')
const uploadParser = require('../middleware/uploadMiddleware')

const router = express.Router()

router.use(checkAuth)

router.put('/api/admin/change-password', adminController.changePassword)
router.get('/api/admin/admins', adminController.getAdmins)
router.post('/api/admin/admins/bulk-delete', adminController.bulkDeleteAdmins)
router.post('/api/admin/admins', uploadParser, adminController.createAdmin)
router.get('/api/admin/admins/:id', adminController.getAdminById)
router.put('/api/admin/admins/:id', uploadParser, adminController.updateAdmin)
router.delete('/api/admin/admins/:id', adminController.deleteAdmin)
router.patch('/api/admin/admins/:id', adminController.restoreAdmin)

module.exports = router
