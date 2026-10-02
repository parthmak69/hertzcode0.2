import express from 'express';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

import * as categoryController from '../controllers/categoryController.js';

import uploadParser from '../middleware/uploadMiddleware.js';

const checkAuth = (req, res, next) => next();

const router = express.Router();

router.use(checkAuth);

router.get(['/', '/categories', '/cateogeries', '/admin/categories', '/api/admin/categories'], categoryController.listCategories);
router.get(['/:id', '/categories/:id', '/cateogeries/:id', '/admin/categories/:id', '/api/admin/categories/:id'], categoryController.getCategoryDetail);
router.post(['/', '/categories', '/cateogeries', '/admin/categories', '/api/admin/categories'], uploadParser, categoryController.createCategory);
router.put(['/', '/:id', '/categories/:id', '/cateogeries/:id', '/admin/categories/:id', '/api/admin/categories/:id'], uploadParser, categoryController.updateCategory);
router.delete(['/', '/:id', '/categories/:id', '/cateogeries/:id', '/admin/categories/:id', '/api/admin/categories/:id'], categoryController.deleteCategory);

export default router;
