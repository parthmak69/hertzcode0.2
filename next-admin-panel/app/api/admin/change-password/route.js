import { NextResponse } from 'next/server'
import { dbQuery } from '@/lib/db'
import { verifyToken, verifyPassword, hashPassword } from '@/lib/auth'

/**
 * Path: PUT /api/admin/change-password
 * Allows an authenticated admin to change their own password.
 */
export async function PUT(req) {
    const adminUser = verifyToken(req)
    if (!adminUser) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await req.json().catch(() => ({}))
        const { currentPassword, newPassword } = body

        if (!currentPassword || !newPassword) {
            return NextResponse.json(
                { success: false, message: 'Current password and new password are required.' },
                { status: 400 }
            )
        }

        if (newPassword.length < 6) {
            return NextResponse.json(
                { success: false, message: 'New password must be at least 6 characters.' },
                { status: 400 }
            )
        }

        // Fetch current password hash from DB
        const admins = await dbQuery(
            'SELECT `password` FROM `admins` WHERE `id` = ? AND `isDeleted` = 0 LIMIT 1',
            [adminUser.id]
        )

        if (!admins || admins.length === 0) {
            return NextResponse.json({ success: false, message: 'Admin account not found.' }, { status: 404 })
        }

        const isMatch = verifyPassword(currentPassword, admins[0].password)
        if (!isMatch) {
            return NextResponse.json(
                { success: false, message: 'Current password is incorrect.' },
                { status: 400 }
            )
        }

        const newHash = hashPassword(newPassword)
        await dbQuery(
            'UPDATE `admins` SET `password` = ? WHERE `id` = ? AND `isDeleted` = 0',
            [newHash, adminUser.id],
            adminUser.id,
            `Admin ID ${adminUser.id} changed their password`
        )

        return NextResponse.json({
            success: true,
            message: 'Password changed successfully.',
        })
    } catch (err) {
        console.error('[Change Password API Error]', err)
        return NextResponse.json({ success: false, message: 'Internal server error.' }, { status: 500 })
    }
}
