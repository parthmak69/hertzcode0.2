import express from 'express';
import * as orderController from '../controllers/orderController.js';
import checkAuth from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(checkAuth);

router.get(['/', '/orders', '/admin/orders', '/api/admin/orders'], orderController.listOrders);
router.get(['/:id', '/orders/:id', '/admin/orders/:id', '/api/admin/orders/:id'], orderController.getOrderDetail);
router.post(['/', '/orders', '/admin/orders', '/api/admin/orders'], orderController.createOrder);
router.put(['/', '/:id', '/orders/:id', '/admin/orders/:id', '/api/admin/orders/:id'], orderController.updateOrderStatus);
router.delete(['/', '/:id', '/orders/:id', '/admin/orders/:id', '/api/admin/orders/:id'], orderController.deleteOrder);

export default router;
