import adminModel from '../models/adminModel.js'
import { verifyPassword, hashPassword, generateToken } from '../utils/authHelper.js'
import { dbQuery } from '../config/db.js'

// In-memory Map to track failed login attempts by key
const loginAttempts = new Map()

const authController = {
    // POST /api/auth/admin/login
    async login(req, res) {
        try {
            const { username, password } = req.body
            if (!username || !password) {
                return res.status(400).json({ success: false, message: 'Username and password are required.' })
            }

            // Honeypot validation check to catch bots
            const { username_verification } = req.body
            if (username_verification) {
                console.warn('[Bot Detected] Login form submitted with honeypot field filled.')
                return res.status(400).json({ success: false, message: 'Bot verification failed.' })
            }

            // Track attempts using a combination of the client's IP and email
            const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress
            const key = `${clientIp}_${username.trim().toLowerCase()}`

            // Check if the user is currently locked out
            const record = loginAttempts.get(key)
            if (record && record.lockUntil > Date.now()) {
                const minutesLeft = Math.ceil((record.lockUntil - Date.now()) / (60 * 1000))
                return res.status(429).json({
                    success: false,
                    message: `Too many failed attempts. Please try again after ${minutesLeft} minute(s).`
                })
            }

            // Fetch the admin record from the database
            const admin = await adminModel.getAdminByUsername(username)
            
            // Password verification check
            let isMatch = false
            if (admin) {
                isMatch = verifyPassword(password, admin.password)
            }

            // If email or password verification fails
            if (!admin || !isMatch) {
                const currentRecord = loginAttempts.get(key)
                let attempts = currentRecord ? currentRecord.attempts + 1 : 1
                let lockUntil = 0

                // Lock the account for 15 minutes after 5 failed attempts
                if (attempts >= 5) {
                    lockUntil = Date.now() + 15 * 60 * 1000 // 15 Minutes
                }

                loginAttempts.set(key, { attempts, lockUntil })

                const responseMessage = lockUntil
                    ? 'Too many failed login attempts. Your login is locked for 15 minutes.'
                    : `Invalid username or password. Attempt ${attempts} of 5.`

                return res.status(401).json({ success: false, message: responseMessage })
            }

            // Reset failed login attempts on successful login
            loginAttempts.delete(key)

            // Generate JWT access token
            const tokenUser = { id: admin.id, name: admin.name || admin.fname, username: admin.username }
            const accessToken = generateToken(tokenUser)

            await dbQuery('SELECT 1', [], admin.id, `Admin session initialized for: ${admin.name || admin.fname} (${admin.username})`)

            return res.json({
                success: true,
                data: {
                    accessToken,
                    refreshToken: accessToken,
                    user: { id: admin.id, name: admin.name || admin.fname, username: admin.username }
                }
            })
        } catch (err) {
            console.error('[Login API Error]', err)
            return res.status(500).json({ success: false, message: 'Internal server error during login operation.' })
        }
    },

    // POST /api/auth/admin/forgot-password
    async forgotPassword(req, res) {
        try {
            const { email } = req.body
            if (!email) {
                return res.status(400).json({ success: false, message: 'Email is required.' })
            }

            const admin = await adminModel.getAdminByEmail(email)
            if (!admin) {
                return res.json({ success: true, message: 'If that email exists, an OTP has been sent.' })
            }

            const otp = String(Math.floor(100000 + Math.random() * 900000))
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

            await adminModel.storePasswordResetOtp({ adminId: admin.id, email, otp, expiresAt }, admin.id)

            console.log(`[Password Reset OTP] Email: ${email} | OTP: ${otp}`)

            return res.json({
                success: true,
                message: 'If that email exists, an OTP has been sent.',
                _dev_otp: process.env.NODE_ENV === 'development' ? otp : undefined
            })
        } catch (err) {
            console.error('[Forgot Password API Error]', err)
            return res.status(500).json({ success: false, message: 'Internal server error.' })
        }
    },

    // POST /api/auth/admin/reset-password
    async resetPassword(req, res) {
        try {
            const { email, otp, newPassword } = req.body
            if (!email || !otp || !newPassword) {
                return res.status(400).json({ success: false, message: 'Email, OTP, and new password are required.' })
            }

            if (newPassword.length < 6) {
                return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' })
            }

            const reset = await adminModel.getValidPasswordResetOtp(email, otp)
            if (!reset) {
                return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' })
            }

            await adminModel.markPasswordResetOtpUsed(reset.id)

            const hashedPassword = hashPassword(newPassword)
            await adminModel.updateAdminPassword(reset.admin_id, hashedPassword, reset.admin_id)

            return res.json({ success: true, message: 'Password has been reset successfully.' })
        } catch (err) {
            console.error('[Reset Password API Error]', err)
            return res.status(500).json({ success: false, message: 'Internal server error.' })
        }
    },

    // POST /api/auth/clear-refresh-cookie
    clearCookie(req, res) {
        return res.json({ success: true, message: 'Administrative session cleared successfully.' })
    },

    // POST /api/auth/refresh-token
    async refreshToken(req, res) {
        try {
            const { verifyToken } = require('../utils/authHelper')
            const adminUser = verifyToken(req)
            if (!adminUser) {
                return res.status(401).json({ success: false, message: 'Invalid or expired token.' })
            }

            const newToken = generateToken({ id: adminUser.id, name: adminUser.name, email: adminUser.email })
            return res.json({ success: true, data: { accessToken: newToken } })
        } catch (err) {
            console.error('[Refresh Token API Error]', err)
            return res.status(500).json({ success: false, message: 'Internal server error.' })
        }
    },

    // GET /api/auth/hash
    hash(req, res) {
        try {
            const { password, secret } = req.query
            const isDev = process.env.NODE_ENV === 'development'
            const expectedSecret = 'squadera-generate-hash-secret-xyz'

            if (!isDev && secret !== expectedSecret) {
                return res.status(403).type('text/plain').send('Access Denied. Unauthorized utility route.')
            }

            if (!password) {
                return res.status(400).type('text/plain').send('Error: "password" query parameter is required.')
            }

            const hashedPassword = hashPassword(password)
            return res.status(200).type('text/plain').send(hashedPassword)
        } catch (err) {
            console.error('[Hash Utility Error]', err)
            return res.status(500).type('text/plain').send('Internal Server Error.')
        }
    }
}

export default authController
