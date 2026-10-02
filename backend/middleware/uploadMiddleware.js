import multer from 'multer'
import fs from 'fs/promises'
import path from 'path'
import { getStorageStatus } from '../utils/storageHelper.js'

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

            const uploadDirPrimary = path.resolve('./public/uploads')
            const uploadDirSecondary = path.resolve('./uploads')
            await fs.mkdir(uploadDirPrimary, { recursive: true })
            await fs.mkdir(uploadDirSecondary, { recursive: true })

            let firstSavedUrl = ''
            const newGalleryUrls = []

            for (const file of req.files) {
                if (file.size > 0) {
                    const ext = path.extname(file.originalname) || '.jpg'
                    const prefix = file.fieldname || 'file'
                    const filename = `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`
                    const targetPath1 = path.join(uploadDirPrimary, filename)
                    const targetPath2 = path.join(uploadDirSecondary, filename)

                    await fs.writeFile(targetPath1, file.buffer)
                    try {
                        await fs.writeFile(targetPath2, file.buffer)
                    } catch (e) {
                        // ignore secondary write error if dir is locked
                    }

                    const savedUrl = `/uploads/${filename}`
                    file.savedUrl = savedUrl
                    if (!firstSavedUrl) firstSavedUrl = savedUrl

                    req.body[file.fieldname] = savedUrl
                    if (['file', 'photo', 'image', 'avatar', 'primary_image_file', 'product_image', 'primary_image'].includes(file.fieldname)) {
                        req.body.primary_image_url = savedUrl
                        req.body.photo = savedUrl
                        req.body.image = savedUrl
                        req.body.image_url = savedUrl
                        req.body.fileUrl = savedUrl
                        req.body.url = savedUrl
                    }

                    if (['gallery_files', 'product_images', 'secondary_images'].includes(file.fieldname)) {
                        newGalleryUrls.push(savedUrl)
                    }
                }
            }

            if (firstSavedUrl) {
                req.uploadedUrl = firstSavedUrl
                req.fileUrl = firstSavedUrl
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

export default uploadParser
