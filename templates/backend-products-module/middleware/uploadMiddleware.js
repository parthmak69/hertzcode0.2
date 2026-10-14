import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

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
            return next();
        }

        try {
            const uploadDirPrimary = path.resolve('./public/uploads');
            const uploadDirSecondary = path.resolve('./uploads');
            await fs.mkdir(uploadDirPrimary, { recursive: true });
            await fs.mkdir(uploadDirSecondary, { recursive: true });

            let firstSavedUrl = '';

            for (const file of req.files) {
                if (file.size > 0) {
                    const ext = path.extname(file.originalname) || '.jpg';
                    const prefix = file.fieldname || 'product';
                    const filename = `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
                    const targetPath1 = path.join(uploadDirPrimary, filename);
                    const targetPath2 = path.join(uploadDirSecondary, filename);

                    await fs.writeFile(targetPath1, file.buffer);
                    try {
                        await fs.writeFile(targetPath2, file.buffer);
                    } catch (e) {}

                    const savedUrl = `/uploads/${filename}`;
                    file.savedUrl = savedUrl;
                    if (!firstSavedUrl) firstSavedUrl = savedUrl;

                    req.body[file.fieldname] = savedUrl;
                    req.body.primary_image_url = savedUrl;
                    req.body.photo = savedUrl;
                    req.body.image = savedUrl;
                    req.body.image_url = savedUrl;
                }
            }

            if (firstSavedUrl) {
                req.uploadedUrl = firstSavedUrl;
                req.fileUrl = firstSavedUrl;
            }

            next();
        } catch (err) {
            console.error('[Upload Middleware Error]', err);
            return res.status(500).json({ success: false, message: 'Failed to process file uploads.' });
        }
    }
];

export default uploadParser;
