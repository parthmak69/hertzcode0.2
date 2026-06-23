import { NextResponse } from 'next/server'
import { dbQuery } from '@/lib/db'
import { verifyToken, hashPassword } from '@/lib/auth'

/**
 * Path: GET /api/admin/admins/[id]
 * Fetches a single admin user record by ID.
 */
export async function GET(req, { params }) {
    const adminUser = verifyToken(req)
    if (!adminUser) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    try {
        const resolvedParams = await params
        const id = resolvedParams.id

        // Using SELECT * makes it completely safe against missing/different column names
        const rows = await dbQuery(
            'SELECT * FROM `admins` WHERE `id` = ? LIMIT 1',
            [id]
        )

        if (!rows || rows.length === 0) {
            return NextResponse.json({ success: false, message: 'Admin not found.' }, { status: 404 })
        }

        const admin = rows[0]

        return NextResponse.json({
            success: true,
            data: {
                id: admin.id,
                full_name: admin.name ?? admin.full_name ?? '',
                name: admin.name ?? admin.full_name ?? '',
                email: admin.email,
                phone: admin.phone ?? '-',
                isDeleted: admin.isDeleted ?? 0,
                isActive: (admin.isDeleted ?? 0) === 0,
                created_at: admin.createdOn ?? admin.created_at ?? admin.createdAt
            }
        })
    } catch (err) {
        console.error('[Admin GET API Error]', err)
        return NextResponse.json({ success: false, message: 'Internal server error while fetching admin.' }, { status: 500 })
    }
}

/**
 * Path: PUT /api/admin/admins/[id]
 * Updates an administrative user record by ID.
 */
export async function PUT(req, { params }) {
    const adminUser = verifyToken(req)
    if (!adminUser) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    try {
        const resolvedParams = await params
        const id = resolvedParams.id
        const body = await req.json().catch(() => ({}))
        const { full_name, email, password, phone } = body

        if (!full_name || !email) {
            return NextResponse.json({ success: false, message: 'Full name and email are required.' }, { status: 400 })
        }

        // Prevent duplicate email registration with a different ID
        const existing = await dbQuery(
            'SELECT `id` FROM `admins` WHERE `email` = ? AND `id` != ? AND `isDeleted` = 0',
            [email, id]
        )
        if (existing && existing.length > 0) {
            return NextResponse.json({ success: false, message: 'This email is already in use by another admin.' }, { status: 400 })
        }

        let updateSql = 'UPDATE `admins` SET `name` = ?, `email` = ?, `phone` = ?'
        const queryParams = [full_name, email, phone || null]

        if (password) {
            updateSql += ', `password` = ?'
            queryParams.push(hashPassword(password))
        }

        updateSql += ' WHERE `id` = ? AND `isDeleted` = 0'
        queryParams.push(id)

        await dbQuery(updateSql, queryParams, adminUser.id, `Updated admin details for user ID: ${id}`)

        return NextResponse.json({
            success: true,
            message: 'Admin updated successfully.'
        })
    } catch (err) {
        console.error('[Admin PUT API Error]', err)
        return NextResponse.json({ success: false, message: 'Internal server error while updating admin.' }, { status: 500 })
    }
}

/**
 * Path: DELETE /api/admin/admins/[id]
 * Flags an admin user record as deleted (soft delete).
 */
export async function DELETE(req, { params }) {
    const adminUser = verifyToken(req)
    if (!adminUser) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    try {
        const resolvedParams = await params
        const id = resolvedParams.id

        const { searchParams } = new URL(req.url)
        const permanent = searchParams.get('permanent') === 'true'

        if (permanent) {
            await dbQuery(
                'DELETE FROM `admins` WHERE `id` = ?',
                [id],
                adminUser.id,
                `Permanently deleted admin user record ID: ${id}`
            )
            await dbQuery('ALTER TABLE `admins` AUTO_INCREMENT = 1', [], adminUser.id, 'Reset admin auto-increment pointer')
        } else {
            await dbQuery(
                'UPDATE `admins` SET `isDeleted` = 1 WHERE `id` = ?',
                [id],
                adminUser.id,
                `Soft-deleted admin user record ID: ${id}`
            )
        }

        return NextResponse.json({
            success: true,
            message: permanent ? 'Admin permanently deleted.' : 'Admin deleted successfully.'
        })
    } catch (err) {
        console.error('[Admin DELETE API Error]', err)
        return NextResponse.json({ success: false, message: 'Internal server error while deleting admin.' }, { status: 500 })
    }
}

/**
 * Path: PATCH /api/admin/admins/[id]
 * Performs specific operations on the admin record (e.g. restore).
 */
export async function PATCH(req, { params }) {
    const adminUser = verifyToken(req)
    if (!adminUser) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    try {
        const resolvedParams = await params
        const id = resolvedParams.id
        const body = await req.json().catch(() => ({}))
        const { action } = body

        if (action === 'restore') {
            await dbQuery(
                'UPDATE `admins` SET `isDeleted` = 0 WHERE `id` = ?',
                [id],
                adminUser.id,
                `Restored admin user record ID: ${id}`
            )
            return NextResponse.json({
                success: true,
                message: 'Admin restored successfully.'
            })
        }

        return NextResponse.json({ success: false, message: 'Invalid action.' }, { status: 400 })
    } catch (err) {
        console.error('[Admin PATCH API Error]', err)
        return NextResponse.json({ success: false, message: 'Internal server error while updating admin.' }, { status: 500 })
    }
}