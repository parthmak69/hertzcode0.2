const { dbQuery } = require('../config/db')

const categoryModel = {
    async listCategories(parentId) {
        if (parentId === 'all') {
            return await dbQuery('SELECT * FROM categories ORDER BY name ASC')
        }
        const sql = (parentId === null || parentId === 'null' || parentId === undefined || parentId === '')
            ? 'SELECT * FROM categories WHERE parent_id IS NULL ORDER BY name ASC'
            : 'SELECT * FROM categories WHERE parent_id = ? ORDER BY name ASC'
        const params = (parentId === null || parentId === 'null' || parentId === undefined || parentId === '') ? [] : [parentId]
        return await dbQuery(sql, params)
    },

    async getCategoryById(id) {
        const rows = await dbQuery('SELECT * FROM categories WHERE id = ?', [id])
        return rows[0] || null
    },

    async createCategory({ name, description, image_url, parent_id }) {
        const pid = (parent_id === 'null' || parent_id === '' || parent_id === undefined) ? null : parent_id
        const sql = 'INSERT INTO categories (name, description, image_url, parent_id) VALUES (?, ?, ?, ?)'
        return await dbQuery(sql, [name, description, image_url, pid])
    },

    async updateCategory(id, { name, description, image_url, parent_id, primaryImageAction }) {
        const updates = []
        const params = []

        if (name !== undefined) {
            updates.push('name = ?')
            params.push(name)
        }
        if (description !== undefined) {
            updates.push('description = ?')
            params.push(description)
        }
        if (primaryImageAction === 'remove') {
            updates.push('image_url = ?')
            params.push('')
        } else if (image_url !== undefined) {
            updates.push('image_url = ?')
            params.push(image_url)
        }
        if (parent_id !== undefined) {
            const pid = (parent_id === 'null' || parent_id === '' || parent_id === undefined) ? null : parent_id
            updates.push('parent_id = ?')
            params.push(pid)
        }

        if (updates.length === 0) return

        params.push(id)
        const sql = `UPDATE categories SET ${updates.join(', ')} WHERE id = ?`
        return await dbQuery(sql, params)
    },

    async deleteCategory(id) {
        return await dbQuery('DELETE FROM categories WHERE id = ?', [id])
    }
}

module.exports = categoryModel
