const categoryModel = require('../models/categoryModel')
const { deletePhysicalFile } = require('../utils/storageHelper')

const categoryController = {
    async listCategories(req, res) {
        try {
            const parentId = (req.query.parentId === undefined || req.query.parentId === 'null' || req.query.parentId === '') ? null : req.query.parentId
            const data = await categoryModel.listCategories(parentId)
            return res.json({ success: true, data })
        } catch (err) {
            console.error('[Category Controller Error]', err)
            return res.status(500).json({ success: false, message: 'Server error listing categories.' })
        }
    },

    async getCategoryDetail(req, res) {
        try {
            const { id } = req.params
            const data = await categoryModel.getCategoryById(id)

            if (!data) {
                return res.status(404).json({ success: false, message: 'Category not found.' })
            }

            return res.json({ success: true, data })
        } catch (err) {
            console.error('[Category Controller Error]', err)
            return res.status(500).json({ success: false, message: 'Server error fetching category.' })
        }
    },

    async createCategory(req, res) {
        try {
            const { name, description, parentId } = req.body
            const image_url = req.body.primary_image_url || req.body.image_url || ''

            if (!name || !name.trim()) {
                return res.status(400).json({ success: false, message: 'Category name is required.' })
            }

            const insertRes = await categoryModel.createCategory({
                name: name.trim(),
                description: description || '',
                image_url: image_url,
                parent_id: (parentId === 'null' || parentId === '' || parentId === 'undefined' || parentId === undefined) ? null : parentId
            })

            return res.status(201).json({
                success: true,
                message: 'Category created successfully.',
                id: insertRes.insertId
            })
        } catch (err) {
            console.error('[Category Controller Error]', err)
            return res.status(500).json({ success: false, message: 'Server error creating category.' })
        }
    },

    async updateCategory(req, res) {
        try {
            const { id } = req.params
            const currentItem = await categoryModel.getCategoryById(id)

            if (!currentItem) {
                return res.status(404).json({ success: false, message: 'Category not found.' })
            }

            const { name, description, parentId, primaryImageAction } = req.body
            let image_url = currentItem.image_url
            if (primaryImageAction === 'remove') {
                image_url = ''
            } else if (req.body.primary_image_url !== undefined) {
                image_url = req.body.primary_image_url
            }

            const updateFields = {
                name: name !== undefined ? name.trim() : currentItem.name,
                description: description !== undefined ? description : currentItem.description,
                image_url,
                parent_id: (parentId !== undefined && parentId !== 'undefined') ? ((parentId === 'null' || parentId === '') ? null : parentId) : currentItem.parent_id,
                primaryImageAction
            }

            // Clean up old file if removed or updated with a new one
            if ((primaryImageAction === 'remove' || (req.body.primary_image_url && req.body.primary_image_url !== currentItem.image_url)) && currentItem.image_url && !currentItem.image_url.startsWith('http')) {
                await deletePhysicalFile(currentItem.image_url)
            }

            await categoryModel.updateCategory(id, updateFields)
            return res.json({ success: true, message: 'Category updated successfully.' })
        } catch (err) {
            console.error('[Category Controller Error]', err)
            return res.status(500).json({ success: false, message: 'Server error updating category.' })
        }
    },

    async deleteCategory(req, res) {
        try {
            const { id } = req.params
            const currentItem = await categoryModel.getCategoryById(id)

            if (!currentItem) {
                return res.status(404).json({ success: false, message: 'Category not found.' })
            }

            // Recursively collect all subcategory images to delete from disk
            const filesToDelete = []
            if (currentItem.image_url) {
                filesToDelete.push(currentItem.image_url)
            }

            const collectSubcategoryFiles = async (parentId) => {
                const subs = await categoryModel.listCategories(parentId)
                for (const sub of subs) {
                    if (sub.image_url) {
                        filesToDelete.push(sub.image_url)
                    }
                    await collectSubcategoryFiles(sub.id)
                }
            }
            await collectSubcategoryFiles(id)

            await categoryModel.deleteCategory(id)

            // Delete all collected physical files from disk
            for (const fileUrl of filesToDelete) {
                await deletePhysicalFile(fileUrl)
            }

            return res.json({ success: true, message: 'Category deleted successfully.' })
        } catch (err) {
            console.error('[Category Controller Error]', err)
            return res.status(500).json({ success: false, message: 'Server error deleting category.' })
        }
    }
}

module.exports = categoryController
