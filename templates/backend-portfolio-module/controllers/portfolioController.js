const portfolioModel = require('../models/portfolioModel')
const { deletePhysicalFile } = require('../utils/storageHelper')

const portfolioController = {
    async getRecordsList(req, res) {
        try {
            const page = parseInt(req.query.page) || 1
            const limit = parseInt(req.query.limit) || 10
            const search = req.query.search || ''
            const category = req.query.category || ''
            const sortBy = req.query.sortBy || 'id'
            const sortOrder = req.query.sortOrder || 'desc'
            const executingUserId = req.user?.id || 0

            const data = await portfolioModel.getRecordsList({ search, category, page, limit, sortBy, sortOrder }, executingUserId)
            const total = await portfolioModel.countRecords({ search, category }, executingUserId)

            return res.json({
                success: true,
                data,
                meta: {
                    pagination: {
                        totalItems: total,
                        totalPages: Math.ceil(total / limit)
                    }
                }
            })
        } catch (err) {
            console.error('[Portfolio Controller Error]', err)
            return res.status(500).json({ success: false, message: 'Server error fetching records.' })
        }
    },

    async getRecordDetail(req, res) {
        try {
            const { id } = req.params
            const executingUserId = req.user?.id || 0
            const data = await portfolioModel.getRecordById(id, executingUserId)

            if (!data) {
                return res.status(404).json({ success: false, message: 'Record not found.' })
            }

            return res.json({ success: true, data })
        } catch (err) {
            console.error('[Portfolio Controller Error]', err)
            return res.status(500).json({ success: false, message: 'Server error fetching record.' })
        }
    },

    async createRecord(req, res) {
        try {
            const executingUserId = req.user?.id || 0
            const { title, description, button_link, category, switch_active } = req.body
            const image_url = req.body.primary_image_url || ''

            if (!title) {
                return res.status(400).json({ success: false, message: 'Title is required.' })
            }

            const insertRes = await portfolioModel.createRecord({
                title,
                description: description || '',
                image_url,
                button_link: button_link || '',
                category: category || '',
                switch_active: switch_active === false || switch_active === 0 || switch_active === '0' ? 0 : 1
            }, executingUserId)

            return res.status(201).json({
                success: true,
                message: 'Record created successfully.',
                id: insertRes.insertId
            })
        } catch (err) {
            console.error('[Portfolio Controller Error]', err)
            return res.status(500).json({ success: false, message: 'Server error creating record.' })
        }
    },

    async updateRecord(req, res) {
        try {
            const { id } = req.params
            const executingUserId = req.user?.id || 0
            const currentItem = await portfolioModel.getRecordById(id, executingUserId)

            if (!currentItem) {
                return res.status(404).json({ success: false, message: 'Record not found.' })
            }

            const { title, description, button_link, category, switch_active } = req.body
            
            let image_url = currentItem.image_url
            if (req.body.primary_image_url !== undefined) {
                image_url = req.body.primary_image_url
            } else if (req.body.primaryImageAction === 'remove') {
                image_url = ''
            }

            if ((req.body.primaryImageAction === 'remove' || req.body.primary_image_url) && currentItem.image_url) {
                await deletePhysicalFile(currentItem.image_url)
            }

            await portfolioModel.updateRecord(id, {
                title: title !== undefined ? title : currentItem.title,
                description: description !== undefined ? description : currentItem.description,
                image_url,
                button_link: button_link !== undefined ? button_link : currentItem.button_link,
                category: category !== undefined ? category : currentItem.category,
                switch_active: switch_active !== undefined ? (switch_active === false || switch_active === 0 || switch_active === '0' ? 0 : 1) : currentItem.switch_active
            }, executingUserId)

            return res.json({ success: true, message: 'Record updated successfully.' })
        } catch (err) {
            console.error('[Portfolio Controller Error]', err)
            return res.status(500).json({ success: false, message: 'Server error updating record.' })
        }
    },

    async deleteRecord(req, res) {
        try {
            const { id } = req.params
            const executingUserId = req.user?.id || 0
            const currentItem = await portfolioModel.getRecordById(id, executingUserId)

            if (!currentItem) {
                return res.status(404).json({ success: false, message: 'Record not found.' })
            }

            if (currentItem.image_url) {
                await deletePhysicalFile(currentItem.image_url)
            }

            await portfolioModel.deleteRecord(id, executingUserId)
            return res.json({ success: true, message: 'Record deleted successfully.' })
        } catch (err) {
            console.error('[Portfolio Controller Error]', err)
            return res.status(500).json({ success: false, message: 'Server error deleting record.' })
        }
    },

    async patchRecordStatus(req, res) {
        try {
            const { id } = req.params
            const executingUserId = req.user?.id || 0
            const { switch_active } = req.body

            const currentItem = await portfolioModel.getRecordById(id, executingUserId)
            if (!currentItem) {
                return res.status(404).json({ success: false, message: 'Record not found.' })
            }

            const newStatus = switch_active === true || switch_active === 1 || switch_active === '1' ? 1 : 0
            await portfolioModel.updateRecordStatus(id, newStatus, executingUserId)

            return res.json({ success: true, message: 'Status updated successfully.', newStatus })
        } catch (err) {
            console.error('[Portfolio Controller Error]', err)
            return res.status(500).json({ success: false, message: 'Server error updating record status.' })
        }
    },

    async bulkDeleteRecords(req, res) {
        try {
            const executingUserId = req.user?.id || 0
            const { ids } = req.body

            if (!Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({ success: false, message: 'No record IDs provided.' })
            }

            for (const id of ids) {
                const item = await portfolioModel.getRecordById(id, executingUserId)
                if (item && item.image_url) {
                    await deletePhysicalFile(item.image_url)
                }
            }

            await portfolioModel.deleteRecords(ids, executingUserId)
            return res.json({ success: true, message: `${ids.length} records deleted successfully.` })
        } catch (err) {
            console.error('[Portfolio Controller Error]', err)
            return res.status(500).json({ success: false, message: 'Server error deleting records.' })
        }
    },

    async getCategoriesSummary(req, res) {
        try {
            const executingUserId = req.user?.id || 0
            const data = await portfolioModel.getCategoriesSummary(executingUserId)
            return res.json({ success: true, data })
        } catch (err) {
            console.error('[Portfolio Controller Error]', err)
            return res.status(500).json({ success: false, message: 'Server error fetching categories summary.' })
        }
    }
}

module.exports = portfolioController
