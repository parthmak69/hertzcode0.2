import { NextResponse } from 'next/server'
import { dbQuery } from '@/lib/db'
import { verifyToken, hashPassword } from '@/lib/auth'

/**
 * Path: GET /api/admin/admins
 * Retrieves a paginated, searchable, and sortable list of admin users.
 */
export async function GET(req) {
    const adminUser = verifyToken(req)
    if (!adminUser) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { searchParams } = new URL(req.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '10')
        const sortBy = searchParams.get('sort_by') || 'id'
        const sortOrder = searchParams.get('sort_order') || 'asc'
        const search = searchParams.get('search') || ''

        const offset = (page - 1) * limit
        const allowedSortCols = ['id', 'name', 'email', 'createdOn']
        const safeSortBy = allowedSortCols.includes(sortBy) ? sortBy : 'id'
        const safeSortOrder = ['asc', 'desc'].includes(sortOrder.toLowerCase()) ? sortOrder : 'asc'

        const showDeleted = searchParams.get('deleted') === 'true'
        const isDeletedVal = showDeleted ? 1 : 0

        let countSql = `SELECT COUNT(*) as total FROM \`admins\` WHERE \`isDeleted\` = ${isDeletedVal}`
        let selectSql = `SELECT \`id\`, \`name\` as \`full_name\`, \`email\`, \`phone\`, \`createdOn\` as \`created_at\` FROM \`admins\` WHERE \`isDeleted\` = ${isDeletedVal}`
        const params = []

        if (search) {
            const searchClause = ' AND (`name` LIKE ? OR `email` LIKE ?)'
            countSql += searchClause
            selectSql += searchClause
            params.push(`%${search}%`, `%${search}%`)
        }

        selectSql += ` ORDER BY ${safeSortBy} ${safeSortOrder} LIMIT ? OFFSET ?`
        const selectParams = [...params, limit, offset]

        // Fetch counts and records
        const countRes = await dbQuery(countSql, params, adminUser.id, 'Fetch Admins Count')
        const totalItems = countRes[0]?.total || 0
        const totalPages = Math.ceil(totalItems / limit)

        const rows = await dbQuery(selectSql, selectParams, adminUser.id, 'Fetch Admins List')

        return NextResponse.json({
            success: true,
            data: rows,
            meta: {
                pagination: {
                    totalItems,
                    totalPages,
                    currentPage: page,
                    itemsPerPage: limit
                }
            }
        })
    } catch (err) {
        console.error('[Admins GET API Error]', err)
        return NextResponse.json({ success: false, message: 'Internal server error while fetching admins.' }, { status: 500 })
    }
}

/**
 * Path: POST /api/admin/admins
 * Creates a new administrative user record.
 */
export async function POST(req) {
    const adminUser = verifyToken(req)
    if (!adminUser) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await req.json().catch(() => ({}))
        const { full_name, email, password, phone } = body

        if (!full_name || !email || !password) {
            return NextResponse.json({ success: false, message: 'Full name, email, and password are required.' }, { status: 400 })
        }

        // Avoid duplicate email records
        const existing = await dbQuery('SELECT `id` FROM `admins` WHERE `email` = ? AND `isDeleted` = 0', [email])
        if (existing && existing.length > 0) {
            return NextResponse.json({ success: false, message: 'An admin with this email already exists.' }, { status: 400 })
        }

        const pwdHash = hashPassword(password)
        const insertRes = await dbQuery(
            'INSERT INTO `admins` (`name`, `email`, `password`, `phone`) VALUES (?, ?, ?, ?)',
            [full_name, email, pwdHash, phone || null],
            adminUser.id,
            `Created admin account: ${full_name} (${email})`
        )

        return NextResponse.json({
            success: true,
            message: 'Admin account created successfully.',
            data: { id: insertRes.insertId }
        })
    } catch (err) {
        console.error('[Admins POST API Error]', err)
        return NextResponse.json({ success: false, message: 'Internal server error while registering admin.' }, { status: 500 })
    }
}
