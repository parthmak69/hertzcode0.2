import { NextResponse } from 'next/server'
import { dbQuery } from '@/lib/db'
import crypto from 'crypto'

/**
 * Path: POST /api/auth/admin/forgot-password
 * Generates a 6-digit OTP for the given admin email and stores it in the DB.
 * In production, send this via email. For now, the OTP is returned in the response
 * (development-only convenience — remove before going live).
 */
export async function POST(req) {
    try {
        const body = await req.json().catch(() => ({}))
        const { email } = body

        if (!email) {
            return NextResponse.json({ success: false, message: 'Email is required.' }, { status: 400 })
        }

        // Look up admin — always respond with success to avoid email enumeration
        const admins = await dbQuery(
            'SELECT `id`, `name` FROM `admins` WHERE `email` = ? AND `isDeleted` = 0 LIMIT 1',
            [email]
        )

        if (!admins || admins.length === 0) {
            // Return success anyway to prevent user enumeration
            return NextResponse.json({ success: true, message: 'If that email exists, an OTP has been sent.' })
        }

        const admin = admins[0]
        const otp = String(Math.floor(100000 + Math.random() * 900000))
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

        // Store OTP — assumes a password_resets table. Create if not exists.
        await dbQuery(
            `CREATE TABLE IF NOT EXISTS \`admin_password_resets\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`admin_id\` INT NOT NULL,
                \`email\` VARCHAR(255) NOT NULL,
                \`otp\` VARCHAR(10) NOT NULL,
                \`expires_at\` DATETIME NOT NULL,
                \`used\` TINYINT(1) DEFAULT 0,
                \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            []
        )

        // Invalidate any existing OTPs for this email
        await dbQuery(
            'UPDATE `admin_password_resets` SET `used` = 1 WHERE `email` = ?',
            [email]
        )

        await dbQuery(
            'INSERT INTO `admin_password_resets` (`admin_id`, `email`, `otp`, `expires_at`) VALUES (?, ?, ?, ?)',
            [admin.id, email, otp, expiresAt],
            admin.id,
            `Password reset OTP generated for admin: ${email}`
        )

        // TODO: Send OTP via email in production. For development, log to console.
        console.log(`[Password Reset OTP] Email: ${email} | OTP: ${otp}`)

        return NextResponse.json({
            success: true,
            message: 'If that email exists, an OTP has been sent.',
            // Remove the line below before going to production:
            _dev_otp: process.env.NODE_ENV === 'development' ? otp : undefined,
        })
    } catch (err) {
        console.error('[Forgot Password API Error]', err)
        return NextResponse.json({ success: false, message: 'Internal server error.' }, { status: 500 })
    }
}
