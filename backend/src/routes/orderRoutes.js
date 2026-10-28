const express = require('express');
const orderController = require('../controllers/orderController');
const { protect, requireRole } = require('../middleware/auth');

// User Orders Router (/api/orders) - role "user" only
const orderRouter = express.Router();
orderRouter.use(protect);

// POST, GET /my, PUT /:id/cancel strictly require role "user"
orderRouter.post('/', requireRole('user'), orderController.createOrder);
orderRouter.get('/my', requireRole('user'), orderController.getMyOrders);
orderRouter.put('/:id/cancel', requireRole('user'), orderController.cancelOrder);

// GET /:id can be read by owner (user) or admin
orderRouter.get('/:id', orderController.getOrderById);

// Admin Orders Router (/api/admin/orders)
const adminOrderRouter = express.Router();
adminOrderRouter.use(protect, requireRole('admin'));
adminOrderRouter.get('/', orderController.getAdminOrders);
adminOrderRouter.put('/:id/status', orderController.updateOrderStatus);

// Admin Payments Router (/api/admin/payments)
const adminPaymentRouter = express.Router();
adminPaymentRouter.use(protect, requireRole('admin'));
adminPaymentRouter.get('/', orderController.getAdminPayments);

module.exports = {
  orderRouter,
  adminOrderRouter,
  adminPaymentRouter
};
