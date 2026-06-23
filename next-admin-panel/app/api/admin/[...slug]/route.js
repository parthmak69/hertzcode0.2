import { NextResponse } from 'next/server'
import { dbQuery } from '@/lib/db'
import { verifyToken, hashPassword } from '@/lib/auth'
import fs from 'fs/promises'
import path from 'path'

// Helper to parse multipart/form-data requests and save files to public/uploads
async function parseMultipartRequest(req) {
    const formData = await req.formData()
    const body = {}
    const files = {}

    files.gallery_files = []

    for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
            if (key === 'gallery_files' || key === 'product_images' || key === 'secondary_images') {
                files.gallery_files.push(value)
            } else {
                files[key] = value
            }
        } else {
            if (typeof value === 'string') {
                if ((value.startsWith('[') && value.endsWith(']')) || (value.startsWith('{') && value.endsWith('}'))) {
                    try {
                        body[key] = JSON.parse(value)
                    } catch {
                        body[key] = value
                    }
                } else {
                    body[key] = value
                }
            } else {
                body[key] = value
            }
        }
    }

    // Save all uploaded files to disk!
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    await fs.mkdir(uploadDir, { recursive: true })

    // 1. Primary image file
    const primaryFile = files.primary_image_file || files.product_image || files.primary_image || files.primary_image_url
    if (primaryFile && primaryFile.size > 0 && primaryFile instanceof File) {
        const bytes = await primaryFile.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const ext = path.extname(primaryFile.name) || '.jpg'
        const filename = `primary-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`
        await fs.writeFile(path.join(uploadDir, filename), buffer)
        body.primary_image_url = `uploads/${filename}`
    } else if (body.primaryImageAction === 'remove') {
        body.primary_image_url = ''
    }

    // 2. Document file
    const docFile = files.document_file || files.document_file_url
    if (docFile && docFile.size > 0 && docFile instanceof File) {
        const bytes = await docFile.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const ext = path.extname(docFile.name) || '.pdf'
        const filename = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`
        await fs.writeFile(path.join(uploadDir, filename), buffer)
        body.document_file_url = `uploads/${filename}`
    } else if (body.documentFileAction === 'remove') {
        body.document_file_url = ''
    }

    // 3. Gallery / Secondary files
    const newGalleryUrls = []
    if (files.gallery_files.length > 0) {
        for (const file of files.gallery_files) {
            if (file.size > 0 && file instanceof File) {
                const bytes = await file.arrayBuffer()
                const buffer = Buffer.from(bytes)
                const ext = path.extname(file.name) || '.jpg'
                const filename = `gallery-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`
                await fs.writeFile(path.join(uploadDir, filename), buffer)
                newGalleryUrls.push(`uploads/${filename}`)
            }
        }
    }

    const existingGalleryUrls = Array.isArray(body.existing_gallery_urls) ? body.existing_gallery_urls : []
    body.gallery_images = [...existingGalleryUrls, ...newGalleryUrls]

    return body
}

async function getRequestBody(req) {
    const contentType = req.headers.get('content-type') || ''
    if (contentType.includes('multipart/form-data')) {
        return parseMultipartRequest(req)
    }
    return req.json().catch(() => ({}))
}

// Helper to parse JSON safely without throwing runtime syntax exceptions
function safeJsonParse(val, fallback) {
    if (!val) return fallback
    try {
        return typeof val === 'string' ? JSON.parse(val) : val
    } catch {
        return fallback
    }
}

/**
 * Maps incoming admin endpoint paths to standard classification tags.
 * Returns null for the master-form sandbox endpoint so it fetches all records
 * regardless of dropdown_selection value.
 */
function mapEndpointToCategory(endpoint) {
    const ep = endpoint.toLowerCase()
    if (ep === 'master-form' || ep === 'master_form') return null // no category filter — show all
    if (ep.includes('product') || ep.includes('stock')) return 'grocery_staples'
    if (ep.includes('coupon') || ep.includes('promo')) return 'coupons_promos'
    if (ep.includes('salesm') || ep.includes('vendor') || ep.includes('crm') || ep.includes('customer') || ep.includes('delivery')) return 'crm_vendor'
    if (ep.includes('config') || ep.includes('setting')) return 'system_configs'
    return ep // Fallback to raw endpoint name as category key
}

/**
 * Transforms a raw database row into the format expected by modern frontend widgets and selectors.
 */
function formatRow(row) {
    if (!row) return null
    return {
        ...row,
        // Unpack serialized JSON columns safely
        gallery_images: safeJsonParse(row.gallery_images, []),
        multi_select_tags: safeJsonParse(row.multi_select_tags, []),
        json_metadata: safeJsonParse(row.json_metadata, {}),
        repeater_data: safeJsonParse(row.repeater_data, []),

        // Match UI data bindings for React tables and detail forms
        fullName: row.text_title,
        title: row.text_title,
        name: row.text_title,
        price: row.decimal_price,
        qty: row.integer_qty,
        quantity: row.integer_qty,
        stock: row.integer_qty,
        is_active: row.switch_active === 1,
        active: row.switch_active === 1,
        full_name: row.text_title,
        email: row.email,
        phone: row.phone
    }
}

/**
 * Normalizes a client JSON request payload into database-aligned column attributes.
 */
function mapBodyToTableFields(body, category) {
    const fields = {}

    fields.text_title = body.text_title || body.title || body.name || body.full_name || body.fullName || body.heading || ''
    fields.slug = body.slug || (fields.text_title ? fields.text_title.toLowerCase().replace(/[^a-z0-9]+/g, '-') : '')
    fields.email = body.email || ''
    fields.password_hash = body.password_hash || (body.password ? hashPassword(body.password) : '')
    fields.website_url = body.website_url || body.url || body.website || ''
    fields.phone = body.phone || body.mobile || ''
    fields.integer_qty = parseInt(body.integer_qty ?? body.qty ?? body.quantity ?? body.stock ?? body.limit ?? 0)
    fields.decimal_price = parseFloat(body.decimal_price ?? body.price ?? body.amount ?? body.cost ?? body.rate ?? 0.0)
    fields.tax_percentage = parseFloat(body.tax_percentage ?? body.tax ?? body.discount ?? body.percentage ?? 0.0)
    fields.range_slider_value = parseInt(body.range_slider_value ?? body.rating ?? body.slider ?? 0)
    fields.short_notes = body.short_notes || body.short_description || body.subtitle || body.summary || ''
    fields.rich_wysiwyg_content = body.rich_wysiwyg_content || body.content || body.description || body.wysiwyg || ''
    fields.dropdown_selection = category
    fields.radio_selection = body.radio_selection || body.radio || body.status || 'default'
    fields.checkbox_toggle = body.checkbox_toggle === true || body.checkbox_toggle === 1 || body.checkbox === true ? 1 : 0

    // Status Switch: ensure safe boolean interpretation, defaulting to 1 (active)
    const isAct = body.switch_active ?? body.isActive ?? body.is_active ?? body.active
    fields.switch_active = isAct === false || isAct === 0 ? 0 : 1

    fields.date_picker = body.date_picker || body.date || body.startDate || body.start_date || null
    fields.datetime_picker = body.datetime_picker || body.datetime || body.dateTime || null
    fields.time_picker = body.time_picker || body.time || null

    fields.primary_image_url = body.primary_image_url || body.image || body.imageUrl || body.image_url || ''
    fields.document_file_url = body.document_file_url || body.file || body.fileUrl || body.file_url || ''

    fields.gallery_images = JSON.stringify(body.gallery_images || body.gallery || body.images || [])
    fields.multi_select_tags = JSON.stringify(body.multi_select_tags || body.tags || [])
    fields.json_metadata = JSON.stringify(body.json_metadata || body.metadata || body.meta || {})
    fields.repeater_data = JSON.stringify(body.repeater_data || body.repeater || [])

    return fields
}

/**
 * Wildcard Router for GET Requests.
 * Supports dashboard metrics and paginated database CRUD querying.
 */
export async function GET(req, { params }) {
    const adminUser = verifyToken(req)
    if (!adminUser) {
        return NextResponse.json({ success: false, message: 'Unauthorized access token.' }, { status: 401 })
    }

    const resolvedParams = await params
    const slug = resolvedParams.slug
    const endpoint = slug[0]
    const id = slug[1]

    // ── 1. Intercept Dashboard Telemetry Feeds ─────────────────────────────────
    // Dashboard is now static, removed dynamic telemetry endpoints.

    const category = mapEndpointToCategory(endpoint)

    // ── 2. Handle GET /api/admin/[endpoint]/[id] (Single record detail) ────────
    if (id) {
        try {
            const sql = category
                ? 'SELECT * FROM `master_form_inputs` WHERE `id` = ? AND `dropdown_selection` = ? LIMIT 1'
                : 'SELECT * FROM `master_form_inputs` WHERE `id` = ? LIMIT 1'
            const queryParams = category ? [id, category] : [id]

            const rows = await dbQuery(sql, queryParams, adminUser.id, `Fetch single record ID: ${id}`)
            if (!rows || rows.length === 0) {
                return NextResponse.json({ success: false, message: 'Resource record not found.' }, { status: 404 })
            }
            return NextResponse.json({ success: true, data: formatRow(rows[0]) })
        } catch (err) {
            console.error('[Detail Fetch Error]', err)
            return NextResponse.json({ success: false, message: 'Database fetch failure.' }, { status: 500 })
        }
    }

    // ── 3. Handle GET /api/admin/[endpoint] (Paginated & Searchable List) ─────
    try {
        const { searchParams } = new URL(req.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '10')
        const sortBy = searchParams.get('sort_by') || 'id'
        const sortOrder = searchParams.get('sort_order') || 'asc'
        const search = searchParams.get('search') || ''

        const offset = (page - 1) * limit
        const allowedSortCols = ['id', 'text_title', 'decimal_price', 'integer_qty', 'created_at']
        const safeSortBy = allowedSortCols.includes(sortBy) ? sortBy : 'id'
        const safeSortOrder = ['asc', 'desc'].includes(sortOrder.toLowerCase()) ? sortOrder : 'asc'

        // Build WHERE clause — category filter is optional
        let countSql, selectSql
        const queryParams = []

        if (category) {
            countSql = 'SELECT COUNT(*) as total FROM `master_form_inputs` WHERE `dropdown_selection` = ?'
            selectSql = 'SELECT * FROM `master_form_inputs` WHERE `dropdown_selection` = ?'
            queryParams.push(category)
        } else {
            countSql = 'SELECT COUNT(*) as total FROM `master_form_inputs` WHERE 1=1'
            selectSql = 'SELECT * FROM `master_form_inputs` WHERE 1=1'
        }

        if (search) {
            const searchClause = ' AND (`text_title` LIKE ? OR `email` LIKE ? OR `phone` LIKE ?)'
            countSql += searchClause
            selectSql += searchClause
            queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`)
        }

        selectSql += ` ORDER BY ${safeSortBy} ${safeSortOrder} LIMIT ? OFFSET ?`
        const selectParams = [...queryParams, limit, offset]

        const countRes = await dbQuery(countSql, queryParams, adminUser.id, `Fetch record count`)
        const totalItems = countRes[0]?.total || 0
        const totalPages = Math.ceil(totalItems / limit)

        const rows = await dbQuery(selectSql, selectParams, adminUser.id, `Fetch paginated records`)

        return NextResponse.json({
            success: true,
            data: rows.map(formatRow),
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
        console.error('[List Query Error]', err)
        return NextResponse.json({ success: false, message: 'Database query execution error.' }, { status: 500 })
    }
}

