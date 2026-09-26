const multer = require('multer')
const fs = require('fs/promises')
const path = require('path')
const { getStorageStatus } = require('../utils/storageHelper')

const upload = multer({ storage: multer.memoryStorage() })

// Custom middleware to handle uploads and parsing of forms
const uploadParser = [
    upload.any(),
    async (req, res, next) => {
        // Parse JSON strings in request body
        if (req.body) {
            for (const key of Object.keys(req.body)) {
                const value = req.body[key]
                if (typeof value === 'string') {
                    if ((value.startsWith('[') && value.endsWith(']')) || (value.startsWith('{') && value.endsWith('}'))) {
                        try {
                            req.body[key] = JSON.parse(value)
                        } catch (e) {
                            // Silent fallback
                        }
                    }
                }
            }
        }

        if (!req.files || req.files.length === 0) {
            if (req.body && req.body.existing_gallery_urls !== undefined) {
                req.body.gallery_images = req.body.existing_gallery_urls
            }
            return next()
        }

        try {
            // Validate storage limitations before writing file uploads to disk
            let incomingSize = 0
            for (const file of req.files) {
                incomingSize += file.size
            }

            const storageStatus = await getStorageStatus()
            if (storageStatus.usedBytes + incomingSize > storageStatus.limitBytes) {
                return res.status(400).json({
                    success: false,
                    message: `Storage limit exceeded. Allowed limit: ${storageStatus.limitMb} MB. Current usage: ${storageStatus.usedMb} MB. Incoming files: ${(incomingSize / (1024 * 1024)).toFixed(3)} MB. Please upgrade your storage quota.`
                })
            }

            const files = { gallery_files: [] }
            for (const file of req.files) {
                if (file.fieldname === 'gallery_files' || file.fieldname === 'product_images' || file.fieldname === 'secondary_images') {
                    files.gallery_files.push(file)
                } else {
                    files[file.fieldname] = file
                }
            }

            const uploadDir = process.env.MEDIA || path.join(__dirname, '..', 'uploads')
            await fs.mkdir(uploadDir, { recursive: true })

            // 1. Primary image file
            const primaryFile = files.primary_image_file || files.product_image || files.primary_image || files.primary_image_url
            if (primaryFile && primaryFile.size > 0) {
                const ext = path.extname(primaryFile.originalname) || '.jpg'
                const filename = `primary-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`
                await fs.writeFile(path.join(uploadDir, filename), primaryFile.buffer)
                req.body.primary_image_url = `uploads/${filename}`
            } else if (req.body.primaryImageAction === 'remove') {
                req.body.primary_image_url = ''
            }

            // 2. Document file
            const docFile = files.document_file || files.document_file_url
            if (docFile && docFile.size > 0) {
                const ext = path.extname(docFile.originalname) || '.pdf'
                const filename = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`
                await fs.writeFile(path.join(uploadDir, filename), docFile.buffer)
                req.body.document_file_url = `uploads/${filename}`
            } else if (req.body.documentFileAction === 'remove') {
                req.body.document_file_url = ''
            }

            // 3. Gallery / Secondary files
            const newGalleryUrls = []
            if (files.gallery_files.length > 0) {
                for (const file of files.gallery_files) {
                    if (file.size > 0) {
                        const ext = path.extname(file.originalname) || '.jpg'
                        const filename = `gallery-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`
                        await fs.writeFile(path.join(uploadDir, filename), file.buffer)
                        newGalleryUrls.push(`uploads/${filename}`)
                    }
                }
            }

            const existingGalleryUrls = Array.isArray(req.body.existing_gallery_urls) ? req.body.existing_gallery_urls : []
            req.body.gallery_images = [...existingGalleryUrls, ...newGalleryUrls]
            next()
        } catch (err) {
            console.error('[Upload Middleware Error]', err)
            return res.status(500).json({ success: false, message: 'Failed to process file uploads.' })
        }
    }
]

module.exports = uploadParser
