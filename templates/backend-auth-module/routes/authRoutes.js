import express from 'express'
import authController from '../controllers/authController.js'

const router = express.Router()

// Route definitions for Authentication
router.post('/api/auth/admin/login', authController.login)
router.post('/api/auth/admin/forgot-password', authController.forgotPassword)
router.post('/api/auth/admin/reset-password', authController.resetPassword)
router.post('/api/auth/clear-refresh-cookie', authController.clearCookie)
router.post('/api/auth/refresh-token', authController.refreshToken)
router.get('/api/auth/hash', authController.hash)

export default router
