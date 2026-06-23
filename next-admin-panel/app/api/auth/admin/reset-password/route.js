import { NextResponse } from 'next/server'
import { dbQuery } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

/**
 * Path: POST /api/auth/admin/reset-password
 * Validates the OTP and updates the admin's password.
 */
export async function POST(req) {
    try {
        const body = await req.json().catch(() => ({}))
        const { email, otp, newPassword } = body

        if (!email || !otp || !newPassword) {
            return NextResponse.json(
                { success: false, message: 'Email, OTP, and new password are required.' },
                { status: 400 }
            )
        }

        if (newPassword.length < 6) {
            return NextResponse.json(
                { success: false, message: 'Password must be at least 6 characters.' },
                { status: 400 }
            )
        }

        // Validate OTP
        const resets = await dbQuery(
            `SELECT * FROM \`admin_password_resets\`
             WHERE \`email\` = ? AND \`otp\` = ? AND \`used\` = 0 AND \`expires_at\` > NOW()
             ORDER BY \`id\` DESC LIMIT 1`,
            [email, String(otp)]
        )

        if (!resets || resets.length === 0) {
            return NextResponse.json(
                { success: false, message: 'Invalid or expired OTP.' },
                { status: 400 }
            )
        }

        const reset = resets[0]

        // Mark OTP as used
        await dbQuery(
            'UPDATE `admin_password_resets` SET `used` = 1 WHERE `id` = ?',
            [reset.id]
        )

        // Update admin password
        const hashedPassword = hashPassword(newPassword)
        await dbQuery(
            'UPDATE `admins` SET `password` = ? WHERE `id` = ? AND `isDeleted` = 0',
            [hashedPassword, reset.admin_id],
            reset.admin_id,
            `Password reset completed for admin ID: ${reset.admin_id}`
        )

        return NextResponse.json({
            success: true,
            message: 'Password has been reset successfully.',
        })
    } catch (err) {
        console.error('[Reset Password API Error]', err)
        return NextResponse.json({ success: false, message: 'Internal server error.' }, { status: 500 })
    }
}
