const masterFormModel = require('../models/masterFormModel')
const { hashPassword } = require('../utils/authHelper')
const { deletePhysicalFile } = require('../utils/storageHelper')

// Helpers for Wildcard CRUD routes
function mapEndpointToCategory(endpoint) {
    const ep = endpoint.toLowerCase()
    if (ep === 'master-form' || ep === 'master_form') return null
    if (ep.includes('product') || ep.includes('stock')) return 'grocery_staples'
    if (ep.includes('coupon') || ep.includes('promo')) return 'coupons_promos'
    if (ep.includes('salesm') || ep.includes('vendor') || ep.includes('crm') || ep.includes('customer') || ep.includes('delivery')) return 'crm_vendor'
    if (ep.includes('config') || ep.includes('setting')) return 'system_configs'
    return ep
}

function safeJsonParse(val, fallback) {
    if (!val) return fallback
    try {
        return typeof val === 'string' ? JSON.parse(val) : val
    } catch {
        return fallback
    }
}

function formatRow(row) {
    if (!row) return null
    return {
        ...row,
        gallery_images: safeJsonParse(row.gallery_images, []),
        multi_select_tags: safeJsonParse(row.multi_select_tags, []),
        json_metadata: safeJsonParse(row.json_metadata, {}),
        repeater_data: safeJsonParse(row.repeater_data, []),

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

function mapBodyToTableFields(body, category) {
    const fields = {}

    fields.text_title = body.text_title || body.title || body.name || body.full_name || body.fullName || body.heading || ''
    fields.slug = body.slug || (fields.text_title ? fields.text_title.toLowerCase().replace(/[^a-z0-9]+/g, '-') : '')
    fields.email = (body.email && body.email.trim()) ? body.email.trim() : null
    fields.password_hash = body.password_hash || (body.password ? hashPassword(body.password) : '')
    fields.website_url = body.website_url || body.url || body.website || ''
    fields.phone = body.phone || body.mobile || ''
    fields.integer_qty = parseInt(body.integer_qty ?? body.qty ?? body.quantity ?? body.stock ?? body.limit ?? 0)
    fields.decimal_price = parseFloat(body.decimal_price ?? body.price ?? body.amount ?? body.cost ?? body.rate ?? 0.0)
    fields.tax_percentage = parseFloat(body.tax_percentage ?? body.tax ?? body.discount ?? body.percentage ?? 0.0)
    fields.range_slider_value = parseInt(body.range_slider_value ?? body.rating ?? body.slider ?? 0)
    fields.short_notes = body.short_notes || body.short_description || body.subtitle || body.summary || ''
    fields.rich_wysiwyg_content = body.rich_wysiwyg_content || body.content || body.description || body.wysiwyg || ''
    fields.dropdown_selection = category || body.dropdown_selection || 'grocery_staples'
    fields.radio_selection = body.radio_selection || body.radio || body.status || 'default'
    fields.checkbox_toggle = body.checkbox_toggle === true || body.checkbox_toggle === 1 || body.checkbox === true ? 1 : 0

    const isAct = body.switch_active ?? body.isActive ?? body.is_active ?? body.active
    fields.switch_active = isAct === false || isAct === 0 ? 0 : 1

    if (body.date_picker || body.date || body.startDate || body.start_date) {
        const dateVal = body.date_picker || body.date || body.startDate || body.start_date
        if (dateVal) {
            try {
                const dateObj = new Date(dateVal)
                if (!isNaN(dateObj.getTime())) {
                    fields.date_picker = dateObj.toISOString().split('T')[0]
                } else {
                    fields.date_picker = null
                }
            } catch {
                fields.date_picker = null
            }
        } else {
            fields.date_picker = null
        }
    } else {
        fields.date_picker = null
    }

    if (body.datetime_picker || body.datetime || body.dateTime) {
        const datetimeVal = body.datetime_picker || body.datetime || body.dateTime
        if (datetimeVal) {
            try {
                const dateObj = new Date(datetimeVal)
                if (!isNaN(dateObj.getTime())) {
                    fields.datetime_picker = dateObj.toISOString().slice(0, 19).replace('T', ' ')
                } else {
                    fields.datetime_picker = null
                }
            } catch {
                fields.datetime_picker = null
            }
        } else {
            fields.datetime_picker = null
        }
    } else {
        fields.datetime_picker = null
    }

    if (body.time_picker || body.time) {
        const timeVal = body.time_picker || body.time
        if (timeVal) {
            try {
                const dateObj = new Date(timeVal)
                if (!isNaN(dateObj.getTime())) {
                    fields.time_picker = dateObj.toTimeString().split(' ')[0]
                } else {
                    fields.time_picker = null
                }
            } catch {
                fields.time_picker = null
            }
        } else {
            fields.time_picker = null
        }
    } else {
        fields.time_picker = null
    }

    fields.primary_image_url = body.primary_image_url || body.image || body.imageUrl || body.image_url || ''
    fields.document_file_url = body.document_file_url || body.file || body.fileUrl || body.file_url || ''

    fields.gallery_images = JSON.stringify(body.gallery_images || body.gallery || body.images || [])
    fields.multi_select_tags = JSON.stringify(body.multi_select_tags || body.tags || [])
    fields.json_metadata = JSON.stringify(body.json_metadata || body.metadata || body.meta || {})
    fields.repeater_data = JSON.stringify(body.repeater_data || body.repeater || [])

    return fields
}

function stringifyJsonField(value, fallback) {
    if (value === undefined || value === null) return JSON.stringify(fallback)
    if (typeof value === 'string') {
        try {
            JSON.parse(value)
            return value
        } catch {
            return JSON.stringify(value)
        }
    }
    return JSON.stringify(value)
}

function buildUpdateFieldsFromBody(body, category) {
    const fields = {}

    if (body.text_title !== undefined || body.title !== undefined || body.name !== undefined || body.full_name !== undefined) {
        fields.text_title = body.text_title || body.title || body.name || body.full_name || body.fullName || ''
    }
    if (body.slug !== undefined) fields.slug = body.slug
    if (body.email !== undefined) fields.email = (body.email && body.email.trim()) ? body.email.trim() : null
    if (body.phone !== undefined) fields.phone = body.phone
    if (body.website_url !== undefined) fields.website_url = body.website_url || body.url || body.website || ''

    if (body.password !== undefined && body.password !== '') {
        fields.password_hash = hashPassword(body.password)
    } else if (body.password_hash !== undefined && body.password_hash !== '') {
        fields.password_hash = body.password_hash
    }

    if (body.integer_qty !== undefined || body.qty !== undefined) {
        fields.integer_qty = parseInt(body.integer_qty ?? body.qty ?? 0)
    }
    if (body.decimal_price !== undefined || body.price !== undefined) {
        fields.decimal_price = parseFloat(body.decimal_price ?? body.price ?? 0.0)
    }
    if (body.tax_percentage !== undefined) {
        fields.tax_percentage = parseFloat(body.tax_percentage ?? 0.0)
    }
    if (body.range_slider_value !== undefined) {
        fields.range_slider_value = parseInt(body.range_slider_value ?? 0)
    }

    if (body.short_notes !== undefined) {
        fields.short_notes = body.short_notes || body.short_description || body.subtitle || body.summary || ''
    }
    if (body.rich_wysiwyg_content !== undefined) {
        fields.rich_wysiwyg_content = body.rich_wysiwyg_content || body.content || body.description || body.wysiwyg || ''
    }

    if (body.dropdown_selection !== undefined) {
        fields.dropdown_selection = category || body.dropdown_selection
    }
    if (body.radio_selection !== undefined) {
        fields.radio_selection = body.radio_selection || body.radio || body.status || 'default'
    }

    if (body.switch_active !== undefined) {
        const isAct = body.switch_active ?? body.isActive ?? body.is_active ?? body.active
        fields.switch_active = isAct === false || isAct === 0 ? 0 : 1
    }
    if (body.checkbox_toggle !== undefined) {
        fields.checkbox_toggle = body.checkbox_toggle === true || body.checkbox_toggle === 1 || body.checkbox === true ? 1 : 0
    }

    if (body.date_picker !== undefined || body.date !== undefined) {
        const dateVal = body.date_picker ?? body.date
        if (dateVal) {
            try {
                const dateObj = new Date(dateVal)
                fields.date_picker = !isNaN(dateObj.getTime()) ? dateObj.toISOString().split('T')[0] : null
            } catch {
                fields.date_picker = null
            }
        } else {
            fields.date_picker = null
        }
    }

    if (body.datetime_picker !== undefined || body.datetime !== undefined) {
        const datetimeVal = body.datetime_picker ?? body.datetime
        if (datetimeVal) {
            try {
                const dateObj = new Date(datetimeVal)
                fields.datetime_picker = !isNaN(dateObj.getTime())
                    ? dateObj.toISOString().slice(0, 19).replace('T', ' ')
                    : null
            } catch {
                fields.datetime_picker = null
            }
        } else {
            fields.datetime_picker = null
        }
    }

    if (body.time_picker !== undefined || body.time !== undefined) {
        const timeVal = body.time_picker ?? body.time
        if (timeVal) {
            try {
                const dateObj = new Date(timeVal)
                fields.time_picker = !isNaN(dateObj.getTime()) ? dateObj.toTimeString().split(' ')[0] : null
            } catch {
                fields.time_picker = null
            }
        } else {
            fields.time_picker = null
        }
    }

    if (body.primary_image_url !== undefined || body.image !== undefined) {
        fields.primary_image_url = body.primary_image_url || body.image || body.imageUrl || body.image_url || ''
    }
    if (body.document_file_url !== undefined || body.file !== undefined) {
        fields.document_file_url = body.document_file_url || body.file || body.fileUrl || body.file_url || ''
    }

    if (body.multi_select_tags !== undefined || body.tags !== undefined) {
        fields.multi_select_tags = stringifyJsonField(body.multi_select_tags ?? body.tags, [])
    }
    if (body.gallery_images !== undefined || body.gallery !== undefined || body.images !== undefined) {
        fields.gallery_images = stringifyJsonField(body.gallery_images ?? body.gallery ?? body.images, [])
    }
    if (body.json_metadata !== undefined || body.metadata !== undefined || body.meta !== undefined) {
        fields.json_metadata = stringifyJsonField(body.json_metadata ?? body.metadata ?? body.meta, {})
    }
    if (body.repeater_data !== undefined || body.repeater !== undefined) {
        fields.repeater_data = stringifyJsonField(body.repeater_data ?? body.repeater, [])
    }

    return fields
}

const masterFormController = {
    async getRecordDetail(req, res) {
        const executingUserId = req.user.id
        const { endpoint, id } = req.params
        const category = mapEndpointToCategory(endpoint)

        try {
            const record = await masterFormModel.getRecordById(id, category, executingUserId)
            if (!record) {
                return res.status(404).json({ success: false, message: 'Resource record not found.' })
            }
            return res.json({ success: true, data: formatRow(record) })
        } catch (err) {
            console.error('[Detail Fetch Error]', err)
            return res.status(500).json({ success: false, message: 'Database fetch failure.' })
        }
    },

    async getRecordsList(req, res) {
        const executingUserId = req.user.id
        const { endpoint } = req.params
        const category = mapEndpointToCategory(endpoint)

        try {
            const page = parseInt(req.query.page || '1')
            const limit = parseInt(req.query.limit || '10')
            const sortBy = req.query.sort_by || 'id'
            const sortOrder = req.query.sort_order || 'asc'
            const search = req.query.search || ''

            const totalItems = await masterFormModel.countRecords({ category, search }, executingUserId)
            const totalPages = Math.ceil(totalItems / limit)

            const rows = await masterFormModel.getRecordsList({ category, search, page, limit, sortBy, sortOrder }, executingUserId)

            return res.json({
                success: true,
                data: rows.map(formatRow),
                meta: {
                    pagination: { totalItems, totalPages, currentPage: page, itemsPerPage: limit }
                }
            })
        } catch (err) {
            console.error('[List Query Error]', err)
            return res.status(500).json({ success: false, message: 'Database query execution error.' })
        }
    },

    async createRecord(req, res) {
        const executingUserId = req.user.id
        const { endpoint } = req.params
        const category = mapEndpointToCategory(endpoint)

        try {
            const fields = mapBodyToTableFields(req.body, category)
            const insertRes = await masterFormModel.createRecord(fields, category, executingUserId)

            return res.json({
                success: true,
                message: 'Record created successfully.',
                data: { id: insertRes.insertId }
            })
        } catch (err) {
            console.error('[Wildcard POST Error]', err)
            return res.status(500).json({ success: false, message: 'Database insert failed.' })
        }
    },

    async updateRecord(req, res) {
        const executingUserId = req.user.id
        const { endpoint, id } = req.params
        const category = mapEndpointToCategory(endpoint)

        try {
            const existing = await masterFormModel.getRecordById(id, category, executingUserId)
            if (!existing) {
                return res.status(404).json({ success: false, message: 'Resource record not found.' })
            }

            const fields = buildUpdateFieldsFromBody(req.body, category)

            if (Object.keys(fields).length === 0) {
                return res.json({ success: true, message: 'No changes to update.' })
            }

            if (fields.primary_image_url !== undefined && fields.primary_image_url !== existing.primary_image_url && existing.primary_image_url) {
                await deletePhysicalFile(existing.primary_image_url)
            }
            if (fields.document_file_url !== undefined && fields.document_file_url !== existing.document_file_url && existing.document_file_url) {
                await deletePhysicalFile(existing.document_file_url)
            }
            if (fields.gallery_images !== undefined && existing.gallery_images) {
                try {
                    const oldGallery = typeof existing.gallery_images === 'string' ? JSON.parse(existing.gallery_images) : existing.gallery_images
                    const newGallery = typeof fields.gallery_images === 'string' ? JSON.parse(fields.gallery_images) : fields.gallery_images
                    if (Array.isArray(oldGallery) && Array.isArray(newGallery)) {
                        for (const oldImg of oldGallery) {
                            if (!newGallery.includes(oldImg)) {
                                await deletePhysicalFile(oldImg)
                            }
                        }
                    }
                } catch (e) {
                    console.error('Failed to clean up gallery images on update:', e)
                }
            }

            await masterFormModel.updateRecord(id, fields, category, executingUserId)

            return res.json({ success: true, message: 'Record updated successfully.' })
        } catch (err) {
            console.error('[Wildcard PUT Error]', err)
            if (err.code === 'ER_DUP_ENTRY') {
                const msg = String(err.message || '')
                if (msg.includes('email')) {
                    return res.status(400).json({ success: false, message: 'This email is already used by another record.' })
                }
                if (msg.includes('slug')) {
                    return res.status(400).json({ success: false, message: 'This URL slug is already used by another record.' })
                }
                return res.status(400).json({ success: false, message: 'A record with these details already exists.' })
            }
            if (err.code === 'ER_CHECK_CONSTRAINT_VIOLATED') {
                return res.status(400).json({ success: false, message: 'Invalid data format in tags, gallery, or metadata fields.' })
            }
            return res.status(500).json({ success: false, message: 'Database update failed.' })
        }
    },

    async deleteRecord(req, res) {
        const executingUserId = req.user.id
        const { endpoint, id } = req.params
        const category = mapEndpointToCategory(endpoint)

        try {
            const existing = await masterFormModel.getRecordById(id, category, executingUserId)
            if (existing) {
                if (existing.primary_image_url) {
                    await deletePhysicalFile(existing.primary_image_url)
                }
                if (existing.document_file_url) {
                    await deletePhysicalFile(existing.document_file_url)
                }
                if (existing.gallery_images) {
                    try {
                        const gallery = typeof existing.gallery_images === 'string' ? JSON.parse(existing.gallery_images) : existing.gallery_images
                        if (Array.isArray(gallery)) {
                            for (const img of gallery) {
                                await deletePhysicalFile(img)
                            }
                        }
                    } catch (e) {
                        console.error('Failed to clean up gallery files on delete:', e)
                    }
                }
            }

            await masterFormModel.deleteRecord(id, category, executingUserId)
            return res.json({ success: true, message: 'Record deleted successfully.' })
        } catch (err) {
            console.error('[Wildcard DELETE Error]', err)
            return res.status(500).json({ success: false, message: 'Database delete failed.' })
        }
    },

    async patchRecordStatus(req, res) {
        const executingUserId = req.user.id
        const { endpoint, id } = req.params
        const category = mapEndpointToCategory(endpoint)

        try {
            const record = await masterFormModel.getRecordStatus(id, category)
            if (!record) {
                return res.status(404).json({ success: false, message: 'Record not found.' })
            }

            const newStatus = record.switch_active === 1 ? 0 : 1
            await masterFormModel.updateRecordStatus(id, newStatus, category, executingUserId)

            return res.json({
                success: true,
                message: 'Status updated successfully.',
                data: { active: newStatus === 1 }
            })
        } catch (err) {
            console.error('[Wildcard PATCH Error]', err)
            return res.status(500).json({ success: false, message: 'Database status update failed.' })
        }
    },

    async bulkDeleteRecords(req, res) {
        const executingUserId = req.user.id
        const { endpoint } = req.params
        const category = mapEndpointToCategory(endpoint)
        try {
            const { ids } = req.body
            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({ success: false, message: 'No record IDs provided for deletion.' })
            }
            for (const id of ids) {
                try {
                    const existing = await masterFormModel.getRecordById(id, category, executingUserId)
                    if (existing) {
                        if (existing.primary_image_url) {
                            await deletePhysicalFile(existing.primary_image_url)
                        }
                        if (existing.document_file_url) {
                            await deletePhysicalFile(existing.document_file_url)
                        }
                        if (existing.gallery_images) {
                            const gallery = typeof existing.gallery_images === 'string' ? JSON.parse(existing.gallery_images) : existing.gallery_images
                            if (Array.isArray(gallery)) {
                                for (const img of gallery) {
                                    await deletePhysicalFile(img)
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.error('Failed to clean up files during bulk delete:', e)
                }
            }

            await masterFormModel.deleteRecords(ids, category, executingUserId)
            return res.json({ success: true, message: 'Records deleted successfully.' })
        } catch (err) {
            console.error('[Bulk DELETE API Error]', err)
            return res.status(500).json({ success: false, message: 'Internal server error while bulk deleting records.' })
        }
    }
}

module.exports = masterFormController