/**
 * Wildcard Router for POST Requests.
 * Inserts a new record mapped to master_form_inputs.
 */
export async function POST(req, { params }) {
    const adminUser = verifyToken(req)
    if (!adminUser) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const slug = resolvedParams.slug
    const endpoint = slug[0]
    const category = mapEndpointToCategory(endpoint)

    try {
        const body = await getRequestBody(req)
        const fields = mapBodyToTableFields(body, category)

        const columns = Object.keys(fields)
        const placeholders = columns.map(() => '?').join(', ')
        const values = Object.values(fields)

        const sql = `INSERT INTO \`master_form_inputs\` (${columns.map(c => `\`${c}\``).join(', ')}) VALUES (${placeholders})`

        const insertRes = await dbQuery(sql, values, adminUser.id, `Created ${category} record: "${fields.text_title}"`)

        return NextResponse.json({
            success: true,
            message: 'Record created successfully.',
            data: { id: insertRes.insertId }
        })
    } catch (err) {
        console.error('[Wildcard POST Error]', err)
        return NextResponse.json({ success: false, message: 'Database insert failed.' }, { status: 500 })
    }
}

/**
 * Wildcard Router for PUT Requests.
 * Updates an existing record in master_form_inputs.
 */
export async function PUT(req, { params }) {
    const adminUser = verifyToken(req)
    if (!adminUser) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const slug = resolvedParams.slug
    const endpoint = slug[0]
    const id = slug[1]
    const category = mapEndpointToCategory(endpoint)

    if (!id) {
        return NextResponse.json({ success: false, message: 'Missing record identifier.' }, { status: 400 })
    }

    try {
        const body = await getRequestBody(req)
        const fields = mapBodyToTableFields(body, category)

        const setClause = Object.keys(fields).map(c => `\`${c}\` = ?`).join(', ')

        let sql, values
        if (category) {
            sql = `UPDATE \`master_form_inputs\` SET ${setClause} WHERE \`id\` = ? AND \`dropdown_selection\` = ?`
            values = [...Object.values(fields), id, category]
        } else {
            sql = `UPDATE \`master_form_inputs\` SET ${setClause} WHERE \`id\` = ?`
            values = [...Object.values(fields), id]
        }

        await dbQuery(sql, values, adminUser.id, `Updated record ID: ${id} ("${fields.text_title}")`)

        return NextResponse.json({
            success: true,
            message: 'Record updated successfully.'
        })
    } catch (err) {
        console.error('[Wildcard PUT Error]', err)
        return NextResponse.json({ success: false, message: 'Database update failed.' }, { status: 500 })
    }
}

