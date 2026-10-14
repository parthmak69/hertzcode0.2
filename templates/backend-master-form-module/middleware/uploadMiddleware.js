import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getStorageStatus } from '../utils/storageHelper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Strict Whitelist of Safe Extensions & Forbidden Extensions
const ALLOWED_EXTENSIONS = new Set([
    '.jpg', '.jpeg', '.png', '.webp', '.gif', '.ico',
    '.pdf', '.csv', '.txt', '.doc', '.docx', '.xls', '.xlsx', '.zip'
]);

const FORBIDDEN_EXTENSIONS = new Set([
    '.html', '.htm', '.svg', '.xhtml', '.js', '.mjs', '.php', '.exe',
    '.sh', '.bat', '.cmd', '.vbs', '.py', '.jsp', '.asp', '.aspx', '.cgi'
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 10
    },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase();

        // 1. Block dangerous script/executable extensions
        if (FORBIDDEN_EXTENSIONS.has(ext)) {
            return cb(new Error(`Security Alert: Uploading '${ext}' files is strictly prohibited.`));
        }

        // 2. Enforce allowed extension whitelist
        if (!ALLOWED_EXTENSIONS.has(ext)) {
            return cb(new Error(`File format '${ext}' is not permitted. Allowed: images (JPG, PNG, WebP, GIF), PDFs, CSV, and Office documents.`));
        }

        cb(null, true);
    }
});

// Wrapper to catch multer limit / validation errors cleanly
const multerUpload = (req, res, next) => {
    upload.any()(req, res, (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: `File exceeds maximum allowed size of ${(MAX_FILE_SIZE / (1024 * 1024))}MB.`
                });
            }
            return res.status(400).json({
                success: false,
                message: err.message || 'File upload validation error.'
            });
        }
        next();
    });
};

// Custom middleware to handle uploads and parsing of forms
const uploadParser = [
    multerUpload,
    async (req, res, next) => {
        // Parse JSON strings in request body
        if (req.body) {
            for (const key of Object.keys(req.body)) {
                const value = req.body[key];
                if (typeof value === 'string') {
                    if ((value.startsWith('[') && value.endsWith(']')) || (value.startsWith('{') && value.endsWith('}'))) {
                        try {
                            req.body[key] = JSON.parse(value);
                        } catch (e) {
                            // Silent fallback
                        }
                    }
                }
            }
        }

        if (!req.files || req.files.length === 0) {
            if (req.body && req.body.existing_gallery_urls !== undefined) {
                req.body.gallery_images = req.body.existing_gallery_urls;
            }
            if (req.body && req.body.primaryImageAction === 'remove') {
                req.body.primary_image_url = '';
                req.body.image_url = '';
                req.body.photo = '';
            }
            if (req.body && req.body.documentFileAction === 'remove') {
                req.body.document_file_url = '';
                req.body.file_url = '';
            }
            return next();
        }

        try {
            // Validate storage limitations before writing file uploads to disk
            let incomingSize = 0;
            for (const file of req.files) {
                incomingSize += file.size;
            }

            const storageStatus = await getStorageStatus();
            if (storageStatus.usedBytes + incomingSize > storageStatus.limitBytes) {
                return res.status(400).json({
                    success: false,
                    message: `Storage limit exceeded. Allowed limit: ${storageStatus.limitMb} MB. Current usage: ${storageStatus.usedMb} MB. Incoming files: ${(incomingSize / (1024 * 1024)).toFixed(3)} MB. Please upgrade your storage quota.`
                });
            }

            const files = { gallery_files: [] };
            for (const file of req.files) {
                if (file.fieldname === 'gallery_files' || file.fieldname === 'product_images' || file.fieldname === 'secondary_images') {
                    files.gallery_files.push(file);
                } else {
                    files[file.fieldname] = file;
                }
            }

            const uploadDir = process.env.MEDIA || path.join(__dirname, '..', 'uploads');
            await fs.mkdir(uploadDir, { recursive: true });

            // 1. Primary image file
            const primaryFile = files.primary_image_file || files.product_image || files.primary_image || files.primary_image_url || files.image_file;
            if (primaryFile && primaryFile.size > 0) {
                const ext = path.extname(primaryFile.originalname) || '.jpg';
                const filename = `primary-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
                await fs.writeFile(path.join(uploadDir, filename), primaryFile.buffer);
                req.body.primary_image_url = `uploads/${filename}`;
                req.body.image_url = `uploads/${filename}`;
                req.body.photo = `uploads/${filename}`;
            } else if (req.body.primaryImageAction === 'remove') {
                req.body.primary_image_url = '';
                req.body.image_url = '';
                req.body.photo = '';
            }

            // 2. Document file
            const docFile = files.document_file || files.document_file_url || files.doc_file;
            if (docFile && docFile.size > 0) {
                const ext = path.extname(docFile.originalname) || '.pdf';
                const filename = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
                await fs.writeFile(path.join(uploadDir, filename), docFile.buffer);
                req.body.document_file_url = `uploads/${filename}`;
                req.body.file_url = `uploads/${filename}`;
            } else if (req.body.documentFileAction === 'remove') {
                req.body.document_file_url = '';
                req.body.file_url = '';
            }

            // 3. Gallery / Secondary files
            const newGalleryUrls = [];
            if (files.gallery_files.length > 0) {
                for (const file of files.gallery_files) {
                    if (file.size > 0) {
                        const ext = path.extname(file.originalname) || '.jpg';
                        const filename = `gallery-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
                        await fs.writeFile(path.join(uploadDir, filename), file.buffer);
                        newGalleryUrls.push(`uploads/${filename}`);
                    }
                }
            }

            const existingGalleryUrls = Array.isArray(req.body.existing_gallery_urls) ? req.body.existing_gallery_urls : [];
            req.body.gallery_images = [...existingGalleryUrls, ...newGalleryUrls];
            next();
        } catch (err) {
            console.error('[Upload Middleware Error]', err);
            return res.status(500).json({ success: false, message: 'Failed to process file uploads.' });
        }
    }
];

export default uploadParser;

