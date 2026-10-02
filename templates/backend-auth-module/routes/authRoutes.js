import express from 'express'
import authController from '../controllers/authController.js'

const router = express.Router()

// Route definitions for Authentication (handles mounted prefixes)
router.post(['/login', '/admin/login', '/api/auth/admin/login'], authController.login)
router.post(['/forgot-password', '/admin/forgot-password', '/api/auth/admin/forgot-password'], authController.forgotPassword)
router.post(['/reset-password', '/admin/reset-password', '/api/auth/admin/reset-password'], authController.resetPassword)
router.post(['/clear-refresh-cookie', '/clear-cookie', '/api/auth/clear-refresh-cookie'], authController.clearCookie)
router.post(['/refresh-token', '/api/auth/refresh-token'], authController.refreshToken)
router.get(['/hash', '/api/auth/hash'], authController.hash)

export default router

