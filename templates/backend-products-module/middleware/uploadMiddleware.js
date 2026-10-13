import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({ storage: multer.memoryStorage() });

// Custom middleware to handle uploads and parsing of forms
const uploadParser = [
    upload.any(),
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
