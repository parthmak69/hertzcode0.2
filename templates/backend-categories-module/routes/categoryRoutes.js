import express from 'express';
import * as categoryController from '../controllers/categoryController.js';
import checkAuth from '../middleware/authMiddleware.js';
import uploadParser from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.use(checkAuth);

router.get(['/', '/categories', '/cateogeries', '/admin/categories', '/api/admin/categories'], categoryController.listCategories);
router.get(['/:id', '/categories/:id', '/cateogeries/:id', '/admin/categories/:id', '/api/admin/categories/:id'], categoryController.getCategoryDetail);
router.post(['/', '/categories', '/cateogeries', '/admin/categories', '/api/admin/categories'], uploadParser, categoryController.createCategory);
router.put(['/', '/:id', '/categories/:id', '/cateogeries/:id', '/admin/categories/:id', '/api/admin/categories/:id'], uploadParser, categoryController.updateCategory);
router.delete(['/', '/:id', '/categories/:id', '/cateogeries/:id', '/admin/categories/:id', '/api/admin/categories/:id'], categoryController.deleteCategory);

export default router;