/**
 * Wildcard Router for DELETE Requests.
 * Removes a record by ID from master_form_inputs.
 */
export async function DELETE(req, { params }) {
    const adminUser = verifyToken(req)
    if (!adminUser) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const slug = resolvedParams.slug
    const endpoint = slug[0]
    const id = slug[1]
    const category = mapEndpointToCategory(endpoint)

    if (!id) {
        return NextResponse.json({ success: false, message: 'Missing record identifier.' }, { status: 400 })
    }

    try {
        const sql = category
            ? 'DELETE FROM `master_form_inputs` WHERE `id` = ? AND `dropdown_selection` = ?'
            : 'DELETE FROM `master_form_inputs` WHERE `id` = ?'
        const queryParams = category ? [id, category] : [id]

        await dbQuery(sql, queryParams, adminUser.id, `Deleted record ID: ${id}`)

        return NextResponse.json({
            success: true,
            message: 'Record deleted successfully.'
        })
    } catch (err) {
        console.error('[Wildcard DELETE Error]', err)
        return NextResponse.json({ success: false, message: 'Database delete failed.' }, { status: 500 })
    }
}

/**
 * Wildcard Router for PATCH Requests.
 * Toggles a record's active status.
 */
export async function PATCH(req, { params }) {
    const adminUser = verifyToken(req)
    if (!adminUser) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const slug = resolvedParams.slug
    const endpoint = slug[0]
    const id = slug[1]
    const category = mapEndpointToCategory(endpoint)

    if (!id) {
        return NextResponse.json({ success: false, message: 'Missing record identifier.' }, { status: 400 })
    }

    try {
        // Toggle the binary active switch value
        const selectSql = category
            ? 'SELECT `switch_active` FROM `master_form_inputs` WHERE `id` = ? AND `dropdown_selection` = ? LIMIT 1'
            : 'SELECT `switch_active` FROM `master_form_inputs` WHERE `id` = ? LIMIT 1'
        const selectParams = category ? [id, category] : [id]

        const rows = await dbQuery(selectSql, selectParams)

        if (!rows || rows.length === 0) {
            return NextResponse.json({ success: false, message: 'Record not found.' }, { status: 404 })
        }

        const newStatus = rows[0].switch_active === 1 ? 0 : 1

        const updateSql = category
            ? 'UPDATE `master_form_inputs` SET `switch_active` = ? WHERE `id` = ? AND `dropdown_selection` = ?'
            : 'UPDATE `master_form_inputs` SET `switch_active` = ? WHERE `id` = ?'
        const updateParams = category ? [newStatus, id, category] : [newStatus, id]

        await dbQuery(updateSql, updateParams, adminUser.id, `Toggled active status of record ID: ${id} to ${newStatus}`)

        return NextResponse.json({
            success: true,
            message: 'Status updated successfully.',
            data: { active: newStatus === 1 }
        })
    } catch (err) {
        console.error('[Wildcard PATCH Error]', err)
        return NextResponse.json({ success: false, message: 'Database status update failed.' }, { status: 500 })
    }
}
