import express from 'express';
import * as productController from '../controllers/productController.js';
import uploadParser from '../middleware/uploadMiddleware.js';
import checkAuth from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(checkAuth);

router.post(['/upload', '/admin/upload'], uploadParser, (req, res) => {
  const fileUrl = req.uploadedUrl || req.fileUrl || req.body?.image_url || req.body?.photo || req.body?.file || req.body?.fileUrl || req.body?.url || (req.body && Object.values(req.body).find(v => typeof v === 'string' && v.startsWith('/uploads/'))) || '';
  res.json({
    success: true,
    message: 'File uploaded successfully',
    url: fileUrl,
    fileUrl: fileUrl,
    path: fileUrl,
    data: { url: fileUrl, path: fileUrl }
  });
});

router.all(['/seed', '/seed-demo', '/fake-data', '/demo-data', '/admin/products/seed'], productController.seedDemoProducts);
router.get(['/', '/products', '/admin/products', '/api/admin/products'], productController.listProducts);
router.get(['/:id', '/products/:id', '/admin/products/:id', '/api/admin/products/:id'], productController.getProductDetail);
router.post(['/', '/products', '/admin/products', '/api/admin/products'], uploadParser, productController.createProduct);
router.put(['/', '/:id', '/products/:id', '/admin/products/:id', '/api/admin/products/:id'], uploadParser, productController.updateProduct);
router.delete(['/', '/:id', '/products/:id', '/admin/products/:id', '/api/admin/products/:id'], productController.deleteProduct);

export default router;
